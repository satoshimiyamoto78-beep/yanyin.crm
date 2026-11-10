"use client";

import { Trophy } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { CrewData, CrewQuest } from "@/lib/demo-crew";
import { haptic } from "@/lib/haptics";
import { Sheet } from "@/components/guest/ui";
import { BADGE_ICON, BADGE_INFO, BadgePeek, QuestRow } from "./CrewBoard";

/** Segmented control in the system style. */
function Tabs<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-full bg-g-fill p-1">
      {options.map(([id, label]) => (
        <button
          key={id}
          onClick={() => {
            haptic("tick");
            onChange(id);
          }}
          aria-pressed={value === id}
          className={`h-10 flex-1 rounded-full text-[14px] font-semibold transition-colors ${value === id ? "bg-white text-g-ink" : "text-g-muted"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Every quest: the ones in progress and the whole board, one tap apart. */
export function QuestsPage({
  tab,
  onTab,
  active,
  available,
  money,
  onPeek,
  onTake,
  onClaim,
  onClose,
}: {
  tab: "yours" | "board";
  onTab: (t: "yours" | "board") => void;
  active: CrewQuest[];
  available: CrewQuest[];
  money: (n: number) => string;
  onPeek: (id: string) => void;
  onTake: (id: string) => void;
  onClaim: (q: CrewQuest) => void;
  onClose: () => void;
}) {
  const list = tab === "yours" ? active : available;
  const action = (q: CrewQuest): ReactNode =>
    tab === "board" ? (
      <button
        onClick={() => {
          haptic("light");
          onTake(q.id);
        }}
        className="press h-9 shrink-0 rounded-full bg-g-ink px-4 text-[14px] font-semibold text-white"
      >
        Take
      </button>
    ) : q.state === "done" ? (
      <button
        onClick={() => {
          haptic("success");
          onClaim(q);
        }}
        className="blue-grad press h-9 shrink-0 rounded-full px-4 text-[14px] font-semibold"
      >
        Claim
      </button>
    ) : undefined;
  return (
    <Sheet open onClose={onClose} label="Quests" title={false}>
      <div className="px-5 pt-1 pb-10">
        <h2 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">Quests</h2>
        <p className="mt-1 text-[14px] text-g-muted">
          {active.length} in progress · {available.length} on the board
        </p>
        <div className="mt-5">
          <Tabs
            value={tab}
            onChange={onTab}
            options={[
              ["yours", `Your quests · ${active.length}`],
              ["board", `Quest board · ${available.length}`],
            ]}
          />
        </div>
        <div className="mt-2 divide-y divide-g-line">
          {list.map((q) => (
            <QuestRow key={q.id} q={q} money={money} onPeek={() => onPeek(q.id)} action={action(q)} />
          ))}
        </div>
        {!list.length && (
          <div className="py-16 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-g-fill text-g-faint">
              <Trophy size={26} strokeWidth={1.7} />
            </span>
            <p className="mt-4 text-[17px] font-semibold">{tab === "yours" ? "No quests in progress" : "The board is empty"}</p>
            <p className="mt-1 text-[14px] text-g-muted">{tab === "yours" ? "Take one from the quest board." : "New quests arrive every Monday."}</p>
          </div>
        )}
      </div>
    </Sheet>
  );
}

/** Every badge, earned first, with how far along the rest are. */
export function BadgesPage({ badges, onClose }: { badges: CrewData["badges"]; onClose: () => void }) {
  const [peek, setPeek] = useState<string | null>(null);
  const open = badges.find((b) => b.id === peek);
  const sorted = [...badges].sort((a, b) => Number(b.earned) - Number(a.earned));
  const earned = badges.filter((b) => b.earned).length;
  return (
    <Sheet open onClose={onClose} label="Badges" title={false}>
      <div className="px-5 pt-1 pb-10">
        <h2 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">Badges</h2>
        <p className="mt-1 text-[14px] text-g-muted">
          {earned} of {badges.length} earned
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-g-fill">
          <div className="bar-grad h-full rounded-full" style={{ width: `${(earned / badges.length) * 100}%` }} />
        </div>
        <div className="mt-6 grid grid-cols-3 gap-x-3 gap-y-6">
          {sorted.map((b) => {
            const Icon = BADGE_ICON[b.id] ?? Trophy;
            const info = BADGE_INFO[b.id];
            return (
              <button
                key={b.id}
                onClick={() => {
                  haptic("light");
                  setPeek(b.id);
                }}
                className="press flex flex-col items-center text-center"
              >
                <span className={`grid size-[76px] place-items-center rounded-full ${b.earned ? "blue-grad" : "bg-g-fill text-g-faint"}`}>
                  <Icon size={30} strokeWidth={1.7} />
                </span>
                <span className={`mt-2 text-[13px] leading-tight font-semibold ${b.earned ? "" : "text-g-muted"}`}>{b.name}</span>
                <span className="mt-1 text-[12px] text-g-muted tabular-nums">{b.earned ? "Earned" : `${info?.progress ?? 0}%`}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-8 text-center text-[13px] text-g-faint">Tap a badge to see how to earn it</p>
      </div>
      {open && <BadgePeek b={open} onClose={() => setPeek(null)} />}
    </Sheet>
  );
}
