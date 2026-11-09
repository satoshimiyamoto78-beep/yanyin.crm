"use client";

import { formatMoney, t, type CategoryRole, type Currency, type Lang, type MenuItem } from "@yanyin/domain";
import {
  Beer,
  Check,
  ChevronLeft,
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
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, type ReactNode, type SVGProps } from "react";
import { haptic } from "@/lib/haptics";
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

/** Halal mark: crescent and star in the Lucide line style. */
export function HalalIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15.5 4.6A8 8 0 1 0 15.5 19.4 6.6 6.6 0 0 1 15.5 4.6Z" />
      <path d="m18 8.5.7 1.7 1.8.1-1.4 1.1.5 1.8-1.6-1-1.6 1 .5-1.8-1.4-1.1 1.8-.1Z" />
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

export type ChipTone = "blue" | "green" | "orange" | "purple" | "gray" | "teal";

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
  const halal = item.tags.includes("halal");
  if (!veg && !spicy && !halal && item.status !== "suggested") return null;
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
      {halal && (
        <Chip tone="teal" icon={<HalalIcon size={13} />}>
          Halal
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
          className="grid aspect-square place-items-center rounded-full bg-white text-g-blue"
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
  const veg = item.tags.includes("vegan") || item.tags.includes("vegetarian");
  const spicy = /tom yum|spicy|chili|smashed cucumber/i.test(item.name.en ?? "");
  const halal = item.tags.includes("halal");
  return (
    <div className="flex h-[148px] items-center gap-4">
      <button onClick={onOpen} aria-label={t(item.name, lang)} className="press relative shrink-0">
        <DishTile item={item} role={role} className="live size-[116px] rounded-[24px]" />
        {(veg || spicy || halal || item.status === "suggested") && (
          <span className="absolute top-2 left-2 flex gap-1">
            {veg && (
              <span title="Veggie" className="chip-green grid size-6 place-items-center rounded-full">
                <Leaf size={13} strokeWidth={2.25} />
              </span>
            )}
            {spicy && (
              <span title="Spicy" className="chip-orange grid size-6 place-items-center rounded-full">
                <Flame size={13} strokeWidth={2.25} />
              </span>
            )}
            {halal && (
              <span title="Halal" className="chip-teal grid size-6 place-items-center rounded-full">
                <HalalIcon size={14} />
              </span>
            )}
            {item.status === "suggested" && <span className="flex h-6 items-center rounded-full bg-white px-2 text-[11px] font-semibold text-g-muted">{ui(lang, "draft")}</span>}
          </span>
        )}
      </button>
      {/* Fixed rhythm: one-line name, two-line description slot, price row. Every row is the same height. */}
      <div className="flex h-[116px] min-w-0 flex-1 flex-col">
        <button onClick={onOpen} className="min-w-0 text-left">
          <span className="live block truncate text-[16px] leading-[1.25] font-semibold tracking-[-0.01em]">{t(item.name, lang)}</span>
          <span className="live mt-1 line-clamp-2 h-[35px] text-[13px] leading-[1.35] text-g-muted">{desc}</span>
        </button>
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="live min-w-0 truncate text-[17px] font-semibold tracking-[-0.01em] tabular-nums">
            {item.variants.length > 1 && <span className="mr-1 text-[13px] font-medium text-g-muted">{ui(lang, "from")}</span>}
            {formatMoney(item.price, currency, lang)}
          </span>
          {qty > 0 && plain ? (
            <Stepper
              qty={qty}
              onChange={(q) => {
                haptic("light");
                onQty(q);
              }}
              className="w-[104px] shrink-0"
            />
          ) : (
            <button
              onClick={() => {
                haptic(plain ? "success" : "light");
                (plain ? onAdd : onOpen)();
              }}
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

/* ---------------------------------------------------------------- Slider */

/**
 * The yanyin slider (hookah strength, roulette budget): flat track, blue fill,
 * optional notches, a thumb with a white ring, and a haptic tick on every step.
 */
export function TrackSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  valueText,
  notches = 0,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label: string;
  valueText?: string;
  notches?: number;
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <div className="relative h-11">
      <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-g-fill-2" />
      <div className="bar-grad absolute top-1/2 left-0 h-2 -translate-y-1/2 rounded-full transition-[width] duration-150" style={{ width: `${pct}%` }} />
      {notches > 1 && (
        <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-between px-[3px]" aria-hidden>
          {Array.from({ length: notches }, (_, i) => (
            <span key={i} className={`size-1.5 rounded-full ${(i / (notches - 1)) * 100 <= pct ? "bg-white/80" : "bg-g-faint/50"}`} />
          ))}
        </div>
      )}
      <span
        aria-hidden
        className="blue-grad pointer-events-none absolute top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white transition-[left] duration-150"
        style={{ left: `clamp(16px, ${pct}%, calc(100% - 16px))` }}
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          haptic("tick");
          onChange(Number(e.target.value));
        }}
        aria-label={label}
        aria-valuetext={valueText}
        className="absolute inset-0 h-full w-full cursor-pointer appearance-none opacity-0"
      />
    </div>
  );
}

/** Numbered step heading used on configurator pages (hookah, roulette). */
export function StepHead({ n, title, aside }: { n?: number; title: string; aside?: ReactNode }) {
  return (
    <div className="mb-4 flex items-baseline gap-2.5">
      {n !== undefined && <span className="text-[13px] font-semibold text-g-blue tabular-nums">{String(n).padStart(2, "0")}</span>}
      <h3 className="text-[17px] font-semibold">{title}</h3>
      {aside && <span className="ml-auto text-[13px] font-medium text-g-faint">{aside}</span>}
    </div>
  );
}

/** Pill choice chip: black when picked. */
export function ChoiceChip({ on, onClick, icon, children }: { on: boolean; onClick: () => void; icon?: ReactNode; children: ReactNode }) {
  return (
    <button
      onClick={() => {
        haptic("light");
        onClick();
      }}
      aria-pressed={on}
      className={`press flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium whitespace-nowrap transition-colors ${on ? "bg-g-ink text-white" : "bg-g-fill"}`}
    >
      {on && !icon ? <Check size={15} strokeWidth={2.5} /> : icon}
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------- Page */

let pageSeq = 0;
let pendingClose: number | null = null;

/**
 * Every secondary screen (dish, cart, orders, roulette, search, about, language)
 * opens as a full-screen page that slides in from the right, with a back button.
 * It also takes a browser history entry, so the phone's back gesture closes it.
 */
export function Sheet({
  open,
  onClose,
  children,
  footer,
  label,
  title = true,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  label: string;
  /** Show `label` in the top bar (off when the page has its own big heading). */
  title?: boolean;
  /** @deprecated pages are always full screen */
  full?: boolean;
}) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const id = ++pageSeq;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    const onPop = () => {
      const top = (history.state as { yanyinPage?: number } | null)?.yanyinPage ?? 0;
      if (top < id) close.current();
    };
    try {
      const top = (history.state as { yanyinPage?: number } | null)?.yanyinPage;
      // A page that replaces another in the same render (check → payment) takes over its history entry.
      if (pendingClose !== null && top === pendingClose) {
        pendingClose = null;
        history.replaceState({ ...(history.state ?? {}), yanyinPage: id }, "");
      } else history.pushState({ ...(history.state ?? {}), yanyinPage: id }, "");
    } catch {}
    document.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onPop);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPop);
      document.body.style.overflow = prev;
      if ((history.state as { yanyinPage?: number } | null)?.yanyinPage === id) {
        pendingClose = id;
        setTimeout(() => {
          if (pendingClose === id) {
            pendingClose = null;
            history.back();
          }
        }, 0);
      }
    };
  }, [open]);

  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={label} className="animate-page fixed inset-0 z-50 flex flex-col bg-white text-g-ink">
      <div className="mx-auto flex min-h-0 w-full max-w-[480px] flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-2 px-4 pt-[max(10px,env(safe-area-inset-top))] pb-1.5">
          <button onClick={onClose} aria-label="Back" className="press grid size-11 shrink-0 place-items-center rounded-full bg-g-fill">
            <ChevronLeft size={22} strokeWidth={2} />
          </button>
          {title && <span className="min-w-0 flex-1 truncate pr-11 text-center text-[16px] font-semibold">{label}</span>}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer && <div className="border-t border-g-line bg-white px-5 pt-3 pb-[max(14px,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}
