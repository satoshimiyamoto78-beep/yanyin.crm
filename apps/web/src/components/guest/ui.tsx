"use client";

import { formatMoney, t, type CategoryRole, type Currency, type Lang, type MenuItem } from "@yanyin/domain";
import {
  Beer,
  CakeSlice,
  Coffee,
  CookingPot,
  Croissant,
  CupSoda,
  Flame,
  Martini,
  Minus,
  Plus,
  Popcorn,
  Salad,
  Soup,
  UtensilsCrossed,
  Wheat,
  Wine,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { useEffect, type ReactNode, type SVGProps } from "react";
import { ui } from "@/lib/ui-strings";

/* ---------------------------------------------------------------- Icons */

/** Hookah in the Lucide line style (Lucide has none). */
export function HookahIcon({ size = 24, strokeWidth = 1.75, ...rest }: SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...rest}>
      <path d="M10 2h4M11 2v3h2V2M9.5 5h5l-1 3h-3z" />
      <path d="M12 8v6" />
      <path d="M8.5 22h7a3.5 3.5 0 0 0 1-6.85V14h-9.5v1.15A3.5 3.5 0 0 0 8.5 22Z" />
      <path d="M17 15c2 0 3.5 1 3.5 3v2" />
    </svg>
  );
}

const ROLE_ICON: Record<CategoryRole, LucideIcon | typeof HookahIcon> = {
  soup: Soup,
  salad: Salad,
  starter: Salad,
  main: UtensilsCrossed,
  grill: Flame,
  side: Wheat,
  pasta: CookingPot,
  pastry: Croissant,
  dessert: CakeSlice,
  drink: CupSoda,
  hot_drink: Coffee,
  alcohol: Wine,
  hookah: HookahIcon,
  snack: Popcorn,
};

export function RoleIcon({ role, name, size = 22 }: { role: CategoryRole; name?: string; size?: number }) {
  let Icon = ROLE_ICON[role];
  if (role === "alcohol" && name) {
    if (/beer|cider|corona|heineken|saigon|tiger|larue|1664/i.test(name)) Icon = Beer;
    else if (/cocktail|spritz|negroni|mojito|margarita|sour|martini|tai|tea|libre|tonic|bull|shot|b-52|boom/i.test(name)) Icon = Martini;
  }
  return <Icon size={size} strokeWidth={1.75} />;
}

/* ---------------------------------------------------------------- Dish image */

