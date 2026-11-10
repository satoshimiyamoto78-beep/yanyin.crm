"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { haptic } from "@/lib/haptics";

/*
 * Dashboard widgets, each a different form so attention spreads the right way:
 * a hero number with its trend, a line you can scrub, bars you can scrub, a
 * ring, a low-to-high meter and a pipeline of steps. One series each (no
 * legend, the title names it), brand blue for data, status colours only with a
 * word next to them, values always in ink (never in the series colour). Every
 * chart shows its numbers without hovering; touching it reveals the exact value.
 * Shared by the waiter app and, later, the manager console.
 */

const BLUE = "#2f6bff";

/** Plain card every widget sits on. */
export function WidgetCard({ title, icon, aside, children, className = "" }: { title: string; icon?: ReactNode; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[26px] bg-g-fill p-4 ${className}`}>
      <header className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-[14px] font-semibold text-g-ink-2">
          {icon && <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white text-g-blue">{icon}</span>}
          <span className="truncate">{title}</span>
        </span>
        {aside}
      </header>
      {children}
    </section>
  );
}

/** Mounts once, then flips true on the next frame: drives the grow-in animations. */
function useEntered() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(r);
  }, []);
  return on;
}

/** Tracks which point of a chart the finger (or mouse) is over; ticks on change. */
function useScrub(count: number, initial: number) {
  const [at, setAt] = useState(initial);
  const box = useRef<HTMLDivElement>(null);
  const pick = (clientX: number) => {
    const el = box.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const i = Math.max(0, Math.min(count - 1, Math.floor(((clientX - r.left) / r.width) * count)));
    setAt((cur) => {
      if (cur !== i) haptic("tick");
      return i;
    });
  };
  const handlers = {
    onPointerDown: (e: React.PointerEvent) => pick(e.clientX),
    onPointerMove: (e: React.PointerEvent) => {
      if (e.pointerType === "mouse" || e.buttons) pick(e.clientX);
    },
  };
  return { at, setAt, box, handlers };
}

/** The dark value pill above a chart point. */
function Pill({ children }: { children: ReactNode }) {
  return <span className="pointer-events-none rounded-full bg-[#0b0b0f] px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap text-white tabular-nums">{children}</span>;
}

/** A big number with its change and a faint trend line behind it. */
export function HeroStat({ title, icon, value, delta, deltaLabel, good = true, series , className = ""}: { title: string; icon?: ReactNode; value: string; delta: string; deltaLabel: string; good?: boolean; series: number[] ; className?: string}) {
  const id = useId();
  const on = useEntered();
  const max = Math.max(...series, 1);
  const pts = series.map((v, i) => [(i / (series.length - 1)) * 200, 70 - (v / max) * 58] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const tone = good ? "#12a150" : "#e2600f";
  return (
    <WidgetCard title={title} icon={icon} className={`relative overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 200 74"
        preserveAspectRatio="none"
        className="pointer-events-none absolute right-0 bottom-0 h-[78%] w-[62%] [mask-image:linear-gradient(90deg,transparent,#000_35%)]"
        aria-hidden
      >
        <defs>
          <linearGradient id={`hs${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={tone} stopOpacity="0.18" />
            <stop offset="1" stopColor={tone} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${d} L200,74 L0,74 Z`} fill={`url(#hs${id})`} style={{ opacity: on ? 1 : 0, transition: "opacity 0.8s ease 0.3s" }} />
        <path d={d} fill="none" stroke={tone} strokeWidth="1.6" vectorEffect="non-scaling-stroke" pathLength={1} strokeDasharray="1" strokeDashoffset={on ? 0 : 1} style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1)" }} />
      </svg>
      <div className="relative">
        <p className="live mt-4 text-[44px] leading-none font-semibold tracking-[-0.04em] tabular-nums">{value}</p>
        <p className="mt-2 flex items-center gap-1.5 text-[13px]">
          <span className={`rounded-md px-1.5 py-0.5 font-semibold ${good ? "chip-green" : "chip-orange"}`}>
            {good ? "↑" : "↓"} {delta}
          </span>
          <span className="text-g-muted">{deltaLabel}</span>
        </p>
      </div>
    </WidgetCard>
  );
}

