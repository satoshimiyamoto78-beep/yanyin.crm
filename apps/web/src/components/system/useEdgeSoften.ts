"use client";

import { useEffect, type RefObject } from "react";

/*
 * Items of a horizontal scroller soften on their own as they reach its edges:
 * the part of an item already past the screen edge decides how much it blurs
 * (up to 3 px) and fades (to 40%); nothing is laid over them. Items on the page
 * gutter, or just touching the edge, stay sharp. Styles
 * are written straight to the DOM each frame; reduced motion keeps them plain.
 */
const EDGE = 8; // the softening starts this close to the screen edge

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
        // Only the share of the item already past the edge counts: an item that just
        // touches the edge stays sharp; one mostly off screen is softly blurred and faded.
        const outL = box.left + EDGE - r.left;
        const outR = r.right - (box.right - EDGE);
        const t = Math.max(0, Math.min(1, Math.max(outL, outR) / r.width));
        if (t <= 0.02) {
          c.style.filter = "";
          c.style.opacity = "";
          return;
        }
        const e = Math.pow(t, 1.6);
        c.style.filter = `blur(${(e * 3).toFixed(2)}px)`;
        c.style.opacity = (1 - e * 0.6).toFixed(3);
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
