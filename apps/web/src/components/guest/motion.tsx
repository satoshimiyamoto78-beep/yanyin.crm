"use client";

import { CakeSlice, Coffee, CupSoda, Dices, Flame, Salad, Soup, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ElementType, type ReactNode } from "react";
import { haptic } from "@/lib/haptics";

/* ---------------------------------------------------------------- Reveal */

let bootAt = 0;
/** How long the first screen stays in its blurred "loading" state. */
const BOOT_MS = 650;

/**
 * Focus-pull reveal: the block renders blurred and breathing while data is
 * loading, then pulls into focus once it is on screen. Remount it (change its
 * `key`) to replay the effect after the data changes.
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
  const ref = useRef<HTMLElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const now = performance.now();
    if (!bootAt) bootAt = now;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        const wait = Math.max(0, bootAt + BOOT_MS - performance.now()) + delay;
        timer = setTimeout(() => setReady(true), Math.max(90, wait));
      },
      { rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [delay]);

  return (
    <Tag ref={ref} aria-busy={!ready} className={`fx ${ready ? "fx-in" : "fx-load"} ${className}`}>
      {children}
    </Tag>
  );
}

/* ---------------------------------------------------------------- Roulette wheel */

const SEGMENTS = 12;
const SEG = 360 / SEGMENTS;
const GLYPHS: LucideIcon[] = [UtensilsCrossed, Coffee, Soup, CakeSlice, Flame, CupSoda, Salad, Coffee, UtensilsCrossed, CakeSlice, Soup, CupSoda];

/**
 * A generic roulette wheel, the same for every venue: twelve segments with
 * food glyphs, a rim of lights and a hub. It turns slowly when idle; `useWheelSpin`
 * spins it with motion blur and a haptic tick per segment.
 */
export function RouletteWheel({
  tone = "light",
  size = 280,
  spinRef,
  idle = true,
}: {
  tone?: "light" | "dark";
  size?: number;
  spinRef?: React.Ref<HTMLDivElement>;
  idle?: boolean;
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
          {GLYPHS.map((Icon, i) => (
            <g key={i} transform={`rotate(${i * SEG} ${r} ${r})`}>
              <Icon x={r - 7} y={22} width={14} height={14} strokeWidth={2} color={dark ? "#ffffff" : i % 2 ? "#2f6bff" : "#ffffff"} />
            </g>
          ))}
          {Array.from({ length: SEGMENTS * 2 }, (_, i) => {
            const a = ((i * SEG) / 2 - 90) * (Math.PI / 180);
            return <circle key={i} cx={r + 96 * Math.cos(a)} cy={r + 96 * Math.sin(a)} r={1.6} fill={dark ? "#ffffff" : i % 2 ? "#8fb2ff" : "#2f6bff"} opacity={i % 2 ? 0.6 : 1} />;
          })}
        </svg>
      </div>
      {/* Hub and pointer do not rotate. */}
      <span className={`absolute top-1/2 left-1/2 grid size-[22%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full ${dark ? "bg-white text-[#2f6bff]" : "blue-grad border-4 border-white"}`}>
        <Dices size={size * 0.09} strokeWidth={2} />
      </span>
      <span
        aria-hidden
        className={`absolute -top-1 left-1/2 size-0 -translate-x-1/2 border-x-[9px] border-t-[14px] border-x-transparent ${dark ? "border-t-white" : "border-t-g-ink"}`}
      />
    </div>
  );
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

/** Drives a RouletteWheel: fast spin, motion blur while fast, one tick per segment. */
export function useWheelSpin() {
  const ref = useRef<HTMLDivElement>(null);
  const [spinning, setSpinning] = useState(false);
  const angle = useRef(0);
  const raf = useRef(0);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const spin = useCallback((onDone: () => void, ms = 3400) => {
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
    const to = from + 360 * 5 + Math.random() * 360;
    const start = performance.now();
    let prev = from;
    let lastSeg = Math.floor(from / SEG);
    setSpinning(true);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) ms = 600;
    const frame = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const a = from + (to - from) * easeOut(t);
      const speed = a - prev; // degrees per frame
      prev = a;
      el.style.transform = `rotate(${a}deg)`;
      el.style.filter = speed > 4 ? `blur(${Math.min(3.5, (speed - 4) * 0.12).toFixed(2)}px)` : "none";
      const s = Math.floor(a / SEG);
      if (s !== lastSeg) {
        lastSeg = s;
        haptic("tick");
      }
      if (t < 1) raf.current = requestAnimationFrame(frame);
      else {
        angle.current = a;
        el.style.filter = "none";
        setSpinning(false);
        haptic("success");
        onDone();
      }
    };
    raf.current = requestAnimationFrame(frame);
  }, []);

  return { ref, spin, spinning };
}
