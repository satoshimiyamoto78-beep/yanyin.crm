"use client";

import {
  defaultOptionIds,
  formatMoney,
  missingRequired,
  t,
  unitPrice,
  withService,
  DEFAULT_SERVICE_RATE,
  type CartLine,
  type Category,
  type Currency,
  type Lang,
  type Menu,
  type MenuItem,
  type ModifierGroup,
} from "@yanyin/domain";
import { BellRing, MessageSquarePlus, MessageSquareText, Pencil, ShoppingBag, Check, ChevronDown, ChevronRight, Clock, CookingPot, Plus, ReceiptText, StickyNote, type LucideIcon, Copy, FlameKindling, ImageIcon, Leaf, MapPin, Navigation, Phone, Search, SearchX, Share2, SlidersHorizontal, Wallet, Wifi, X } from "lucide-react";
import { useMemo, useState } from "react";
import { LANG_LABEL, UI_LANGS, ui, type UiKey } from "@/lib/ui-strings";
import type { VenueBrand } from "@/lib/visual";
import Image from "next/image";
import qrcode from "qrcode-generator";
import { haptic } from "@/lib/haptics";
import { SlideToConfirm } from "@/components/system/SlideToConfirm";
import { DrinkPreview, HalvesPicker, OptionTiles, PizzaPreview, drinkColor, drinkName } from "./builders";

const tint = (c: string, a: number) => {
  const m = /^#([0-9a-f]{6})$/i.exec(c);
  if (!m) return `rgba(143,178,255,${a})`;
  const n = parseInt(m[1]!, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
import { DishTile, HalalIcon, ItemCard, ItemChips, RoleIcon, Sheet, Stepper, TrackSlider, altName } from "./ui";

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
  onAdd: (item: MenuItem, variantId: string | undefined, optionIds: string[], qty: number, note?: string) => void;
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
  onAdd: (item: MenuItem, variantId: string | undefined, optionIds: string[], qty: number, note?: string) => void;
}) {
  const [note, setNote] = useState("");
  const [variantId, setVariantId] = useState<string | undefined>(item.variants[0]?.id);
  const [optionIds, setOptionIds] = useState<string[]>(() => defaultOptionIds(item));
  const [qty, setQty] = useState(1);
  const missing = missingRequired(item, optionIds);
  const price = unitPrice(item, variantId, optionIds);
  const alt = altName(item, lang);

  // Hookah: strength is light / medium / strong and every tobacco has its own level.
  const strengthGroup = item.modifierGroups.find((g) => g.display === "scale" && g.options.every((o) => o.level));
  const level = strengthGroup?.options.find((o) => optionIds.includes(o.id))?.level;
  const setLevel = (lv: number) => {
    if (!strengthGroup) return;
    const ids = strengthGroup.options.map((o) => o.id);
    const next = strengthGroup.options.find((o) => o.level === lv);
    if (!next) return;
    setOptionIds((prev) => {
      // A tobacco of another strength no longer fits: the guest picks again from the matching ones, now on top.
      const brands = item.modifierGroups.filter((g) => g.display === "brands").flatMap((g) => g.options);
      const keep = prev.filter((id) => !ids.includes(id) && !brands.some((b) => b.id === id && b.level && b.level !== lv));
      return [...keep, next.id];
    });
  };
  const isHookah = Boolean(strengthGroup && item.modifierGroups.some((g) => g.display === "brands"));

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
              onAdd(item, variantId, optionIds, qty, note);
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
      ) : isHookah && item.cover ? (
        <div className="px-3 pt-3">
          {/* The hookah builder: a wide crop of the photo with the live mix on top, so the steps start on the first screen. */}
          <div className="relative aspect-[1.45] w-full overflow-hidden rounded-[28px] bg-[#0b0b0f]">
            <Image src={item.cover} alt="" fill sizes="480px" className="object-cover object-[50%_40%]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <HookahSummary item={item} ids={optionIds} lang={lang} />
          </div>
        </div>
      ) : item.cover ? (
        <div className="px-3 pt-3">
          {/* On the dish's own page the photo is shown whole, in its own proportions; lists crop it to the venue's format. */}
          <div className="w-full overflow-hidden rounded-[28px] bg-g-fill">
            <Image src={item.cover} alt="" width={960} height={960} sizes="480px" className="block h-auto w-full" />
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
                {steps && <span className="grid size-7 shrink-0 place-items-center self-center rounded-full bg-g-blue-soft text-[13px] font-bold text-g-blue tabular-nums">{gi + 1}</span>}
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
                  level={level}
                  onPick={(id) => {
                    haptic("light");
                    toggle(g.id, id);
                    // Picking a tobacco sets the strength to match it.
                    const lv = g.options.find((o) => o.id === id)?.level;
                    if (lv && lv !== level && strengthGroup) {
                      const sid = strengthGroup.options.find((o) => o.level === lv)?.id;
                      const sids = strengthGroup.options.map((o) => o.id);
                      if (sid) setOptionIds((prev) => [...prev.filter((x) => !sids.includes(x)), sid]);
                    }
                  }}
                />
              ) : g.display === "scale" && g === strengthGroup ? (
                <StrengthLevels
                  group={g}
                  lang={lang}
                  value={level}
                  onPick={(lv) => {
                    haptic("tick");
                    setLevel(lv);
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
              ) : g.options.every((o) => o.price > 0) ? (
                // Paid add-ons read as rows: name, price, a round tick. Long names wrap inside the row, never break the layout.
                <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
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
                        className={`press flex min-h-14 items-center gap-3 rounded-[22px] py-2 pr-2 pl-4 text-left transition-colors ${on ? "bg-g-blue-soft" : "bg-g-fill"}`}
                      >
                        <span className="min-w-0 flex-1 text-[15px] leading-snug font-medium">{t(o.name, lang)}</span>
                        <span className={`shrink-0 text-[14px] font-semibold tabular-nums ${on ? "text-g-blue" : "text-g-muted"}`}>+{formatMoney(o.price, currency, lang)}</span>
                        <span className={`grid size-9 shrink-0 place-items-center rounded-full transition-colors ${on ? "blue-grad" : "bg-g-card text-g-faint"}`}>{on ? <Check size={16} strokeWidth={3} /> : <Plus size={16} strokeWidth={2.4} />}</span>
                      </button>
                    );
                  })}
                </div>
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
                        className={`press flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium transition-colors ${on ? "bg-g-ink text-white" : "bg-g-fill"} ${o.color ? "pl-2.5" : ""}`}
                      >
                        {on ? <Check size={15} strokeWidth={2.5} /> : o.color && <span className="size-4 shrink-0 rounded-full ring-2 ring-white/70" style={{ background: o.color }} />}
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
        {/* A word to the kitchen about this dish only; it travels with the dish to the cart and the kitchen. */}
        <section className="mt-9">
          <h3 className="mb-3 flex items-center gap-2 text-[17px] font-semibold">
            <MessageSquareText size={18} strokeWidth={2} className="text-g-blue" /> {ui(lang, "dishNote")}
            <span className="ml-auto text-[13px] font-medium text-g-faint">{ui(lang, "optional")}</span>
          </h3>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={140}
            placeholder={ui(lang, "dishNotePh")}
            aria-label={ui(lang, "dishNote")}
            className="w-full resize-none rounded-[20px] bg-g-fill px-4 py-3.5 text-[16px] outline-none placeholder:text-[15px] placeholder:text-g-faint focus:ring-2 focus:ring-g-blue/30"
          />
        </section>
      </div>
    </Sheet>
  );
}

