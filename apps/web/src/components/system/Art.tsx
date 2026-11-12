"use client";

import { useId, type CSSProperties, type ReactNode } from "react";

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
export type ArtName = "tables" | "floor" | "sales" | "trophy" | "kitchen" | "bell" | "wifi" | "pizza" | "menu" | "orders" | "bookings" | "seated" | "guests" | "tips" | "check" | "shifts" | "seats";

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
  floor: "blue",
  sales: "green",
  trophy: "sunset",
  kitchen: "green",
  bell: "sunset",
  wifi: "teal",
  pizza: "coral",
  menu: "blue",
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
          <Materials g={g} t={t} />
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
          <rect width="120" height="120" fill="#fff" opacity="0.16" filter={`url(#${g("grain")})`} />
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

/** Material gradients the subjects are painted with (paper, gold, the tone). */
function Materials({ g, t }: { g: G; t: (typeof TONES)[ArtTone] }) {
  return (
    <>
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
    </>
  );
}

/** The subject alone, crisp, on a soft light: the one sharp thing on a scene card. */
function Focal({ name, t, size }: { name: ArtName; t: (typeof TONES)[ArtTone]; size: number }) {
  const id = useId().replace(/:/g, "");
  const g = (s: string) => `${s}-f${id}`;
  return (
    <svg aria-hidden viewBox="0 0 120 120" width={size} height={size} className="block shrink-0" style={{ filter: `drop-shadow(0 ${size * 0.06}px ${size * 0.08}px ${t.shadow})` }}>
      <defs>
        <Materials g={g} t={t} />
        <filter id={g("soft")} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
      </defs>
      <ellipse cx="60" cy="100" rx="34" ry="6" fill={t.c} opacity="0.35" filter={`url(#${g("soft")})`} />
      <g transform="translate(60 62) scale(1.2) translate(-60 -62)">{SUBJECT[name](g)}</g>
    </svg>
  );
}

/**
 * A card filled edge to edge by its illustration, after the founder's story
 * card reference: a soft pastel gradient, quiet rays, the subject drawn large
 * and blurred into the background (low contrast, it never fights the text),
 * fine grain, and the same subject small and sharp as the one focal point.
 * Light theme: pastel and dark text; dark theme: deep tone and light text.
 */
/** The scene background for any element (light pastel, deep in dark), for tiles that share the look. */
export function sceneStyle(tone: ArtTone): CSSProperties {
  const t = TONES[tone];
  return {
    "--art-l": `radial-gradient(120% 90% at 100% 0%, ${t.a}88 0%, ${t.glow}66 40%, transparent 72%), linear-gradient(160deg, #ffffff 0%, ${t.glow}55 100%)`,
    "--art-d": `radial-gradient(90% 80% at 100% 0%, ${t.b}59 0%, ${t.b}1f 45%, transparent 72%), radial-gradient(70% 60% at 0% 100%, ${t.c}33 0%, transparent 70%), #17191e`,
  } as CSSProperties;
}

