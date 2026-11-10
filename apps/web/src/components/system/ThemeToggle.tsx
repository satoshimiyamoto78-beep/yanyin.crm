"use client";

import { useId } from "react";
import { haptic } from "@/lib/haptics";

/**
 * Sun that turns into the moon: rays fold away and a shadow slides in to carve
 * the crescent. `onSky` is the frosted look for the blue header; `plain` sits on
 * the page.
 */
export function ThemeToggle({ dark, onToggle, label, look = "onSky" }: { dark: boolean; onToggle: () => void; label: string; look?: "onSky" | "plain" }) {
  const id = useId();
  const ink = look === "onSky" ? "#fff" : "currentColor";
  return (
    <button
      aria-label={label}
      aria-pressed={dark}
      onClick={() => {
        haptic("tick");
        onToggle();
      }}
      className={`press grid size-10 shrink-0 place-items-center rounded-full ${look === "onSky" ? "bg-white/15 text-white" : "bg-g-fill text-g-ink"}`}
    >
      <svg viewBox="0 0 24 24" width={22} height={22} className={`theme-ico ${dark ? "is-dark" : ""}`} aria-hidden>
        <mask id={`moon-${id}`}>
          <rect width="24" height="24" fill="#fff" />
          <circle className="moon-bite" cx="17" cy="9" r="5.5" fill="#000" />
        </mask>
        <circle className="sun-core" cx="12" cy="12" r="5" fill={ink} mask={`url(#moon-${id})`} />
        <g className="rays" stroke={ink} strokeWidth="2" strokeLinecap="round">
          <path d="M12 1.8v2.2M12 20v2.2M1.8 12h2.2M20 12h2.2M4.8 4.8l1.5 1.5M17.7 17.7l1.5 1.5M4.8 19.2l1.5-1.5M17.7 6.3l1.5-1.5" />
        </g>
      </svg>
    </button>
  );
}
