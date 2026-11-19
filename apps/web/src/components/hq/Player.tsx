"use client";

import {
  Award,
  Cake,
  ChevronRight,
  Crown,
  Flame,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Timer,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { Person } from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import { createStore } from "@/lib/store";
import { Sheet } from "@/components/guest/ui";
import { type ArtName } from "@/components/system/Art";
import { BarsWidget, IconStat } from "@/components/system/Widgets";
import { BadgeEmblem, QuestMedal, type Tier } from "@/components/crew/Emblems";
import { compactMoney } from "@/components/crew/CrewApp";
import { useTr } from "@/components/crew/prefs";
import {
  Caption,
  Face,
  groupOf,
  ROLE_NAMES,
  STATION_NAMES,
  staffStats,
  type StaffStats,
} from "./People";

/*
 * A person's page in the admin console, built like a player card in a game:
 * the face in its level ring, today's numbers (each opens its list), the
 * week, skills with how they are counted, quests and badges (each opens its
 * story), the full history (orders, tips, shifts, XP), and what the admin can
 * do: give XP, set a quest, award a badge. Demo numbers are steady per person;
 * the backend fills them from domain events.
 */

/* ---------------------------------------------------------------- Data */

type Row = {
  at: string;
  title: string;
  sub?: string;
  value?: string;
  tone?: string;
};
type Skill = {
  id: string;
  name: string;
  value: number;
  how: string;
  raise: string;
};
type Quest = {
  id: string;
  title: string;
  text: string;
  progress: number;
  goal: number;
  reward: string;
  due: string;
  icon: LucideIcon;
};
type Badge = {
  id: string;
  name: string;
  text: string;
  tier: Tier;
  icon: LucideIcon;
};
type Extra = { xp: number; quests: string[]; badges: string[]; log: Row[] };

const extras = createStore<Record<string, Extra>>("yanyin:staff-extra", {});
const none: Extra = { xp: 0, quests: [], badges: [], log: [] };

const QUESTS: Quest[] = [
  {
    id: "plov",
    title: "Plov master",
    text: "Sell 5 plovs in one shift. Counted from closed bills.",
    progress: 3,
    goal: 5,
    reward: "+150 XP",
    due: "today 23:00",
    icon: Flame,
  },
  {
    id: "sweet",
    title: "Sweet finale",
    text: "Sell 8 desserts today. Any dessert from the menu counts.",
    progress: 6,
    goal: 8,
    reward: "+120 XP",
    due: "end of the day",
    icon: Cake,
  },
  {
    id: "roulette",
    title: "Roulette host",
    text: "Help 5 tables order through Food Roulette this week.",
    progress: 1,
    goal: 5,
    reward: "+150 XP",
    due: "this week",
    icon: Target,
  },
  {
    id: "speed",
    title: "Fast hands",
    text: "Close 10 tickets under 12 minutes in one shift.",
    progress: 4,
    goal: 10,
    reward: "+200 XP",
    due: "today",
    icon: Timer,
  },
  {
    id: "team",
    title: "Team goal of the week",
    text: "The whole team reaches 60M ₫ of sales this week.",
    progress: 69,
    goal: 100,
    reward: "+300 thousand ₫ each",
    due: "Sunday",
    icon: Users,
  },
];
const BADGES: Badge[] = [
  {
    id: "upsell",
    name: "Upsell king",
    text: "Added a drink or a dessert to 30 bills.",
    tier: "gold",
    icon: Crown,
  },
  {
    id: "lightning",
    name: "Lightning",
    text: "Ten orders sent to the kitchen within a minute of the guest choosing.",
    tier: "sapphire",
    icon: Zap,
  },
  {
    id: "mentor",
    name: "Mentor",
    text: "Trained two new people through their first shifts.",
    tier: "silver",
    icon: Users,
  },
  {
    id: "clean",
    name: "Clean station",
    text: "Every closing checklist done for two weeks in a row.",
    tier: "bronze",
    icon: ShieldCheck,
  },
  {
    id: "star",
    name: "Guest star",
    text: "Twenty five-star reviews that name this person.",
    tier: "diamond",
    icon: Star,
  },
];

const seed = (id: string) =>
  [...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 9973, 7);

function player(
  p: Person,
  st: StaffStats,
  tr: (en: string, v?: Record<string, string | number>) => string,
) {
  const s = seed(p.id);
  const g = groupOf(p);
  const hall = g === "hall";
  const station = g === "bar" || g === "kitchen";
  const skill = (
    id: string,
    name: string,
    k: number,
    how: string,
    raise: string,
  ): Skill => ({ id, name, value: 48 + ((s * k) % 47), how, raise });
  const skills: Skill[] = [
    hall
      ? skill(
          "speed",
          "Service speed",
          3,
          "Minutes from a guest sitting down to the first order reaching the kitchen.",
          "Greet the table in the first two minutes; use the QR menu to let guests order themselves.",
        )
      : station
        ? skill(
            "speed",
            "Ticket speed",
            3,
            "Minutes from a ticket coming in to it being ready, against the dish's target time.",
            "Start tickets as soon as they come in; prep before the rush.",
          )
        : skill(
            "control",
            "Control",
            3,
            "Checklists checked on time and items out of range closed.",
            "Check the opening checklists before 11:00.",
          ),
    hall
      ? skill(
          "upsell",
          "Upsell",
          5,
          "Share of bills with a drink or a dessert added by this waiter.",
          "Offer a drink with the main and a dessert with the bill.",
        )
      : station
        ? skill(
            "accuracy",
            "Accuracy",
            5,
            "Share of dishes sent back or remade.",
            "Read the notes on the ticket before starting.",
          )
        : skill(
            "team",
            "Team",
            5,
            "How the team rates the shifts this person leads.",
            "Brief the team before the shift; answer questions in the chat.",
          ),
    skill(
      "guests",
      hall ? "Hospitality" : "Quality",
      7,
      hall
        ? "Average guest rating on bills this person served."
        : "Guest ratings on dishes from this station.",
      hall
        ? "Ask how everything is at the second visit to the table."
        : "Taste before sending; keep portions to the photo.",
    ),
    skill(
      "time",
      "Punctuality",
      11,
      "Shifts started on time by the door QR, out of all shifts this month.",
      "Clock in by the door QR before the shift starts.",
    ),
    skill(
      "lists",
      "Checklists",
      13,
      "Items done on time, with photos and readings where needed.",
      "Do the opening part before the first guests.",
    ),
  ];
  const quests = (
    hall
      ? ["plov", "sweet", "roulette"]
      : station
        ? ["speed", "team"]
        : ["team"]
  ).map((id) => QUESTS.find((q) => q.id === id)!);
  const badges = (
    hall ? ["upsell", "lightning"] : station ? ["clean"] : ["mentor"]
  ).map((id) => BADGES.find((b) => b.id === id)!);
  const day = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const week = day.map((_, i) =>
    i > 4 ? 0 : i === 4 ? 3 : 6 + ((s + i * 3) % 4),
  );
  const times = ["12:05", "12:18", "12:31", "12:44", "11:52", "11:30", "11:12"];
  const orders: Row[] = Array.from({ length: hall ? 7 : 6 }, (_, i) => {
    const sum = 280_000 + ((s * (i + 3)) % 9) * 95_000;
    return hall
      ? {
          at: times[i]!,
          title: tr("Table {n}", { n: 1 + ((s + i * 5) % 12) }),
          sub: tr("{n} dish|{n} dishes", { n: 2 + ((s + i) % 4) }),
          value: compactMoney(sum),
        }
      : {
          at: times[i]!,
          title: tr("Table {n}", { n: 1 + ((s + i * 5) % 12) }),
          sub: tr("{n} dish|{n} dishes", { n: 1 + ((s + i) % 3) }),
          value: tr("{n} min", { n: 6 + ((s + i) % 8) }),
        };
  });
  const tips: Row[] = orders.slice(0, 5).map((o, i) => ({
    at: o.at,
    title: o.title,
    sub: tr(["VietQR", "Card", "Cash"][i % 3]!),
    value: compactMoney(40_000 + ((s * (i + 2)) % 6) * 20_000),
  }));
  const shifts: Row[] = day.slice(0, 5).map((d, i) => ({
    at: tr(d),
    title: `${["09:52", "10:00", "10:05", "09:58", "10:30"][i]}–${["18:10", "18:00", "22:05", "18:02", "—"][i]}`,
    sub: i === 2 && st.late ? tr("Late {n} min", { n: 12 }) : undefined,
    value: week[i] ? `${week[i]} ${tr("h")}` : "",
    tone: i === 2 && st.late ? "text-g-orange" : undefined,
  }));
  const xp: Row[] = [
    { at: "12:40", title: `${tr("Plov master")} · 3/5`, value: "+30 XP" },
    { at: "11:06", title: tr("Checklist: opening done"), value: "+60 XP" },
    { at: tr("Yesterday"), title: tr("Five-star review"), value: "+50 XP" },
    { at: tr("Yesterday"), title: tr("Sweet finale done"), value: "+120 XP" },
  ];
  return { skills, quests, badges, week, day, orders, tips, shifts, xp };
}

/* ---------------------------------------------------------------- Page */

type Open =
  | { kind: "list"; title: string; sub: string; rows: Row[] }
  | { kind: "skill"; skill: Skill }
  | { kind: "quest"; quest: Quest }
  | { kind: "badge"; badge: Badge }
  | { kind: "give-xp" }
  | { kind: "give-quest" }
  | { kind: "give-badge" };

export function PersonPage({
  p,
  disabled,
  onClose,
  onEdit,
  onWrite,
  self,
}: {
  p: Person;
  disabled: boolean;
  onClose: () => void;
  onEdit: () => void;
  onWrite: () => void;
  self: boolean;
}) {
  const tr = useTr();
  const base = staffStats(p);
  const all = extras.use();
  const ex = all[p.id] ?? none;
  const st = { ...base, xp: base.xp + ex.xp };
  const level =
    st.xp >= st.next ? { ...st, level: st.level + 1, xp: st.xp - st.next } : st;
  const data = useMemo(() => player(p, base, tr), [p, base, tr]);
  const quests = [
    ...data.quests,
    ...ex.quests
      .map((id) => QUESTS.find((q) => q.id === id)!)
      .filter((q) => !data.quests.includes(q)),
  ].map((q) =>
    ex.quests.includes(q.id) && !data.quests.includes(q)
      ? { ...q, progress: 0 }
      : q,
  );
  const badges = [
    ...data.badges,
    ...BADGES.filter(
      (b) => ex.badges.includes(b.id) && !data.badges.includes(b),
    ),
  ];
  const [open, setOpen] = useState<Open | null>(null);
  const [tab, setTab] = useState<"orders" | "tips" | "shifts" | "xp">(
    groupOf(p) === "hall" ? "orders" : "shifts",
  );
  const g = groupOf(p);
  const save = (fn: (e: Extra) => Extra) =>
    extras.set({ ...all, [p.id]: fn(ex) });
  const roles = [
    ...p.roles.map((r) => tr(ROLE_NAMES[r])),
    ...p.stations.map((s) => tr(STATION_NAMES[s])),
  ].join(" · ");
  const trRow = (r: Row): Row => r;
  const history: Record<typeof tab, Row[]> = {
    orders: data.orders,
    tips: data.tips,
    shifts: data.shifts,
    xp: [...ex.log, ...data.xp],
  };
  const list = (title: string, sub: string, rows: Row[]) => () => (
    haptic("light"),
    setOpen({ kind: "list", title, sub, rows })
  );
  const todayArt: ArtName[] =
    g === "hall"
      ? ["orders", "sales", "tips", "check"]
      : g === "lead"
        ? ["checklist", "orders", "check", "guests"]
        : ["kitchen", "shifts", "bell", "checklist"];
  const todayList = [data.orders, data.orders, data.tips, data.orders];

  return (
    <Sheet
      open
      wide
      onClose={onClose}
      label={p.name}
      title={false}
      footer={
        <div className="mx-auto flex max-w-[560px] gap-2">
          {!self && (
            <button
              type="button"
              onClick={onWrite}
              className="blue-grad press flex h-12 flex-1 items-center justify-center gap-2 rounded-full text-[15px] font-semibold"
            >
              <Send size={16} strokeWidth={2.2} /> {tr("Write")}
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="press h-12 flex-1 rounded-full bg-g-fill text-[15px] font-semibold"
          >
            {tr("Edit")}
          </button>
        </div>
      }
    >
      <div className="mx-auto max-w-[560px] px-5 pt-1 pb-10">
        {/* The player: face in the level ring, name, work, where now; what the admin can give. */}
        <div className="flex flex-col items-center text-center">
          <LevelRing p={p} st={level} off={disabled} />
          <h2 className="mt-3 text-[24px] leading-tight font-bold tracking-[-0.02em]">
            {p.name}
          </h2>
          <p className="mt-0.5 text-[13.5px] text-g-muted">
            <span className="font-semibold text-g-blue">@{p.handle}</span> ·{" "}
            {roles}
          </p>
          <p className="mt-2 flex flex-wrap items-center justify-center gap-x-1.5 text-[13px] text-g-ink-2">
            <span
              className={`size-1.5 rounded-full ${disabled ? "bg-[#e5484d]" : p.onShift ? "bg-[#22c55e]" : "bg-g-faint"}`}
            />
            {disabled
              ? tr("Access is off")
              : st.since
                ? tr("On shift since {t}", { t: st.since })
                : tr("Off today")}
            <span className="text-g-faint">·</span>
            <span className="text-g-muted tabular-nums">
              {level.xp.toLocaleString("ru-RU")} /{" "}
              {level.next.toLocaleString("ru-RU")} XP
            </span>
          </p>
          <div className="mt-4 flex gap-1.5">
            {(
              [
                ["give-xp", "XP", Plus],
                ["give-quest", tr("Quest"), Target],
                ["give-badge", tr("Badge"), Award],
              ] as const
            ).map(([k, label, Icon]) => (
              <button
                key={k}
                type="button"
                onClick={() => (haptic("light"), setOpen({ kind: k }))}
                className="press flex h-9 items-center gap-1.5 rounded-full bg-g-fill px-3.5 text-[13px] font-semibold"
              >
                <Icon size={15} strokeWidth={2.2} className="text-g-blue" />{" "}
                {label}
              </button>
            ))}
          </div>
        </div>

        <Caption>{tr("Today")}</Caption>
        <div className="grid grid-cols-2 gap-2.5">
          {base.today.map((x, i) => (
            <button
              key={x.label}
              type="button"
              onClick={list(tr(x.label), tr("Today"), todayList[i]!.map(trRow))}
              className="press relative block text-left"
            >
              <IconStat
                title={tr(x.label)}
                art={todayArt[i]!}
                value={x.value}
                sub={tr("Tap for the list")}
              />
            </button>
          ))}
        </div>

        <Caption>{tr("This week")}</Caption>
        <BarsWidget
          title={tr("Hours by day")}
          labels={data.day.map((d) => tr(d))}
          values={data.week}
          unit={tr("h")}
          now={4}
          initial={4}
        />
        <button
          type="button"
          onClick={list(tr("Shifts"), tr("This week"), data.shifts.map(trRow))}
          className="press mt-2.5 flex w-full items-center gap-4 rounded-full bg-g-fill py-3 pr-4 pl-5 text-left text-[13.5px]"
        >
          <span>
            <b className="font-bold tabular-nums">{base.hoursWeek}</b>{" "}
            <span className="text-g-muted">{tr("h")}</span>
          </span>
          <span>
            <b className="font-bold tabular-nums">{base.shiftsWeek}</b>{" "}
            <span className="text-g-muted">{tr("Shifts").toLowerCase()}</span>
          </span>
          <span>
            <b
              className={`font-bold tabular-nums ${base.late ? "text-g-orange" : ""}`}
            >
              {base.late}
            </b>{" "}
            <span className="text-g-muted">{tr("Late").toLowerCase()}</span>
          </span>
          <span className="flex items-center gap-1">
            <b className="font-bold tabular-nums">{base.rating.toFixed(1)}</b>
            <Star
              size={12}
              className="fill-current text-[#f5a524]"
              strokeWidth={0}
            />
          </span>
          <ChevronRight size={16} className="ml-auto text-g-faint" />
        </button>

        <Caption>{tr("Skills")}</Caption>
        <div className="divide-y divide-g-line rounded-[24px] bg-g-fill px-4">
          {data.skills.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => (
                haptic("light"),
                setOpen({ kind: "skill", skill: k })
              )}
              className="press flex w-full items-center gap-3 py-3 text-left"
            >
              <span className="w-[42%] shrink-0 truncate text-[14px] font-semibold">
                {tr(k.name)}
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-g-card">
                <span
                  className="blue-grad block h-full rounded-full"
                  style={{ width: `${k.value}%` }}
                />
              </span>
              <span className="w-7 shrink-0 text-right text-[13px] font-bold tabular-nums">
                {k.value}
              </span>
              <ChevronRight size={15} className="shrink-0 text-g-faint" />
            </button>
          ))}
        </div>

        <Caption
          aside={
            <span className="normal-case tracking-normal">
              {tr("Checklist")} {base.checklist[0]}/{base.checklist[1]}
            </span>
          }
        >
          {tr("Quests")}
        </Caption>
        <div className="divide-y divide-g-line rounded-[24px] bg-g-fill px-3">
          {quests.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => (
                haptic("light"),
                setOpen({ kind: "quest", quest: q })
              )}
              className="press flex w-full items-center gap-3 py-2.5 text-left"
            >
              <QuestMedal
                state={q.progress >= q.goal ? "done" : "active"}
                icon={q.icon}
                size={42}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[14.5px] font-semibold">
                    {tr(q.title)}
                  </span>
                  <span className="shrink-0 text-[12.5px] text-g-muted tabular-nums">
                    {q.progress}/{q.goal}
                  </span>
                </span>
                <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-g-card">
                  <span
                    className="block h-full rounded-full bg-g-blue"
                    style={{ width: `${(q.progress / q.goal) * 100}%` }}
                  />
                </span>
                <span className="mt-1 block text-[12px] font-medium text-g-blue">
                  {tr(q.reward)}
                </span>
              </span>
            </button>
          ))}
        </div>

        <Caption>{tr("Badges")}</Caption>
        <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5">
          {badges.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => (
                haptic("light"),
                setOpen({ kind: "badge", badge: b })
              )}
              className="press flex w-[84px] shrink-0 flex-col items-center gap-1 text-center"
            >
              <BadgeEmblem tier={b.tier} icon={b.icon} earned size={72} />
              <span className="line-clamp-2 text-[12px] leading-tight font-semibold">
                {tr(b.name)}
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => (haptic("light"), setOpen({ kind: "give-badge" }))}
            className="press flex w-[84px] shrink-0 flex-col items-center gap-1 text-center"
          >
            <span className="grid size-[72px] place-items-center rounded-full border border-dashed border-g-faint/60 text-g-muted">
              <Plus size={22} strokeWidth={2} />
            </span>
            <span className="text-[12px] font-semibold text-g-muted">
              {tr("Award")}
            </span>
          </button>
        </div>

        <Caption>{tr("History")}</Caption>
        <div className="grid grid-cols-4 rounded-full bg-g-fill p-1">
          {(
            [
              ["orders", g === "hall" ? tr("Orders") : tr("Tickets")],
              ["tips", tr("Tips")],
              ["shifts", tr("Shifts")],
              ["xp", "XP"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={tab === id}
              onClick={() => (haptic("tick"), setTab(id))}
              className={`h-9 rounded-full text-[13px] font-semibold transition-colors ${tab === id ? "bg-g-card text-g-ink shadow-[0_1px_3px_rgba(11,11,15,0.1)]" : "text-g-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <Rows
          key={tab}
          rows={history[tab].map(trRow)}
          className="animate-rise mt-2.5"
        />
      </div>

      {open?.kind === "list" && (
        <Sheet
          open
          onClose={() => setOpen(null)}
          label={open.title}
          title={false}
        >
          <div className="px-5 pt-1 pb-10">
            <h2 className="text-[26px] leading-tight font-bold tracking-[-0.02em]">
              {open.title}
            </h2>
            <p className="mt-0.5 text-[14px] text-g-muted">
              {p.name} · {open.sub}
            </p>
            <Rows rows={open.rows} className="mt-5" />
          </div>
        </Sheet>
      )}
      {open?.kind === "skill" && (
        <Info
          onClose={() => setOpen(null)}
          label={tr(open.skill.name)}
          head={<SkillDial value={open.skill.value} />}
        >
          <Para title={tr("How it is counted")}>{tr(open.skill.how)}</Para>
          <Para title={tr("How to raise it")}>{tr(open.skill.raise)}</Para>
          <p className="mt-4 text-[12.5px] text-g-muted">
            {tr(
              "Skills come from the last 30 days of work and update after every shift.",
            )}
          </p>
        </Info>
      )}
      {open?.kind === "quest" && (
        <Info
          onClose={() => setOpen(null)}
          label={tr(open.quest.title)}
          head={
            <QuestMedal
              state={open.quest.progress >= open.quest.goal ? "done" : "active"}
              icon={open.quest.icon}
              size={120}
            />
          }
        >
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-g-fill">
            <div
              className="blue-grad h-full rounded-full"
              style={{
                width: `${(open.quest.progress / open.quest.goal) * 100}%`,
              }}
            />
          </div>
          <p className="mt-2 flex justify-between text-[13px] text-g-muted tabular-nums">
            <span>
              {open.quest.progress}/{open.quest.goal}
            </span>
            <span>
              {tr("Until")} {tr(open.quest.due)}
            </span>
          </p>
          <Para title={tr("What to do")}>{tr(open.quest.text)}</Para>
          <Para title={tr("Reward")}>{tr(open.quest.reward)}</Para>
        </Info>
      )}
      {open?.kind === "badge" && (
        <Info
          onClose={() => setOpen(null)}
          label={tr(open.badge.name)}
          head={
            <BadgeEmblem
              tier={open.badge.tier}
              icon={open.badge.icon}
              earned
              size={132}
            />
          }
        >
          <Para title={tr("Earned for")}>{tr(open.badge.text)}</Para>
          <p className="mt-4 text-[12.5px] text-g-muted">
            {tr(
              "Shown on the profile and in the team list; everyone on the team sees it.",
            )}
          </p>
        </Info>
      )}
      {open?.kind === "give-xp" && (
        <GiveXp
          name={p.name}
          onClose={() => setOpen(null)}
          onGive={(n, why) => {
            save((e) => ({
              ...e,
              xp: e.xp + n,
              log: [{ at: tr("Now"), title: why, value: `+${n} XP` }, ...e.log],
            }));
            setTab("xp");
            setOpen(null);
          }}
        />
      )}
      {open?.kind === "give-quest" && (
        <Pick
          title={tr("Set a quest")}
          items={QUESTS.filter((q) => !quests.some((x) => x.id === q.id)).map(
            (q) => ({
              id: q.id,
              title: tr(q.title),
              sub: `${tr(q.reward)} · ${tr(q.due)}`,
              icon: <QuestMedal state="available" icon={q.icon} size={40} />,
            }),
          )}
          empty={tr("All quests are already set")}
          onClose={() => setOpen(null)}
          onPick={(id) => {
            save((e) => ({ ...e, quests: [...e.quests, id] }));
            setOpen(null);
          }}
        />
      )}
      {open?.kind === "give-badge" && (
        <Pick
          title={tr("Award a badge")}
          items={BADGES.filter((b) => !badges.some((x) => x.id === b.id)).map(
            (b) => ({
              id: b.id,
              title: tr(b.name),
              sub: tr(b.text),
              icon: (
                <BadgeEmblem tier={b.tier} icon={b.icon} earned size={40} />
              ),
            }),
          )}
          empty={tr("All badges are already earned")}
          onClose={() => setOpen(null)}
          onPick={(id) => {
            save((e) => ({
              ...e,
              badges: [...e.badges, id],
              log: [
                {
                  at: tr("Now"),
                  title: `${tr("Badge")}: ${tr(BADGES.find((b) => b.id === id)!.name)}`,
                  value: "+100 XP",
                },
                ...e.log,
              ],
              xp: e.xp + 100,
            }));
            setOpen(null);
          }}
        />
      )}
    </Sheet>
  );
}

/* ---------------------------------------------------------------- Parts */

/** The face inside a thin ring that fills with XP towards the next level. */
function LevelRing({
  p,
  st,
  off,
}: {
  p: Person;
  st: StaffStats;
  off: boolean;
}) {
  const R = 44;
  const C = 2 * Math.PI * R;
  return (
    <span className="relative grid size-[100px] place-items-center">
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 -rotate-90"
        aria-hidden
      >
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="var(--g-line)"
          strokeWidth="3.5"
        />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke="var(--g-blue)"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - Math.min(1, st.xp / st.next))}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <Face p={p} size={78} off={off} dot={false} />
      <span className="blue-grad absolute -bottom-1 rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ring-2 ring-[var(--g-bg)]">
        {st.level}
      </span>
    </span>
  );
}

function Rows({ rows, className = "" }: { rows: Row[]; className?: string }) {
  return (
    <div
      className={`divide-y divide-g-line rounded-[24px] bg-g-fill px-4 ${className}`}
    >
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-3 py-3">
          <span className="w-[52px] shrink-0 text-[12.5px] text-g-muted tabular-nums">
            {r.at}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14.5px] font-semibold">
              {r.title}
            </span>
            {r.sub && (
              <span
                className={`block truncate text-[12.5px] ${r.tone ?? "text-g-muted"}`}
              >
                {r.sub}
              </span>
            )}
          </span>
          {r.value && (
            <span className="shrink-0 text-[14px] font-semibold tabular-nums">
              {r.value}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/** A story page: a big picture, the title, then a few short paragraphs. */
function Info({
  label,
  head,
  children,
  onClose,
}: {
  label: string;
  head: ReactNode;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <Sheet open onClose={onClose} label={label} title={false}>
      <div className="px-5 pt-1 pb-10">
        <div className="animate-pop flex justify-center">{head}</div>
        <h2 className="mt-3 text-center text-[24px] leading-tight font-bold tracking-[-0.02em]">
          {label}
        </h2>
        <div className="mt-5">{children}</div>
      </div>
    </Sheet>
  );
}

function Para({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-3 rounded-[22px] bg-g-fill px-4 py-3.5">
      <p className="text-[12.5px] font-semibold text-g-muted">{title}</p>
      <p className="mt-1 text-[14.5px] leading-snug">{children}</p>
    </div>
  );
}

/** A skill as a dial from 0 to 100. */
function SkillDial({ value }: { value: number }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  return (
    <span className="relative grid size-[128px] place-items-center">
      <svg
        viewBox="0 0 128 128"
        className="absolute inset-0 -rotate-90"
        aria-hidden
      >
        <circle
          cx="64"
          cy="64"
          r={R}
          fill="none"
          stroke="var(--g-line)"
          strokeWidth="8"
        />
        <circle
          cx="64"
          cy="64"
          r={R}
          fill="none"
          stroke="var(--g-blue)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - value / 100)}
        />
      </svg>
      <span className="text-[34px] font-bold tracking-[-0.03em] tabular-nums">
        {value}
      </span>
    </span>
  );
}

function GiveXp({
  name,
  onClose,
  onGive,
}: {
  name: string;
  onClose: () => void;
  onGive: (n: number, why: string) => void;
}) {
  const tr = useTr();
  const [n, setN] = useState(100);
  const [why, setWhy] = useState("Great shift");
  return (
    <Sheet
      open
      onClose={onClose}
      label={tr("Give XP")}
      title={false}
      footer={
        <button
          type="button"
          onClick={() => (haptic("success"), onGive(n, tr(why)))}
          className="blue-grad press flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold"
        >
          <Sparkles size={16} strokeWidth={2.2} />{" "}
          {tr("Give {n} XP to {name}", { n, name })}
        </button>
      }
    >
      <div className="px-5 pt-1 pb-10">
        <h2 className="text-[26px] leading-tight font-bold tracking-[-0.02em]">
          {tr("Give XP")}
        </h2>
        <p className="mt-0.5 text-[14px] text-g-muted">
          {tr("It shows in their history with the reason")}
        </p>
        <Caption>{tr("How much")}</Caption>
        <div className="grid grid-cols-4 gap-1.5">
          {[50, 100, 250, 500].map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={n === v}
              onClick={() => (haptic("tick"), setN(v))}
              className={`press h-11 rounded-full text-[14px] font-semibold tabular-nums transition-colors ${n === v ? "blue-grad" : "bg-g-fill"}`}
            >
              +{v}
            </button>
          ))}
        </div>
        <Caption>{tr("For what")}</Caption>
        <div className="flex flex-wrap gap-1.5">
          {[
            "Great shift",
            "Helped the team",
            "Guest praise",
            "Covered a shift",
          ].map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={why === w}
              onClick={() => (haptic("tick"), setWhy(w))}
              className={`press h-9 rounded-full px-3.5 text-[13.5px] font-semibold transition-colors ${why === w ? "bg-g-ink text-white" : "bg-g-fill text-g-ink-2"}`}
            >
              {tr(w)}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

function Pick({
  title,
  items,
  empty,
  onClose,
  onPick,
}: {
  title: string;
  items: { id: string; title: string; sub: string; icon: ReactNode }[];
  empty: string;
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  return (
    <Sheet open onClose={onClose} label={title} title={false}>
      <div className="px-5 pt-1 pb-10">
        <h2 className="text-[26px] leading-tight font-bold tracking-[-0.02em]">
          {title}
        </h2>
        {items.length ? (
          <div className="mt-5 divide-y divide-g-line rounded-[24px] bg-g-fill px-3">
            {items.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => (haptic("success"), onPick(it.id))}
                className="press flex w-full items-center gap-3 py-2.5 text-left"
              >
                <span className="shrink-0">{it.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-semibold">
                    {it.title}
                  </span>
                  <span className="block truncate text-[12.5px] text-g-muted">
                    {it.sub}
                  </span>
                </span>
                <Plus
                  size={18}
                  strokeWidth={2.2}
                  className="shrink-0 text-g-blue"
                />
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-full bg-g-fill px-5 py-3.5 text-[14px] text-g-muted">
            {empty}
          </p>
        )}
      </div>
    </Sheet>
  );
}
