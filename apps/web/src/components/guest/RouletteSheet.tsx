"use client";

import { formatMoney, moodsFor, spinRoulette, t, type CategoryRole, type Lang, type Menu, type MenuItem, type Mood, type RouletteResult } from "@yanyin/domain";
import { Compass, Dices, Flame, Leaf, Minus, Plus, Wind, type LucideIcon } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";
import { ui, type UiKey } from "@/lib/ui-strings";
import { CountMoney, RouletteWheel, useWheelSpin } from "./motion";
import { ChoiceChip, DishTile, Sheet, StepHead, TrackSlider } from "./ui";

const MOODS: Record<Mood, { key: UiKey; icon: LucideIcon }> = {
  hungry: { key: "moodHungry", icon: Flame },
  light: { key: "moodLight", icon: Leaf },
  adventurous: { key: "moodAdventurous", icon: Compass },
  chill: { key: "moodChill", icon: Wind },
};

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

  const [guests, setGuests] = useState(2);
  const [budget, setBudget] = useState(lounge ? 900_000 : 700_000);
  const [mood, setMood] = useState<Mood>(moods[0]!);
  const [veg, setVeg] = useState(false);
  const [alcohol, setAlcohol] = useState(lounge);
  const [result, setResult] = useState<RouletteResult | undefined>(undefined);
  const [round, setRound] = useState(0);
  const wheel = useWheelSpin();
  const top = useRef<HTMLDivElement>(null);
  const min = 100_000 * guests;
  const value = Math.max(min, budget);

  const spin = () => {
    if (wheel.spinning) return;
    haptic("light");
    top.current?.closest(".overflow-y-auto")?.scrollTo({ top: 0, behavior: "smooth" });
    const r = spinRoulette({ menu, budget: value, guests, mood, includeAlcohol: alcohol, requireTags: veg ? ["vegetarian"] : undefined });
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
          <button onClick={spin} disabled={wheel.spinning} className="blue-grad press flex h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-semibold">
            <Dices size={20} strokeWidth={2} /> {ui(lang, "spin")}
          </button>
        )
      }
    >
      <div ref={top} className="px-5 pt-2 pb-8">
        <h2 className="text-[28px] leading-[1.1] font-bold tracking-[-0.02em]">{ui(lang, "roulette")}</h2>
        <p className="mt-1.5 text-[15px] text-g-muted">{ui(lang, "rouletteHint")}</p>

        <div className="mt-7 flex justify-center">
          <RouletteWheel spinRef={wheel.ref} pointerRef={wheel.pointer} won={wheel.won} idle={wheel.idle} size={264} />
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
                </div>
              ))}
            </div>
            <div className="result-in mt-1 flex items-baseline justify-between border-t border-g-line pt-3.5" style={{ animationDelay: `${140 + result.items.length * 170}ms` }}>
              <span className="text-[13px] text-g-muted">
                {formatMoney(result.perGuest, currency, lang)} {ui(lang, "perGuest")} × {guests}
              </span>
              <span className="text-[24px] font-semibold tracking-[-0.02em] tabular-nums">
                <CountMoney to={result.total} delay={140 + result.items.length * 170} format={(n) => formatMoney(n, currency, lang)} />
              </span>
            </div>
          </div>
        )}

        <section className="mt-10">
          <StepHead n={1} title={ui(lang, "mood")} />
          <div className="flex flex-wrap gap-2">
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

        <section className="mt-9">
          <StepHead n={2} title={ui(lang, "guests")} />
          <div className="flex items-center justify-between">
            <span className="text-[56px] leading-[0.9] font-semibold tracking-[-0.04em] tabular-nums">{guests}</span>
            <div className="flex h-12 items-center gap-1 rounded-full bg-g-fill px-1.5">
              {(
                [
                  [-1, Minus, "Fewer guests"],
                  [1, Plus, "More guests"],
                ] as const
              ).map(([d, Icon, label]) => (
                <button
                  key={d}
                  aria-label={label}
                  onClick={() => {
                    haptic("tick");
                    setGuests((g) => Math.min(12, Math.max(1, g + d)));
                  }}
                  className="press grid size-10 place-items-center rounded-full"
                >
                  <Icon size={18} />
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-9">
          <StepHead n={3} title={ui(lang, "budget")} />
          <p className="text-[40px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{formatMoney(value, currency, lang)}</p>
          <p className="mt-1.5 text-[14px] text-g-muted tabular-nums">
            {formatMoney(Math.floor(value / guests), currency, lang)} {ui(lang, "perGuest")}
          </p>
          <div className="mt-5">
            <TrackSlider value={value} min={min} max={3_000_000} step={50_000} onChange={setBudget} label={ui(lang, "budget")} valueText={formatMoney(value, currency, lang)} />
          </div>
          <div className="mt-1 flex justify-between text-[12px] font-medium text-g-faint tabular-nums">
            <span>{formatMoney(min, currency, lang)}</span>
            <span>{formatMoney(3_000_000, currency, lang)}</span>
          </div>
        </section>

        <section className="mt-9">
          <StepHead n={4} title={ui(lang, "preferences")} aside={ui(lang, "optional")} />
          <div className="flex flex-wrap gap-2">
            <ChoiceChip on={veg} onClick={() => setVeg((v) => !v)}>
              {ui(lang, "vegetarian")}
            </ChoiceChip>
            <ChoiceChip on={alcohol} onClick={() => setAlcohol((v) => !v)}>
              {ui(lang, "alcohol")}
            </ChoiceChip>
          </div>
        </section>
      </div>
    </Sheet>
  );
}
