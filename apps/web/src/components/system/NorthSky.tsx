"use client";

import { useEffect, useRef } from "react";

/**
 * The yanyin header sky: northern lights in the Nomad blue that dissolve into
 * the page. Shared by the guest menu and the waiter app. Place it as the first
 * child of a `relative isolate` header; it pauses while off screen.
 */
export function NorthSky() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => el.classList.toggle("is-off", !e?.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="north-sky" aria-hidden>
      <span className="ns-glow ns-a" />
      <span className="ns-glow ns-b" />
      <span className="ns-glow ns-c" />
      <span className="ns-ribbon ns-r1" />
      <span className="ns-ribbon ns-r2" />
    </div>
  );
}
