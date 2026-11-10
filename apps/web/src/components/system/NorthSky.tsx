"use client";

import { useEffect, useRef } from "react";

/*
 * The yanyin header sky: a soft, slowly flowing aurora in the Nomad blue.
 *
 * How it stays premium and cheap: the light is painted on a tiny canvas
 * (about 80×50 px) and the browser stretches it over the header. Stretching a
 * tiny image is a free, perfect blur, so there are no hard rings or blobs, and
 * each frame costs a few gradient fills on 4,000 pixels. It runs at ~30 fps,
 * pauses off screen and in background tabs, and draws a single still frame for
 * reduced motion. Shared by the guest menu and the waiter app.
 */

type Scheme = { base: [string, string, string]; glows: [number, number, number, number][]; veil: string };

// Glows are [r, g, b, alpha]: light sky blue, the brand blue, deep indigo, ice white.
const LIGHT: Scheme = {
  base: ["#5f8dff", "#3c68f5", "#2f4fd6"],
  glows: [
    [150, 190, 255, 0.85],
    [47, 91, 255, 0.75],
    [37, 48, 176, 0.7],
    [225, 236, 255, 0.55],
  ],
  veil: "rgba(230,238,255,0.22)",
};
const DARK: Scheme = {
  base: ["#2c55ee", "#2240cc", "#172596"],
  glows: [
    [110, 150, 255, 0.75],
    [40, 80, 240, 0.7],
    [20, 28, 120, 0.8],
    [180, 205, 255, 0.4],
  ],
  veil: "rgba(200,215,255,0.16)",
};

export function NorthSky() {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = wrap.current;
    const canvas = cv.current;
    const ctx = canvas?.getContext("2d");
    if (!el || !canvas || !ctx) return;
    const W = 80;
    const H = 52;
    canvas.width = W;
    canvas.height = H;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let visible = true;
    let raf = 0;
    let last = 0;
    const t0 = performance.now();

    const glow = (x: number, y: number, r: number, [cr, cg, cb, a]: [number, number, number, number]) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${cr},${cg},${cb},${a})`);
      g.addColorStop(0.55, `rgba(${cr},${cg},${cb},${a * 0.35})`);
      g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    };

    const draw = (now: number) => {
      const s = document.documentElement.dataset.scheme === "dark" ? DARK : LIGHT;
      const t = (now - t0) / 1000;
      const base = ctx.createLinearGradient(0, 0, W * 0.6, H);
      base.addColorStop(0, s.base[0]);
      base.addColorStop(0.5, s.base[1]);
      base.addColorStop(1, s.base[2]);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, W, H);
      // Large glows drifting on slow, unrelated loops, so the sky never repeats visibly.
      glow(W * (0.2 + 0.18 * Math.sin(t * 0.21)), H * (0.15 + 0.12 * Math.cos(t * 0.17)), W * 0.55, s.glows[0]!);
      glow(W * (0.85 + 0.12 * Math.cos(t * 0.13)), H * (0.55 + 0.2 * Math.sin(t * 0.19)), W * 0.5, s.glows[1]!);
      glow(W * (0.5 + 0.3 * Math.sin(t * 0.11 + 2)), H * (0.95 + 0.1 * Math.sin(t * 0.23)), W * 0.5, s.glows[2]!);
      // The aurora curtain: a band of light that bends and breathes across the sky.
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i <= 14; i++) {
        const u = i / 14;
        const x = W * (-0.1 + 1.2 * u);
        const y = H * (0.32 + 0.14 * Math.sin(u * 3.2 + t * 0.35) + 0.06 * Math.sin(u * 7 - t * 0.5));
        const a = s.glows[3]![3] * (0.35 + 0.65 * Math.max(0, Math.sin(u * Math.PI))) * (0.75 + 0.25 * Math.sin(t * 0.4 + u * 4));
        glow(x, y, W * 0.16, [s.glows[3]![0], s.glows[3]![1], s.glows[3]![2], a * 0.32]);
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = s.veil;
      ctx.fillRect(0, 0, W, H * 0.12);
    };

    const loop = (now: number) => {
      raf = 0;
      if (now - last > 33) {
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
    </div>
  );
}
