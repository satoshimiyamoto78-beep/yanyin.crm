"use client";

import {
  BarChart3,
  CalendarDays,
  LayoutGrid,
  Plus,
  Receipt,
  Repeat2,
  Settings2,
  Trophy,
  UserPlus,
  UtensilsCrossed,
  Ban,
  Bell,
  Check,
  ChevronRight,
  ClipboardCheck,
  Eye,
  EyeOff,
  LayoutDashboard,
  Megaphone,
  Send,
  Store,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  allItems,
  checklistProgress,
  formatMoney,
  recipientsOf,
  type ChecklistRun,
  type ChecklistTemplate,
  type Menu,
  type Person,
} from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import { PersonPic } from "@/components/system/PersonPic";
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
import { ArtTile, type ArtName } from "@/components/system/Art";
import {
  BrandQr,
  Choice,
  OfflineBar,
  SectionTile,
  Sidebar,
  TabCapsule,
  TextField,
} from "@/components/system/Kit";
import { RoleSwitch } from "@/components/auth/RoleSwitch";
import { MenuAdmin } from "./MenuAdmin";
import { FloorAdmin, OrdersAdmin, ReportsAdmin } from "./OpsAdmin";
import {
  ChecklistsAdmin,
  QuestsAdmin,
  ShiftsAdmin,
  TasksAdmin,
} from "./PeopleAdmin";
import { SettingsAdmin } from "./SettingsAdmin";
import {
  GROUP_NAMES,
  groupOf,
  OnShiftGrid,
  PersonEdit,
  PersonPage,
  PersonRow,
  ROLE_NAMES,
  type Group,
} from "./People";
import { MentionInput, MentionText } from "@/components/system/MentionInput";
import { NorthSky } from "@/components/system/NorthSky";
import { useScheme } from "@/components/system/scheme";
import { Strip, StripBig, StripSquare } from "@/components/system/Strip";
import { ThemeToggle } from "@/components/system/ThemeToggle";
import { ActionListWidget } from "@/components/system/Widgets";
import { ChecklistPage } from "@/components/crew/Checklist";
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

type Tab =
  | "overview"
  | "menu"
  | "team"
  | "more"
  | "floor"
  | "orders"
  | "reports"
  | "shifts"
  | "news"
  | "checklists"
  | "quests"
  | "settings";
