"use client";

import { Shuffle, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { allItems, formatMoney, t, type Currency, type Lang, type Menu, type MenuItem } from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import { ui } from "@/lib/ui-strings";
import { DishTile, Sheet } from "./ui";

/*
 * Mystery Dish (roadmap, MVP): the guest sets a budget and food or drink, the
 * card lies face down; one tap flips it to a dish picked for them. Take it, or
 * try once more; the second card is final ("it's fate"). Only dishes that can
 * be ordered in one tap and are not in the stop-list.
 */

const DRINK = ["drink", "hot_drink", "alcohol", "hookah"];
const BUDGETS = [
  { id: "low", max: 150_000 },
  { id: "mid", max: 300_000 },
  { id: "any", max: Infinity },
] as const;

export function MysterySheet({ open, onClose, lang, currency, menu, onTake }: { open: boolean; onClose: () => void; lang: Lang; currency: Currency; menu: Menu; onTake: (item: MenuItem) => void }) {
  const [budget, setBudget] = useState<(typeof BUDGETS)[number]["id"]>("mid");
  const [kind, setKind] = useState<"food" | "drink">("food");
  const [dish, setDish] = useState<MenuItem | null>(null);
  const [tries, setTries] = useState(0);
  const roleOf = useMemo(() => new Map(menu.categories.flatMap((c) => c.items.map((i) => [i.id, c.role] as const))), [menu]);
  const pool = useMemo(() => {
    const max = BUDGETS.find((b) => b.id === budget)!.max;
    const fits = allItems(menu).filter((i) => i.price > 0 && i.price <= max && !i.variants.length && !i.modifierGroups.some((g) => g.required) && DRINK.includes(roleOf.get(i.id) ?? "") === (kind === "drink"));
    // A reveal should look appetising: dishes with a photo first, the rest only if none has one.
    const shot = fits.filter((i) => i.photo || i.cover);
    return shot.length >= 3 ? shot : fits;
  }, [menu, budget, kind, roleOf]);
  const money = (n: number) => formatMoney(n, currency, lang);
  const flip = () => {
    if (!pool.length) return;
    haptic("success");
    const others = pool.filter((p) => p.id !== dish?.id);
    setDish(others[Math.floor(Math.random() * others.length)] ?? pool[0]!);
    setTries((n) => n + 1);
  };
  if (!open) return null;
  return (
    <Sheet
      open
      onClose={onClose}
      label={ui(lang, "mysteryTitle")}
      title={false}
      footer={
        dish ? (
          <div className="flex gap-3">
            <button disabled={tries >= 2} onClick={flip} className="press flex h-14 items-center gap-2 rounded-full bg-g-fill px-5 text-[15px] font-semibold text-g-ink-2 disabled:opacity-50">
              <Shuffle size={17} strokeWidth={2.2} /> {tries >= 2 ? ui(lang, "mysteryFate") : ui(lang, "mysteryAgain")}
            </button>
            <button onClick={() => (haptic("success"), onTake(dish))} className="blue-grad press h-14 flex-1 rounded-full text-[16px] font-semibold tabular-nums">
              {ui(lang, "mysteryTake")} · {money(dish.price)}
            </button>
          </div>
        ) : (
          <button disabled={!pool.length} onClick={flip} className="blue-grad press flex h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-semibold disabled:opacity-40">
            <Sparkles size={18} strokeWidth={2.2} /> {ui(lang, "mysteryGo")}
          </button>
        )
      }
    >
      <div className="px-5 pt-1 pb-8">
        <h2 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">{ui(lang, "mysteryTitle")}</h2>
        <p className="mt-1 text-[14px] text-g-muted">{ui(lang, "mysteryHint")}</p>

        {!dish && (
          <div className="mt-5 grid gap-3">
            <div className="flex rounded-full bg-g-fill p-1">
              {(["food", "drink"] as const).map((k) => (
                <button key={k} onClick={() => (haptic("tick"), setKind(k))} aria-pressed={kind === k} className={`h-10 flex-1 rounded-full text-[14px] font-semibold transition-colors ${kind === k ? "bg-white text-g-ink shadow-[0_1px_3px_rgba(11,11,15,0.12)]" : "text-g-muted"}`}>
                  {ui(lang, k === "food" ? "mysteryFood" : "mysteryDrink")}
                </button>
              ))}
            </div>
            <div className="flex rounded-full bg-g-fill p-1">
              {BUDGETS.map((b) => (
                <button key={b.id} onClick={() => (haptic("tick"), setBudget(b.id))} aria-pressed={budget === b.id} className={`h-10 flex-1 rounded-full text-[14px] font-semibold tabular-nums transition-colors ${budget === b.id ? "bg-white text-g-ink shadow-[0_1px_3px_rgba(11,11,15,0.12)]" : "text-g-muted"}`}>
                  {b.id === "any" ? ui(lang, "mysteryAny") : `≤ ${Math.round(b.max / 1000)}k`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* The card: face down with a question mark, flips over to the dish. Only transform animates. */}
        <div className="mt-6 [perspective:1200px]">
          <div className="relative aspect-[4/5] w-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] [transform-style:preserve-3d]" style={{ transform: dish ? "rotateY(180deg)" : "none" }}>
            <div className="blue-grad absolute inset-0 grid place-items-center rounded-[32px] [backface-visibility:hidden]">
              <span className="text-[120px] leading-none font-bold text-white/90">?</span>
              <span className="absolute bottom-6 text-[14px] font-semibold text-white/70">{pool.length ? ui(lang, "mysteryCount").replace("{n}", String(pool.length)) : ui(lang, "mysteryNone")}</span>
            </div>
            <div className="absolute inset-0 flex flex-col overflow-hidden rounded-[32px] bg-g-fill [backface-visibility:hidden] [transform:rotateY(180deg)]">
              {dish && (
                <>
                  <DishTile key={dish.id} item={dish} role={roleOf.get(dish.id) ?? "main"} photoScale={0.86} glyph={0.36} className="min-h-0 flex-1" />
                  <div key={`t-${dish.id}`} className="animate-rise p-5">
                    <p className="text-[24px] leading-tight font-bold tracking-[-0.02em]">{t(dish.name, lang)}</p>
                    {dish.description && <p className="mt-1 line-clamp-2 text-[14px] text-g-muted">{t(dish.description, lang)}</p>}
                    <p className="mt-2 text-[18px] font-semibold tabular-nums">{money(dish.price)}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
