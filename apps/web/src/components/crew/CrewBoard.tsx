"use client";

import { formatMoney, levelFromXp, questPercent } from "@yanyin/domain";
import { Bell, CakeSlice, Check, ChevronRight, Clock, Coffee, CookingPot, Eye, EyeOff, LayoutGrid, ScanLine, Search, SlidersHorizontal, Crown, Dices, Handshake, Moon, Martini, Flame, Heart, Recycle, Star, TrendingUp, Trophy, Users, Zap, type LucideIcon } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import type { CrewData, CrewQuest } from "@/lib/demo-crew";
import { haptic } from "@/lib/haptics";
import { PeekCard, Reveal, useLongPress } from "@/components/guest/motion";
import { TipsCarousel } from "./TipsCarousel";
import { CustomizePage, useHomeLayout, type HomeBlock } from "./HomeLayout";
import { BadgesPage, QuestsPage } from "./Collections";
import { NorthSky } from "@/components/system/NorthSky";
import { Strip, StripBig, StripSquare } from "@/components/system/Strip";
import { ThemeToggle } from "@/components/system/ThemeToggle";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

const QUEST_ICON: Record<string, LucideIcon> = {
  "plov-master": CookingPot,
  "sweet-finish": CakeSlice,
  "five-stars": Star,
  "shashlik-sunday": Flame,
  "roulette-host": Dices,
};
export const BADGE_ICON: Record<string, LucideIcon> = { upsell: Crown, speed: Zap, fav: Heart, waste: Recycle, team: Handshake, night: Moon, roulette: Dices, sommelier: Martini };

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
  dark = false,
  onTheme,
  onProfile,
  onInbox,
  unread = 0,
  photo,
  name,
}: {
  data: CrewData;
  embedded?: boolean;
  /** Live counters for the hot buttons (tables, orders, bookings). */
  hot?: CrewHot;
  onGo?: (tab: "tables" | "orders" | "bookings" | "settings") => void;
  onNotify?: (title: string, text?: string) => void;
  onScan?: () => void;
  dark?: boolean;
  onTheme?: () => void;
  /** Avatar: opens the profile with personal info and settings. */
  onProfile?: () => void;
  /** Bell: opens notifications and news. */
  onInbox?: () => void;
  unread?: number;
  photo?: string;
  name?: string;
}) {
  const [hidden, setHidden] = useState(false);
  const [peek, setPeek] = useState<{ kind: "badge" | "quest"; id: string } | null>(null);
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

  const [layout, setLayout] = useHomeLayout();
  const [page, setPage] = useState<"customize" | "yours" | "board" | "badges" | null>(null);
  const takeBtn = (q: CrewQuest) => (
    <button
      onClick={() => {
        haptic("light");
        take(q.id);
      }}
      className="press h-9 shrink-0 rounded-full bg-g-ink px-4 text-[14px] font-semibold text-white"
    >
      Take
    </button>
  );
  const claimBtn = (q: CrewQuest) =>
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
    ) : undefined;
  const blocks: Record<HomeBlock, React.ReactNode> = {
    // Yan's tips for the shift: quest of the week, sales hints, the team goal.
    tips: (
        <TipsCarousel
        tips={[
          ...(available[0]
            ? [{ id: "quest", kicker: "Quest of the week", title: available[0].title, text: available[0].description, icon: Trophy, tone: "blue" as const, action: { label: `Take · +${available[0].reward.xp} XP`, onClick: () => take(available[0]!.id) } }]
            : []),
          { id: "lemonade", kicker: "Sell more", title: "Offer tarragon lemonade with plov", text: "Guests who take plov add a drink 2× more often when you suggest one.", icon: TrendingUp, tone: "green" as const },
          { id: "goal", kicker: "Team goal", title: `${boss}% of this week’s goal`, text: `${data.boss.endsIn} · reward ${data.boss.reward}`, icon: Users, tone: "orange" as const },
          { id: "rush", kicker: "Peak at 19:00", title: "Pre-set tables 4 and 9 now", text: "Six bookings land between 19:00 and 19:30. Set cutlery and water before the rush.", icon: Clock, tone: "ink" as const },
          { id: "dessert", kicker: "Easy XP", title: "Suggest dessert with tea", text: "Each dessert counts toward Sweet finish. Medovik is today’s favourite.", icon: CakeSlice, tone: "blue" as const },
        ]}
      />
    ),
    streak: (
        <Reveal as="section" delay={210} className="card mt-6 rounded-[28px] p-5">
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
    ),
    goal: (
        <Reveal as="section" delay={280} className="mesh-blue mt-6 overflow-hidden rounded-[28px] p-5">
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
    ),
    quests: (
      <>
        <SectionTitle title="Your quests" count={active.length} onAll={() => setPage("yours")} />
        <Reveal className="divide-y divide-g-line">
          {active.slice(0, 2).map((q) => (
            <QuestRow key={q.id} q={q} money={money} onPeek={() => setPeek({ kind: "quest", id: q.id })} action={claimBtn(q)} />
          ))}
          {!active.length && <p className="py-6 text-[15px] text-g-muted">Take a quest from the board to start.</p>}
        </Reveal>
      </>
    ),
    board: available.length ? (
      <>
        <SectionTitle title="Quest board" count={available.length} onAll={() => setPage("board")} />
        <Reveal className="divide-y divide-g-line">
          {available.slice(0, 2).map((q) => (
            <QuestRow key={q.id} q={q} money={money} onPeek={() => setPeek({ kind: "quest", id: q.id })} action={takeBtn(q)} />
          ))}
        </Reveal>
      </>
    ) : null,
    badges: (
      <>
        <SectionTitle title="Badges" count={data.badges.filter((b) => b.earned).length} onAll={() => setPage("badges")} />
        <div className="grid grid-cols-4 gap-2.5">
          {data.badges.slice(0, 4).map((b) => (
            <BadgeTile key={b.id} b={b} onPeek={() => setPeek({ kind: "badge", id: b.id })} />
          ))}
        </div>
        <p className="mt-2 text-center text-[12px] text-g-faint">Hold a badge or a quest to see what it is</p>
      </>
    ),
    week: (
      <>
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
      </>
    ),
  };

  return (
    <main className={`overflow-x-hidden bg-white text-g-ink ${embedded ? "" : "min-h-dvh"}`}>
      {/* Top: the same blue sky and strip as the guest menu. Avatar, search, scan, theme and bell; the shift's money big; quick actions. */}
      <section className="relative isolate pt-[max(16px,env(safe-area-inset-top))] pb-6 text-white">
        <NorthSky />
        <div className="mx-auto max-w-[480px]">
          <div className="flex items-center gap-2 px-5">
            <button aria-label="Profile" onClick={() => onProfile?.()} className="press grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#fff] text-[16px] font-bold text-[#0b0b0f]">
              {/* eslint-disable-next-line @next/next/no-img-element -- a local photo the waiter picked */}
              {photo ? <img src={photo} alt="" className="size-full object-cover" /> : (name ?? data.staff.name)[0]}
            </button>
            <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-white/15 px-3.5 text-white/70">
              <Search size={17} strokeWidth={2} />
              <input placeholder="Tables, dishes, guests" aria-label="Search" className="min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-white/70" />
            </label>
            {onTheme && <ThemeToggle dark={dark} onToggle={onTheme} label="Light or dark theme" />}
            <button aria-label={unread ? `Notifications, ${unread} new` : "Notifications"} onClick={() => onInbox?.()} className="press relative grid size-10 shrink-0 place-items-center rounded-full bg-white/15 text-white">
              <Bell size={19} strokeWidth={2} />
              {unread > 0 && <span className="absolute -top-0.5 -right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-g-orange px-1 text-[10px] font-bold text-white tabular-nums">{unread}</span>}
            </button>
          </div>

          <div className="mt-9 flex items-center justify-between gap-3 px-5">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-[14px] text-white/70">
                <span className="size-1.5 shrink-0 rounded-full bg-[#5ce0a0]" />
                <span className="font-semibold text-white">On shift</span>
                <span className="text-white/45">·</span>
                {(name ?? data.staff.name).split(" ")[0]} · tips
              </p>
              <button onClick={() => onGo?.("orders")} className="press mt-2 flex items-center gap-1 text-left">
                <span className="live text-[30px] leading-tight font-bold tracking-[-0.03em] tabular-nums">{hidden ? "••• •••" : money(data.today.tips)}</span>
                <ChevronRight size={22} className="text-white/55" />
              </button>
            </div>
            <button aria-label={hidden ? "Show amounts" : "Hide amounts"} onClick={() => setHidden((v) => !v)} className="press grid size-10 shrink-0 place-items-center rounded-full bg-white/15 text-white">
              {hidden ? <Eye size={19} strokeWidth={2} /> : <EyeOff size={19} strokeWidth={2} />}
            </button>
          </div>

          <Strip>
            <StripBig
              onClick={() => onGo?.("tables")}
              icon={<LayoutGrid size={19} strokeWidth={2} />}
              title={hot ? `${hot.busy}/${hot.tables} tables` : "Tables"}
              sub={hot?.bills ? `${hot.bills} asking for the bill` : "all calm"}
              tone={hot?.bills ? "orange" : "muted"}
            />
            <StripSquare icon={<ScanLine size={21} strokeWidth={1.9} />} label="Scan" onClick={() => onScan?.()} />
            <StripSquare icon={<Coffee size={21} strokeWidth={1.9} />} label="Break" onClick={() => onNotify?.("Break started", "Tables see “back in 10 min”")} />
            <StripBig onClick={() => onGo?.("orders")} icon={<TrendingUp size={19} strokeWidth={2} />} title={hidden ? "•••" : `${short(data.today.sales)} ₫`} sub="Sales today · +12%" />
            <StripBig icon={<Trophy size={19} strokeWidth={2} />} badge={<span className="text-[12px] font-medium text-g-muted">Level {level.level}</span>} title={level.title} wide>
              <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-g-fill">
                <span className="live bar-grad block h-full rounded-full" style={{ width: `${pct}%` }} />
              </span>
              <span className="mt-1 block text-[12px] text-g-muted tabular-nums">
                {level.xpIntoLevel} / {level.xpForNext} XP
              </span>
            </StripBig>
          </Strip>
        </div>
      </section>

      <div className="mx-auto max-w-[480px] px-5 pb-16">
        {/* Blocks in the waiter's own order (Customize the main screen). */}
        {layout
          .filter((b) => b.on)
          .map((b) => (
            <Fragment key={b.id}>{blocks[b.id]}</Fragment>
          ))}

        <button
          onClick={() => {
            haptic("light");
            setPage("customize");
          }}
          className="press mx-auto mt-12 flex h-12 items-center gap-2 rounded-full bg-g-fill px-5 text-[15px] font-semibold"
        >
          <SlidersHorizontal size={17} strokeWidth={2} /> Customize the main screen
        </button>
        <p className="mt-6 text-center text-[13px] text-g-faint">Progress counts automatically from orders · leaderboards can be turned off by the venue</p>
      </div>

      {page === "customize" && <CustomizePage layout={layout} onChange={setLayout} onClose={() => setPage(null)} />}
      {(page === "yours" || page === "board") && (
        <QuestsPage
          tab={page}
          onTab={setPage}
          active={active}
          available={available}
          money={money}
          onPeek={(id) => setPeek({ kind: "quest", id })}
          onTake={take}
          onClaim={claim}
          onClose={() => setPage(null)}
        />
      )}
      {page === "badges" && <BadgesPage badges={data.badges} onClose={() => setPage(null)} />}

      {peek?.kind === "badge" && <BadgePeek b={data.badges.find((x) => x.id === peek.id)!} onClose={() => setPeek(null)} />}
      {peek?.kind === "quest" && (() => {
        const q = quests.find((x) => x.id === peek.id);
        if (!q) return null;
        const Icon = QUEST_ICON[q.id] ?? Trophy;
        return (
          <PeekCard label={q.title} onClose={() => setPeek(null)}>
            <div className="flex items-center gap-3.5">
              <span className="chip-blue grid size-14 shrink-0 place-items-center rounded-full">
                <Icon size={26} strokeWidth={1.7} />
              </span>
              <div className="min-w-0">
                <p className="text-[20px] leading-tight font-bold tracking-[-0.02em]">{q.title}</p>
                <p className="text-[13px] text-g-muted">{q.mode === "race" ? "Race · first to finish wins" : "Solo quest"}</p>
              </div>
            </div>
            <p className="mt-4 text-[15px] leading-snug text-g-ink-2">{q.description}</p>
            {q.state !== "available" && (
              <div className="mt-4">
                <div className="flex justify-between text-[13px]">
                  <span className="text-g-muted">Progress</span>
                  <span className="font-semibold tabular-nums">
                    {q.progress}/{q.target}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-g-fill">
                  <div className="bar-grad h-full rounded-full" style={{ width: `${questPercent(q.progress, q.target)}%` }} />
                </div>
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-[16px] bg-g-fill p-3">
                <p className="text-[12px] text-g-muted">Reward</p>
                <p className="text-[15px] font-semibold">+{q.reward.xp} XP{q.reward.bonus ? ` · ${money(q.reward.bonus)}` : ""}</p>
              </div>
              <div className="rounded-[16px] bg-g-fill p-3">
                <p className="text-[12px] text-g-muted">Deadline</p>
                <p className="text-[15px] font-semibold">{q.endsAt.replace(/^Ends /, "")}</p>
              </div>
            </div>
            {q.reward.perk && <p className="mt-2 text-[13px] text-g-muted">Bonus: {q.reward.perk}</p>}
            <p className="mt-3 text-[12px] text-g-faint">Progress counts automatically from your orders.</p>
          </PeekCard>
        );
      })()}

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

export const BADGE_INFO: Record<string, { what: string; how: string; progress: number }> = {
  upsell: { what: "For waiters who make every table a little happier: a drink with the meal, a dessert after it.", how: "Sell 20 add-ons (drinks, desserts, extras) in one week.", progress: 100 },
  speed: { what: "For quick hands: food reaches the table while it is hot.", how: "Serve 10 tables in under 12 minutes from order to plate.", progress: 100 },
  fav: { what: "Guests remember you and say it in reviews.", how: "Collect 10 five-star reviews that mention you.", progress: 70 },
  team: { what: "You cover for others when the hall gets busy.", how: "Help on 5 tables that are not yours in one week.", progress: 100 },
  night: { what: "Strong to the last table of the night.", how: "Close 10 late shifts with every check paid.", progress: 30 },
  roulette: { what: "Guests love to spin Food Roulette at your tables.", how: "Host 15 roulette orders.", progress: 55 },
  sommelier: { what: "The right drink for every dish.", how: "Sell 40 drinks matched to a main course.", progress: 20 },
  waste: { what: "Nothing comes back to the kitchen: orders are taken right the first time.", how: "A full week with no returned or remade dishes.", progress: 40 },
};

/** A badge you can hold to peek at its story. */
export function BadgeTile({ b, onPeek }: { b: CrewData["badges"][number]; onPeek: () => void }) {
  const press = useLongPress(onPeek, onPeek);
  const Icon = BADGE_ICON[b.id] ?? Trophy;
  return (
    <button {...press} style={{ WebkitTouchCallout: "none" }} className="press flex flex-col items-center gap-2 text-center select-none">
      <span className={`grid aspect-square w-full place-items-center rounded-full ${b.earned ? "card text-g-blue" : "border-[1.5px] border-dashed border-g-fill-2 text-g-faint"}`}>
        <Icon size={24} strokeWidth={1.75} />
      </span>
      <span className={`text-[12px] leading-tight ${b.earned ? "text-g-ink-2" : "text-g-faint"}`}>{b.name}</span>
    </button>
  );
}

function SectionTitle({ title, count, onAll }: { title: string; count?: number; onAll?: () => void }) {
  return (
    <div className="mt-10 mb-2 flex items-baseline justify-between gap-3">
      <h2 className="flex items-baseline gap-2 text-[24px] leading-tight font-bold tracking-[-0.025em]">
        {title}
        {count !== undefined && <span className="text-[15px] font-medium tracking-normal text-g-faint">{count}</span>}
      </h2>
      {onAll && (
        <button
          onClick={() => {
            haptic("light");
            onAll();
          }}
          className="press flex shrink-0 items-center gap-0.5 text-[15px] font-semibold text-g-blue underline decoration-g-blue/30 decoration-2 underline-offset-4"
        >
          See all <ChevronRight size={16} strokeWidth={2.4} />
        </button>
      )}
    </div>
  );
}


function CountUp({ to }: { to: number }) {
  return <>{useCountUp(to)}</>;
}

/**
 * One quest as a flat row: icon, title and description; progress with numbers;
 * a footer with the reward, deadline and one small action.
 */
export function QuestRow({ q, money, action, onPeek }: { q: CrewQuest; money: (n: number) => string; action?: React.ReactNode; onPeek?: () => void }) {
  const press = useLongPress(() => onPeek?.());
  const Icon = QUEST_ICON[q.id] ?? Trophy;
  const pct = questPercent(q.progress, q.target);
  const done = q.state === "done";
  const reward = [`+${q.reward.xp} XP`, q.reward.bonus ? money(q.reward.bonus) : null].filter(Boolean).join(" · ");
  return (
    <div className="py-5 select-none" {...press} style={{ WebkitTouchCallout: "none" }}>
      <div className="flex gap-3.5">
        <span className={`grid size-11 shrink-0 place-items-center rounded-full ${done ? "chip-green" : "chip-blue"}`}>
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

/** Hold-to-peek card for a badge: what it is, how to get it, how far along. */
export function BadgePeek({ b, onClose }: { b: CrewData["badges"][number]; onClose: () => void }) {
  const info = BADGE_INFO[b.id] ?? { what: "", how: "", progress: 0 };
  const Icon = BADGE_ICON[b.id] ?? Trophy;
  return (
    <PeekCard label={b.name} onClose={onClose}>
      <span className={`mx-auto grid size-20 place-items-center rounded-full ${b.earned ? "blue-grad" : "bg-g-fill text-g-faint"}`}>
        <Icon size={36} strokeWidth={1.7} />
      </span>
      <p className="mt-4 text-center text-[22px] font-bold tracking-[-0.02em]">{b.name}</p>
      <p className={`mt-1 text-center text-[13px] font-semibold ${b.earned ? "text-g-green" : "text-g-muted"}`}>{b.earned ? "Earned" : "Not yet"}</p>
      <p className="mt-4 text-[15px] leading-snug text-g-ink-2">{info.what}</p>
      <p className="mt-3 rounded-[16px] bg-g-fill px-3.5 py-2.5 text-[14px] leading-snug">
        <span className="font-semibold">How to get it: </span>
        {info.how}
      </p>
      {!b.earned && (
        <div className="mt-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-g-fill">
            <div className="bar-grad h-full rounded-full" style={{ width: `${info.progress}%` }} />
          </div>
          <p className="mt-1.5 text-[12px] text-g-muted">{info.progress}% there</p>
        </div>
      )}
    </PeekCard>
  );
}
