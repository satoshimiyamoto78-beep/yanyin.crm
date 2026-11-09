"use client";

import { formatMoney, t, type CategoryRole, type Currency, type Lang, type MenuItem } from "@yanyin/domain";
import {
  Beer,
  CakeSlice,
  CircleDashed,
  Coffee,
  CookingPot,
  Croissant,
  CupSoda,
  Flame,
  Leaf,
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
    else if (/spritz|negroni|mojito|margarita|sour|martini|tai|iced tea|libre|tonic|bull|shot|b-52|boom/i.test(name)) Icon = Martini;
  }
  return <Icon size={size} strokeWidth={1.75} />;
}

/* ---------------------------------------------------------------- Chips */

export type ChipTone = "blue" | "green" | "orange" | "purple" | "gray";

export function Chip({ tone = "gray", icon, children }: { tone?: ChipTone; icon?: ReactNode; children: ReactNode }) {
  return (
    <span className={`chip-${tone} inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold whitespace-nowrap`}>
      {icon}
      {children}
    </span>
  );
}

export function ItemChips({ item, lang }: { item: MenuItem; lang: Lang }) {
  const veg = item.tags.includes("vegan") || item.tags.includes("vegetarian");
  const spicy = /tom yum|spicy|chili|smashed cucumber/i.test(item.name.en ?? "");
  if (!veg && !spicy && item.status !== "suggested") return null;
  return (
    <span className="flex flex-wrap gap-1.5">
      {veg && (
        <Chip tone="green" icon={<Leaf size={12} strokeWidth={2.25} />}>
          {item.tags.includes("vegan") ? "Vegan" : "Veggie"}
        </Chip>
      )}
      {spicy && (
        <Chip tone="orange" icon={<Flame size={12} strokeWidth={2.25} />}>
          Spicy
        </Chip>
      )}
      {item.status === "suggested" && (
        <Chip tone="gray" icon={<CircleDashed size={12} strokeWidth={2.25} />}>
          {ui(lang, "draft")}
        </Chip>
      )}
    </span>
  );
}

/* ---------------------------------------------------------------- Dish image */

/**
 * Dish visual: the real cut-out photo on a soft studio gradient, or an
 * Iconly-style glyph (blue line icon in a glowing white disc). Never empty.
 */
export function DishTile({ item, role, className = "", photoScale = 0.88, glyph = 0.42 }: { item: MenuItem; role: CategoryRole; className?: string; photoScale?: number; glyph?: number }) {
  return (
    <div className={`hero-grad relative grid place-items-center overflow-hidden ${className}`}>
      {item.photo ? (
        <Image src={item.photo} alt="" width={360} height={240} className="dish-shadow h-auto object-contain" style={{ width: `${photoScale * 100}%` }} />
      ) : (
        <span
          className="grid aspect-square place-items-center rounded-full bg-white text-g-blue shadow-[0_10px_24px_-10px_rgba(47,91,255,0.55),inset_0_-2px_6px_rgba(47,91,255,0.08)]"
          style={{ width: `${glyph * 100}%` }}
        >
          <RoleIcon role={role} name={item.name.en} size={22} />
        </span>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Buttons */

export function Stepper({ qty, onChange, className = "" }: { qty: number; onChange: (q: number) => void; className?: string }) {
  return (
    <div className={`animate-pop flex h-10 items-center justify-between rounded-full bg-g-ink px-1 text-white ${className}`}>
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

export function RoundButton({ label, onClick, children, dot }: { label: string; onClick: () => void; children: ReactNode; dot?: boolean }) {
  return (
    <button aria-label={label} title={label} onClick={onClick} className="card press relative grid size-11 shrink-0 place-items-center rounded-full text-g-ink">
      {children}
      {dot && <span className="absolute top-2 right-2 size-2.5 rounded-full border-2 border-white bg-g-blue" />}
    </button>
  );
}

/* ---------------------------------------------------------------- Item card */

export function altName(item: MenuItem, lang: Lang): string | undefined {
  const main = t(item.name, lang);
  const alt = lang === "en" ? item.name.vi ?? item.name.ru : item.name.en;
  return alt && alt !== main ? alt : undefined;
}

export function describe(item: MenuItem, lang: Lang): string | undefined {
  return item.description ? t(item.description, lang) : altName(item, lang);
}

const needsChoice = (item: MenuItem) => item.variants.length > 0 || item.modifierGroups.some((g) => g.required);

/**
 * The one dish card used everywhere: image, name, short description, chips and
 * an identical price control, so every row lines up.
 */
export function ItemCard({
  item,
  role,
  lang,
  currency,
  qty,
  onOpen,
  onAdd,
  onQty,
}: {
  item: MenuItem;
  role: CategoryRole;
  lang: Lang;
  currency: Currency;
  qty: number;
  onOpen: () => void;
  onAdd: () => void;
  onQty: (q: number) => void;
}) {
  const plain = !needsChoice(item);
  const desc = describe(item, lang);
  return (
    <div className="card flex gap-4 rounded-[26px] p-2.5">
      <button onClick={onOpen} aria-label={t(item.name, lang)} className="press shrink-0">
        <DishTile item={item} role={role} className="size-[112px] rounded-[20px]" />
      </button>
      <div className="flex min-w-0 flex-1 flex-col py-1.5 pr-1.5">
        <button onClick={onOpen} className="text-left">
          <span className="line-clamp-2 text-[16px] leading-[1.25] font-semibold tracking-[-0.01em]">{t(item.name, lang)}</span>
          {desc && <span className="mt-1 line-clamp-2 text-[13px] leading-[1.35] text-g-muted">{desc}</span>}
        </button>
        <span className="mt-2 empty:hidden">
          <ItemChips item={item} lang={lang} />
        </span>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="min-w-0 truncate text-[17px] font-semibold tracking-[-0.01em] tabular-nums">
            {item.variants.length > 1 && <span className="mr-1 text-[13px] font-medium text-g-muted">{ui(lang, "from")}</span>}
            {formatMoney(item.price, currency, lang)}
          </span>
          {qty > 0 && plain ? (
            <Stepper qty={qty} onChange={onQty} className="w-[104px] shrink-0" />
          ) : (
            <button
              onClick={plain ? onAdd : onOpen}
              aria-label={`${ui(lang, "add")} ${t(item.name, lang)}`}
              className="blue-grad press grid size-10 shrink-0 place-items-center rounded-full"
            >
              <Plus size={20} strokeWidth={2.25} />
            </button>
          )}
        </div>
      </div>
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
      <button aria-label={label} tabIndex={-1} className="animate-fade absolute inset-0 bg-[rgba(11,11,15,0.42)] backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`animate-sheet relative flex w-full max-w-[480px] flex-col overflow-hidden rounded-t-[32px] bg-white text-g-ink shadow-[0_-12px_48px_-12px_rgba(11,11,15,0.3)] ${full ? "h-[94dvh]" : "max-h-[92dvh]"}`}
      >
        <span aria-hidden className="absolute top-2 left-1/2 z-10 h-1 w-9 -translate-x-1/2 rounded-full bg-g-fill-2" />
        <button onClick={onClose} aria-label="Close" className="card press absolute top-4 right-4 z-10 grid size-9 place-items-center rounded-full">
          <X size={18} strokeWidth={2} />
        </button>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className="border-t border-g-line bg-white px-5 pt-3 pb-[max(14px,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}
