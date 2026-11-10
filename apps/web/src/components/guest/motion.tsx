"use client";

import { Dices } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { haptic } from "@/lib/haptics";

/* ---------------------------------------------------------------- Reveal */

/*
 * Loading windows. Data blocks are blurred only while data loads: on the first
 * screen and when data changes (language, tab). Scrolling never blurs.
 */
let loadingUntil = 0;
const listeners = new Set<() => void>();

const shown = new Map<string, string>();

/**
 * Loads only when needed. `signature` is a fingerprint of the data a section
 * shows. First visit (nothing cached) or changed data: blur, then pull into
 * focus. Same data as last time: show at once, however long ago that was.
 * In production the same rule sits on the data cache (stale-while-revalidate):
 * cached data renders instantly; the focus pull runs only for new data.
 */
export function loadIfChanged(key: string, signature: string, ms = 550) {
  if (shown.get(key) === signature) {
    loadingUntil = 0.0001; // a past window: Reveals mount sharp
    return;
  }
  shown.set(key, signature);
  startLoading(ms);
}

/** Marks data as already shown (e.g. the first screen), so returning to it is instant. */
export function markShown(key: string, signature: string) {
  shown.set(key, signature);
}

/** Starts a loading window: every mounted Reveal blurs its data, then pulls it into focus. */
export function startLoading(ms = 600) {
  loadingUntil = performance.now() + ms;
  listeners.forEach((f) => f());
}

type Phase = "loading" | "in" | "idle";

/**
 * Loading boundary for one block of data. While loading, only its `.live`
 * children (the data itself) are blurred; labels, icons and buttons stay sharp.
 */
export function Reveal({
  as: Tag = "div",
  delay = 0,
  className = "",
  children,
}: {
  as?: ElementType;
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  // Mounted inside a loading window (or on the first screen): start blurred. Mounted later (scrolling, opening a page): sharp.
  const [phase, setPhase] = useState<Phase>(() =>
    typeof window === "undefined" || !loadingUntil || performance.now() < loadingUntil ? "loading" : "idle",
  );

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = () => {
      const now = performance.now();
      if (!loadingUntil) loadingUntil = now + 650; // first screen
      if (now >= loadingUntil) {
        setPhase((p) => (p === "loading" ? "in" : p));
        return;
      }
      setPhase("loading");
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setPhase("in"), loadingUntil - now + delay);
    };
    run();
    listeners.add(run);
    return () => {
      listeners.delete(run);
      if (timer) clearTimeout(timer);
    };
  }, [delay]);

  return (
    <Tag
      aria-busy={phase === "loading"}
      data-loading={phase === "loading" ? "true" : undefined}
      data-loaded={phase === "in" ? "true" : undefined}
      className={className || undefined}
    >
      {children}
    </Tag>
  );
}

/* ---------------------------------------------------------------- Roulette wheel */

const SEGMENTS = 12;
const SEG = 360 / SEGMENTS;
type FaceKind = "smile" | "laugh" | "wink" | "love" | "cool" | "tongue" | "wow" | "yum";
const FACES: FaceKind[] = ["smile", "love", "laugh", "cool", "wink", "yum", "wow", "tongue", "smile", "love", "laugh", "cool"];

/**
 * yanyin emoji: flat round faces drawn in our line style (no system emoji).
 * Drawn in a 20×20 box; `face` is the disc colour, `ink` the features.
 */
function Face({ kind, x, y, face, ink }: { kind: FaceKind; x: number; y: number; face: string; ink: string }) {
  const st = { stroke: ink, strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  const dot = (cx: number) => <circle cx={cx} cy={8} r={1.3} fill={ink} />;
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx={10} cy={10} r={9.2} fill={face} />
      {kind === "smile" && (<>{dot(7)}{dot(13)}<path d="M6.3 12.2q3.7 3.6 7.4 0" {...st} /></>)}
      {kind === "laugh" && (<><path d="M5.6 8.6l1.6-1.4 1.6 1.4M11.2 8.6l1.6-1.4 1.6 1.4" {...st} /><path d="M5.8 11.4h8.4q-.6 4.2-4.2 4.2t-4.2-4.2Z" fill={ink} /></>)}
      {kind === "wink" && (<>{dot(7)}<path d="M11.6 8h3" {...st} /><path d="M6.3 12.2q3.7 3.6 7.4 0" {...st} /></>)}
      {kind === "love" && (<><path d="M7 10.1 5.3 8.5a1 1 0 0 1 1.7-1.2 1 1 0 0 1 1.7 1.2Zm6 0-1.7-1.6a1 1 0 0 1 1.7-1.2 1 1 0 0 1 1.7 1.2Z" fill={ink} /><path d="M6.6 12.6q3.4 3 6.8 0" {...st} /></>)}
      {kind === "cool" && (<><path d="M4.3 7.2h11.4l-.6 2.6a1.6 1.6 0 0 1-1.6 1.2h-1.4a1.6 1.6 0 0 1-1.5-1.1L10 9.2l-.6.7A1.6 1.6 0 0 1 7.9 11H6.5a1.6 1.6 0 0 1-1.6-1.2Z" fill={ink} /><path d="M7 13.6q3 1.8 6 0" {...st} /></>)}
      {kind === "tongue" && (<>{dot(7)}{dot(13)}<path d="M6.2 11.8h7.6" {...st} /><path d="M8.6 11.9v1.6a1.4 1.4 0 0 0 2.8 0v-1.6" fill={ink} /></>)}
      {kind === "wow" && (<>{dot(7)}{dot(13)}<ellipse cx={10} cy={13.2} rx={1.9} ry={2.3} fill={ink} /></>)}
      {kind === "yum" && (<><path d="M5.6 8.4q1.4-1.4 2.8 0M11.6 8.4q1.4-1.4 2.8 0" {...st} /><path d="M6.4 12q3.6 3.4 7.2 0" {...st} /><path d="M12.4 13.1q1.3.9 1.9-.4" fill={ink} stroke={ink} strokeWidth={1} /></>)}
    </g>
  );
}

