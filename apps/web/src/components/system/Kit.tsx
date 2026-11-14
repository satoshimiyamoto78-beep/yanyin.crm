"use client";

/*
 * The shared kit for every screen that is not a phone-only view: forms, tables,
 * empty states, the desktop sidebar, the tab capsule and small inputs (PIN, OTP).
 * Built in the same language as the waiter app (visual-system.md): fills not
 * borders, fully round single-line controls, 22–28 px cards, one blue for the
 * active state and the main action, haptics on every meaningful tap.
 */

import { Check, ChevronRight, ImagePlus, Search, WifiOff, X, type LucideIcon } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import qrcode from "qrcode-generator";
import { haptic } from "@/lib/haptics";
import { ArtScene, type ArtName } from "./Art";

/* ---------------------------------------------------------------- Forms */

/** A labelled form row: label, the control, a hint or an error under it. */
export function Field({ label, hint, error, children, aside }: { label: string; hint?: string; error?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-2 px-1">
        <span className="text-[14px] font-semibold text-g-ink-2">{label}</span>
        {aside}
      </span>
      {children}
      {(error || hint) && <span className={`mt-1.5 block px-1 text-[13px] ${error ? "font-medium text-[#e5484d]" : "text-g-muted"}`}>{error ?? hint}</span>}
    </label>
  );
}

const inputCls = "block h-14 w-full rounded-full bg-g-fill px-5 text-[16px] outline-none transition-shadow placeholder:text-g-faint focus:ring-2 focus:ring-g-blue/40";

export function TextField({ value, onChange, placeholder, type = "text", inputMode, prefix, suffix, autoFocus, maxLength }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string; inputMode?: "text" | "numeric" | "tel" | "email" | "decimal"; prefix?: ReactNode; suffix?: ReactNode; autoFocus?: boolean; maxLength?: number }) {
  if (prefix || suffix)
    return (
      <span className="flex h-14 w-full items-center gap-2 rounded-full bg-g-fill px-5 transition-shadow focus-within:ring-2 focus-within:ring-g-blue/40">
        {prefix && <span className="shrink-0 text-[16px] font-medium text-g-muted">{prefix}</span>}
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} inputMode={inputMode} autoFocus={autoFocus} maxLength={maxLength} className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-g-faint" />
        {suffix && <span className="shrink-0 text-[15px] font-medium text-g-muted">{suffix}</span>}
      </span>
    );
  return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} inputMode={inputMode} autoFocus={autoFocus} maxLength={maxLength} className={inputCls} />;
}

export function TextArea({ value, onChange, placeholder, rows = 3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} className="block w-full resize-none rounded-[24px] bg-g-fill px-4 py-3.5 text-[16px] leading-relaxed outline-none placeholder:text-g-faint focus:ring-2 focus:ring-g-blue/40" />;
}

/** Chips to pick one or several options; the picked ones turn blue. */
export function Choice<T extends string>({ options, value, onChange, multi = false }: { options: { id: T; label: string; icon?: LucideIcon }[]; value: T[]; onChange: (v: T[]) => void; multi?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={on}
            onClick={() => {
              haptic("tick");
              onChange(multi ? (on ? value.filter((v) => v !== o.id) : [...value, o.id]) : [o.id]);
            }}
            className={`press flex h-11 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold transition-colors ${on ? "blue-grad" : "bg-g-fill text-g-ink-2"}`}
          >
            {o.icon && <o.icon size={16} strokeWidth={2.2} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** An iOS-style switch in brand blue. */
export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => {
        haptic("tick");
        onChange(!on);
      }}
      className={`relative h-[30px] w-[50px] shrink-0 rounded-full transition-colors duration-300 ${on ? "bg-g-blue" : "bg-g-fill-2"}`}
    >
      <span className="absolute top-[3px] left-[3px] size-6 rounded-full bg-white shadow-[0_2px_6px_rgba(11,11,15,0.2)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ transform: `translateX(${on ? 20 : 0}px)` }} />
    </button>
  );
}

