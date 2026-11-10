"use client";

import { ChevronsRight, type LucideIcon } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { haptic } from "@/lib/haptics";

/*
 * Slide to confirm: drag the round knob from left to right to do something
 * that should not happen by accident (sending an order to the kitchen). Past
 * 85% it fires with a firm haptic; let go earlier and it springs back. The
 * label fades as the knob covers it. Keyboard: Enter / Space confirms.
 */
export function SlideToConfirm({ label, aside, onConfirm, disabled = false, icon: Icon = ChevronsRight }: { label: ReactNode; aside?: ReactNode; onConfirm: () => void; disabled?: boolean; icon?: LucideIcon }) {
  const track = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; max: number } | null>(null);
  const [x, setX] = useState(0);
  const [done, setDone] = useState(false);
  const KNOB = 48;
  const max = () => (track.current ? track.current.clientWidth - KNOB - 8 : 1);
  const finish = () => {
    setDone(true);
    setX(max());
    haptic("success");
    onConfirm();
    setTimeout(() => {
      setDone(false);
      setX(0);
    }, 700);
  };
  const share = x / Math.max(1, max());
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
      className={`relative h-14 w-full touch-none overflow-hidden rounded-full select-none ${disabled ? "bg-g-fill-2 text-g-faint" : "blue-grad"}`}
    >
      {/* Progress glow behind the knob. */}
      <span className="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-white/15" style={{ width: x + KNOB + 8 }} />
      <span className="pointer-events-none absolute inset-0 flex items-center justify-between pr-6 pl-[68px] text-[16px] font-semibold transition-opacity" style={{ opacity: 1 - share * 1.4 }}>
        <span className="truncate">{label}</span>
        {aside && <span className="shrink-0 tabular-nums">{aside}</span>}
      </span>
      <span
        onPointerDown={(e) => {
          if (disabled || done) return;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          start.current = { x: e.clientX - x, max: max() };
          haptic("tick");
        }}
        onPointerMove={(e) => {
          const s = start.current;
          if (!s) return;
          setX(Math.max(0, Math.min(s.max, e.clientX - s.x)));
        }}
        onPointerUp={() => {
          const s = start.current;
          start.current = null;
          if (!s) return;
          if (x / s.max > 0.85) finish();
          else setX(0);
        }}
        onPointerCancel={() => {
          start.current = null;
          setX(0);
        }}
        className={`absolute top-1 left-1 grid place-items-center rounded-full bg-[#fff] text-g-blue ${start.current ? "" : "transition-transform duration-300 ease-[cubic-bezier(0.22,1.2,0.36,1)]"} ${disabled ? "opacity-60" : "cursor-grab active:cursor-grabbing"}`}
        style={{ width: KNOB, height: KNOB, transform: `translateX(${x}px)` }}
      >
        <Icon size={22} strokeWidth={2.4} />
      </span>
    </div>
  );
}
