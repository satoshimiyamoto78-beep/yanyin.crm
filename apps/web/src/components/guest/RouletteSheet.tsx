"use client";

import {
  allItems,
  formatMoney,
  moodsFor,
  spinRoulette,
  t,
  type Lang,
  type Menu,
  type MenuItem,
  type Mood,
  type RouletteResult,
} from "@yanyin/domain";
import { Dices, Minus, Plus, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ui, type UiKey } from "@/lib/ui-strings";
import { Media } from "./parts";
import { Sheet } from "./Sheet";

const MOOD_KEY: Record<Mood, UiKey> = {
  hungry: "moodHungry",
  light: "moodLight",
  adventurous: "moodAdventurous",
  chill: "moodChill",
};
const MOOD_EMOJI: Record<Mood, string> = { hungry: "🔥", light: "🌿", adventurous: "🎲", chill: "💨" };

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
  const isLounge = menu.venue.type === "shisha_lounge";
  const step = 50_000;
  const [guests, setGuests] = useState(2);
  const [budget, setBudget] = useState(isLounge ? 800_000 : 700_000);
  const [mood, setMood] = useState<Mood>(moods[0]!);
  const [vegetarian, setVegetarian] = useState(false);
  const [alcohol, setAlcohol] = useState(isLounge);
  const [result, setResult] = useState<RouletteResult | undefined>(undefined);
  const [spinning, setSpinning] = useState(false);
  const [reel, setReel] = useState<MenuItem | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const pool = useMemo(() => allItems(menu), [menu]);
  const categoryOf = useMemo(() => new Map(menu.categories.flatMap((c) => c.items.map((i) => [i.id, c] as const))), [menu]);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
  }, []);

  const spin = () => {
    setSpinning(true);
    setResult(undefined);
    timer.current = setInterval(() => setReel(pool[Math.floor(Math.random() * pool.length)] ?? null), 80);
    setTimeout(() => {
      if (timer.current) clearInterval(timer.current);
      setReel(null);
      setSpinning(false);
      setResult(
        spinRoulette({ menu, budget, guests, mood, includeAlcohol: alcohol, requireTags: vegetarian ? ["vegetarian"] : undefined }),
      );
    }, 1300);
  };

  const { currency } = menu.venue;
  const min = 100_000 * guests;
  const max = 3_000_000;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={ui(lang, "roulette")}
      footer={
        result ? (
          <div className="flex gap-2">
            <button onClick={spin} className="press h-12 flex-1 rounded-full bg-guest-surface-2 font-bold">
              {ui(lang, "spinAgain")}
            </button>
            <button
              onClick={() => {
                onAddAll(result.items, guests);
                onClose();
              }}
              className="press h-12 flex-[1.4] rounded-full bg-guest-cta font-bold text-guest-cta-ink"
            >
              {ui(lang, "addAll")}
            </button>
          </div>
        ) : (
          <button
            onClick={spin}
            disabled={spinning}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-guest-cta font-bold text-guest-cta-ink transition active:scale-[0.98] disabled:opacity-60"
          >
            <Dices className={`size-5 ${spinning ? "animate-spin" : ""}`} /> {ui(lang, "spin")}
          </button>
        )
      }
    >
      <div className="space-y-5 px-5 pt-1 pb-4">
        <div>
          <h2 className="flex items-center gap-2 text-[20px] font-extrabold tracking-tight">
            <Sparkles className="size-5 text-guest-cta" /> {ui(lang, "roulette")}
          </h2>
          <p className="text-sm text-guest-muted">{ui(lang, "rouletteHint")}</p>
        </div>

        {(spinning || result !== undefined) && (
          <div className="rounded-[22px] bg-guest-surface-2 p-4">
            {spinning && reel && (
              <div className="flex items-center gap-3">
                <Media item={reel} category={categoryOf.get(reel.id)} iconScale={0.6} className="size-14 shrink-0 rounded-2xl" />
                <p className="text-[16px] font-bold blur-[1px]">{t(reel.name, lang)}</p>
              </div>
            )}
            {!spinning && result === null && <p className="text-center text-sm">{ui(lang, "nothingFits")}</p>}
            {!spinning && result && (
              <div className="animate-pop space-y-3">
                {result.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    <Media item={item} category={categoryOf.get(item.id)} iconScale={0.6} className="size-14 shrink-0 rounded-2xl" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-bold">{t(item.name, lang)}</p>
                      <p className="text-sm text-guest-muted tabular-nums">{formatMoney(item.price, currency, lang)}</p>
                    </div>
                  </div>
                ))}
                <div className="flex items-baseline justify-between border-t border-guest-line pt-2">
                  <span className="text-sm text-guest-muted">
                    {formatMoney(result.perGuest, currency, lang)} {ui(lang, "perGuest")} × {guests}
                  </span>
                  <span className="text-[18px] font-extrabold text-guest-cta tabular-nums">{formatMoney(result.total, currency, lang)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <p className="mb-2 text-sm font-semibold">{ui(lang, "mood")}</p>
          <div className="grid grid-cols-2 gap-2">
            {moods.map((m) => (
              <button
                key={m}
                onClick={() => setMood(m)}
                aria-pressed={m === mood}
                className={`press rounded-2xl border-[1.5px] px-3 py-3 text-left text-sm font-bold transition ${
                  m === mood ? "accent-soft border-guest-cta text-guest-cta" : "border-transparent bg-guest-surface-2"
                }`}
              >
                <span className="mr-1.5 text-lg">{MOOD_EMOJI[m]}</span>
                {ui(lang, MOOD_KEY[m])}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{ui(lang, "guests")}</p>
          <div className="flex items-center rounded-full bg-guest-surface-2">
            <button aria-label="Fewer guests" onClick={() => setGuests((g) => Math.max(1, g - 1))} className="grid size-10 place-items-center">
              <Minus className="size-4" />
            </button>
            <span className="w-6 text-center font-semibold tabular-nums">{guests}</span>
            <button aria-label="More guests" onClick={() => setGuests((g) => Math.min(12, g + 1))} className="grid size-10 place-items-center">
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <label htmlFor="budget" className="text-sm font-semibold">
              {ui(lang, "budget")}
            </label>
            <span className="font-extrabold tabular-nums">{formatMoney(budget, currency, lang)}</span>
          </div>
          <input
            id="budget"
            type="range"
            min={min}
            max={max}
            step={step}
            value={Math.max(min, budget)}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full accent-[var(--guest-cta)]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Toggle on={vegetarian} onClick={() => setVegetarian((v) => !v)}>
            🌱 {ui(lang, "vegetarian")}
          </Toggle>
          <Toggle on={alcohol} onClick={() => setAlcohol((v) => !v)}>
            🍸 {ui(lang, "alcohol")}
          </Toggle>
        </div>
      </div>
    </Sheet>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`press rounded-full border-[1.5px] px-3 py-2 text-sm font-bold transition ${
        on ? "accent-soft border-guest-cta text-guest-cta" : "border-transparent bg-guest-surface-2 text-guest-muted"
      }`}
    >
      {children}
    </button>
  );
}
