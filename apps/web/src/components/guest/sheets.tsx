"use client";

import {
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
} from "@yanyin/domain";
import { Check, Clock, MapPin, Search, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { LANG_LABEL, UI_LANGS, ui, type UiKey } from "@/lib/ui-strings";
import type { VenueBrand } from "@/lib/visual";
import { DishTile, DraftMark, ItemRow, Sheet, Stepper, altName } from "./ui";

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
  const [optionIds, setOptionIds] = useState<string[]>([]);
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
      return mine.length >= group.max ? prev : [...prev, optionId];
    });
  };

  return (
    <Sheet
      open
      onClose={onClose}
      label={t(item.name, lang)}
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
            onClick={() => onAdd(item, variantId, optionIds, qty)}
            className="press flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-g-blue text-[16px] font-semibold text-white tabular-nums disabled:bg-g-fill-2 disabled:text-g-faint"
          >
            {ui(lang, "add")} · {formatMoney(price * qty, currency, lang)}
          </button>
        </div>
      }
    >
      {item.photo ? (
        <div className="px-3 pt-3">
          <DishTile item={item} role={category.role} photoScale={0.78} className="aspect-[1.2] w-full rounded-[28px]" />
        </div>
      ) : (
        <div className="h-14" />
      )}
      <div className="px-5 pt-5 pb-6">
        <p className="text-[13px] font-medium text-g-muted">{t(category.name, lang)}</p>
        <h2 className="mt-1 text-[26px] leading-[1.15] font-bold tracking-[-0.02em] text-balance">{t(item.name, lang)}</h2>
        {alt && <p className="mt-1.5 text-[15px] text-g-muted">{alt}</p>}
        {(item.tags.length > 0 || item.status === "suggested") && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {item.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-g-fill px-3 py-1 text-[12px] font-medium capitalize">
                {tag.replace("_", " ")}
              </span>
            ))}
            {item.status === "suggested" && <DraftMark lang={lang} />}
          </div>
        )}

        {item.variants.length > 0 && (
          <div className="mt-6 flex rounded-full bg-g-fill p-1">
            {item.variants.map((v) => {
              const on = v.id === variantId;
              return (
                <button
                  key={v.id}
                  onClick={() => setVariantId(v.id)}
                  aria-pressed={on}
                  className={`flex h-11 flex-1 flex-col items-center justify-center rounded-full transition-all ${on ? "bg-white shadow-[0_2px_8px_-2px_rgba(11,11,15,0.16)]" : "text-g-muted"}`}
                >
                  <span className="text-[14px] font-semibold">{t(v.name, lang)}</span>
                  <span className="text-[11px] tabular-nums">{formatMoney(v.price, currency, lang)}</span>
                </button>
              );
            })}
          </div>
        )}

        {item.modifierGroups.map((g) => (
          <section key={g.id} className="mt-7">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-[17px] font-semibold">{t(g.name, lang)}</h3>
              <span className={`text-[13px] font-medium ${g.required && missing.includes(g.id) ? "text-g-blue" : "text-g-faint"}`}>
                {ui(lang, g.required ? "required" : "optional")}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {g.options.map((o) => {
                const on = optionIds.includes(o.id);
                return (
                  <button
                    key={o.id}
                    onClick={() => toggle(g.id, o.id)}
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
          </section>
        ))}
      </div>
    </Sheet>
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
          className="press flex h-14 w-full items-center justify-between rounded-full bg-g-blue px-6 text-[16px] font-semibold text-white disabled:bg-g-fill-2 disabled:text-g-faint"
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
                <DishTile item={item} role={role} iconSize={20} photoScale={0.92} className="size-14 shrink-0 rounded-2xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-medium">{t(item.name, lang)}</p>
                  {extra && <p className="truncate text-[13px] text-g-muted">{extra}</p>}
                  <p className="mt-0.5 text-[15px] font-semibold tabular-nums">{formatMoney(line.unitPrice * line.qty, currency, lang)}</p>
                </div>
                <div className="w-[108px] shrink-0">
                  <Stepper qty={line.qty} onChange={(q) => onQty(line.key, q)} size="sm" />
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
              <span className="text-[24px] font-bold tracking-[-0.02em] tabular-nums">{formatMoney(total, currency, lang)}</span>
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
            <article key={o.id} className={`mt-4 rounded-[28px] p-5 ${i === 0 ? "bg-g-fill" : "border border-g-line"}`}>
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
                  <span key={s} className={`h-1.5 rounded-full transition-colors duration-700 ${s <= stage ? (stage === 3 ? "bg-g-green" : "bg-g-blue") : "bg-g-fill-2"}`} />
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
  const query = q.trim().toLowerCase();
  const results = useMemo(
    () =>
      query
        ? menu.categories.flatMap((c) => c.items.filter((i) => Object.values(i.name).some((n) => n?.toLowerCase().includes(query))).map((i) => [i, c] as const))
        : [],
    [menu, query],
  );
  return (
    <Sheet open={open} onClose={onClose} label={ui(lang, "search")} full>
      <div className="px-5 pt-8 pb-6">
        <label className="flex h-12 items-center gap-3 rounded-full bg-g-fill px-4 pr-14 text-g-muted focus-within:ring-2 focus-within:ring-g-blue/30">
          <Search size={20} strokeWidth={2} />
          <input
            id="menu-search"
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={ui(lang, "search")}
            className="min-w-0 flex-1 bg-transparent text-[16px] text-g-ink outline-none placeholder:text-g-faint"
          />
        </label>
        <div className="mt-3">
          {results.map(([item, c]) => (
            <ItemRow
              key={item.id}
              item={item}
              role={c.role}
              lang={lang}
              currency={menu.venue.currency}
              qty={qtyOf(item.id)}
              onOpen={() => onOpen(item)}
              onAdd={() => onAdd(item)}
              onQty={(n) => onQty(item, n)}
            />
          ))}
          {query && !results.length && <p className="py-12 text-center text-[15px] text-g-muted">{ui(lang, "noResults")}</p>}
        </div>
      </div>
    </Sheet>
  );
}

/* ---------------------------------------------------------------- About & language */

export function AboutSheet({ open, onClose, menu, brand, lang }: { open: boolean; onClose: () => void; menu: Menu; brand: VenueBrand; lang: Lang }) {
  return (
    <Sheet open={open} onClose={onClose} label={ui(lang, "about")}>
      <div className="px-5 pt-10 pb-8">
        <span className="grid size-16 place-items-center rounded-full bg-g-ink text-[26px] font-bold text-white">{brand.mark}</span>
        <h2 className="mt-4 text-[28px] font-bold tracking-[-0.02em]">{menu.venue.name}</h2>
        <p className="mt-1 text-[15px] text-g-muted">{brand.cuisine[lang as "en"] ?? brand.cuisine.en}</p>
        <p className="mt-5 text-[16px] leading-[1.6] text-g-ink-2">{brand.about.bio}</p>
        <div className="mt-6 divide-y divide-g-line rounded-[24px] bg-g-fill px-4">
          <InfoRow icon={<MapPin size={18} strokeWidth={1.75} />} label={ui(lang, "address")} value={brand.about.address} />
          <InfoRow icon={<Clock size={18} strokeWidth={1.75} />} label={ui(lang, "hours")} value={brand.about.hours} />
        </div>
        <p className="mt-6 text-center text-[13px] text-g-faint">{ui(lang, "poweredBy")}</p>
      </div>
    </Sheet>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3.5 py-3.5">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white">{icon}</span>
      <div className="min-w-0">
        <p className="text-[13px] text-g-muted">{label}</p>
        <p className="text-[15px] font-medium">{value}</p>
      </div>
    </div>
  );
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
              <span className="grid size-6 place-items-center rounded-full bg-g-blue text-white">
                <Check size={14} strokeWidth={3} />
              </span>
            )}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
