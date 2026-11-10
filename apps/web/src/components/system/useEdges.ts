"use client";

import { useEffect, type RefObject } from "react";

/** Marks which sides of a horizontal scroller have more content (for `.edge-fade`). */
export function useEdges(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const mark = () => {
      raf = 0;
      const max = el.scrollWidth - el.clientWidth;
      el.dataset.moreL = String(el.scrollLeft > 2);
      el.dataset.moreR = String(el.scrollLeft < max - 2);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(mark);
    };
    mark();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ref]);
}
