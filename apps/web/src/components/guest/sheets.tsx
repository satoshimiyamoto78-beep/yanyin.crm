"use client";

import {
  defaultOptionIds,
  formatMoney,
  missingRequired,
  t,
  unitPrice,
  type CartLine,
  type Category,
  type Currency,
  type Lang,
  type Menu,
  type MenuItem,
  type ModifierGroup,
} from "@yanyin/domain";
import { Check, ChevronRight, Clock, Copy, FlameKindling, ImageIcon, Leaf, MapPin, Navigation, Phone, Search, SearchX, Send, Share2, SlidersHorizontal, Wallet, Wifi, X } from "lucide-react";
import { useMemo, useState } from "react";
import { LANG_LABEL, UI_LANGS, ui, type UiKey } from "@/lib/ui-strings";
import type { VenueBrand } from "@/lib/visual";
import Image from "next/image";
import { haptic } from "@/lib/haptics";
import { DrinkPreview, HalvesPicker, OptionTiles, PizzaPreview, drinkColor, drinkName } from "./builders";

const tint = (c: string, a: number) => {
  const m = /^#([0-9a-f]{6})$/i.exec(c);
  if (!m) return `rgba(143,178,255,${a})`;
  const n = parseInt(m[1]!, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
import { DishTile, HalalIcon, ItemCard, ItemChips, Sheet, Stepper, TrackSlider, altName } from "./ui";

/* ---------------------------------------------------------------- Item */

export function ItemSheet({
  item,
  category,
  lang,
  currency,
  onClose,
  onAdd,
}: {
  item: MenuItem | null;
  category: Category | null;
  lang: Lang;
  currency: Currency;
  onClose: () => void;
  onAdd: (item: MenuItem, variantId: string | undefined, optionIds: string[], qty: number) => void;
}) {
  if (!item || !category) return null;
  if (item.builder === "halves") return <HalvesPicker key={item.id} item={item} lang={lang} currency={currency} onClose={onClose} onAdd={onAdd} />;
  return <ItemSheetBody key={item.id} item={item} category={category} lang={lang} currency={currency} onClose={onClose} onAdd={onAdd} />;
}

function ItemSheetBody({
  item,
  category,
  lang,
  currency,
  onClose,
  onAdd,
}: {
  item: MenuItem;
  category: Category;
  lang: Lang;
  currency: Currency;
  onClose: () => void;
  onAdd: (item: MenuItem, variantId: string | undefined, optionIds: string[], qty: number) => void;
}) {
  const [variantId, setVariantId] = useState<string | undefined>(item.variants[0]?.id);
  const [optionIds, setOptionIds] = useState<string[]>(() => defaultOptionIds(item));
  const [qty, setQty] = useState(1);
  const missing = missingRequired(item, optionIds);
  const price = unitPrice(item, variantId, optionIds);
  const alt = altName(item, lang);

  const toggle = (groupId: string, optionId: string) => {
    const group = item.modifierGroups.find((g) => g.id === groupId)!;
    setOptionIds((prev) => {
      const ids = group.options.map((o) => o.id);
      if (prev.includes(optionId)) return prev.filter((id) => id !== optionId);
      const mine = prev.filter((id) => ids.includes(id));
      if (group.max === 1) return [...prev.filter((id) => !ids.includes(id)), optionId];
      // In a multi-pick group the preselected option ("master's choice") excludes the rest.
      const auto = group.defaultOptionId;
      if (auto && optionId === auto) return [...prev.filter((id) => !ids.includes(id)), optionId];
      if (auto && mine.includes(auto)) return [...prev.filter((id) => id !== auto), optionId];
      return mine.length >= group.max ? prev : [...prev, optionId];
    });
  };

  return (
    <Sheet
      open
      onClose={onClose}
      label={t(item.name, lang)}
      title={false}
      footer={
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-[124px] items-center justify-between rounded-full bg-g-fill px-1.5">
            <button aria-label="Remove one" onClick={() => setQty((q) => Math.max(1, q - 1))} className="press grid size-9 place-items-center rounded-full text-xl">
              −
            </button>
            <span className="text-[16px] font-semibold tabular-nums">{qty}</span>
            <button aria-label="Add one" onClick={() => setQty((q) => q + 1)} className="press grid size-9 place-items-center rounded-full text-xl">
              +
            </button>
          </div>
          <button
            disabled={missing.length > 0}
            onClick={() => {
              haptic("success");
              onAdd(item, variantId, optionIds, qty);
            }}
            className={`press flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-[16px] font-semibold tabular-nums ${missing.length ? "bg-g-fill-2 text-g-faint" : "blue-grad"}`}
          >
            {ui(lang, "add")} · {formatMoney(price * qty, currency, lang)}
          </button>
        </div>
      }
    >
      {item.builder ? (
        <div className="px-3 pt-3">
          {/* Constructor: a live preview that follows every pick. */}
          {item.builder === "pizza" ? (
            <div className="mesh-blue aspect-[1.15] w-full rounded-[28px] p-4">
              <PizzaPreview item={item} ids={optionIds} variantId={variantId} />
            </div>
          ) : (
            // The stage takes the drink's colour; its live name sits on top.
            <div
              className="relative aspect-[1.1] w-full overflow-hidden rounded-[28px] transition-[background] duration-500"
              style={{ background: `radial-gradient(120% 90% at 50% 100%, ${tint(drinkColor(item, optionIds), 0.35)} 0%, ${tint(drinkColor(item, optionIds), 0.08)} 55%, #f7f8fb 100%)` }}
            >
              <p key={drinkName(item, optionIds, lang)} className="animate-pop absolute inset-x-0 top-4 px-5 text-center text-[15px] font-semibold text-g-ink-2">
                {drinkName(item, optionIds, lang) || "\u00a0"}
              </p>
              <div className="absolute inset-x-6 top-10 bottom-2">
                <DrinkPreview item={item} ids={optionIds} variantId={variantId} />
              </div>
            </div>
          )}
        </div>
      ) : item.cover ? (
        <div className="px-3 pt-3">
          <div className="relative aspect-[1.2] w-full overflow-hidden rounded-[28px]">
            <Image src={item.cover} alt="" fill sizes="480px" className="object-cover" />
          </div>
        </div>
      ) : item.photo ? (
        <div className="px-3 pt-3">
          <DishTile item={item} role={category.role} photoScale={0.8} glyph={0.3} className="aspect-[1.25] w-full rounded-[28px]" />
        </div>
      ) : (
        <div className="px-3 pt-3">
          <DishTile item={item} role={category.role} glyph={0.3} className="aspect-[2] w-full rounded-[28px]" />
        </div>
      )}
      <div className="px-5 pt-5 pb-6">
        <p className="text-[13px] font-medium text-g-muted">{t(category.name, lang)}</p>
        <h2 className="mt-1 text-[26px] leading-[1.15] font-bold tracking-[-0.02em] text-balance">{t(item.name, lang)}</h2>
        {alt && <p className="mt-1 text-[14px] text-g-faint">{alt}</p>}
        {item.description && <p className="mt-3 text-[16px] leading-[1.5] text-g-ink-2">{t(item.description, lang)}</p>}
        <div className="mt-3 empty:hidden">
          <ItemChips item={item} lang={lang} />
        </div>

        {item.variants.length > 0 && (
          <div className="mt-6 flex rounded-full bg-g-fill p-1">
            {item.variants.map((v) => {
              const on = v.id === variantId;
              return (
                <button
                  key={v.id}
                  onClick={() => setVariantId(v.id)}
                  aria-pressed={on}
                  className={`flex h-11 flex-1 flex-col items-center justify-center rounded-full transition-all ${on ? "bg-white" : "text-g-muted"}`}
                >
                  <span className="text-[14px] font-semibold">{t(v.name, lang)}</span>
                  <span className="text-[11px] tabular-nums">{formatMoney(v.price, currency, lang)}</span>
                </button>
              );
            })}
          </div>
        )}

        {item.modifierGroups.map((g, gi) => {
          const steps = item.modifierGroups.length > 1;
          return (
            <section key={g.id} className="mt-9">
              <div className="mb-4 flex items-baseline gap-2.5">
                {steps && <span className="text-[13px] font-semibold text-g-blue tabular-nums">{String(gi + 1).padStart(2, "0")}</span>}
                <h3 className="text-[17px] font-semibold">{t(g.name, lang)}</h3>
                <span className={`ml-auto text-[13px] font-medium ${g.required && missing.includes(g.id) ? "text-g-blue" : "text-g-faint"}`}>
                  {(g.display === "chips" || g.display === "tiles") && g.max > 1 && g.max < g.options.length ? `${ui(lang, "pickUpTo")} ${g.max} · ` : ""}
                  {g.display === "remove" ? ui(lang, "tapToRemove") : ui(lang, g.required ? "required" : "optional")}
                </span>
              </div>
              {g.display === "remove" ? (
                // Ingredients the dish comes with: tap to take one out (it strikes through).
                <div className="flex flex-wrap gap-2">
                  {g.options.map((o) => {
                    const out = optionIds.includes(o.id);
                    return (
                      <button
                        key={o.id}
                        onClick={() => {
                          haptic("light");
                          toggle(g.id, o.id);
                        }}
                        aria-pressed={out}
                        aria-label={`${out ? "Return" : "Remove"} ${t(o.name, lang)}`}
                        className={`press flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-medium transition-all ${out ? "bg-g-fill text-g-faint line-through" : "bg-g-blue-soft text-g-ink"}`}
                      >
                        {out ? <X size={15} strokeWidth={2.25} /> : <Check size={15} strokeWidth={2.5} className="text-g-blue" />}
                        {t(o.name, lang)}
                      </button>
                    );
                  })}
                </div>
              ) : g.display === "segment" ? (
                <div>
                  <div className="flex rounded-full bg-g-fill p-1">
                    {g.options.map((o) => {
                      const on = optionIds.includes(o.id);
                      return (
                        <button
                          key={o.id}
                          onClick={() => {
                            haptic("tick");
                            if (!on) toggle(g.id, o.id);
                          }}
                          aria-pressed={on}
                          aria-label={t(o.name, lang)}
                          className={`h-10 flex-1 rounded-full text-[13px] font-semibold tabular-nums transition-colors ${on ? "bg-white text-g-ink" : "text-g-muted"}`}
                        >
                          {o.note ? t(o.note, lang) : t(o.name, lang)}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[13px] text-g-muted">{t(g.options.find((o) => optionIds.includes(o.id))?.name ?? { en: "" }, lang)}</p>
                </div>
              ) : g.display === "tiles" ? (
                <OptionTiles
                  group={g}
                  lang={lang}
                  currency={currency}
                  value={optionIds}
                  onPick={(id) => {
                    haptic("light");
                    toggle(g.id, id);
                  }}
                />
              ) : g.display === "brands" ? (
                <TobaccoTiles
                  group={g}
                  lang={lang}
                  currency={currency}
                  basePrice={item.price}
                  value={optionIds}
                  onPick={(id) => {
                    haptic("light");
                    toggle(g.id, id);
                  }}
                />
              ) : g.display === "scale" ? (
                <StrengthScale
                  group={g}
                  lang={lang}
                  value={g.options.findIndex((o) => optionIds.includes(o.id))}
                  onChange={(i) => {
                    const ids = g.options.map((o) => o.id);
                    setOptionIds((prev) => [...prev.filter((id) => !ids.includes(id)), g.options[i]!.id]);
                  }}
                />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {g.options.map((o) => {
                    const on = optionIds.includes(o.id);
                    return (
                      <button
                        key={o.id}
                        onClick={() => {
                          haptic("light");
                          toggle(g.id, o.id);
                        }}
                        aria-pressed={on}
                        className={`press flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium transition-colors ${on ? "bg-g-ink text-white" : "bg-g-fill"}`}
                      >
                        {on && <Check size={15} strokeWidth={2.5} />}
                        {t(o.name, lang)}
                        {o.price > 0 && <span className={on ? "text-white/60" : "text-g-muted"}>+{formatMoney(o.price, currency, lang)}</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </Sheet>
  );
}

/* ---------------------------------------------------------------- Tobacco tiles */

/**
 * Hookah tobacco as big brand tiles, two per row. The picked one gets the
 * spinning blue ring. A venue logo replaces the wordmark once uploaded.
 */
function TobaccoTiles({
  group,
  lang,
  currency,
  basePrice,
  value,
  onPick,
}: {
  group: ModifierGroup;
  lang: Lang;
  currency: Currency;
  basePrice: number;
  value: string[];
  onPick: (optionId: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {group.options.map((o) => {
        const on = value.includes(o.id);
        return (
          <button
            key={o.id}
            onClick={() => onPick(o.id)}
            aria-pressed={on}
            className={`press flex min-h-[92px] flex-col items-start justify-between rounded-[20px] p-3.5 text-left transition-colors ${on ? "spin-ring bg-g-blue-soft" : "bg-g-fill"}`}
          >
            <span className="flex w-full items-start justify-between gap-2">
              {o.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.logo} alt={t(o.name, lang)} className="h-7 w-auto max-w-[80%] object-contain object-left" />
              ) : (
                <span className="text-[18px] leading-[1.1] font-bold tracking-[-0.02em]">{t(o.name, lang)}</span>
              )}
              <span
                className={`grid size-5 shrink-0 place-items-center rounded-full transition-colors ${on ? "bg-g-blue text-white" : "border-[1.5px] border-g-faint/50"}`}
              >
                {on && <Check size={13} strokeWidth={3} />}
              </span>
            </span>
            <span className="mt-2 flex w-full flex-col gap-0.5">
              {o.note && <span className="text-[12px] leading-[1.3] text-g-muted">{t(o.note, lang)}</span>}
              <span className={`text-[13px] font-semibold tabular-nums ${on ? "text-g-blue" : "text-g-ink-2"}`}>
                {formatMoney(basePrice + o.price, currency, lang)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- Strength scale */

const STRENGTH_KEYS = ["strength1", "strength2", "strength3", "strength4"] as const;

/** Hookah strength 1–10: a big number, a word for it and a flat slider with ten notches. */
function StrengthScale({ group, lang, value, onChange }: { group: ModifierGroup; lang: Lang; value: number; onChange: (i: number) => void }) {
  const n = group.options.length;
  const v = Math.max(0, value);
  const strength = group.id === "strength";
  // Hookah strength reads as a number and a word; other scales (sweetness, ice) read as the step's own name.
  const word = strength ? ui(lang, STRENGTH_KEYS[Math.min(3, Math.floor((v / n) * 4))]!) : t(group.options[v]!.name, lang);
  return (
    <div>
      {strength ? (
        <div className="flex items-end gap-3">
          <span className="text-[56px] leading-[0.9] font-semibold tracking-[-0.04em] tabular-nums">{v + 1}</span>
          <span className="pb-1 text-[15px] text-g-muted">
            / {n} · <span className="font-medium text-g-ink">{word}</span>
          </span>
        </div>
      ) : (
        <p key={v} className="animate-pop text-[28px] leading-tight font-semibold tracking-[-0.02em]">{word}</p>
      )}
      <div className={strength ? "mt-6" : "mt-4"}>
        <TrackSlider value={v} min={0} max={n - 1} onChange={onChange} label={t(group.name, lang)} valueText={`${v + 1} / ${n}, ${word}`} notches={n} />
      </div>
      <div className="mt-1 flex justify-between text-[12px] font-medium text-g-faint tabular-nums">
        <span>{strength ? `1 · ${ui(lang, "strength1")}` : t(group.options[0]!.name, lang)}</span>
        <span>{strength ? `${n} · ${ui(lang, "strength4")}` : t(group.options[n - 1]!.name, lang)}</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Cart */

const NOTES: UiKey[] = ["noteNoOnion", "noteSpicy", "noteNoIce", "noteKids"];

export function CartSheet({
  open,
  onClose,
  lang,
  currency,
  lines,
  itemById,
  categoryOf,
  onQty,
  onSend,
}: {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  currency: Currency;
  lines: CartLine[];
  itemById: Map<string, MenuItem>;
  categoryOf: Map<string, Category>;
  onQty: (key: string, qty: number) => void;
  onSend: (note: string) => void;
}) {
  const [notes, setNotes] = useState<UiKey[]>([]);
  const [text, setText] = useState("");
  const total = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const note = [...notes.map((k) => ui(lang, k)), text.trim()].filter(Boolean).join(", ");

  return (
    <Sheet
      open={open}
      onClose={onClose}
      label={ui(lang, "yourOrder")}
      footer={
        <button
          disabled={!lines.length}
          onClick={() => {
            onSend(note);
            setNotes([]);
            setText("");
          }}
          className={`press flex h-14 w-full items-center justify-between rounded-full px-6 text-[16px] font-semibold ${lines.length ? "blue-grad" : "bg-g-fill-2 text-g-faint"}`}
        >
          <span className="flex items-center gap-2">
            <Send size={18} strokeWidth={2} /> {ui(lang, "sendOrder")}
          </span>
          <span className="tabular-nums">{formatMoney(total, currency, lang)}</span>
        </button>
      }
    >
      <div className="px-5 pt-8 pb-4">
        <h2 className="text-[26px] font-bold tracking-[-0.02em]">
          {ui(lang, "yourOrder")} <span className="text-g-faint">{count}</span>
        </h2>

        {!lines.length && <p className="py-12 text-center text-[15px] text-g-muted">{ui(lang, "emptyBody")}</p>}

        <ul className="mt-4">
          {lines.map((line) => {
            const item = itemById.get(line.itemId)!;
            const role = categoryOf.get(item.id)?.role ?? "main";
            const variant = item.variants.find((v) => v.id === line.variantId);
            const opts = item.modifierGroups.flatMap((g) => g.options).filter((o) => line.optionIds.includes(o.id));
            const extra = [variant && t(variant.name, lang), ...opts.map((o) => t(o.name, lang))].filter(Boolean).join(" · ");
            return (
              <li key={line.key} className="flex items-center gap-3.5 border-b border-g-line py-3.5 last:border-b-0">
                <DishTile item={item} role={role} photoScale={0.92} glyph={0.6} className="size-16 shrink-0 rounded-[18px]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{t(item.name, lang)}</p>
                  {extra && <p className="truncate text-[13px] text-g-muted">{extra}</p>}
                  <p className="mt-0.5 text-[15px] font-semibold tabular-nums">{formatMoney(line.unitPrice * line.qty, currency, lang)}</p>
                </div>
                <div className="w-[108px] shrink-0">
                  <Stepper qty={line.qty} onChange={(q) => onQty(line.key, q)} />
                </div>
              </li>
            );
          })}
        </ul>

        {lines.length > 0 && (
          <>
            <h3 className="mt-7 mb-3 text-[17px] font-semibold">{ui(lang, "noteForKitchen")}</h3>
            <div className="flex flex-wrap gap-2">
              {NOTES.map((k) => {
                const on = notes.includes(k);
                return (
                  <button
                    key={k}
                    onClick={() => setNotes((n) => (on ? n.filter((x) => x !== k) : [...n, k]))}
                    aria-pressed={on}
                    className={`press flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium ${on ? "bg-g-ink text-white" : "bg-g-fill"}`}
                  >
                    {on && <Check size={15} strokeWidth={2.5} />}
                    {ui(lang, k)}
                  </button>
                );
              })}
            </div>
            <label htmlFor="kitchen-note" className="sr-only">
              {ui(lang, "noteForKitchen")}
            </label>
            <textarea
              id="kitchen-note"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              placeholder={ui(lang, "notePlaceholder")}
              className="mt-3 w-full resize-none rounded-[20px] bg-g-fill px-4 py-3.5 text-[16px] outline-none placeholder:text-[15px] placeholder:text-g-faint focus:ring-2 focus:ring-g-blue/30"
            />
            <div className="mt-6 flex items-baseline justify-between">
              <span className="text-[15px] text-g-muted">{ui(lang, "total")}</span>
              <span className="text-[26px] font-semibold tracking-[-0.02em] tabular-nums">{formatMoney(total, currency, lang)}</span>
            </div>
            <p className="mt-1 text-[13px] text-g-faint">{ui(lang, "serviceNote")}</p>
          </>
        )}
      </div>
    </Sheet>
  );
}

/* ---------------------------------------------------------------- Orders */

export type PlacedOrder = { id: number; lines: CartLine[]; total: number; note: string; placedAt: number };

const STAGES: UiKey[] = ["orderSent", "orderAccepted", "orderCooking", "orderReady"];

/** Demo timeline in seconds; the KDS drives real status in Phase 1. */
export function orderStage(order: PlacedOrder, now: number): number {
  const s = (now - order.placedAt) / 1000;
  return s < 6 ? 0 : s < 15 ? 1 : s < 45 ? 2 : 3;
}

export function OrdersSheet({
  open,
  onClose,
  lang,
  currency,
  orders,
  now,
  itemById,
  onOrderMore,
}: {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  currency: Currency;
  orders: PlacedOrder[];
  now: number;
  itemById: Map<string, MenuItem>;
  onOrderMore: () => void;
}) {
  const list = [...orders].reverse();
  return (
    <Sheet
      open={open}
      onClose={onClose}
      label={ui(lang, "orders")}
      footer={
        <button onClick={onOrderMore} className="press h-12 w-full rounded-full bg-g-fill text-[16px] font-semibold">
          {ui(lang, "orderMore")}
        </button>
      }
    >
      <div className="px-5 pt-8 pb-4">
        <h2 className="text-[26px] font-bold tracking-[-0.02em]">{ui(lang, "orders")}</h2>
        {!list.length && <p className="py-12 text-center text-[15px] text-g-muted">{ui(lang, "noOrdersBody")}</p>}
        {list.map((o, i) => {
          const stage = orderStage(o, now);
          const minsLeft = Math.max(1, Math.ceil(15 - ((now - o.placedAt) / 1000 / 45) * 15));
          return (
            <article key={o.id} className={`mt-4 rounded-[28px] p-5 ${i === 0 ? "mesh-blue" : "border-[1.5px] border-g-faint/50"}`}>
              <p className="text-[13px] font-medium text-g-muted">
                {ui(lang, "order")} №{String(o.id).padStart(3, "0")}
              </p>
              <div className="mt-1 flex items-baseline justify-between gap-4">
                <h3 className="text-[22px] leading-tight font-bold tracking-[-0.02em]">{ui(lang, STAGES[stage]!)}</h3>
                {stage < 3 && (
                  <span className="shrink-0 text-[22px] font-bold tracking-[-0.02em] tabular-nums">
                    {minsLeft} {ui(lang, "min")}
                  </span>
                )}
              </div>
              <div className="mt-4 grid grid-cols-4 gap-1.5" aria-hidden>
                {STAGES.map((_, s) => (
                  <span key={s} className={`h-1.5 rounded-full transition-colors duration-700 ${s <= stage ? (stage === 3 ? "green-grad" : "bar-grad") : "bg-g-fill-2"}`} />
                ))}
              </div>
              <ul className="mt-5 space-y-2">
                {o.lines.map((l) => (
                  <li key={l.key} className="flex items-baseline gap-3 text-[15px]">
                    <span className="w-6 shrink-0 font-semibold tabular-nums">{l.qty}×</span>
                    <span className="min-w-0 flex-1 truncate">{t(itemById.get(l.itemId)!.name, lang)}</span>
                    <span className="shrink-0 tabular-nums text-g-muted">{formatMoney(l.unitPrice * l.qty, currency, lang)}</span>
                  </li>
                ))}
              </ul>
              {o.note && <p className="mt-3 text-[13px] text-g-muted">{o.note}</p>}
              <div className="mt-4 flex items-baseline justify-between border-t border-g-fill-2 pt-3">
                <span className="text-[15px] text-g-muted">{ui(lang, "total")}</span>
                <span className="text-[17px] font-semibold tabular-nums">{formatMoney(o.total, currency, lang)}</span>
              </div>
            </article>
          );
        })}
      </div>
    </Sheet>
  );
}

/* ---------------------------------------------------------------- Search */

export function SearchSheet({
  open,
  onClose,
  menu,
  lang,
  qtyOf,
  onOpen,
  onAdd,
  onQty,
}: {
  open: boolean;
  onClose: () => void;
  menu: Menu;
  lang: Lang;
  qtyOf: (id: string) => number;
  onOpen: (item: MenuItem) => void;
  onAdd: (item: MenuItem) => void;
  onQty: (item: MenuItem, q: number) => void;
}) {
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<SearchFilter[]>([]);
  const [cat, setCat] = useState<string | null>(null);
  const query = q.trim().toLowerCase();
  const { currency } = menu.venue;
  const cap = currency === "VND" ? 150_000 : 10;
  const has = (f: SearchFilter) => filters.includes(f);
  const toggle = (f: SearchFilter) => setFilters((v) => (v.includes(f) ? v.filter((x) => x !== f) : [...v, f]));
  const active = Boolean(query || filters.length || cat);
  const results = useMemo(
    () =>
      menu.categories
        .filter((c) => !cat || c.id === cat)
        .flatMap((c) =>
          c.items
            .filter((i) => {
              if (query && !Object.values(i.name).some((n) => n?.toLowerCase().includes(query)) && !Object.values(i.description ?? {}).some((d) => d?.toLowerCase().includes(query))) return false;
              const veg = i.tags.includes("vegetarian") || i.tags.includes("vegan");
              const spicy = /tom yum|spicy|chili|smashed cucumber/i.test(i.name.en ?? "");
              if (filters.includes("veg") && !veg) return false;
              if (filters.includes("halal") && !i.tags.includes("halal")) return false;
              if (filters.includes("mild") && spicy) return false;
              if (filters.includes("photo") && !i.photo) return false;
              if (filters.includes("cheap") && i.price > cap) return false;
              return true;
            })
            .map((i) => [i, c] as const),
        ),
    [menu, query, filters, cat, cap],
  );
  const FILTERS: { id: SearchFilter; label: string; icon: React.ReactNode }[] = [
    { id: "veg", label: ui(lang, "filterVeggie"), icon: <Leaf size={15} strokeWidth={2} /> },
    { id: "halal", label: ui(lang, "filterHalal"), icon: <HalalIcon size={15} /> },
    { id: "mild", label: ui(lang, "filterNotSpicy"), icon: <FlameKindling size={15} strokeWidth={2} /> },
    { id: "photo", label: ui(lang, "filterPhoto"), icon: <ImageIcon size={15} strokeWidth={2} /> },
    { id: "cheap", label: `${ui(lang, "filterUnder")} ${formatMoney(cap, currency, lang)}`, icon: <Wallet size={15} strokeWidth={2} /> },
  ];
  return (
    <Sheet open={open} onClose={onClose} label={ui(lang, "search")} title={false}>
      <div className="px-5 pt-1 pb-6">
        <label className="flex h-12 items-center gap-3 rounded-full bg-g-fill px-4 text-g-muted focus-within:ring-2 focus-within:ring-g-blue/30">
          <Search size={20} strokeWidth={2} />
          <input
            id="menu-search"
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={ui(lang, "search")}
            className="min-w-0 flex-1 bg-transparent text-[16px] text-g-ink outline-none placeholder:text-g-faint"
          />
          {q && (
            <button aria-label={ui(lang, "clearAll")} onClick={() => setQ("")} className="grid size-7 place-items-center rounded-full bg-g-fill-2 text-g-ink">
              <X size={14} strokeWidth={2.5} />
            </button>
          )}
        </label>

        <div className="mt-5 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-g-muted">
            <SlidersHorizontal size={15} strokeWidth={2} /> {ui(lang, "filters")}
          </p>
          {active && (
            <button
              onClick={() => {
                setQ("");
                setFilters([]);
                setCat(null);
              }}
              className="text-[13px] font-semibold text-g-blue"
            >
              {ui(lang, "clearAll")}
            </button>
          )}
        </div>
        <div className="no-scrollbar -mx-5 mt-2.5 flex gap-2 overflow-x-auto px-5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                haptic("light");
                toggle(f.id);
              }}
              aria-pressed={has(f.id)}
              className={`press flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-medium whitespace-nowrap transition-colors ${has(f.id) ? "bg-g-ink text-white" : "bg-g-fill"}`}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>
        <div className="no-scrollbar -mx-5 mt-2 flex gap-1 overflow-x-auto px-5">
          {menu.categories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                haptic("light");
                setCat((v) => (v === c.id ? null : c.id));
              }}
              aria-pressed={cat === c.id}
              className={`press h-9 shrink-0 rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap ${cat === c.id ? "bg-g-blue-soft text-g-blue" : "text-g-muted"}`}
            >
              {t(c.name, lang)}
            </button>
          ))}
        </div>

        {active && (
          <p className="mt-5 text-[13px] text-g-muted tabular-nums">
            {results.length} {ui(lang, "results")}
          </p>
        )}
        <div className="mt-1 divide-y divide-g-line">
          {active &&
            results.map(([item, c]) => (
              <ItemCard
                key={item.id}
                item={item}
                role={c.role}
                lang={lang}
                currency={currency}
                qty={qtyOf(item.id)}
                onOpen={() => onOpen(item)}
                onAdd={() => onAdd(item)}
                onQty={(n) => onQty(item, n)}
              />
            ))}
        </div>
        {active && !results.length && (
          <div className="flex flex-col items-center py-14 text-center">
            <span className="chip-blue grid size-14 place-items-center rounded-full">
              <SearchX size={24} strokeWidth={1.75} />
            </span>
            <p className="mt-3 text-[15px] text-g-muted">{ui(lang, "noResults")}</p>
          </div>
        )}
        {!active && (
          <div className="flex flex-col items-center py-14 text-center">
            <span className="chip-blue grid size-14 place-items-center rounded-full">
              <Search size={24} strokeWidth={1.75} />
            </span>
            <p className="mt-3 max-w-[240px] text-[15px] text-g-muted">{ui(lang, "search")}</p>
          </div>
        )}
      </div>
    </Sheet>
  );
}

type SearchFilter = "veg" | "halal" | "mild" | "photo" | "cheap";

/* ---------------------------------------------------------------- About & language */

export function AboutSheet({
  open,
  onClose,
  menu,
  brand,
  lang,
  onNotice,
}: {
  open: boolean;
  onClose: () => void;
  menu: Menu;
  brand: VenueBrand;
  lang: Lang;
  onNotice: (title: string, text?: string) => void;
}) {
  const a = brand.about;
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.mapsQuery)}`;
  const actions: { label: string; icon: React.ReactNode; href?: string; onClick?: () => void }[] = [
    { label: ui(lang, "aboutRoute"), icon: <Navigation size={20} strokeWidth={1.9} />, href: maps },
    { label: ui(lang, "aboutCall"), icon: <Phone size={20} strokeWidth={1.9} />, href: `tel:${a.phone.replace(/\s/g, "")}` },
    {
      label: ui(lang, "aboutShare"),
      icon: <Share2 size={20} strokeWidth={1.9} />,
      onClick: () => {
        const url = window.location.href.split("?")[0]!;
        if (navigator.share) navigator.share({ title: menu.venue.name, url }).catch(() => {});
        else navigator.clipboard?.writeText(url).then(() => onNotice(ui(lang, "copied")));
      },
    },
  ];
  return (
    <Sheet open={open} onClose={onClose} label={ui(lang, "about")} title={false}>
      <div className="px-5 pt-1 pb-10">
        <div className="aurora rounded-[30px] px-5 pt-6 pb-5">
          <span className="grid size-16 place-items-center rounded-[20px] bg-white text-[26px] font-bold text-g-ink">{brand.mark}</span>
          <h2 className="mt-5 text-[30px] leading-tight font-bold tracking-[-0.025em]">{menu.venue.name}</h2>
          <p className="mt-1 text-[15px] text-white/75">{brand.cuisine[lang as "en"] ?? brand.cuisine.en}</p>
          <span className="mt-4 inline-flex h-7 items-center gap-1.5 rounded-full bg-white/15 px-3 text-[13px] font-semibold backdrop-blur-md">
            <span className="size-2 rounded-full bg-[#5ce0a0]" />
            {ui(lang, "openNow")} · {ui(lang, "openUntil")} {a.closes}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {actions.map((x) =>
            x.href ? (
              <a key={x.label} href={x.href} target={x.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" onClick={() => haptic("light")} className="press flex h-[76px] flex-col items-center justify-center gap-1.5 rounded-[22px] bg-g-fill text-[13px] font-semibold">
                <span className="text-g-blue">{x.icon}</span>
                {x.label}
              </a>
            ) : (
              <button key={x.label} onClick={() => { haptic("light"); x.onClick?.(); }} className="press flex h-[76px] flex-col items-center justify-center gap-1.5 rounded-[22px] bg-g-fill text-[13px] font-semibold">
                <span className="text-g-blue">{x.icon}</span>
                {x.label}
              </button>
            ),
          )}
        </div>

        <p className="mt-7 text-[16px] leading-[1.6] text-g-ink-2">{a.bio}</p>

        <h3 className="mt-9 text-[13px] font-semibold tracking-[0.06em] text-g-muted uppercase">{ui(lang, "aboutGood")}</h3>
        <div className="mt-2 divide-y divide-g-line">
          <a href={maps} target="_blank" rel="noreferrer" className="flex items-center gap-3.5 py-4">
            <InfoIcon><MapPin size={18} strokeWidth={1.9} /></InfoIcon>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] text-g-muted">{ui(lang, "address")}</span>
              <span className="block truncate text-[15px] font-medium">{a.address}</span>
            </span>
            <ChevronRight size={18} className="text-g-faint" />
          </a>
          <div className="flex items-center gap-3.5 py-4">
            <InfoIcon><Clock size={18} strokeWidth={1.9} /></InfoIcon>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] text-g-muted">{ui(lang, "hours")}</span>
              <span className="block text-[15px] font-medium">{a.hours}</span>
            </span>
          </div>
          <div className="flex items-center gap-3.5 py-4">
            <InfoIcon><Wifi size={18} strokeWidth={1.9} /></InfoIcon>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] text-g-muted">{ui(lang, "aboutWifi")} · {a.wifi.name}</span>
              <span className="block font-mono text-[15px] font-medium">{a.wifi.pass}</span>
            </span>
            <button
              onClick={() => {
                haptic("light");
                navigator.clipboard?.writeText(a.wifi.pass).catch(() => {});
                onNotice(ui(lang, "copied"), ui(lang, "copiedHint"));
              }}
              aria-label="Copy Wi-Fi password"
              className="press grid size-10 place-items-center rounded-full bg-g-fill"
            >
              <Copy size={17} strokeWidth={1.9} />
            </button>
          </div>
        </div>

        <h3 className="mt-8 text-[13px] font-semibold tracking-[0.06em] text-g-muted uppercase">{ui(lang, "aboutPay")}</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {a.payments.map((p) => (
            <span key={p} className="inline-flex h-9 items-center rounded-full bg-g-fill px-3.5 text-[14px] font-medium">{p}</span>
          ))}
        </div>

        <h3 className="mt-8 text-[13px] font-semibold tracking-[0.06em] text-g-muted uppercase">{ui(lang, "aboutFeatures")}</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {a.features.map((f) => (
            <span key={f.en} className="chip-blue inline-flex h-9 items-center rounded-full px-3.5 text-[14px] font-medium">{f[lang as "en"] ?? f.en}</span>
          ))}
        </div>

        <h3 className="mt-8 text-[13px] font-semibold tracking-[0.06em] text-g-muted uppercase">{ui(lang, "aboutLangs")}</h3>
        <p className="mt-2 text-[15px] text-g-ink-2">{UI_LANGS.map((l) => LANG_LABEL[l]).join(" · ")}</p>

        <p className="mt-12 text-center text-[13px] text-g-faint">{ui(lang, "poweredBy")}</p>
      </div>
    </Sheet>
  );
}

function InfoIcon({ children }: { children: React.ReactNode }) {
  return <span className="chip-blue grid size-10 shrink-0 place-items-center rounded-full">{children}</span>;
}

export function LangSheet({ open, onClose, lang, onPick }: { open: boolean; onClose: () => void; lang: Lang; onPick: (l: Lang) => void }) {
  return (
    <Sheet open={open} onClose={onClose} label={ui(lang, "language")}>
      <div className="px-5 pt-8 pb-6">
        <h2 className="mb-4 text-[26px] font-bold tracking-[-0.02em]">{ui(lang, "language")}</h2>
        {UI_LANGS.map((l) => (
          <button key={l} onClick={() => onPick(l)} className="press flex w-full items-center gap-4 border-b border-g-line py-4 text-left last:border-b-0">
            <span className="w-8 text-[13px] font-semibold text-g-muted uppercase">{l}</span>
            <span className="flex-1 text-[16px] font-medium">{LANG_LABEL[l]}</span>
            {l === lang && (
              <span className="blue-grad grid size-6 place-items-center rounded-full">
                <Check size={14} strokeWidth={3} />
              </span>
            )}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

/* ---------------------------------------------------------------- Bill */

/** The guest's bill for the table: everything ordered, service, tip, how they'll pay, then ask. */
export function BillSheet({
  open,
  onClose,
  lang,
  currency,
  orders,
  itemById,
  table,
  onRequest,
}: {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  currency: Currency;
  orders: PlacedOrder[];
  itemById: Map<string, MenuItem>;
  table: string | null;
  onRequest: (total: number, method: string) => void;
}) {
  const [tip, setTip] = useState(0);
  const [method, setMethod] = useState<UiKey>("billQr");
  const lines = orders.flatMap((o) => o.lines);
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const service = Math.round(subtotal * 0.05);
  const tipAmount = Math.round((subtotal * tip) / 100 / 1000) * 1000;
  const total = subtotal + service + tipAmount;
  const money = (n: number) => formatMoney(n, currency, lang);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      label={ui(lang, "billTitle")}
      title={false}
      footer={
        <button
          onClick={() => {
            haptic("success");
            onRequest(total, ui(lang, method));
          }}
          className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold tabular-nums"
        >
          {ui(lang, "billRequest")} · {money(total)}
        </button>
      }
    >
      <div className="px-5 pt-1 pb-8">
        <h2 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">{ui(lang, "billTitle")}</h2>
        {table && (
          <p className="mt-1 text-[14px] text-g-muted">
            {ui(lang, "table")} {table.padStart(2, "0")} · {orders.length} × {ui(lang, "order").toLowerCase()}
          </p>
        )}
        <div className="mt-5 rounded-[24px] bg-g-fill px-5 py-4">
          <div className="grid gap-2.5">
            {lines.map((l) => {
              const it = itemById.get(l.itemId);
              return (
                <div key={l.key + l.qty} className="flex items-baseline gap-2 text-[15px]">
                  <span className="w-6 shrink-0 text-g-muted tabular-nums">{l.qty}×</span>
                  <span className="min-w-0 flex-1 truncate">{it ? t(it.name, lang) : l.itemId}</span>
                  <span className="shrink-0 tabular-nums">{money(l.unitPrice * l.qty)}</span>
                </div>
              );
            })}
          </div>
          <div className="my-3.5 border-t border-dashed border-g-faint/60" />
          <div className="grid gap-1.5 text-[14px] text-g-muted tabular-nums">
            <p className="flex justify-between">
              <span>{ui(lang, "billSubtotal")}</span>
              <span className="text-g-ink">{money(subtotal)}</span>
            </p>
            <p className="flex justify-between">
              <span>{ui(lang, "billService")}</span>
              <span className="text-g-ink">{money(service)}</span>
            </p>
            {tipAmount > 0 && (
              <p className="flex justify-between">
                <span>{ui(lang, "billTip")}</span>
                <span className="text-g-ink">{money(tipAmount)}</span>
              </p>
            )}
          </div>
          <p className="mt-3 flex items-baseline justify-between">
            <span className="text-[15px] font-semibold">{ui(lang, "total")}</span>
            <span className="text-[28px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{money(total)}</span>
          </p>
        </div>

        <section className="mt-8">
          <StepHeadline>{ui(lang, "billTip")}</StepHeadline>
          <div className="flex rounded-full bg-g-fill p-1">
            {[0, 5, 10, 15].map((p) => (
              <button
                key={p}
                onClick={() => {
                  haptic("tick");
                  setTip(p);
                }}
                aria-pressed={tip === p}
                className={`h-10 flex-1 rounded-full text-[14px] font-semibold transition-colors ${tip === p ? "bg-white text-g-ink" : "text-g-muted"}`}
              >
                {p ? `${p}%` : ui(lang, "billNoTip")}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <StepHeadline>{ui(lang, "billMethod")}</StepHeadline>
          <div className="grid grid-cols-3 gap-2">
            {(["billQr", "billCard", "billCash"] as UiKey[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  haptic("light");
                  setMethod(m);
                }}
                aria-pressed={method === m}
                className={`press h-14 rounded-[18px] text-[15px] font-semibold transition-colors ${method === m ? "bg-g-ink text-white" : "bg-g-fill"}`}
              >
                {ui(lang, m)}
              </button>
            ))}
          </div>
        </section>
      </div>
    </Sheet>
  );
}

function StepHeadline({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-3 text-[17px] font-semibold">{children}</h3>;
}