type Section = Exclude<Tab, "overview" | "more">;
const ME = "staff-huong";
const NOW = "12:45";
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
  const [sub, setSub] = useState<Section | null>(null);
  const [roles, setRoles] = useState(false);
  const [quick, setQuick] = useState(false);
  const [inviting, setInviting] = useState(false);
  const desktop = useDesktop();
  // Pages open beside the sidebar on computers (globals.css, html[data-console]).
  useEffect(() => {
    document.documentElement.dataset.console = "1";
    return () => {
      delete document.documentElement.dataset.console;
    };
  }, []);
  const [rawTeam, setTeam] = useState<Person[]>(TEAM);
  // Everyone's chosen @ID (a waiter may have picked a new one in their app).
  const handles = useHandles();
  const team = useMemo(() => withHandles(rawTeam, handles), [rawTeam, handles]);
  const me = team.find((p) => p.id === ME)!;
  const [person, setPerson] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [offIds, setOffIds] = useState<string[]>([]);
  const [teamView, setTeamView] = useState<"all" | "on" | "off">("all");
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
  // Picking a section closes whatever page or sheet is on top, so the new section is what you see.
  const go = (t: Tab) => {
    haptic("light");
    setSub(null);
    setRoles(false);
    setQuick(false);
    setInviting(false);
    setPerson(null);
    setEditing(null);
    setSheet(null);
    setOpenList(null);
    setYan(false);
    setTab(t);
    window.scrollTo({ top: 0 });
  };
  const say = (title: string) =>
    notify({
      title,
      tone: "green",
      icon: <Check size={15} strokeWidth={2.6} />,
    });
  // A section: beside the sidebar on a computer; on a phone the main tabs switch, the rest open as a page (back returns).
  const open = (id: Section) => {
    if (desktop || id === "menu" || id === "team") go(id);
    else {
      haptic("light");
      setSub(id);
    }
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
    open("news");
    requestAnimationFrame(() =>
      document.querySelector<HTMLTextAreaElement>("textarea")?.focus(),
    );
  };

  // Every section once; the computer shows it beside the sidebar, the phone opens it as a page from "More".
  const views: Record<
    Section,
    { title: string; sub: string; art: ArtName; body: React.ReactNode }
  > = {
    menu: {
      title: tr("Menu"),
      sub: tr("Dishes, prices, photos, what guests see"),
      art: "menu",
      body: <MenuAdmin menu={menu} notify={say} />,
    },
    team: {
      title: tr("Team"),
      sub: tr("{a} on shift of {b}", { a: onShift.length, b: team.length }),
      art: "guests",
      body: (
        <>
          <button
            type="button"
            onClick={() => (haptic("light"), setInviting(true))}
            className="blue-grad press mb-5 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold sm:w-auto sm:px-6"
          >
            <UserPlus size={18} strokeWidth={2.2} /> {tr("Invite to the team")}
          </button>

          {/* Who is here, who is not, and who has no access: one filter, then the groups. */}
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
            {(
              [
                ["all", tr("Everyone"), team.length],
                ["on", tr("On shift"), onShift.length],
                ["off", tr("Not on shift"), team.length - onShift.length],
              ] as const
            ).map(([id, label, n]) => (
              <button
                key={id}
                type="button"
                aria-pressed={teamView === id}
                onClick={() => (haptic("tick"), setTeamView(id))}
                className={`press flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold transition-colors ${teamView === id ? "bg-g-ink text-white" : "bg-g-fill text-g-ink-2"}`}
              >
                {label}
                <span
                  className={`tabular-nums ${teamView === id ? "text-white/60" : "text-g-faint"}`}
                >
                  {n}
                </span>
              </button>
            ))}
          </div>
          {(["lead", "hall", "bar", "kitchen"] as Group[]).map((g) => {
            const people = team.filter(
              (p) =>
                groupOf(p) === g &&
                (teamView === "all" ||
                  (teamView === "on" ? p.onShift : !p.onShift)),
            );
            if (!people.length) return null;
            return (
              <section key={g}>
                <SectionTitle
                  title={tr(GROUP_NAMES[g])}
                  count={people.length}
                  className="mt-7 mb-2"
                />
                <div className="card rounded-[24px] p-1">
                  {people.map((p) => (
                    <PersonRow
                      key={p.id}
                      p={p}
                      disabled={offIds.includes(p.id)}
                      onOpen={() => (haptic("light"), setPerson(p.id))}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      ),
    },
    floor: {
      title: tr("Halls and tables"),
      sub: tr("Tables, states, QR codes"),
      art: "tables",
      body: <FloorAdmin floor={floor} menu={menu} notify={say} />,
    },
    orders: {
      title: tr("Orders and bills"),
      sub: tr("Today's bills, refunds, e-invoices"),
      art: "orders",
      body: <OrdersAdmin floor={floor} menu={menu} notify={say} />,
    },
    reports: {
      title: tr("Reports"),
      sub: tr("Takings, dishes, waiters, payments"),
      art: "sales",
      body: <ReportsAdmin floor={floor} menu={menu} notify={say} />,
    },
    shifts: {
      title: tr("Shifts"),
      sub: tr("Today's shift and the week's schedule"),
      art: "shifts",
      body: <ShiftsAdmin team={team} notify={say} />,
    },
    news: {
      title: tr("News and tasks"),
      sub: tr("Mention people with @: only they get it"),
      art: "bell",
      body: (
        <>
          <TasksAdmin team={team} me={ME} notify={say} />
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
        </>
      ),
    },
    checklists: {
      title: tr("Checklists"),
      sub:
        lateN || flaggedN
          ? [
              flaggedN
                ? tr("{n} out of range|{n} out of range", { n: flaggedN })
                : "",
              lateN ? tr("{n} late|{n} late", { n: lateN }) : "",
            ]
              .filter(Boolean)
              .join(" · ")
          : tr("Everyone's lists for this shift"),
      art: "checklist",
      body: (
        <ChecklistsAdmin
          lists={lists}
          runs={runs}
          onOpenRun={setOpenList}
          notify={say}
        />
      ),
    },
    quests: {
      title: tr("Quests"),
      sub: tr("Goals and rewards for the team"),
      art: "trophy",
      body: <QuestsAdmin notify={say} />,
    },
    settings: {
      title: tr("Settings"),
      sub: tr("Venue, payments, devices, plan"),
      art: "wifi",
      body: <SettingsAdmin notify={say} />,
    },
  };
  const MORE: Section[] = [
    "floor",
    "orders",
    "reports",
    "shifts",
    "news",
    "checklists",
    "quests",
    "settings",
  ];
  const sectionPage = (id: Section, inline: boolean) => (
    <div
      className={
        inline
          ? "px-5 pt-[max(20px,env(safe-area-inset-top))] pb-10 lg:px-10 lg:pt-10"
          : "px-5 pt-1 pb-10"
      }
    >
      <PageHead title={views[id].title} sub={views[id].sub} />
      <div className="mt-6">{views[id].body}</div>
    </div>
  );
  const short = (n: number) => compactMoney(n).replace(/(\.\d)\d(M)/, "$1$2");

  return (
    <main className="min-h-dvh overflow-x-hidden bg-white text-g-ink">
      <Island notice={notice} />
      <OfflineBar
        text={tr("No internet · changes are saved and sync when it is back")}
      />
      <div className="lg:pl-[264px]">
        <div
          key={tab}
          className="animate-tab mx-auto max-w-[480px] pb-28 lg:max-w-[1100px] lg:pb-12"
        >
          {tab === "overview" && (
            <>
              {/* The waiter's home header: avatar, venue, theme, bell; takings big; the quick-action strip. */}
              <section className="relative isolate pt-[max(16px,env(safe-area-inset-top))] pb-6 text-white">
                <NorthSky />
                <div className="flex items-center gap-2 px-5">
                  <button
                    aria-label={tr("Profile")}
                    onClick={() => setRoles(true)}
                    className="press relative grid size-10 shrink-0 place-items-center rounded-full bg-[#fff] text-[16px] font-bold text-[#0b0b0f]"
                  >
                    <PersonPic p={me} />
                  </button>
                  <span className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-white/15 px-3.5 text-white lg:mr-auto lg:flex-none">
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
                    aria-label={
                      hidden ? tr("Show amounts") : tr("Hide amounts")
                    }
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
                    onClick={() => open("floor")}
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
                    title={hidden ? "•••" : short(due)}
                    sub={tr("still to pay")}
                  />
                  <StripBig
                    art="checklist"
                    onClick={() => open("checklists")}
                    icon={null}
                    title={`${listDone}/${listTotal}`}
                    sub={
                      flaggedN
                        ? tr("{n} out of range|{n} out of range", {
                            n: flaggedN,
                          })
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

                <div className="lg:grid lg:grid-cols-2 lg:gap-8">
                  <div className="min-w-0">
                    <SectionTitle
                      title={tr("On shift")}
                      count={onShift.length}
                      onAll={() => go("team")}
                    />
                    <OnShiftGrid team={team} onOpen={setPerson} />
                  </div>
                  {news[0] && (
                    <div className="min-w-0">
                      <SectionTitle
                        title={tr("News")}
                        count={news.length}
                        onAll={() => open("news")}
                      />
                      <Post n={news[0]} team={team} known={known} />
                    </div>
                  )}
                </div>

                <div ref={moneyRef} className="scroll-mt-4">
                  <SectionTitle title={tr("Shift money")} />
                  <ShiftMoney history={floor.history} />
                </div>
              </div>
            </>
          )}

          {tab === "more" && (
            <div className="px-5 pt-[max(20px,env(safe-area-inset-top))]">
              <PageHead
                title={tr("More")}
                sub={tr("Everything for running the venue")}
              />
              <Reveal className="mt-6 grid grid-cols-2 gap-3">
                {MORE.map((id, i) => (
                  <SectionTile
                    key={id}
                    art={views[id].art}
                    title={views[id].title}
                    sub={views[id].sub}
                    onClick={() => open(id)}
                    wide={i === 0}
                  />
                ))}
              </Reveal>
              <button
                type="button"
                onClick={() => setRoles(true)}
                className="press mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-g-fill text-[15px] font-semibold"
              >
                <Repeat2 size={17} strokeWidth={2.2} className="text-g-blue" />{" "}
                {tr("Switch role")}
              </button>
            </div>
          )}
          {tab !== "overview" && tab !== "more" && sectionPage(tab, true)}
        </div>
      </div>

      {/* Phones: the waiter's capsule (four tabs), the round "+" for quick actions, Yan above it. Computers: the sidebar. */}
      <TabCapsule
        label={tr("Sections")}
        active={sub ?? tab}
        onPick={(id) => go(id as Tab)}
        items={[
          {
            id: "overview",
            label: tr("Overview"),
            icon: LayoutDashboard,
            badge: attention.length,
          },
          { id: "menu", label: tr("Menu"), icon: UtensilsCrossed },
          { id: "team", label: tr("Team"), icon: Users },
          { id: "more", label: tr("More"), icon: LayoutGrid, badge: flaggedN },
        ]}
        action={{
          icon: Plus,
          label: tr("Quick actions"),
          onClick: () => (haptic("light"), setQuick(true)),
        }}
        yan={
          <button
            type="button"
            aria-label={tr("Ask Yan")}
            onClick={() => (haptic("light"), setYan(true))}
            className="press grid place-items-center rounded-full shadow-[0_8px_24px_-8px_rgba(47,91,255,0.55)] ring-4 ring-[var(--g-bg)]"
          >
            <YanOrb size={44} />
          </button>
        }
      />
      <Sidebar
        active={tab}
        onPick={(id) => go(id as Tab)}
        head={
          <button
            type="button"
            onClick={() => setRoles(true)}
            className="press flex w-full items-center gap-3 rounded-full p-1.5 text-left"
          >
            <span className="blue-grad relative grid size-10 shrink-0 place-items-center rounded-full text-[16px] font-bold">
              <PersonPic p={me} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-bold">
                Samarkand
              </span>
              <span className="block truncate text-[12.5px] text-g-muted">
                @{me.handle} · {tr("Admin")}
              </span>
            </span>
          </button>
        }
        groups={[
          {
            items: [
              {
                id: "overview",
                label: tr("Overview"),
                icon: LayoutDashboard,
                badge: attention.length,
              },
              { id: "orders", label: tr("Orders and bills"), icon: Receipt },
              { id: "floor", label: tr("Halls and tables"), icon: LayoutGrid },
            ],
          },
          {
            title: tr("Menu"),
            items: [{ id: "menu", label: tr("Menu"), icon: UtensilsCrossed }],
          },
          {
            title: tr("People"),
            items: [
              { id: "team", label: tr("Team"), icon: Users },
              { id: "shifts", label: tr("Shifts"), icon: CalendarDays },
              { id: "news", label: tr("News"), icon: Megaphone },
              {
                id: "checklists",
                label: tr("Checklists"),
                icon: ClipboardCheck,
                badge: flaggedN,
              },
              { id: "quests", label: tr("Quests"), icon: Trophy },
            ],
          },
          {
            title: tr("Business"),
            items: [
              { id: "reports", label: tr("Reports"), icon: BarChart3 },
              { id: "settings", label: tr("Settings"), icon: Settings2 },
            ],
          },
        ]}
        foot={
          <div className="flex items-center gap-2">
            <ThemeToggle
              dark={scheme.dark}
              onToggle={scheme.toggle}
              label={tr("Light or dark theme")}
              look="plain"
            />
            <button
              type="button"
              onClick={() => (haptic("light"), setYan(true))}
              className="press flex h-10 flex-1 items-center gap-2 rounded-full bg-g-card px-1.5 pr-4 text-[14px] font-semibold"
            >
              <YanOrb size={30} /> {tr("Ask Yan")}
            </button>
          </div>
        }
      />
      {sub && (
        <Sheet
          open
          wide
          onClose={() => setSub(null)}
          label={views[sub].title}
          title={false}
        >
          {sectionPage(sub, false)}
        </Sheet>
      )}
      {roles && <RoleSwitch current="hq" onClose={() => setRoles(false)} />}
      {quick && (
        <QuickSheet
          onClose={() => setQuick(false)}
          onPick={(k) => {
            setQuick(false);
            if (k === "news") setTimeout(compose, 60);
            else if (k === "invite") setTimeout(() => setInviting(true), 60);
            else setTimeout(() => open(k), 60);
          }}
        />
      )}
      {inviting && (
        <InviteSheet
          onClose={() => setInviting(false)}
          onSent={(n) => (
            setInviting(false),
            say(tr("Invite sent to {name}", { name: n }))
          )}
        />
      )}

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
      {person && team.some((x) => x.id === person) && (
        <PersonPage
          p={team.find((x) => x.id === person)!}
          self={person === ME}
          disabled={offIds.includes(person)}
          onClose={() => setPerson(null)}
          onEdit={() => setEditing(person)}
          onWrite={() => {
            const h = team.find((x) => x.id === person)!.handle;
            setPerson(null);
            setDraft(`@${h} `);
            compose();
          }}
        />
      )}
      {editing && team.some((x) => x.id === editing) && (
        <PersonEdit
          p={team.find((x) => x.id === editing)!}
          disabled={offIds.includes(editing)}
          onClose={() => setEditing(null)}
          onChange={(np) =>
            setTeam((t) => t.map((x) => (x.id === np.id ? np : x)))
          }
          onDisabled={(off) => {
            setOffIds((ids) =>
              off ? [...ids, editing] : ids.filter((x) => x !== editing),
            );
            say(off ? tr("Access is off") : tr("Access is back"));
          }}
          onRemove={() => {
            const gone = team.find((x) => x.id === editing)!;
            setEditing(null);
            setPerson(null);
            setTeam((t) => t.filter((x) => x.id !== gone.id));
            say(tr("{n} removed from the team", { n: gone.name }));
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
      <PersonPic p={p} />
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
/** True on computers and big tablets (the sidebar layout, from 1024 px). */
function useDesktop() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const set = () => setOn(mq.matches);
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  }, []);
  return on;
}

/** The "+" on phones: the five things an admin starts most often. */
function QuickSheet({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (k: "news" | "menu" | "invite" | "quests" | "floor") => void;
}) {
  const tr = useTr();
  const rows: {
    k: "news" | "menu" | "invite" | "quests" | "floor";
    art: ArtName;
    title: string;
    sub: string;
  }[] = [
    {
      k: "news",
      art: "bell",
      title: tr("Write news"),
      sub: tr("@mention people or a station"),
    },
    {
      k: "menu",
      art: "menu",
      title: tr("Add a dish"),
      sub: tr("With Yan, from a photo"),
    },
    {
      k: "invite",
      art: "guests",
      title: tr("Invite to the team"),
      sub: tr("A link, a QR or by phone"),
    },
    {
      k: "quests",
      art: "trophy",
      title: tr("New quest"),
      sub: tr("A goal and a reward for the team"),
    },
    {
      k: "floor",
      art: "tables",
      title: tr("Print QR codes"),
      sub: tr("Cards for every table"),
    },
  ];
  return (
    <Sheet open onClose={onClose} label={tr("Quick actions")} title={false}>
      <div className="px-5 pt-1 pb-10">
        <h2 className="text-[30px] leading-tight font-bold tracking-[-0.025em]">
          {tr("Quick actions")}
        </h2>
        <div className="mt-6 grid gap-2">
          {rows.map((r) => (
            <button
              key={r.k}
              type="button"
              onClick={() => (haptic("light"), onPick(r.k))}
              className="press flex items-center gap-3 rounded-full bg-g-fill p-2 pr-4 text-left"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-g-card">
                <ArtTile name={r.art} size={34} bare />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[16px] font-semibold">
                  {r.title}
                </span>
                <span className="block truncate text-[13px] text-g-muted">
                  {r.sub}
                </span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-g-faint" />
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

/** Invite: the team link and QR, or a phone number and a role. The person joins via join.html. */
function InviteSheet({
  onClose,
  onSent,
}: {
  onClose: () => void;
  onSent: (name: string) => void;
}) {
  const tr = useTr();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState(["Waiter"]);
  const link = "https://yanyin.app/join/samarkand-8F2K";
  const ok = name.trim().length > 1 && phone.replace(/\D/g, "").length >= 9;
  return (
    <Sheet
      open
      onClose={onClose}
      label={tr("Invite to the team")}
      title={false}
      footer={
        <button
          type="button"
          disabled={!ok}
          onClick={() => (haptic("success"), onSent(name.trim()))}
          className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold transition-opacity disabled:opacity-40"
        >
          {tr("Send the invite")}
        </button>
      }
    >
      <div className="grid gap-5 px-5 pt-1 pb-10">
        <h2 className="text-[30px] leading-tight font-bold tracking-[-0.025em]">
          {tr("Invite to the team")}
        </h2>
        <a
          href="join.html"
          className="card press flex items-center gap-4 rounded-[26px] p-4"
        >
          <BrandQr value={link} size={104} label={tr("Invite QR code")} />
          <span className="min-w-0">
            <span className="block text-[16px] font-bold">
              {tr("One link for the whole team")}
            </span>
            <span className="mt-0.5 block text-[13px] leading-snug text-g-muted">
              {tr(
                "They scan it, sign in and pick their @ID. Tap to see what they see.",
              )}
            </span>
          </span>
        </a>
        <p className="px-1 text-[14px] font-semibold text-g-ink-2">
          {tr("Or invite by phone")}
        </p>
        <div className="-mt-3 grid gap-2">
          <TextField value={name} onChange={setName} placeholder={tr("Name")} />
          <TextField
            value={phone}
            onChange={(v) => setPhone(v.replace(/[^\d ]/g, ""))}
            prefix="+84"
            placeholder="905 000 000"
            type="tel"
            inputMode="tel"
          />
          <Choice
            value={role}
            onChange={setRole}
            options={["Waiter", "Bartender", "Cook", "Host", "Manager"].map(
              (r) => ({ id: r, label: tr(r) }),
            )}
          />
        </div>
      </div>
    </Sheet>
  );
}