/**
 * A generic roulette wheel, the same for every venue: twelve segments with
 * yanyin emoji faces, a rim of lights and a hub. It turns slowly when idle; `useWheelSpin`
 * spins it with motion blur and a haptic tick per segment.
 */
export function RouletteWheel({
  tone = "light",
  size = 280,
  spinRef,
  pointerRef,
  idle = true,
  won = false,
  bare = false,
}: {
  tone?: "light" | "dark";
  size?: number;
  spinRef?: React.Ref<HTMLDivElement>;
  pointerRef?: React.Ref<HTMLSpanElement>;
  idle?: boolean;
  /** Just landed: the hub rings once. */
  won?: boolean;
  /** Icon use: no pointer above the wheel. */
  bare?: boolean;
}) {
  const dark = tone === "dark";
  const r = 100;
  const seg = (i: number) => {
    const a0 = ((i * SEG - 90 - SEG / 2) * Math.PI) / 180;
    const a1 = (((i + 1) * SEG - 90 - SEG / 2) * Math.PI) / 180;
    const R = 92;
    return `M${r},${r} L${r + R * Math.cos(a0)},${r + R * Math.sin(a0)} A${R},${R} 0 0 1 ${r + R * Math.cos(a1)},${r + R * Math.sin(a1)} Z`;
  };
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div ref={spinRef} className={`size-full ${idle ? "wheel-idle" : ""}`}>
        <svg viewBox="0 0 200 200" className="size-full" aria-hidden>
          <defs>
            <linearGradient id={`wheel-blue-${tone}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6c96ff" />
              <stop offset="55%" stopColor="#2f6bff" />
              <stop offset="100%" stopColor="#2530b0" />
            </linearGradient>
          </defs>
          <circle cx={r} cy={r} r={99} fill={dark ? "rgba(255,255,255,0.10)" : "#eef2ff"} />
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <path
              key={i}
              d={seg(i)}
              fill={i % 2 ? (dark ? "rgba(255,255,255,0.06)" : "#ffffff") : dark ? "rgba(255,255,255,0.20)" : `url(#wheel-blue-${tone})`}
              stroke={dark ? "rgba(255,255,255,0.28)" : "#dfe6ff"}
              strokeWidth={0.6}
            />
          ))}
          {FACES.map((kind, i) => {
            const onBlue = !dark && i % 2 === 0;
            return (
              <g key={i} transform={`rotate(${i * SEG} ${r} ${r})`}>
                <Face kind={kind} x={r - 10} y={19} face={dark || onBlue ? "#ffffff" : "#2f6bff"} ink={dark || onBlue ? "#2f6bff" : "#ffffff"} />
              </g>
            );
          })}
          {Array.from({ length: SEGMENTS * 2 }, (_, i) => {
            const a = ((i * SEG) / 2 - 90) * (Math.PI / 180);
            return <circle key={i} cx={r + 96 * Math.cos(a)} cy={r + 96 * Math.sin(a)} r={1.6} fill={dark ? "#ffffff" : i % 2 ? "#8fb2ff" : "#2f6bff"} opacity={i % 2 ? 0.6 : 1} />;
          })}
        </svg>
      </div>
      {/* Hub and pointer do not rotate. */}
      {won && <span aria-hidden className="wheel-ring absolute top-1/2 left-1/2 size-[22%] -translate-x-1/2 -translate-y-1/2 rounded-full" />}
      <span className={`absolute top-1/2 left-1/2 grid size-[22%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full ${dark ? "bg-white text-[#2f6bff]" : "blue-grad border-4 border-white"}`}>
        <Dices size={size * 0.09} strokeWidth={2} />
      </span>
      {/* Pointer: flicks back on every segment like a real wheel's clapper. */}
      <span aria-hidden className={`absolute -top-1.5 left-1/2 -translate-x-1/2 ${bare ? "hidden" : ""}`}>
        <span
          ref={pointerRef}
          className={`block size-0 origin-top border-x-[9px] border-t-[15px] border-x-transparent transition-transform duration-150 ease-out ${dark ? "border-t-white" : "border-t-g-ink"}`}
        />
      </span>
    </div>
  );
}

