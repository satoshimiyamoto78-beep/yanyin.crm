"use client";

import { formatMoney, t, type Category, type Currency, type Lang, type MenuItem } from "@yanyin/domain";
import { ChevronRight, Minus, Plus, Search, SlidersHorizontal } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { ui } from "@/lib/ui-strings";
import { categoryIcon } from "@/lib/visual";

/** Dish image: the real cut-out photo, or a dotted tile with the category icon. */
export function Media({
  item,
  category,
  className = "",
  iconScale = 0.56,
}: {
  item: MenuItem;
  category?: Category;
  className?: string;
  iconScale?: number;
}) {
  if (item.photo) {
    return (
      <div className={`relative grid place-items-center overflow-hidden bg-guest-surface-2 ${className}`}>
        <Image src={item.photo} alt="" width={320} height={220} className="drop-3d h-[86%] w-[92%] object-contain" />
      </div>
    );
  }
  return (
    <div className={`media-dots relative grid place-items-center overflow-hidden ${className}`}>
      {category && <CategoryGlyph category={category} scale={iconScale} />}
    </div>
  );
}

export function CategoryGlyph({ category, scale = 1 }: { category: Category; scale?: number }) {
  const icon = categoryIcon(category);
  const pct = `${Math.round(scale * 100)}%`;
  if (icon.kind === "img") {
    return <Image src={icon.src} alt="" width={96} height={96} className="drop-3d object-contain" style={{ width: pct, height: pct }} />;
  }
  return (
    <span className="drop-3d leading-none" style={{ fontSize: `calc(${scale} * 48px)` }}>
      {icon.char}
    </span>
  );
}

export function Stepper({ qty, onChange, dark }: { qty: number; onChange: (qty: number) => void; dark?: boolean }) {
  return (
    <div className={`animate-pop flex items-center gap-2 rounded-full px-1.5 py-1 ${dark ? "bg-guest-ink text-white" : "bg-guest-surface-2"}`}>
      <button aria-label="Less" onClick={() => onChange(qty - 1)} className="press grid size-6 place-items-center rounded-full">
        <Minus className="size-3.5" strokeWidth={3} />
      </button>
      <span className="min-w-3 text-center text-[13px] font-extrabold tabular-nums">{qty}</span>
      <button aria-label="More" onClick={() => onChange(qty + 1)} className="press grid size-6 place-items-center rounded-full">
        <Plus className="size-3.5" strokeWidth={3} />
      </button>
    </div>
  );
}

export function AddCircle({ label, onClick, size = 30 }: { label: string; onClick: () => void; size?: number }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="press grid shrink-0 place-items-center rounded-full bg-guest-cta text-guest-cta-ink"
      style={{ width: size, height: size }}
    >
      <Plus className="size-4" strokeWidth={3} />
    </button>
  );
}

