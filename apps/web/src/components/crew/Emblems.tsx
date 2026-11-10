"use client";

import { Lock, type LucideIcon } from "lucide-react";
import { useId } from "react";

/*
 * Game-style emblems for badges and quests, drawn in SVG so they are crisp at
 * any size. Badges are bevelled hexagon emblems with a gem in the middle; the
 * tier sets the metal (bronze → silver → gold → sapphire → diamond), and higher
 * tiers grow wings, ribbons and sparkles. Quests are rosette medals with a
 * ribbon. Locked items are shown in grey with a small lock.
 */

export type Tier = "bronze" | "silver" | "gold" | "sapphire" | "diamond";

const METAL: Record<Tier, { frame: [string, string, string]; inner: [string, string]; gem: [string, string, string]; glow: string }> = {
  bronze: { frame: ["#f0b98a", "#c47a45", "#7a3f1c"], inner: ["#9a5a30", "#5c2f14"], gem: ["#ffd2ad", "#d98a52", "#94501f"], glow: "rgba(217,138,82,0.45)" },
  silver: { frame: ["#ffffff", "#c3cad6", "#7d8799"], inner: ["#9aa3b3", "#5f6878"], gem: ["#f4f7fb", "#b9c3d3", "#7b879c"], glow: "rgba(190,205,230,0.5)" },
  gold: { frame: ["#fff2b8", "#f5b72a", "#a8620a"], inner: ["#c27a0e", "#7a4306"], gem: ["#ffe9a3", "#ffb31f", "#c96d06"], glow: "rgba(255,190,50,0.55)" },
  sapphire: { frame: ["#d6e6ff", "#6c96ff", "#2530b0"], inner: ["#2f5bff", "#1a2380"], gem: ["#a9d8ff", "#3f7dff", "#1d36b8"], glow: "rgba(70,130,255,0.6)" },
  diamond: { frame: ["#ffffff", "#9fe3ff", "#3b7bff"], inner: ["#3d8bff", "#1b3fb8"], gem: ["#f2fdff", "#8fe0ff", "#3a86ff"], glow: "rgba(120,215,255,0.65)" },
};
const RANK: Record<Tier, number> = { bronze: 0, silver: 1, gold: 2, sapphire: 3, diamond: 4 };

