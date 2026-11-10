"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { haptic } from "@/lib/haptics";

/*
 * The parts every hold-to-open card shares, so a booking, a dish or a table
 * read the same: a header (small label, big title, fact pills with icons) and
 * a list of actions (icon in a tinted circle, label; destructive in red).
 */

export type Fact = { icon: LucideIcon; text: string; tone?: "plain" | "warn" | "blue" };

/** Phone numbers in readable groups: "+84 905 123 456", "646 464 664 64". */
export function prettyPhone(p: string) {
  if (/\s/.test(p.trim())) return p.trim();
  const plus = p.trim().startsWith("+");
  const d = p.replace(/\D/g, "");
  const g = d.replace(/(\d{3})(?=\d)/g, "$1 ");
  return plus ? `+${g}` : g;
}

export function PeekHeader({ kicker, title, facts, aside }: { kicker?: ReactNode; title: string; facts?: Fact[]; aside?: ReactNode }) {
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {kicker && <p className="text-[13px] font-semibold text-g-blue tabular-nums">{kicker}</p>}
          <p className="mt-0.5 text-[22px] leading-tight font-bold tracking-[-0.02em] break-words">{title}</p>
        </div>
        {aside}
      </div>
      {facts && facts.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {facts.map((f) => (
            <span
              key={f.text}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold tabular-nums ${f.tone === "warn" ? "chip-orange" : f.tone === "blue" ? "chip-blue" : "bg-g-fill text-g-ink-2"}`}
            >
              <f.icon size={14} strokeWidth={2.2} className={f.tone ? "" : "text-g-muted"} /> {f.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export type PeekAction = { icon: LucideIcon; label: string; onClick?: () => void; href?: string; tone?: "plain" | "good" | "danger" };

export function PeekActions({ items }: { items: PeekAction[] }) {
  return (
    <div className="mt-4 overflow-hidden rounded-[20px] bg-g-fill">
      {items.map((a, i) => {
        const circle = a.tone === "danger" ? "chip-red" : a.tone === "good" ? "chip-green" : "bg-white text-g-ink";
        const body = (
          <>
            <span className={`grid size-9 shrink-0 place-items-center rounded-full ${circle}`}>
              <a.icon size={17} strokeWidth={2.2} />
            </span>
            <span className={`flex-1 text-[15px] font-semibold ${a.tone === "danger" ? "text-[#e5484d]" : ""}`}>{a.label}</span>
          </>
        );
        const cls = `press flex w-full items-center gap-3 px-3.5 py-2.5 text-left ${i ? "border-t border-g-line" : ""}`;
        return a.href ? (
          <a key={a.label} href={a.href} onClick={() => haptic("light")} className={cls}>
            {body}
          </a>
        ) : (
          <button
            key={a.label}
            onClick={() => {
              haptic("light");
              a.onClick?.();
            }}
            className={cls}
          >
            {body}
          </button>
        );
      })}
    </div>
  );
}
