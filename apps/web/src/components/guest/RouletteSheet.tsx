"use client";

import { allItems, formatMoney, moodsFor, spinRoulette, t, type Lang, type Menu, type MenuItem, type Mood, type RouletteResult } from "@yanyin/domain";
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
  const [guests, setGuests] = useState(2);
  const [budget, setBudget] = useState(lounge ? 900_000 : 700_000);
  const [mood, setMood] = useState<Mood>(moods[0]!);
  const [veg, setVeg] = useState(false);
  const [alcohol, setAlcohol] = useState(lounge);
  const [result, setResult] = useState<RouletteResult | undefined>(undefined);
  const [spinning, setSpinning] = useState(false);
  const [reel, setReel] = useState<MenuItem | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pool = useMemo(() => allItems(menu), [menu]);
  const roleOf = useMemo(() => new Map(menu.categories.flatMap((c) => c.items.map((i) => [i.id, c.role] as const))), [menu]);
  const { currency } = menu.venue;
  const min = 100_000 * guests;
  const max = 3_000_000;

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  const spin = () => {
    setSpinning(true);
    setResult(undefined);
    timer.current = setInterval(() => setReel(pool[Math.floor(Math.random() * pool.length)] ?? null), 90);
    setTimeout(() => {
      if (timer.current) clearInterval(timer.current);
      setReel(null);
      setSpinning(false);
      setResult(spinRoulette({ menu, budget, guests, mood, includeAlcohol: alcohol, requireTags: veg ? ["vegetarian"] : undefined }));
    }, 1200);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      label={ui(lang, "roulette")}
      footer={
        result ? (
          <div className="flex gap-2.5">
            <button onClick={spin} className="press h-14 flex-1 rounded-full bg-g-fill text-[16px] font-semibold">
              {ui(lang, "spinAgain")}
            </button>
            <button onClick={() => onAddAll(result.items, guests)} className="press h-14 flex-[1.4] rounded-full bg-g-blue text-[16px] font-semibold text-white">
              {ui(lang, "addAll")}
            </button>
          </div>
        ) : (
          <button onClick={spin} disabled={spinning} className="press flex h-14 w-full items-center justify-center gap-2 rounded-full bg-g-blue text-[16px] font-semibold text-white disabled:opacity-70">
            <Dices size={20} strokeWidth={2} className={spinning ? "animate-spin" : ""} /> {ui(lang, "spin")}
          </button>
        )
      }
    >
      <div className="px-5 pt-8 pb-4">
        <h2 className="text-[26px] font-bold tracking-[-0.02em]">{ui(lang, "roulette")}</h2>
        <p className="mt-1 text-[15px] text-g-muted">{ui(lang, "rouletteHint")}</p>

        {(spinning || result !== undefined) && (
          <div className="mt-5 rounded-[24px] bg-g-fill p-4">
            {spinning && reel && (
              <div className="flex items-center gap-3.5">
                <DishTile item={reel} role={roleOf.get(reel.id) ?? "main"} iconSize={20} className="size-14 shrink-0 rounded-2xl bg-white" />
                <p className="text-[16px] font-medium opacity-60">{t(reel.name, lang)}</p>
              </div>
            )}
            {!spinning && result === null && <p className="py-3 text-center text-[15px] text-g-muted">{ui(lang, "nothingFits")}</p>}
            {!spinning && result && (
              <div className="animate-pop">
                {result.items.map((it) => (
                  <div key={it.id} className="flex items-center gap-3.5 py-2">
                    <DishTile item={it} role={roleOf.get(it.id) ?? "main"} iconSize={20} photoScale={0.92} className="size-14 shrink-0 rounded-2xl bg-white" />
                    <p className="min-w-0 flex-1 truncate text-[15px] font-medium">{t(it.name, lang)}</p>
                    <p className="text-[15px] font-semibold tabular-nums">{formatMoney(it.price, currency, lang)}</p>
                  </div>
                ))}
                <div className="mt-2 flex items-baseline justify-between border-t border-g-fill-2 pt-3">
                  <span className="text-[13px] text-g-muted">
                    {formatMoney(result.perGuest, currency, lang)} {ui(lang, "perGuest")} × {guests}
                  </span>
                  <span className="text-[20px] font-bold tabular-nums">{formatMoney(result.total, currency, lang)}</span>
                </div>
              </div>
            )}
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
            max={max}
            step={50_000}
            value={Math.max(min, budget)}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="mt-3 w-full accent-[var(--g-blue)]"
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {[
            [veg, setVeg, "vegetarian"],
            [alcohol, setAlcohol, "alcohol"],
          ].map(([on, set, key]) => (
            <button
              key={key as string}
              onClick={() => (set as (fn: (v: boolean) => boolean) => void)((v) => !v)}
              aria-pressed={on as boolean}
              className={`press flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium ${on ? "bg-g-ink text-white" : "bg-g-fill"}`}
            >
              {(on as boolean) && <Check size={15} strokeWidth={2.5} />}
              {ui(lang, key as UiKey)}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