/** Square dish tile: the real cut-out photo on the neutral fill, or a quiet line icon. */
export function DishTile({ item, role, className = "", iconSize = 26, photoScale = 0.86 }: { item: MenuItem; role: CategoryRole; className?: string; iconSize?: number; photoScale?: number }) {
  return (
    <div className={`relative grid place-items-center overflow-hidden bg-g-fill text-g-faint ${className}`}>
      {item.photo ? (
        <Image src={item.photo} alt="" width={360} height={240} className="dish-shadow h-auto object-contain" style={{ width: `${photoScale * 100}%` }} />
      ) : (
        <RoleIcon role={role} name={item.name.en} size={iconSize} />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Buttons */

export function Stepper({ qty, onChange, size = "md" }: { qty: number; onChange: (q: number) => void; size?: "sm" | "md" }) {
  const h = size === "sm" ? "h-9" : "h-10";
  return (
    <div className={`animate-pop flex ${h} items-center justify-between rounded-full bg-g-ink px-1 text-white`}>
      <button aria-label="Remove one" onClick={() => onChange(qty - 1)} className="press grid size-8 place-items-center rounded-full">
        <Minus size={16} strokeWidth={2.25} />
      </button>
      <span className="min-w-6 text-center text-[15px] font-semibold tabular-nums">{qty}</span>
      <button aria-label="Add one" onClick={() => onChange(qty + 1)} className="press grid size-8 place-items-center rounded-full">
        <Plus size={16} strokeWidth={2.25} />
      </button>
    </div>
  );
}

export function IconButton({ label, onClick, children, dot }: { label: string; onClick: () => void; children: ReactNode; dot?: boolean }) {
  return (
    <button aria-label={label} title={label} onClick={onClick} className="press relative grid size-10 shrink-0 place-items-center rounded-full bg-g-fill text-g-ink">
      {children}
      {dot && <span className="absolute top-1.5 right-1.5 size-2.5 rounded-full border-2 border-g-fill bg-g-blue" />}
    </button>
  );
}

export function DraftMark({ lang }: { lang: Lang }) {
  return (
    <span title="Suggested by yanyin, waiting for the venue to confirm" className="inline-flex items-center gap-1 text-[11px] font-medium text-g-faint">
      <span className="size-1 rounded-full bg-g-faint" />
      {ui(lang, "draft")}
    </span>
  );
}

/* ---------------------------------------------------------------- Item views */

export function altName(item: MenuItem, lang: Lang): string | undefined {
  const main = t(item.name, lang);
  const alt = lang === "en" ? item.name.vi ?? item.name.ru : item.name.en;
  return alt && alt !== main ? alt : undefined;
}

type ItemProps = {
  item: MenuItem;
  role: CategoryRole;
  lang: Lang;
  currency: Currency;
  qty: number;
  onOpen: () => void;
  onAdd: () => void;
  onQty: (q: number) => void;
};

const needsChoice = (item: MenuItem) => item.variants.length > 0 || item.modifierGroups.some((g) => g.required);

/** Grid card for dishes with photos (Yandex Eda / Dodo pattern: image, name, price button). */
export function ProductCard({ item, role, lang, currency, qty, onOpen, onAdd, onQty }: ItemProps) {
  const plain = !needsChoice(item);
  return (
    <div className="flex flex-col">
      <button onClick={onOpen} className="press block text-left" aria-label={t(item.name, lang)}>
        <DishTile item={item} role={role} className="aspect-square w-full rounded-[24px]" />
      </button>
      <button onClick={onOpen} className="mt-3 flex flex-1 flex-col px-0.5 text-left">
        <span className="line-clamp-2 text-[15px] leading-[1.3] font-medium text-g-ink">{t(item.name, lang)}</span>
        {item.status === "suggested" && <span className="mt-1"><DraftMark lang={lang} /></span>}
      </button>
      <div className="mt-3">
        {qty > 0 && plain ? (
          <Stepper qty={qty} onChange={onQty} />
        ) : (
          <button
            onClick={plain ? onAdd : onOpen}
            className="press flex h-10 w-full items-center justify-between rounded-full bg-g-fill pr-1.5 pl-4 text-[15px] font-semibold tabular-nums"
          >
            {item.variants.length > 1 && <span className="mr-1 font-normal text-g-muted">{ui(lang, "from")}</span>}
            <span className="mr-auto">{formatMoney(item.price, currency, lang)}</span>
            <span className="grid size-7 place-items-center rounded-full bg-white text-g-ink">
              <Plus size={16} strokeWidth={2.25} />
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

/** Row for dishes and drinks without photos: a clean printed-menu line. */
export function ItemRow({ item, lang, currency, qty, onOpen, onAdd, onQty }: ItemProps) {
  const plain = !needsChoice(item);
  const alt = altName(item, lang);
  const sizes = item.variants.length > 1 ? item.variants.map((v) => t(v.name, lang)).join(" · ") : undefined;
  return (
    <div className="flex min-h-[72px] items-center gap-4 border-b border-g-line py-3.5 last:border-b-0">
      <button onClick={onOpen} className="min-w-0 flex-1 text-left">
        <span className="block text-[16px] leading-snug font-medium text-g-ink">{t(item.name, lang)}</span>
        {(alt || sizes || item.status === "suggested") && (
          <span className="mt-1 flex min-w-0 items-center gap-2 text-[13px] text-g-muted">
            {(sizes ?? alt) && <span className="truncate">{sizes ?? alt}</span>}
            {item.status === "suggested" && <DraftMark lang={lang} />}
          </span>
        )}
      </button>
      {qty > 0 && plain ? (
        <div className="w-[112px] shrink-0">
          <Stepper qty={qty} onChange={onQty} size="sm" />
        </div>
      ) : (
        <button onClick={plain ? onAdd : onOpen} className="press flex h-9 shrink-0 items-center gap-2 rounded-full bg-g-fill pr-1 pl-3.5 text-[15px] font-semibold tabular-nums">
          {item.variants.length > 1 && <span className="-mr-1 font-normal text-g-muted">{ui(lang, "from")}</span>}
          {formatMoney(item.price, currency, lang)}
          <span className="grid size-7 place-items-center rounded-full bg-white">
            <Plus size={15} strokeWidth={2.25} />
          </span>
        </button>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Sheet */

export function Sheet({ open, onClose, children, footer, label, full }: { open: boolean; onClose: () => void; children: ReactNode; footer?: ReactNode; label: string; full?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button aria-label={label} tabIndex={-1} className="animate-fade absolute inset-0 bg-[rgba(11,11,15,0.42)]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`animate-sheet relative flex w-full max-w-[480px] flex-col overflow-hidden rounded-t-[32px] bg-white text-g-ink shadow-[0_-12px_48px_-12px_rgba(11,11,15,0.3)] ${full ? "h-[94dvh]" : "max-h-[92dvh]"}`}
      >
        <span aria-hidden className="absolute top-2 left-1/2 z-10 h-1 w-9 -translate-x-1/2 rounded-full bg-g-fill-2" />
        <button onClick={onClose} aria-label="Close" className="press absolute top-4 right-4 z-10 grid size-9 place-items-center rounded-full bg-g-fill/90 backdrop-blur">
          <X size={18} strokeWidth={2} />
        </button>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className="border-t border-g-line bg-white px-5 pt-3 pb-[max(14px,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}
