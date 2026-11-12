"use client";

import { useEffect, useRef } from "react";
import { haptic } from "@/lib/haptics";

/*
 * iOS-style wheel: a column you flick; it snaps to a value, ticks the phone on
 * every value that passes the centre, and the rows away from the centre tilt
 * back and fade like a drum. Native scroll + snap, so momentum feels right on
 * every phone; the tilt is written straight to the DOM each frame.
 */
const ROW = 40;

function Wheel({ values, value, onChange, format = (v) => String(v), width = 72, label }: { values: number[]; value: number; onChange: (v: number) => void; format?: (v: number) => string; width?: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef(values.indexOf(value));
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Start on the current value (and follow outside changes, e.g. quick picks).
  useEffect(() => {
    const el = ref.current;
    const i = values.indexOf(value);
    if (!el || i < 0) return;
    if (Math.round(el.scrollTop / ROW) !== i) el.scrollTo({ top: i * ROW, behavior: last.current < 0 ? "auto" : "smooth" });
    last.current = i;
  }, [value, values]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const paint = () => {
      raf = 0;
      const pos = el.scrollTop / ROW;
      el.querySelectorAll<HTMLElement>("[data-row]").forEach((r, i) => {
        const d = i - pos;
        const a = Math.min(1, Math.abs(d) / 3);
        r.style.transform = `perspective(300px) rotateX(${(-d * 18).toFixed(1)}deg) scale(${(1 - a * 0.12).toFixed(3)})`;
        r.style.opacity = (1 - a * 0.75).toFixed(2);
      });
      const i = Math.max(0, Math.min(values.length - 1, Math.round(pos)));
      if (i !== last.current) {
        last.current = i;
        haptic("tick");
      }
      clearTimeout(settle.current);
      settle.current = setTimeout(() => {
        const j = Math.max(0, Math.min(values.length - 1, Math.round(el.scrollTop / ROW)));
        if (values[j] !== value) onChange(values[j]!);
      }, 120);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    paint();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle.current);
      el.removeEventListener("scroll", onScroll);
    };
  }, [values, value, onChange]);

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={label}
      className="no-scrollbar relative snap-y snap-mandatory overflow-y-auto overscroll-contain"
      style={{ width, height: ROW * 5, paddingBlock: ROW * 2 }}
    >
      {values.map((v) => (
        <div
          key={v}
          data-row
          role="option"
          aria-selected={v === value}
          onClick={() => ref.current?.scrollTo({ top: values.indexOf(v) * ROW, behavior: "smooth" })}
          className="grid snap-center place-items-center text-[26px] font-semibold tabular-nums will-change-transform"
          style={{ height: ROW }}
        >
          {format(v)}
        </div>
      ))}
    </div>
  );
}

/** Hours and minutes on two wheels, a highlight bar across the middle, like the iPhone alarm. */
export function TimeWheel({ value, onChange, from = 10, to = 23, step = 5 }: { value: string; onChange: (v: string) => void; from?: number; to?: number; step?: number }) {
  const [h, m] = value.split(":").map(Number) as [number, number];
  const hours = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const minutes = Array.from({ length: 60 / step }, (_, i) => i * step);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="relative flex items-center justify-center gap-1 rounded-[24px] bg-g-fill py-1 [mask-image:linear-gradient(transparent,#000_22%,#000_78%,transparent)]">
      <span aria-hidden className="pointer-events-none absolute inset-x-3 top-1/2 h-10 -translate-y-1/2 rounded-[14px] bg-white" />
      <span className="relative">
        <Wheel label="Hours" values={hours} value={hours.includes(h) ? h : hours[0]!} onChange={(nh) => onChange(`${pad(nh)}:${pad(m)}`)} format={pad} />
      </span>
      <span className="relative pb-0.5 text-[26px] font-semibold">:</span>
      <span className="relative">
        <Wheel label="Minutes" values={minutes} value={minutes.includes(m) ? m : 0} onChange={(nm) => onChange(`${pad(h)}:${pad(nm)}`)} format={pad} />
      </span>
    </div>
  );
}
