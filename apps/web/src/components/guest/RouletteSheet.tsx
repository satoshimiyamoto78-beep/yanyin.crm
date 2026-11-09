"use client";

import { allItems, formatMoney, moodsFor, spinRoulette, t, type CategoryRole, type Lang, type Menu, type MenuItem, type Mood, type RouletteResult } from "@yanyin/domain";
import { Check, Compass, Dices, Flame, Leaf, Minus, Plus, Wind, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ui, type UiKey } from "@/lib/ui-strings";
import { DishTile, Sheet } from "./ui";

const MOODS: Record<Mood, { key: UiKey; icon: LucideIcon }> = {
  hungry: { key: "moodHungry", icon: Flame },
  light: { key: "moodLight", icon: Leaf },
  adventurous: { key: "moodAdventurous", icon: Compass },
  chill: { key: "moodChill", icon: Wind },
};

const TILE = 148; // reel window and tile height, px
const STRIP = 16; // random tiles before the winning one

type Phase = "idle" | "prep" | "run" | "done";

/** Food Roulette as a real slot machine: reels spin and stop one by one on the picked set. */
export function RouletteSheet({
  open,
  onClose,
  menu,
  lang,
  onAddAll,
}: {
  open: boolean;
  onClose: () => void;
  menu: Menu;
  lang: Lang;
  onAddAll: (items: MenuItem[], guests: number) => void;
}) {
  const moods = useMemo(() => moodsFor(menu), [menu]);
  const lounge = menu.venue.type === "shisha_lounge";
  const pool = useMemo(() => allItems(menu), [menu]);
  const roleOf = useMemo(() => new Map<string, CategoryRole>(menu.categories.flatMap((c) => c.items.map((i) => [i.id, c.role] as const))), [menu]);
  const idle = useMemo(() => {
    const photos = pool.filter((i) => i.photo);
    if (photos.length >= 3) return photos.slice(0, 3);
    // No photos: one item from each of three different kinds of category.
    const seen = new Set<string>();
    return menu.categories.filter((c) => !seen.has(c.role) && seen.add(c.role)).slice(0, 3).map((c) => c.items[0]!);
  }, [pool, menu]);

  const [guests, setGuests] = useState(2);
  const [budget, setBudget] = useState(lounge ? 900_000 : 700_000);
  const [mood, setMood] = useState<Mood>(moods[0]!);
  const [veg, setVeg] = useState(false);
  const [alcohol, setAlcohol] = useState(lounge);
  const [result, setResult] = useState<RouletteResult | undefined>(undefined);
  const [strips, setStrips] = useState<MenuItem[][]>(idle.map((i) => [i]));
  const [phase, setPhase] = useState<Phase>("idle");
  const [pull, setPull] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { currency } = menu.venue;
  const min = 100_000 * guests;

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const spinning = phase === "prep" || phase === "run";

  const spin = () => {
    if (spinning) return;
    setPull((n) => n + 1);
    const r = spinRoulette({ menu, budget: Math.max(min, budget), guests, mood, includeAlcohol: alcohol, requireTags: veg ? ["vegetarian"] : undefined });
    const finals = r?.items ?? idle;
    const random = () => pool[Math.floor(Math.random() * pool.length)]!;
    setResult(undefined);
    setStrips(finals.map((final) => [...Array.from({ length: STRIP }, random), final]));
    setPhase("prep");
    // Two frames so the reels render at the top before the transition starts.
    requestAnimationFrame(() => requestAnimationFrame(() => setPhase("run")));
    const total = 1500 + (finals.length - 1) * 450 + 150;
    timer.current = setTimeout(() => {
      setPhase("done");
      setResult(r);
    }, total);
  };

  const reels = strips.length;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      label={ui(lang, "roulette")}
      footer={
        phase === "done" && result ? (
          <div className="flex gap-2.5">
            <button onClick={spin} className="card press h-14 flex-1 rounded-full text-[16px] font-semibold">
              {ui(lang, "spinAgain")}
            </button>
            <button onClick={() => onAddAll(result.items, guests)} className="blue-grad press h-14 flex-[1.4] rounded-full text-[16px] font-semibold">
              {ui(lang, "addAll")}
            </button>
          </div>
        ) : (
          <button onClick={spin} disabled={spinning} className="blue-grad press flex h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-semibold disabled:opacity-80">
            <Dices size={20} strokeWidth={2} className={spinning ? "animate-spin" : ""} /> {ui(lang, "spin")}
          </button>
        )
      }
    >
      <div className="px-5 pt-8 pb-4">
        <h2 className="text-[26px] font-bold tracking-[-0.02em]">{ui(lang, "roulette")}</h2>
        <p className="mt-1 text-[15px] text-g-muted">{ui(lang, "rouletteHint")}</p>

        {/* Slot machine */}
        <div className="relative mt-6 pr-9">
          <div className="mesh-blue rounded-[32px] p-3 pt-2.5">
            <div className="flex items-center justify-between px-2 pb-2.5">
              <span className="text-[11px] font-bold tracking-[0.18em] text-g-blue uppercase">Food Roulette</span>
              <span className="flex gap-1.5" aria-hidden>
                {Array.from({ length: 6 }, (_, i) => (
                  <span
                    key={i}
                    className={`size-1.5 rounded-full bg-g-blue ${spinning ? "animate-pulse" : ""}`}
                    style={{ opacity: spinning ? 1 : i % 2 ? 0.45 : 0.9, animationDelay: `${i * 120}ms` }}
                  />
                ))}
              </span>
            </div>
            <div className="relative rounded-[24px] bg-white p-2">
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${reels}, minmax(0, 1fr))` }}>
                {strips.map((strip, r) => {
                  const offset = phase === "run" || phase === "done" ? -(strip.length - 1) * TILE : 0;
                  const duration = 1.5 + r * 0.45;
                  return (
                    <div key={r} className="hero-grad relative overflow-hidden rounded-[18px]" style={{ height: TILE }}>
                      <div
                        style={{
                          transform: `translateY(${offset}px)`,
                          transition: phase === "run" ? `transform ${duration}s cubic-bezier(0.12, 0.82, 0.2, 1)` : "none",
                        }}
                      >
                        {strip.map((it, k) => (
                          <div key={k} className="flex flex-col items-center justify-center gap-1.5 px-1.5" style={{ height: TILE }}>
                            <DishTile item={it} role={roleOf.get(it.id) ?? "main"} photoScale={0.95} glyph={0.62} className="size-[78px] rounded-[18px] !bg-none" />
                            <span className="line-clamp-2 text-center text-[11px] leading-tight font-semibold">{t(it.name, lang)}</span>
                          </div>
                        ))}
                      </div>
                      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-white/90 to-transparent" />
                      <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-white/90 to-transparent" />
                    </div>
                  );
                })}
              </div>
              {/* Pay line */}
              <span aria-hidden className="pointer-events-none absolute top-1/2 -left-1 size-0 -translate-y-1/2 border-y-[7px] border-l-[9px] border-y-transparent border-l-g-blue" />
              <span aria-hidden className="pointer-events-none absolute top-1/2 -right-1 size-0 -translate-y-1/2 border-y-[7px] border-r-[9px] border-y-transparent border-r-g-blue" />
            </div>
          </div>
          {/* Lever */}
          <button onClick={spin} disabled={spinning} aria-label={ui(lang, "spin")} className="absolute top-6 right-0 flex h-[150px] w-8 flex-col items-center">
            <span key={pull} className={`flex flex-col items-center ${pull ? "animate-lever" : ""}`}>
              <span className="size-8 rounded-full bg-[radial-gradient(circle_at_35%_30%,#8aa6ff,#2f5bff_70%)]" />
              <span className="h-[86px] w-2 rounded-full bg-gradient-to-b from-[#c9cdd6] to-[#8d929e]" />
            </span>
            <span className="-mt-1 h-7 w-5 rounded-lg bg-gradient-to-b from-[#9aa0ad] to-[#6b707c]" />
          </button>
        </div>

        {phase === "done" && result === null && <p className="mt-4 text-center text-[15px] text-g-muted">{ui(lang, "nothingFits")}</p>}
        {phase === "done" && result && (
          <div className="animate-rise mt-4 rounded-[24px] bg-g-fill p-4">
            {result.items.map((it) => (
              <div key={it.id} className="flex items-baseline justify-between gap-3 py-1 text-[15px]">
                <span className="min-w-0 truncate font-medium">{t(it.name, lang)}</span>
                <span className="shrink-0 tabular-nums text-g-muted">{formatMoney(it.price, currency, lang)}</span>
              </div>
            ))}
            <div className="mt-2 flex items-baseline justify-between border-t border-g-fill-2 pt-3">
              <span className="text-[13px] text-g-muted">
                {formatMoney(result.perGuest, currency, lang)} {ui(lang, "perGuest")} × {guests}
              </span>
              <span className="text-[22px] font-semibold tabular-nums">{formatMoney(result.total, currency, lang)}</span>
            </div>
          </div>
        )}

        <h3 className="mt-7 mb-3 text-[17px] font-semibold">{ui(lang, "mood")}</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {moods.map((m) => {
            const { key, icon: Icon } = MOODS[m];
            const on = m === mood;
            return (
              <button key={m} onClick={() => setMood(m)} aria-pressed={on} className={`press flex h-14 items-center gap-3 rounded-[18px] px-4 text-[15px] font-medium transition-colors ${on ? "bg-g-ink text-white" : "bg-g-fill"}`}>
                <Icon size={20} strokeWidth={1.75} />
                {ui(lang, key)}
              </button>
            );
          })}
        </div>

        <div className="mt-7 flex items-center justify-between">
          <h3 className="text-[17px] font-semibold">{ui(lang, "guests")}</h3>
          <div className="flex h-11 items-center gap-1 rounded-full bg-g-fill px-1">
            <button aria-label="Fewer guests" onClick={() => setGuests((g) => Math.max(1, g - 1))} className="press grid size-9 place-items-center rounded-full">
              <Minus size={17} />
            </button>
            <span className="w-7 text-center text-[16px] font-semibold tabular-nums">{guests}</span>
            <button aria-label="More guests" onClick={() => setGuests((g) => Math.min(12, g + 1))} className="press grid size-9 place-items-center rounded-full">
              <Plus size={17} />
            </button>
          </div>
        </div>

        <div className="mt-7">
          <div className="flex items-baseline justify-between">
            <label htmlFor="roulette-budget" className="text-[17px] font-semibold">
              {ui(lang, "budget")}
            </label>
            <span className="text-[20px] font-bold tracking-[-0.02em] tabular-nums">{formatMoney(Math.max(min, budget), currency, lang)}</span>
          </div>
          <input
            id="roulette-budget"
            type="range"
            min={min}
            max={3_000_000}
            step={50_000}
            value={Math.max(min, budget)}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="mt-3 w-full accent-[var(--g-blue)]"
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {(
            [
              [veg, setVeg, "vegetarian"],
              [alcohol, setAlcohol, "alcohol"],
            ] as const
          ).map(([on, set, key]) => (
            <button key={key} onClick={() => set((v) => !v)} aria-pressed={on} className={`press flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium ${on ? "bg-g-ink text-white" : "bg-g-fill"}`}>
              {on && <Check size={15} strokeWidth={2.5} />}
              {ui(lang, key)}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
