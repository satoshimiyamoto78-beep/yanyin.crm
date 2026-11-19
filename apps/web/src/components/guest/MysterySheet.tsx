"use client";

/* eslint-disable @next/next/no-img-element -- small local dish photos in a static export */
import {
  Check,
  GlassWater,
  RefreshCw,
  Shuffle,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  allItems,
  formatMoney,
  t,
  type Currency,
  type Lang,
  type Menu,
  type MenuItem,
} from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import { ui } from "@/lib/ui-strings";
import { ArtTile } from "@/components/system/Art";
import { Sheet } from "./ui";

/*
 * Mystery dish (roadmap, MVP), as a small card game: the guest sets how many
 * cards (1, 2 or 3), food, drink or anything, and a budget per card. The deck
 * is shuffled with a real random source (crypto), the cards fly together,
 * shuffle and flip one by one. Each revealed card can be swapped on its own,
 * or the whole hand reshuffled; the guest taps the cards they take and adds
 * them to the order. Only dishes that can be ordered in one tap and are not in
 * the stop-list; a dish shown once does not come back in the same session
 * while the deck has others.
 */

const DRINK = ["drink", "hot_drink", "alcohol", "hookah"];
const BUDGETS = [
  { id: "low", max: 150_000 },
  { id: "mid", max: 300_000 },
  { id: "any", max: Infinity },
] as const;
type Kind = "food" | "drink" | "any";
type Phase = "setup" | "shuffle" | "open";

/** A fair random index from the browser's crypto source. */
function rnd(n: number) {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0]! % n;
}

/** Draw `n` different dishes, preferring ones not shown yet. */
function draw(
  pool: MenuItem[],
  n: number,
  seen: Set<string>,
  keep: MenuItem[] = [],
) {
  const taken = new Set(keep.map((k) => k.id));
  const fresh = pool.filter((p) => !seen.has(p.id) && !taken.has(p.id));
  const rest = pool.filter((p) => seen.has(p.id) && !taken.has(p.id));
  const out: MenuItem[] = [];
  for (const src of [fresh, rest]) {
    const bag = [...src];
    while (out.length < n && bag.length)
      out.push(bag.splice(rnd(bag.length), 1)[0]!);
  }
  return out;
}

