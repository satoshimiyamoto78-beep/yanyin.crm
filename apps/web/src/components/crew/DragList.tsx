"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { haptic } from "@/lib/haptics";

/*
 * Press-and-hold to drag, iOS / One UI style.
 *
 * Hold an item (~280 ms) and it lifts; drag it up or down and the others slide
 * out of the way; let go and it drops into place. A quick swipe still scrolls
 * the page. An element marked `data-grip` starts the drag at once (a handle).
 * Elements marked `data-hold` keep their own long press (peeks).
 */
export function DragList<T extends { id: string }>({
  items,
  onReorder,
  render,
  onLongPress,
  enabled = true,
  holdMs = 280,
  className = "",
}: {
  items: T[];
  onReorder: (items: T[]) => void;
  render: (item: T, state: { dragging: boolean }) => ReactNode;
  /** Called when a hold starts a drag (to enter an edit mode). */
  onLongPress?: () => void;
  enabled?: boolean;
  /** How long to hold before a drag starts. Entering an edit mode wants a long, deliberate hold. */
  holdMs?: number;
  className?: string;
}) {
  const refs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [drag, setDrag] = useState<{ id: string; i: number; h: number; dy: number; target: number } | null>(null);
  // Right after a drop the DOM order already matches the picture: skip one frame of transitions.
  const [settling, setSettling] = useState(false);
  // The item being held (before the drag starts): it sinks slowly so the hold is felt.
  const [holding, setHolding] = useState<string | null>(null);
  const ticks = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stopTicks = () => {
    ticks.current.forEach(clearTimeout);
    ticks.current = [];
  };
  useEffect(() => {
    if (!settling) return;
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setSettling(false)));
    return () => cancelAnimationFrame(r);
  }, [settling]);
  const live = useRef<{ id: string; i: number; y0: number; rects: { top: number; h: number }[]; target: number; active: boolean; timer?: ReturnType<typeof setTimeout>; pointer: number } | null>(null);

  // While dragging, the page must not scroll under the finger.
  useEffect(() => {
    const stop = (e: TouchEvent) => {
      if (live.current?.active) e.preventDefault();
    };
    document.addEventListener("touchmove", stop, { passive: false });
    return () => document.removeEventListener("touchmove", stop);
  }, []);

  const measure = () =>
    items.map((it) => {
      const r = refs.current.get(it.id)!.getBoundingClientRect();
      return { top: r.top, h: r.height };
    });

  const begin = (id: string, i: number, y: number, pointer: number) => {
    stopTicks();
    setHolding(null);
    const rects = measure();
    live.current = { id, i, y0: y, rects, target: i, active: true, pointer };
    haptic("light");
    onLongPress?.();
    setDrag({ id, i, h: rects[i]!.h, dy: 0, target: i });
  };

  const down = (e: React.PointerEvent, id: string, i: number) => {
    if (!enabled || e.button > 0) return;
    const t = e.target as Element;
    if (t.closest("[data-nodrag]")) return;
    if (!t.closest("[data-grip]") && t.closest("[data-hold]")) return;
    const y = e.clientY;
    const pointer = e.pointerId;
    if (t.closest("[data-grip]")) {
      (e.currentTarget as HTMLElement).setPointerCapture?.(pointer);
      begin(id, i, y, pointer);
      return;
    }
    const timer = setTimeout(() => begin(id, i, y, pointer), holdMs);
    // A long hold ticks along the way (every half second), so the wait is felt, not guessed.
    if (holdMs >= 1000) for (let at = 500; at < holdMs; at += 500) ticks.current.push(setTimeout(() => haptic("tick"), at));
    setHolding(id);
    live.current = { id, i, y0: y, rects: [], target: i, active: false, timer, pointer };
  };

  const move = (e: React.PointerEvent) => {
    const l = live.current;
    if (!l) return;
    if (!l.active) {
      if (Math.abs(e.clientY - l.y0) > 8) {
        clearTimeout(l.timer);
        stopTicks();
        setHolding(null);
        live.current = null; // it was a scroll
      }
      return;
    }
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const dy = e.clientY - l.y0;
    const me = l.rects[l.i]!;
    const centre = me.top + me.h / 2 + dy;
    let target = 0;
    l.rects.forEach((r, j) => {
      if (j !== l.i && centre > r.top + r.h / 2) target++;
    });
    if (target !== l.target) {
      l.target = target;
      haptic("tick");
    }
    setDrag({ id: l.id, i: l.i, h: me.h, dy, target });
  };

  const up = () => {
    const l = live.current;
    live.current = null;
    stopTicks();
    setHolding(null);
    if (!l) return;
    clearTimeout(l.timer);
    if (!l.active) return;
    if (l.target !== l.i) {
      const next = [...items];
      const [it] = next.splice(l.i, 1);
      next.splice(l.target, 0, it!);
      setSettling(true);
      onReorder(next);
      haptic("success");
    }
    setDrag(null);
  };

  const shiftOf = (j: number) => {
    if (!drag) return 0;
    const { i, h, target } = drag;
    if (j === i) return drag.dy;
    if (i < target && j > i && j <= target) return -h;
    if (target < i && j >= target && j < i) return h;
    return 0;
  };

  return (
    <div className={className}>
      {items.map((it, j) => {
        const dragging = drag?.id === it.id;
        return (
          <div
            key={it.id}
            ref={(el) => {
              if (el) refs.current.set(it.id, el);
              else refs.current.delete(it.id);
            }}
            onPointerDown={(e) => down(e, it.id, j)}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            className="relative [display:flow-root]"
            style={{
              transform: holding === it.id ? "scale(0.96)" : `translateY(${shiftOf(j)}px)${dragging ? " scale(1.02)" : ""}`,
              transition: holding === it.id ? `transform ${holdMs}ms cubic-bezier(0.3,0,0.2,1)` : dragging || settling ? "none" : "transform 0.32s cubic-bezier(0.22,1,0.36,1)",
              zIndex: dragging ? 20 : undefined,
              touchAction: drag ? "none" : undefined,
            }}
          >
            {render(it, { dragging })}
          </div>
        );
      })}
    </div>
  );
}
