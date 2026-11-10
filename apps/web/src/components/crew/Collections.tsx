"use client";

import { Trophy } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { CrewData, CrewQuest } from "@/lib/demo-crew";
import { haptic } from "@/lib/haptics";
import { Sheet } from "@/components/guest/ui";
import { BADGE_ICON, BADGE_INFO, BADGE_TIER, QuestRow, QUEST_ICON } from "./CrewBoard";
import { BadgeEmblem, QuestMedal, type Tier } from "./Emblems";
import { HeroCarousel } from "./HeroCarousel";
import { useTr } from "./prefs";

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
  const tr = useTr();
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
        {tr("Take")}
      </button>
    ) : q.state === "done" ? (
      <button
        onClick={() => {
          haptic("success");
          onClaim(q);
        }}
        className="blue-grad press h-9 shrink-0 rounded-full px-4 text-[14px] font-semibold"
      >
        {tr("Claim")}
      </button>
    ) : undefined;
  const [at, setAt] = useState(0);
  const cur = list[Math.min(at, list.length - 1)];
  const medal = (q: CrewQuest) => (q.state === "done" ? "done" : q.state === "available" ? "available" : "active");
  return (
    <Sheet open onClose={onClose} label={tr("Quests")} title={false}>
      <div className="px-5 pt-1 pb-10">
        <h2 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">{tr("Quests")}</h2>
        <p className="mt-1 text-[14px] text-g-muted">
          {active.length} {tr("in progress")} · {available.length} {tr("on the board")}
        </p>
        <div className="mt-5">
          <Tabs
            value={tab}
            onChange={(t) => {
              setAt(0);
              onTab(t);
            }}
            options={[
              ["yours", `${tr("Your quests")} · ${active.length}`],
              ["board", `${tr("Quest board")} · ${available.length}`],
            ]}
          />
        </div>

        {cur ? (
          <>
            <div className="mt-6">
              <HeroCarousel key={tab} items={list} index={at} onIndex={setAt} height={190} render={(q) => <QuestMedal state={medal(q)} icon={QUEST_ICON[q.id] ?? Trophy} size={172} />} />
            </div>
            {/* What is in the centre right now. */}
            <section key={cur.id} className="animate-tab mt-5 text-center">
              <p className="text-[24px] leading-tight font-bold tracking-[-0.02em]">{tr(cur.title)}</p>
              <p className="mt-1 text-[13px] font-semibold text-g-muted">{cur.mode === "race" ? tr("Race · first to finish wins") : tr("Solo quest")}</p>
              <p className="mx-auto mt-3 max-w-[300px] text-[15px] leading-snug text-g-ink-2">{tr(cur.description)}</p>
              {cur.state !== "available" && (
                <div className="mx-auto mt-4 max-w-[300px]">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-g-muted">{tr("Progress")}</span>
                    <span className="font-semibold tabular-nums">
                      {cur.progress}/{cur.target}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-g-fill">
                    <div className={`h-full rounded-full ${cur.state === "done" ? "green-grad" : "bar-grad"}`} style={{ width: `${Math.round((cur.progress / cur.target) * 100)}%` }} />
                  </div>
                </div>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2 text-left">
                <div className="rounded-[18px] bg-g-fill p-3.5">
                  <p className="text-[12px] text-g-muted">{tr("Reward")}</p>
                  <p className="text-[15px] font-semibold">
                    +{cur.reward.xp} XP{cur.reward.bonus ? ` · ${money(cur.reward.bonus)}` : ""}
                  </p>
                </div>
                <div className="rounded-[18px] bg-g-fill p-3.5">
                  <p className="text-[12px] text-g-muted">{tr("Deadline")}</p>
                  <p className="text-[15px] font-semibold">{tr(cur.endsAt)}</p>
                </div>
              </div>
              {(tab === "board" || cur.state === "done") && <div className="mt-4 flex justify-center">{action(cur)}</div>}
            </section>

            <h3 className="mt-10 text-[13px] font-semibold tracking-[0.06em] text-g-muted uppercase">{tr("All quests")}</h3>
            <div className="mt-1 divide-y divide-g-line">
              {list.map((q) => (
                <QuestRow key={q.id} q={q} money={money} onPeek={() => onPeek(q.id)} action={action(q)} />
              ))}
            </div>
          </>
        ) : (
          <div className="py-16 text-center">
            <span className="mx-auto grid size-16 place-items-center rounded-full bg-g-fill text-g-faint">
              <Trophy size={26} strokeWidth={1.7} />
            </span>
            <p className="mt-4 text-[17px] font-semibold">{tab === "yours" ? tr("No quests in progress") : tr("The board is empty")}</p>
            <p className="mt-1 text-[14px] text-g-muted">{tab === "yours" ? tr("Take one from the quest board.") : tr("New quests arrive every Monday.")}</p>
          </div>
        )}
      </div>
    </Sheet>
  );
}

/** Every badge, earned first, with how far along the rest are. */
export function BadgesPage({ badges, onClose }: { badges: CrewData["badges"]; onClose: () => void }) {
  const tr = useTr();
  const sorted = [...badges].sort((a, b) => Number(b.earned) - Number(a.earned));
  const earned = badges.filter((b) => b.earned).length;
  const [at, setAt] = useState(0);
  const cur = sorted[at]!;
  const info = BADGE_INFO[cur.id];
  const tier = BADGE_TIER[cur.id] ?? "silver";
  return (
    <Sheet open onClose={onClose} label={tr("Badges")} title={false}>
      <div className="px-5 pt-1 pb-10">
        <h2 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">{tr("Badges")}</h2>
        <p className="mt-1 text-[14px] text-g-muted">
          {earned} {tr("of")} {badges.length} {tr("earned")}
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-g-fill">
          <div className="bar-grad h-full rounded-full" style={{ width: `${(earned / badges.length) * 100}%` }} />
        </div>

        <div className="mt-6">
          <HeroCarousel items={sorted} index={at} onIndex={setAt} height={200} render={(b) => <BadgeEmblem tier={BADGE_TIER[b.id] ?? "silver"} icon={BADGE_ICON[b.id] ?? Trophy} earned={b.earned} size={180} />} />
        </div>

        {/* The badge in the centre: name, metal, story and how to get it. */}
        <section key={cur.id} className="animate-tab mt-5 text-center">
          <p className="text-[24px] leading-tight font-bold tracking-[-0.02em]">{tr(cur.name)}</p>
          <p className="mt-1.5 flex items-center justify-center gap-2 text-[13px] font-semibold">
            <span className="rounded-full bg-g-fill px-2.5 py-1 text-g-ink-2">{tr(TIER_NAME[tier])}</span>
            <span className={cur.earned ? "text-g-green" : "text-g-muted"}>{cur.earned ? tr("Earned") : tr("Not yet")}</span>
          </p>
          {info && <p className="mx-auto mt-3 max-w-[300px] text-[15px] leading-snug text-g-ink-2">{tr(info.what)}</p>}
          {info && (
            <p className="mt-3 rounded-[18px] bg-g-fill px-4 py-3 text-left text-[14px] leading-snug">
              <span className="font-semibold">{tr("How to get it")}: </span>
              {tr(info.how)}
            </p>
          )}
          {!cur.earned && info && (
            <div className="mx-auto mt-4 max-w-[300px]">
              <div className="h-1.5 overflow-hidden rounded-full bg-g-fill">
                <div className="bar-grad h-full rounded-full" style={{ width: `${info.progress}%` }} />
              </div>
              <p className="mt-1.5 text-[12px] text-g-muted">
                {info.progress}% {tr("there")}
              </p>
            </div>
          )}
        </section>

        <h3 className="mt-10 text-[13px] font-semibold tracking-[0.06em] text-g-muted uppercase">{tr("All badges")}</h3>
        <div className="mt-3 grid grid-cols-4 gap-x-2 gap-y-4">
          {sorted.map((b, i) => (
            <button
              key={b.id}
              onClick={() => {
                haptic("tick");
                setAt(i);
              }}
              aria-pressed={i === at}
              className={`press flex flex-col items-center gap-1 rounded-[20px] py-2 text-center transition-colors ${i === at ? "bg-g-fill" : ""}`}
            >
              <BadgeEmblem tier={BADGE_TIER[b.id] ?? "silver"} icon={BADGE_ICON[b.id] ?? Trophy} earned={b.earned} size={64} />
              <span className={`text-[11px] leading-tight font-semibold ${b.earned ? "" : "text-g-muted"}`}>{tr(b.name)}</span>
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

const TIER_NAME: Record<Tier, string> = { bronze: "Bronze", silver: "Silver", gold: "Gold", sapphire: "Sapphire", diamond: "Diamond" };