export function ArtScene({
  name,
  tone = ART[name],
  focal = 56,
  layout = "stack",
  className = "",
  footer,
  children,
}: {
  name: ArtName;
  tone?: ArtTone;
  /** Size of the sharp subject; 0 hides it. */
  focal?: number;
  /** "row": subject left, text right of it. "stack": subject on top, text below. "side": text left, subject right. */
  layout?: "row" | "stack" | "side";
  className?: string;
  /** A line under the row, across the whole card. */
  footer?: ReactNode;
  children: ReactNode;
}) {
  const id = useId().replace(/:/g, "");
  const g = (s: string) => `${s}-s${id}`;
  const t = TONES[tone];
  const style = {
    "--art-l": `radial-gradient(120% 90% at 100% 0%, ${t.a}bb 0%, ${t.glow}88 38%, transparent 70%), linear-gradient(160deg, #ffffff 0%, ${t.glow}66 100%)`,
    "--art-d": `radial-gradient(90% 80% at 100% 0%, ${t.b}59 0%, ${t.b}1f 45%, transparent 72%), radial-gradient(70% 60% at 0% 100%, ${t.c}33 0%, transparent 70%), #17191e`,
  } as CSSProperties;
  // The sharp subject with its own decoration radiating from right behind it.
  const subject = focal > 0 && (
    <span className="relative grid shrink-0 place-items-center" style={{ width: focal, height: focal }}>
      <Deco kind={DECO[name]} size={focal * 2.5} />
      <Focal name={name} t={t} size={focal} />
    </span>
  );
  return (
    <div className={`art-scene relative isolate overflow-hidden ${className}`} style={style}>
      {/* The subject again, large and blurred, filling the far corner. */}
      <svg aria-hidden viewBox="0 0 120 120" className="art-ghost pointer-events-none absolute -z-20" style={layout === "side" ? { height: "150%", aspectRatio: "1", left: "-20%", top: "-25%" } : { height: "160%", aspectRatio: "1", right: "-34%", top: "-30%" }}>
        <defs>
          <Materials g={g} t={t} />
          <filter id={g("blur")} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        <g filter={`url(#${g("blur")})`}>
          <g transform="translate(60 62) scale(1.1) translate(-60 -62)">{SUBJECT[name](g)}</g>
        </g>
      </svg>
      <span aria-hidden className="art-grain pointer-events-none absolute inset-0 -z-10" />
      {layout === "row" ? (
        <>
          <div className="flex items-center gap-3.5">
            {subject}
            <div className="min-w-0 flex-1">{children}</div>
          </div>
          {footer}
        </>
      ) : layout === "side" ? (
        <div className="flex h-full items-center gap-3">
          <div className="min-w-0 flex-1">{children}</div>
          {subject}
        </div>
      ) : (
        <div className="flex h-full flex-col">
          {subject}
          {children}
        </div>
      )}
    </div>
  );
}

type DecoKind = "rays" | "sparkle" | "petals" | "dots" | "waves" | "ticks";
/** Each picture gets its own ornament, so a row of cards never repeats itself. */
const DECO: Record<ArtName, DecoKind> = {
  tables: "sparkle",
  floor: "dots",
  sales: "rays",
  trophy: "sparkle",
  kitchen: "waves",
  bell: "rays",
  wifi: "waves",
  pizza: "petals",
  menu: "dots",
  orders: "waves",
  bookings: "dots",
  seated: "petals",
  guests: "sparkle",
  tips: "rays",
  check: "petals",
  shifts: "ticks",
  seats: "dots",
};

