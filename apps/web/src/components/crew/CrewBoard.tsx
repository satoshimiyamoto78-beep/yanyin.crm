"use client";

import { formatMoney, levelFromXp, questPercent } from "@yanyin/domain";
import { CakeSlice, Check, CookingPot, Crown, Dices, Flame, Heart, Recycle, Star, TrendingUp, Trophy, Users, Zap, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { CrewData, CrewQuest } from "@/lib/demo-crew";
import { haptic } from "@/lib/haptics";
import { Reveal } from "@/components/guest/motion";

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

/** Counts from 0 to `to` once on mount (respects reduced motion). */
function useCountUp(to: number, ms = 900): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- jump straight to the final value
      setV(to);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / ms);
      setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return v;
}

/** Segmented half-ring gauge (Boltshift-style) for the team goal. */
function Gauge({ percent }: { percent: number }) {
  const segs = 18;
  const lit = Math.round((percent / 100) * segs);
  return (
    <svg viewBox="0 0 200 110" className="w-full max-w-[260px]" aria-hidden>
      {Array.from({ length: segs }, (_, i) => {
        const a = Math.PI - (i + 0.5) * (Math.PI / segs);
        const r1 = 70;
        const r2 = 96;
        const x1 = 100 + r1 * Math.cos(a);
        const y1 = 104 - r1 * Math.sin(a);
        const x2 = 100 + r2 * Math.cos(a);
        const y2 = 104 - r2 * Math.sin(a);
        const on = i < lit;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            strokeWidth={9}
            strokeLinecap="round"
            stroke={on ? `rgb(${Math.round(142 - (142 - 47) * (i / segs))},${Math.round(168 - (168 - 91) * (i / segs))},255)` : "rgba(47,91,255,0.12)"}
            style={{ transition: `stroke 0.4s ${i * 40}ms` }}
          />
        );
      })}
    </svg>
  );
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
          <span className="ink-grad grid size-[52px] shrink-0 place-items-center rounded-[18px] text-[20px] font-bold">{data.staff.name[0]}</span>
          <div className="min-w-0">
            <h1 className="truncate text-[22px] leading-tight font-bold tracking-[-0.02em]">{data.staff.name}</h1>
            <p className="truncate text-[13px] text-g-muted">
              {data.staff.role} · {data.staff.venue}
            </p>
          </div>
        </header>

        {/* Level */}
        <Reveal as="section" delay={70} className="mesh-lilac mt-6 rounded-[28px] p-5">
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-g-muted">Level {level.level}</p>
              <p className="text-[30px] leading-tight font-semibold tracking-[-0.02em]">{level.title}</p>
            </div>
            <p className="shrink-0 text-[15px] font-semibold tabular-nums">
              <CountUp to={level.xpIntoLevel} />
              <span className="text-g-muted"> / {level.xpForNext} XP</span>
            </p>
          </div>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/70">
            <div className="bar-grad animate-grow h-full rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </Reveal>

        {/* Today */}
        <Reveal as="section" delay={140} className="mt-3 grid grid-cols-3 gap-2.5">
          <Stat label="Sales today" value={data.today.sales} trend={12} />
          <Stat label="Tips" value={data.today.tips} trend={8} />
          <Stat label="Avg check" value={data.today.avgCheck} trend={-3} />
        </Reveal>

        {/* Streak */}
        <Reveal as="section" delay={210} className="card mt-3 rounded-[28px] p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-[17px] font-semibold">
              <span className="chip-orange grid size-8 place-items-center rounded-full">
                <Flame size={17} strokeWidth={2} />
              </span>
              {data.staff.streakDays}-day streak
            </p>
            <p className="text-[13px] text-g-muted">On time every shift</p>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-2">
            {data.staff.week.map((on, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <span
                  className={`grid aspect-square w-full max-w-10 place-items-center rounded-full ${on ? "blue-grad animate-pop" : "border-[1.5px] border-dashed border-g-faint"}`}
                  style={on ? { animationDelay: `${i * 70}ms`, animationFillMode: "both" } : undefined}
                >
                  {on && <Check size={15} strokeWidth={2.75} />}
                </span>
                <span className="text-[12px] text-g-muted">{DAYS[i]}</span>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Team goal */}
        <Reveal as="section" delay={280} className="mesh-blue mt-3 overflow-hidden rounded-[28px] p-5">
          <p className="flex items-center gap-2 text-[13px] font-medium text-g-ink-2">
            <Users size={16} strokeWidth={1.75} /> Team goal this week
          </p>
          <div className="relative mt-3 flex justify-center">
            <Gauge percent={boss} />
            <div className="absolute inset-x-0 bottom-0 text-center">
              <p className="text-[36px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
                <CountUp to={boss} />%
              </p>
              <p className="mt-1 text-[13px] text-g-muted">
                {short(data.boss.progress)} of {short(data.boss.target)} ₫
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-[18px] bg-white/75 p-3.5 backdrop-blur">
              <p className="text-[12px] text-g-muted">Reward</p>
              <p className="text-[15px] font-semibold">{data.boss.reward}</p>
            </div>
            <div className="rounded-[18px] bg-white/75 p-3.5 backdrop-blur">
              <p className="text-[12px] text-g-muted">Time left</p>
              <p className="text-[15px] font-semibold">{data.boss.endsIn}</p>
            </div>
          </div>
        </Reveal>

        {/* Active quests */}
        <SectionTitle title="Your quests" count={active.length} />
        <div>
          {active.map((q) => (
            <QuestRow key={q.id} q={q} money={money}>
              {q.state === "done" && (
                <button onClick={() => {
                  haptic("success");
                  claim(q);
                }} className="blue-grad press mt-3 h-11 w-full rounded-full text-[15px] font-semibold">
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
                  <button onClick={() => {
                    haptic("light");
                    take(q.id);
                  }} className="press h-9 shrink-0 rounded-full bg-g-ink px-4 text-[14px] font-semibold text-white">
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
                <span className={`grid aspect-square w-full place-items-center rounded-[22px] ${b.earned ? "card text-g-blue" : "border-[1.5px] border-dashed border-g-fill-2 text-g-faint"}`}>
                  <Icon size={24} strokeWidth={1.75} />
                </span>
                <span className={`text-[12px] leading-tight ${b.earned ? "text-g-ink-2" : "text-g-faint"}`}>{b.name}</span>
              </div>
            );
          })}
        </div>

        {/* Leaderboard */}
        <SectionTitle title="This week" />
        <ol className="card rounded-[24px] p-1.5">
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
        <div role="status" className="animate-fade fixed inset-0 z-50 grid place-items-center bg-g-bg/90 p-6 backdrop-blur-md">
          <div className="animate-pop text-center">
            <span className="blue-grad mx-auto grid size-20 place-items-center rounded-full">
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

function Stat({ label, value, trend }: { label: string; value: number; trend: number }) {
  const v = useCountUp(value);
  return (
    <div className="mesh-sky min-w-0 rounded-[22px] p-3.5">
      <p className="truncate text-[12px] text-g-muted">{label}</p>
      <p className="mt-1 text-[24px] leading-tight font-semibold tracking-[-0.02em] tabular-nums">{short(v)}</p>
      <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${trend >= 0 ? "chip-green" : "chip-orange"}`}>
        <TrendingUp size={12} strokeWidth={2.25} />
        {trend >= 0 ? "+" : ""}
        {trend}%
      </span>
    </div>
  );
}

function CountUp({ to }: { to: number }) {
  return <>{useCountUp(to)}</>;
}

function QuestRow({ q, money, action, children }: { q: CrewQuest; money: (n: number) => string; action?: React.ReactNode; children?: React.ReactNode }) {
  const Icon = QUEST_ICON[q.id] ?? Trophy;
  const pct = questPercent(q.progress, q.target);
  const reward = `+${q.reward.xp} XP${q.reward.bonus ? ` · ${money(q.reward.bonus)}` : ""}`;
  return (
    <Reveal className="card mb-3 rounded-[24px] p-4">
      <div className="flex items-start gap-3.5">
        <span className="chip-blue grid size-12 shrink-0 place-items-center rounded-2xl">
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
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
              <div className={`animate-grow h-full rounded-full ${q.state === "done" ? "green-grad" : "bar-grad"}`} style={{ width: `${pct}%` }} />
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
    </Reveal>
  );
}