/** Horizontal item card (image left), as in the guest-order design. */
export function ItemCard({
  item,
  category,
  lang,
  currency,
  qty,
  onOpen,
  onAdd,
  onQty,
}: {
  item: MenuItem;
  category: Category;
  lang: Lang;
  currency: Currency;
  qty: number;
  onOpen: () => void;
  onAdd: () => void;
  onQty: (qty: number) => void;
}) {
  const sub = secondaryName(item, lang);
  const needsChoice = item.variants.length > 0 || item.modifierGroups.some((g) => g.required);
  return (
    <div className="press relative flex gap-3.5 rounded-[18px] bg-guest-surface p-2.5 shadow-[var(--shadow-sm)]">
      <button onClick={onOpen} aria-label={t(item.name, lang)} className="shrink-0">
        <Media item={item} category={category} className="size-[92px] rounded-[14px]" />
      </button>
      <div className="flex min-w-0 flex-1 flex-col py-0.5 pr-1">
        <button onClick={onOpen} className="text-left">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-[13.5px] leading-snug font-bold">{t(item.name, lang)}</p>
            {item.status === "suggested" && <DraftTag lang={lang} />}
          </div>
          {sub && <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-guest-muted">{sub}</p>}
        </button>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-[15px] font-extrabold tabular-nums">
            {item.variants.length > 1 && <span className="mr-1 text-[11px] font-semibold text-guest-muted">{ui(lang, "from")}</span>}
            {formatMoney(item.price, currency, lang)}
          </span>
          {qty > 0 && !needsChoice ? (
            <Stepper qty={qty} onChange={onQty} dark />
          ) : (
            <AddCircle label={`${ui(lang, "add")} ${t(item.name, lang)}`} onClick={needsChoice ? onOpen : onAdd} />
          )}
        </div>
      </div>
    </div>
  );
}

export function secondaryName(item: MenuItem, lang: Lang): string | undefined {
  const main = t(item.name, lang);
  const alts = (["en", "vi", "ru"] as const).filter((l) => l !== lang).map((l) => item.name[l]).filter((n): n is string => Boolean(n) && n !== main);
  return alts.length ? alts.join(" · ") : undefined;
}

export function DraftTag({ lang }: { lang: Lang }) {
  return (
    <span
      title="Suggested by yanyin, waiting for the venue to confirm"
      className="shrink-0 rounded-full border border-dashed border-guest-muted-2 px-1.5 py-px text-[9px] font-bold tracking-wide text-guest-muted uppercase"
    >
      {ui(lang, "draft")}
    </span>
  );
}

export function SearchBar({ value, onChange, lang, onFilter }: { value: string; onChange: (v: string) => void; lang: Lang; onFilter?: () => void }) {
  return (
    <label className="flex items-center gap-2 rounded-full bg-guest-surface py-1 pr-1 pl-4 text-guest-muted shadow-[var(--shadow-sm)]">
      <Search className="size-[18px] shrink-0" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={ui(lang, "search")}
        className="min-w-0 flex-1 bg-transparent py-2 text-[16px] font-medium text-guest-ink outline-none placeholder:text-guest-muted"
      />
      {onFilter && (
        <button onClick={onFilter} aria-label="Filters" className="press grid size-[34px] shrink-0 place-items-center rounded-full bg-guest-cta text-guest-cta-ink">
          <SlidersHorizontal className="size-[14px]" strokeWidth={2.5} />
        </button>
      )}
    </label>
  );
}

export function CategoryRail({
  categories,
  active,
  lang,
  onPick,
}: {
  categories: Category[];
  active?: string;
  lang: Lang;
  onPick: (id: string) => void;
}) {
  return (
    <div className="no-scrollbar mask-fade-r -mx-5 flex gap-[17px] overflow-x-auto px-5 pt-1.5 pb-5">
      {categories.map((c) => {
        const on = c.id === active;
        return (
          <button key={c.id} id={`rail-${c.id}`} onClick={() => onPick(c.id)} className="press flex w-[58px] shrink-0 flex-col items-center gap-2">
            <span className={`grid size-[44px] place-items-center transition-transform duration-200 ${on ? "-translate-y-0.5 scale-110" : ""}`}>
              <CategoryGlyph category={c} scale={1} />
            </span>
            <span className={`relative line-clamp-1 max-w-full pb-0.5 text-[11px] font-bold ${on ? "text-guest-ink" : "text-guest-muted"}`}>
              {t(c.name, lang)}
              {on && <span className="animate-underline absolute inset-x-0 -bottom-1 h-[2.5px] rounded-full bg-guest-cta" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="mb-3.5 flex items-center justify-between">
      <h2 className="text-[17px] font-extrabold tracking-tight">{title}</h2>
      {action && onAction && (
        <button onClick={onAction} className="press flex items-center gap-1.5 text-[13px] font-extrabold text-guest-cta">
          {action}
          <span className="accent-soft grid size-5 place-items-center rounded-full">
            <ChevronRight className="size-3.5" strokeWidth={3} />
          </span>
        </button>
      )}
    </div>
  );
}

export function RoundButton({ label, onClick, children, badge }: { label: string; onClick: () => void; children: ReactNode; badge?: number }) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="press relative grid size-8 shrink-0 place-items-center rounded-full bg-guest-surface text-guest-ink shadow-[var(--shadow-sm)]"
    >
      {children}
      {badge ? (
        <span className="absolute -top-1.5 -right-1.5 grid h-4 min-w-4 place-items-center rounded-full border-2 border-guest-bg bg-guest-cta px-1 text-[9px] font-extrabold text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export function TableBadge({ label, onDark }: { label: string; onDark?: boolean }) {
  return (
    <span
      className={`flex shrink-0 items-center gap-1.5 rounded-full py-1.5 pr-3 pl-2.5 text-[10px] font-extrabold tracking-wide uppercase ${
        onDark ? "bg-white/25 text-white backdrop-blur" : "bg-guest-surface text-guest-ink shadow-[var(--shadow-sm)]"
      }`}
    >
      <span className={`size-[5px] rounded-full ${onDark ? "bg-white" : "bg-guest-cta"}`} />
      {label}
    </span>
  );
}

export function ActionRow({ icon, title, hint, onClick, tone = "amber" }: { icon: ReactNode; title: string; hint: string; onClick: () => void; tone?: "amber" | "accent" }) {
  return (
    <button onClick={onClick} className="press flex w-full items-center gap-3 px-4 py-3.5 text-left">
      <span
        className={`grid size-[42px] shrink-0 place-items-center rounded-full ${tone === "amber" ? "text-guest-amber" : "accent-soft text-guest-cta"}`}
        style={tone === "amber" ? { background: "rgba(240,164,38,.14)" } : undefined}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-bold">{title}</span>
        <span className="block truncate text-[11.5px] text-guest-muted">{hint}</span>
      </span>
      <span className="grid size-[26px] place-items-center rounded-full bg-guest-surface-2 text-guest-muted">
        <ChevronRight className="size-4" />
      </span>
    </button>
  );
}