/** A quiet ornament centred on the subject: rays, sparkles, petals, a dot halo, ripples or clock ticks. */
function Deco({ kind, size }: { kind: DecoKind; size: number }) {
  return (
    <svg aria-hidden viewBox="-60 -60 120 120" width={size} height={size} className="art-deco pointer-events-none absolute top-1/2 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2">
      <circle r="26" fill="#fff" className="art-halo" />
      {kind === "rays" &&
        Array.from({ length: 16 }, (_, i) => <path key={i} d="M0 0 L-3.2 -60 L3.2 -60 Z" fill="#fff" transform={`rotate(${i * 22.5})`} />)}
      {kind === "sparkle" &&
        [
          [-36, -26, 9],
          [38, -30, 6],
          [42, 24, 8],
          [-40, 30, 5],
          [0, -48, 5],
        ].map(([x, y, r], i) => (
          <path key={i} transform={`translate(${x} ${y}) scale(${r / 12})`} d="M0 -12c1 7 5 11 12 12-7 1-11 5-12 12-1-7-5-11-12-12 7-1 11-5 12-12Z" fill="#fff" />
        ))}
      {kind === "petals" &&
        Array.from({ length: 10 }, (_, i) => <ellipse key={i} cx="0" cy="-36" rx="7" ry="16" fill="#fff" transform={`rotate(${i * 36})`} />)}
      {kind === "dots" &&
        [32, 44, 55].flatMap((r, ring) =>
          Array.from({ length: 10 + ring * 6 }, (_, i) => {
            const a = (i / (10 + ring * 6)) * Math.PI * 2 + ring * 0.3;
            return <circle key={`${r}-${i}`} cx={Math.cos(a) * r} cy={Math.sin(a) * r} r={2.4 - ring * 0.5} fill="#fff" />;
          }),
        )}
      {kind === "waves" &&
        [32, 42, 52].map((r, i) => (
          <path key={r} d={Array.from({ length: 49 }, (_, k) => {
            const a = (k / 48) * Math.PI * 2;
            const rr = r + Math.sin(a * 8 + i) * 2.2;
            return `${k ? "L" : "M"}${(Math.cos(a) * rr).toFixed(1)} ${(Math.sin(a) * rr).toFixed(1)}`;
          }).join(" ")} fill="none" stroke="#fff" strokeWidth={1.8 - i * 0.4} />
        ))}
      {kind === "ticks" &&
        Array.from({ length: 24 }, (_, i) => <rect key={i} x="-1" y={i % 6 ? -52 : -56} width="2" height={i % 6 ? 6 : 12} rx="1" fill="#fff" transform={`rotate(${i * 15})`} />)}
    </svg>
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
  // A round bistro table in three-quarter view: a stone top with a real edge,
  // one pedestal, and on it a plate with food, a glass and a small vase.
  tables: (g) => (
    <g>
      <rect x="56.5" y="66" width="7" height="25" rx="3.5" fill={url(g, "deep")} />
      <rect x="57.5" y="66" width="2" height="25" rx="1" fill="#fff" opacity="0.35" />
      <ellipse cx="60" cy="92" rx="16" ry="4" fill={url(g, "deep")} />
      <ellipse cx="60" cy="91" rx="13" ry="2.6" fill="#fff" opacity="0.25" />
      {/* The top: its edge first, then the surface. */}
      <ellipse cx="60" cy="63" rx="40" ry="13" fill="#b9c6e4" />
      <ellipse cx="60" cy="59" rx="40" ry="13" fill={url(g, "paper")} />
      <ellipse cx="48" cy="54.5" rx="18" ry="3.5" fill="#fff" opacity="0.9" />
      {/* Plate with a dish. */}
      <ellipse cx="47" cy="60.5" rx="13" ry="4.6" fill="#d5ddf0" />
      <ellipse cx="47" cy="59.5" rx="13" ry="4.6" fill="#fff" />
      <ellipse cx="47" cy="59.5" rx="8.5" ry="2.9" fill="none" stroke="#e3e8f4" strokeWidth="1" />
      <ellipse cx="47" cy="58" rx="6.5" ry="2.8" fill={url(g, "gold")} />
      <circle cx="44.5" cy="57" r="1.4" fill="#3fbf6a" />
      <circle cx="49.5" cy="56.6" r="1.1" fill="#3fbf6a" />
      {/* Glass with a drink. */}
      <ellipse cx="74" cy="62.6" rx="4.5" ry="1.4" fill="#cfd8ee" />
      <rect x="73.3" y="54" width="1.4" height="8.5" fill="#e6ecf8" />
      <path d="M68.5 40h11l-1.3 10.5a4.2 4.2 0 0 1-8.4 0z" fill="#fff" opacity="0.85" stroke="#cfd8ee" strokeWidth="0.8" />
      <path d="M69.3 45h9.4l-.6 5.3a3.6 3.6 0 0 1-8.2 0z" fill={url(g, "tone")} opacity="0.85" />
      <rect x="70" y="41" width="1.6" height="8" rx="0.8" fill="#fff" opacity="0.9" />
      {/* A small vase with a flower. */}
      <path d="M60 51.5c-2.6 0-3.4-2-3.4-4.2 0-1.6 1-2.6 1.6-3.4h3.6c.6.8 1.6 1.8 1.6 3.4 0 2.2-.8 4.2-3.4 4.2z" fill={url(g, "tone")} />
      <path d="M60 44v-7" stroke="#36b36a" strokeWidth="1.2" strokeLinecap="round" />
      <ellipse cx="62.6" cy="40.5" rx="2.4" ry="1.1" fill="#36b36a" transform="rotate(-30 62.6 40.5)" />
      <circle cx="60" cy="35.5" r="3.4" fill="#ff7a8a" />
      <circle cx="60" cy="35.5" r="1.3" fill="#ffd27a" />
    </g>
  ),
  // Takings going up: three rising bars and an arrow.
  sales: (g) => (
    <g>
      <rect x="28" y="92" width="64" height="4" rx="2" fill="#c7d2ea" />
      {[
        [32, 70, 22],
        [52, 56, 36],
        [72, 40, 52],
      ].map(([x, y, h], k) => (
        <g key={k}>
          <rect x={x} y={y} width="16" height={h} rx="5" fill={url(g, "tone")} />
          <rect x={x} y={y} width="16" height={h} rx="5" fill={url(g, "paper")} opacity="0.25" />
          <rect x={x + 3} y={y + 3} width="4" height={h - 8} rx="2" fill="#fff" opacity="0.55" />
        </g>
      ))}
      <path d="M30 60 L50 46 L62 52 L86 30" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M30 60 L50 46 L62 52 L86 30" fill="none" stroke={url(g, "gold")} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M78 28 L89 27 L88 38" fill="none" stroke={url(g, "gold")} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  // A service bell on the counter: call the waiter.
  bell: (g) => (
    <g>
      <rect x="26" y="80" width="68" height="9" rx="4.5" fill={url(g, "deep")} />
      <path d="M32 80a28 28 0 0 1 56 0z" fill={url(g, "gold")} />
      <path d="M40 74a20 20 0 0 1 12-16" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
      <rect x="55" y="45" width="10" height="9" rx="3" fill={url(g, "goldSide")} />
      <ellipse cx="60" cy="44" rx="9" ry="3.5" fill={url(g, "gold")} />
      <path d="M86 40l6-5M90 52h8M30 40l-6-5M22 52h8" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
    </g>
  ),
  // Wi-Fi waves over a glowing dot.
  wifi: (g) => (
    <g>
      {[34, 24, 14].map((r, k) => (
        <path key={r} d={`M${60 - r} ${78 - r * 0.6} a${r} ${r} 0 0 1 ${r * 2} 0`} fill="none" stroke={k ? url(g, "paper") : url(g, "tone")} strokeWidth="8" strokeLinecap="round" transform={`translate(0 ${r * 0.6 - 8})`} />
      ))}
      <circle cx="60" cy="80" r="7" fill={url(g, "deep")} />
      <circle cx="58" cy="78" r="2.4" fill="#fff" opacity="0.8" />
    </g>
  ),
  // A pizza of two different halves.
  pizza: () => (
    <g>
      <circle cx="60" cy="62" r="34" fill="#e7a34a" />
      <path d="M60 31 A31 31 0 0 0 60 93 Z" fill="#ff7a4d" />
      <path d="M60 31 A31 31 0 0 1 60 93 Z" fill="#ffd27a" />
      <path d="M60 28v68" stroke="#fff" strokeWidth="3" />
      {[[46, 48], [42, 66], [50, 80], [38, 56]].map(([x, y], k) => (
        <circle key={k} cx={x} cy={y} r="4.5" fill="#c62f3e" />
      ))}
      {[[72, 46], [78, 62], [70, 78]].map(([x, y], k) => (
        <circle key={k} cx={x} cy={y} r="3.4" fill="#3fbf6a" />
      ))}
      <circle cx="80" cy="52" r="2.6" fill="#fff" opacity="0.9" />
      <circle cx="74" cy="70" r="2.2" fill="#fff" opacity="0.9" />
      <path d="M38 44a31 31 0 0 1 18-14" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
    </g>
  ),
  // The menu: an open card with dishes listed.
  menu: (g) => (
    <g>
      <rect x="32" y="26" width="56" height="70" rx="10" fill="#c7d2ea" transform="translate(4 4) rotate(4 60 60)" />
      <rect x="32" y="26" width="56" height="70" rx="10" fill={url(g, "paper")} />
      <rect x="40" y="34" width="22" height="5" rx="2.5" fill={url(g, "tone")} />
      {[48, 60, 72, 84].map((y) => (
        <g key={y}>
          <circle cx="44" cy={y} r="3.5" fill={url(g, "gold")} />
          <rect x="51" y={y - 2} width="22" height="4" rx="2" fill="#c8d0e2" />
          <rect x="76" y={y - 2} width="6" height="4" rx="2" fill={url(g, "tone")} opacity="0.7" />
        </g>
      ))}
    </g>
  ),
  // A cooking pot on a flame, steam rising.
  kitchen: (g) => (
    <g>
      <path d="M44 22c-4 5 4 8 0 13M60 18c-4 5 4 8 0 13M76 22c-4 5 4 8 0 13" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
      <path d="M50 92c0-6 5-7 4-12 6 3 8 8 6 12M62 92c0-5 4-6 3-10 5 3 6 7 5 10" fill="#ff8a3d" />
      <path d="M53 92c0-3 2-4 2-6 3 2 4 4 3 6" fill="#ffd27a" />
      <rect x="30" y="50" width="60" height="36" rx="12" fill={url(g, "deep")} />
      <rect x="30" y="50" width="60" height="36" rx="12" fill="#fff" opacity="0.12" />
      <rect x="35" y="55" width="7" height="24" rx="3.5" fill="#fff" opacity="0.35" />
      <rect x="22" y="56" width="10" height="6" rx="3" fill={url(g, "deep")} />
      <rect x="88" y="56" width="10" height="6" rx="3" fill={url(g, "deep")} />
      <path d="M28 50h64a4 4 0 0 1 0 8H28a4 4 0 0 1 0-8z" fill={url(g, "paper")} />
      <path d="M40 46c0-6 9-9 20-9s20 3 20 9z" fill={url(g, "paper")} />
      <rect x="55" y="32" width="10" height="6" rx="3" fill={url(g, "tone")} />
    </g>
  ),
  // A gold cup: the waiter's level.
  trophy: (g) => (
    <g>
      <rect x="44" y="84" width="32" height="8" rx="3" fill={url(g, "deep")} />
      <rect x="49" y="77" width="22" height="8" rx="3" fill={url(g, "goldSide")} />
      <rect x="57" y="64" width="6" height="14" rx="2" fill={url(g, "goldSide")} />
      <path d="M38 34 h44 v10 a22 22 0 0 1 -44 0 z" fill={url(g, "gold")} />
      <path d="M38 38 h-6 a8 8 0 0 0 8 12" fill="none" stroke={url(g, "gold")} strokeWidth="4" strokeLinecap="round" />
      <path d="M82 38 h6 a8 8 0 0 1 -8 12" fill="none" stroke={url(g, "gold")} strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="60" cy="34" rx="22" ry="4" fill="#fff6c9" />
      <path d="M46 40 q2 16 12 22" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      <path d="M60 41 l2.6 5.3 5.8.8 -4.2 4.1 1 5.8 -5.2-2.7 -5.2 2.7 1-5.8 -4.2-4.1 5.8-.8z" fill="#fff" opacity="0.9" />
    </g>
  ),
  // The hall from above: four tables, three taken (in the tone), one free.
  floor: (g) => (
    <g>
      <g transform="rotate(-8 60 62)">
        <rect x="24" y="30" width="72" height="62" rx="12" fill="#c7d2ea" transform="translate(3 4)" />
        <rect x="24" y="30" width="72" height="62" rx="12" fill={url(g, "paper")} />
        {[
          [43, 48, true],
          [77, 48, true],
          [43, 75, false],
          [77, 75, true],
        ].map(([x, y, busy], k) => (
          <g key={k} transform={`translate(${x} ${y})`}>
            {[0, 90, 180, 270].map((a) => (
              <rect key={a} x="-3.2" y="-14.5" width="6.4" height="4" rx="2" fill={busy ? "#9fb0d6" : "#dbe2f1"} transform={`rotate(${a})`} />
            ))}
            <circle r="9" fill={busy ? url(g, "tone") : "#fff"} stroke={busy ? "none" : "#cfd8ee"} strokeWidth="1.2" />
            {busy ? (
              <>
                <circle cx="-3" cy="-2" r="2.2" fill="#fff" />
                <circle cx="3" cy="2.4" r="2.2" fill="#fff" />
              </>
            ) : (
              <path d="M-3 0h6M0 -3v6" stroke="#9fb0d6" strokeWidth="1.4" strokeLinecap="round" />
            )}
          </g>
        ))}
      </g>
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
