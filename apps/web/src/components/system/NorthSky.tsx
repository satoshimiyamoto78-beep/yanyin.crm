"use client";

import { useEffect, useRef } from "react";

/*
 * The yanyin header sky: a clean azure that deepens to royal blue at the top
 * and thins to a pale horizon before it dissolves into the page.
 *
 * Quality comes from three things. The base is one long vertical gradient with
 * many stops, so there is no visible band. Colour moves through it as three
 * very large, very soft glows (deep blue, cyan, a pale bloom) that drift
 * slowly, never as distinct blobs. And the sky ends by an eased mask in CSS,
 * so the page shows through evenly in light and dark instead of painted fog.
 * A fine static grain on top hides 8-bit banding on phone screens.
 *
 * Drawn on a small canvas the browser stretches (the stretch is the blur),
 * ~15 fps (the drift is slow enough that more frames look the same), paused off screen and in background tabs, one still frame for
 * reduced motion.
 */

type Rgba = [number, number, number, number];
type Scheme = { stops: [number, string][]; deep: Rgba; cyan: Rgba; bloom: Rgba };

const LIGHT: Scheme = {
  stops: [
    [0, "#1f4fe8"],
    [0.22, "#2a63f6"],
    [0.45, "#3a82ff"],
    [0.66, "#58a6ff"],
    [0.84, "#86c6ff"],
    [1, "#b4dcff"],
  ],
  deep: [24, 60, 215, 0.6],
  cyan: [70, 200, 255, 0.42],
  bloom: [225, 242, 255, 0.34],
};
const DARK: Scheme = {
  stops: [
    [0, "#1437c4"],
    [0.25, "#1b4ad6"],
    [0.5, "#2060d8"],
    [0.72, "#2468c4"],
    [0.9, "#235a9e"],
    [1, "#1f4a7e"],
  ],
  deep: [10, 28, 150, 0.6],
  cyan: [40, 150, 235, 0.36],
  bloom: [130, 185, 255, 0.22],
};

export function NorthSky() {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = wrap.current;
    const canvas = cv.current;
    const ctx = canvas?.getContext("2d");
    if (!el || !canvas || !ctx) return;
    const W = 144;
    const H = 180;
    canvas.width = W;
    canvas.height = H;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let visible = true;
    let raf = 0;
    let last = 0;
    const t0 = performance.now();

    // A glow with a long, eased falloff: no edge the eye can find.
    const glow = (x: number, y: number, rx: number, ry: number, [r, g, b, a]: Rgba) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, ry / rx);
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      const c = (k: number) => `rgba(${r},${g},${b},${(a * k).toFixed(3)})`;
      gr.addColorStop(0, c(1));
      gr.addColorStop(0.25, c(0.82));
      gr.addColorStop(0.5, c(0.5));
      gr.addColorStop(0.75, c(0.18));
      gr.addColorStop(1, c(0));
      ctx.fillStyle = gr;
      ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
      ctx.restore();
    };

    const draw = (now: number) => {
      const s = document.documentElement.dataset.scheme === "dark" ? DARK : LIGHT;
      const t = (now - t0) / 1000;
      const base = ctx.createLinearGradient(0, 0, 0, H);
      for (const [at, colour] of s.stops) base.addColorStop(at, colour);
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, W, H);
      // Deep blue pools top-left, cyan lifts the right, a pale bloom wanders between them.
      glow(W * (0.08 + 0.1 * Math.sin(t * 0.11)), H * (0.06 + 0.04 * Math.cos(t * 0.09)), W * 0.95, H * 0.5, s.deep);
      glow(W * (0.95 + 0.1 * Math.cos(t * 0.1)), H * (0.2 + 0.05 * Math.sin(t * 0.13)), W * 0.85, H * 0.46, s.cyan);
      glow(W * (0.5 + 0.3 * Math.sin(t * 0.08 + 1)), H * (0.5 + 0.06 * Math.sin(t * 0.12)), W * 0.8, H * 0.3, s.bloom);
      // Soft white mist drifting through the blue: two slow clouds of light.
      const dark = s === DARK;
      glow(W * (0.25 + 0.35 * Math.sin(t * 0.07)), H * (0.32 + 0.08 * Math.cos(t * 0.09)), W * 0.5, H * 0.16, [255, 255, 255, dark ? 0.1 : 0.32]);
      glow(W * (0.75 + 0.3 * Math.cos(t * 0.06 + 2)), H * (0.58 + 0.07 * Math.sin(t * 0.1 + 1)), W * 0.55, H * 0.15, [255, 255, 255, dark ? 0.08 : 0.28]);
    };

    const loop = (now: number) => {
      raf = 0;
      // Hold still while the page scrolls: the finger gets every frame.
      if (now - last > 66 && !("scrolling" in document.documentElement.dataset)) {
        last = now;
        draw(now);
      }
      if (visible && !document.hidden) raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (!raf && !still && visible && !document.hidden) raf = requestAnimationFrame(loop);
    };
    draw(performance.now());
    start();
    const io = new IntersectionObserver(([e]) => {
      visible = Boolean(e?.isIntersecting);
      start();
    });
    io.observe(el);
    // Redraw at once when the theme flips, even if paused.
    const mo = new MutationObserver(() => draw(performance.now()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-scheme"] });
    document.addEventListener("visibilitychange", start);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      mo.disconnect();
      document.removeEventListener("visibilitychange", start);
    };
  }, []);
  return (
    <div ref={wrap} className="north-sky" aria-hidden>
      <canvas ref={cv} className="size-full" />
      <span className="north-grain" />
    </div>
  );
}