/** A line you can scrub: area under it, a hairline and the value at the finger. */
export function LineWidget({ title, icon, labels, values, format, initial , className = ""}: { title: string; icon?: ReactNode; labels: string[]; values: number[]; format: (v: number) => string; initial?: number ; className?: string}) {
  const id = useId();
  const on = useEntered();
  const n = values.length;
  const { at, box, handlers } = useScrub(n, initial ?? n - 1);
  const max = Math.max(...values, 1) * 1.15;
  const X = (i: number) => (i / (n - 1)) * 300;
  const Y = (v: number) => 96 - (v / max) * 86;
  // Smooth curve through the points (Catmull-Rom → Bézier).
  const d = values
    .map((v, i) => {
      if (!i) return `M${X(0)},${Y(v)}`;
      const p0 = values[Math.max(0, i - 2)]!, p1 = values[i - 1]!, p2 = v, p3 = values[Math.min(n - 1, i + 1)]!;
      const x0 = X(Math.max(0, i - 2)), x1 = X(i - 1), x2 = X(i), x3 = X(Math.min(n - 1, i + 1));
      return `C${x1 + (x2 - x0) / 6},${Y(p1) + (Y(p2) - Y(p0)) / 6} ${x2 - (x3 - x1) / 6},${Y(p2) - (Y(p3) - Y(p1)) / 6} ${x2},${Y(p2)}`;
    })
    .join(" ");
  const px = (X(at) / 300) * 100;
  return (
    <WidgetCard title={title} icon={icon} className={className} aside={<span className="text-[13px] text-g-muted">{labels[at]}</span>}>
      <p className="live mt-2 text-[30px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{format(values[at]!)}</p>
      <div ref={box} {...handlers} className="relative mt-10 h-[104px] cursor-crosshair touch-pan-y select-none">
        <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id={`la${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={BLUE} stopOpacity="0.22" />
              <stop offset="1" stopColor={BLUE} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${d} L300,100 L0,100 Z`} fill={`url(#la${id})`} style={{ opacity: on ? 1 : 0, transition: "opacity 0.8s ease 0.4s" }} />
          <path d={d} fill="none" stroke={BLUE} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength={1} strokeDasharray="1" strokeDashoffset={on ? 0 : 1} style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)" }} />
        </svg>
        {/* Hairline, dot and the value pill at the scrubbed point. */}
        <span className="pointer-events-none absolute top-0 bottom-0 w-px bg-g-ink/25 transition-[left] duration-150" style={{ left: `${px}%` }} />
        <span className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#fff] bg-g-blue transition-[left,top] duration-150" style={{ left: `${px}%`, top: `${Y(values[at]!)}%` }} />
        <span className="pointer-events-none absolute -top-1 -translate-x-1/2 -translate-y-full transition-[left] duration-150" style={{ left: `${Math.min(88, Math.max(12, px))}%` }}>
          <Pill>{format(values[at]!)}</Pill>
        </span>
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-g-muted">
        {labels.map((l, i) => (
          <span key={l} className={i === at ? "font-semibold text-g-ink" : ""}>
            {l}
          </span>
        ))}
      </div>
    </WidgetCard>
  );
}

