/*
 * Flat illustrations for the Hall sections, in the yanyin blue. Drawn as SVG so
 * they stay crisp at any size and follow the theme (soft parts use currentColor
 * tints via opacity).
 */

const BLUE = "url(#yy-ill-blue)";

function Defs() {
  return (
    <defs>
      <linearGradient id="yy-ill-blue" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#6c96ff" />
        <stop offset="0.55" stopColor="#2f6bff" />
        <stop offset="1" stopColor="#2530b0" />
      </linearGradient>
    </defs>
  );
}

/** Tables seen from above: a round table with four chairs and a small square table. */
export function TablesArt({ size = 96 }: { size?: number }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden>
      <Defs />
      <circle cx="60" cy="60" r="56" fill="#2f6bff" opacity="0.08" />
      {[0, 90, 180, 270].map((a) => (
        <rect key={a} x="52" y="18" width="16" height="12" rx="6" fill="#2f6bff" opacity="0.35" transform={`rotate(${a} 60 60)`} />
      ))}
      <circle cx="60" cy="60" r="24" fill={BLUE} />
      <circle cx="60" cy="60" r="10" fill="#fff" opacity="0.9" />
      <circle cx="60" cy="60" r="4" fill="#2f6bff" />
      <rect x="86" y="84" width="22" height="22" rx="6" fill="#fff" stroke="#2f6bff" strokeOpacity="0.35" strokeWidth="2" />
      <circle cx="97" cy="95" r="3" fill="#2f6bff" opacity="0.6" />
    </svg>
  );
}

/** Orders: a check with dish lines and a total, a small chef badge. */
export function OrdersArt({ size = 96 }: { size?: number }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden>
      <Defs />
      <circle cx="60" cy="60" r="56" fill="#2f6bff" opacity="0.08" />
      <path d="M34 18h52v80l-6.5-5-6.5 5-6.5-5-6.5 5-6.5-5-6.5 5-6.5-5-6.5 5z" fill="#fff" stroke="#2f6bff" strokeOpacity="0.25" strokeWidth="2" strokeLinejoin="round" />
      <rect x="42" y="30" width="22" height="5" rx="2.5" fill={BLUE} />
      {[44, 54, 64].map((y, i) => (
        <g key={y}>
          <rect x="42" y={y} width={[26, 20, 24][i]} height="4" rx="2" fill="#2f6bff" opacity="0.3" />
          <rect x="72" y={y} width="8" height="4" rx="2" fill="#2f6bff" opacity="0.5" />
        </g>
      ))}
      <rect x="42" y="76" width="38" height="2" rx="1" fill="#2f6bff" opacity="0.15" />
      <rect x="62" y="82" width="18" height="6" rx="3" fill={BLUE} />
      <circle cx="90" cy="30" r="13" fill={BLUE} />
      <path d="M84.5 31.5h11v3.5h-11zM85 31c-2.4-.4-3.3-3.6-1-5 1-2.6 4.2-3.6 6-1.5 1.8-2.1 5-1.1 6 1.5 2.3 1.4 1.4 4.6-1 5z" fill="#fff" />
    </svg>
  );
}

/** Bookings: a calendar page with a highlighted day and a check mark. */
export function BookingsArt({ size = 96 }: { size?: number }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden>
      <Defs />
      <circle cx="60" cy="60" r="56" fill="#2f6bff" opacity="0.08" />
      <rect x="22" y="28" width="76" height="68" rx="14" fill="#fff" stroke="#2f6bff" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M22 42a14 14 0 0 1 14-14h48a14 14 0 0 1 14 14v4H22z" fill={BLUE} />
      <rect x="38" y="20" width="6" height="16" rx="3" fill="#2530b0" />
      <rect x="76" y="20" width="6" height="16" rx="3" fill="#2530b0" />
      {[0, 1, 2, 3].map((c) =>
        [0, 1, 2].map((r) =>
          c === 2 && r === 1 ? null : <rect key={`${c}-${r}`} x={32 + c * 15} y={54 + r * 13} width="9" height="7" rx="2.5" fill="#2f6bff" opacity="0.22" />,
        ),
      )}
      <circle cx="66.5" cy="70.5" r="9" fill={BLUE} />
      <path d="M62.5 70.5l3 3 5-6" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
