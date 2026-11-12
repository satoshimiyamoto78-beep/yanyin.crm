"use client";

import { ArtScene, type ArtName } from "./Art";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { haptic } from "@/lib/haptics";
import { Info } from "lucide-react";
import { PeekCard } from "@/components/guest/motion";

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
    <section className={`min-w-0 rounded-[24px] bg-g-fill p-[18px] ${className}`}>
      <header className="flex min-h-6 items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-g-ink-2">
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

/** A soft, breathing glow centred exactly on a chart point (no hard ring). */
function Halo({ x, y, color }: { x: string; y: string; color: string }) {
  return (
    <span
      aria-hidden
      className="halo pointer-events-none absolute size-9 rounded-full"
      style={{ left: x, top: y, background: `radial-gradient(closest-side, ${color} 0%, transparent 100%)` }}
    />
  );
}

/** The dark value pill above a chart point. */
function Pill({ children }: { children: ReactNode }) {
  return <span className="pointer-events-none rounded-full bg-[#0b0b0f] px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap text-white tabular-nums">{children}</span>;
}

/** Smooth path through points (Catmull-Rom → cubic Bézier). */
function smooth(pts: [number, number][]) {
  return pts
    .map(([x, y], i) => {
      if (!i) return `M${x.toFixed(1)},${y.toFixed(1)}`;
      const p0 = pts[Math.max(0, i - 2)]!, p1 = pts[i - 1]!, p3 = pts[Math.min(pts.length - 1, i + 1)]!;
      const c1x = p1[0] + (x - p0[0]) / 6, c1y = p1[1] + (y - p0[1]) / 6;
      const c2x = x - (p3[0] - p1[0]) / 6, c2y = y - (p3[1] - p1[1]) / 6;
      return `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

/**
 * The day's number against a reference day. Today's running total is the solid
 * line up to now; the reference day (say, last Monday) is a dashed grey line
 * across the whole day. The change is computed at the same hour: ahead is green
 * and points up, behind is red and points down, within ±2% is grey ("about the
 * same"). Scrub to read any hour against the reference.
 */
export function HeroStat({
  title,
  icon,
  value,
  labels,
  today,
  reference,
  referenceName,
  format,
  footnote,
  className = "",
}: {
  title: string;
  icon?: ReactNode;
  value: string;
  /** One label per point of the whole day. */
  labels: string[];
  /** Running total so far today (shorter than `reference`; the last point is now). */
  today: number[];
  /** Running total of the reference day, every point. */
  reference: number[];
  referenceName: string;
  format: (v: number) => string;
  footnote?: string;
  className?: string;
}) {
  const id = useId();
  const on = useEntered();
  const n = reference.length;
  const nowI = today.length - 1;
  const { at, box, handlers } = useScrub(today.length, nowI);
  const max = Math.max(...reference, ...today, 1) * 1.08;
  const X = (i: number) => (i / (n - 1)) * 300;
  const Y = (v: number) => 92 - (v / max) * 84;
  const refPath = smooth(reference.map((v, i) => [X(i), Y(v)]));
  const todayPts = today.map((v, i) => [X(i), Y(v)] as [number, number]);
  const todayPath = smooth(todayPts);
  const ref = reference[at] ?? 0;
  const cur = today[at] ?? 0;
  const change = ref ? (cur - ref) / ref : 0;
  const trend = change > 0.02 ? "up" : change < -0.02 ? "down" : "flat";
  const color = { up: "#12a150", down: "#e5484d", flat: "#8b909a" }[trend];
  const chip = { up: "chip-green", down: "chip-red", flat: "chip-gray" }[trend];
  const arrow = { up: "↑", down: "↓", flat: "≈" }[trend];
  const px = (X(at) / 300) * 100;
  return (
    <WidgetCard title={title} icon={icon} className={className} aside={<span className="text-[13px] text-g-muted">{at === nowI ? labels[at] : labels[at]}</span>}>
      <p className="live mt-3 text-[44px] leading-none font-semibold tracking-[-0.04em] tabular-nums">{at === nowI ? value : format(cur)}</p>
      <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px]">
        <span className={`rounded-md px-1.5 py-0.5 font-semibold tabular-nums ${chip}`}>
          {ref ? `${arrow} ${Math.abs(Math.round(change * 100))}%` : "—"}
        </span>
        <span className="text-g-muted">
          {referenceName} · {format(ref)}
        </span>
      </p>
      <div ref={box} {...handlers} className="relative mt-4 h-[96px] cursor-crosshair touch-pan-y select-none">
        <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id={`ha${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.28" />
              <stop offset="0.7" stopColor={color} stopOpacity="0.06" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Reference day: thin dashed grey across the whole day. */}
          <path d={refPath} fill="none" stroke="currentColor" className="text-g-faint" strokeWidth="1.5" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          {/* Today: area and line up to now, in the trend's colour. */}
          <path d={`${todayPath} L${X(nowI)},100 L0,100 Z`} fill={`url(#ha${id})`} style={{ opacity: on ? 1 : 0, transition: "opacity 0.8s ease 0.4s" }} />
          <path d={todayPath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength={1} strokeDasharray="1" strokeDashoffset={on ? 0 : 1} style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1), stroke 0.3s" }} />
        </svg>
        {/* Now: a dot with a soft pulse at the end of today's line. */}
        <Halo x={`${(X(nowI) / 300) * 100}%`} y={`${Y(today[nowI]!)}%`} color={color} />
        <span className="pointer-events-none absolute block size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#fff]" style={{ left: `${(X(nowI) / 300) * 100}%`, top: `${Y(today[nowI]!)}%`, background: color }} />
        {at !== nowI && (
          <>
            <span className="pointer-events-none absolute top-0 bottom-0 w-px bg-g-ink/25" style={{ left: `${px}%` }} />
            <span className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#fff]" style={{ left: `${px}%`, top: `${Y(cur)}%`, background: color }} />
          </>
        )}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-g-muted tabular-nums">
        {labels.map((l, i) => (i % 3 === 0 || i === n - 1 ? <span key={l} className={i === at ? "font-semibold text-g-ink" : ""}>{l}</span> : null))}
      </div>
      {footnote && <p className="mt-2 text-[12px] text-g-muted">{footnote}</p>}
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
      <p className="live mt-2 text-[26px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{format(values[at]!)}</p>
      <div ref={box} {...handlers} className="relative mt-8 h-[76px] cursor-crosshair touch-pan-y select-none">
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
          <span className="live block text-[22px] leading-none font-semibold tracking-[-0.03em] whitespace-nowrap tabular-nums">{value}</span>
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

/**
 * Where the work is right now: one thin bar split by stage (each stage's share
 * of dishes), then a row per stage with its count and what it means. The stage
 * that needs the waiter carries an action button. Colour always comes with a
 * label, never alone.
 */
export function FlowWidget({
  title,
  icon,
  headline,
  stages,
  footnote,
  className = "",
}: {
  title: string;
  icon?: ReactNode;
  headline: ReactNode;
  stages: { label: string; count: number; color: string; icon: ReactNode; hint: string; action?: { label: string; onClick: () => void } }[];
  footnote?: string;
  className?: string;
}) {
  const on = useEntered();
  const total = Math.max(1, stages.reduce((n, s) => n + s.count, 0));
  return (
    <WidgetCard title={title} icon={icon} className={className}>
      <div className="mt-2">{headline}</div>
      <div className="mt-3 flex h-2.5 gap-[3px] overflow-hidden rounded-full">
        {stages
          .filter((s) => s.count > 0)
          .map((s, i) => (
            <span
              key={s.label}
              className="h-full rounded-full transition-[flex-grow] duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ flexGrow: on ? s.count / total : 0.0001, flexBasis: 0, background: s.color, transitionDelay: `${i * 80}ms` }}
            />
          ))}
      </div>
      <ul className="mt-3 divide-y divide-g-line">
        {stages.map((s) => (
          <li key={s.label} className="flex items-center gap-3 py-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-full text-white" style={{ background: s.color }}>
              {s.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold">{s.label}</span>
              <span className="block truncate text-[12px] text-g-muted">{s.hint}</span>
            </span>
            {s.action && s.count > 0 ? (
              <button
                onClick={() => {
                  haptic("light");
                  s.action!.onClick();
                }}
                className="press h-8 shrink-0 rounded-full bg-g-ink px-3 text-[12px] font-semibold text-white"
              >
                {s.action.label}
              </button>
            ) : null}
            <span className="live w-7 shrink-0 text-right text-[18px] font-semibold tabular-nums">{s.count}</span>
          </li>
        ))}
      </ul>
      {footnote && <p className="mt-1 text-[12px] text-g-muted">{footnote}</p>}
    </WidgetCard>
  );
}

/**
 * A single figure on a tinted card with a big illustration tucked into the top
 * corner, cropped by the card and a little transparent, so it sets the mood
 * without competing with the number (like the wheel in the roulette button).
 */
/**
 * A number on its picture, compact: the sharp subject on the left with its
 * ornament, the label and the number stacked right of it on one level, a
 * short line under the row. The soft scene fills the card behind.
 */
export function IconStat({ title, art, value, sub, className = "" }: { title: string; art: ArtName; value: string; sub: string; className?: string }) {
  return (
    <ArtScene name={art} layout="row" focal={42} className={`rounded-[24px] p-3.5 ${className}`} footer={<p className="mt-3 truncate text-[12px] text-g-muted">{sub}</p>}>
      <p className="line-clamp-2 text-[12.5px] leading-tight font-semibold text-g-ink-2">{title}</p>
      <p className={`live mt-1 leading-none font-bold tracking-[-0.03em] whitespace-nowrap tabular-nums ${value.length > 7 ? "text-[20px]" : "text-[24px]"}`}>{value}</p>
    </ArtScene>
  );
}

/**
 * A wide insight card: the picture and the number on top, then the whole
 * shift as a chart you can scroll. Hours already worked are bars in colour,
 * the hour now is the brightest, hours still ahead are grey; tap a bar to read
 * it. Three facts underneath, and an ⓘ that explains the number.
 */
export function InsightCard({
  title,
  art,
  value,
  slots,
  now,
  tone = "blue",
  format,
  nowLabel = "now",
  facts,
  info,
  className = "",
}: {
  title: string;
  art: ArtName;
  value: string;
  nowLabel?: string;
  /** One slot per hour of the shift; `value` null means the hour is still ahead. */
  slots: { label: string; value: number | null }[];
  /** Index of the hour now. */
  now: number;
  tone?: "blue" | "green" | "orange" | "red";
  format: (n: number) => string;
  facts: { label: string; value: string }[];
  info: { title: string; text: string; points: string[] };
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState(now);
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Start with the hour now in the middle of the view.
    const el = strip.current;
    const bar = el?.children[now] as HTMLElement | undefined;
    if (el && bar) el.scrollLeft = bar.offsetLeft - el.clientWidth / 2 + bar.offsetWidth / 2;
  }, [now]);
  const max = Math.max(1, ...slots.map((x) => x.value ?? 0));
  const fill = { blue: "bg-g-blue", green: "bg-g-green", orange: "bg-g-orange", red: "bg-[#ff6a6a]" }[tone];
  const ink = { blue: "text-g-blue", green: "text-g-green", orange: "text-g-orange", red: "text-[#e5484d]" }[tone];
  const cur = slots[pick];
  return (
    <>
      <ArtScene
        name={art}
        layout="row"
        focal={48}
        className={`rounded-[26px] p-4 ${className}`}
        footer={
          <>
            {/* The hour read out, above the chart. */}
            <div className="mt-4 flex items-baseline justify-between text-[12.5px]">
              <span className="text-g-muted">
                {cur?.label}
                {pick === now ? ` · ${nowLabel}` : ""}
              </span>
              <span className={`font-semibold tabular-nums ${cur?.value === null ? "text-g-faint" : ink}`}>{cur?.value === null ? "—" : format(cur?.value ?? 0)}</span>
            </div>
            <div ref={strip} className="no-scrollbar -mx-4 mt-2 flex items-end gap-1.5 overflow-x-auto px-4 pb-1" style={{ height: 132 }}>
              {slots.map((x, i) => {
                const future = x.value === null;
                const h = future ? 14 : Math.max(10, ((x.value ?? 0) / max) * 100);
                return (
                  <button
                    key={i}
                    onClick={() => {
                      haptic("tick");
                      setPick(i);
                    }}
                    aria-label={`${x.label} ${future ? "" : format(x.value ?? 0)}`}
                    className="flex h-full w-[30px] shrink-0 flex-col items-center justify-end gap-1.5"
                  >
                    <span className="relative flex w-full flex-1 items-end">
                      <span
                        className={`w-full rounded-t-[8px] rounded-b-[4px] transition-[height,opacity] duration-500 ${future ? "bg-g-fill-2" : fill} ${!future && i !== now ? "opacity-45" : ""} ${pick === i ? "ring-2 ring-g-ink/70 ring-offset-2 ring-offset-transparent" : ""}`}
                        style={{ height: `${h}%` }}
                      />
                      {i === now && <span className="absolute -top-1 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-g-ink" />}
                    </span>
                    <span className={`text-[10.5px] tabular-nums ${i === now ? "font-bold text-g-ink" : future ? "text-g-faint" : "text-g-muted"}`}>{x.label.slice(0, 2)}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {facts.map((f) => (
                <span key={f.label} className="min-w-0 rounded-[14px] bg-g-card/70 px-2.5 py-2">
                  <span className="block truncate text-[11px] leading-tight text-g-muted">{f.label}</span>
                  <span className="block truncate text-[14px] font-semibold tabular-nums">{f.value}</span>
                </span>
              ))}
            </div>
          </>
        }
      >
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0">
            <p className="truncate text-[13px] leading-tight font-semibold text-g-ink-2">{title}</p>
            <p className="live mt-1 text-[28px] leading-none font-bold tracking-[-0.03em] whitespace-nowrap tabular-nums">{value}</p>
          </span>
          <button
            aria-label={info.title}
            onClick={() => {
              haptic("light");
              setOpen(true);
            }}
            className="press grid size-8 shrink-0 place-items-center rounded-full bg-g-card/80 text-g-ink-2"
          >
            <Info size={16} strokeWidth={2.2} />
          </button>
        </div>
      </ArtScene>
      {open && (
        <PeekCard label={info.title} onClose={() => setOpen(false)}>
          <p className="text-[19px] leading-tight font-bold">{info.title}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-g-ink-2">{info.text}</p>
          <ul className="mt-3 grid gap-2">
            {info.points.map((pt) => (
              <li key={pt} className="flex gap-2 text-[13px] leading-snug text-g-muted">
                <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${fill}`} /> {pt}
              </li>
            ))}
          </ul>
          <button onClick={() => setOpen(false)} className="blue-grad press mt-5 h-12 w-full rounded-full text-[15px] font-semibold">
            OK
          </button>
        </PeekCard>
      )}
    </>
  );
}

/**
 * Today against any of the last few days. One point per day (today last), a
 * smooth line through them; tap a day to compare with it: the chip shows the
 * change and the colour follows it (up green, down red, within ±2% grey).
 */
export function DaysCompareWidget({
  title,
  icon,
  days,
  format,
  todayNote,
  className = "",
}: {
  title: string;
  icon?: ReactNode;
  /** Oldest first; the last one is today. */
  days: { short: string; date: string; value: number }[];
  format: (v: number) => string;
  todayNote?: string;
  className?: string;
}) {
  const id = useId();
  const on = useEntered();
  const n = days.length;
  const today = days[n - 1]!;
  const [pick, setPick] = useState(n - 2);
  const ref = days[pick]!;
  const change = ref.value ? (today.value - ref.value) / ref.value : 0;
  const trend = change > 0.02 ? "up" : change < -0.02 ? "down" : "flat";
  const color = { up: "#12a150", down: "#e5484d", flat: "#8b909a" }[trend];
  const chip = { up: "chip-green", down: "chip-red", flat: "chip-gray" }[trend];
  const arrow = { up: "↑", down: "↓", flat: "≈" }[trend];
  const max = Math.max(...days.map((d) => d.value), 1) * 1.15;
  const min = Math.min(...days.map((d) => d.value)) * 0.6;
  // Points sit in the middle of each day's column so the labels line up under them.
  const X = (i: number) => ((i + 0.5) / n) * 300;
  const Y = (v: number) => 90 - ((v - min) / (max - min)) * 78;
  const pts = days.map((d, i) => [X(i), Y(d.value)] as [number, number]);
  const path = smooth(pts);
  const choose = (i: number) => {
    if (i === n - 1 || i === pick) return;
    haptic("tick");
    setPick(i);
  };
  return (
    <WidgetCard
      title={title}
      icon={icon}
      className={className}
      aside={
        <span key={pick} className={`animate-pop rounded-md px-1.5 py-0.5 text-[13px] font-semibold tabular-nums ${chip}`}>
          {arrow} {Math.abs(Math.round(change * 100))}%
        </span>
      }
    >
      <p className="mt-2 flex items-baseline justify-between gap-2">
        <span className="live text-[32px] leading-none font-semibold tracking-[-0.035em] tabular-nums">{format(today.value)}</span>
        <span className="truncate text-[12px] text-g-muted tabular-nums">
          {ref.short} {ref.date} · {format(ref.value)}
        </span>
      </p>
      <div className="relative mt-3 h-[60px] select-none">
        <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id={`dc${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.24" />
              <stop offset="1" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${path} L${X(n - 1)},100 L${X(0)},100 Z`} fill={`url(#dc${id})`} style={{ opacity: on ? 1 : 0, transition: "opacity 0.8s ease 0.4s" }} />
          <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" pathLength={1} strokeDasharray="1" strokeDashoffset={on ? 0 : 1} style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(0.22,1,0.36,1), stroke 0.3s" }} />
        </svg>
        {/* The day we compare with: a dashed hairline and a ring. */}
        <span className="pointer-events-none absolute top-0 bottom-0 w-0 border-l-[1.5px] border-dashed border-g-faint transition-[left] duration-300" style={{ left: `${(X(pick) / 300) * 100}%` }} />
        {days.map((d, i) => (
          <span
            key={d.date}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-300"
            style={{
              left: `${(X(i) / 300) * 100}%`,
              top: `${Y(d.value)}%`,
              width: i === pick ? 12 : i === n - 1 ? 10 : 6,
              height: i === pick ? 12 : i === n - 1 ? 10 : 6,
              background: i === pick ? "var(--g-fill)" : i === n - 1 ? color : "var(--g-faint)",
              border: i === pick ? `2.5px solid ${color}` : i === n - 1 ? "2px solid #fff" : "none",
              zIndex: 1,
            }}
          />
        ))}
        <Halo x={`${(X(n - 1) / 300) * 100}%`} y={`${Y(today.value)}%`} color={color} />
      </div>
      {/* The days: tap one to compare today with it. */}
      <div className="mt-1.5 grid" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
        {days.map((d, i) => {
          const isToday = i === n - 1;
          const sel = i === pick;
          return (
            <button
              key={d.date}
              onClick={() => choose(i)}
              disabled={isToday}
              aria-pressed={sel}
              className={`press mx-0.5 h-7 rounded-full text-[12px] whitespace-nowrap tabular-nums transition-colors ${sel ? "bg-white font-semibold text-g-ink" : isToday ? "font-semibold text-g-ink" : "text-g-muted"}`}
            >
              {d.short} {d.date}
            </button>
          );
        })}
      </div>
      {todayNote && <p className="mt-1.5 text-[11px] text-g-faint">{todayNote}</p>}
    </WidgetCard>
  );
}

/**
 * A short to-do list: who needs the waiter right now and the one action that
 * solves it. Each row: a big number (table, party size), a line about it, how
 * long it has waited, and a button. Empty state says all is calm.
 */
export function ActionListWidget({
  title,
  icon,
  tone = "orange",
  rows,
  empty,
  className = "",
}: {
  title: string;
  icon?: ReactNode;
  tone?: "orange" | "blue" | "green";
  rows: { id: string; badge: string; badgeLabel: string; title: string; sub: string; action?: { label: string; onClick: () => void } }[];
  empty: string;
  className?: string;
}) {
  const chip = { orange: "chip-orange", blue: "chip-blue", green: "chip-green" }[tone];
  return (
    <WidgetCard title={title} icon={icon} className={className} aside={rows.length ? <span className={`rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums ${chip}`}>{rows.length}</span> : undefined}>
      {rows.length ? (
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-2">
          {rows.map((r) => (
            <div key={r.id} className="flex min-w-0 items-center gap-3 rounded-full bg-g-card p-1.5 pr-1.5">
              <span className={`grid size-12 shrink-0 place-items-center rounded-full text-[19px] font-bold tabular-nums ${chip}`} aria-label={`${r.badgeLabel} ${r.badge}`}>
                {r.badge}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold">{r.title}</span>
                <span className="block truncate text-[12px] text-g-muted tabular-nums">{r.sub}</span>
              </span>
              {r.action && (
                <button
                  onClick={() => {
                    haptic("light");
                    r.action!.onClick();
                  }}
                  className="press h-11 shrink-0 rounded-full bg-g-ink px-4 text-[13px] font-semibold text-white"
                >
                  {r.action.label}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 flex items-center gap-2 text-[14px] text-g-muted">
          <span className="size-2 rounded-full bg-g-green" /> {empty}
        </p>
      )}
    </WidgetCard>
  );
}
