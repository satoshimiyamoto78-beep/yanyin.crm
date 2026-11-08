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
import { ArrowLeft, BellRing, ChefHat, Check, Clock, Flame, Globe, MapPin, Plus, Receipt, Send, ShoppingBag, Trash2 } from "lucide-react";
import Image from "next/image";
import { useMemo, useState, type ReactNode } from "react";
import { ui, type UiKey } from "@/lib/ui-strings";
import { popularItems, type VenueBrand } from "@/lib/visual";
import {
  ActionRow,
  CategoryGlyph,
  CategoryRail,
  DraftTag,
  ItemCard,
  Media,
  RoundButton,
  SearchBar,
  SectionHead,
  Stepper,
  TableBadge,
  secondaryName,
} from "./parts";

export type PlacedOrder = { id: number; lines: CartLine[]; total: number; note: string; placedAt: number };

export type Ctx = {
  menu: Menu;
  brand: VenueBrand;
  lang: Lang;
  currency: Currency;
  table: string | null;
  lines: CartLine[];
  categoryOf: Map<string, Category>;
  itemById: Map<string, MenuItem>;
  qtyOf: (itemId: string) => number;
  open: (item: MenuItem) => void;
  quickAdd: (item: MenuItem) => void;
  setPlainQty: (item: MenuItem, qty: number) => void;
  go: (screen: "home" | "menu" | "cart" | "orders" | "about", categoryId?: string) => void;
  back: () => void;
  openLang: () => void;
  openRoulette: () => void;
  service: (key: UiKey) => void;
  hasCoals: boolean;
};

/* ---------------------------------------------------------------- Home */

