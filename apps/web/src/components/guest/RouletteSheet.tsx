"use client";

import { DEFAULT_SERVICE_RATE, withService, formatMoney, moodsFor, spinRoulette, t, type CategoryRole, type Lang, type Menu, type MenuItem, type Mood, type RouletteResult } from "@yanyin/domain";
import { X, CakeSlice, CupSoda, Dices, Flame, Leaf, Minus, Plus, RefreshCw, Sandwich, Soup, Sparkles, Users, UtensilsCrossed, Wind, type LucideIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";
import { ui, type UiKey } from "@/lib/ui-strings";
import { CountMoney, RouletteWheel, useWheelSpin } from "./motion";
import { ChoiceChip, DishTile, Sheet, StepHead, TrackSlider } from "./ui";

const MOODS: Record<Mood, { key: UiKey; icon: LucideIcon }> = {
  hungry: { key: "moodHungry", icon: UtensilsCrossed },
  light: { key: "moodLight", icon: Leaf },
  adventurous: { key: "moodAdventurous", icon: Sparkles },
  chill: { key: "moodChill", icon: Wind },
  meat: { key: "moodMeat", icon: Flame },
  soup: { key: "moodSoup", icon: Soup },
  sweet: { key: "moodSweet", icon: CakeSlice },
  snack: { key: "moodSnack", icon: Sandwich },
  drinks: { key: "moodDrinks", icon: CupSoda },
  share: { key: "moodShare", icon: Users },
};

/** Budget per guest as quick picks, from modest to a feast. */
const LEVELS: [UiKey, number][] = [
  ["budgetModest", 150_000],
  ["budgetUsual", 300_000],
  ["budgetGenerous", 500_000],
  ["budgetFeast", 800_000],
];
const PER_MIN = 100_000;
const PER_MAX = 1_000_000;

/**
 * Food Roulette as a configurator page in the same language as the hookah page:
 * a generic wheel on top, numbered steps below, one blue button. The wheel is
 * the same for every venue; the picked dishes appear under it.
 */
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
  const roleOf = useMemo(() => new Map<string, CategoryRole>(menu.categories.flatMap((c) => c.items.map((i) => [i.id, c.role] as const))), [menu]);
  const { currency } = menu.venue;
  const rate = menu.venue.serviceRate ?? DEFAULT_SERVICE_RATE;

  const [guests, setGuests] = useState(2);
  // The budget is kept per guest, so adding a guest grows the table's budget with it.
  const [per, setPer] = useState(lounge ? 450_000 : 350_000);
  const [halal, setHalal] = useState(false);
  const hasHalal = useMemo(() => menu.categories.some((c) => c.items.some((i) => i.tags.includes("halal"))), [menu]);
  const [mood, setMood] = useState<Mood>(moods[0]!);
  const [veg, setVeg] = useState(false);
  const [alcohol, setAlcohol] = useState(lounge);
  const [result, setResult] = useState<RouletteResult | undefined>(undefined);
  const [round, setRound] = useState(0);
  const wheel = useWheelSpin();
  const top = useRef<HTMLDivElement>(null);
  const value = per * guests;
  const tags = [...(veg ? ["vegetarian"] : []), ...(halal ? ["halal"] : [])];

  // Drop one dish from the set; the total follows.
  const remove = (it: MenuItem) => {
    if (!result || result.items.length < 2) return;
    haptic("light");
    const items = result.items.filter((x) => x.id !== it.id);
    const perGuest = items.reduce((n, x) => n + x.price, 0);
    setResult({ items, perGuest, total: perGuest * guests });
  };

  // Swap one dish of the set for another of the same kind that still fits the budget.
  const swap = (it: MenuItem) => {
    if (!result) return;
    const role = roleOf.get(it.id);
    const drink = role === "drink" || role === "hot_drink" || role === "alcohol";
    const room = per - result.perGuest + it.price;
    const options = menu.categories
      .filter((c) => c.role === role)
      .flatMap((c) => c.items)
      .filter((o) => o.price > 0 && o.price <= room && !result.items.some((x) => x.id === o.id) && (drink || tags.every((tag) => o.tags.includes(tag))));
    if (!options.length) {
      haptic("tick");
      return;
    }
    haptic("light");
    const next = options[Math.floor(Math.random() * options.length)]!;
    const items = result.items.map((x) => (x.id === it.id ? next : x));
    const perGuest = items.reduce((n, x) => n + x.price, 0);
    setResult({ items, perGuest, total: perGuest * guests });
  };

  const spin = () => {
    if (wheel.spinning) return;
    haptic("light");
    top.current?.closest(".overflow-y-auto")?.scrollTo({ top: 0, behavior: "smooth" });
    const r = spinRoulette({ menu, budget: value, guests, mood, includeAlcohol: alcohol, requireTags: tags.length ? tags : undefined });
    setResult(undefined);
    wheel.spin(() => {
      setResult(r);
      setRound((n) => n + 1);
    });
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      label={ui(lang, "roulette")}
      title={false}
      footer={
        result ? (
          <div className="flex gap-2.5">
            <button onClick={spin} disabled={wheel.spinning} className="press h-14 flex-1 rounded-full bg-g-fill text-[16px] font-semibold">
              {ui(lang, "spinAgain")}
            </button>
            <button
              onClick={() => {
                haptic("success");
                onAddAll(result.items, guests);
              }}
              className="blue-grad press h-14 flex-[1.6] rounded-full px-3 text-[16px] font-semibold whitespace-nowrap tabular-nums"
            >
              {ui(lang, "add")} · {formatMoney(result.total, currency, lang)}
            </button>
          </div>
        ) : (
          <button onClick={spin} disabled={wheel.spinning} className="blue-grad press flex h-14 w-full items-center justify-between gap-2 rounded-full px-6 text-[16px] font-semibold">
            <span className="flex items-center gap-2">
              <Dices size={20} strokeWidth={2} /> {ui(lang, "spin")}
            </span>
            <span className="flex items-center gap-1.5 text-white/85 tabular-nums">
              <Users size={15} strokeWidth={2.2} /> {guests} · {formatMoney(value, currency, lang)}
            </span>
          </button>
        )
      }
    >
      <div ref={top} className="px-5 pt-2 pb-8">
        <h2 className="text-[28px] leading-[1.1] font-bold tracking-[-0.02em]">{ui(lang, "roulette")}</h2>
        <p className="mt-1.5 text-[15px] text-g-muted">{ui(lang, "rouletteHint")}</p>

        <div className="mt-6 flex justify-center">
          <RouletteWheel spinRef={wheel.ref} pointerRef={wheel.pointer} won={wheel.won} idle={wheel.idle} size={232} />
        </div>

        {result === null && <p className="mt-6 text-center text-[15px] text-g-muted">{ui(lang, "nothingFits")}</p>}
        {result && (
          // The picked set flies out of the wheel one by one, then the total counts up.
          <div key={round} className="mt-7">
            <p className="result-in text-[13px] font-semibold tracking-[0.06em] text-g-blue uppercase" style={{ animationDelay: "0ms" }}>
              {ui(lang, "rouletteYourSet")}
            </p>
            <div className="mt-1 divide-y divide-g-line">
              {result.items.map((it, i) => (
                <div key={it.id} className="result-in flex items-center gap-3.5 py-3" style={{ animationDelay: `${140 + i * 170}ms` }}>
                  <DishTile item={it} role={roleOf.get(it.id) ?? "main"} photoScale={0.9} glyph={0.5} className="size-14 shrink-0 rounded-[16px]" />
                  <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{t(it.name, lang)}</span>
                  <span className="shrink-0 text-[15px] text-g-muted tabular-nums">{formatMoney(it.price, currency, lang)}</span>
                  {/* Swap for another of the same kind, or drop it from the set. */}
                  <span className="flex shrink-0 gap-1.5">
                    <button aria-label={ui(lang, "swapDish")} onClick={() => swap(it)} className="press grid size-9 place-items-center rounded-full bg-g-fill text-g-blue">
                      <RefreshCw size={15} strokeWidth={2.2} />
                    </button>
                    {result.items.length > 1 && (
                      <button aria-label={ui(lang, "removeDish")} onClick={() => remove(it)} className="press grid size-9 place-items-center rounded-full bg-g-fill text-g-muted">
                        <X size={16} strokeWidth={2.4} />
                      </button>
                    )}
                  </span>
                </div>
              ))}
            </div>
            <div className="result-in mt-1 flex items-baseline justify-between border-t border-g-line pt-3.5" style={{ animationDelay: `${140 + result.items.length * 170}ms` }}>
              <span className="text-[13px] leading-snug text-g-muted">
                {formatMoney(result.perGuest, currency, lang)} {ui(lang, "perGuest")} × {guests}
                <br />
                {ui(lang, "servicePct").replace("{p}", String(Math.round(rate * 100)))} · {formatMoney(withService(result.total, rate).service, currency, lang)}
              </span>
              <span className="text-[24px] font-semibold tracking-[-0.02em] tabular-nums">
                <CountMoney to={withService(result.total, rate).total} delay={140 + result.items.length * 170} format={(n) => formatMoney(n, currency, lang)} />
              </span>
            </div>
          </div>
        )}

        {/* Mood: two rows that scroll sideways, so ten moods take the room of two lines. */}
        <section className="mt-9">
          <StepHead title={ui(lang, "mood")} />
          <div className="no-scrollbar -mx-5 grid grid-flow-col grid-rows-2 justify-start gap-2 overflow-x-auto px-5 [grid-auto-columns:max-content]">
            {moods.map((m) => {
              const { key, icon: Icon } = MOODS[m];
              return (
                <ChoiceChip key={m} on={m === mood} onClick={() => setMood(m)} icon={<Icon size={16} strokeWidth={2} />}>
                  {ui(lang, key)}
                </ChoiceChip>
              );
            })}
          </div>
        </section>

        {/* Guests and budget live in one card: the budget is per guest, the total follows. */}
        <section className="mt-8 rounded-[24px] bg-g-fill p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[15px] font-semibold">
              <Users size={17} strokeWidth={2.2} className="text-g-blue" /> {ui(lang, "guests")}
            </span>
            <div className="flex h-11 items-center gap-1 rounded-full bg-white px-1">
              <button
                aria-label="Fewer guests"
                onClick={() => {
                  haptic("tick");
                  setGuests((g) => Math.max(1, g - 1));
                }}
                className="press grid size-9 place-items-center rounded-full"
              >
                <Minus size={17} />
              </button>
              <span className="w-7 text-center text-[18px] font-semibold tabular-nums">{guests}</span>
              <button
                aria-label="More guests"
                onClick={() => {
                  haptic("tick");
                  setGuests((g) => Math.min(12, g + 1));
                }}
                className="press grid size-9 place-items-center rounded-full"
              >
                <Plus size={17} />
              </button>
            </div>
          </div>
          <div className="my-4 border-t border-g-line" />
          <div className="flex items-end justify-between gap-3">
            <span>
              <span className="block text-[13px] font-medium text-g-muted">{ui(lang, "budget")}</span>
              <span className="block text-[32px] leading-tight font-semibold tracking-[-0.03em] tabular-nums">{formatMoney(value, currency, lang)}</span>
            </span>
            <span className="pb-1.5 text-right text-[13px] text-g-muted tabular-nums">
              {formatMoney(per, currency, lang)}
              <br />
              {ui(lang, "perGuest")}
            </span>
          </div>
          <div className="mt-3">
            <TrackSlider value={per} min={PER_MIN} max={PER_MAX} step={25_000} onChange={setPer} label={ui(lang, "budget")} valueText={formatMoney(value, currency, lang)} />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {LEVELS.map(([key, v]) => (
              <button
                key={key}
                onClick={() => {
                  haptic("tick");
                  setPer(v);
                }}
                aria-pressed={per === v}
                className={`press h-9 rounded-full text-[13px] font-semibold ${per === v ? "bg-g-ink text-white" : "bg-white"}`}
              >
                {ui(lang, key)}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <StepHead title={ui(lang, "preferences")} aside={ui(lang, "optional")} />
          <div className="flex flex-wrap gap-2">
            <ChoiceChip on={veg} onClick={() => setVeg((v) => !v)}>
              {ui(lang, "vegetarian")}
            </ChoiceChip>
            {hasHalal && (
              <ChoiceChip on={halal} onClick={() => setHalal((v) => !v)}>
                {ui(lang, "halalOnly")}
              </ChoiceChip>
            )}
            <ChoiceChip on={alcohol} onClick={() => setAlcohol((v) => !v)}>
              {ui(lang, "alcohol")}
            </ChoiceChip>
          </div>
        </section>
      </div>
    </Sheet>
  );
}