/* ---------------------------------------------------------------- Hookah */

const LEVEL_KEYS = ["strength1", "strength2", "strength3"] as const;
const levelWord = (lang: Lang, lv: number) => ui(lang, LEVEL_KEYS[Math.min(3, Math.max(1, lv)) - 1]!);

/** Strength as three rising bars: one for light, two for medium, three for strong. */
function LevelBars({ level, on, size = 18, light = false }: { level: number; on?: boolean; size?: number; light?: boolean }) {
  const fill = light ? "#fff" : on ? "var(--g-blue)" : "var(--g-ink)";
  const rest = light ? "rgba(255,255,255,0.3)" : "color-mix(in srgb, var(--g-faint) 35%, transparent)";
  return (
    <svg viewBox="0 0 18 18" width={size} height={size} aria-hidden className="shrink-0">
      {[0, 1, 2].map((i) => (
        <rect key={i} x={1 + i * 6} y={12 - i * 5} width={4} height={5 + i * 5} rx={2} fill={i < level ? fill : rest} className="transition-[fill] duration-300" />
      ))}
    </svg>
  );
}

/** Light, medium or strong: three big cards, the bars, the word and what it means. */
function StrengthLevels({ group, lang, value, onPick }: { group: ModifierGroup; lang: Lang; value?: number; onPick: (level: number) => void }) {
  return (
    <div role="radiogroup" aria-label={t(group.name, lang)} className="grid grid-cols-3 gap-2">
      {group.options.map((o) => {
        const lv = o.level ?? 1;
        const on = value === lv;
        return (
          <button
            key={o.id}
            role="radio"
            aria-checked={on}
            onClick={() => onPick(lv)}
            className={`press flex min-h-[128px] flex-col items-start rounded-[22px] p-3.5 text-left transition-colors ${on ? "spin-ring bg-g-blue-soft" : "bg-g-fill"}`}
          >
            <LevelBars level={lv} on={on} size={26} />
            <span className="mt-4">
              <span className={`block text-[16px] leading-tight font-bold tracking-[-0.01em] ${on ? "text-g-blue" : ""}`}>{t(o.name, lang)}</span>
              {o.note && <span className="mt-1 block text-[12px] leading-[1.3] text-g-muted">{t(o.note, lang)}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Hookah tobacco as brand tiles, two per row, each with its own strength.
 * The ones that match the chosen strength come first; the rest stay pickable,
 * a little quieter, under "Other strength" (picking one moves the strength).
 */
function TobaccoTiles({
  group,
  lang,
  currency,
  basePrice,
  value,
  level,
  onPick,
}: {
  group: ModifierGroup;
  lang: Lang;
  currency: Currency;
  basePrice: number;
  value: string[];
  level?: number;
  onPick: (optionId: string) => void;
}) {
  const fits = (lv?: number) => !level || !lv || lv === level;
  const match = group.options.filter((o) => fits(o.level));
  const rest = group.options.filter((o) => !fits(o.level));
  const tile = (o: ModifierGroup["options"][number], quiet: boolean) => {
    const on = value.includes(o.id);
    return (
      <button
        key={o.id}
        onClick={() => onPick(o.id)}
        aria-pressed={on}
        className={`press flex min-h-[104px] flex-col items-start justify-between rounded-[22px] p-3.5 text-left transition-[background-color,opacity] ${on ? "spin-ring bg-g-blue-soft" : "bg-g-fill"} ${quiet && !on ? "opacity-60" : ""}`}
      >
        <span className="flex w-full items-start justify-between gap-2">
          {o.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={o.logo} alt={t(o.name, lang)} className="h-7 w-auto max-w-[80%] object-contain object-left" />
          ) : (
            <span className="text-[18px] leading-[1.1] font-bold tracking-[-0.02em]">{t(o.name, lang)}</span>
          )}
          <span className={`grid size-6 shrink-0 place-items-center rounded-full transition-colors ${on ? "blue-grad" : "border-[1.5px] border-g-faint/50"}`}>{on && <Check size={13} strokeWidth={3} />}</span>
        </span>
        <span className="mt-2 flex w-full flex-col gap-1">
          {o.level && (
            <span className={`flex items-center gap-1.5 text-[12px] font-semibold ${on ? "text-g-blue" : "text-g-ink-2"}`}>
              <LevelBars level={o.level} on={on} size={14} /> {levelWord(lang, o.level)}
            </span>
          )}
          {o.note && <span className="line-clamp-1 text-[12px] leading-[1.3] text-g-muted">{t(o.note, lang).split(" · ").slice(1).join(" · ") || t(o.note, lang)}</span>}
          <span className={`text-[14px] font-semibold tabular-nums ${on ? "text-g-blue" : "text-g-ink"}`}>{formatMoney(basePrice + o.price, currency, lang)}</span>
        </span>
      </button>
    );
  };
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">{match.map((o) => tile(o, false))}</div>
      {rest.length > 0 && (
        <>
          <p className="mt-5 mb-2 text-[13px] font-semibold text-g-muted">{ui(lang, "otherStrength")}</p>
          <div className="grid grid-cols-2 gap-2">{rest.map((o) => tile(o, true))}</div>
        </>
      )}
    </div>
  );
}

/** The live mix over the photo: strength bars and word, the tobacco, the flavours as colour dots. */
function HookahSummary({ item, ids, lang }: { item: MenuItem; ids: string[]; lang: Lang }) {
  const pick = (display: ModifierGroup["display"]) => item.modifierGroups.filter((g) => g.display === display).flatMap((g) => g.options.filter((o) => ids.includes(o.id)));
  const strength = item.modifierGroups.find((g) => g.display === "scale")?.options.find((o) => ids.includes(o.id));
  const tobacco = pick("brands")[0];
  const flavors = item.modifierGroups.filter((g) => g.options.some((o) => o.color) && g.display === "chips").flatMap((g) => g.options.filter((o) => ids.includes(o.id)));
  return (
    <div className="absolute inset-x-0 bottom-0 p-4 text-white">
      <p key={`${strength?.id}-${tobacco?.id}`} className="animate-pop flex items-center gap-2 text-[22px] leading-tight font-bold tracking-[-0.02em]">
        {strength?.level && <LevelBars level={strength.level} light size={22} />}
        {strength ? t(strength.name, lang) : ""}
        <span className="text-white/45">·</span>
        <span className={tobacco ? "" : "text-white/60"}>{tobacco ? t(tobacco.name, lang) : ui(lang, "pickTobacco")}</span>
      </p>
      <p className="mt-1.5 flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-white/80">
        {flavors.map((f) => (
          <span key={f.id} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full ring-1 ring-white/50" style={{ background: f.color }} />
            {t(f.name, lang)}
          </span>
        ))}
      </p>
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
  onNote,
  serviceRate,
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
  onNote: (key: string, note: string) => void;
  serviceRate: number;
  onSend: (note: string) => void;
}) {
  const [notes, setNotes] = useState<UiKey[]>([]);
  const [text, setText] = useState("");
  // Which dish's note is open for editing, and its draft.
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const dishes = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const { service, total } = withService(dishes, serviceRate);
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const note = [...notes.map((k) => ui(lang, k)), text.trim()].filter(Boolean).join(", ");

  return (
    <Sheet
      open={open}
      onClose={onClose}
      label={ui(lang, "yourOrder")}
      title={false}
      footer={
        // Sending to the kitchen is a deliberate act: slide the knob across.
        <SlideToConfirm
          disabled={!lines.length}
          label={ui(lang, "slideToSend")}
          aside={formatMoney(total, currency, lang)}
          onConfirm={() => {
            onSend(note);
            setNotes([]);
            setText("");
          }}
        />
      }
    >
      <div className="px-5 pt-2 pb-6">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">{ui(lang, "yourOrder")}</h2>
          {count > 0 && <span className="mb-1 rounded-full bg-g-fill px-3 py-1 text-[13px] font-semibold tabular-nums">{ui(lang, "itemsCount").replace("{n}", String(count))}</span>}
        </div>

        {!lines.length && (
          <div className="mt-6 flex flex-col items-center rounded-[28px] bg-g-fill px-6 py-12 text-center">
            <span className="chip-blue grid size-16 place-items-center rounded-full">
              <ShoppingBag size={28} strokeWidth={1.8} />
            </span>
            <p className="mt-4 text-[18px] font-semibold">{ui(lang, "cartEmptyTitle")}</p>
            <p className="mt-1 text-[14px] leading-snug text-g-muted">{ui(lang, "emptyBody")}</p>
          </div>
        )}

        {lines.length > 0 && (
          <>
            {/* The dishes: one card, a row each, the quantity right where the thumb is. */}
            <ul className="mt-5 divide-y divide-g-line rounded-[26px] bg-g-fill px-3">
              {lines.map((line) => {
                const item = itemById.get(line.itemId)!;
                const role = categoryOf.get(item.id)?.role ?? "main";
                const variant = item.variants.find((v) => v.id === line.variantId);
                const opts = item.modifierGroups.flatMap((g) => g.options).filter((o) => line.optionIds.includes(o.id));
                const extra = [variant && t(variant.name, lang), ...opts.map((o) => t(o.name, lang))].filter(Boolean).join(" · ");
                const open = editing === line.key;
                return (
                  <li key={line.key} className="py-3">
                    <div className="flex items-center gap-3">
                      <DishTile item={item} role={role} photoScale={0.96} glyph={0.62} soft className="size-[60px] shrink-0 rounded-[16px] !bg-g-card" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold">{t(item.name, lang)}</p>
                        {extra && <p className="truncate text-[12.5px] text-g-muted">{extra}</p>}
                        <p className="mt-0.5 text-[15px] tabular-nums">
                          <span className="font-semibold">{formatMoney(line.unitPrice * line.qty, currency, lang)}</span>
                          {line.qty > 1 && <span className="ml-1.5 text-[12.5px] text-g-muted">{line.qty} × {formatMoney(line.unitPrice, currency, lang)}</span>}
                        </p>
                      </div>
                      <Stepper qty={line.qty} onChange={(q) => onQty(line.key, q)} className="h-9 w-[96px] shrink-0" />
                    </div>
                    {/* The dish's own note: a quiet link when empty, a note card when set, a small editor when open. */}
                    {open ? (
                      <div className="mt-2.5 rounded-[18px] bg-g-card p-2.5">
                        <textarea
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          rows={2}
                          maxLength={140}
                          placeholder={ui(lang, "dishNotePh")}
                          aria-label={ui(lang, "dishNoteFor").replace("{dish}", t(item.name, lang))}
                          className="w-full resize-none bg-transparent px-1.5 py-1 text-[15px] outline-none placeholder:text-g-faint"
                        />
                        <div className="mt-1 flex items-center justify-end gap-2">
                          {line.note && (
                            <button
                              onClick={() => {
                                onNote(line.key, "");
                                setEditing(null);
                              }}
                              className="press mr-auto h-9 px-2 text-[13px] font-semibold text-g-muted"
                            >
                              {ui(lang, "clearNote")}
                            </button>
                          )}
                          <button
                            onClick={() => {
                              haptic("light");
                              onNote(line.key, draft);
                              setEditing(null);
                            }}
                            className="blue-grad press h-9 rounded-full px-4 text-[14px] font-semibold"
                          >
                            {ui(lang, "saveNote")}
                          </button>
                        </div>
                      </div>
                    ) : line.note ? (
                      <button
                        onClick={() => {
                          setDraft(line.note ?? "");
                          setEditing(line.key);
                        }}
                        className="press mt-2 flex w-full items-start gap-2 rounded-[14px] bg-g-tint-note px-3 py-2 text-left text-[13px] leading-snug"
                      >
                        <MessageSquareText size={14} strokeWidth={2.2} className="mt-0.5 shrink-0 text-g-orange" />
                        <span className="min-w-0 flex-1">{line.note}</span>
                        <Pencil size={13} strokeWidth={2.2} className="mt-0.5 shrink-0 text-g-muted" />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setDraft("");
                          setEditing(line.key);
                        }}
                        className="press mt-1.5 ml-[72px] flex items-center gap-1.5 text-[13px] font-semibold text-g-blue"
                      >
                        <MessageSquarePlus size={14} strokeWidth={2.2} /> {ui(lang, "addNote")}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            {/* A word to the kitchen: quick tags, or your own. */}
            <section className="mt-3 rounded-[26px] bg-g-fill p-4">
              <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                <StickyNote size={16} strokeWidth={2.2} className="text-g-blue" /> {ui(lang, "wholeOrderNote")}
                <span className="ml-auto text-[13px] font-medium text-g-faint">{ui(lang, "optional")}</span>
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {NOTES.map((k) => {
                  const on = notes.includes(k);
                  return (
                    <button
                      key={k}
                      onClick={() => {
                        haptic("tick");
                        setNotes((n) => (on ? n.filter((x) => x !== k) : [...n, k]));
                      }}
                      aria-pressed={on}
                      className={`press flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-medium ${on ? "bg-g-ink text-white" : "bg-g-card"}`}
                    >
                      {on && <Check size={14} strokeWidth={2.5} />}
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
                className="mt-2.5 w-full resize-none rounded-[18px] bg-g-card px-4 py-3 text-[16px] outline-none placeholder:text-[15px] placeholder:text-g-faint focus:ring-2 focus:ring-g-blue/30"
              />
            </section>

            {/* The sum, plainly. */}
            <section className="mt-3 rounded-[26px] bg-g-fill p-4">
              <div className="flex items-baseline justify-between text-[14px] text-g-muted">
                <span>
                  {ui(lang, "dishesLabel")} · {count}
                </span>
                <span className="tabular-nums">{formatMoney(dishes, currency, lang)}</span>
              </div>
              <div className="mt-1.5 flex items-baseline justify-between text-[14px] text-g-muted">
                <span>{ui(lang, "servicePct").replace("{p}", String(Math.round(serviceRate * 100)))}</span>
                <span className="tabular-nums">{formatMoney(service, currency, lang)}</span>
              </div>
              <div className="mt-2.5 flex items-baseline justify-between border-t border-g-line pt-3">
                <span className="text-[16px] font-semibold">{ui(lang, "total")}</span>
                <span className="text-[26px] leading-none font-semibold tracking-[-0.02em] tabular-nums">{formatMoney(total, currency, lang)}</span>
              </div>
              <p className="mt-2 text-[12px] leading-snug text-g-faint">{ui(lang, "serviceNote")}</p>
            </section>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-[13px] text-g-muted">
              <CookingPot size={14} strokeWidth={2} /> {ui(lang, "sendHint")}
            </p>
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

const STEPS: { key: UiKey; icon: LucideIcon }[] = [
  { key: "stepSent", icon: ReceiptText },
  { key: "stepAccepted", icon: Check },
  { key: "stepCooking", icon: CookingPot },
  { key: "stepReady", icon: BellRing },
];
/** When each step begins on the demo timeline, in seconds (see orderStage). */
const STEP_AT = [0, 6, 15, 45];
const clock = (at: number) => new Date(at).toTimeString().slice(0, 5);

/** The order's progress on one line: four stations and the track between them. */
function OrderTrack({ stage, ready, lang, at }: { stage: number; ready: boolean; lang: Lang; at: (k: number) => string }) {
  const share = ready ? 1 : stage / 3;
  return (
    <div className="mt-4">
      <div className="relative mx-3 h-7">
        {/* The track: a quiet line, the filled part in the brand gradient, light flowing on the live stretch. */}
        <span aria-hidden className="absolute top-1/2 right-0 left-0 h-[3px] -translate-y-1/2 rounded-full bg-g-card" />
        <span aria-hidden className={`absolute top-1/2 left-0 h-[3px] -translate-y-1/2 rounded-full transition-[width] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)] ${ready ? "bg-g-green" : "bar-grad"}`} style={{ width: `${share * 100}%` }} />
        {!ready && <span aria-hidden className="track-flow absolute top-1/2 h-[3px] -translate-y-1/2 overflow-hidden rounded-full" style={{ left: `${share * 100}%`, width: `${100 / 3}%` }} />}
        {STEPS.map((st, k) => {
          const done = k < stage || ready;
          const cur = k === stage && !ready;
          return (
            <span key={st.key} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${(k / 3) * 100}%` }}>
              {cur && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-g-blue/30" />}
              <span className={`relative grid size-7 place-items-center rounded-full transition-colors duration-500 ${done ? (ready ? "bg-g-green text-white" : "blue-grad") : cur ? "blue-grad ring-4 ring-g-blue/15" : "bg-g-card text-g-faint"}`}>
                {done ? <Check size={14} strokeWidth={2.8} /> : <st.icon size={13} strokeWidth={2.4} />}
              </span>
            </span>
          );
        })}
      </div>
      <div className="mt-1.5 grid grid-cols-4 text-center">
        {STEPS.map((st, k) => {
          const reached = k <= stage || ready;
          return (
            <span key={st.key} className="min-w-0">
              <span className={`block truncate text-[11.5px] font-semibold ${reached ? "text-g-ink" : "text-g-faint"}`}>{ui(lang, st.key)}</span>
              <span className="block text-[10.5px] text-g-muted tabular-nums">{reached ? (k === stage && !ready ? ui(lang, "stepNow") : at(k)) : "\u00a0"}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The guest's orders. The newest one is the hero: its status in words, the
 * time left, and four steps with icons that light up one by one. Dishes show
 * with their photos. Earlier orders fold into compact rows; the table's
 * running total sits at the bottom with a way to ask for the bill.
 */
export function OrdersSheet({
  open,
  onClose,
  lang,
  currency,
  orders,
  now,
  itemById,
  menu,
  table,
  onOrderMore,
  onBill,
}: {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  currency: Currency;
  orders: PlacedOrder[];
  now: number;
  itemById: Map<string, MenuItem>;
  menu: Menu;
  table?: string | number;
  onOrderMore: () => void;
  onBill?: () => void;
}) {
  const serviceRate = menu.venue.serviceRate ?? DEFAULT_SERVICE_RATE;
  const list = [...orders].reverse();
  const roleOf = useMemo(() => new Map(menu.categories.flatMap((c) => c.items.map((i) => [i.id, c.role] as const))), [menu]);
  const [openId, setOpenId] = useState<number | null>(null);
  const sum = orders.reduce((n, o) => n + o.total, 0);
  const money = (n: number) => formatMoney(n, currency, lang);
  const dishes = (o: PlacedOrder, big: boolean) => (
    <ul className={big ? "grid gap-3" : "mt-3 grid gap-2.5"}>
      {o.lines.map((l) => {
        const it = itemById.get(l.itemId)!;
        return (
          <li key={l.key} className="flex items-center gap-3">
            <DishTile item={it} role={roleOf.get(it.id) ?? "main"} photoScale={0.9} glyph={0.5} className={`${big ? "size-12 rounded-[14px]" : "size-10 rounded-[12px]"} shrink-0`} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium">{t(it.name, lang)}</span>
              <span className="block text-[13px] text-g-muted tabular-nums">
                {l.qty} × {money(l.unitPrice)}
              </span>
              {l.note && (
                <span className="mt-1 flex items-start gap-1.5 text-[12.5px] leading-snug text-g-ink-2">
                  <MessageSquareText size={13} strokeWidth={2.2} className="mt-0.5 shrink-0 text-g-orange" /> {l.note}
                </span>
              )}
            </span>
            <span className="shrink-0 text-[15px] font-semibold tabular-nums">{money(l.unitPrice * l.qty)}</span>
          </li>
        );
      })}
    </ul>
  );
  return (
    <Sheet
      open={open}
      onClose={onClose}
      label={ui(lang, "orders")}
      title={false}
      footer={
        <div className="flex gap-2.5">
          {onBill && list.length > 0 && (
            <button onClick={onBill} className="press flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-g-fill text-[16px] font-semibold">
              <ReceiptText size={18} strokeWidth={2} /> {ui(lang, "billRequest")}
            </button>
          )}
          <button onClick={onOrderMore} className="blue-grad press flex h-14 flex-1 items-center justify-center gap-2 rounded-full text-[16px] font-semibold">
            <Plus size={18} strokeWidth={2.4} /> {ui(lang, "orderMore")}
          </button>
        </div>
      }
    >
      <div className="px-5 pt-2 pb-6">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">{ui(lang, "orders")}</h2>
          {table !== undefined && (
            <span className="mb-1 rounded-full bg-g-fill px-3 py-1 text-[13px] font-semibold">
              {ui(lang, "table")} {table}
            </span>
          )}
        </div>

        {!list.length && (
          <div className="mt-6 flex flex-col items-center rounded-[28px] bg-g-fill px-6 py-12 text-center">
            <span className="chip-blue grid size-16 place-items-center rounded-full">
              <ReceiptText size={28} strokeWidth={1.8} />
            </span>
            <p className="mt-4 text-[18px] font-semibold">{ui(lang, "noOrders")}</p>
            <p className="mt-1 text-[14px] leading-snug text-g-muted">{ui(lang, "noOrdersBody")}</p>
          </div>
        )}

        {list.map((o, i) => {
          const stage = orderStage(o, now);
          const ready = stage === 3;
          const minsLeft = Math.max(1, Math.ceil(15 - ((now - o.placedAt) / 1000 / 45) * 15));
          if (i > 0) {
            // Earlier orders: one compact row each; tap to see the dishes.
            const on = openId === o.id;
            return (
              <div key={o.id}>
                {i === 1 && <p className="mt-7 text-[12px] font-semibold tracking-[0.06em] text-g-muted uppercase">{ui(lang, "earlierOrders")}</p>}
                <article className="mt-2.5 rounded-[22px] bg-g-fill p-4">
                  <button
                    onClick={() => {
                      haptic("tick");
                      setOpenId(on ? null : o.id);
                    }}
                    aria-expanded={on}
                    className="flex w-full items-center gap-3 text-left"
                  >
                    <span className={`grid size-10 shrink-0 place-items-center rounded-full ${ready ? "chip-green" : "chip-blue"}`}>{ready ? <Check size={18} strokeWidth={2.4} /> : <CookingPot size={18} strokeWidth={2} />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold">
                        №{String(o.id).padStart(3, "0")} · {ui(lang, ready ? "served" : STEPS[stage]!.key)}
                      </span>
                      <span className="block truncate text-[13px] text-g-muted">
                        {clock(o.placedAt)} · {o.lines.map((l) => `${l.qty}× ${t(itemById.get(l.itemId)!.name, lang)}`).join(", ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-[15px] font-semibold tabular-nums">{money(withService(o.total, serviceRate).total)}</span>
                    <ChevronDown size={17} className={`shrink-0 text-g-faint transition-transform ${on ? "rotate-180" : ""}`} />
                  </button>
                  {on && dishes(o, false)}
                </article>
              </div>
            );
          }
          return (
            <article key={o.id} className="mesh-blue mt-5 rounded-[28px] p-5">
              <div className="flex items-center justify-between text-[13px] font-medium text-g-muted">
                <span>
                  {ui(lang, "order")} №{String(o.id).padStart(3, "0")} · {clock(o.placedAt)}
                </span>
                <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${ready ? "chip-green" : "bg-g-card text-g-blue"}`}>
                  {!ready && <span className="size-1.5 animate-pulse rounded-full bg-g-blue" />}
                  {ready ? ui(lang, "stepReady") : ui(lang, "eta").replace("{n}", String(minsLeft))}
                </span>
              </div>
              <h3 className="mt-2.5 text-[24px] leading-tight font-bold tracking-[-0.025em]">{ui(lang, STAGES[stage]!)}</h3>

              {/* One compact horizontal line: four stations joined by a track. Done
                  stations are filled, the current one pulses, and light flows along
                  the stretch the kitchen is working on now. */}
              <OrderTrack stage={stage} ready={ready} lang={lang} at={(k) => clock(o.placedAt + STEP_AT[k]! * 1000)} />

              <div className="mt-3 rounded-[20px] bg-g-card p-3.5">
                {dishes(o, true)}
                {o.note && (
                  <p className="mt-3 flex items-start gap-2 rounded-[14px] bg-g-tint-note px-3 py-2 text-[13px] leading-snug">
                    <StickyNote size={14} className="mt-0.5 shrink-0 text-g-orange" /> {o.note}
                  </p>
                )}
                <div className="mt-3 border-t border-g-line pt-3 text-[13px] text-g-muted">
                  <p className="flex justify-between tabular-nums">
                    <span>{ui(lang, "dishesLabel")}</span>
                    <span>{money(o.total)}</span>
                  </p>
                  <p className="mt-1 flex justify-between tabular-nums">
                    <span>{ui(lang, "servicePct").replace("{p}", String(Math.round(serviceRate * 100)))}</span>
                    <span>{money(withService(o.total, serviceRate).service)}</span>
                  </p>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-[14px] font-semibold">{ui(lang, "total")}</span>
                  <span className="text-[20px] font-semibold tracking-[-0.02em] tabular-nums">{money(withService(o.total, serviceRate).total)}</span>
                </div>
              </div>
            </article>
          );
        })}

        {list.length > 0 && (
          <div className="mt-6 flex items-center justify-between rounded-[22px] bg-g-fill px-4 py-3.5">
            <span>
              <span className="block text-[15px] font-semibold">{ui(lang, "tableTotal")}</span>
              <span className="block text-[13px] text-g-muted">{ui(lang, "ordersCount").replace("{n}", String(orders.length))}</span>
            </span>
            <span className="text-right">
              <span className="block text-[22px] leading-tight font-semibold tracking-[-0.02em] tabular-nums">{money(withService(sum, serviceRate).total)}</span>
              <span className="block text-[12px] text-g-muted tabular-nums">{ui(lang, "servicePct").replace("{p}", String(Math.round(serviceRate * 100)))} · {money(withService(sum, serviceRate).service)}</span>
            </span>
          </div>
        )}
        {list.length > 0 && <p className="mt-2 text-[12px] text-g-faint">{ui(lang, "serviceNote")}</p>}
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
  serviceRate = DEFAULT_SERVICE_RATE,
}: {
  open: boolean;
  onClose: () => void;
  lang: Lang;
  currency: Currency;
  orders: PlacedOrder[];
  itemById: Map<string, MenuItem>;
  table: string | null;
  onRequest: (total: number, method: string) => void;
  serviceRate?: number;
}) {
  const [tip, setTip] = useState(0);
  const [method, setMethod] = useState<UiKey>("billQr");
  const lines = orders.flatMap((o) => o.lines);
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const service = withService(subtotal, serviceRate).service;
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
              <span>{ui(lang, "servicePct").replace("{p}", String(Math.round(serviceRate * 100)))}</span>
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

/* ---------------------------------------------------------------- Categories */

/** All menu sections as one page: icon, name, how many dishes. Tap jumps to the section. */
export function CategoriesSheet({ open, onClose, menu, lang, onPick }: { open: boolean; onClose: () => void; menu: Menu; lang: Lang; onPick: (id: string) => void }) {
  return (
    <Sheet open={open} onClose={onClose} label={ui(lang, "categories")} title={false}>
      <div className="px-5 pt-1 pb-8">
        <h2 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">{ui(lang, "categories")}</h2>
        <p className="mt-1 text-[14px] text-g-muted">
          {menu.categories.length} {ui(lang, "sections")} · {menu.categories.reduce((n, c) => n + c.items.length, 0)} {ui(lang, "items")}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {menu.categories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                haptic("light");
                onPick(c.id);
              }}
              className="press flex h-[84px] flex-col justify-between rounded-[20px] bg-g-fill p-3.5 text-left"
            >
              <span className="flex items-center justify-between">
                <span className="text-g-blue">
                  <RoleIcon role={c.role} name={c.items[0]?.name.en} size={20} />
                </span>
                <span className="text-[12px] font-medium text-g-muted tabular-nums">{c.items.length}</span>
              </span>
              <span className="truncate text-[15px] font-semibold">{t(c.name, lang)}</span>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

/** Escapes a value for the Wi-Fi QR payload (`\`, `;`, `,`, `:` and `"`). */
const wifiEscape = (v: string) => v.replace(/([\;,:"])/g, "\\$1");

/**
 * A real, scannable QR drawn as soft dots, with rounded finder eyes and a
 * Wi-Fi badge in the middle (error correction Q leaves room for it).
 */
function WifiQr({ value, size = 232 }: { value: string; size?: number }) {
  const { n, dots } = useMemo(() => {
    const qr = qrcode(0, "Q");
    qr.addData(value);
    qr.make();
    const n = qr.getModuleCount();
    const inFinder = (r: number, c: number) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
    const mid = n / 2;
    const inBadge = (r: number, c: number) => Math.abs(r + 0.5 - mid) < n * 0.13 && Math.abs(c + 0.5 - mid) < n * 0.13;
    const dots: [number, number][] = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c) && !inFinder(r, c) && !inBadge(r, c)) dots.push([r, c]);
    return { n, dots };
  }, [value]);
  const finders: [number, number][] = [[0, 0], [0, n - 7], [n - 7, 0]];
  const badge = n * 0.22;
  return (
    <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} width={size} height={size} role="img" aria-label="Wi-Fi QR code">
      {dots.map(([r, c]) => (
        <rect key={`${r}-${c}`} x={c + 0.08} y={r + 0.08} width={0.84} height={0.84} rx={0.36} fill="#0b0b0f" />
      ))}
      {finders.map(([r, c]) => (
        <g key={`f${r}-${c}`}>
          <rect x={c + 0.5} y={r + 0.5} width={6} height={6} rx={2} fill="none" stroke="#0b0b0f" strokeWidth={1} />
          <rect x={c + 2} y={r + 2} width={3} height={3} rx={1} fill="#2f5bff" />
        </g>
      ))}
      <rect x={n / 2 - badge / 2} y={n / 2 - badge / 2} width={badge} height={badge} rx={badge * 0.3} fill="url(#wifi-badge)" />
      <defs>
        <linearGradient id="wifi-badge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6c96ff" />
          <stop offset="0.5" stopColor="#2f6bff" />
          <stop offset="1" stopColor="#2530b0" />
        </linearGradient>
      </defs>
      <g transform={`translate(${n / 2 - badge * 0.3} ${n / 2 - badge * 0.3}) scale(${(badge * 0.6) / 24})`} fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round">
        <path d="M5 12.5a10 10 0 0 1 14 0" />
        <path d="M8.5 16a5 5 0 0 1 7 0" />
        <path d="M12 19.5h.01" strokeWidth={3.2} />
      </g>
    </svg>
  );
}

/** Wi-Fi page: scannable code, network and password with copy, and a short how-to. */
export function WifiSheet({ open, onClose, brand, lang, onNotice }: { open: boolean; onClose: () => void; brand: VenueBrand; lang: Lang; onNotice: (title: string) => void }) {
  const { name, pass } = brand.about.wifi;
  const [shown, setShown] = useState(true);
  const copy = (text: string, done: string) => {
    haptic("success");
    navigator.clipboard?.writeText(text).catch(() => undefined);
    onNotice(done);
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      label="Wi-Fi"
      title={false}
      footer={
        <button onClick={() => copy(pass, ui(lang, "wifiCopied"))} className="blue-grad press flex h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-semibold">
          <Copy size={18} strokeWidth={2} /> {ui(lang, "wifiCopy")}
        </button>
      }
    >
      <div className="px-5 pt-1 pb-6">
        <h2 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">Wi-Fi</h2>
        <p className="mt-1 text-[14px] text-g-muted">{ui(lang, "wifiSecurity")}</p>

        {/* The code always on white, so any camera reads it in either theme. */}
        <div className="mt-5 flex items-center gap-4 rounded-[24px] bg-g-fill p-3">
          <span className="shrink-0 rounded-[18px] p-2.5" style={{ background: "#fff" }}>
            <WifiQr value={`WIFI:T:WPA;S:${wifiEscape(name)};P:${wifiEscape(pass)};;`} size={128} />
          </span>
          <p className="min-w-0 pr-1 text-[14px] leading-snug text-g-ink-2">{ui(lang, "wifiScan")}</p>
        </div>

        <p className="mt-6 mb-2 text-[13px] font-semibold text-g-muted">{ui(lang, "wifiManual")}</p>
        <div className="divide-y divide-g-line rounded-[24px] bg-g-fill px-4">
          <div className="flex items-center gap-3 py-3">
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] text-g-muted">{ui(lang, "wifiNetwork")}</span>
              <span className="block truncate text-[17px] font-semibold">{name}</span>
            </span>
            <button onClick={() => copy(name, ui(lang, "copied"))} aria-label={`${ui(lang, "copied")}: ${name}`} className="press grid size-10 shrink-0 place-items-center rounded-full text-g-blue">
              <Copy size={19} strokeWidth={2} />
            </button>
          </div>
          <div className="flex items-center gap-3 py-3">
            <button
              onClick={() => {
                haptic("tick");
                setShown((v) => !v);
              }}
              className="min-w-0 flex-1 text-left"
            >
              <span className="block text-[12px] text-g-muted">
                {ui(lang, "wifiPassword")} · <span className="text-g-blue">{shown ? ui(lang, "wifiHide") : ui(lang, "wifiShow")}</span>
              </span>
              <span className="block truncate text-[17px] font-semibold tracking-[0.02em] tabular-nums">{shown ? pass : "•".repeat(pass.length)}</span>
            </button>
            <button onClick={() => copy(pass, ui(lang, "wifiCopied"))} aria-label={ui(lang, "wifiCopy")} className="press grid size-10 shrink-0 place-items-center rounded-full text-g-blue">
              <Copy size={19} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