export function HomeScreen({ ctx, search, setSearch }: { ctx: Ctx; search: string; setSearch: (v: string) => void }) {
  const { menu, brand, lang } = ctx;
  const [slide, setSlide] = useState(0);
  const featured = menu.categories.filter((c) => c.items.length).slice(0, 2);

  return (
    <div className="animate-screen">
      {/* Masthead */}
      <div
        className="relative overflow-hidden px-5 pt-[max(16px,env(safe-area-inset-top))] pb-[92px]"
        style={{
          background: `linear-gradient(180deg, var(--guest-cta) 0%, color-mix(in srgb, var(--guest-cta) 85%, white) 26%, color-mix(in srgb, var(--guest-cta) 50%, white) 48%, color-mix(in srgb, var(--guest-cta) 22%, white) 66%, var(--guest-bg) 84%)`,
        }}
      >
        <div aria-hidden className="animate-glow pointer-events-none absolute -inset-x-[30%] -top-1/4 h-[150%]" style={{ background: "radial-gradient(42% 42% at 50% 50%, rgba(255,255,255,.24), transparent 70%)" }} />
        <div className="relative flex items-center gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-[12px] font-extrabold text-guest-cta">{brand.mark}</span>
            <span className="truncate text-[12px] font-bold text-white">{menu.venue.name}</span>
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            {ctx.table && <TableBadge label={`${ui(lang, "table")} ${ctx.table.padStart(2, "0")}`} onDark />}
            <RoundButton label={ui(lang, "language")} onClick={ctx.openLang}>
              <Globe className="size-[17px]" />
            </RoundButton>
            <RoundButton label={ui(lang, "cart")} onClick={() => ctx.go("cart")} badge={ctx.lines.reduce((s, l) => s + l.qty, 0)}>
              <ShoppingBag className="size-[17px]" />
            </RoundButton>
          </div>
        </div>
        <h1 className="relative mt-6 max-w-[16ch] text-[29px] leading-[1.14] font-extrabold tracking-tight text-white">{brand.headline[lang as "en"] ?? brand.headline.en}</h1>
      </div>

      <main className="px-5">
        <div className="relative z-10 -mt-[58px] mb-5 drop-shadow-[0_18px_34px_rgba(20,22,26,0.18)]">
          <SearchBar value={search} lang={lang} onChange={(v) => { setSearch(v); if (v) ctx.go("menu"); }} onFilter={() => ctx.go("menu")} />
        </div>

        {/* Promo slider */}
        <div
          className="no-scrollbar -mx-5 flex snap-x snap-mandatory overflow-x-auto"
          onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        >
          {brand.promos.map((p, i) => {
            const item = p.itemId ? ctx.itemById.get(p.itemId) : undefined;
            return (
              <div key={i} className="w-full shrink-0 snap-start px-5">
                <Promo
                  kicker={p.kicker}
                  title={p.title}
                  cta={p.action === "roulette" ? ui(lang, "rouletteCta") : ui(lang, "orderNow")}
                  image={item?.photo}
                  roulette={p.action === "roulette"}
                  onClick={() => (p.action === "roulette" ? ctx.openRoulette() : item && ctx.open(item))}
                />
              </div>
            );
          })}
        </div>
        {brand.promos.length > 1 && (
          <div className="mt-2.5 mb-6 flex justify-center gap-1.5">
            {brand.promos.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === slide ? "w-4 bg-guest-cta" : "w-1.5 bg-guest-muted-2"}`} />
            ))}
          </div>
        )}
        {brand.promos.length <= 1 && <div className="mb-6" />}

        <SectionHead title={ui(lang, "categories")} />
        <CategoryRail categories={menu.categories} lang={lang} onPick={(id) => ctx.go("menu", id)} />

        {featured.map((c) => (
          <section key={c.id} className="mb-6">
            <SectionHead title={t(c.name, lang)} action={ui(lang, "viewAll")} onAction={() => ctx.go("menu", c.id)} />
            <div className="grid gap-3">
              {c.items.slice(0, 3).map((item) => (
                <ItemCard key={item.id} {...cardProps(ctx, item, c)} />
              ))}
            </div>
          </section>
        ))}

        <SectionHead title={ui(lang, "browseAll")} />
        <div className="mb-6 flex flex-wrap gap-2.5">
          {menu.categories.map((c) => (
            <button key={c.id} onClick={() => ctx.go("menu", c.id)} className="press flex items-center gap-2 rounded-full bg-guest-surface py-1.5 pr-4 pl-1.5 shadow-[var(--shadow-sm)]">
              <span className="grid size-8 place-items-center">
                <CategoryGlyph category={c} scale={0.95} />
              </span>
              <span className="text-[12.5px] font-bold whitespace-nowrap">{t(c.name, lang)}</span>
            </button>
          ))}
        </div>

        <ServiceCard ctx={ctx} />
        <Footer lang={lang} />
      </main>
    </div>
  );
}

function Promo({ kicker, title, cta, image, roulette, onClick }: { kicker: string; title: string; cta: string; image?: string; roulette?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="press relative flex min-h-[172px] w-full items-end overflow-hidden rounded-[26px] text-left shadow-[0_10px_20px_-14px_rgba(20,22,26,0.28)]"
      style={{
        background: roulette
          ? "linear-gradient(135deg, var(--guest-cta), color-mix(in srgb, var(--guest-cta) 55%, #1a1033))"
          : "radial-gradient(120% 120% at 85% 30%, color-mix(in srgb, var(--guest-cta) 45%, #2a1a10), #15110d 70%)",
      }}
    >
      {image && <Image src={image} alt="" width={360} height={240} className="drop-3d absolute top-3 -right-8 w-[66%] rotate-[-8deg] object-contain" />}
      {roulette && (
        <span aria-hidden className="absolute top-4 right-4 flex gap-1 rounded-2xl bg-black/20 p-1.5 text-xl backdrop-blur">
          <span className="rounded-xl bg-white/90 px-1.5">🍢</span>
          <span className="rounded-xl bg-white/90 px-1.5">🍲</span>
          <span className="rounded-xl bg-white/90 px-1.5">🥟</span>
        </span>
      )}
      <span className="relative z-10 block w-full p-5 pb-[22px]">
        <span className="block text-[10.5px] font-extrabold tracking-[0.06em] text-white/85 uppercase">{kicker}</span>
        <span className={`mt-1.5 mb-3.5 block text-[19px] ${roulette ? "max-w-[78%] pt-8" : "max-w-[62%]"} leading-[1.28] font-extrabold text-white [text-shadow:0_2px_10px_rgba(0,0,0,.4)]`}>{title}</span>
        <span className="inline-flex rounded-full bg-white px-4 py-2 text-[12px] font-bold text-guest-ink">{cta}</span>
      </span>
    </button>
  );
}

function ServiceCard({ ctx }: { ctx: Ctx }) {
  const { lang } = ctx;
  return (
    <div className="mb-2 divide-y divide-guest-line overflow-hidden rounded-[18px] bg-guest-surface shadow-[var(--shadow-sm)]">
      <ActionRow icon={<BellRing className="size-5" />} title={ui(lang, "callStaff")} hint={ui(lang, "callStaffHint")} onClick={() => ctx.service("waiterCalled")} />
      {ctx.hasCoals ? (
        <ActionRow icon={<Flame className="size-5" />} title={ui(lang, "changeCoals")} hint={ui(lang, "changeCoalsHint")} onClick={() => ctx.service("coalsCalled")} tone="accent" />
      ) : (
        <ActionRow icon={<Receipt className="size-5" />} title={ui(lang, "askBill")} hint={ui(lang, "askBillHint")} onClick={() => ctx.service("billAsked")} tone="accent" />
      )}
    </div>
  );
}

function Footer({ lang }: { lang: Lang }) {
  return <p className="py-6 text-center text-[11px] font-bold tracking-wide text-guest-muted-2">{ui(lang, "poweredBy")}</p>;
}

function cardProps(ctx: Ctx, item: MenuItem, category: Category) {
  return {
    item,
    category,
    lang: ctx.lang,
    currency: ctx.currency,
    qty: ctx.qtyOf(item.id),
    onOpen: () => ctx.open(item),
    onAdd: () => ctx.quickAdd(item),
    onQty: (q: number) => ctx.setPlainQty(item, q),
  };
}

/* ---------------------------------------------------------------- Shared top bar */

function TopBar({ ctx, title, right }: { ctx: Ctx; title?: string; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 px-5 pt-[max(14px,env(safe-area-inset-top))] pb-2.5 backdrop-blur-md" style={{ background: "linear-gradient(180deg, color-mix(in srgb, var(--guest-bg) 90%, transparent), color-mix(in srgb, var(--guest-bg) 50%, transparent) 75%, transparent)" }}>
      <RoundButton label="Back" onClick={ctx.back}>
        <ArrowLeft className="size-[17px]" />
      </RoundButton>
      {title && <h1 className="pointer-events-none absolute inset-x-16 truncate text-center text-[17px] font-extrabold tracking-tight">{title}</h1>}
      <div className="ml-auto flex items-center gap-2.5">
        {ctx.table && <TableBadge label={`${ui(ctx.lang, "table")} ${ctx.table.padStart(2, "0")}`} />}
        {right}
      </div>
    </header>
  );
}

/* ---------------------------------------------------------------- Menu */

export function MenuScreen({ ctx, active, setActive, search, setSearch }: { ctx: Ctx; active: string; setActive: (id: string) => void; search: string; setSearch: (v: string) => void }) {
  const { menu, lang } = ctx;
  const category = menu.categories.find((c) => c.id === active) ?? menu.categories[0]!;
  const q = search.trim().toLowerCase();
  const results = useMemo(
    () => (q ? menu.categories.flatMap((c) => c.items.filter((i) => Object.values(i.name).some((n) => n?.toLowerCase().includes(q))).map((i) => [i, c] as const)) : []),
    [menu, q],
  );

  return (
    <div className="animate-screen">
      <TopBar
        ctx={ctx}
        right={
          <>
            <RoundButton label={ui(lang, "language")} onClick={ctx.openLang}>
              <Globe className="size-[17px]" />
            </RoundButton>
            <RoundButton label={ui(lang, "cart")} onClick={() => ctx.go("cart")} badge={ctx.lines.reduce((s, l) => s + l.qty, 0)}>
              <ShoppingBag className="size-[17px]" />
            </RoundButton>
          </>
        }
      />
      <main className="px-5">
        <div className="mt-1 mb-5 flex items-center gap-3.5">
          <span className="grid size-[60px] shrink-0 place-items-center">
            <CategoryGlyph category={category} scale={1} />
          </span>
          <div className="min-w-0">
            <h1 className="text-[27px] leading-[1.1] font-extrabold tracking-tight">{q ? `“${search.trim()}”` : t(category.name, lang)}</h1>
            <p className="mt-1 text-[12.5px] font-semibold text-guest-muted">
              {q ? results.length : category.items.length} {ui(lang, "items")}
            </p>
          </div>
        </div>
        <div className="mb-5">
          <SearchBar value={search} onChange={setSearch} lang={lang} />
        </div>
        {!q && <CategoryRail categories={menu.categories} active={category.id} lang={lang} onPick={setActive} />}

        <div key={q ? "search" : category.id} className="animate-screen grid gap-3">
          {q
            ? results.map(([item, c]) => <ItemCard key={item.id} {...cardProps(ctx, item, c)} />)
            : category.items.map((item) => <ItemCard key={item.id} {...cardProps(ctx, item, category)} />)}
          {q && !results.length && <p className="py-10 text-center text-sm font-semibold text-guest-muted">{ui(lang, "noResults")}</p>}
        </div>
        <Footer lang={lang} />
      </main>
    </div>
  );
}

/* ---------------------------------------------------------------- Detail */

export function DetailScreen({ ctx, item, onAdd }: { ctx: Ctx; item: MenuItem; onAdd: (variantId: string | undefined, optionIds: string[], qty: number) => void }) {
  const { lang, currency } = ctx;
  const category = ctx.categoryOf.get(item.id)!;
  const [variantId, setVariantId] = useState<string | undefined>(item.variants[0]?.id);
  const [optionIds, setOptionIds] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const missing = missingRequired(item, optionIds);
  const sub = secondaryName(item, lang);

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
    <div className="animate-screen flex min-h-dvh flex-col">
      <div className="relative">
        <Media item={item} category={category} iconScale={0.5} className="aspect-[1.4] w-full rounded-b-[32px] shadow-[var(--shadow-md)]" />
        <div className="absolute inset-x-5 top-[max(14px,env(safe-area-inset-top))] flex items-center justify-between">
          <RoundButton label="Back" onClick={ctx.back}>
            <ArrowLeft className="size-[17px]" />
          </RoundButton>
          {ctx.table && <TableBadge label={`${ui(lang, "table")} ${ctx.table.padStart(2, "0")}`} />}
        </div>
      </div>

      <main className="flex-1 px-5 pt-[18px]">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="min-w-0 flex-1 text-[21px] leading-tight font-extrabold tracking-tight">{t(item.name, lang)}</h1>
          <span className="shrink-0 text-[21px] font-extrabold whitespace-nowrap text-guest-cta tabular-nums">{formatMoney(unitPrice(item, variantId, optionIds), currency, lang)}</span>
        </div>
        <p className="mt-1 flex items-center gap-2 text-[12.5px] font-semibold text-guest-muted">
          {t(category.name, lang)}
          {item.status === "suggested" && <DraftTag lang={lang} />}
        </p>

        {(sub || item.tags.length > 0) && (
          <div className="my-3.5 rounded-[18px] bg-guest-surface p-4 shadow-[var(--shadow-sm)]">
            {sub && <p className="text-[13.5px] leading-relaxed text-guest-muted">{sub}</p>}
            {item.tags.length > 0 && (
              <div className={`flex flex-wrap gap-2 ${sub ? "mt-3" : ""}`}>
                {item.tags.map((tag) => (
                  <span key={tag} className="accent-soft rounded-full px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-guest-cta uppercase">
                    {tag.replace("_", " ")}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {item.variants.length > 0 && (
          <OptionBlock title={ui(lang, "required")}>
            {item.variants.map((v) => (
              <Pill key={v.id} on={v.id === variantId} onClick={() => setVariantId(v.id)} label={t(v.name, lang)} extra={formatMoney(v.price, currency, lang)} />
            ))}
          </OptionBlock>
        )}
        {item.modifierGroups.map((g) => (
          <OptionBlock key={g.id} title={t(g.name, lang)} badge={g.required ? ui(lang, "required") : undefined} warn={missing.includes(g.id)}>
            {g.options.map((o) => (
              <Pill key={o.id} on={optionIds.includes(o.id)} onClick={() => toggle(g.id, o.id)} label={t(o.name, lang)} extra={o.price ? `+${formatMoney(o.price, currency, lang)}` : undefined} />
            ))}
          </OptionBlock>
        ))}
      </main>

      <div className="sticky bottom-0 px-5 pt-3.5 pb-[max(14px,env(safe-area-inset-bottom))]" style={{ background: "linear-gradient(180deg, transparent, var(--guest-bg) 35%)" }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3.5 rounded-full bg-guest-surface p-1.5 shadow-[var(--shadow-sm)]">
            <button aria-label="Less" onClick={() => setQty((v) => Math.max(1, v - 1))} className="press grid size-[34px] place-items-center rounded-full bg-guest-surface-2 text-lg font-bold">
              −
            </button>
            <span className="min-w-4 text-center text-[14px] font-extrabold tabular-nums">{qty}</span>
            <button aria-label="More" onClick={() => setQty((v) => v + 1)} className="press grid size-[34px] place-items-center rounded-full bg-guest-surface-2 text-lg font-bold">
              +
            </button>
          </div>
          <button
            disabled={missing.length > 0}
            onClick={() => onAdd(variantId, optionIds, qty)}
            className="press flex flex-1 items-center justify-center gap-2 rounded-full bg-guest-cta py-4 text-[14.5px] font-bold text-guest-cta-ink shadow-[0_14px_28px_-14px_var(--guest-cta)] disabled:opacity-40"
          >
            <Plus className="size-4" strokeWidth={3} /> {ui(lang, "addToOrder")} · {formatMoney(unitPrice(item, variantId, optionIds) * qty, currency, lang)}
          </button>
        </div>
      </div>
    </div>
  );
}

function OptionBlock({ title, badge, warn, children }: { title: string; badge?: string; warn?: boolean; children: ReactNode }) {
  return (
    <div className="my-3.5 rounded-[18px] bg-guest-surface p-4 shadow-[var(--shadow-sm)]">
      <p className="mb-3 flex items-center gap-2 text-[11px] font-extrabold tracking-[0.05em] text-guest-muted uppercase">
        {title}
        {badge && <span className={`rounded-full px-2 py-0.5 text-[9.5px] ${warn ? "accent-soft text-guest-cta" : "bg-guest-surface-2"}`}>{badge}</span>}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Pill({ on, onClick, label, extra }: { on: boolean; onClick: () => void; label: string; extra?: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={`press rounded-full border-[1.5px] px-4 py-2.5 text-[12.5px] font-bold transition-colors ${
        on ? "accent-soft border-guest-cta text-guest-cta" : "border-transparent bg-guest-surface-2"
      }`}
    >
      {label}
      {extra && <span className={`ml-1.5 font-semibold ${on ? "text-guest-cta" : "text-guest-muted"}`}>{extra}</span>}
    </button>
  );
}

/* ---------------------------------------------------------------- Cart */

const NOTE_CHIPS: UiKey[] = ["noteNoOnion", "noteSpicy", "noteNoIce", "noteKids"];

export function CartScreen({
  ctx,
  onQty,
  onSend,
}: {
  ctx: Ctx;
  onQty: (key: string, qty: number) => void;
  onSend: (note: string) => void;
}) {
  const { lang, currency, lines } = ctx;
  const [note, setNote] = useState("");
  const total = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const count = lines.reduce((s, l) => s + l.qty, 0);

  return (
    <div className="animate-screen flex min-h-dvh flex-col">
      <TopBar ctx={ctx} title={ui(lang, "yourOrder")} />
      <main className="flex-1 px-5">
        {!lines.length ? (
          <div className="pt-6 text-center">
            <Image src="/icons3d/chef-empty.webp" alt="" width={176} height={176} className="drop-3d mx-auto size-[150px] object-contain" />
            <h2 className="mt-5 text-[19px] font-extrabold tracking-tight">{ui(lang, "emptyTitle")}</h2>
            <p className="mx-auto mt-2 max-w-[250px] text-[13.5px] leading-relaxed text-guest-muted">{ui(lang, "emptyBody")}</p>
            <button onClick={() => ctx.go("menu")} aria-label={ui(lang, "menu")} className="press relative mx-auto mt-9 grid size-[60px] place-items-center rounded-full bg-guest-cta text-white shadow-[0_16px_30px_-12px_var(--guest-cta)]">
              <span aria-hidden className="accent-soft animate-cta-pulse absolute inset-0 -z-10 rounded-full" />
              <Plus className="size-6" strokeWidth={3} />
            </button>
            <div className="mt-10 text-left">
              <SectionHead title={ui(lang, "popularPicks")} action={ui(lang, "seeAll")} onAction={() => ctx.go("menu")} />
              <div className="no-scrollbar -mx-5 flex gap-2.5 overflow-x-auto px-5 pb-2">
                {popularItems(ctx.menu).map((item) => (
                  <button key={item.id} onClick={() => ctx.open(item)} className="press flex w-[116px] shrink-0 flex-col overflow-hidden rounded-[18px] bg-guest-surface text-left shadow-[var(--shadow-sm)]">
                    <Media item={item} category={ctx.categoryOf.get(item.id)} className="aspect-square w-full" />
                    <span className="flex flex-col gap-2 px-2.5 pt-2 pb-2.5">
                      <span className="line-clamp-1 text-[11.5px] font-bold">{t(item.name, lang)}</span>
                      <span className="text-[12px] font-extrabold tabular-nums">{formatMoney(item.price, currency, lang)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="mt-1 mb-3.5 flex items-center gap-2 text-[11.5px] font-extrabold tracking-[0.06em] text-guest-muted uppercase">
              {ui(lang, "yourOrder")} <span className="accent-soft rounded-full px-2 py-0.5 text-[11px] text-guest-cta">{count}</span>
            </p>
            {lines.map((line) => {
              const item = ctx.itemById.get(line.itemId)!;
              const variant = item.variants.find((v) => v.id === line.variantId);
              const opts = item.modifierGroups.flatMap((g) => g.options).filter((o) => line.optionIds.includes(o.id));
              const extra = [variant && t(variant.name, lang), ...opts.map((o) => t(o.name, lang))].filter(Boolean).join(" · ");
              return (
                <div key={line.key} className="mb-3 flex items-start gap-3 rounded-[18px] bg-guest-surface p-3 shadow-[var(--shadow-sm)]">
                  <Media item={item} category={ctx.categoryOf.get(item.id)} iconScale={0.62} className="size-[54px] shrink-0 rounded-xl" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[14px] leading-snug font-bold">{t(item.name, lang)}</p>
                        {extra && <p className="mt-0.5 truncate text-[11px] text-guest-muted">{extra}</p>}
                      </div>
                      <button aria-label="Remove" onClick={() => onQty(line.key, 0)} className="press grid size-[26px] shrink-0 place-items-center text-guest-muted-2">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-extrabold tabular-nums">{formatMoney(line.unitPrice * line.qty, currency, lang)}</span>
                      <Stepper qty={line.qty} onChange={(q) => onQty(line.key, q)} />
                    </div>
                  </div>
                </div>
              );
            })}
            <button onClick={() => ctx.go("menu")} className="press mt-0.5 mb-7 flex w-full items-center justify-center gap-1.5 rounded-full bg-guest-surface-2 py-2.5 text-[12px] font-bold">
              <Plus className="size-3.5" strokeWidth={3} /> {ui(lang, "addMore")}
            </button>

            <p className="mb-3 text-[11.5px] font-extrabold tracking-[0.06em] text-guest-muted uppercase">{ui(lang, "noteForKitchen")}</p>
            <div className="no-scrollbar -mx-5 mb-2.5 flex gap-2 overflow-x-auto px-5 pb-0.5">
              {NOTE_CHIPS.map((k) => {
                const text = ui(lang, k);
                const on = note.includes(text);
                return (
                  <button
                    key={k}
                    onClick={() => setNote((n) => (on ? n.replace(text, "").replace(/^[,\s]+|[,\s]+$/g, "").replace(/,\s*,/g, ",") : n ? `${n}, ${text}` : text))}
                    className={`press flex shrink-0 items-center gap-1.5 rounded-full py-2 pr-3.5 pl-3 text-[12px] font-bold shadow-[var(--shadow-sm)] ${on ? "bg-guest-cta text-white" : "bg-guest-surface"}`}
                  >
                    {on ? <Check className="size-3.5" strokeWidth={3} /> : <Plus className="size-3.5 text-guest-cta" strokeWidth={3} />}
                    {text}
                  </button>
                );
              })}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={ui(lang, "notePlaceholder")}
              rows={2}
              className="w-full resize-none rounded-2xl bg-guest-surface px-4 py-3.5 text-[16px] shadow-[var(--shadow-sm)] outline-none placeholder:text-[13px] placeholder:text-guest-muted-2"
            />

            <div className="mt-6 mb-1 rounded-[18px] bg-guest-surface px-[18px] py-1.5 shadow-[var(--shadow-sm)]">
              <div className="flex items-baseline justify-between py-2">
                <span className="text-[13.5px] font-semibold text-guest-muted">{ui(lang, "subtotal")}</span>
                <span className="text-[13.5px] font-bold tabular-nums">{formatMoney(total, currency, lang)}</span>
              </div>
              <div className="mt-1.5 flex items-baseline justify-between border-t border-guest-line pt-4 pb-2.5">
                <span className="text-[15px] font-bold">{ui(lang, "total")}</span>
                <span className="text-[23px] font-extrabold tabular-nums">{formatMoney(total, currency, lang)}</span>
              </div>
            </div>
            <p className="mb-2 text-center text-[11px] text-guest-muted">{ui(lang, "serviceNote")}</p>
          </>
        )}
      </main>
      {lines.length > 0 && (
        <div className="sticky bottom-0 px-5 pt-3.5 pb-[max(14px,env(safe-area-inset-bottom))]" style={{ background: "linear-gradient(180deg, transparent, var(--guest-bg) 35%)" }}>
          <button onClick={() => onSend(note)} className="press flex w-full items-center justify-center gap-2.5 rounded-full bg-guest-cta py-[17px] text-[14.5px] font-bold text-guest-cta-ink shadow-[0_14px_28px_-14px_var(--guest-cta)]">
            <Send className="size-4" /> {ui(lang, "sendOrder")} · {formatMoney(total, currency, lang)}
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Orders */

const ETA_MIN = 15;

export function orderStage(order: PlacedOrder, now: number): { key: UiKey; pct: number; icon: typeof Send } {
  // Demo timeline (seconds); the KDS drives real status in Phase 1.
  const s = (now - order.placedAt) / 1000;
  if (s < 6) return { key: "orderSent", pct: 10, icon: Send };
  if (s < 15) return { key: "orderAccepted", pct: 30, icon: Check };
  if (s < 45) return { key: "orderCooking", pct: 30 + Math.round(((s - 15) / 30) * 60), icon: ChefHat };
  return { key: "orderReady", pct: 100, icon: Check };
}

export function OrdersScreen({ ctx, orders, now }: { ctx: Ctx; orders: PlacedOrder[]; now: number }) {
  const { lang, currency } = ctx;
  const [current, ...earlier] = [...orders].reverse();
  return (
    <div className="animate-screen">
      <TopBar ctx={ctx} title={ui(lang, "orders")} />
      <main className="px-5 pb-6">
        {!current ? (
          <div className="pt-16 text-center">
            <Image src="/icons3d/chef-empty.webp" alt="" width={176} height={176} className="drop-3d mx-auto size-[130px] object-contain" />
            <h2 className="mt-5 text-[19px] font-extrabold">{ui(lang, "noOrders")}</h2>
            <p className="mx-auto mt-2 max-w-[260px] text-[13.5px] text-guest-muted">{ui(lang, "noOrdersBody")}</p>
          </div>
        ) : (
          <>
            {(() => {
              const st = orderStage(current, now);
              const left = Math.max(0, Math.ceil(ETA_MIN - ((now - current.placedAt) / 60000) * 20));
              const Icon = st.icon;
              return (
                <div
                  className="relative mt-2 mb-6 overflow-hidden rounded-[26px] p-[22px] text-white shadow-[0_22px_40px_-18px_var(--guest-cta)]"
                  style={{ background: "linear-gradient(160deg, color-mix(in srgb, var(--guest-cta) 78%, white) 0%, var(--guest-cta) 45%, color-mix(in srgb, var(--guest-cta) 82%, black) 100%)" }}
                >
                  <div aria-hidden className="animate-glow pointer-events-none absolute -inset-x-[30%] -top-1/4 h-[150%]" style={{ background: "radial-gradient(42% 42% at 50% 50%, rgba(255,255,255,.22), transparent 70%)" }} />
                  <div className="relative flex items-center gap-2.5">
                    <span className="grid size-7 place-items-center rounded-full bg-white/20">
                      <Icon className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 text-[16px] font-extrabold">{ui(lang, st.key)}</span>
                    <span className="rounded-full border border-white/35 bg-white/10 px-2.5 py-1 text-[10px] font-extrabold">#{String(current.id).padStart(3, "0")}</span>
                  </div>
                  <div className="relative mt-4">
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="text-[10px] font-extrabold tracking-[0.05em] uppercase opacity-70">{ui(lang, "estimated")}</span>
                      <span className="text-[24px] leading-none font-extrabold tabular-nums">
                        {st.pct >= 100 ? "✓" : `${left} ${ui(lang, "min")}`}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
                      <div
                        className="h-full rounded-full transition-[width] duration-1000"
                        style={{ width: `${st.pct}%`, background: st.pct >= 100 ? "linear-gradient(90deg,#9befc4,#17a768)" : "linear-gradient(90deg,#dce8ff,#fff)", boxShadow: "0 0 14px rgba(255,255,255,.6)" }}
                      />
                    </div>
                  </div>
                  <div className="relative mt-4 flex items-center justify-between gap-3">
                    <div className="flex items-center">
                      {current.lines.slice(0, 4).map((l, i) => {
                        const item = ctx.itemById.get(l.itemId)!;
                        return (
                          <span key={l.key} className="size-11 overflow-hidden rounded-full border-2 border-white/55 bg-white/20" style={{ marginLeft: i ? -10 : 0 }}>
                            <Media item={item} category={ctx.categoryOf.get(item.id)} iconScale={0.6} className="size-full !bg-white/90" />
                          </span>
                        );
                      })}
                    </div>
                    <button onClick={() => ctx.go("menu")} className="press flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-3 text-[12.5px] font-extrabold text-guest-cta">
                      <Plus className="size-3.5" strokeWidth={3} /> {ui(lang, "orderMore")}
                    </button>
                  </div>
                </div>
              );
            })()}
            <ReceiptList ctx={ctx} order={current} />
            {earlier.length > 0 && <p className="mt-6 mb-3 text-[11.5px] font-extrabold tracking-[0.06em] text-guest-muted uppercase">{ui(lang, "history")}</p>}
            {earlier.map((o) => (
              <div key={o.id} className="mb-3 rounded-[18px] bg-guest-surface p-4 shadow-[var(--shadow-sm)]">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-extrabold">#{String(o.id).padStart(3, "0")}</span>
                  <span className="text-[14px] font-extrabold tabular-nums">{formatMoney(o.total, currency, lang)}</span>
                </div>
                <p className="mt-2 truncate border-t border-guest-line pt-2 text-[12.5px] text-guest-muted">
                  {o.lines.map((l) => `${l.qty}× ${t(ctx.itemById.get(l.itemId)!.name, lang)}`).join(", ")}
                </p>
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}

function ReceiptList({ ctx, order }: { ctx: Ctx; order: PlacedOrder }) {
  const { lang, currency } = ctx;
  return (
    <div className="overflow-hidden rounded-[18px] bg-guest-surface shadow-[var(--shadow-sm)]">
      {order.lines.map((l) => {
        const item = ctx.itemById.get(l.itemId)!;
        return (
          <div key={l.key} className="flex items-center gap-3 border-t border-guest-line px-4 py-3 first:border-t-0">
            <span className="accent-soft w-6 shrink-0 rounded-full py-1 text-center text-[13px] font-extrabold text-guest-cta">{l.qty}</span>
            <span className="min-w-0 flex-1 truncate text-[13.5px] font-bold">{t(item.name, lang)}</span>
            <span className="text-[13px] font-bold tabular-nums">{formatMoney(l.unitPrice * l.qty, currency, lang)}</span>
          </div>
        );
      })}
      {order.note && <p className="border-t border-guest-line px-4 py-3 text-[12px] text-guest-muted">📝 {order.note}</p>}
      <div className="flex items-baseline justify-between border-t border-guest-line px-4 py-3.5">
        <span className="text-[13px] font-semibold text-guest-muted">{ui(lang, "total")}</span>
        <span className="text-[18px] font-extrabold tabular-nums">{formatMoney(order.total, currency, lang)}</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- About */

export function AboutScreen({ ctx }: { ctx: Ctx }) {
  const { menu, brand, lang } = ctx;
  const heroItem = brand.promos.map((p) => p.itemId && ctx.itemById.get(p.itemId)).find(Boolean) || undefined;
  return (
    <div className="animate-screen">
      <TopBar ctx={ctx} title={ui(lang, "about")} />
      <main className="px-5 pb-6">
        <div
          className="relative mb-6 aspect-[1.05] w-full overflow-hidden rounded-[26px] shadow-[var(--shadow-md)]"
          style={{ background: "radial-gradient(120% 110% at 80% 20%, color-mix(in srgb, var(--guest-cta) 55%, #2a1a10), #15110d 72%)" }}
        >
          {heroItem && heroItem.photo && <Image src={heroItem.photo} alt="" width={420} height={300} className="drop-3d absolute top-[8%] left-1/2 w-[86%] -translate-x-1/2 object-contain" />}
          {!heroItem && <span className="absolute top-[12%] left-1/2 -translate-x-1/2 text-[120px] leading-none font-extrabold text-white/15">{brand.mark}</span>}
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, transparent 40%, rgba(8,10,18,.55) 76%, rgba(8,10,18,.9))" }} />
          <div className="absolute inset-x-[22px] bottom-[22px] text-white">
            <p className="text-[11px] font-extrabold tracking-[0.08em] text-white/75 uppercase">{menu.venue.city}</p>
            <p className="mt-1.5 text-[27px] font-extrabold tracking-tight">{menu.venue.name}</p>
            <p className="mt-1 text-[13.5px] font-semibold text-white/80">{brand.headline[lang as "en"] ?? brand.headline.en}</p>
          </div>
        </div>
        <p className="mb-6 border-l-[3px] border-guest-cta pl-4 text-[14px] leading-[1.68]">{brand.about.bio}</p>
        <SectionHead title={ui(lang, "visit")} />
        <div className="rounded-[18px] bg-guest-surface p-4 shadow-[var(--shadow-sm)]">
          <p className="mb-3 flex items-center gap-1.5 text-[12px] font-extrabold text-guest-green">
            <span className="size-[7px] rounded-full bg-guest-green shadow-[0_0_0_3px_rgba(23,167,104,.12)]" /> {ui(lang, "openNow")}
          </p>
          <InfoRow icon={<MapPin className="size-4" />} label={ui(lang, "address")} value={brand.about.address} />
          <InfoRow icon={<Clock className="size-4" />} label={ui(lang, "hours")} value={brand.about.hours} />
        </div>
        <Footer lang={lang} />
      </main>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border-t border-guest-line py-3 first:border-t-0">
      <span className="accent-soft grid size-9 shrink-0 place-items-center rounded-full text-guest-cta">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold tracking-[0.05em] text-guest-muted uppercase">{label}</p>
        <p className="text-[13.5px] font-bold">{value}</p>
      </div>
    </div>
  );
}

