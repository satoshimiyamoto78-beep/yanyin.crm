"use client";

import { formatMoney, levelFromXp, questPercent } from "@yanyin/domain";
import { Bell, CakeSlice, CalendarDays, Check, ChevronRight, Clock, Coffee, CookingPot, Eye, EyeOff, LayoutGrid, Plus, ReceiptText, ScanLine, Search, X, Crown, Dices, Flame, Heart, Recycle, Star, TrendingUp, Trophy, Users, Zap, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { CrewData, CrewQuest } from "@/lib/demo-crew";
import { haptic } from "@/lib/haptics";
import { Reveal } from "@/components/guest/motion";
import { ActionCircle } from "@/components/guest/ui";

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
export type CrewHot = { busy: number; tables: number; bills: number; openOrders: number; inKitchen: number; bookings: number; nextBooking?: string };

export function CrewBoard({
  data,
  embedded,
  hot,
  onGo,
  onNotify,
  onScan,
}: {
  data: CrewData;
  embedded?: boolean;
  /** Live counters for the hot buttons (tables, orders, bookings). */
  hot?: CrewHot;
  onGo?: (tab: "tables" | "orders" | "bookings" | "settings") => void;
  onNotify?: (title: string, text?: string) => void;
  onScan?: () => void;
}) {
  const [hidden, setHidden] = useState(false);
  const [banner, setBanner] = useState(true);
  const [xp, setXp] = useState(data.staff.xp);
  const [quests, setQuests] = useState(data.quests);
  const [done, setDone] = useState<CrewQuest | null>(null);
  const level = levelFromXp(xp);
  const pct = Math.round((level.xpIntoLevel / level.xpForNext) * 100);
  const money = (n: number) => formatMoney(n, data.currency, "en");

  const take = (id: string) => {
    setQuests((qs) => qs.map((q) => (q.id === id ? { ...q, state: "active" } : q)));
    const q = quests.find((x) => x.id === id);
    if (q) onNotify?.(`Quest taken: ${q.title}`, q.description);
  };
  const claim = (q: CrewQuest) => {
    setXp((v) => v + q.reward.xp);
    setQuests((qs) => qs.filter((x) => x.id !== q.id));
    setDone(q);
    setTimeout(() => setDone(null), 2400);
    onNotify?.(`+${q.reward.xp} XP claimed`, q.reward.perk ? `Bonus unlocked: ${q.reward.perk}` : q.title);
  };

  const active = quests.filter((q) => q.state !== "available");
  const available = quests.filter((q) => q.state === "available");
  const boss = questPercent(data.boss.progress, data.boss.target);

  return (
    <main className={`overflow-x-hidden bg-white text-g-ink ${embedded ? "" : "min-h-dvh"}`}>
      {/* Top: the banking-app pattern. Avatar, search and bell; the shift's money big; a strip of cards. */}
      <section className="rounded-b-[32px] bg-[linear-gradient(180deg,#e9efff_0%,#f3f6ff_70%,#f7f9ff_100%)] pt-[max(14px,env(safe-area-inset-top))] pb-6">
        <div className="mx-auto max-w-[480px] px-5">
          <div className="flex items-center gap-2.5">
            <button aria-label="Profile" onClick={() => onGo?.("settings")} className="ink-grad grid size-10 shrink-0 place-items-center rounded-full text-[16px] font-bold">
              {data.staff.name[0]}
            </button>
            <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-white/80 px-3.5 text-g-faint">
              <Search size={17} strokeWidth={2} />
              <input placeholder="Tables, dishes, guests" aria-label="Search" className="min-w-0 flex-1 bg-transparent text-[15px] text-g-ink outline-none placeholder:text-g-faint" />
            </label>
            <button aria-label="Scan QR" onClick={onScan} className="press grid size-10 shrink-0 place-items-center rounded-full bg-white/80 text-g-ink">
              <ScanLine size={19} strokeWidth={2} />
            </button>
            <button aria-label="Notifications" onClick={() => onNotify?.("No new alerts", "Kitchen and tables are quiet")} className="press relative grid size-10 shrink-0 place-items-center rounded-full bg-white/80 text-g-ink">
              <Bell size={19} strokeWidth={2} />
              {hot && hot.bills > 0 && <span className="absolute top-2 right-2.5 size-2 rounded-full border-2 border-white bg-g-orange" />}
            </button>
          </div>

          <div className="mt-6 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[14px] text-g-muted">
                {data.staff.name} · tips this shift
              </p>
              <button onClick={() => onGo?.("orders")} className="press mt-1 flex items-center gap-1 text-left">
                <span className="live text-[32px] leading-none font-bold tracking-[-0.03em] tabular-nums">{hidden ? "••• •••" : money(data.today.tips)}</span>
                <ChevronRight size={22} className="text-g-faint" />
              </button>
            </div>
            <div className="flex shrink-0 items-center gap-1 pb-1">
              <button aria-label={hidden ? "Show amounts" : "Hide amounts"} onClick={() => setHidden((v) => !v)} className="press grid size-9 place-items-center rounded-full text-g-ink">
                {hidden ? <Eye size={20} strokeWidth={1.9} /> : <EyeOff size={20} strokeWidth={1.9} />}
              </button>
              <span className="chip-green inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-semibold">
                <span className="size-1.5 rounded-full bg-g-green" /> On shift
              </span>
            </div>
          </div>

          <Reveal className="no-scrollbar -mx-5 mt-5 flex gap-2.5 overflow-x-auto px-5">
            <div className="grid shrink-0 gap-2.5">
              <button aria-label="Scan table QR" onClick={onScan} className="press grid size-[66px] place-items-center rounded-[20px] bg-white text-g-ink">
                <ScanLine size={26} strokeWidth={1.8} />
              </button>
              <button aria-label="Take a break" onClick={() => onNotify?.("Break started", "Tables see “back in 10 min”")} className="press grid size-[66px] place-items-center rounded-[20px] bg-white text-g-ink">
                <Coffee size={24} strokeWidth={1.8} />
              </button>
            </div>
            <button onClick={() => onGo?.("orders")} className="press flex h-[142px] w-[150px] shrink-0 flex-col justify-between rounded-[22px] bg-white p-4 text-left">
              <span className="blue-grad grid size-9 place-items-center rounded-[12px]">
                <TrendingUp size={18} strokeWidth={2} />
              </span>
              <span>
                <span className="live block text-[20px] leading-tight font-semibold tabular-nums">{hidden ? "•••" : `${short(data.today.sales)} ₫`}</span>
                <span className="block text-[13px] text-g-muted">Sales today · +12%</span>
              </span>
            </button>
            <button onClick={() => onGo?.("tables")} className="press flex h-[142px] w-[150px] shrink-0 flex-col justify-between rounded-[22px] bg-white p-4 text-left">
              <span className="chip-blue grid size-9 place-items-center rounded-[12px]">
                <LayoutGrid size={18} strokeWidth={2} />
              </span>
              <span>
                <span className="live block text-[20px] leading-tight font-semibold tabular-nums">{hot ? `${hot.busy}/${hot.tables}` : "—"} tables</span>
                <span className={`block text-[13px] ${hot?.bills ? "font-medium text-g-orange" : "text-g-muted"}`}>{hot?.bills ? `${hot.bills} asking for the bill` : "all calm"}</span>
              </span>
            </button>
            <div className="flex h-[142px] w-[170px] shrink-0 flex-col justify-between rounded-[22px] bg-white p-4">
              <span className="flex items-center justify-between">
                <span className="chip-purple grid size-9 place-items-center rounded-[12px]">
                  <Trophy size={18} strokeWidth={2} />
                </span>
                <span className="text-[12px] font-medium text-g-muted">Level {level.level}</span>
              </span>
              <span>
                <span className="live block text-[20px] leading-tight font-semibold">{level.title}</span>
                <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-g-fill">
                  <span className="live bar-grad block h-full rounded-full" style={{ width: `${pct}%` }} />
                </span>
                <span className="mt-1 block text-[12px] text-g-muted tabular-nums">
                  {level.xpIntoLevel} / {level.xpForNext} XP
                </span>
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      <div className="mx-auto max-w-[480px] px-5 pb-16">
        {/* Banner: the quest of the week, closable. */}
        {banner && available[0] && (
          <div className="relative mt-5 flex items-center gap-4 overflow-hidden rounded-[24px] bg-[linear-gradient(120deg,#eaf0ff_0%,#f3efff_100%)] p-4 pr-3">
            <div className="min-w-0 flex-1">
              <p className="text-[16px] leading-snug font-semibold">{available[0].title}</p>
              <p className="mt-1 text-[13px] leading-snug text-g-muted">{available[0].description}</p>
              <button
                onClick={() => {
                  haptic("light");
                  take(available[0]!.id);
                }}
                className="press mt-3 h-8 rounded-full bg-g-ink px-3.5 text-[13px] font-semibold text-white"
              >
                Take quest · +{available[0].reward.xp} XP
              </button>
            </div>
            <span className="blue-grad grid size-16 shrink-0 rotate-6 place-items-center rounded-[20px]">
              <Trophy size={30} strokeWidth={1.8} />
            </span>
            <button aria-label="Hide" onClick={() => setBanner(false)} className="absolute top-2.5 right-2.5 grid size-7 place-items-center rounded-full text-g-faint">
              <X size={16} strokeWidth={2.25} />
            </button>
          </div>
        )}

        {/* Quick actions, like "transfers" in a bank app. */}
        {hot && onGo && (
          <>
            <h2 className="mt-8 flex items-baseline justify-between text-[22px] font-bold tracking-[-0.02em]">
              Quick actions
            </h2>
            <div className="mt-4 flex justify-between">
              <ActionCircle icon={<Plus size={24} strokeWidth={2.25} />} label="New order" accent onClick={() => onGo("tables")} />
              <ActionCircle icon={<LayoutGrid size={22} strokeWidth={1.9} />} label="Tables" badge={hot.bills || undefined} onClick={() => onGo("tables")} />
              <ActionCircle icon={<ReceiptText size={22} strokeWidth={1.9} />} label="Orders" badge={hot.openOrders || undefined} onClick={() => onGo("orders")} />
              <ActionCircle icon={<CalendarDays size={22} strokeWidth={1.9} />} label="Bookings" badge={hot.bookings || undefined} onClick={() => onGo("bookings")} />
              <ActionCircle icon={<ScanLine size={22} strokeWidth={1.9} />} label="Scan QR" onClick={() => onScan?.()} />
            </div>
          </>
        )}

        {/* Streak */}
        <Reveal as="section" delay={210} className="card mt-3 rounded-[28px] p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-[17px] font-semibold">
              <span className="chip-orange grid size-8 place-items-center rounded-full">
                <Flame size={17} strokeWidth={2} />
              </span>
              <span className="live">{data.staff.streakDays}-day streak</span>
            </p>
            <p className="text-[13px] text-g-muted">On time every shift</p>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-2">
            {data.staff.week.map((on, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <span
                  className={`live grid aspect-square w-full max-w-10 place-items-center rounded-full ${on ? "blue-grad animate-pop" : "border-[1.5px] border-dashed border-g-faint"}`}
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
            <span className="live w-full max-w-[260px]">
              <Gauge percent={boss} />
            </span>
            <div className="absolute inset-x-0 bottom-0 text-center">
              <p className="live text-[36px] leading-none font-semibold tracking-[-0.03em] tabular-nums">
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
        <Reveal className="divide-y divide-g-line">
          {active.map((q) => (
            <QuestRow
              key={q.id}
              q={q}
              money={money}
              action={
                q.state === "done" ? (
                  <button
                    onClick={() => {
                      haptic("success");
                      claim(q);
                    }}
                    className="blue-grad press h-9 shrink-0 rounded-full px-4 text-[14px] font-semibold whitespace-nowrap"
                  >
                    Claim
                  </button>
                ) : undefined
              }
            />
          ))}
          {!active.length && <p className="py-6 text-[15px] text-g-muted">Take a quest below to start.</p>}
        </Reveal>

        {/* Quest board */}
        {available.length > 0 && (
          <>
            <SectionTitle title="Quest board" count={available.length} />
            <Reveal className="divide-y divide-g-line">
              {available.map((q) => (
                <QuestRow
                  key={q.id}
                  q={q}
                  money={money}
                  action={
                    <button
                      onClick={() => {
                        haptic("light");
                        take(q.id);
                      }}
                      className="press h-9 shrink-0 rounded-full bg-g-ink px-4 text-[14px] font-semibold text-white"
                    >
                      Take
                    </button>
                  }
                />
              ))}
            </Reveal>
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
        <Reveal as="ol" className="card rounded-[24px] p-1.5">
          {data.leaderboard.map((p, i) => (
            <li key={p.name} className={`flex items-center gap-4 rounded-[18px] px-4 py-3.5 ${p.me ? "bg-g-blue-soft" : ""}`}>
              <span className={`w-5 text-[15px] font-semibold tabular-nums ${p.me ? "text-g-blue" : "text-g-faint"}`}>{i + 1}</span>
              <span className={`live min-w-0 flex-1 truncate text-[16px] ${p.me ? "font-semibold text-g-blue" : "font-medium"}`}>{p.me ? `${p.name} (you)` : p.name}</span>
              <span className="live shrink-0 text-[15px] font-semibold tabular-nums">{p.me ? xp : p.xp} XP</span>
            </li>
          ))}
        </Reveal>

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


function CountUp({ to }: { to: number }) {
  return <>{useCountUp(to)}</>;
}

/**
 * One quest as a flat row: icon, title and description; progress with numbers;
 * a footer with the reward, deadline and one small action.
 */
function QuestRow({ q, money, action }: { q: CrewQuest; money: (n: number) => string; action?: React.ReactNode }) {
  const Icon = QUEST_ICON[q.id] ?? Trophy;
  const pct = questPercent(q.progress, q.target);
  const done = q.state === "done";
  const reward = [`+${q.reward.xp} XP`, q.reward.bonus ? money(q.reward.bonus) : null].filter(Boolean).join(" · ");
  return (
    <div className="py-5">
      <div className="flex gap-3.5">
        <span className={`grid size-11 shrink-0 place-items-center rounded-[14px] ${done ? "chip-green" : "chip-blue"}`}>
          {done ? <Check size={20} strokeWidth={2.5} /> : <Icon size={20} strokeWidth={1.8} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="live truncate text-[16px] font-semibold">{q.title}</p>
            {q.state !== "available" && (
              <span className={`live shrink-0 text-[14px] font-semibold tabular-nums ${done ? "text-g-green" : ""}`}>
                {done ? "Done" : `${q.progress}/${q.target}`}
              </span>
            )}
          </div>
          <p className="live mt-0.5 text-[14px] leading-snug text-g-muted">{q.description}</p>
          {q.state !== "available" && (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-g-fill">
              <div className={`live animate-grow h-full rounded-full ${done ? "green-grad" : "bar-grad"}`} style={{ width: `${pct}%` }} />
            </div>
          )}
          <div className="mt-3 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-g-blue">
                {reward}
                {q.mode === "race" && <span className="font-medium text-g-orange"> · race</span>}
              </p>
              <p className="mt-0.5 flex items-center gap-1 truncate text-[12px] text-g-muted">
                <Clock size={12} strokeWidth={2} className="shrink-0" />
                {q.endsAt}
                {q.reward.perk ? ` · bonus: ${q.reward.perk.toLowerCase()}` : ""}
              </p>
            </div>
            {action}
          </div>
        </div>
      </div>
    </div>
  );
}
