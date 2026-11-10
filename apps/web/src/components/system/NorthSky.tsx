"use client";

import { useEffect, useRef } from "react";

/*
 * The yanyin header sky: northern lights in the Nomad blue.
 *
 * What is drawn: a deep blue sky with two soft glows, then two aurora
 * curtains. Each curtain is a wavy band that sways slowly: silky strands of
 * light (a bundle of thin glowing curves) along its crest, and faint vertical
 * rays hanging below it, the way a real aurora looks. Painted on a small canvas
 * (≈300×196) that the browser stretches smoothly over the header, so the light
 * stays soft and each frame stays cheap. ~25 fps, pauses off screen and in
 * background tabs, a single still frame for reduced motion.
 */

type Scheme = { base: [string, string, string]; glow: [string, string]; light: [number, number, number]; ray: number; strand: number };

const LIGHT: Scheme = { base: ["#4f7dff", "#2f5bef", "#2441c9"], glow: ["rgba(150,190,255,0.55)", "rgba(28,40,150,0.55)"], light: [214, 230, 255], ray: 0.16, strand: 0.5 };
const DARK: Scheme = { base: ["#2a4fe0", "#1d36b8", "#121f7c"], glow: ["rgba(110,150,255,0.45)", "rgba(10,16,80,0.65)"], light: [190, 212, 255], ray: 0.14, strand: 0.45 };

export function NorthSky() {
  const wrap = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = wrap.current;
    const canvas = cv.current;
    const ctx = canvas?.getContext("2d");
    if (!el || !canvas || !ctx) return;
    const W = 300;
    const H = 196;
    canvas.width = W;
    canvas.height = H;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let visible = true;
    let raf = 0;
    let last = 0;
    const t0 = performance.now();

    // One soft vertical ray, drawn once and stamped many times per frame.
    const ray = document.createElement("canvas");
    ray.width = 1;
    ray.height = 64;
    const rc = ray.getContext("2d")!;
    const rg = rc.createLinearGradient(0, 0, 0, 64);
    rg.addColorStop(0, "rgba(255,255,255,0)");
    rg.addColorStop(0.08, "rgba(255,255,255,1)");
    rg.addColorStop(0.35, "rgba(255,255,255,0.45)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    rc.fillStyle = rg;
    rc.fillRect(0, 0, 1, 64);

    const glow = (x: number, y: number, r: number, color: string) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    };

    // The crest of a curtain: a slow, uneven wave across the sky.
    const crest = (x: number, t: number, k: number) =>
      H * (0.3 + 0.2 * k) +
      H * 0.12 * Math.sin(x * 0.016 + t * 0.3 + k * 2.1) +
      H * 0.05 * Math.sin(x * 0.041 - t * 0.42 + k);

    const draw = (now: number) => {
      const s = document.documentElement.dataset.scheme === "dark" ? DARK : LIGHT;
      const [lr, lg, lb] = s.light;
      const t = (now - t0) / 1000;
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      const base = ctx.createLinearGradient(0, 0, W * 0.5, H);
      base.addColorStop(0, s.base[0]);
      base.addColorStop(0.55, s.base[1]);
      base.addColorStop(1, s.base[2]);
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, W, H);
      glow(W * (0.22 + 0.1 * Math.sin(t * 0.13)), H * 0.1, W * 0.6, s.glow[0]);
      glow(W * (0.85 + 0.08 * Math.cos(t * 0.11)), H * 0.95, W * 0.6, s.glow[1]);

      ctx.globalCompositeOperation = "lighter";
      for (let k = 0; k < 2; k++) {
        const strength = k === 0 ? 1 : 0.6;
        // Rays hanging from the crest: brighter where the curtain folds, flickering slowly.
        for (let x = 0; x < W; x += 2) {
          const y = crest(x, t, k);
          const fold = 0.5 + 0.5 * Math.sin(x * 0.03 + t * 0.55 + k * 3);
          const flicker = 0.6 + 0.4 * Math.sin(x * 0.21 + t * 1.1 + Math.sin(x * 0.05 + t * 0.4) * 2);
          const len = H * (0.22 + 0.2 * fold);
          ctx.globalAlpha = s.ray * strength * (0.35 + 0.65 * fold) * flicker;
          ctx.drawImage(ray, x, y - len * 0.08, 2.4, len);
        }
        ctx.globalAlpha = 1;
        // Silky strands along the crest: soft glowing curves, each drawn as three
        // strokes (wide and faint, medium, thin and bright) so it glows instead of edging.
        for (let j = 0; j < 4; j++) {
          const off = (j - 1.5) * 2.6;
          ctx.beginPath();
          for (let x = -6; x <= W + 6; x += 3) {
            const y = crest(x, t, k) + off + Math.sin(x * 0.03 + j * 1.3 + t * 0.6) * 2;
            if (x === -6) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          const a = s.strand * strength * (j === 1 || j === 2 ? 1 : 0.55);
          for (const [w, f] of [
            [10, 0.06],
            [4.5, 0.14],
            [1.6, 0.42],
          ] as const) {
            ctx.strokeStyle = `rgba(${lr},${lg},${lb},${a * f})`;
            ctx.lineWidth = w;
            ctx.stroke();
          }
        }
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const loop = (now: number) => {
      raf = 0;
      if (now - last > 40) {
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
