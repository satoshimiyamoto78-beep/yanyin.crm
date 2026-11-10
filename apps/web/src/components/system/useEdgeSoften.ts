"use client";

import { useEffect, type RefObject } from "react";

/*
 * Items of a horizontal scroller soften on their own as they reach its edges:
 * they blur and turn transparent, with nothing laid over them (no overlay, no
 * gradient band). At rest every item on the page gutter is fully sharp. Styles
 * are written straight to the DOM each frame; reduced motion keeps them plain.
 */
const ZONE = 44; // px from each edge where softening happens

export function useEdgeSoften(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const paint = () => {
      raf = 0;
      const box = el.getBoundingClientRect();
      Array.from(el.children).forEach((node) => {
        const c = node as HTMLElement;
        const r = c.getBoundingClientRect();
        if (!r.width) return;
        // How far the item has slid past the soft zone on either side, 0…1.
        const left = (box.left + ZONE - r.left) / (ZONE + r.width * 0.6);
        const right = (r.right - (box.right - ZONE)) / (ZONE + r.width * 0.6);
        const t = Math.max(0, Math.min(1, Math.max(left, right)));
        if (t <= 0.001) {
          c.style.filter = "";
          c.style.opacity = "";
          c.style.transform = "";
          return;
        }
        const e = t * t * (3 - 2 * t); // smooth in and out
        c.style.filter = `blur(${(e * 7).toFixed(2)}px)`;
        c.style.opacity = (1 - e * 0.9).toFixed(3);
        c.style.transform = `scale(${(1 - e * 0.06).toFixed(3)})`;
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
