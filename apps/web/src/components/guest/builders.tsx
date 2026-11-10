"use client";

import { formatMoney, t, type Currency, type Lang, type MenuItem, type ModifierGroup, type ModifierOption } from "@yanyin/domain";
import { Check, Dices } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { haptic } from "@/lib/haptics";
import { Sheet } from "./ui";

/* ---------------------------------------------------------------- Glyphs */

/**
 * Flat food glyphs in the yanyin style, drawn in a 24×24 box. Used on option
 * tiles and scattered on the pizza preview.
 */
export function Glyph({ kind, color = "#2f6bff", size = 24 }: { kind?: string; color?: string; size?: number }) {
  const g: Record<string, ReactNode> = {
    pepperoni: (
      <>
        <circle cx={12} cy={12} r={8} fill={color} />
        <circle cx={9} cy={10} r={1.3} fill="#fff" opacity={0.35} />
        <circle cx={14.5} cy={13.5} r={1.1} fill="#fff" opacity={0.35} />
        <circle cx={11} cy={15} r={0.9} fill="#fff" opacity={0.35} />
      </>
    ),
    chicken: <path d="M6 13.5c0-3.6 3-6.5 6.7-6.5 3.2 0 5.3 2.1 5.3 4.8 0 3.6-3.1 5.7-6.6 5.7C8.1 17.5 6 16 6 13.5Z" fill={color} />,
    beef: <path d="M5.5 10.5 9 6.5l7 1 2.5 5-3 5-7 .5-3.5-3.5Z" fill={color} />,
    mushroom: (
      <>
        <path d="M4.5 12a7.5 6 0 0 1 15 0Z" fill={color} />
        <rect x={10} y={11.5} width={4} height={6.5} rx={1.6} fill={color} opacity={0.75} />
      </>
    ),
    olive: <circle cx={12} cy={12} r={5.5} fill="none" stroke={color} strokeWidth={3.2} />,
    pepper: <path d="M5 15c2.5-5 8-7.5 14-6" fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" />,
    onion: <path d="M5.5 14a6.5 6.5 0 0 1 13 0" fill="none" stroke={color} strokeWidth={2.4} strokeLinecap="round" />,
    pineapple: <path d="M12 5.5 18.5 17h-13Z" fill={color} stroke={color} strokeWidth={1.5} strokeLinejoin="round" />,
    jalapeno: (
      <>
        <circle cx={12} cy={12} r={6} fill="none" stroke={color} strokeWidth={3} />
        <circle cx={12} cy={12} r={1.4} fill={color} />
      </>
    ),
    corn: (
      <>
        <circle cx={9} cy={10} r={2.4} fill={color} />
        <circle cx={14.5} cy={10.5} r={2.4} fill={color} />
        <circle cx={11.5} cy={14.8} r={2.4} fill={color} />
      </>
    ),
    tomato: (
      <>
        <circle cx={12} cy={12} r={6.5} fill={color} />
        <circle cx={12} cy={12} r={3.6} fill="#fff" opacity={0.28} />
      </>
    ),
    basil: <path d="M5 17C6 10 11 6 19 6c-.5 7-5 11.5-14 11Z" fill={color} />,
    sauce: <path d="M12 4.5c3 4.2 5.5 7.2 5.5 10a5.5 5.5 0 0 1-11 0c0-2.8 2.5-5.8 5.5-10Z" fill={color} stroke="rgba(11,11,15,0.12)" strokeWidth={0.8} />,
    lemon: (
      <>
        <circle cx={12} cy={12} r={7.5} fill={color} />
        <circle cx={12} cy={12} r={5.4} fill="#fff" opacity={0.45} />
        <path d="M12 6.6v10.8M6.6 12h10.8M8.2 8.2l7.6 7.6M15.8 8.2l-7.6 7.6" stroke={color} strokeWidth={1.1} />
      </>
    ),
    bubbles: (
      <>
        <circle cx={9} cy={14} r={3.2} fill="none" stroke="#2f6bff" strokeWidth={1.6} />
        <circle cx={15.5} cy={9} r={2.4} fill="none" stroke="#2f6bff" strokeWidth={1.6} />
        <circle cx={15} cy={16} r={1.5} fill="none" stroke="#2f6bff" strokeWidth={1.6} />
      </>
    ),
    leaf: <path d="M6 18c0-7 5-12 13-12 0 8-5 13-13 12Zm0 0 7-7" fill={color} stroke="#fff" strokeWidth={1} strokeOpacity={0.5} />,
    coconut: (
      <>
        <circle cx={12} cy={12} r={7.5} fill="#8a5a3c" />
        <circle cx={12} cy={12} r={5.5} fill={color} />
      </>
    ),
    passion: (
      <>
        <circle cx={12} cy={12} r={7.5} fill="#6d3a7a" />
        <circle cx={12} cy={12} r={5.6} fill={color} />
        {[[10, 10], [14, 11], [11, 14], [13.5, 14.5], [12, 8.6]].map(([x, y]) => (
          <circle key={`${x}${y}`} cx={x} cy={y} r={0.9} fill="#2b2b2b" />
        ))}
      </>
    ),
    mango: <ellipse cx={12} cy={12.5} rx={6} ry={7.5} transform="rotate(-25 12 12.5)" fill={color} />,
    strawberry: (
      <>
        <path d="M12 19c-4-2.5-6.5-6-6.5-8.8C5.5 7.8 8.5 6.5 12 6.5s6.5 1.3 6.5 3.7C18.5 13 16 16.5 12 19Z" fill={color} />
        <path d="M9 6.2c1.2.9 4.8.9 6 0-1.2-1.6-4.8-1.6-6 0Z" fill="#3fa34d" />
      </>
    ),
    lychee: (
      <>
        <circle cx={12} cy={12} r={7} fill="#d94e6a" />
        <circle cx={12} cy={12} r={5} fill={color} />
      </>
    ),
    mint: <path d="M12 19V9m0 0c-4 0-6-2.5-6-5 3 0 6 1.5 6 5Zm0 0c4 0 6-2.5 6-5-3 0-6 1.5-6 5Zm0 5c-3.5 0-5-2-5-4 2.5 0 5 1 5 4Zm0 0c3.5 0 5-2 5-4-2.5 0-5 1-5 4Z" fill={color} stroke={color} strokeWidth={1} strokeLinejoin="round" />,
    wave: <path d="M4 13c2.7-3 5.3-3 8 0s5.3 3 8 0" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" />,
  };
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      {g[kind ?? ""] ?? <circle cx={12} cy={12} r={7} fill={color} />}
    </svg>
  );
}

