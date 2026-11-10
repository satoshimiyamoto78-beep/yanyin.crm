"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { haptic } from "@/lib/haptics";

/*
 * Telegram-style hero swiper: one big illustration in the centre, neighbours
 * smaller and dimmer at the sides. Swipe or tap a neighbour to move; it snaps,
 * ticks once and reports the new centre. Scale and fade are written straight
 * to the DOM each frame from cached positions (no layout reads, no renders).
 */
export function HeroCarousel<T extends { id: string }>({
  items,
  index,
  onIndex,
  render,
  height = 200,
}: {
  items: T[];
  index: number;
  onIndex: (i: number) => void;
  render: (item: T) => ReactNode;
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(index);
  const atRef = useRef(index);
  const ITEM = 0.46; // share of the width one item takes

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const paint = () => {
      raf = 0;
      const w = el.clientWidth;
      const step = w * ITEM;
      const pos = el.scrollLeft / step;
      el.querySelectorAll<HTMLElement>("[data-slide]").forEach((node, i) => {
        const c = node as HTMLElement;
        const d = Math.min(1.5, Math.abs(i - pos));
        c.style.transform = `scale(${(1 - d * 0.38).toFixed(3)})`;
        c.style.opacity = (1 - d * 0.55).toFixed(2);
      });
      const i = Math.max(0, Math.min(items.length - 1, Math.round(pos)));
      if (i !== atRef.current) {
        atRef.current = i;
        setAt(i);
        onIndex(i);
        haptic("tick");
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    paint();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [items.length, onIndex]);

  // Outside changes (a grid tap) glide the carousel to that item.
  useEffect(() => {
    const el = ref.current;
    if (!el || index === atRef.current) return;
    el.scrollTo({ left: index * el.clientWidth * ITEM, behavior: "smooth" });
  }, [index]);

  const go = (i: number) => {
    const el = ref.current;
    if (el) el.scrollTo({ left: i * el.clientWidth * ITEM, behavior: "smooth" });
  };

  return (
    <div>
      <div
        ref={ref}
        className="no-scrollbar -mx-5 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        style={{ height }}
      >
        {/* Spacers let the first and last items reach the centre. */}
        <span aria-hidden className="shrink-0" style={{ width: `${((1 - ITEM) / 2) * 100}%` }} />
        {items.map((it, i) => (
          <button
            key={it.id}
            data-slide
            onClick={() => i !== atRef.current && go(i)}
            className="grid shrink-0 snap-center place-items-center will-change-transform"
            style={{ width: `${ITEM * 100}%` }}
            aria-current={i === at}
          >
            {render(it)}
          </button>
        ))}
        <span aria-hidden className="shrink-0" style={{ width: `${((1 - ITEM) / 2) * 100}%` }} />
      </div>
      <div className="mt-2 flex justify-center gap-1.5">
        {items.map((it, i) => (
          <span key={it.id} className={`h-1.5 rounded-full transition-all duration-300 ${i === at ? "w-5 bg-g-ink" : "w-1.5 bg-g-fill-2"}`} />
        ))}
      </div>
    </div>
  );
}
