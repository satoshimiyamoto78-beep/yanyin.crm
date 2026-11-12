import type { LucideIcon } from "lucide-react";

/*
 * Our illustration unit, after iOS app icons: a squircle in a vivid gradient
 * with a soft gloss on top, a white glyph with a little depth, and a coloured
 * shadow that lifts it off the card. Used on stat cards and section cards in
 * both apps, so every "picture" in the product is drawn the same way.
 */

export type IconTone = "blue" | "green" | "orange" | "teal" | "ink";

const TONES: Record<IconTone, { from: string; to: string; shadow: string }> = {
  blue: { from: "#7aa2ff", to: "#2f5bff", shadow: "rgba(47,91,255,0.55)" },
  green: { from: "#6fe3a0", to: "#18b05a", shadow: "rgba(24,176,90,0.5)" },
  orange: { from: "#ffc078", to: "#ff7a2f", shadow: "rgba(255,122,47,0.5)" },
  teal: { from: "#6be0da", to: "#11a39d", shadow: "rgba(17,163,157,0.5)" },
  ink: { from: "#4a4f5c", to: "#14161b", shadow: "rgba(20,22,27,0.45)" },
};

export function AppIcon({ icon: Icon, tone = "blue", size = 44, tilt = 0, className = "" }: { icon: LucideIcon; tone?: IconTone; size?: number; tilt?: number; className?: string }) {
  const t = TONES[tone];
  return (
    <span
      aria-hidden
      className={`relative grid shrink-0 place-items-center overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: `linear-gradient(155deg, ${t.from} 0%, ${t.to} 78%)`,
        boxShadow: `0 ${size * 0.2}px ${size * 0.4}px -${size * 0.18}px ${t.shadow}, inset 0 1px 0 rgba(255,255,255,0.5), inset 0 -${Math.round(size * 0.08)}px ${Math.round(size * 0.16)}px rgba(0,0,0,0.12)`,
        transform: tilt ? `rotate(${tilt}deg)` : undefined,
      }}
    >
      {/* Gloss: light falling from the top left. */}
      <span className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(120% 85% at 22% 0%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 58%)" }} />
      <Icon size={Math.round(size * 0.5)} strokeWidth={2.1} color="#fff" style={{ position: "relative", filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.18))" }} />
    </span>
  );
}

/**
 * A small composition for the big section cards: the main icon tilted a
 * little, a paler tile behind it turned the other way, and a spark, so the
 * card reads as an illustration without leaving the icon language.
 */
export function AppIconStack({ icon, tone = "blue", size = 64 }: { icon: LucideIcon; tone?: IconTone; size?: number }) {
  const t = TONES[tone];
  return (
    <span aria-hidden className="relative block shrink-0" style={{ width: size * 1.45, height: size * 1.3 }}>
      <span className="absolute" style={{ right: 0, top: 0, width: size * 0.82, height: size * 0.82, borderRadius: size * 0.26, background: t.from, opacity: 0.32, transform: "rotate(14deg)" }} />
      <span className="absolute" style={{ left: size * 0.12, bottom: 0 }}>
        <AppIcon icon={icon} tone={tone} size={size} tilt={-8} />
      </span>
      {/* A four-point spark beside the icon. */}
      <svg className="absolute" style={{ left: 0, top: size * 0.08 }} width={size * 0.26} height={size * 0.26} viewBox="0 0 24 24">
        <path d="M12 0c.9 6.2 5.8 11.1 12 12-6.2.9-11.1 5.8-12 12-.9-6.2-5.8-11.1-12-12C6.2 11.1 11.1 6.2 12 0Z" fill={t.to} opacity="0.85" />
      </svg>
    </span>
  );
}