/** Bars you can scrub; the chosen bar is solid blue with its value on top, the future is faded. */
export function BarsWidget({ title, icon, labels, values, unit, now, initial, headline , className = ""}: { title: string; icon?: ReactNode; labels: string[]; values: number[]; unit: string; now?: number; initial?: number; headline?: ReactNode ; className?: string}) {
  const on = useEntered();
  const n = values.length;
  const { at, box, handlers } = useScrub(n, initial ?? 0);
  const max = Math.max(...values, 1);
  return (
    <WidgetCard title={title} icon={icon} className={className}>
      {headline}
      <div ref={box} {...handlers} className="mt-8 flex h-[120px] cursor-pointer touch-pan-y items-end gap-1.5 select-none">
        {values.map((v, i) => {
          const sel = i === at;
          const future = now !== undefined && i > now;
          return (
            <div key={labels[i]} className="relative flex h-full flex-1 flex-col items-center justify-end">
              {sel && (
                <span className="absolute z-10 -translate-y-full" style={{ bottom: `calc(${Math.max(8, (v / max) * 100)}% + 6px)` }}>
                  <Pill>
                    {v} {unit}
                  </Pill>
                </span>
              )}
              <span
                className={`w-full rounded-[10px] transition-[height,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${sel ? "blue-grad" : future ? "bg-g-fill-2/60" : "bg-g-blue/20"}`}
                style={{ height: on ? `${Math.max(8, (v / max) * 100)}%` : "8%", transitionDelay: on ? `${i * 40}ms` : "0ms" }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5">
        {labels.map((l, i) => (
          <span key={l} className={`flex-1 text-center text-[11px] tabular-nums ${i === at ? "font-semibold text-g-ink" : now !== undefined && i > now ? "text-g-faint" : "text-g-muted"}`}>
            {l}
          </span>
        ))}
      </div>
    </WidgetCard>
  );
}

/** A value with a ring around how much of the whole it is. */
export function RingWidget({ title, icon, value, unit, part, tone = "blue" , className = ""}: { title: string; icon?: ReactNode; value: string; unit: string; part: number; tone?: "blue" | "green" | "orange" ; className?: string}) {
  const on = useEntered();
  const c = { blue: BLUE, green: "#12a150", orange: "#ef6c1a" }[tone];
  const R = 22;
  const L = 2 * Math.PI * R;
  return (
    <WidgetCard title={title} icon={icon} className={className}>
      <div className="mt-3 flex items-end justify-between gap-2">
        <span className="min-w-0">
          <span className="live block text-[24px] leading-none font-semibold tracking-[-0.03em] whitespace-nowrap tabular-nums">{value}</span>
          <span className="mt-1 block truncate text-[12px] text-g-muted">{unit}</span>
        </span>
        <svg viewBox="0 0 56 56" width={48} height={48} className="shrink-0 -rotate-90" aria-label={`${Math.round(part * 100)}%`}>
          <circle cx="28" cy="28" r={R} fill="none" stroke={c} strokeOpacity="0.15" strokeWidth="7" />
          <circle cx="28" cy="28" r={R} fill="none" stroke={c} strokeWidth="7" strokeLinecap="round" strokeDasharray={L} strokeDashoffset={on ? L * (1 - Math.min(1, part)) : L} style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1) 0.15s" }} />
        </svg>
      </div>
    </WidgetCard>
  );
}

/** Where a value sits between low and high: a striped fill up to it, the rest empty. */
export function MeterWidget({ title, icon, value, unit, level, low, high, word, tone = "green" , className = ""}: { title: string; icon?: ReactNode; value: string; unit: string; level: number; low: string; high: string; word: string; tone?: "green" | "orange" | "blue" ; className?: string}) {
  const on = useEntered();
  const c = { green: ["#2ecc71", "#12a150"], orange: ["#ffb347", "#ef6c1a"], blue: ["#6c96ff", "#2f5bff"] }[tone];
  const p = Math.max(0.12, Math.min(1, level));
  return (
    <WidgetCard title={title} icon={icon} className={className} aside={<span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone === "orange" ? "chip-orange" : tone === "blue" ? "chip-blue" : "chip-green"}`}>{word}</span>}>
      <p className="mt-3 flex items-baseline gap-1">
        <span className="live text-[34px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{value}</span>
        <span className="text-[15px] text-g-muted">{unit}</span>
      </p>
      <div className="mt-3 flex justify-between text-[11px] text-g-muted">
        <span>{low}</span>
        <span>{high}</span>
      </div>
      <div className="mt-1 flex h-11 gap-1.5">
        <span
          className="rounded-[12px] transition-[width] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            width: on ? `${p * 100}%` : "12%",
            background: `repeating-linear-gradient(115deg, rgba(255,255,255,0.16) 0 6px, transparent 6px 12px), linear-gradient(135deg, ${c[0]}, ${c[1]})`,
          }}
        />
        <span className="w-1 shrink-0 rounded-full bg-g-fill-2" />
        <span className="flex-1 rounded-[12px] bg-g-fill-2/60" />
      </div>
    </WidgetCard>
  );
}

/** A pipeline: every step with its count, the busiest step marked, done steps solid. */
export function StepsWidget({ title, icon, steps, onStep , className = ""}: { title: string; icon?: ReactNode; steps: { label: string; count: number; done?: boolean }[]; onStep?: (i: number) => void ; className?: string}) {
  const on = useEntered();
  const busiest = steps.reduce((b, s, i) => (s.count > steps[b]!.count ? i : b), 0);
  return (
    <WidgetCard title={title} icon={icon} className={className}>
      <div className="relative mt-4 flex h-14 items-center overflow-hidden rounded-full bg-white p-1.5">
        <span
          className="absolute inset-y-1.5 left-1.5 rounded-full transition-[width] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ width: on ? `calc(${((busiest + 1) / steps.length) * 100}% - 12px)` : "44px", background: "linear-gradient(90deg, #0b0b0f 0%, #2530b0 45%, #6c96ff 100%)" }}
        />
        {steps.map((s, i) => (
          <button key={s.label} onClick={() => onStep?.(i)} className="relative z-10 grid flex-1 place-items-center">
            <span className={`grid size-9 place-items-center rounded-full text-[14px] font-bold tabular-nums transition-colors ${i <= busiest ? "bg-white/20 text-white" : "bg-g-fill text-g-muted"}`}>{s.count}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 flex">
        {steps.map((s, i) => (
          <span key={s.label} className={`flex-1 text-center text-[11px] leading-tight ${i === busiest ? "font-semibold text-g-ink" : "text-g-muted"}`}>
            {s.label}
          </span>
        ))}
      </div>
    </WidgetCard>
  );
}
