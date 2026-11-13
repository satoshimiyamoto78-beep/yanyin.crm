"use client";

import {
  Ban,
  Bell,
  Check,
  ChevronRight,
  ClipboardCheck,
  Eye,
  EyeOff,
  LayoutDashboard,
  Megaphone,
  PenLine,
  Send,
  Store,
  Users,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  allItems,
  checklistProgress,
  formatMoney,
  recipientsOf,
  ROLE_PERMISSIONS,
  type ChecklistRun,
  type ChecklistTemplate,
  type Menu,
  type Permission,
  type Person,
  type StaffRole,
  type Station,
} from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import { demoFloor, ticketTotal, type FloorTable } from "@/lib/demo-floor";
import {
  BAR_CHECKLIST,
  BAR_RUN,
  demoKitchen,
  KITCHEN_CHECKLIST,
  KITCHEN_RUN,
} from "@/lib/demo-kitchen";
import {
  CHECKLIST_OWNER,
  TEAM,
  WAITER_CHECKLIST,
  WAITER_RUN,
} from "@/lib/demo-team";
import { postNews, useNews, type NewsPost } from "@/lib/news";
import { useHandles, withHandles } from "@/lib/handles";
import { saveStopList, useStopList } from "@/lib/stoplist";
import { Island, Reveal, type IslandNotice } from "@/components/guest/motion";
import { Sheet } from "@/components/guest/ui";
import { YanOrb } from "@/components/guest/YanSheet";
import { ArtScene } from "@/components/system/Art";
import { MentionInput, MentionText } from "@/components/system/MentionInput";
import { NorthSky } from "@/components/system/NorthSky";
import { useScheme } from "@/components/system/scheme";
import { Strip, StripBig, StripSquare } from "@/components/system/Strip";
import { ThemeToggle } from "@/components/system/ThemeToggle";
import { ActionListWidget } from "@/components/system/Widgets";
import { ChecklistCard, ChecklistPage } from "@/components/crew/Checklist";
import { SectionTitle } from "@/components/crew/CrewBoard";
import { compactMoney, ShiftMoney } from "@/components/crew/CrewApp";
import { YanChat } from "@/components/crew/YanChat";
import { CrewPrefsProvider, useTr } from "@/components/crew/prefs";

/*
 * yanyin.hq: the owner's and admin's console, phone first, built from the same
 * kit as the waiter app (ADR-013, visual-system.md). Overview is the "home":
 * sky header with today's takings and the quick-action strip, then what needs
 * attention, who is on shift, the latest news and the shift's money. Team,
 * News and Checklists are plain pages with a big title, like the waiter's Hall.
 * The tab capsule, the round action button and Yan above it match the waiter's.
 */

type Tab = "overview" | "team" | "news" | "checklists";
const TABS: Tab[] = ["overview", "team", "news", "checklists"];
const ME = "staff-huong";
const NOW = "12:45";
const ROLE_NAMES: Record<StaffRole, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  waiter: "Waiter",
  bartender: "Bartender",
  cook: "Cook",
  host: "Host",
  runner: "Runner",
  accountant: "Accountant",
};
const STATION_NAMES: Record<Station, string> = {
  hall: "Hall",
  bar: "Bar",
  hot: "Hot kitchen",
  cold: "Cold kitchen",
  grill: "Grill",
  pastry: "Pastry",
  hookah: "Hookah",
};
const PERM_NAMES: Record<Permission, string> = {
  "orders.take": "Take orders",
  "orders.void": "Cancel dishes",
  "orders.discount": "Give discounts",
  "payments.take": "Take payments",
  "kds.bump": "Work the station screen",
  "menu.edit": "Edit the menu",
  "stoplist.edit": "Edit the stop-list",
  "staff.manage": "Manage the team",
  "news.post": "Post news to groups",
  "reports.view": "See reports",
  "checklists.manage": "Set up checklists",
  "billing.manage": "Billing and plan",
};
const LEAD_ROLES: StaffRole[] = ["owner", "admin", "manager", "accountant"];
type Group = "hall" | "bar" | "kitchen" | "lead";
const GROUP_NAMES: Record<Group, string> = {
  hall: "Hall",
  bar: "Bar",
  kitchen: "Kitchen",
  lead: "Management",
};
/** Where a person sits in the team list: management first by role, the rest by their first station. */
const groupOf = (p: Person): Group =>
  p.roles.some((r) => LEAD_ROLES.includes(r))
    ? "lead"
    : p.stations.some((s) => s === "bar" || s === "hookah")
      ? "bar"
      : p.stations.some((s) => s !== "hall")
        ? "kitchen"
        : "hall";
/** The station screen is its own page (a wall tablet); the console links to it. */
const openStation = () => window.open("kitchen.html", "_self");
const total5 = (subtotal: number, tip: number) =>
  subtotal + Math.round(subtotal * 0.05) + tip;

