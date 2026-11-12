"use client";

import { useId, type ReactNode } from "react";

/*
 * Illustrated tiles, after the founder's references (glossy app icons and
 * textured story cards): a squircle with a deep three-stop gradient, a soft
 * sunburst and glow behind the subject, fine film grain, a light rim, and a
 * subject drawn with real shading (body gradient, highlight, contact shadow).
 * One kit for every "picture" in the product, so they all belong together.
 *
 * Drawn in a 120 × 120 box. `size` scales it; `tilt` turns it a little.
 */

export type ArtTone = "blue" | "sunset" | "teal" | "green" | "coral" | "night";
export type ArtName = "tables" | "orders" | "bookings" | "seated" | "guests" | "tips" | "check" | "shifts" | "seats";

const TONES: Record<ArtTone, { a: string; b: string; c: string; glow: string; shadow: string }> = {
  blue: { a: "#8fb6ff", b: "#3d6bff", c: "#1a2a9e", glow: "#bcd2ff", shadow: "rgba(47,91,255,0.5)" },
  sunset: { a: "#ffd27a", b: "#ff8a3d", c: "#e2425b", glow: "#ffe2a8", shadow: "rgba(255,110,60,0.5)" },
  teal: { a: "#8ff0e2", b: "#16b8ae", c: "#0b5f7e", glow: "#c4fbf3", shadow: "rgba(17,163,157,0.5)" },
  green: { a: "#b6f7a4", b: "#2cc46d", c: "#0a6b4f", glow: "#dcffcf", shadow: "rgba(28,170,90,0.5)" },
  coral: { a: "#ffb6a3", b: "#ff6a6a", c: "#c22f62", glow: "#ffd9cf", shadow: "rgba(230,80,100,0.5)" },
  night: { a: "#6f86c9", b: "#2b3d8c", c: "#121a46", glow: "#9fb4ff", shadow: "rgba(30,45,120,0.5)" },
};

/** What each section is drawn as, and in which colour. */
export const ART: Record<ArtName, ArtTone> = {
  tables: "blue",
  orders: "sunset",
  bookings: "teal",
  seated: "green",
  guests: "blue",
  tips: "green",
  check: "coral",
  shifts: "night",
  seats: "teal",
};

