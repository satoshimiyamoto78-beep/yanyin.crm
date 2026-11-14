"use client";

import { type ReactNode } from "react";
import { haptic } from "@/lib/haptics";
import { ArtScene, sceneStyle, type ArtName, type ArtTone } from "./Art";

/*
 * The quick-action strip under the blue header, shared by the guest menu and
 * the waiter app: two rows of 62 px. Big cards span both rows, squares are one
 * action each, wide cards carry a title and a hint. Same sizes, radii and type
 * everywhere, so both apps read as one product.
 */

/** Full-width strip; items rest on the page gutter and scroll plainly to the screen edges. */
export function Strip({ children }: { children: ReactNode }) {
  return (
    <div className="no-scrollbar mt-7 grid scroll-px-5 grid-flow-col grid-rows-2 gap-2.5 overflow-x-auto px-5 [grid-auto-columns:max-content]">
      {children}
    </div>
  );
}

const tap = (fn: () => void) => () => {
  haptic("light");
  fn();
};

/** One action, icon over a short label, on the same soft scene as the cards. */
export function StripSquare({ icon, label, onClick, tone = "blue" }: { icon: ReactNode; label: string; onClick: () => void; tone?: ArtTone }) {
  return (
    <button aria-label={label} onClick={tap(onClick)} style={sceneStyle(tone)} className="art-scene press relative isolate flex h-[62px] min-w-[62px] flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[20px] px-1.5 text-g-ink strip-tile">
      <span aria-hidden className="art-grain pointer-events-none absolute inset-0 -z-10" />
      <span className={TONE_INK[tone]}>{icon}</span>
      <span className="max-w-full truncate text-[10px] font-semibold whitespace-nowrap">{label}</span>
    </button>
  );
}

const TONE_INK: Record<ArtTone, string> = { blue: "text-g-blue", green: "text-g-green", sunset: "text-g-orange", teal: "text-g-teal", coral: "text-[#e5484d]", night: "text-g-blue" };

/**
 * Short wide card: illustration and two lines. `corner` puts a large
 * illustration in the top-left corner, cropped to a quarter.
 */
export function StripWide({ onClick, art, corner, title, sub }: { onClick: () => void; art?: ReactNode; corner?: ReactNode; title: string; sub: string }) {
  return (
    <button onClick={tap(onClick)} className={`press relative flex h-[62px] w-[158px] items-center gap-2.5 strip-tile overflow-hidden rounded-[20px] bg-white pr-3 text-left text-g-ink ${corner ? "pl-[64px]" : "pl-2.5"}`}>
      {corner}
      {art && <span className="grid size-10 shrink-0 place-items-center">{art}</span>}
      <span className="relative min-w-0">
        <span className="block truncate text-[14px] leading-tight font-semibold">{title}</span>
        <span className="mt-0.5 block truncate text-[11px] text-g-muted">{sub}</span>
      </span>
    </button>
  );
}

/** Big card over both rows: a round icon on top, the value or action below. */
export function StripBig({
  icon,
  title,
  sub,
  badge,
  onClick,
  tone = "muted",
  children,
  wide = false,
  art,
}: {
  icon: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  badge?: ReactNode;
  onClick?: () => void;
  tone?: "muted" | "orange";
  children?: ReactNode;
  wide?: boolean;
  /** An illustrated scene instead of the round icon, like the stat cards. */
  art?: ArtName;
}) {
  if (art) {
    const inner = (
      <ArtScene name={art} focal={44} className={`h-[134px] ${wide ? "w-[170px]" : "w-[148px]"} rounded-[22px] p-3.5 text-left text-g-ink strip-tile`}>
        {badge && <span className="absolute top-3 right-3">{badge}</span>}
        <span className="mt-auto block min-w-0">
          <span className="live block truncate text-[17px] leading-tight font-semibold tabular-nums">{title}</span>
          {sub && <span className={`mt-1 block truncate text-[12px] tabular-nums ${tone === "orange" ? "font-medium text-g-orange" : "text-g-muted"}`}>{sub}</span>}
          {children}
        </span>
      </ArtScene>
    );
    return onClick ? (
      <button onClick={tap(onClick)} className="press row-span-2 block text-left">
        {inner}
      </button>
    ) : (
      <div className="row-span-2">{inner}</div>
    );
  }
  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="blue-grad grid size-10 shrink-0 place-items-center rounded-full">{icon}</span>
        {badge}
      </span>
      <span className="min-w-0">
        <span className="live block truncate text-[17px] leading-tight font-semibold tabular-nums">{title}</span>
        {sub && <span className={`mt-1 block truncate text-[12px] tabular-nums ${tone === "orange" ? "font-medium text-g-orange" : "text-g-muted"}`}>{sub}</span>}
        {children}
      </span>
    </>
  );
  const cls = `row-span-2 flex h-[134px] ${wide ? "w-[170px]" : "w-[148px]"} flex-col justify-between rounded-[22px] bg-white p-3.5 text-left text-g-ink strip-tile`;
  return onClick ? (
    <button onClick={tap(onClick)} className={`press ${cls}`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}