export function HqApp({ menu }: { menu: Menu }) {
  return (
    <CrewPrefsProvider>
      <Console menu={menu} />
    </CrewPrefsProvider>
  );
}

function Console({ menu }: { menu: Menu }) {
  const tr = useTr();
  const scheme = useScheme();
  const [tab, setTab] = useState<Tab>("overview");
  const [rawTeam, setTeam] = useState<Person[]>(TEAM);
  // Everyone's chosen @ID (a waiter may have picked a new one in their app).
  const handles = useHandles();
  const team = useMemo(() => withHandles(rawTeam, handles), [rawTeam, handles]);
  const me = team.find((p) => p.id === ME)!;
  const [person, setPerson] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [runs, setRuns] = useState<Record<string, ChecklistRun>>({
    waiter: {
      ...WAITER_RUN,
      marks: {
        ...WAITER_RUN.marks,
        fridge: { at: "11:20", by: "staff-linh", value: "7" },
      },
    },
    bar: BAR_RUN,
    kitchen: KITCHEN_RUN,
  });
  const [openList, setOpenList] = useState<string | null>(null);
  const [sheet, setSheet] = useState<"tables" | "stop" | null>(null);
  const [yan, setYan] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [notice, setNotice] = useState<IslandNotice | null>(null);
  const floor = useMemo(() => demoFloor(menu), [menu]);
  const kitchen = useMemo(() => demoKitchen(menu), [menu]);
  const items = useMemo(() => allItems(menu), [menu]);
  const money = useCallback(
    (n: number) => formatMoney(n, floor.venue.currency, "en"),
    [floor.venue.currency],
  );
  const stop = useStopList();
  const news = useNews();
  const attentionRef = useRef<HTMLDivElement>(null);
  const moneyRef = useRef<HTMLDivElement>(null);

  const notify = (n: IslandNotice) => {
    setNotice(n);
    setTimeout(() => setNotice((c) => (c === n ? null : c)), 2800);
  };
  const go = (t: Tab) => {
    haptic("light");
    setTab(t);
    window.scrollTo({ top: 0 });
  };
  const scrollTo = (el: HTMLElement | null) =>
    el?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Today at a glance: the same sums as the waiter's till, so both apps show one number.
  const busy = floor.tables.filter(
    (t) => t.status !== "free" && t.status !== "reserved",
  );
  const billTables = floor.tables.filter((t) => t.status === "bill").length;
  const due = busy.reduce(
    (n, t) => n + Math.round(ticketTotal(t.lines) * 1.05),
    0,
  );
  const takings = floor.history.reduce(
    (n, o) => n + total5(o.subtotal, o.tip),
    0,
  );
  const inWork = kitchen.orders.reduce(
    (n, o) =>
      n +
      o.lines.filter((l) => l.state !== "ready").reduce((q, l) => q + l.qty, 0),
    0,
  );
  const oldest = kitchen.orders
    .filter((o) => o.lines.some((l) => l.state !== "ready"))
    .map((o) => o.at)
    .sort()[0];
  const waitMin = oldest
    ? 12 * 60 + 45 - (Number(oldest.slice(0, 2)) * 60 + Number(oldest.slice(3)))
    : 0;
  const lists: { key: string; tpl: ChecklistTemplate; who: string }[] = [
    {
      key: "waiter",
      tpl: WAITER_CHECKLIST,
      who: `@${team.find((p) => p.id === "staff-linh")?.handle}`,
    },
    { key: "bar", tpl: BAR_CHECKLIST, who: "@bar" },
    { key: "kitchen", tpl: KITCHEN_CHECKLIST, who: "@kitchen" },
  ];
  const progress = lists.map((l) => ({
    ...l,
    p: checklistProgress(l.tpl, runs[l.key]!, NOW),
  }));
  const stopped = items.filter((i) => stop.includes(i.id));
  const onShift = team.filter((p) => p.onShift);
  const listDone = progress.reduce((n, l) => n + l.p.done, 0);
  const listTotal = progress.reduce((n, l) => n + l.p.total, 0);
  const flaggedN = progress.reduce((n, l) => n + l.p.flagged.length, 0);
  const lateN = progress.reduce((n, l) => n + l.p.late.length, 0);
  const openChecklist = (key: string) => {
    setTab("checklists");
    setOpenList(key);
  };

  // What needs the admin now, most urgent first: one row, one action (the waiter's ActionList).
  const attention = [
    ...progress.flatMap((l) =>
      l.p.flagged.map((it) => ({
        id: `f-${l.key}-${it.id}`,
        badge: `${runs[l.key]!.marks[it.id]!.value}${it.proof?.kind === "number" && it.proof.unit === "°C" ? "°" : ""}`,
        badgeLabel: tr(it.title),
        title: tr(it.title),
        sub: `${tr("Out of range")} · ${l.who}`,
        action: { label: tr("Open it"), onClick: () => openChecklist(l.key) },
      })),
    ),
    ...(waitMin >= 15
      ? [
          {
            id: "kds",
            badge: `${waitMin}′`,
            badgeLabel: tr("min"),
            title: tr("A table has waited {n} min for the kitchen", {
              n: waitMin,
            }),
            sub: tr("Station screen: hot kitchen"),
            action: { label: tr("Screen"), onClick: openStation },
          },
        ]
      : []),
    ...progress.flatMap((l) =>
      l.p.late.length
        ? [
            {
              id: `l-${l.key}`,
              badge: String(l.p.late.length),
              badgeLabel: tr("late"),
              title: `${tr(l.tpl.title)}: ${tr("{n} late|{n} late", { n: l.p.late.length })}`,
              sub: l.who,
              action: {
                label: tr("Open it"),
                onClick: () => openChecklist(l.key),
              },
            },
          ]
        : [],
    ),
    ...(stopped.length
      ? [
          {
            id: "stop",
            badge: String(stopped.length),
            badgeLabel: tr("Stop-list"),
            title: tr("{n} dish ran out|{n} dishes ran out", {
              n: stopped.length,
            }),
            sub: tr("Hidden from guests and waiters"),
            action: { label: tr("Open it"), onClick: () => setSheet("stop") },
          },
        ]
      : []),
  ];

  const known = (h: string) => team.some((p) => p.handle === h);
  const recipients = recipientsOf(draft, team);
  const send = () => {
    if (!draft.trim() || !recipients.length) return;
    haptic("success");
    postNews({ by: ME, text: draft.trim(), at: NOW, to: recipients, read: [] });
    notify({
      title: tr("Sent to {n} person|Sent to {n} people", {
        n: recipients.length,
      }),
      tone: "green",
      icon: <Send size={15} strokeWidth={2.4} />,
    });
    setDraft("");
  };
  const groups = [
    {
      handle: "all",
      label: tr("Everyone on shift"),
      count: onShift.filter((p) => p.id !== ME).length,
    },
    {
      handle: "bar",
      label: tr("Bar"),
      count: onShift.filter((p) => p.stations.includes("bar")).length,
    },
    {
      handle: "kitchen",
      label: tr("Kitchen"),
      count: onShift.filter((p) => p.stations.includes("hot")).length,
    },
    {
      handle: "hall",
      label: tr("Hall"),
      count: onShift.filter((p) => p.stations.includes("hall")).length,
    },
  ];
  const roleLabel = (p: Person) =>
    p.roles.map((r) => tr(ROLE_NAMES[r])).join(", ");
  const compose = () => {
    go("news");
    requestAnimationFrame(() =>
      document.querySelector<HTMLTextAreaElement>("textarea")?.focus(),
    );
  };
  const short = (n: number) => compactMoney(n).replace(/(\.\d)\d(M)/, "$1$2");

  return (
    <main className="min-h-dvh overflow-x-hidden bg-white text-g-ink">
      <Island notice={notice} />
      <div key={tab} className="animate-tab mx-auto max-w-[480px] pb-28">
        {tab === "overview" && (
          <>
            {/* The waiter's home header: avatar, venue, theme, bell; takings big; the quick-action strip. */}
            <section className="relative isolate pt-[max(16px,env(safe-area-inset-top))] pb-6 text-white">
              <NorthSky />
              <div className="flex items-center gap-2 px-5">
                <button
                  aria-label={tr("Profile")}
                  onClick={() => setPerson(ME)}
                  className="press grid size-10 shrink-0 place-items-center rounded-full bg-[#fff] text-[16px] font-bold text-[#0b0b0f]"
                >
                  {me.name[0]}
                </button>
                <span className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-white/15 px-3.5 text-white">
                  <Store
                    size={17}
                    strokeWidth={2}
                    className="shrink-0 text-white/70"
                  />
                  <span className="truncate text-[15px] font-semibold">
                    Samarkand
                  </span>
                  <span className="truncate text-[13px] text-white/60">
                    @{me.handle}
                  </span>
                </span>
                <ThemeToggle
                  dark={scheme.dark}
                  onToggle={scheme.toggle}
                  label={tr("Light or dark theme")}
                />
                <button
                  aria-label={
                    attention.length
                      ? tr("Notifications, {n} new", { n: attention.length })
                      : tr("Notifications")
                  }
                  onClick={() => scrollTo(attentionRef.current)}
                  className="press relative grid size-10 shrink-0 place-items-center rounded-full bg-white/15 text-white"
                >
                  <Bell size={19} strokeWidth={2} />
                  {attention.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-g-orange px-1 text-[10px] font-bold text-white tabular-nums">
                      {attention.length}
                    </span>
                  )}
                </button>
              </div>

              <div className="mt-9 flex items-center justify-between gap-3 px-5">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[14px] text-white/70">
                    <span className="size-1.5 shrink-0 rounded-full bg-[#5ce0a0]" />
                    <span className="font-semibold text-white">
                      {tr("Shift is on")}
                    </span>
                    <span className="text-white/45">·</span>
                    {tr("Taken today")}
                  </p>
                  <button
                    onClick={() => scrollTo(moneyRef.current)}
                    className="press mt-2 flex items-center gap-1 text-left"
                  >
                    <span className="live text-[30px] leading-tight font-bold tracking-[-0.03em] tabular-nums">
                      {hidden ? "••• •••" : money(takings)}
                    </span>
                    <ChevronRight size={22} className="text-white/55" />
                  </button>
                </div>
                <button
                  aria-label={hidden ? tr("Show amounts") : tr("Hide amounts")}
                  onClick={() => setHidden((v) => !v)}
                  className="press grid size-10 shrink-0 place-items-center rounded-full bg-white/15 text-white"
                >
                  {hidden ? (
                    <Eye size={19} strokeWidth={2} />
                  ) : (
                    <EyeOff size={19} strokeWidth={2} />
                  )}
                </button>
              </div>

              <Strip>
                <StripBig
                  art="tables"
                  onClick={() => setSheet("tables")}
                  icon={null}
                  title={tr("{a}/{b} tables", {
                    a: busy.length,
                    b: floor.tables.length,
                  })}
                  sub={
                    billTables
                      ? tr(
                          "{n} table wants the bill|{n} tables want the bill",
                          { n: billTables },
                        )
                      : tr("all calm")
                  }
                  tone={billTables ? "orange" : "muted"}
                />
                <StripBig
                  art="kitchen"
                  onClick={openStation}
                  icon={null}
                  title={`${tr("Kitchen")} · ${inWork}`}
                  sub={
                    waitMin
                      ? tr("longest {n} min", { n: waitMin })
                      : tr("all calm")
                  }
                  tone={waitMin >= 15 ? "orange" : "muted"}
                />
                <StripSquare
                  icon={<Megaphone size={21} strokeWidth={1.9} />}
                  label={tr("News")}
                  onClick={compose}
                />
                <StripSquare
                  tone="coral"
                  icon={<Ban size={21} strokeWidth={1.9} />}
                  label={tr("Stop-list")}
                  onClick={() => setSheet("stop")}
                />
                <StripBig
                  art="check"
                  onClick={() => scrollTo(moneyRef.current)}
                  icon={null}
                  title={hidden ? "•••" : `${short(due)} ₫`}
                  sub={tr("still to pay")}
                />
                <StripBig
                  art="checklist"
                  onClick={() => go("checklists")}
                  icon={null}
                  title={`${listDone}/${listTotal}`}
                  sub={
                    flaggedN
                      ? tr("{n} out of range|{n} out of range", { n: flaggedN })
                      : tr("Checklists")
                  }
                  tone={flaggedN ? "orange" : "muted"}
                  wide
                />
              </Strip>
            </section>

            {/* Above the sky's soft lower edge, so the first rows are never washed out. */}
            <div className="relative z-10 px-5 pb-10">
              <div ref={attentionRef} className="scroll-mt-4">
                <ActionListWidget
                  title={tr("Needs attention")}
                  icon={<Bell size={13} strokeWidth={2.4} />}
                  rows={attention}
                  empty={tr("Nothing needs you right now")}
                />
              </div>

              <SectionTitle
                title={tr("On shift")}
                count={onShift.length}
                onAll={() => go("team")}
              />
              <div className="no-scrollbar -mx-5 flex gap-1 overflow-x-auto px-4">
                {onShift.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPerson(p.id)}
                    className="press flex w-[68px] shrink-0 flex-col items-center gap-1.5 py-1"
                  >
                    <Avatar p={p} size={56} />
                    <span className="w-full truncate text-center text-[13px] font-semibold">
                      {p.name}
                    </span>
                    <span className="-mt-1.5 w-full truncate text-center text-[11px] text-g-muted">
                      {tr(GROUP_NAMES[groupOf(p)])}
                    </span>
                  </button>
                ))}
              </div>

              {news[0] && (
                <>
                  <SectionTitle
                    title={tr("News")}
                    count={news.length}
                    onAll={() => go("news")}
                  />
                  <Post n={news[0]} team={team} known={known} />
                </>
              )}

              <div ref={moneyRef} className="scroll-mt-4">
                <SectionTitle title={tr("Shift money")} />
                <ShiftMoney history={floor.history} />
              </div>
            </div>
          </>
        )}

        {tab === "team" && (
          <div className="px-5 pt-[max(20px,env(safe-area-inset-top))]">
            <PageHead
              title={tr("Team")}
              sub={tr("{a} on shift of {b}", {
                a: onShift.length,
                b: team.length,
              })}
            />
            <Reveal className="mt-6">
              <ArtScene
                name="guests"
                layout="row"
                focal={64}
                className="rounded-[26px] p-5"
                footer={
                  <p className="mt-4 truncate text-[14px] text-g-muted">
                    {(["hall", "bar", "kitchen", "lead"] as Group[])
                      .map(
                        (g) =>
                          `${tr(GROUP_NAMES[g])} ${onShift.filter((p) => groupOf(p) === g).length}`,
                      )
                      .join(" · ")}
                  </p>
                }
              >
                <p className="text-[15px] leading-tight font-semibold text-g-ink-2">
                  {tr("On shift")}
                </p>
                <p className="mt-1 text-[34px] leading-none font-bold tracking-[-0.03em] tabular-nums">
                  {onShift.length}
                  <span className="text-[20px] text-g-muted">
                    /{team.length}
                  </span>
                </p>
              </ArtScene>
            </Reveal>
            {(["hall", "bar", "kitchen", "lead"] as Group[]).map((g) => {
              const people = team.filter((p) => groupOf(p) === g);
              return (
                <section key={g}>
                  <SectionTitle
                    title={tr(GROUP_NAMES[g])}
                    count={people.length}
                    className="mt-8 mb-2"
                  />
                  <div className="card rounded-[24px] p-1.5">
                    {people.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setPerson(p.id)}
                        className="press flex w-full items-center gap-3 rounded-[18px] px-2.5 py-2.5 text-left"
                      >
                        <Avatar p={p} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline gap-1.5">
                            <span className="truncate text-[16px] font-semibold">
                              {p.name}
                            </span>
                            <span className="truncate text-[14px] text-g-blue">
                              @{p.handle}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-[13px] text-g-muted">
                            {[
                              ...p.roles.map((r) => tr(ROLE_NAMES[r])),
                              ...p.stations.map((s) => tr(STATION_NAMES[s])),
                            ].join(" · ")}
                          </span>
                        </span>
                        <ChevronRight
                          size={18}
                          className="shrink-0 text-g-faint"
                        />
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {tab === "news" && (
          <div className="px-5 pt-[max(20px,env(safe-area-inset-top))]">
            <PageHead
              title={tr("News")}
              sub={tr("Mention people with @: only they get it")}
            />
            {/* Who to write to, one tap: the groups as chips above the field. */}
            <div className="no-scrollbar -mx-5 mt-6 flex gap-2 overflow-x-auto px-5">
              {groups.map((g) => (
                <button
                  key={g.handle}
                  onClick={() => {
                    haptic("tick");
                    setDraft((d) =>
                      d.includes(`@${g.handle}`) ? d : `@${g.handle} ${d}`,
                    );
                  }}
                  className="press flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-g-fill pr-4 pl-1.5 text-[14px] font-semibold"
                >
                  <span className="blue-grad grid size-7 place-items-center rounded-full">
                    <Users size={14} strokeWidth={2.4} />
                  </span>
                  @{g.handle}
                  <span className="font-medium text-g-faint tabular-nums">
                    {g.count}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-3">
              <MentionInput
                value={draft}
                onChange={setDraft}
                people={team.filter((p) => p.id !== ME)}
                groups={groups}
                placeholder={tr(
                  "@linh please check table 7 · @bar new syrups at 14:00",
                )}
                roleLabel={roleLabel}
              />
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className="flex min-w-0 flex-1 items-center gap-2">
                {recipients.length > 0 && (
                  <span className="flex shrink-0 -space-x-2">
                    {recipients.slice(0, 4).map((id) => {
                      const p = team.find((x) => x.id === id);
                      return p ? (
                        <Avatar key={id} p={p} size={28} dot={false} ring />
                      ) : null;
                    })}
                  </span>
                )}
                <span className="min-w-0 truncate text-[13px] text-g-muted">
                  {recipients.length
                    ? tr("Goes to {n} person|Goes to {n} people", {
                        n: recipients.length,
                      })
                    : tr("Add @someone, @bar, @kitchen or @all")}
                </span>
              </span>
              <button
                disabled={!draft.trim() || !recipients.length}
                onClick={send}
                className="blue-grad press flex h-12 shrink-0 items-center gap-2 rounded-full px-5 text-[15px] font-semibold disabled:opacity-40"
              >
                <Send size={17} strokeWidth={2.2} /> {tr("Send")}
              </button>
            </div>
            <SectionTitle title={tr("Feed")} count={news.length} />
            <Reveal className="grid gap-3">
              {news.map((n) => (
                <Post key={n.id} n={n} team={team} known={known} />
              ))}
            </Reveal>
          </div>
        )}

        {tab === "checklists" && (
          <div className="px-5 pt-[max(20px,env(safe-area-inset-top))]">
            <PageHead
              title={tr("Checklists")}
              sub={
                lateN || flaggedN
                  ? [
                      flaggedN
                        ? tr("{n} out of range|{n} out of range", {
                            n: flaggedN,
                          })
                        : "",
                      lateN ? tr("{n} late|{n} late", { n: lateN }) : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : tr("Everyone's lists for this shift")
              }
            />
            <Reveal className="mt-6 grid gap-3">
              {progress.map((l) => (
                <ChecklistCard
                  key={l.key}
                  template={l.tpl}
                  run={runs[l.key]!}
                  title={tr(l.tpl.title)}
                  who={l.who}
                  className=""
                  onOpen={() => setOpenList(l.key)}
                />
              ))}
            </Reveal>
            <p className="mt-6 text-center text-[13px] text-g-faint">
              {tr(
                "Lists are ticked on the phone and on the station screen; photos and readings are kept with the shift.",
              )}
            </p>
          </div>
        )}
      </div>

      {/* Tab bar: the waiter's floating capsule, here with four sections; the round button writes news, Yan sits above it. */}
      <nav
        aria-label={tr("Sections")}
        className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(10px,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto flex max-w-[440px] items-center gap-2.5">
          <div className="relative grid h-[56px] flex-1 grid-cols-4 rounded-full bg-white/95 p-1 ring-1 ring-black/5">
            <span
              aria-hidden
              className="absolute top-1 bottom-1 left-1 rounded-full bg-g-fill transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                width: "calc((100% - 8px) / 4)",
                transform: `translateX(${TABS.indexOf(tab) * 100}%)`,
              }}
            />
            {(
              [
                ["overview", tr("Overview"), LayoutDashboard, attention.length],
                ["team", tr("Team"), Users, 0],
                ["news", tr("News"), Megaphone, 0],
                ["checklists", tr("Checklists"), ClipboardCheck, flaggedN],
              ] as const
            ).map(([id, label, Icon, badge]) => (
              <button
                key={id}
                onClick={() => go(id)}
                aria-current={tab === id ? "page" : undefined}
                className={`relative z-10 flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-semibold transition-colors ${tab === id ? "text-g-ink" : "text-g-faint"}`}
              >
                <Icon size={19} strokeWidth={tab === id ? 2.1 : 1.8} />
                <span className="max-w-full truncate px-1">{label}</span>
                {badge > 0 && (
                  <span className="blue-grad absolute top-1 left-[calc(50%+6px)] grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold">
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="relative shrink-0">
            <button
              aria-label={tr("Ask Yan")}
              onClick={() => {
                haptic("light");
                setYan(true);
              }}
              className="press absolute bottom-[calc(100%+10px)] left-1/2 grid -translate-x-1/2 place-items-center rounded-full shadow-[0_8px_24px_-8px_rgba(47,91,255,0.55)] ring-4 ring-[var(--g-bg)]"
            >
              <YanOrb size={44} />
            </button>
            <button
              aria-label={tr("Write news")}
              onClick={compose}
              className="blue-grad press grid size-[52px] place-items-center rounded-full"
            >
              <PenLine size={21} strokeWidth={2} />
            </button>
          </div>
        </div>
      </nav>

      {sheet === "tables" && (
        <TablesSheet
          tables={floor.tables}
          money={money}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === "stop" && (
        <StopSheet
          stopped={stopped.map((i) => ({
            id: i.id,
            name: i.name.ru ?? i.name.en ?? "",
          }))}
          onBack={(id) => {
            haptic("success");
            saveStopList(stop.filter((x) => x !== id));
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {person && (
        <PersonSheet
          p={team.find((x) => x.id === person)!}
          onClose={() => setPerson(null)}
          onChange={(np) =>
            setTeam((t) => t.map((x) => (x.id === np.id ? np : x)))
          }
          onWrite={(h) => {
            setPerson(null);
            setDraft(`@${h} `);
            compose();
          }}
        />
      )}
      {openList && (
        <ChecklistPage
          template={lists.find((l) => l.key === openList)!.tpl}
          run={runs[openList]!}
          onChange={(r) => setRuns((rs) => ({ ...rs, [openList]: r }))}
          me={ME}
          setBy={CHECKLIST_OWNER}
          onClose={() => setOpenList(null)}
          onFinish={() => undefined}
        />
      )}
      {yan && (
        <YanChat
          tables={floor.tables}
          bookings={floor.bookings}
          items={items}
          history={floor.history}
          money={money}
          name={me.name}
          onOpenTable={() => {
            setYan(false);
            setSheet("tables");
          }}
          onClose={() => setYan(false)}
        />
      )}
    </main>
  );
}

/** The waiter's page title: big, bold, a muted line under it. */
function PageHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <header>
      <h1 className="text-[30px] leading-tight font-bold tracking-[-0.025em]">
        {title}
      </h1>
      {sub && <p className="mt-0.5 text-[14px] text-g-muted">{sub}</p>}
    </header>
  );
}

function Avatar({
  p,
  size = 44,
  dot = true,
  ring = false,
}: {
  p: Person;
  size?: number;
  dot?: boolean;
  ring?: boolean;
}) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center rounded-full font-bold ${p.onShift ? "blue-grad" : "bg-g-card text-g-ink-2"} ${ring ? "ring-2 ring-[var(--g-bg)]" : ""}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {p.name.slice(0, 1)}
      {dot && p.onShift && (
        <span className="absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full border-2 border-[var(--g-bg)] bg-[#22c55e]" />
      )}
    </span>
  );
}

/** One news post: who, when, the text with @IDs in blue, and how many have read it. */
function Post({
  n,
  team,
  known,
}: {
  n: NewsPost;
  team: Person[];
  known: (h: string) => boolean;
}) {
  const tr = useTr();
  const by = team.find((p) => p.id === n.by);
  const all = n.read.length === n.to.length;
  return (
    <article className="card rounded-[24px] p-4">
      <div className="flex items-center gap-2.5">
        {by && <Avatar p={by} size={36} dot={false} />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">
            {by?.name}
          </span>
          <span className="block truncate text-[12.5px] text-g-muted">
            @{by?.handle} · {n.at}
          </span>
        </span>
      </div>
      <p className="mt-3 text-[15.5px] leading-relaxed">
        <MentionText text={n.text} known={known} />
      </p>
      <div className="mt-3.5 flex items-center gap-3">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-g-card">
          <span
            className={`block h-full rounded-full ${all ? "bg-g-green" : "bg-g-blue"}`}
            style={{
              width: `${n.to.length ? (n.read.length / n.to.length) * 100 : 0}%`,
            }}
          />
        </span>
        <span
          className={`flex shrink-0 items-center gap-1 text-[12.5px] font-semibold tabular-nums ${all ? "text-g-green" : "text-g-muted"}`}
        >
          <Check size={14} strokeWidth={2.6} />
          {tr("Read by {a} of {b}", { a: n.read.length, b: n.to.length })}
        </span>
      </div>
    </article>
  );
}

/** The whole floor for the admin: each table, its state and what it owes. */
function TablesSheet({
  tables,
  money,
  onClose,
}: {
  tables: FloorTable[];
  money: (n: number) => string;
  onClose: () => void;
}) {
  const tr = useTr();
  const state = (t: FloorTable) => {
    const cooking = t.lines.filter(
      (l) => l.state !== "served" && !l.cancelled,
    ).length;
    if (t.status === "free") return { text: tr("Free"), chip: "chip-gray" };
    if (t.status === "reserved")
      return {
        text: t.booking ? `${tr("Booked")} · ${t.booking.time}` : tr("Booked"),
        chip: "chip-blue",
      };
    if (t.status === "bill")
      return { text: tr("Wants the bill"), chip: "chip-orange" };
    if (t.status === "seated")
      return { text: tr("Ready to order"), chip: "chip-blue" };
    if (cooking)
      return {
        text: tr("{n} dish cooking|{n} dishes cooking", { n: cooking }),
        chip: "chip-orange",
      };
    return { text: tr("All served"), chip: "chip-green" };
  };
  return (
    <Sheet open onClose={onClose} label={tr("Tables")}>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-2 px-5 pt-1 pb-10">
        {tables.map((t) => {
          const s = state(t);
          const sum = Math.round(ticketTotal(t.lines) * 1.05);
          return (
            <div
              key={t.no}
              className="flex min-w-0 items-center gap-3 rounded-full bg-g-fill p-1.5 pr-4"
            >
              <span
                className={`grid size-12 shrink-0 place-items-center rounded-full text-[19px] font-bold tabular-nums ${s.chip}`}
              >
                {t.no}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">
                  {s.text}
                </span>
                <span className="block truncate text-[12.5px] text-g-muted">
                  {t.guests
                    ? `${tr("{n} guest|{n} guests", { n: t.guests })}${t.since ? ` · ${t.since}` : ""}`
                    : `${tr(t.zone)} · ${tr("{n} seat|{n} seats", { n: t.seats })}`}
                </span>
              </span>
              {sum > 0 && (
                <span className="shrink-0 text-[15px] font-semibold tabular-nums">
                  {money(sum)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

/** What ran out today, set on the station screens; one tap brings a dish back. */
function StopSheet({
  stopped,
  onBack,
  onClose,
}: {
  stopped: { id: string; name: string }[];
  onBack: (id: string) => void;
  onClose: () => void;
}) {
  const tr = useTr();
  return (
    <Sheet open onClose={onClose} label={tr("Stop-list")}>
      <div className="px-5 pt-1 pb-10">
        <p className="text-[14px] text-g-muted">
          {tr(
            "Kitchen and bar mark what ran out on their screen. Guests and waiters stop seeing it at once.",
          )}
        </p>
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-2">
          {stopped.map((i) => (
            <div
              key={i.id}
              className="flex min-w-0 items-center gap-3 rounded-full bg-g-fill p-1.5 pr-1.5"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-full chip-red">
                <Ban size={20} strokeWidth={2.2} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
                {i.name}
              </span>
              <button
                onClick={() => onBack(i.id)}
                className="press h-11 shrink-0 rounded-full bg-g-ink px-4 text-[13px] font-semibold text-white"
              >
                {tr("Back on")}
              </button>
            </div>
          ))}
          {!stopped.length && (
            <p className="flex items-center gap-2 rounded-full bg-g-fill px-4 py-3.5 text-[14px] text-g-muted">
              <span className="size-2 rounded-full bg-g-green" />{" "}
              {tr("Everything is available")}
            </p>
          )}
        </div>
      </div>
    </Sheet>
  );
}

/** One person: @ID, roles and stations (tap to switch), what they can do, write to them. */
function PersonSheet({
  p,
  onClose,
  onChange,
  onWrite,
}: {
  p: Person;
  onClose: () => void;
  onChange: (p: Person) => void;
  onWrite: (handle: string) => void;
}) {
  const tr = useTr();
  const perms = [...new Set(p.roles.flatMap((r) => ROLE_PERMISSIONS[r]))];
  const toggle = <T,>(list: T[], v: T) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  return (
    <Sheet
      open
      onClose={onClose}
      label={p.name}
      title={false}
      footer={
        p.id === ME ? undefined : (
          <button
            onClick={() => onWrite(p.handle)}
            className="blue-grad press flex h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-semibold"
          >
            <Send size={18} strokeWidth={2.2} />{" "}
            {tr("Write to @{h}", { h: p.handle })}
          </button>
        )
      }
    >
      <div className="px-5 pt-1 pb-10">
        <ArtScene
          name="guests"
          layout="row"
          focal={0}
          className="rounded-[26px] p-5"
          footer={
            <p className="mt-3 text-[14px] text-g-muted">
              {p.onShift ? tr("On shift now") : tr("Off today")}
            </p>
          }
        >
          <span className="flex items-center gap-4">
            <Avatar p={p} size={64} dot={false} />
            <span className="min-w-0">
              <span className="block truncate text-[26px] leading-tight font-bold tracking-[-0.02em]">
                {p.name}
              </span>
              <span className="block truncate text-[15px] font-semibold text-g-blue">
                @{p.handle}
              </span>
            </span>
          </span>
        </ArtScene>
        <h3 className="mt-7 text-[13px] font-semibold tracking-[0.06em] text-g-muted uppercase">
          {tr("Roles")}
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {(Object.keys(ROLE_NAMES) as StaffRole[]).map((r) => {
            const on = p.roles.includes(r);
            return (
              <button
                key={r}
                onClick={() => {
                  haptic("tick");
                  const roles = toggle(p.roles, r);
                  if (roles.length) onChange({ ...p, roles });
                }}
                aria-pressed={on}
                className={`press h-10 rounded-full px-4 text-[14px] font-semibold transition-colors ${on ? "blue-grad" : "bg-g-fill text-g-ink-2"}`}
              >
                {tr(ROLE_NAMES[r])}
              </button>
            );
          })}
        </div>
        <h3 className="mt-6 text-[13px] font-semibold tracking-[0.06em] text-g-muted uppercase">
          {tr("Stations")}
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {(
            [
              "hall",
              "bar",
              "hot",
              "cold",
              "grill",
              "pastry",
              "hookah",
            ] as Station[]
          ).map((s) => {
            const on = p.stations.includes(s);
            return (
              <button
                key={s}
                onClick={() => {
                  haptic("tick");
                  onChange({ ...p, stations: toggle(p.stations, s) });
                }}
                aria-pressed={on}
                className={`press h-10 rounded-full px-4 text-[14px] font-semibold transition-colors ${on ? "blue-grad" : "bg-g-fill text-g-ink-2"}`}
              >
                {tr(STATION_NAMES[s])}
              </button>
            );
          })}
        </div>
        <h3 className="mt-6 text-[13px] font-semibold tracking-[0.06em] text-g-muted uppercase">
          {tr("Can")}
        </h3>
        <div className="card mt-2 rounded-[24px] p-1.5">
          {perms.map((pm) => (
            <p
              key={pm}
              className="flex items-center gap-3 rounded-[18px] px-2.5 py-2 text-[15px]"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full chip-green">
                <Check size={15} strokeWidth={2.8} />
              </span>
              {tr(PERM_NAMES[pm])}
            </p>
          ))}
        </div>
        <p className="mt-3 text-[12.5px] text-g-muted">
          {tr("Rights add up across roles and are checked on the server.")}
        </p>
      </div>
    </Sheet>
  );
}
