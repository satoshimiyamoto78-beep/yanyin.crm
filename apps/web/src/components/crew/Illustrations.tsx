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

/** Tips: a fan of banknotes with a coin, for the corner of the tips card. */
export function TipsArt({ size = 150 }: { size?: number }) {
  return (
    <svg viewBox="0 0 160 160" width={size} height={size} aria-hidden>
      <defs>
        <linearGradient id="yy-tips-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7fe0a8" />
          <stop offset="1" stopColor="#12a150" />
        </linearGradient>
        <linearGradient id="yy-tips-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b4f0cd" />
          <stop offset="1" stopColor="#3cc479" />
        </linearGradient>
        <radialGradient id="yy-tips-coin" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fff6c8" />
          <stop offset="0.6" stopColor="#ffc73a" />
          <stop offset="1" stopColor="#d98a0a" />
        </radialGradient>
      </defs>
      {[-22, -6, 10].map((a, i) => (
        <g key={a} transform={`rotate(${a} 80 96)`}>
          <rect x="22" y="58" width="116" height="66" rx="12" fill={i === 2 ? "url(#yy-tips-a)" : "url(#yy-tips-b)"} />
          <rect x="30" y="66" width="100" height="50" rx="8" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="2" />
          <circle cx="80" cy="91" r="14" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="3" />
          <circle cx="44" cy="91" r="4" fill="#fff" fillOpacity="0.55" />
          <circle cx="116" cy="91" r="4" fill="#fff" fillOpacity="0.55" />
        </g>
      ))}
      <circle cx="124" cy="46" r="22" fill="url(#yy-tips-coin)" />
      <circle cx="124" cy="46" r="15" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="2.5" />
      <path d="M124 37v18M119 41.5c0-2.4 2.2-4 5-4s5 1.4 5 3.7-2.2 3.3-5 3.8-5 1.6-5 3.9 2.2 3.6 5 3.6 5-1.6 5-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** Average check: a long receipt with dish lines and a total. */
export function CheckArt({ size = 150 }: { size?: number }) {
  return (
    <svg viewBox="0 0 160 160" width={size} height={size} aria-hidden>
      <defs>
        <linearGradient id="yy-check-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9cbcff" />
          <stop offset="0.55" stopColor="#2f6bff" />
          <stop offset="1" stopColor="#2530b0" />
        </linearGradient>
      </defs>
      <g transform="rotate(10 80 80)">
        <path d="M40 14h80v132l-10-8-10 8-10-8-10 8-10-8-10 8-10-8-10 8z" fill="url(#yy-check-a)" />
        <rect x="52" y="30" width="34" height="7" rx="3.5" fill="#fff" fillOpacity="0.9" />
        {[50, 64, 78, 92].map((y, i) => (
          <g key={y}>
            <rect x="52" y={y} width={[40, 30, 36, 26][i]} height="5" rx="2.5" fill="#fff" fillOpacity="0.45" />
            <rect x="98" y={y} width="12" height="5" rx="2.5" fill="#fff" fillOpacity="0.7" />
          </g>
        ))}
        <rect x="52" y="106" width="58" height="2" rx="1" fill="#fff" fillOpacity="0.35" />
        <rect x="76" y="114" width="34" height="9" rx="4.5" fill="#fff" />
      </g>
    </svg>
  );
}

/** Seated: a chair at a round table, in green. */
export function SeatedArt({ size = 150 }: { size?: number }) {
  return (
    <svg viewBox="0 0 160 160" width={size} height={size} aria-hidden>
      <defs>
        <linearGradient id="yy-seat-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7fe0a8" />
          <stop offset="1" stopColor="#12a150" />
        </linearGradient>
      </defs>
      <ellipse cx="96" cy="70" rx="46" ry="14" fill="url(#yy-seat-a)" />
      <rect x="92" y="78" width="8" height="58" rx="4" fill="#12a150" opacity="0.8" />
      <rect x="74" y="132" width="44" height="8" rx="4" fill="#12a150" opacity="0.6" />
      <rect x="22" y="40" width="14" height="70" rx="7" fill="#3cc479" />
      <rect x="22" y="92" width="50" height="14" rx="7" fill="url(#yy-seat-a)" />
      <rect x="28" y="104" width="8" height="36" rx="4" fill="#12a150" opacity="0.7" />
      <rect x="58" y="104" width="8" height="36" rx="4" fill="#12a150" opacity="0.7" />
      <circle cx="96" cy="66" r="9" fill="#fff" fillOpacity="0.7" />
    </svg>
  );
}

/** Guests: three people, the front one in the brand blue. */
export function GuestsArt({ size = 150 }: { size?: number }) {
  return (
    <svg viewBox="0 0 160 160" width={size} height={size} aria-hidden>
      <defs>
        <linearGradient id="yy-guests-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9cbcff" />
          <stop offset="0.55" stopColor="#2f6bff" />
          <stop offset="1" stopColor="#2530b0" />
        </linearGradient>
      </defs>
      {[
        [44, 0.35],
        [116, 0.35],
      ].map(([x, o]) => (
        <g key={x} opacity={o as number}>
          <circle cx={x as number} cy="58" r="17" fill="#2f6bff" />
          <path d={`M${(x as number) - 30} 128a30 30 0 0 1 60 0z`} fill="#2f6bff" />
        </g>
      ))}
      <circle cx="80" cy="64" r="22" fill="url(#yy-guests-a)" />
      <path d="M40 146a40 40 0 0 1 80 0z" fill="url(#yy-guests-a)" />
      <circle cx="73" cy="58" r="5" fill="#fff" fillOpacity="0.5" />
    </svg>
  );
}