/**
 * Spin curve: a short wind-up, a long deceleration that runs a few degrees past
 * the target, then settles back (like a real wheel with a clapper).
 */
function spinCurve(t: number): number {
  const OVER = 0.0035; // overshoot, share of the whole distance
  if (t < 0.08) return 0.5 * (t / 0.08) ** 2 * 0.06; // wind-up
  if (t < 0.9) {
    const k = (t - 0.08) / 0.82;
    return 0.03 + (1 + OVER - 0.03) * (1 - Math.pow(1 - k, 3.4));
  }
  const k = (t - 0.9) / 0.1;
  return 1 + OVER * (1 - (k * k * (3 - 2 * k))); // smooth settle
}

/** Drives a RouletteWheel: fast spin, motion blur while fast, a clapper tick per segment. */
export function useWheelSpin() {
  const ref = useRef<HTMLDivElement>(null);
  const pointer = useRef<HTMLSpanElement>(null);
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState(false);
  const angle = useRef(0);
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const spin = useCallback((onDone: () => void, ms = 4600) => {
    const el = ref.current;
    if (!el) return onDone();
    // Pick up wherever the idle animation left the wheel.
    const m = getComputedStyle(el).transform;
    if (m && m !== "none") {
      const [a, b] = m.slice(7, -1).split(",").map(Number);
      angle.current = (Math.atan2(b ?? 0, a ?? 1) * 180) / Math.PI;
    }
    el.classList.remove("wheel-idle");
    const from = angle.current;
    // Land in the middle of a segment.
    const turns = 360 * 6;
    const to = Math.round((from + turns + Math.random() * 360) / SEG) * SEG + SEG / 2 - 0.0001;
    const start = performance.now();
    let prev = from;
    let lastSeg = Math.floor(from / SEG);
    setWon(false);
    setSpinning(true);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) ms = 700;
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const a = from + (to - from) * spinCurve(t);
      const speed = Math.abs(a - prev); // degrees per frame
      prev = a;
      el.style.transform = `rotate(${a}deg)`;
      el.style.filter = speed > 5 ? `blur(${Math.min(3, (speed - 5) * 0.1).toFixed(2)}px)` : "none";
      const s = Math.floor(a / SEG);
      if (s !== lastSeg) {
        lastSeg = s;
        haptic("tick");
        const p = pointer.current;
        if (p && speed < 14) {
          // The clapper visibly flicks only when the wheel is slow enough to see it.
          p.style.transitionDuration = "0ms";
          p.style.transform = `rotate(${Math.min(28, 10 + speed * 2)}deg)`;
          requestAnimationFrame(() => {
            p.style.transitionDuration = "";
            p.style.transform = "";
          });
        }
      }
      if (t < 1) raf.current = requestAnimationFrame(frame);
      else {
        angle.current = a;
        el.style.filter = "none";
        setSpinning(false);
        setWon(true);
        haptic("success");
        onDone();
      }
    };
    raf.current = requestAnimationFrame(frame);
  }, []);

  return { ref, pointer, spin, spinning, won };
}

/** Counts a money value up from zero after `delay` ms (ease-out), for result totals. */
export function CountMoney({ to, delay = 0, ms = 700, format }: { to: number; delay?: number; ms?: number; format: (n: number) => string }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      const k = Math.min(1, Math.max(0, (now - t0) / ms));
      setV(Math.round((to * (1 - Math.pow(1 - k, 3))) / 1000) * 1000);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, delay, ms]);
  return <>{format(v)}</>;
}

/* ---------------------------------------------------------------- Island */

export type IslandTone = "blue" | "green" | "orange";
export type IslandNotice = { title: string; text?: string; tone?: IslandTone; icon?: ReactNode };

const TONE: Record<IslandTone, string> = {
  blue: "blue-grad",
  green: "bg-[#22c55e] text-white",
  orange: "bg-[#ff8a3d] text-white",
};

/**
 * Notifications as a Dynamic Island: a small black capsule at the top centre
 * that grows out of a dot, shows a coloured circle and the title, then folds
 * back. Every action in the guest and waiter apps reports through it.
 */