export function ArtTile({ name, tone = ART[name], size = 64, tilt = 0, className = "" }: { name: ArtName; tone?: ArtTone; size?: number; tilt?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const t = TONES[tone];
  const g = (s: string) => `${s}-${id}`;
  return (
    <span aria-hidden className={`relative block shrink-0 ${className}`} style={{ width: size, height: size, transform: tilt ? `rotate(${tilt}deg)` : undefined, filter: `drop-shadow(0 ${size * 0.08}px ${size * 0.09}px ${t.shadow})` }}>
      <svg viewBox="0 0 120 120" width={size} height={size} className="block">
        <defs>
          <linearGradient id={g("bg")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={t.a} />
            <stop offset="0.5" stopColor={t.b} />
            <stop offset="1" stopColor={t.c} />
          </linearGradient>
          <radialGradient id={g("glow")} cx="0.5" cy="0.52" r="0.5">
            <stop offset="0" stopColor={t.glow} stopOpacity="0.95" />
            <stop offset="0.45" stopColor={t.glow} stopOpacity="0.35" />
            <stop offset="1" stopColor={t.glow} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={g("rim")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.7" />
            <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <filter id={g("grain")} x="0" y="0" width="1" height="1">
            <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7" result="n" />
            <feColorMatrix in="n" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
          <filter id={g("soft")} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <clipPath id={g("clip")}>
            <path d={SQUIRCLE} />
          </clipPath>
          {/* Shared material gradients for the subjects. */}
          <linearGradient id={g("paper")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#e7ecf7" />
          </linearGradient>
          <linearGradient id={g("gold")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff2b3" />
            <stop offset="0.45" stopColor="#ffc93d" />
            <stop offset="1" stopColor="#d9800f" />
          </linearGradient>
          <linearGradient id={g("goldSide")} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#c56c0c" />
            <stop offset="0.5" stopColor="#f2a826" />
            <stop offset="1" stopColor="#b85e08" />
          </linearGradient>
          <linearGradient id={g("tone")} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={t.a} />
            <stop offset="1" stopColor={t.b} />
          </linearGradient>
          <linearGradient id={g("deep")} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={t.b} />
            <stop offset="1" stopColor={t.c} />
          </linearGradient>
        </defs>
        <g clipPath={`url(#${g("clip")})`}>
          <rect width="120" height="120" fill={`url(#${g("bg")})`} />
          {/* A diagonal band of light across the tile. */}
          <path d="M-10 78 L130 18 L130 46 L-10 106 Z" fill="#fff" opacity="0.1" />
          {/* Sunburst behind the subject. */}
          <g transform="translate(60 60)" opacity="0.09" filter={`url(#${g("soft")})`}>
            {Array.from({ length: 16 }, (_, i) => (
              <path key={i} d="M0 0 L-7 -80 L7 -80 Z" fill="#fff" transform={`rotate(${i * 22.5})`} />
            ))}
          </g>
          <circle cx="60" cy="62" r="46" fill={`url(#${g("glow")})`} />
          {/* Contact shadow under the subject. */}
          <ellipse cx="60" cy="100" rx="36" ry="6" fill={t.c} opacity="0.5" filter={`url(#${g("soft")})`} />
          <g transform="translate(60 62) scale(1.14) translate(-60 -62)">{SUBJECT[name](g)}</g>
          {/* A small spark, top right. */}
          <path d="M96 20c.6 4 3.4 6.8 7.4 7.4-4 .6-6.8 3.4-7.4 7.4-.6-4-3.4-6.8-7.4-7.4 4-.6 6.8-3.4 7.4-7.4Z" fill="#fff" opacity="0.9" />
          <circle cx="22" cy="30" r="2" fill="#fff" opacity="0.7" />
          {/* Film grain and the light rim. */}
          <rect width="120" height="120" fill="#fff" opacity="0.16" filter={`url(#${g("grain")})`} style={{ mixBlendMode: "overlay" }} />
          <path d={SQUIRCLE} fill="none" stroke={`url(#${g("rim")})`} strokeWidth="2" />
        </g>
      </svg>
    </span>
  );
}

/**
 * The large-card picture: one big tile tilted a touch, with a small white
 * pill floating over its corner (like the "★ 20" chip in the reference).
 */
export function ArtFan({ name, size = 84, pill }: { name: ArtName; size?: number; pill?: ReactNode }) {
  return (
    <span aria-hidden className="relative block shrink-0" style={{ width: size * 1.12, height: size * 1.08 }}>
      <span className="absolute" style={{ right: 0, top: size * 0.04 }}>
        <ArtTile name={name} size={size} tilt={-7} />
      </span>
      {pill && (
        <span className="absolute flex h-7 items-center gap-1 rounded-full bg-white px-2.5 text-[12px] font-bold whitespace-nowrap text-[#0b0b0f] shadow-[0_8px_18px_-8px_rgba(10,20,60,0.45)]" style={{ left: 0, bottom: 0 }}>
          {pill}
        </span>
      )}
    </span>
  );
}

/** An iOS-like squircle in the 120 box. */
// Continuous-corner rounded square, like an iOS app icon (corner ~27% of the side).
const SQUIRCLE = "M60 0H87C107 0 120 13 120 33V87C120 107 107 120 87 120H33C13 120 0 107 0 87V33C0 13 13 0 33 0Z";

type G = (s: string) => string;
const url = (g: G, s: string) => `url(#${g(s)})`;

/* ---------------------------------------------------------------- Subjects */

const Coin = ({ g, x, y, r = 16 }: { g: G; x: number; y: number; r?: number }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d={`M${-r} 0 v6 a${r} ${r * 0.42} 0 0 0 ${r * 2} 0 v-6`} fill={url(g, "goldSide")} />
    <ellipse cx="0" cy="0" rx={r} ry={r * 0.42} fill={url(g, "gold")} />
    <ellipse cx="0" cy="0" rx={r * 0.68} ry={r * 0.28} fill="none" stroke="#c9770e" strokeOpacity="0.55" strokeWidth="1.4" />
    <ellipse cx={-r * 0.35} cy={-r * 0.12} rx={r * 0.32} ry={r * 0.1} fill="#fff" opacity="0.65" />
  </g>
);

const SUBJECT: Record<ArtName, (g: G) => ReactNode> = {
  // A round café table with a plate, a glass and two chairs.
  tables: (g) => (
    <g>
      <rect x="33" y="54" width="6" height="30" rx="3" fill={url(g, "deep")} opacity="0.85" />
      <rect x="81" y="54" width="6" height="30" rx="3" fill={url(g, "deep")} opacity="0.85" />
      <path d="M26 46h12a6 6 0 0 1 6 6v8H26z" fill="#fff" opacity="0.92" />
      <path d="M94 46H82a6 6 0 0 0-6 6v8h18z" fill="#fff" opacity="0.92" />
      <rect x="57" y="62" width="6" height="28" rx="3" fill="#dfe6f7" />
      <ellipse cx="60" cy="90" rx="14" ry="4" fill="#dfe6f7" />
      <ellipse cx="60" cy="62" rx="34" ry="11" fill="#c9d4ee" />
      <ellipse cx="60" cy="59" rx="34" ry="11" fill={url(g, "paper")} />
      <ellipse cx="54" cy="58" rx="11" ry="4" fill="#fff" stroke={url(g, "tone")} strokeWidth="2" />
      <ellipse cx="54" cy="57.5" rx="5.5" ry="1.8" fill={url(g, "tone")} opacity="0.5" />
      <path d="M71 44h7l-1.2 13h-4.6z" fill="#fff" opacity="0.95" stroke={url(g, "tone")} strokeWidth="1.2" />
      <path d="M72 50h5l-.6 6h-3.8z" fill={url(g, "tone")} opacity="0.6" />
      <ellipse cx="46" cy="54" rx="10" ry="2" fill="#fff" opacity="0.8" />
    </g>
  ),
  // A bill curling off the printer, with a coin.
  orders: (g) => (
    <g>
      <g transform="rotate(-8 58 60)">
        <path d="M38 26h40v62l-5-4-5 4-5-4-5 4-5-4-5 4-5-4-5 4z" fill={url(g, "paper")} />
        <rect x="45" y="36" width="20" height="4" rx="2" fill={url(g, "tone")} />
        <rect x="45" y="46" width="26" height="3" rx="1.5" fill="#c8d0e2" />
        <rect x="45" y="53" width="22" height="3" rx="1.5" fill="#c8d0e2" />
        <rect x="45" y="60" width="24" height="3" rx="1.5" fill="#c8d0e2" />
        <rect x="45" y="70" width="12" height="4" rx="2" fill="#9aa6c2" />
        <rect x="61" y="70" width="10" height="4" rx="2" fill={url(g, "tone")} />
        <path d="M38 26h40v8H38z" fill="#fff" opacity="0.7" />
      </g>
      <Coin g={g} x={82} y={80} r={14} />
    </g>
  ),
  // A tear-off calendar page with a ticked day.
  bookings: (g) => (
    <g>
      <rect x="30" y="32" width="60" height="56" rx="12" fill="#c7d3ea" transform="translate(3 4)" />
      <rect x="30" y="32" width="60" height="56" rx="12" fill={url(g, "paper")} />
      <path d="M30 44a12 12 0 0 1 12-12h36a12 12 0 0 1 12 12v4H30z" fill={url(g, "deep")} />
      <rect x="43" y="25" width="6" height="14" rx="3" fill="#eef2fb" stroke="#9fb0d4" strokeWidth="1" />
      <rect x="71" y="25" width="6" height="14" rx="3" fill="#eef2fb" stroke="#9fb0d4" strokeWidth="1" />
      {[0, 1, 2, 3].map((c) => [0, 1].map((r) => <rect key={`${c}${r}`} x={38 + c * 12} y={55 + r * 11} width="8" height="6" rx="2" fill="#d7deef" />))}
      <circle cx="75" cy="76" r="13" fill="#22c55e" />
      <circle cx="75" cy="76" r="13" fill="none" stroke="#fff" strokeWidth="2.5" />
      <path d="M69 76l4.5 4.5L81.5 72" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="71" cy="70" rx="5" ry="2" fill="#fff" opacity="0.45" />
    </g>
  ),
  // A soft armchair, guests just sat down.
  seated: (g) => (
    <g>
      <rect x="36" y="80" width="5" height="12" rx="2.5" fill={url(g, "deep")} />
      <rect x="79" y="80" width="5" height="12" rx="2.5" fill={url(g, "deep")} />
      <path d="M38 30h44a8 8 0 0 1 8 8v26H30V38a8 8 0 0 1 8-8z" fill="#f4f7ff" />
      <path d="M40 34h40a6 6 0 0 1 6 6v22H34V40a6 6 0 0 1 6-6z" fill={url(g, "paper")} />
      <rect x="24" y="52" width="16" height="32" rx="8" fill="#ffffff" />
      <rect x="80" y="52" width="16" height="32" rx="8" fill="#ffffff" />
      <rect x="34" y="62" width="52" height="20" rx="9" fill="#e9eefa" />
      <rect x="34" y="60" width="52" height="16" rx="8" fill="#fff" />
      <ellipse cx="50" cy="40" rx="10" ry="3" fill="#fff" opacity="0.9" />
      <circle cx="84" cy="34" r="10" fill="#22c55e" stroke="#fff" strokeWidth="2.5" />
      <path d="M79.5 34l3 3 6-6" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  // Two guests, soft and round.
  guests: (g) => (
    <g>
      <circle cx="78" cy="44" r="11" fill="#dfe7fb" />
      <path d="M60 88c0-14 8-24 18-24s18 10 18 24z" fill="#dfe7fb" />
      <circle cx="54" cy="46" r="14" fill={url(g, "paper")} />
      <ellipse cx="49" cy="40" rx="5" ry="3" fill="#fff" />
      <path d="M28 92c0-18 11-30 26-30s26 12 26 30z" fill={url(g, "paper")} />
      <path d="M36 80c4-8 10-12 18-12" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
      <circle cx="54" cy="46" r="14" fill="none" stroke={url(g, "tone")} strokeOpacity="0.25" strokeWidth="1.5" />
    </g>
  ),
  // A stack of gold coins.
  tips: (g) => (
    <g>
      <Coin g={g} x={50} y={84} />
      <Coin g={g} x={50} y={74} />
      <Coin g={g} x={50} y={64} />
      <Coin g={g} x={74} y={86} r={14} />
      <Coin g={g} x={74} y={76} r={14} />
      <g transform="rotate(-16 64 42)">
        <Coin g={g} x={64} y={42} r={17} />
      </g>
    </g>
  ),
  // A banknote with a coin: the average bill.
  check: (g) => (
    <g>
      <g transform="rotate(-10 58 58)">
        <rect x="26" y="40" width="64" height="36" rx="8" fill="#e8f7ee" transform="translate(4 5)" opacity="0.7" />
        <rect x="26" y="40" width="64" height="36" rx="8" fill={url(g, "paper")} />
        <rect x="31" y="45" width="54" height="26" rx="5" fill="none" stroke={url(g, "tone")} strokeWidth="1.6" opacity="0.7" />
        <circle cx="58" cy="58" r="9" fill={url(g, "tone")} opacity="0.85" />
        <path d="M58 52.5v11M55 55.5h4.5a2.5 2.5 0 0 1 0 5H55" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
        <rect x="31" y="45" width="54" height="5" rx="2.5" fill="#fff" opacity="0.8" />
      </g>
      <Coin g={g} x={80} y={82} r={14} />
    </g>
  ),
  // A shift clock.
  shifts: (g) => (
    <g>
      <circle cx="60" cy="62" r="30" fill="#c7d2ee" transform="translate(2 3)" />
      <circle cx="60" cy="62" r="30" fill={url(g, "paper")} />
      <circle cx="60" cy="62" r="24" fill="#fff" stroke={url(g, "tone")} strokeWidth="2" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x="59" y="40" width="2" height={i % 3 ? 3 : 5} rx="1" fill={i % 3 ? "#b8c3dd" : url(g, "deep")} transform={`rotate(${i * 30} 60 62)`} />
      ))}
      <path d="M60 62V47" stroke={url(g, "deep")} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M60 62l10 6" stroke="#ff7a3d" strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="62" r="3.5" fill={url(g, "deep")} />
      <ellipse cx="48" cy="44" rx="10" ry="4" fill="#fff" opacity="0.8" transform="rotate(-30 48 44)" />
    </g>
  ),
  // Free seats: two empty chairs.
  seats: (g) => (
    <g>
      {[0, 1].map((k) => (
        <g key={k} transform={`translate(${k ? 24 : -6} ${k ? 6 : 0})`}>
          <rect x="36" y="74" width="4" height="16" rx="2" fill={url(g, "deep")} />
          <rect x="58" y="74" width="4" height="16" rx="2" fill={url(g, "deep")} />
          <rect x="36" y="34" width="26" height="34" rx="9" fill={url(g, "paper")} />
          <rect x="33" y="64" width="32" height="12" rx="6" fill="#fff" />
          <ellipse cx="44" cy="40" rx="6" ry="2.2" fill="#fff" />
        </g>
      ))}
    </g>
  ),
};
