"use client";

import type { ReactNode } from "react";
import { haptic } from "@/lib/haptics";

/*
 * The quick-action strip under the blue header, shared by the guest menu and
 * the waiter app: two rows of 62 px. Big cards span both rows, squares are one
 * action each, wide cards carry a title and a hint. Same sizes, radii and type
 * everywhere, so both apps read as one product.
 */

export function Strip({ children }: { children: ReactNode }) {
  return <div className="no-scrollbar mt-7 grid grid-flow-col grid-rows-2 gap-2.5 overflow-x-auto px-5 [grid-auto-columns:max-content]">{children}</div>;
}

const tap = (fn: () => void) => () => {
  haptic("light");
  fn();
};

/** One action, icon over a short label. */
export function StripSquare({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button aria-label={label} onClick={tap(onClick)} className="press flex size-[62px] flex-col items-center justify-center gap-0.5 rounded-[20px] bg-white text-g-ink">
      {icon}
      <span className="max-w-full truncate px-1 text-[10px] font-semibold">{label}</span>
    </button>
  );
}

/**
 * Short wide card: illustration and two lines. `corner` puts a large
 * illustration in the top-left corner, cropped to a quarter.
 */
export function StripWide({ onClick, art, corner, title, sub }: { onClick: () => void; art?: ReactNode; corner?: ReactNode; title: string; sub: string }) {
  return (
    <button onClick={tap(onClick)} className={`press relative flex h-[62px] w-[158px] items-center gap-2.5 overflow-hidden rounded-[20px] bg-white pr-3 text-left text-g-ink ${corner ? "pl-[64px]" : "pl-2.5"}`}>
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
}: {
  icon: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  badge?: ReactNode;
  onClick?: () => void;
  tone?: "muted" | "orange";
  children?: ReactNode;
  wide?: boolean;
}) {
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
  const cls = `row-span-2 flex h-[134px] ${wide ? "w-[170px]" : "w-[148px]"} flex-col justify-between rounded-[22px] bg-white p-3.5 text-left text-g-ink`;
  return onClick ? (
    <button onClick={tap(onClick)} className={`press ${cls}`}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}
