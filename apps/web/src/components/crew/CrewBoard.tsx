"use client";

import { formatMoney, levelFromXp, questPercent } from "@yanyin/domain";
import { CakeSlice, Check, CookingPot, Crown, Dices, Flame, Heart, Recycle, Star, Trophy, Users, Zap, type LucideIcon } from "lucide-react";
import { useState } from "react";
import type { CrewData, CrewQuest } from "@/lib/demo-crew";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

const QUEST_ICON: Record<string, LucideIcon> = {
  "plov-master": CookingPot,
  "sweet-finish": CakeSlice,
  "five-stars": Star,
  "shashlik-sunday": Flame,
  "roulette-host": Dices,
};
const BADGE_ICON: Record<string, LucideIcon> = { upsell: Crown, speed: Zap, fav: Heart, waste: Recycle };

/** Short money for tiles: 4 820 000 → 4.8M, 210 000 → 210k. */
function short(n: number): string {
  if (n >= 1_000_000) return `${+(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

/**
 * yanyin.crew — the waiter's own page: level, today's numbers, streak, the team
 * goal and quests. Same white, black and blue system as the guest menu (ADR-013).
 */
export function CrewBoard({ data }: { data: CrewData }) {
  const [xp, setXp] = useState(data.staff.xp);
  const [quests, setQuests] = useState(data.quests);
  const [done, setDone] = useState<CrewQuest | null>(null);
  const level = levelFromXp(xp);
  const pct = Math.round((level.xpIntoLevel / level.xpForNext) * 100);
  const money = (n: number) => formatMoney(n, data.currency, "en");

  const take = (id: string) => setQuests((qs) => qs.map((q) => (q.id === id ? { ...q, state: "active" } : q)));
  const claim = (q: CrewQuest) => {
    setXp((v) => v + q.reward.xp);
    setQuests((qs) => qs.filter((x) => x.id !== q.id));
    setDone(q);
    setTimeout(() => setDone(null), 2400);
  };

  const active = quests.filter((q) => q.state !== "available");
  const available = quests.filter((q) => q.state === "available");
  const boss = questPercent(data.boss.progress, data.boss.target);

  return (
    <main className="min-h-dvh overflow-x-hidden bg-g-bg text-g-ink">
      <div className="mx-auto max-w-[480px] px-5 pt-[max(20px,env(safe-area-inset-top))] pb-16">
        {/* Header */}
        <header className="flex items-center gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-g-ink text-[19px] font-bold text-white">{data.staff.name[0]}</span>
          <div className="min-w-0">
            <h1 className="truncate text-[22px] leading-tight font-bold tracking-[-0.02em]">{data.staff.name}</h1>
            <p className="truncate text-[13px] text-g-muted">
              {data.staff.role} · {data.staff.venue}
            </p>
          </div>
        </header>

        {/* Level */}
        <section className="mt-6 rounded-[28px] bg-g-fill p-5">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-g-muted">Level {level.level}</p>
              <p className="text-[28px] leading-tight font-bold tracking-[-0.02em]">{level.title}</p>
            </div>
            <p className="shrink-0 text-[15px] font-semibold tabular-nums">
              {level.xpIntoLevel}
              <span className="text-g-muted"> / {level.xpForNext} XP</span>
            </p>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-g-blue transition-[width] duration-700" style={{ width: `${pct}%` }} />
          </div>
        </section>

        {/* Today */}
        <section className="mt-3 grid grid-cols-3 gap-2.5">
          <Stat label="Sales today" value={short(data.today.sales)} />
          <Stat label="Tips" value={short(data.today.tips)} />
          <Stat label="Avg check" value={short(data.today.avgCheck)} />
        </section>

        {/* Streak */}
        <section className="mt-3 rounded-[28px] bg-g-fill p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-[17px] font-semibold">
              <Flame size={20} strokeWidth={1.75} />
              {data.staff.streakDays}-day streak
            </p>
            <p className="text-[13px] text-g-muted">On time every shift</p>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-2">
            {data.staff.week.map((on, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <span
                  className={`grid aspect-square w-full max-w-10 place-items-center rounded-full ${on ? "bg-g-blue text-white" : "border-[1.5px] border-dashed border-g-faint"}`}
                >
                  {on && <Check size={15} strokeWidth={2.75} />}
                </span>
                <span className="text-[12px] text-g-muted">{DAYS[i]}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Team goal */}
        <section className="mt-3 rounded-[28px] bg-g-ink p-5 text-white">
          <p className="flex items-center gap-2 text-[13px] font-medium text-white/60">
            <Users size={16} strokeWidth={1.75} /> Team goal
          </p>
          <p className="mt-1 text-[22px] leading-tight font-bold tracking-[-0.02em]">{short(data.boss.target)} ₫ this week</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-g-blue" style={{ width: `${boss}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[13px] text-white/60">
            <span className="tabular-nums">
              {short(data.boss.progress)} of {short(data.boss.target)} · {boss}%
            </span>
            <span>
              {data.boss.reward} · {data.boss.endsIn}
            </span>
          </div>
        </section>

        {/* Active quests */}
        <SectionTitle title="Your quests" count={active.length} />
        <div>
          {active.map((q) => (
            <QuestRow key={q.id} q={q} money={money}>
              {q.state === "done" && (
                <button onClick={() => claim(q)} className="press mt-3 h-10 w-full rounded-full bg-g-blue text-[15px] font-semibold text-white">
                  Claim +{q.reward.xp} XP{q.reward.perk ? ` · ${q.reward.perk}` : ""}
                </button>
              )}
            </QuestRow>
          ))}
          {!active.length && <p className="py-6 text-[15px] text-g-muted">Take a quest below to start.</p>}
        </div>

        {/* Quest board */}
        {available.length > 0 && (
          <>
            <SectionTitle title="Quest board" count={available.length} />
            <div>
              {available.map((q) => (
                <QuestRow key={q.id} q={q} money={money} action={
                  <button onClick={() => take(q.id)} className="press h-9 shrink-0 rounded-full bg-g-ink px-4 text-[14px] font-semibold text-white">
                    Take
                  </button>
                } />
              ))}
            </div>
          </>
        )}

        {/* Badges */}
        <SectionTitle title="Badges" count={data.badges.filter((b) => b.earned).length} />
        <div className="grid grid-cols-4 gap-2.5">
          {data.badges.map((b) => {
            const Icon = BADGE_ICON[b.id] ?? Trophy;
            return (
              <div key={b.id} className="flex flex-col items-center gap-2 text-center">
                <span className={`grid aspect-square w-full place-items-center rounded-[22px] ${b.earned ? "bg-g-fill text-g-ink" : "border-[1.5px] border-dashed border-g-line text-g-faint"}`}>
                  <Icon size={24} strokeWidth={1.75} />
                </span>
                <span className={`text-[12px] leading-tight ${b.earned ? "text-g-ink-2" : "text-g-faint"}`}>{b.name}</span>
              </div>
            );
          })}
        </div>

        {/* Leaderboard */}
        <SectionTitle title="This week" />
        <ol>
          {data.leaderboard.map((p, i) => (
            <li key={p.name} className={`flex items-center gap-4 rounded-[18px] px-4 py-3.5 ${p.me ? "bg-g-blue-soft" : ""}`}>
              <span className={`w-5 text-[15px] font-semibold tabular-nums ${p.me ? "text-g-blue" : "text-g-faint"}`}>{i + 1}</span>
              <span className={`min-w-0 flex-1 truncate text-[16px] ${p.me ? "font-semibold text-g-blue" : "font-medium"}`}>{p.me ? `${p.name} (you)` : p.name}</span>
              <span className="shrink-0 text-[15px] font-semibold tabular-nums">{p.me ? xp : p.xp} XP</span>
            </li>
          ))}
        </ol>

        <p className="mt-10 text-center text-[13px] text-g-faint">Progress counts automatically from orders · leaderboards can be turned off by the venue</p>
      </div>

      {done && (
        <div role="status" className="animate-fade fixed inset-0 z-50 grid place-items-center bg-white/90 p-6 backdrop-blur-md">
          <div className="animate-pop text-center">
            <span className="mx-auto grid size-20 place-items-center rounded-full bg-g-blue text-white">
              <Check size={36} strokeWidth={2.5} />
            </span>
            <p className="mt-6 text-[28px] font-bold tracking-[-0.02em]">Quest complete</p>
            <p className="mt-1 text-[17px] text-g-muted">{done.title}</p>
            <p className="mt-4 text-[20px] font-semibold text-g-blue">+{done.reward.xp} XP</p>
          </div>
        </div>
      )}
    </main>
  );
}