/** A settings row: icon, title, sub, and a control or a chevron on the right. */
export function Row({ icon: Icon, title, sub, right, onClick, tone }: { icon?: LucideIcon; title: string; sub?: string; right?: ReactNode; onClick?: () => void; tone?: "blue" | "red" }) {
  const body = (
    <>
      {Icon && (
        <span className={`grid size-10 shrink-0 place-items-center rounded-full ${tone === "red" ? "chip-red" : "bg-g-card text-g-blue"}`}>
          <Icon size={19} strokeWidth={2} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-[15.5px] font-semibold ${tone === "red" ? "text-[#e5484d]" : ""}`}>{title}</span>
        {sub && <span className="block truncate text-[13px] text-g-muted">{sub}</span>}
      </span>
      {right ?? (onClick && <ChevronRight size={18} className="shrink-0 text-g-faint" />)}
    </>
  );
  return onClick ? (
    <button
      type="button"
      onClick={() => {
        haptic("light");
        onClick();
      }}
      className="press flex w-full items-center gap-3 rounded-full px-2.5 py-2.5 text-left"
    >
      {body}
    </button>
  ) : (
    <div className="flex w-full items-center gap-3 rounded-full px-2.5 py-2.5">{body}</div>
  );
}

/** A group of rows in one soft card, like the waiter's lists. */
export function Group({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      {title && <h3 className="mb-2 px-1 text-[13px] font-semibold tracking-[0.06em] text-g-muted uppercase">{title}</h3>}
      <div className="card rounded-[24px] p-1.5">{children}</div>
    </section>
  );
}

/** A photo slot: tap to pick a picture; the preview fills the tile. */
export function PhotoPick({ value, onChange, label, className = "aspect-[4/3]" }: { value?: string; onChange: (url: string) => void; label: string; className?: string }) {
  const id = useId();
  return (
    <label htmlFor={id} className={`press relative grid w-full cursor-pointer place-items-center overflow-hidden rounded-[22px] bg-g-fill ${className}`}>
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element -- a local preview the user just picked
        <img src={value} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <span className="flex flex-col items-center gap-2 text-g-muted">
          <span className="blue-grad grid size-12 place-items-center rounded-full">
            <ImagePlus size={22} strokeWidth={2} />
          </span>
          <span className="text-[14px] font-semibold">{label}</span>
        </span>
      )}
      <input
        id={id}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            haptic("success");
            onChange(URL.createObjectURL(f));
          }
        }}
      />
    </label>
  );
}

/** Wizard progress: one segment per step, the done ones blue, the current one growing. */
export function StepBar({ steps, at }: { steps: string[]; at: number }) {
  return (
    <div>
      <div className="flex gap-1.5">
        {steps.map((s, i) => (
          <span key={s} className="h-1.5 flex-1 overflow-hidden rounded-full bg-g-fill-2">
            <span className="block h-full rounded-full bg-g-blue transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: i < at ? "100%" : i === at ? "45%" : "0%" }} />
          </span>
        ))}
      </div>
      <p className="mt-2 text-[13px] font-medium text-g-muted">
        {at + 1} / {steps.length} · {steps[at]}
      </p>
    </div>
  );
}

/**
 * Steps inside one page that the phone's back gesture walks back through:
 * every step forward takes a history entry, back (button or gesture) returns.
 */
export function useStepHistory(initial = 0) {
  const [step, setStep] = useState(initial);
  const base = useRef<number | null>(null);
  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const s = (e.state as { yanyinStep?: number } | null)?.yanyinStep;
      setStep(typeof s === "number" ? s : 0);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const go = (n: number) => {
    haptic("light");
    if (n > step) {
      try {
        if (base.current === null) {
          base.current = 0;
          history.replaceState({ ...(history.state ?? {}), yanyinStep: step }, "");
        }
        history.pushState({ ...(history.state ?? {}), yanyinStep: n }, "");
      } catch {}
      setStep(n);
    } else if (n < step) {
      try {
        history.go(n - step);
      } catch {
        setStep(n);
      }
    }
  };
  return { step, go, back: () => go(step - 1) };
}

/* ---------------------------------------------------------------- Codes */

/** One-time code: six round cells, typed with the system keyboard, pasted whole. */
export function OtpInput({ value, onChange, length = 6, error }: { value: string; onChange: (v: string) => void; length?: number; error?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="relative" onClick={() => ref.current?.focus()}>
      <input
        ref={ref}
        value={value}
        autoFocus
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="Code"
        maxLength={length}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, length))}
        className="absolute inset-0 opacity-0"
      />
      <div className={`flex justify-between gap-2 ${error ? "animate-[jiggle_0.4s]" : ""}`}>
        {Array.from({ length }, (_, i) => {
          const ch = value[i];
          const cur = i === value.length;
          return (
            <span key={i} className={`grid h-16 flex-1 place-items-center rounded-[20px] text-[26px] font-bold tabular-nums transition-colors ${error ? "chip-red" : ch ? "bg-g-blue-soft text-g-blue" : "bg-g-fill"} ${cur && !error ? "ring-2 ring-g-blue/50" : ""}`}>
              {ch ?? ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** A big PIN pad for shared tablets: four dots and twelve round keys. */
export function PinPad({ value, onChange, length = 4, error }: { value: string; onChange: (v: string) => void; length?: number; error?: boolean }) {
  const key = (k: string) => {
    haptic("tick");
    if (k === "del") onChange(value.slice(0, -1));
    else if (value.length < length) onChange(value + k);
  };
  return (
    <div className="mx-auto w-full max-w-[320px]">
      <div className={`flex justify-center gap-4 ${error ? "animate-[jiggle_0.4s]" : ""}`}>
        {Array.from({ length }, (_, i) => (
          <span key={i} className={`size-4 rounded-full transition-colors ${error ? "bg-[#e5484d]" : i < value.length ? "bg-g-blue" : "bg-g-fill-2"}`} />
        ))}
      </div>
      <div className="mt-8 grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"].map((k, i) =>
          k ? (
            <button key={i} type="button" aria-label={k === "del" ? "Delete" : k} onClick={() => key(k)} className="press grid h-[72px] place-items-center rounded-full bg-g-fill text-[28px] font-semibold tabular-nums">
              {k === "del" ? <X size={24} strokeWidth={2} /> : k}
            </button>
          ) : (
            <span key={i} />
          ),
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- States */

/** Nothing here yet: the scene picture, one line, what to do, and the action. */
export function EmptyState({ art, title, text, action, className = "" }: { art: ArtName; title: string; text?: string; action?: { label: string; onClick: () => void }; className?: string }) {
  return (
    <ArtScene name={art} layout="stack" focal={64} className={`rounded-[28px] p-6 ${className}`}>
      <p className="mt-4 text-[20px] leading-tight font-bold tracking-[-0.02em]">{title}</p>
      {text && <p className="mt-1 text-[14.5px] leading-snug text-g-muted">{text}</p>}
      {action && (
        <button
          type="button"
          onClick={() => {
            haptic("light");
            action.onClick();
          }}
          className="blue-grad press mt-4 h-12 self-start rounded-full px-5 text-[15px] font-semibold"
        >
          {action.label}
        </button>
      )}
    </ArtScene>
  );
}

/** Loading placeholder rows with a soft shimmer. */
export function Skeleton({ rows = 3, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`grid gap-2 ${className}`} aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className="skeleton block h-16 rounded-[22px]" />
      ))}
    </div>
  );
}

/** No connection: a slim pill on top. Work keeps going; it syncs when the network is back. */
export function OfflineBar({ text }: { text: string }) {
  const [off, setOff] = useState(false);
  useEffect(() => {
    const set = () => setOff(!navigator.onLine);
    set();
    window.addEventListener("online", set);
    window.addEventListener("offline", set);
    return () => {
      window.removeEventListener("online", set);
      window.removeEventListener("offline", set);
    };
  }, []);
  if (!off) return null;
  return (
    <div role="status" className="animate-rise fixed inset-x-0 top-[max(10px,env(safe-area-inset-top))] z-[95] flex justify-center px-4">
      <span className="flex h-10 items-center gap-2 rounded-full bg-[#0b0b0f] px-4 text-[13.5px] font-semibold text-white shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)]">
        <WifiOff size={16} strokeWidth={2.2} className="text-g-orange" /> {text}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- Tables */

export type Column<T> = { key: string; label: string; render: (row: T) => ReactNode; align?: "left" | "right"; width?: string; sort?: (row: T) => number | string };

/** Search field and filter chips above a table or a list. */
export function Toolbar({ query, onQuery, placeholder, chips, active, onChip, right }: { query: string; onQuery: (q: string) => void; placeholder: string; chips?: { id: string; label: string; count?: number }[]; active?: string; onChip?: (id: string) => void; right?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <span className="flex h-12 min-w-0 shrink-0 items-center gap-2 rounded-full bg-g-fill px-4 focus-within:ring-2 focus-within:ring-g-blue/40 md:max-w-[360px] md:flex-1">
        <Search size={18} strokeWidth={2} className="shrink-0 text-g-muted" />
        <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder={placeholder} className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-g-faint" />
        {query && (
          <button type="button" aria-label="Clear" onClick={() => onQuery("")} className="press grid size-7 place-items-center rounded-full bg-g-card text-g-muted">
            <X size={14} strokeWidth={2.4} />
          </button>
        )}
      </span>
      {chips && (
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={active === c.id}
              onClick={() => {
                haptic("tick");
                onChip?.(c.id);
              }}
              className={`press flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold transition-colors ${active === c.id ? "bg-g-ink text-white" : "bg-g-fill text-g-ink-2"}`}
            >
              {c.label}
              {c.count !== undefined && <span className={`tabular-nums ${active === c.id ? "text-white/60" : "text-g-faint"}`}>{c.count}</span>}
            </button>
          ))}
        </div>
      )}
      {right && <div className="flex shrink-0 gap-2 md:ml-auto">{right}</div>}
    </div>
  );
}

/**
 * Data in our style. From 768 px: a table with soft rows, no borders, sortable
 * columns. Below: each row becomes a round card row (`mobile`), like the waiter's lists.
 */
export function DataTable<T>({ rows, columns, rowKey, onRow, mobile, empty }: { rows: T[]; columns: Column<T>[]; rowKey: (r: T) => string; onRow?: (r: T) => void; mobile: (r: T) => ReactNode; empty: ReactNode }) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const col = columns.find((c) => c.key === sort?.key);
  const list = col?.sort ? [...rows].sort((a, b) => (col.sort!(a) > col.sort!(b) ? 1 : col.sort!(a) < col.sort!(b) ? -1 : 0) * sort!.dir) : rows;
  if (!rows.length) return <>{empty}</>;
  return (
    <>
      <div className="hidden md:block">
        <table className="w-full border-separate border-spacing-y-1 text-left">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} style={{ width: c.width }} className={`px-4 pb-1 text-[12px] font-semibold tracking-[0.06em] text-g-muted uppercase ${c.align === "right" ? "text-right" : ""}`}>
                  {c.sort ? (
                    <button
                      type="button"
                      onClick={() => setSort((s) => (s?.key === c.key ? { key: c.key, dir: s.dir === 1 ? -1 : 1 } : { key: c.key, dir: -1 }))}
                      className={`inline-flex items-center gap-1 uppercase ${sort?.key === c.key ? "text-g-blue" : ""}`}
                    >
                      {c.label}
                      {sort?.key === c.key && <span aria-hidden>{sort.dir === 1 ? "↑" : "↓"}</span>}
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr
                key={rowKey(r)}
                onClick={onRow ? () => onRow(r) : undefined}
                className={`group text-[15px] ${onRow ? "cursor-pointer" : ""}`}
              >
                {columns.map((c, i) => (
                  <td key={c.key} className={`bg-g-fill px-4 py-3.5 transition-colors group-hover:bg-g-fill-2 ${i === 0 ? "rounded-l-[18px]" : ""} ${i === columns.length - 1 ? "rounded-r-[18px]" : ""} ${c.align === "right" ? "text-right tabular-nums" : ""}`}>
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-2 md:hidden">
        {list.map((r) => (
          <div key={rowKey(r)}>{mobile(r)}</div>
        ))}
      </div>
    </>
  );
}

/** The round list row used everywhere on phones: badge, title, sub, value or action. */
export function ListRow({ badge, badgeTone = "chip-blue", title, sub, right, onClick }: { badge: ReactNode; badgeTone?: string; title: ReactNode; sub?: ReactNode; right?: ReactNode; onClick?: () => void }) {
  const inner = (
    <>
      <span className={`grid size-12 shrink-0 place-items-center rounded-full text-[17px] font-bold tabular-nums ${badgeTone}`}>{badge}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{title}</span>
        {sub && <span className="block truncate text-[12.5px] text-g-muted">{sub}</span>}
      </span>
      {right}
    </>
  );
  const cls = "flex min-w-0 w-full items-center gap-3 rounded-full bg-g-fill p-1.5 pr-4 text-left";
  return onClick ? (
    <button
      type="button"
      onClick={() => {
        haptic("light");
        onClick();
      }}
      className={`press ${cls}`}
    >
      {inner}
    </button>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

/* ---------------------------------------------------------------- Navigation */

export type NavItem = { id: string; label: string; icon: LucideIcon; badge?: number };

/** The floating tab capsule with a round action button and Yan above it (phones). */
export function TabCapsule({ items, active, onPick, action, yan, label }: { items: NavItem[]; active: string; onPick: (id: string) => void; action?: { icon: LucideIcon; label: string; onClick: () => void }; yan?: ReactNode; label: string }) {
  const at = Math.max(0, items.findIndex((i) => i.id === active));
  return (
    <nav aria-label={label} className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(10px,env(safe-area-inset-bottom))] lg:hidden">
      <div className="mx-auto flex max-w-[440px] items-center gap-2.5">
        <div className="relative grid h-[56px] flex-1 rounded-full bg-white/95 p-1 ring-1 ring-black/5" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
          <span aria-hidden className="absolute top-1 bottom-1 left-1 rounded-full bg-g-fill transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: `calc((100% - 8px) / ${items.length})`, transform: `translateX(${at * 100}%)` }} />
          {items.map((it) => {
            const on = it.id === active;
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => {
                  haptic("light");
                  onPick(it.id);
                }}
                aria-current={on ? "page" : undefined}
                className={`relative z-10 flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-semibold transition-colors ${on ? "text-g-ink" : "text-g-faint"}`}
              >
                <it.icon size={19} strokeWidth={on ? 2.1 : 1.8} />
                <span className="max-w-full truncate px-1">{it.label}</span>
                {!!it.badge && <span className="blue-grad absolute top-1 left-[calc(50%+6px)] grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold">{it.badge}</span>}
              </button>
            );
          })}
        </div>
        {action && (
          <div className="relative shrink-0">
            {yan && <div className="absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2">{yan}</div>}
            <button type="button" aria-label={action.label} onClick={action.onClick} className="blue-grad press grid size-[52px] place-items-center rounded-full">
              <action.icon size={21} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

/**
 * Desktop and big tablets (from 1024 px): a left sidebar with the same sections
 * as the phone capsule, grouped, with the venue on top. Content gets the rest.
 */
export function Sidebar({ head, groups, active, onPick, foot }: { head: ReactNode; groups: { title?: string; items: NavItem[] }[]; active: string; onPick: (id: string) => void; foot?: ReactNode }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col bg-g-fill px-3 pt-5 pb-4 lg:flex">
      <div className="px-2">{head}</div>
      <nav className="no-scrollbar mt-6 flex-1 overflow-y-auto">
        {groups.map((g, gi) => (
          <div key={gi} className={gi ? "mt-5" : ""}>
            {g.title && <p className="mb-1.5 px-3 text-[12px] font-semibold tracking-[0.06em] text-g-faint uppercase">{g.title}</p>}
            {g.items.map((it) => {
              const on = it.id === active;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => {
                    haptic("light");
                    onPick(it.id);
                  }}
                  aria-current={on ? "page" : undefined}
                  className={`press flex h-11 w-full items-center gap-3 rounded-full px-3 text-left text-[15px] font-semibold transition-colors ${on ? "bg-g-card text-g-ink shadow-[0_1px_3px_rgba(11,11,15,0.08)]" : "text-g-ink-2 hover:bg-g-card/60"}`}
                >
                  <it.icon size={19} strokeWidth={on ? 2.2 : 1.9} className={on ? "text-g-blue" : "text-g-muted"} />
                  <span className="min-w-0 flex-1 truncate">{it.label}</span>
                  {!!it.badge && <span className="blue-grad grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold">{it.badge}</span>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      {foot && <div className="px-2 pt-3">{foot}</div>}
    </aside>
  );
}

/** A section card on a "more" page: scene picture, title, one line; opens the section. */
export function SectionTile({ art, title, sub, onClick, wide }: { art: ArtName; title: string; sub: string; onClick: () => void; wide?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => {
        haptic("light");
        onClick();
      }}
      className={`press relative block text-left ${wide ? "col-span-2" : ""}`}
    >
      {wide ? (
        <ArtScene name={art} layout="row" focal={56} className="h-full rounded-[24px] p-4" footer={<p className="mt-3 truncate pr-5 text-[12.5px] text-g-muted">{sub}</p>}>
          <p className="truncate text-[17px] leading-tight font-bold tracking-[-0.01em]">{title}</p>
        </ArtScene>
      ) : (
        <ArtScene name={art} layout="stack" focal={40} className="h-full rounded-[24px] p-4">
          <p className="mt-3 text-[16px] leading-tight font-bold tracking-[-0.01em] text-balance">{title}</p>
          <p className="mt-1 line-clamp-2 pr-4 text-[12.5px] leading-snug text-g-muted">{sub}</p>
        </ArtScene>
      )}
      <ChevronRight size={17} className="absolute right-3.5 bottom-3.5 text-g-faint" />
    </button>
  );
}

/** A tick in a blue circle, for "done" lists. */
export function Tick({ on }: { on: boolean }) {
  return <span className={`grid size-6 shrink-0 place-items-center rounded-full transition-colors ${on ? "blue-grad" : "bg-g-fill-2"}`}>{on && <Check size={14} strokeWidth={3} />}</span>;
}

/* ---------------------------------------------------------------- QR */

/** A QR code in the yanyin look: round dots, blue finder eyes, the blue "y" badge in the middle. Always on white. */
export function BrandQr({ value, size = 200, label }: { value: string; size?: number; label: string }) {
  const id = useId().replace(/:/g, "");
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
  const finders: [number, number][] = [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ];
  const badge = n * 0.22;
  return (
    <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} width={size} height={size} role="img" aria-label={label} style={{ background: "#fff", borderRadius: size * 0.08 }}>
      {dots.map(([r, c]) => (
        <rect key={`${r}-${c}`} x={c + 0.08} y={r + 0.08} width={0.84} height={0.84} rx={0.36} fill="#0b0b0f" />
      ))}
      {finders.map(([r, c]) => (
        <g key={`f${r}-${c}`}>
          <rect x={c + 0.5} y={r + 0.5} width={6} height={6} rx={2} fill="none" stroke="#0b0b0f" strokeWidth={1} />
          <rect x={c + 2} y={r + 2} width={3} height={3} rx={1} fill="#2f5bff" />
        </g>
      ))}
      <defs>
        <linearGradient id={`qb-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6c96ff" />
          <stop offset="0.5" stopColor="#2f6bff" />
          <stop offset="1" stopColor="#2530b0" />
        </linearGradient>
      </defs>
      <rect x={n / 2 - badge / 2} y={n / 2 - badge / 2} width={badge} height={badge} rx={badge * 0.3} fill={`url(#qb-${id})`} />
      <text x={n / 2} y={n / 2 + badge * 0.2} textAnchor="middle" fontSize={badge * 0.62} fontWeight={800} fill="#fff" fontFamily="Onest, sans-serif">
        y
      </text>
    </svg>
  );
}
