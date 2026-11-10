"use client";

import { type LucideIcon } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { haptic } from "@/lib/haptics";
import { YanOrb } from "@/components/guest/YanSheet";
import { useTr } from "./prefs";
import { useEdgeSoften, useMoreSides } from "@/components/system/useEdgeSoften";
import { EdgeBlur } from "@/components/system/EdgeBlur";

export type Tip = {
  id: string;
  /** Small label above the title: "Yan tip", "Quest of the week". */
  kicker: string;
  title: string;
  text: string;
  icon: LucideIcon;
  tone: "blue" | "green" | "orange" | "ink";
  action?: { label: string; onClick: () => void };
};

const TONE: Record<Tip["tone"], { bg: string; ink: string; icon: string }> = {
  blue: { bg: "bg-g-tint-blue", ink: "text-g-blue", icon: "blue-grad" },
  green: {
    bg: "bg-g-tint-green",
    ink: "text-g-green",
    icon: "bg-g-green text-white",
  },
  orange: {
    bg: "bg-g-tint-orange",
    ink: "text-g-orange",
    icon: "bg-g-orange text-white",
  },
  ink: { bg: "bg-g-fill", ink: "text-g-ink-2", icon: "bg-g-ink text-white" },
};

/**
 * Yan's tips for the shift. Cards land on the page gutter (not the screen edge),
 * one card per swipe, the next one peeks in; dots follow the scroll and every
 * landing ticks the haptics.
 */
export function TipsCarousel({
  tips,
  aside,
}: {
  tips: Tip[];
  aside?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const tr = useTr();
  useEdgeSoften(ref);
  useMoreSides(ref);
  const [at, setAt] = useState(0);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 10 : el.clientWidth;
    const i = Math.min(tips.length - 1, Math.round(el.scrollLeft / step));
    if (i !== at) {
      setAt(i);
      haptic("tick");
    }
  };
  const go = (i: number) => {
    const el = ref.current;
    const card = el?.children[0] as HTMLElement | undefined;
    if (!el || !card) return;
    el.scrollTo({ left: i * (card.offsetWidth + 10), behavior: "smooth" });
  };

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[17px] font-semibold">
          <YanOrb size={24} /> {tr("Yan suggests")}
        </h2>
        {aside ?? (
          <span className="text-[13px] text-g-muted tabular-nums">
            {at + 1} {tr("of")} {tips.length}
          </span>
        )}
      </div>

      <div className="edge-host -mx-5 mt-3">
        <div
          ref={ref}
          onScroll={onScroll}
          className="no-scrollbar flex snap-x snap-mandatory scroll-px-5 gap-2.5 px-5 overflow-x-auto overscroll-x-contain [scroll-behavior:smooth]"
        >
          {tips.map((t) => {
            const tone = TONE[t.tone];
            const Icon = t.icon;
            return (
              <article
                key={t.id}
                className={`${tone.bg} flex h-[164px] w-[82%] shrink-0 snap-start snap-always flex-col rounded-[24px] p-4`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`${tone.icon} grid size-8 shrink-0 place-items-center rounded-full`}
                  >
                    <Icon size={16} strokeWidth={2} />
                  </span>
                  <span className={`text-[13px] font-semibold ${tone.ink}`}>
                    {t.kicker}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-[16px] leading-snug font-semibold">
                  {t.title}
                </p>
                <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-g-muted">
                  {t.text}
                </p>
                {t.action && (
                  <button
                    onClick={() => {
                      haptic("light");
                      t.action!.onClick();
                    }}
                    className="press mt-auto h-8 self-start rounded-full bg-g-ink px-3.5 text-[13px] font-semibold text-white"
                  >
                    {t.action.label}
                  </button>
                )}
              </article>
            );
          })}
          {/* Lets the last card land on the gutter too. */}
          <span aria-hidden className="w-[calc(18%-10px)] shrink-0" />
        </div>
        <EdgeBlur />
      </div>

      <div
        className="mt-3 flex justify-center gap-1.5"
        role="tablist"
        aria-label="Tips"
      >
        {tips.map((t, i) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={i === at}
            aria-label={`Tip ${i + 1}`}
            onClick={() => go(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === at ? "w-5 bg-g-ink" : "w-1.5 bg-g-fill-2"}`}
          />
        ))}
      </div>
    </section>
  );
}
