"use client";

import { ChevronsRight, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { haptic } from "@/lib/haptics";

/*
 * Slide to confirm: drag the round knob from left to right to do something
 * that should not happen by accident (sending an order to the kitchen). Past
 * 60% it fires with a firm haptic; let go earlier and it springs back. The
 * label fades as the knob covers it. Keyboard: Enter / Space confirms.
 *
 * Built for thumbs: the drag can start anywhere on the left half of the bar,
 * not only on the knob; a quick flick counts; the page never scrolls or
 * swipes away under the finger (touch events are claimed natively); a plain
 * tap nudges the knob to show which way to slide.
 */
export function SlideToConfirm({ label, aside, onConfirm, disabled = false, icon: Icon = ChevronsRight }: { label: ReactNode; aside?: ReactNode; onConfirm: () => void; disabled?: boolean; icon?: LucideIcon }) {
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ from: number; max: number; x: number; t: number; v: number; moved: boolean } | null>(null);
  const [x, setX] = useState(0);
  const [live, setLive] = useState(false);
  const [done, setDone] = useState(false);
  // Travel width, measured on touch, for fading the label.
  const [span, setSpan] = useState(280);
  const KNOB = 48;
  const max = () => (track.current ? Math.max(1, track.current.clientWidth - KNOB - 8) : 1);

  // Latest props for the native listeners below.
  const state = useRef({ disabled, done, onConfirm });
  useEffect(() => {
    state.current = { disabled, done, onConfirm };
  });

  const finish = () => {
    setDone(true);
    setX(max());
    haptic("success");
    state.current.onConfirm();
    setTimeout(() => {
      setDone(false);
      setX(0);
    }, 700);
  };
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  });

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const point = (e: TouchEvent | MouseEvent) => ("touches" in e ? (e.touches[0] ?? e.changedTouches[0])!.clientX : e.clientX);
    const down = (e: TouchEvent | MouseEvent) => {
      if (state.current.disabled || state.current.done) return;
      const box = el.getBoundingClientRect();
      // Start on the knob or anywhere on the left half of the bar.
      if (point(e) - box.left > Math.max(KNOB + 16, box.width * 0.5)) return;
      drag.current = { from: point(e), max: Math.max(1, box.width - KNOB - 8), x: 0, t: performance.now(), v: 0, moved: false };
      setSpan(drag.current.max);
      setLive(true);
      haptic("tick");
      if ("touches" in e) return;
      e.preventDefault();
      window.addEventListener("mousemove", move);
      window.addEventListener("mouseup", up);
    };
    const move = (e: TouchEvent | MouseEvent) => {
      const d = drag.current;
      if (!d) return;
      // Ours now: no page scroll, no back-swipe, no sheet drag.
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      const nx = Math.max(0, Math.min(d.max, point(e) - d.from));
      const now = performance.now();
      d.v = (nx - d.x) / Math.max(1, now - d.t);
      d.t = now;
      d.x = nx;
      if (nx > 4) d.moved = true;
      setX(nx);
    };
    const up = () => {
      const d = drag.current;
      drag.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      if (!d) return;
      setLive(false);
      const far = d.x / d.max;
      if (far > 0.6 || (far > 0.3 && d.v > 0.6)) finishRef.current();
      else if (!d.moved) {
        // A tap: nudge the knob to show the gesture.
        setX(Math.min(d.max, 36));
        setTimeout(() => setX(0), 220);
      } else setX(0);
    };
    el.addEventListener("touchstart", down, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", up);
    el.addEventListener("touchcancel", up);
    el.addEventListener("mousedown", down);
    return () => {
      el.removeEventListener("touchstart", down);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", up);
      el.removeEventListener("touchcancel", up);
      el.removeEventListener("mousedown", down);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  const share = x / span;
  return (
    <div
      ref={track}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={typeof label === "string" ? label : "Slide to confirm"}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          finish();
        }
      }}
      style={{ touchAction: "none", WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
      className={`relative h-14 w-full overflow-hidden rounded-full select-none ${disabled ? "bg-g-fill-2 text-g-faint" : "blue-grad cursor-grab active:cursor-grabbing"}`}
    >
      {/* Progress glow behind the knob. */}
      <span className={`pointer-events-none absolute inset-y-0 left-0 rounded-full bg-white/15 ${live ? "" : "transition-[width] duration-300"}`} style={{ width: x + KNOB + 8 }} />
      <span className="pointer-events-none absolute inset-0 flex items-center justify-between pr-6 pl-[68px] text-[16px] font-semibold" style={{ opacity: Math.max(0, 1 - share * 1.6) }}>
        <span className="truncate">{label}</span>
        {aside && <span className="shrink-0 tabular-nums">{aside}</span>}
      </span>
      <span
        className={`pointer-events-none absolute top-1 left-1 grid place-items-center rounded-full bg-[#fff] text-g-blue ${live ? "" : "transition-transform duration-300 ease-[cubic-bezier(0.22,1.2,0.36,1)]"} ${disabled ? "opacity-60" : ""}`}
        style={{ width: KNOB, height: KNOB, transform: `translateX(${x}px)` }}
      >
        <Icon size={22} strokeWidth={2.4} />
      </span>
    </div>
  );
}