function SectionTitle({ title, count }: { title: string; count?: number }) {
  return (
    <h2 className="mt-10 mb-2 flex items-baseline gap-2 text-[24px] leading-tight font-bold tracking-[-0.025em]">
      {title}
      {count !== undefined && <span className="text-[15px] font-medium tracking-normal text-g-faint">{count}</span>}
    </h2>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[22px] bg-g-fill p-4">
      <p className="truncate text-[13px] text-g-muted">{label}</p>
      <p className="mt-1 text-[22px] leading-tight font-bold tracking-[-0.02em] tabular-nums">{value}</p>
    </div>
  );
}

function QuestRow({ q, money, action, children }: { q: CrewQuest; money: (n: number) => string; action?: React.ReactNode; children?: React.ReactNode }) {
  const Icon = QUEST_ICON[q.id] ?? Trophy;
  const pct = questPercent(q.progress, q.target);
  const reward = `+${q.reward.xp} XP${q.reward.bonus ? ` · ${money(q.reward.bonus)}` : ""}`;
  return (
    <div className="border-b border-g-line py-4 last:border-b-0">
      <div className="flex items-start gap-3.5">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-g-fill">
          <Icon size={22} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="min-w-0 text-[16px] leading-snug font-semibold">{q.title}</p>
            {q.state !== "available" && (
              <span className="shrink-0 text-[15px] font-semibold tabular-nums">
                {q.progress}
                <span className="text-g-faint">/{q.target}</span>
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[14px] leading-snug text-g-muted">
            {q.description} · {q.endsAt}
          </p>
          {q.state !== "available" ? (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-g-fill">
              <div className={`h-full rounded-full ${q.state === "done" ? "bg-g-green" : "bg-g-blue"}`} style={{ width: `${pct}%` }} />
            </div>
          ) : (
            <p className="mt-1.5 text-[14px] font-semibold text-g-blue">
              {reward}
              {q.mode === "race" ? " · first to finish wins" : ""}
            </p>
          )}
          {children}
        </div>
        {action}
      </div>
    </div>
  );
}