const hex = (r: number, cx = 60, cy = 60) =>
  Array.from({ length: 6 }, (_, k) => {
    const a = ((-90 + 60 * k) * Math.PI) / 180;
    return `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");

function Sparkle({ x, y, s }: { x: number; y: number; s: number }) {
  return <path d={`M${x} ${y - s}C${x + s * 0.18} ${y - s * 0.18} ${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y}C${x + s * 0.18} ${y + s * 0.18} ${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s}C${x - s * 0.18} ${y + s * 0.18} ${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y}C${x - s * 0.18} ${y - s * 0.18} ${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s}Z`} fill="#fff" />;
}

export function BadgeEmblem({ tier, icon: Icon, earned, size = 120 }: { tier: Tier; icon: LucideIcon; earned: boolean; size?: number }) {
  const id = useId().replace(/:/g, "");
  const m = METAL[tier];
  const r = RANK[tier];
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size, filter: earned ? undefined : "grayscale(1)", opacity: earned ? 1 : 0.55 }}>
      <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden>
        <defs>
          <linearGradient id={`f${id}`} x1="0.2" y1="0" x2="0.8" y2="1">
            <stop offset="0" stopColor={m.frame[0]} />
            <stop offset="0.5" stopColor={m.frame[1]} />
            <stop offset="1" stopColor={m.frame[2]} />
          </linearGradient>
          <linearGradient id={`i${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={m.inner[0]} />
            <stop offset="1" stopColor={m.inner[1]} />
          </linearGradient>
          <radialGradient id={`g${id}`} cx="0.4" cy="0.3" r="0.8">
            <stop offset="0" stopColor={m.gem[0]} />
            <stop offset="0.55" stopColor={m.gem[1]} />
            <stop offset="1" stopColor={m.gem[2]} />
          </radialGradient>
          <radialGradient id={`h${id}`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={m.glow} />
            <stop offset="1" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>
        {earned && r >= 2 && <circle cx="60" cy="60" r="58" fill={`url(#h${id})`} />}
        {/* Wings for gold and above. */}
        {r >= 2 &&
          [-1, 1].map((d) => (
            <g key={d} transform={`translate(60 56) scale(${d} 1)`}>
              {[0, 1, 2].map((k) => (
                <rect key={k} x={30 - k * 2} y={-14 + k * 9} width={24 - k * 4} height="8" rx="4" transform={`rotate(${-24 + k * 14} 30 ${-14 + k * 9})`} fill={`url(#f${id})`} stroke={m.frame[2]} strokeOpacity="0.5" strokeWidth="1" />
              ))}
            </g>
          ))}
        {/* Ribbons for sapphire and diamond. */}
        {r >= 3 &&
          [-1, 1].map((d) => <path key={d} d={`M${60 + d * 6} 92 L${60 + d * 20} 116 L${60 + d * 12} 112 L${60 + d * 8} 118 L${60 + d * 2} 94 Z`} fill={`url(#i${id})`} />)}
        <polygon points={hex(47)} fill={`url(#f${id})`} stroke={m.frame[2]} strokeOpacity="0.6" strokeWidth="1.2" strokeLinejoin="round" />
        <polygon points={hex(40)} fill={`url(#i${id})`} strokeLinejoin="round" />
        <polygon points={hex(33)} fill={`url(#g${id})`} strokeLinejoin="round" />
        {/* Facets and shine on the gem. */}
        <path d={`M60 27 L88.6 43.5 L60 60 Z`} fill="#fff" opacity="0.18" />
        <path d={`M31.4 43.5 L60 27 L60 60 Z`} fill="#fff" opacity="0.32" />
        <path d={`M60 60 L88.6 76.5 L60 93 Z`} fill="#000" opacity="0.08" />
        <Icon x={45} y={45} width={30} height={30} color="#fff" strokeWidth={2.2} />
        {earned && r >= 3 && (
          <>
            <Sparkle x={22} y={26} s={5} />
            <Sparkle x={100} y={22} s={4} />
            <Sparkle x={104} y={88} s={3.5} />
          </>
        )}
      </svg>
      {!earned && (
        <span className="absolute right-[12%] bottom-[10%] grid place-items-center rounded-full bg-[#0b0b0f] text-white" style={{ width: size * 0.26, height: size * 0.26 }}>
          <Lock size={size * 0.13} strokeWidth={2.4} />
        </span>
      )}
    </span>
  );
}

export type MedalState = "available" | "active" | "done";
const MEDAL: Record<MedalState, { rim: [string, string]; core: [string, string]; ribbon: string }> = {
  available: { rim: ["#f4f6fa", "#aeb6c4"], core: ["#c9d0dc", "#8a94a6"], ribbon: "#9aa3b3" },
  active: { rim: ["#d6e6ff", "#4b7bff"], core: ["#7fa8ff", "#2530b0"], ribbon: "#2f5bff" },
  done: { rim: ["#fff2b8", "#e9a21c"], core: ["#ffd66b", "#c27a0e"], ribbon: "#f0a81c" },
};

/** A quest as a rosette medal with a ribbon: grey on the board, blue in progress, gold when done. */
export function QuestMedal({ state, icon: Icon, size = 120 }: { state: MedalState; icon: LucideIcon; size?: number }) {
  const id = useId().replace(/:/g, "");
  const m = MEDAL[state];
  const petals = Array.from({ length: 16 }, (_, k) => {
    const a = (k / 16) * Math.PI * 2;
    return <circle key={k} cx={60 + 38 * Math.cos(a)} cy={52 + 38 * Math.sin(a)} r="9" fill={`url(#r${id})`} />;
  });
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden>
      <defs>
        <linearGradient id={`r${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={m.rim[0]} />
          <stop offset="1" stopColor={m.rim[1]} />
        </linearGradient>
        <radialGradient id={`c${id}`} cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor={m.core[0]} />
          <stop offset="1" stopColor={m.core[1]} />
        </radialGradient>
      </defs>
      {state === "done" && <circle cx="60" cy="52" r="58" fill="rgba(255,190,50,0.25)" />}
      <path d="M46 78 L36 114 L48 108 L54 118 L60 84 Z" fill={m.ribbon} />
      <path d="M74 78 L84 114 L72 108 L66 118 L60 84 Z" fill={m.ribbon} opacity="0.85" />
      {petals}
      <circle cx="60" cy="52" r="38" fill={`url(#r${id})`} />
      <circle cx="60" cy="52" r="30" fill={`url(#c${id})`} />
      <path d="M36 44 A26 26 0 0 1 82 36 A30 30 0 0 0 36 44 Z" fill="#fff" opacity="0.35" />
      <Icon x={45} y={37} width={30} height={30} color="#fff" strokeWidth={2.2} />
      {state === "done" && (
        <>
          <Sparkle x={20} y={20} s={5} />
          <Sparkle x={102} y={26} s={4} />
        </>
      )}
    </svg>
  );
}
