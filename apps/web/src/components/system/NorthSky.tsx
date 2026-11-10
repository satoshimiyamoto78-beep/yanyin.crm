"use client";

import { useEffect, useRef } from "react";

/*
 * The yanyin header sky: a light, airy azure sky that melts into the page
 * through a soft band of drifting mist (reference: a wallet onboarding screen).
 *
 * What is drawn: a saturated azure at the top (deeper blue on the left, cyan on
 * the right), slow clouds of light and deeper blue that drift across it, and a
 * misty edge of page-coloured clouds where the sky dissolves. Everything is soft
 * gradients on a small canvas the browser stretches over the header, so it is
 * smooth and cheap; the motion is slow but clearly alive. ~20 fps, pauses off
 * screen and in background tabs, a single still frame for reduced motion.
 */

type Rgba = [number, number, number, number];
type Scheme = { top: [string, string]; mid: string; deep: Rgba; cyan: Rgba; light: Rgba; mist: Rgba };

const LIGHT: Scheme = {
  top: ["#2f6dff", "#2fb4ff"],
  mid: "#6cbcff",
  deep: [32, 92, 245, 0.55],
  cyan: [80, 210, 255, 0.5],
  light: [205, 235, 255, 0.3],
  mist: [255, 255, 255, 0.85],
};
const DARK: Scheme = {
  top: ["#1f4fe6", "#1c86e6"],
  mid: "#2a5fb8",
  deep: [18, 50, 190, 0.6],
  cyan: [40, 150, 230, 0.45],
  light: [120, 175, 255, 0.3],
  mist: [12, 13, 16, 0.9],
};

export function NorthSky() {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = wrap.current;
    const canvas = cv.current;
    const ctx = canvas?.getContext("2d");
    if (!el || !canvas || !ctx) return;
    const W = 96;
    const H = 120;
    canvas.width = W;
    canvas.height = H;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let visible = true;
    let raf = 0;
    let last = 0;
    const t0 = performance.now();

    const cloud = (x: number, y: number, rx: number, ry: number, [r, g, b, a]: Rgba) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, ry / rx);
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      gr.addColorStop(0, `rgba(${r},${g},${b},${a})`);
      gr.addColorStop(0.5, `rgba(${r},${g},${b},${a * 0.5})`);
      gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = gr;
      ctx.fillRect(-rx, -rx, rx * 2, rx * 2);
      ctx.restore();
    };

    const draw = (now: number) => {
      const s = document.documentElement.dataset.scheme === "dark" ? DARK : LIGHT;
      const t = (now - t0) / 1000;
      // Azure: deep blue on the left, cyan on the right, lighter lower down.
      const h = ctx.createLinearGradient(0, 0, W, H * 0.25);
      h.addColorStop(0, s.top[0]);
      h.addColorStop(1, s.top[1]);
      ctx.fillStyle = h;
      ctx.fillRect(0, 0, W, H);
      const v = ctx.createLinearGradient(0, 0, 0, H);
      v.addColorStop(0, "rgba(0,0,0,0)");
      v.addColorStop(0.55, s.mid);
      v.addColorStop(1, s.mid);
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      // Clouds of colour drifting slowly across the sky.
      cloud(W * (0.15 + 0.14 * Math.sin(t * 0.23)), H * (0.12 + 0.05 * Math.cos(t * 0.19)), W * 0.55, H * 0.28, s.deep);
      cloud(W * (0.85 + 0.12 * Math.cos(t * 0.21)), H * (0.18 + 0.06 * Math.sin(t * 0.27)), W * 0.5, H * 0.26, s.cyan);
      cloud(W * (0.5 + 0.25 * Math.sin(t * 0.17 + 1)), H * (0.4 + 0.05 * Math.sin(t * 0.31)), W * 0.45, H * 0.16, s.light);
      // The misty edge: page-coloured clouds rolling along where the sky dissolves.
      for (let i = 0; i < 6; i++) {
        const sp = 0.12 + i * 0.035;
        const x = ((i / 6 + t * sp * 0.08) % 1.4) * W * 1.1 - W * 0.2;
        const y = H * (0.78 + 0.04 * Math.sin(t * 0.35 + i * 1.7) + (i % 2) * 0.04);
        cloud(x, y, W * (0.28 + 0.06 * Math.sin(i * 2.3)), H * (0.12 + 0.03 * (i % 3)), s.mist);
      }
      const fog = ctx.createLinearGradient(0, H * 0.74, 0, H);
      fog.addColorStop(0, `rgba(${s.mist[0]},${s.mist[1]},${s.mist[2]},0)`);
      fog.addColorStop(0.45, `rgba(${s.mist[0]},${s.mist[1]},${s.mist[2]},0.85)`);
      fog.addColorStop(1, `rgba(${s.mist[0]},${s.mist[1]},${s.mist[2]},1)`);
      ctx.fillStyle = fog;
      ctx.fillRect(0, H * 0.74, W, H * 0.26);
    };

    const loop = (now: number) => {
      raf = 0;
      if (now - last > 50) {
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