export function Island({ notice }: { notice: IslandNotice | null }) {
  // Keep the last notice on screen while it folds away.
  const [shown, setShown] = useState<IslandNotice | null>(notice);
  const [prev, setPrev] = useState<IslandNotice | null>(notice);
  if (notice !== prev) {
    setPrev(notice);
    if (notice) setShown(notice);
  }
  const leaving = !notice && !!shown;
  useEffect(() => {
    if (!leaving) return;
    const id = setTimeout(() => setShown(null), 260);
    return () => clearTimeout(id);
  }, [leaving]);
  if (!shown) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex justify-center pt-[max(10px,env(safe-area-inset-top))]">
      <div
        key={shown.title}
        role="status"
        className={`${leaving ? "island-out" : "island-in"} flex h-11 max-w-[88vw] min-w-[34vw] items-center gap-2.5 rounded-full bg-[#0b0b0f] py-1.5 pr-4 pl-1.5 text-white`}
      >
        <span className={`island-content grid size-8 shrink-0 place-items-center rounded-full ${TONE[shown.tone ?? "blue"]}`}>{shown.icon}</span>
        <span className="island-content min-w-0 truncate text-[14px] font-semibold">{shown.title}</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Live order island */

const LW = 290;
const LH = 52;

/** Point at fraction f (0..1) along the capsule outline, in SVG rect path order (from the top-left start of the top edge, clockwise). */
function stadiumPoint(f: number): [number, number] {
  const w = LW - 2;
  const h = LH - 2;
  const r = h / 2;
  const straight = w - 2 * r;
  const arc = Math.PI * r;
  const total = 2 * straight + 2 * arc;
  let d = f * total;
  const x0 = 1;
  const y0 = 1;
  if (d <= straight) return [x0 + r + d, y0];
  d -= straight;
  if (d <= arc) {
    const a = -Math.PI / 2 + d / r;
    return [x0 + w - r + r * Math.cos(a), y0 + r + r * Math.sin(a)];
  }
  d -= arc;
  if (d <= straight) return [x0 + w - r - d, y0 + h];
  d -= straight;
  const a = Math.PI / 2 + d / r;
  return [x0 + r + r * Math.cos(a), y0 + r + r * Math.sin(a)];
}

/**
 * The bottom Dynamic Island for a live order: a black capsule whose outline
 * is a fuse in our blue gradient. As the order cooks the fuse burns down, a
 * glowing spark marking the tip. No percentages, only the story in the middle.
 */
export function LiveIsland({ label, progress, done, onClick, bottom }: { label: string; progress: number; done?: boolean; onClick: () => void; bottom: string }) {
  const remaining = done ? 0 : Math.max(0.02, 1 - progress);
  const tip = stadiumPoint(remaining);
  return (
    <button
      onClick={() => {
        haptic("light");
        onClick();
      }}
      aria-label={label}
      className="island-in press fixed left-1/2 z-40 -translate-x-1/2"
      style={{ bottom, width: LW, height: LH }}
    >
      <span className="absolute inset-0 rounded-full bg-[#0b0b0f]" />
      <svg viewBox={`-2 -2 ${LW + 4} ${LH + 4}`} className="pointer-events-none absolute -inset-[2px] overflow-visible" width={LW + 4} height={LH + 4} aria-hidden>
        <defs>
          <linearGradient id="fuse" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8fb2ff" />
            <stop offset="50%" stopColor="#2f6bff" />
            <stop offset="100%" stopColor="#6c96ff" />
          </linearGradient>
        </defs>
        {/* track */}
        <rect x={1} y={1} width={LW - 2} height={LH - 2} rx={(LH - 2) / 2} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
        {/* the fuse: starts at the top centre, burns back toward it */}
        <rect
          x={1}
          y={1}
          width={LW - 2}
          height={LH - 2}
          rx={(LH - 2) / 2}
          fill="none"
          stroke={done ? "#22c55e" : "url(#fuse)"}
          strokeWidth={3}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${remaining * 100} 100`}
          style={{ transition: "stroke-dasharray 1s linear, stroke 0.4s" }}
        />
        {!done && (
          <g style={{ transform: `translate(${tip[0]}px, ${tip[1]}px)`, transition: "transform 1s linear" }}>
            <circle r={7} fill="#8fb2ff" opacity={0.35} className="fuse-glow" />
            <circle r={3} fill="#ffffff" />
          </g>
        )}
      </svg>
      <span className="relative flex h-full items-center justify-center gap-2 px-6 text-[14px] font-semibold text-white">
        {done ? <span className="size-2 rounded-full bg-[#22c55e]" /> : <span className="size-2 animate-pulse rounded-full bg-[#8fb2ff]" />}
        <span key={label} className="island-content truncate">
          {label}
        </span>
      </span>
    </button>
  );
}
