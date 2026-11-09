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
}: {
  tone?: "light" | "dark";
  size?: number;
  spinRef?: React.Ref<HTMLDivElement>;
  pointerRef?: React.Ref<HTMLSpanElement>;
  idle?: boolean;
  /** Just landed: the hub rings once. */
  won?: boolean;
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
      <span aria-hidden className="absolute -top-1.5 left-1/2 -translate-x-1/2">
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