export function MysterySheet({
  open,
  onClose,
  lang,
  currency,
  menu,
  onTake,
}: {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  currency: Currency;
  menu: Menu;
  onTake: (items: MenuItem[]) => void;
}) {
  const [count, setCount] = useState<1 | 2 | 3>(3);
  const [kind, setKind] = useState<Kind>("any");
  const [budget, setBudget] = useState<(typeof BUDGETS)[number]["id"]>("mid");
  const [phase, setPhase] = useState<Phase>("setup");
  const [hand, setHand] = useState<MenuItem[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [swapping, setSwapping] = useState<number | null>(null);
  const seen = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => void (timer.current && clearTimeout(timer.current)),
    [],
  );

  const roleOf = useMemo(
    () =>
      new Map(
        menu.categories.flatMap((c) =>
          c.items.map((i) => [i.id, c.role] as const),
        ),
      ),
    [menu],
  );
  const pool = useMemo(() => {
    const max = BUDGETS.find((b) => b.id === budget)!.max;
    return allItems(menu).filter((i) => {
      if (
        !(i.price > 0 && i.price <= max) ||
        i.variants.length ||
        i.modifierGroups.some((g) => g.required)
      )
        return false;
      const drink = DRINK.includes(roleOf.get(i.id) ?? "");
      return kind === "any" || drink === (kind === "drink");
    });
  }, [menu, budget, kind, roleOf]);
  const money = (n: number) => formatMoney(n, currency, lang);
  const enough = pool.length >= count;

  // Any change to the rules lays the cards face down again.
  const reset = () => {
    setPhase("setup");
    setHand([]);
    setPicked([]);
  };

  const deal = () => {
    if (!enough) return;
    haptic("light");
    // A reveal should look appetising: when the deck has enough dishes with photos, deal from those.
    const shots = pool.filter((p) => p.photo || p.cover);
    const deck = shots.length >= count * 2 ? shots : pool;
    const cards = draw(deck, count, seen.current);
    cards.forEach((c) => seen.current.add(c.id));
    setHand(cards);
    setPicked(count === 1 ? [cards[0]!.id] : []);
    setPhase("shuffle");
    timer.current = setTimeout(() => {
      haptic("success");
      setPhase("open");
    }, 900);
  };

  const swap = (i: number) => {
    const next = draw(pool, 1, seen.current, hand)[0];
    if (!next) return;
    haptic("light");
    seen.current.add(next.id);
    setSwapping(i);
    timer.current = setTimeout(() => {
      setHand((h) => h.map((c, k) => (k === i ? next : c)));
      setPicked((p) =>
        p
          .filter((id) => id !== hand[i]!.id)
          .concat(count === 1 ? [next.id] : []),
      );
      setSwapping(null);
      haptic("success");
    }, 380);
  };

  const toggle = (id: string) => {
    haptic("tick");
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const chosen = hand.filter((c) => picked.includes(c.id));
  const sum = chosen.reduce((n, c) => n + c.price, 0);

  if (!open) return null;
  return (
    <Sheet
      open
      onClose={onClose}
      label={ui(lang, "mysteryTitle")}
      title={false}
      footer={
        phase === "open" ? (
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={deal}
              className="press flex h-13 items-center gap-2 rounded-full bg-g-fill px-5 text-[15px] font-semibold"
            >
              <Shuffle size={17} strokeWidth={2.2} /> {ui(lang, "mysteryAgain")}
            </button>
            <button
              type="button"
              disabled={!chosen.length}
              onClick={() => (haptic("success"), onTake(chosen))}
              className="blue-grad press h-13 flex-1 rounded-full text-[15px] font-semibold tabular-nums disabled:opacity-40"
            >
              {chosen.length
                ? `${ui(lang, "mysteryTake")} ${chosen.length} · ${money(sum)}`
                : ui(lang, "mysteryPick")}
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={!enough || phase === "shuffle"}
            onClick={deal}
            className="blue-grad press flex h-13 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold disabled:opacity-40"
          >
            <Shuffle size={17} strokeWidth={2.2} />{" "}
            {phase === "shuffle"
              ? ui(lang, "mysteryShuffling")
              : ui(lang, "mysteryGo")}
          </button>
        )
      }
    >
      <div className="px-5 pt-1 pb-8">
        <div className="flex items-center gap-3">
          <ArtTile name="cards" size={52} bare />
          <div className="min-w-0">
            <h2 className="text-[26px] leading-tight font-bold tracking-[-0.02em]">
              {ui(lang, "mysteryTitle")}
            </h2>
            <p className="text-[13.5px] text-g-muted">
              {ui(lang, "mysteryHint")}
            </p>
          </div>
        </div>

        {/* The rules in one quick card: tap how many cards (they light up), what, and the price per card. */}
        <div className="mt-5 divide-y divide-g-line rounded-[22px] bg-g-fill px-3.5">
          <div className="flex items-center justify-between gap-3 py-2.5">
            <span className="text-[13px] font-semibold text-g-muted">
              {ui(lang, "mysteryCards")}
            </span>
            <div className="flex items-end gap-1.5">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={String(n)}
                  aria-pressed={count === n}
                  onClick={() => {
                    haptic("tick");
                    setCount(n as 1 | 2 | 3);
                    reset();
                  }}
                  className="press flex h-10 items-end gap-0.5 rounded-[12px] px-1.5"
                >
                  {Array.from({ length: n }, (_, k) => (
                    <span
                      key={k}
                      className={`h-7 w-[18px] rounded-[5px] transition-colors duration-300 ${count === n ? "blue-grad shadow-[0_4px_10px_-4px_rgba(47,91,255,0.6)]" : "bg-g-faint/30"}`}
                      style={{
                        transform: `rotate(${(k - (n - 1) / 2) * 8}deg)`,
                      }}
                    />
                  ))}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <span className="text-[13px] font-semibold text-g-muted">
              {ui(lang, "mysteryWhat")}
            </span>
            <div className="flex gap-1">
              {(
                [
                  ["any", Sparkles, ui(lang, "mysteryAll")],
                  ["food", UtensilsCrossed, ui(lang, "mysteryFood")],
                  ["drink", GlassWater, ui(lang, "mysteryDrink")],
                ] as const
              ).map(([k, Icon, label]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === k}
                  onClick={() => (haptic("tick"), setKind(k), reset())}
                  className={`press flex h-8 items-center gap-1 rounded-full px-2.5 text-[12.5px] font-semibold transition-colors ${kind === k ? "bg-g-ink text-white" : "text-g-ink-2"}`}
                >
                  <Icon size={13} strokeWidth={2.4} /> {label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <span className="text-[13px] font-semibold text-g-muted">
              {ui(lang, "mysteryBudget")}
            </span>
            <div className="flex gap-1">
              {BUDGETS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  aria-pressed={budget === b.id}
                  onClick={() => (haptic("tick"), setBudget(b.id), reset())}
                  className={`press h-8 rounded-full px-2.5 text-[12.5px] font-semibold tabular-nums transition-colors ${budget === b.id ? "bg-g-ink text-white" : "text-g-ink-2"}`}
                >
                  {b.id === "any"
                    ? ui(lang, "mysteryAny")
                    : `≤ ${Math.round(b.max / 1000)}k`}
                </button>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-2 px-1 text-[12.5px] text-g-muted">
          {enough
            ? ui(lang, "mysteryCount").replace("{n}", String(pool.length))
            : ui(lang, "mysteryNone")}
        </p>

        {/* The table: cards face down, shuffled, then flipped one by one. */}
        <div
          className={`mt-5 grid gap-2.5 [perspective:1200px] ${count === 1 ? "mx-auto max-w-[260px] grid-cols-1" : count === 2 ? "grid-cols-2" : "grid-cols-3"}`}
        >
          {Array.from({ length: count }, (_, i) => {
            const dish = hand[i];
            const up = phase === "open" && !!dish && swapping !== i;
            const on = !!dish && picked.includes(dish.id);
            return (
              <div
                key={i}
                className={`relative aspect-[3/4] ${phase === "shuffle" ? "animate-[deck-shuffle_0.9s_cubic-bezier(0.22,1,0.36,1)]" : ""}`}
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div
                  className="relative size-full transition-transform duration-[650ms] ease-[cubic-bezier(0.22,1,0.36,1)] [transform-style:preserve-3d]"
                  style={{
                    transform: up ? "rotateY(180deg)" : "none",
                    transitionDelay: up ? `${i * 160}ms` : "0ms",
                  }}
                >
                  {/* Back. */}
                  <div className="blue-grad absolute inset-0 grid place-items-center overflow-hidden rounded-[22px] shadow-[0_14px_30px_-18px_rgba(47,91,255,0.7)] [backface-visibility:hidden]">
                    <span className="absolute inset-2 rounded-[16px] border border-white/25" />
                    <span className="absolute inset-0 opacity-[0.12] [background:repeating-linear-gradient(45deg,#fff_0_1px,transparent_1px_9px)]" />
                    <span
                      className={`relative leading-none font-bold text-white/90 ${count === 3 ? "text-[44px]" : "text-[64px]"}`}
                    >
                      ?
                    </span>
                  </div>
                  {/* Face. */}
                  <button
                    type="button"
                    disabled={!up}
                    onClick={() => dish && toggle(dish.id)}
                    aria-pressed={on}
                    className={`absolute inset-0 flex flex-col overflow-hidden rounded-[22px] bg-g-fill text-left transition-shadow [backface-visibility:hidden] [transform:rotateY(180deg)] ${on ? "ring-2 ring-g-blue" : ""}`}
                  >
                    {dish && (
                      <>
                        <span className="relative grid min-h-0 flex-1 place-items-center overflow-hidden">
                          {dish.photo || dish.cover ? (
                            <img
                              src={dish.cover ?? dish.photo}
                              alt=""
                              className={
                                dish.cover
                                  ? "size-full object-cover"
                                  : "dish-shadow w-[86%] object-contain"
                              }
                            />
                          ) : (
                            <ArtTile
                              name={
                                DRINK.includes(roleOf.get(dish.id) ?? "")
                                  ? "drink"
                                  : "salad"
                              }
                              size={count === 3 ? 56 : 84}
                              bare
                            />
                          )}
                        </span>
                        <span
                          className={
                            count === 3
                              ? "px-2.5 pt-1 pb-2.5"
                              : "px-3.5 pt-1.5 pb-3.5"
                          }
                        >
                          <span
                            className={`line-clamp-2 leading-tight font-semibold ${count === 3 ? "text-[12.5px]" : "text-[15px]"}`}
                          >
                            {t(dish.name, lang)}
                          </span>
                          <span
                            className={`mt-0.5 block font-semibold text-g-muted tabular-nums ${count === 3 ? "text-[12px]" : "text-[13.5px]"}`}
                          >
                            {money(dish.price)}
                          </span>
                        </span>
                        <span
                          className={`absolute top-2 right-2 grid size-6 place-items-center rounded-full transition-colors ${on ? "blue-grad" : "bg-g-card/90 text-transparent"}`}
                        >
                          <Check size={14} strokeWidth={3} />
                        </span>
                      </>
                    )}
                  </button>
                </div>
                {up && pool.length > count && (
                  <button
                    type="button"
                    aria-label={ui(lang, "mysteryReplace")}
                    onClick={() => swap(i)}
                    className="press absolute top-2 left-2 z-10 grid size-7 place-items-center rounded-full bg-g-card/90 text-g-ink-2 shadow-[0_2px_6px_rgba(11,11,15,0.12)]"
                  >
                    <RefreshCw size={13} strokeWidth={2.4} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {phase === "open" && count > 1 && (
          <p className="animate-rise mt-3 text-center text-[12.5px] text-g-muted">
            {ui(lang, "mysteryPickHint")}
          </p>
        )}
      </div>
    </Sheet>
  );
}
