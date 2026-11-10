"use client";

import { useEffect, type RefObject } from "react";

/*
 * Items of a horizontal scroller dissolve into the screen edge, iOS style:
 * only the slice of an item inside the last FADE pixels before the edge fades
 * out (a mask on the item itself, lined up with the edge), the rest stays
 * crisp. Nothing is laid over the content, nothing blurs, at rest nothing
 * changes. Written straight to the DOM each frame.
 */
const FADE = 28;

export function useEdgeSoften(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const paint = () => {
      raf = 0;
      const box = el.getBoundingClientRect();
      Array.from(el.children).forEach((node) => {
        const c = node as HTMLElement;
        const r = c.getBoundingClientRect();
        if (!r.width) return;
        // Where the fade zones fall inside this item, in its own pixels.
        const rFrom = box.right - FADE - r.left; // fade starts here (right edge)
        const lTo = box.left + FADE - r.left; // fade ends here (left edge)
        const right = rFrom < r.width;
        const left = lTo > 0;
        if (!right && !left) {
          c.style.maskImage = "";
          c.style.webkitMaskImage = "";
          return;
        }
        const stops = [
          left ? `transparent ${(lTo - FADE).toFixed(1)}px, #000 ${lTo.toFixed(1)}px` : "#000 0px",
          right ? `#000 ${rFrom.toFixed(1)}px, transparent ${(rFrom + FADE).toFixed(1)}px` : "#000 100%",
        ];
        const m = `linear-gradient(90deg, ${stops.join(", ")})`;
        c.style.maskImage = m;
        c.style.webkitMaskImage = m;
      });
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
  }, [ref]);
}