/* ---------------------------------------------------------------- Option tiles */

/** Visual option tiles (sauce, toppings, flavours): swatch + name + price, the picked one rings. */
export function OptionTiles({
  group,
  lang,
  currency,
  value,
  onPick,
}: {
  group: ModifierGroup;
  lang: Lang;
  currency: Currency;
  value: string[];
  onPick: (optionId: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {group.options.map((o) => {
        const on = value.includes(o.id);
        return (
          <button
            key={o.id}
            onClick={() => onPick(o.id)}
            aria-pressed={on}
            className={`press relative flex min-h-[112px] flex-col items-center justify-center gap-2 rounded-[20px] px-2 py-3 text-center transition-colors ${on ? "spin-ring bg-g-blue-soft" : "bg-g-fill"}`}
          >
            <span className={`grid size-12 place-items-center rounded-full bg-white transition-transform duration-200 ${on ? "scale-110" : ""}`}>
              <Glyph kind={o.glyph} color={o.color} size={30} />
            </span>
            <span className="text-[13px] leading-[1.2] font-semibold">{t(o.name, lang)}</span>
            {o.price > 0 && <span className={`text-[12px] font-medium tabular-nums ${on ? "text-g-blue" : "text-g-muted"}`}>+{formatMoney(o.price, currency, lang)}</span>}
            {on && (
              <span className="blue-grad absolute top-2 right-2 grid size-5 place-items-center rounded-full">
                <Check size={12} strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- Previews */

const picked = (item: MenuItem, groupId: string, ids: string[]): ModifierOption[] =>
  item.modifierGroups.find((g) => g.id === groupId)?.options.filter((o) => ids.includes(o.id)) ?? [];

/** Golden-angle scatter: stable positions for toppings on the pizza. */
function scatter(n: number, seed: number, r: number): [number, number, number][] {
  const out: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const k = i + seed * 0.37;
    const a = k * 2.39996 + seed;
    const d = r * Math.sqrt((i + 0.6) / (n + 0.4));
    out.push([Math.cos(a) * d, Math.sin(a) * d, (k * 67) % 360]);
  }
  return out;
}

/** Live pizza: size, crust, sauce, cheese and toppings follow the guest's picks. */
export function PizzaPreview({ item, ids, variantId }: { item: MenuItem; ids: string[]; variantId?: string }) {
  const size = Math.max(0, item.variants.findIndex((v) => v.id === variantId));
  const R = [70, 80, 90][size] ?? 80;
  const dough = picked(item, "dough", ids)[0]?.name.en ?? "Classic";
  const crust = dough === "Thin" ? { w: 5, c: "#f0c98a" } : dough === "Wholegrain" ? { w: 8, c: "#b98b50" } : { w: 9, c: "#e9b764" };
  const sauce = picked(item, "sauce", ids)[0]?.color ?? "#e2462f";
  const cheese = picked(item, "cheese", ids)[0]?.name.en ?? "Mozzarella";
  const toppings = picked(item, "toppings", ids);
  const inner = R - crust.w;
  const blobs = cheese === "No cheese" ? 0 : cheese === "Extra mozzarella" ? 26 : 16;
  return (
    <svg viewBox="-110 -110 220 220" className="h-full w-full" aria-label="Pizza preview">
      <circle r={104} fill="#ffffff" opacity={0.7} />
      <g className="wheel-idle" style={{ animationDuration: "70s", transformOrigin: "0 0" }}>
        <circle r={R} fill={crust.c} style={{ transition: "r 0.35s cubic-bezier(0.22,1,0.36,1)" }} />
        <circle r={inner} fill={sauce} style={{ transition: "r 0.35s, fill 0.35s" }} />
        {scatter(blobs, 3, inner - 10).map(([x, y], i) => (
          <ellipse key={`c${i}`} cx={x} cy={y} rx={9} ry={6.5} transform={`rotate(${i * 41} ${x} ${y})`} fill="#fff6dc" opacity={0.92} />
        ))}
        {toppings.map((o, ti) =>
          scatter(7, ti * 1.7 + 1, inner - 12).map(([x, y, rot], i) => (
            <g key={`${o.id}-${i}`} transform={`translate(${x - 9} ${y - 9}) rotate(${rot} 9 9)`}>
              <g className="animate-pop" style={{ animationDelay: `${i * 25}ms`, animationFillMode: "both", transformOrigin: "9px 9px" }}>
                <Glyph kind={o.glyph} color={o.color} size={18} />
              </g>
            </g>
          )),
        )}
      </g>
    </svg>
  );
}


/** The drink's live name: "Sparkling · strawberry & lychee". */
export function drinkName(item: MenuItem, ids: string[], lang: Lang): string {
  const base = picked(item, "base", ids)[0];
  const fl = picked(item, "flavour", ids).map((o) => t(o.name, lang).toLowerCase());
  return [base ? t(base.name, lang) : "", fl.join(" & ")].filter(Boolean).join(" · ");
}

/** The drink's main colour (first flavour, else the base), for tinting the stage. */
export function drinkColor(item: MenuItem, ids: string[]): string {
  return picked(item, "flavour", ids)[0]?.color ?? picked(item, "base", ids)[0]?.color ?? "#8fb2ff";
}

/**
 * Live drink: a tumbler (or a jug at 1 L) whose liquid layers the two picked
 * flavours, with a garnish on the rim, ice that bobs, bubbles for sparkling,
 * and mint, chia or boba when added.
 */
export function DrinkPreview({ item, ids, variantId }: { item: MenuItem; ids: string[]; variantId?: string }) {
  const big = item.variants.findIndex((v) => v.id === variantId) > 0;
  const base = picked(item, "base", ids)[0];
  const flavours = picked(item, "flavour", ids);
  const iceIdx = Math.max(0, item.modifierGroups.find((g) => g.id === "ice")?.options.findIndex((o) => ids.includes(o.id)) ?? 2);
  const extras = picked(item, "drinkextras", ids).map((o) => o.name.en);
  const bottom = flavours[0]?.color ?? base?.color ?? "#f5e27a";
  const top = flavours[1]?.color ?? flavours[0]?.color ?? base?.color ?? "#f5e27a";
  const sparkling = base?.glyph === "bubbles";
  const w = big ? 112 : 88;
  const h = big ? 150 : 128;
  const y0 = 104 - h / 2;
  const y1 = 104 + h / 2;
  const lx = 100 - w / 2;
  const rx = 100 + w / 2;
  const taper = big ? 6 : 9;
  const fillTop = y0 + 16;
  const cubes = [0, 2, 4, 6][iceIdx] ?? 4;
  const glass = `M${lx} ${y0} L${rx} ${y0} L${rx - taper} ${y1 - 10} Q${rx - taper} ${y1} ${rx - taper - 10} ${y1} L${lx + taper + 10} ${y1} Q${lx + taper} ${y1} ${lx + taper} ${y1 - 10} Z`;
  const garnish = flavours[0]?.glyph ?? base?.glyph ?? "lemon";
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-label="Drink preview">
      <defs>
        <clipPath id="glass">
          <path d={glass} />
        </clipPath>
        <linearGradient id="liquid" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={bottom} />
          <stop offset="45%" stopColor={bottom} />
          <stop offset="75%" stopColor={top} />
          <stop offset="100%" stopColor={top} stopOpacity={0.85} />
        </linearGradient>
        <linearGradient id="glassSheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity={0.55} />
          <stop offset="30%" stopColor="#fff" stopOpacity={0} />
          <stop offset="85%" stopColor="#fff" stopOpacity={0} />
          <stop offset="100%" stopColor="#fff" stopOpacity={0.35} />
        </linearGradient>
      </defs>
      {/* soft shadow under the glass */}
      <ellipse cx={100} cy={y1 + 6} rx={w / 2 + 6} ry={6} fill="rgba(11,22,54,0.08)" />
      {/* straw */}
      <path d={`M${100 + w / 6} ${y1 - 24} L${100 + w / 3.2} ${y0 - 22} l12 -9`} fill="none" stroke="#2f6bff" strokeWidth={6} strokeLinecap="round" />
      <g clipPath="url(#glass)">
        <rect x={lx - 10} y={y0 - 10} width={w + 20} height={h + 30} fill="rgba(255,255,255,0.55)" />
        <path className="drink-wave" d={`M${lx - 40} ${fillTop} q20 -5 40 0 t40 0 t40 0 t40 0 t40 0 V${y1 + 20} H${lx - 40} Z`} fill="url(#liquid)" />
        {extras.includes("Popping boba") &&
          [0, 1, 2, 3, 4, 5, 6].map((i) => <circle key={`b${i}`} cx={lx + 16 + i * ((w - 32) / 6)} cy={y1 - 9 - (i % 2) * 7} r={5} fill="#ff8a3d" stroke="#fff" strokeOpacity={0.6} strokeWidth={1} />)}
        {extras.includes("Chia seeds") &&
          Array.from({ length: 26 }, (_, i) => <circle key={`c${i}`} cx={lx + 10 + ((i * 37) % (w - 20))} cy={fillTop + 18 + ((i * 53) % (h - 40))} r={1.2} fill="#1d1d1d" opacity={0.55} />)}
        {Array.from({ length: cubes }, (_, i) => {
          const cx = lx + 12 + (i % 3) * ((w - 40) / 2);
          const cy = fillTop + 2 + Math.floor(i / 3) * 21;
          return (
            <g key={`i${i}`} className="drink-float" style={{ animationDelay: `${i * 0.35}s` }} transform={`rotate(${((i * 23) % 30) - 15} ${cx + 9} ${cy + 9})`}>
              <rect x={cx} y={cy} width={19} height={19} rx={5} fill="#fff" fillOpacity={0.55} stroke="#fff" strokeOpacity={0.9} />
              <path d={`M${cx + 4} ${cy + 6} q3 -3 8 -2`} stroke="#fff" strokeWidth={2} strokeLinecap="round" fill="none" />
            </g>
          );
        })}
        {sparkling &&
          Array.from({ length: 11 }, (_, i) => (
            <circle key={`s${i}`} className="drink-bubble" style={{ animationDelay: `${(i * 0.33) % 2.2}s` }} cx={lx + 12 + ((i * 29) % (w - 24))} cy={y1 - 8} r={1.6 + (i % 3)} fill="none" stroke="#fff" strokeWidth={1.3} opacity={0.9} />
          ))}
        {extras.includes("Fresh mint") && (
          <g transform={`translate(${lx + 4} ${fillTop - 14})`}>
            <Glyph kind="mint" color="#3fa34d" size={30} />
          </g>
        )}
        <rect x={lx - 10} y={y0 - 10} width={w + 20} height={h + 30} fill="url(#glassSheen)" />
      </g>
      <path d={glass} fill="none" stroke="rgba(47,107,255,0.28)" strokeWidth={2.5} strokeLinejoin="round" />
      {/* garnish on the rim */}
      {/* A slice sits on the rim, half over the edge, like a real garnish. */}
      <g key={garnish} transform={`translate(${lx + 4} ${y0 - 17})`}>
        <g className="animate-pop" style={{ transformOrigin: "17px 17px" }}>
          <Glyph kind={garnish} color={flavours[0]?.color ?? base?.color} size={34} />
        </g>
      </g>
    </svg>
  );
}

/* ---------------------------------------------------------------- Pizza from halves */

const HALF = 150; // radius of the chosen half, px

/** One half of a round cut-out pizza photo: the left or the right semicircle. */
function HalfPizza({ src, side, r }: { src?: string; side: "left" | "right"; r: number }) {
  return (
    <span className="relative block overflow-hidden" style={{ width: r, height: r * 2 }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" draggable={false} className="absolute top-0 max-w-none select-none" style={{ width: r * 2, height: r * 2, left: side === "left" ? 0 : -r }} />
      ) : (
        <span className="absolute top-0 rounded-full bg-g-fill-2" style={{ width: r * 2, height: r * 2, left: side === "left" ? 0 : -r }} />
      )}
    </span>
  );
}

const GAP = HALF * 1.32; // vertical distance between neighbouring halves

/**
 * Drives one reel with continuous physics: the reel follows the finger 1:1,
 * flicks carry momentum, and it settles on the nearest half with a critically
 * damped spring. A haptic tick fires each time a new half reaches the centre.
 */
function useReel(n: number, initial: number, onSettle: (i: number) => void) {
  const [pos, setPos] = useState(initial); // float index of the half at the centre
  const p = useRef(initial);
  const raf = useRef(0);
  const drag = useRef<{ y: number; p: number; t: number; v: number } | null>(null);
  const lastTick = useRef(Math.round(initial));
  const set = (v: number) => {
    p.current = v;
    setPos(v);
    const r = Math.round(v);
    if (r !== lastTick.current) {
      lastTick.current = r;
      haptic("tick");
    }
  };
  const animateTo = (target: number, velocity = 0, stiffness = 170) => {
    cancelAnimationFrame(raf.current);
    let v = velocity;
    let last = performance.now();
    const damping = 2 * Math.sqrt(stiffness); // critically damped: no wobble, no overshoot
    const frame = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000);
      last = now;
      const a = -stiffness * (p.current - target) - damping * v;
      v += a * dt;
      const next = p.current + v * dt;
      if (Math.abs(next - target) < 0.001 && Math.abs(v) < 0.01) {
        set(target);
        onSettle((((Math.round(target) % n) + n) % n));
        return;
      }
      set(next);
      raf.current = requestAnimationFrame(frame);
    };
    raf.current = requestAnimationFrame(frame);
  };
  const handlers = {
    onPointerDown: (e: React.PointerEvent) => {
      cancelAnimationFrame(raf.current);
      drag.current = { y: e.clientY, p: p.current, t: performance.now(), v: 0 };
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const now = performance.now();
      const next = d.p - (e.clientY - d.y) / GAP;
      const dt = Math.max(1, now - d.t) / 1000;
      d.v = 0.8 * ((next - p.current) / dt) + 0.2 * d.v; // smoothed velocity, halves per second
      d.t = now;
      set(next);
    },
    onPointerUp: (e: React.PointerEvent) => {
      const d = drag.current;
      drag.current = null;
      if (!d) return;
      const moved = Math.abs(p.current - d.p);
      if (moved < 0.04) {
        // A tap: a tap above or below the centre half steps to that neighbour.
        const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const off = e.clientY - (box.top + box.height / 2);
        if (Math.abs(off) > HALF * 0.85) animateTo(Math.round(p.current) + Math.sign(off));
        else animateTo(Math.round(p.current));
        return;
      }
      const projected = p.current + d.v * 0.22; // where the flick would carry it
      animateTo(Math.round(projected), d.v);
    },
  };
  return { pos, handlers, animateTo, p };
}

/**
 * One side of the halves stage: the picked half sits large at the centre
 * line; neighbours peek above and below, scaling smoothly with distance.
 */
function HalfReel({ side, options, reel }: { side: "left" | "right"; options: ModifierOption[]; reel: ReturnType<typeof useReel> }) {
  const n = options.length;
  const inner = side === "left" ? "right" : "left";
  const base = Math.floor(reel.pos);
  return (
    <div className="relative h-full touch-none select-none" style={{ width: HALF + 8 }} {...reel.handlers} onPointerCancel={reel.handlers.onPointerUp}>
      {[-2, -1, 0, 1, 2, 3].map((k) => {
        const i = base + k;
        const d = i - reel.pos; // signed distance from the centre, in halves
        const ad = Math.min(1.6, Math.abs(d));
        const o = options[((i % n) + n) % n]!;
        const scale = 1 - 0.58 * Math.min(1, ad);
        // Neighbours tuck in toward the centre line as they shrink.
        const y = d * GAP * (ad <= 1 ? 1 - 0.18 * ad : 0.82);
        return (
          <button
            key={i}
            onKeyDown={(e) => e.key === "Enter" && Math.abs(d) > 0.5 && reel.animateTo(Math.round(reel.p.current + Math.sign(d)))}
            tabIndex={Math.abs(d) < 0.5 ? -1 : 0}
            aria-label={t(o.name, "en")}
            className="absolute top-1/2 will-change-transform"
            style={{
              [inner]: 0,
              transform: `translateY(calc(-50% + ${y}px)) scale(${scale})`,
              transformOrigin: `${inner} center`,
              opacity: Math.max(0, 1 - 0.55 * ad),
              zIndex: Math.round(10 - ad * 4),
              filter: ad > 0.2 ? `blur(${Math.min(2, (ad - 0.2) * 1.5)}px)` : "none",
            }}
          >
            <HalfPizza src={o.photo} side={side} r={HALF} />
          </button>
        );
      })}
    </div>
  );
}

export function HalvesPicker({
  item,
  lang,
  currency,
  onClose,
  onAdd,
}: {
  item: MenuItem;
  lang: Lang;
  currency: Currency;
  onClose: () => void;
  onAdd: (item: MenuItem, variantId: string | undefined, optionIds: string[], qty: number) => void;
}) {
  const leftG = item.modifierGroups.find((g) => g.id === "left")!;
  const rightG = item.modifierGroups.find((g) => g.id === "right")!;
  const opts = leftG.options;
  const [l, setL] = useState(Math.max(0, opts.findIndex((o) => o.id === leftG.defaultOptionId)));
  const [r, setR] = useState(Math.max(0, rightG.options.findIndex((o) => o.id === rightG.defaultOptionId)));
  const leftReel = useReel(opts.length, l, setL);
  const rightReel = useReel(rightG.options.length, r, setR);
  // Labels follow the half nearest the centre, even mid-swipe.
  const wrap = (v: number, n: number) => (((Math.round(v) % n) + n) % n);
  const li = wrap(leftReel.pos, opts.length);
  const ri = wrap(rightReel.pos, rightG.options.length);
  const [variantId, setVariantId] = useState(item.variants[0]?.id);
  const [rolling, setRolling] = useState(false);
  const size = item.variants.find((v) => v.id === variantId)?.price ?? 0;
  const left = opts[li]!;
  const right = rightG.options[ri]!;
  const price = size + left.price + right.price;
  const side = (o: ModifierOption) => size / 2 + o.price; // this half's share; the two shares add up to the price
  const dice = () => {
    if (rolling) return;
    setRolling(true);
    haptic("light");
    // Each reel spins a different number of halves and decelerates on its own spring.
    leftReel.animateTo(Math.round(leftReel.p.current) + 6 + Math.floor(Math.random() * opts.length), 26, 60);
    rightReel.animateTo(Math.round(rightReel.p.current) - (8 + Math.floor(Math.random() * opts.length)), -30, 52);
    setTimeout(() => {
      haptic("success");
      setRolling(false);
    }, 1300);
  };
  return (
    <Sheet
      open
      onClose={onClose}
      label={t(item.name, lang)}
      footer={
        <button
          onClick={() => {
            haptic("success");
            onAdd(item, variantId, [left.id, right.id], 1);
          }}
          className="blue-grad press flex h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-semibold tabular-nums"
        >
          {t({ en: "Combine halves", ru: "Объединить половинки", vi: "Ghép hai nửa" }, lang)} · {formatMoney(price, currency, lang)}
        </button>
      }
    >
      <div className="px-5 pt-1 pb-6">
        <div className="flex rounded-full bg-g-fill p-1">
          {item.variants.map((v) => (
            <button
              key={v.id}
              onClick={() => {
                haptic("tick");
                setVariantId(v.id);
              }}
              aria-pressed={v.id === variantId}
              className={`h-10 flex-1 rounded-full text-[14px] font-semibold transition-colors ${v.id === variantId ? "bg-white text-g-ink" : "text-g-muted"}`}
            >
              {t(v.name, lang)}
            </button>
          ))}
        </div>

        <div className="mt-6 flex items-start justify-between gap-3">
          {[
            [left, "text-left"],
            [right, "text-right"],
          ].map(([o, align]) => (
            <div key={align as string} className={`min-w-0 flex-1 ${align as string}`}>
              <p key={(o as ModifierOption).id} className="animate-pop truncate text-[17px] leading-tight font-semibold">
                {t((o as ModifierOption).name, lang)}
              </p>
              <p className="mt-0.5 text-[13px] text-g-muted tabular-nums">{formatMoney(side(o as ModifierOption), currency, lang)}</p>
            </div>
          ))}
        </div>

        {/* The stage: two reels meet at the centre line. */}
        <div className="relative mt-2 flex h-[440px] items-center justify-center overflow-hidden">
          <HalfReel side="left" options={opts} reel={leftReel} />
          <span aria-hidden className="z-10 h-[330px] w-1 shrink-0 rounded-full bg-white" />
          <HalfReel side="right" options={rightG.options} reel={rightReel} />
          <button
            onClick={dice}
            aria-label="Random halves"
            className={`press absolute right-1 bottom-2 z-20 grid size-12 place-items-center rounded-full bg-white text-g-blue ring-1 ring-g-line transition-transform duration-700 ${rolling ? "rotate-[360deg]" : ""}`}
          >
            <Dices size={22} strokeWidth={1.9} />
          </button>
        </div>
        <p className="mt-1 text-center text-[13px] text-g-muted">
          {t({ en: "Swipe each half up or down", ru: "Листайте каждую половинку вверх или вниз", vi: "Vuốt từng nửa lên hoặc xuống" }, lang)}
        </p>
      </div>
    </Sheet>
  );
}
