"use client";

import { AlertTriangle, Ban, Camera, Check, ChevronRight, ClipboardCheck, Clock, LayoutDashboard, Megaphone, Send, Thermometer, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { checklistProgress, recipientsOf, ROLE_PERMISSIONS, type ChecklistRun, type ChecklistTemplate, type Menu, type Permission, type Person, type StaffRole, type Station } from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import { demoFloor, ticketTotal } from "@/lib/demo-floor";
import { BAR_CHECKLIST, BAR_RUN, demoKitchen, KITCHEN_CHECKLIST, KITCHEN_RUN } from "@/lib/demo-kitchen";
import { CHECKLIST_OWNER, TEAM, WAITER_CHECKLIST, WAITER_RUN } from "@/lib/demo-team";
import { postNews, useNews } from "@/lib/news";
import { useStopList } from "@/lib/stoplist";
import { Island, type IslandNotice } from "@/components/guest/motion";
import { Sheet } from "@/components/guest/ui";
import { ArtScene } from "@/components/system/Art";
import { MentionInput, MentionText } from "@/components/system/MentionInput";
import { NorthSky } from "@/components/system/NorthSky";
import { useScheme } from "@/components/system/scheme";
import { ThemeToggle } from "@/components/system/ThemeToggle";
import { ChecklistPage } from "@/components/crew/Checklist";
import { compactMoney, ShiftMoney } from "@/components/crew/CrewApp";
import { CrewPrefsProvider, useTr } from "@/components/crew/prefs";

/*
 * yanyin.hq: the owner's and admin's console, phone first. Four sections:
 * Overview (today's money, the hall, the till, the kitchen, the stop-list
 * and what needs attention), Team (roles, stations, @IDs), News (messages
 * with @mentions that reach only the people mentioned) and Checklists
 * (everyone's progress, late items, values out of range).
 */

type Tab = "overview" | "team" | "news" | "checklists";
const ME = "staff-huong";
const NOW = "12:45";
const ROLE_NAMES: Record<StaffRole, string> = { owner: "Owner", admin: "Admin", manager: "Manager", waiter: "Waiter", bartender: "Bartender", cook: "Cook", host: "Host", runner: "Runner", accountant: "Accountant" };
const STATION_NAMES: Record<Station, string> = { hall: "Hall", bar: "Bar", hot: "Hot kitchen", cold: "Cold kitchen", grill: "Grill", pastry: "Pastry", hookah: "Hookah" };
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
  const [team, setTeam] = useState<Person[]>(TEAM);
  const [person, setPerson] = useState<Person | null>(null);
  const [draft, setDraft] = useState("");
  const [runs, setRuns] = useState<Record<string, ChecklistRun>>({ waiter: { ...WAITER_RUN, marks: { ...WAITER_RUN.marks, fridge: { at: "11:20", by: "staff-linh", value: "7" } } }, bar: BAR_RUN, kitchen: KITCHEN_RUN });
  const [openList, setOpenList] = useState<string | null>(null);
  const [notice, setNotice] = useState<IslandNotice | null>(null);
  const floor = useMemo(() => demoFloor(menu), [menu]);
  const kitchen = useMemo(() => demoKitchen(menu), [menu]);
  const stop = useStopList();
  const news = useNews();

  const notify = (n: IslandNotice) => {
    setNotice(n);
    setTimeout(() => setNotice((c) => (c === n ? null : c)), 2800);
  };
  const go = (t: Tab) => {
    haptic("light");
    setTab(t);
    window.scrollTo({ top: 0 });
  };

  // Today at a glance.
  const busy = floor.tables.filter((t) => t.status !== "free" && t.status !== "reserved");
  const due = busy.reduce((n, t) => n + Math.round(ticketTotal(t.lines) * 1.05), 0);
  const takings = floor.history.reduce((n, o) => n + Math.round(o.subtotal * 1.05), 0);
  const inWork = kitchen.orders.reduce((n, o) => n + o.lines.filter((l) => l.state !== "ready").reduce((q, l) => q + l.qty, 0), 0);
  const oldest = kitchen.orders.filter((o) => o.lines.some((l) => l.state !== "ready")).map((o) => o.at).sort()[0];
  const waitMin = oldest ? (12 * 60 + 45) - (Number(oldest.slice(0, 2)) * 60 + Number(oldest.slice(3))) : 0;
  const lists: { key: string; tpl: ChecklistTemplate; who: string }[] = [
    { key: "waiter", tpl: WAITER_CHECKLIST, who: "@linh" },
    { key: "bar", tpl: BAR_CHECKLIST, who: "@thao_bar · @an_bar" },
    { key: "kitchen", tpl: KITCHEN_CHECKLIST, who: "@chef_dima" },
  ];
  const progress = lists.map((l) => ({ ...l, p: checklistProgress(l.tpl, runs[l.key]!, NOW) }));
  const stopped = menu.categories.flatMap((c) => c.items).filter((i) => stop.includes(i.id));

  // What needs the admin now, most urgent first.
  const attention: { id: string; icon: React.ReactNode; tone: "red" | "orange"; title: string; sub: string; go: Tab | "list"; list?: string }[] = [
    ...progress.flatMap((l) =>
      l.p.flagged.map((it) => ({ id: `f-${l.key}-${it.id}`, icon: <Thermometer size={18} strokeWidth={2.2} />, tone: "red" as const, title: `${tr(it.title)}: ${runs[l.key]!.marks[it.id]!.value} ${it.proof?.kind === "number" ? it.proof.unit : ""}`, sub: `${tr("Out of range")} · ${l.who}`, go: "list" as const, list: l.key })),
    ),
    ...(waitMin >= 15 ? [{ id: "kds", icon: <Clock size={18} strokeWidth={2.2} />, tone: "red" as const, title: tr("A table has waited {n} min for the kitchen", { n: waitMin }), sub: tr("Station screen: hot kitchen"), go: "overview" as const }] : []),
    ...progress.flatMap((l) => (l.p.late.length ? [{ id: `l-${l.key}`, icon: <ClipboardCheck size={18} strokeWidth={2.2} />, tone: "orange" as const, title: tr("{n} late|{n} late", { n: l.p.late.length }) + ` · ${tr(l.tpl.title)}`, sub: l.who, go: "list" as const, list: l.key }] : [])),
    ...(stopped.length ? [{ id: "stop", icon: <Ban size={18} strokeWidth={2.2} />, tone: "orange" as const, title: tr("{n} dish ran out|{n} dishes ran out", { n: stopped.length }), sub: tr("Hidden from guests and waiters"), go: "overview" as const }] : []),
  ];

  const known = (h: string) => team.some((p) => p.handle === h);
  const recipients = recipientsOf(draft, team);
  const send = () => {
    if (!draft.trim() || !recipients.length) return;
    haptic("success");
    postNews({ by: ME, text: draft.trim(), at: NOW, to: recipients, read: [] });
    notify({ title: tr("Sent to {n} person|Sent to {n} people", { n: recipients.length }), tone: "green", icon: <Send size={15} strokeWidth={2.4} /> });
    setDraft("");
  };
  const groups = [
    { handle: "all", label: tr("Everyone on shift"), count: team.filter((p) => p.onShift && p.id !== ME).length },
    { handle: "bar", label: tr("Bar"), count: team.filter((p) => p.onShift && p.stations.includes("bar")).length },
    { handle: "kitchen", label: tr("Kitchen"), count: team.filter((p) => p.onShift && p.stations.includes("hot")).length },
    { handle: "hall", label: tr("Hall"), count: team.filter((p) => p.onShift && p.stations.includes("hall")).length },
  ];
  const roleLabel = (p: Person) => p.roles.map((r) => tr(ROLE_NAMES[r])).join(", ");

  return (
    <main className="min-h-dvh overflow-x-hidden bg-g-bg pb-28 text-g-ink">
      <Island notice={notice} />
      {/* Sky header: who is looking, today's takings. */}
      <section className="relative isolate pt-[max(16px,env(safe-area-inset-top))] pb-7 text-white">
        <NorthSky />
        <div className="mx-auto max-w-[720px] px-5">
          <div className="flex items-center gap-2">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#fff] text-[16px] font-bold text-[#0b0b0f]">H</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold">Samarkand · Da Nang</span>
              <span className="block truncate text-[12.5px] text-white/70">@huong · {tr("Admin")}</span>
            </span>
            <ThemeToggle dark={scheme.dark} onToggle={scheme.toggle} label={tr("Light or dark theme")} />
          </div>
          {tab === "overview" ? (
            <>
              <p className="mt-8 flex items-center gap-1.5 text-[14px] text-white/75">
                <span className="size-1.5 rounded-full bg-[#5ce0a0]" /> {tr("Taken today")} · {NOW}
              </p>
              <p className="mt-1 text-[34px] leading-tight font-bold tracking-[-0.03em] tabular-nums">{compactMoney(takings + due)}</p>
              <p className="text-[13px] text-white/70">{tr("Paid {a} · still to pay {b}", { a: compactMoney(takings), b: compactMoney(due) })}</p>
            </>
          ) : (
            // Other sections: their title lives in the sky.
            <>
              <h1 className="mt-8 text-[32px] leading-tight font-bold tracking-[-0.025em]">{tr(tab === "team" ? "Team" : tab === "news" ? "News" : "Checklists")}</h1>
              <p className="mt-1 text-[14px] text-white/75">
                {tab === "team" ? tr("{a} on shift of {b}", { a: team.filter((p) => p.onShift).length, b: team.length }) : tab === "news" ? tr("Mention people with @: only they get it") : tr("Everyone's lists for this shift")}
              </p>
            </>
          )}
        </div>
      </section>

      {/* Above the sky's soft lower edge, so the first rows are never washed out. */}
      <div className="relative z-10 mx-auto max-w-[720px] px-5">
        {tab === "overview" && (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Tile art="tables" title={tr("Hall")} value={`${busy.length}/${floor.tables.length}`} sub={tr("{n} table wants the bill|{n} tables want the bill", { n: floor.tables.filter((t) => t.status === "bill").length })} hot />
              <Tile art="check" title={tr("Till")} value={compactMoney(due).replace(/(\.\d)\d(M)/, "$1$2")} sub={tr("still to pay")} />
              <Tile art="kitchen" title={tr("Kitchen")} value={String(inWork)} sub={waitMin ? tr("longest {n} min", { n: waitMin }) : tr("all calm")} hot={waitMin >= 15} />
              <Tile art="checklist" title={tr("Checklists")} value={`${progress.reduce((n, l) => n + l.p.done, 0)}/${progress.reduce((n, l) => n + l.p.total, 0)}`} sub={tr("{n} late|{n} late", { n: progress.reduce((n, l) => n + l.p.late.length, 0) })} onClick={() => go("checklists")} />
            </div>

            <h2 className="mt-8 text-[22px] font-bold tracking-[-0.02em]">{tr("Needs attention")}</h2>
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-2">
              {attention.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    if (a.go === "list") {
                      setTab("checklists");
                      setOpenList(a.list ?? null);
                    } else go(a.go);
                  }}
                  className="press flex items-center gap-3 rounded-full bg-g-fill p-1.5 pr-4 text-left"
                >
                  <span className={`grid size-11 shrink-0 place-items-center rounded-full text-white ${a.tone === "red" ? "bg-[#ef4444]" : "bg-g-orange"}`}>{a.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{a.title}</span>
                    <span className="block truncate text-[12.5px] text-g-muted">{a.sub}</span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-g-faint" />
                </button>
              ))}
              {!attention.length && <p className="rounded-[20px] bg-g-fill px-4 py-3.5 text-[14px] text-g-muted">{tr("Nothing needs you right now")}</p>}
            </div>

            {stopped.length > 0 && (
              <>
                <h2 className="mt-8 text-[22px] font-bold tracking-[-0.02em]">{tr("Stop-list")}</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {stopped.map((i) => (
                    <span key={i.id} className="rounded-full bg-[#ef4444]/12 px-3.5 py-2 text-[14px] font-semibold text-[#ef4444]">
                      {i.name.ru ?? i.name.en}
                    </span>
                  ))}
                </div>
              </>
            )}

            <h2 className="mt-8 mb-3 text-[22px] font-bold tracking-[-0.02em]">{tr("Shift money")}</h2>
            <ShiftMoney history={floor.history} />
          </>
        )}

        {tab === "team" && (
          <>
            <div className="mt-5 divide-y divide-g-line rounded-[24px] bg-g-fill px-4">
              {team.map((p) => (
                <button key={p.id} onClick={() => setPerson(p)} className="press flex w-full items-center gap-3 py-3 text-left">
                  <Avatar p={p} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[16px] font-semibold">
                      {p.name} <span className="font-normal text-g-muted">@{p.handle}</span>
                    </span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {p.roles.map((r) => (
                        <span key={r} className="rounded-full bg-g-card px-2 py-0.5 text-[12px] font-semibold text-g-ink-2">
                          {tr(ROLE_NAMES[r])}
                        </span>
                      ))}
                      {p.stations.map((s) => (
                        <span key={s} className="rounded-full bg-g-tint-blue px-2 py-0.5 text-[12px] font-semibold text-g-blue">
                          {tr(STATION_NAMES[s])}
                        </span>
                      ))}
                    </span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-g-faint" />
                </button>
              ))}
            </div>
          </>
        )}

        {tab === "news" && (
          <>
            <div className="mt-5">
              <MentionInput value={draft} onChange={setDraft} people={team.filter((p) => p.id !== ME)} groups={groups} placeholder={tr("@linh please check table 7 · @bar new syrups at 14:00")} roleLabel={roleLabel} />
              <div className="mt-3 flex items-center gap-3">
                <p className="min-w-0 flex-1 truncate text-[13px] text-g-muted">
                  {recipients.length
                    ? `${tr("Goes to")}: ${recipients.map((id) => `@${team.find((p) => p.id === id)?.handle}`).join(", ")}`
                    : tr("Add @someone, @bar, @kitchen or @all")}
                </p>
                <button disabled={!draft.trim() || !recipients.length} onClick={send} className="blue-grad press flex h-12 shrink-0 items-center gap-2 rounded-full px-5 text-[15px] font-semibold disabled:opacity-40">
                  <Send size={17} strokeWidth={2.2} /> {tr("Send")}
                </button>
              </div>
            </div>
            <div className="mt-6 grid gap-3">
              {news.map((n) => {
                const by = team.find((p) => p.id === n.by);
                return (
                  <article key={n.id} className="rounded-[22px] bg-g-fill p-4">
                    <p className="flex items-center justify-between gap-2 text-[13px] text-g-muted">
                      <span className="font-semibold text-g-ink-2">@{by?.handle}</span>
                      <span className="tabular-nums">{n.at}</span>
                    </p>
                    <p className="mt-1.5 text-[15.5px] leading-relaxed">
                      <MentionText text={n.text} known={known} />
                    </p>
                    <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-g-muted">
                      <Check size={14} strokeWidth={2.4} className={n.read.length === n.to.length ? "text-g-green" : ""} />
                      {tr("Read by {a} of {b}", { a: n.read.length, b: n.to.length })}
                    </p>
                  </article>
                );
              })}
            </div>
          </>
        )}

        {tab === "checklists" && (
          <>
            <div className="mt-5 grid gap-3">
              {progress.map((l) => (
                <button key={l.key} onClick={() => setOpenList(l.key)} className="press rounded-[24px] bg-g-fill p-4 text-left">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate text-[17px] font-semibold">{tr(l.tpl.title)}</span>
                      <span className="block truncate text-[13px] text-g-muted">{l.who}</span>
                    </span>
                    <span className="shrink-0 text-[20px] font-bold tabular-nums">
                      {l.p.done}/{l.p.total}
                    </span>
                  </span>
                  <span className="mt-3 block h-2 overflow-hidden rounded-full bg-g-card">
                    <span className="block h-full rounded-full bg-g-green" style={{ width: `${l.p.percent}%` }} />
                  </span>
                  <span className="mt-2.5 flex flex-wrap gap-2 text-[12.5px] font-semibold">
                    {l.p.late.length > 0 && (
                      <span className="flex items-center gap-1 text-g-orange">
                        <Clock size={13} strokeWidth={2.4} /> {tr("{n} late|{n} late", { n: l.p.late.length })}
                      </span>
                    )}
                    {l.p.flagged.length > 0 && (
                      <span className="flex items-center gap-1 text-[#ef4444]">
                        <AlertTriangle size={13} strokeWidth={2.4} /> {tr("{n} out of range|{n} out of range", { n: l.p.flagged.length })}
                      </span>
                    )}
                    {Object.values(runs[l.key]!.marks).some((m) => m.value === "photo") && (
                      <span className="flex items-center gap-1 text-g-muted">
                        <Camera size={13} strokeWidth={2.4} /> {tr("photo attached")}
                      </span>
                    )}
                    {!l.p.late.length && !l.p.flagged.length && <span className="text-g-green">{tr("On track")}</span>}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Tab bar: four sections in the same floating capsule as the waiter app. */}
      <nav aria-label={tr("Sections")} className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(10px,env(safe-area-inset-bottom))]">
        <div className="relative mx-auto grid h-[56px] max-w-[460px] grid-cols-4 rounded-full bg-white/95 p-1 ring-1 ring-black/5">
          <span aria-hidden className="absolute top-1 bottom-1 left-1 rounded-full bg-g-fill transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]" style={{ width: "calc((100% - 8px) / 4)", transform: `translateX(${["overview", "team", "news", "checklists"].indexOf(tab) * 100}%)` }} />
          {(
            [
              ["overview", tr("Overview"), LayoutDashboard],
              ["team", tr("Team"), Users],
              ["news", tr("News"), Megaphone],
              ["checklists", tr("Checklists"), ClipboardCheck],
            ] as const
          ).map(([id, label, Icon]) => (
            <button key={id} onClick={() => go(id)} aria-current={tab === id ? "page" : undefined} className={`relative z-10 flex flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-semibold transition-colors ${tab === id ? "text-g-ink" : "text-g-faint"}`}>
              <Icon size={19} strokeWidth={2} />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {person && (
        <PersonSheet
          p={team.find((x) => x.id === person.id)!}
          onClose={() => setPerson(null)}
          onChange={(np) => setTeam((t) => t.map((x) => (x.id === np.id ? np : x)))}
          onWrite={(h) => {
            setPerson(null);
            setDraft(`@${h} `);
            go("news");
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
    </main>
  );
}

function Avatar({ p, size = 44, onFill = true }: { p: Person; size?: number; onFill?: boolean }) {
  return (
    <span className={`relative grid shrink-0 place-items-center rounded-full font-bold ${onFill ? "bg-g-card" : "blue-grad"}`} style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {p.name.slice(0, 1)}
      {p.onShift && <span className="absolute -right-0.5 -bottom-0.5 size-3.5 rounded-full border-2 border-g-fill bg-[#22c55e]" />}
    </span>
  );
}

function Tile({ art, title, value, sub, hot, onClick }: { art: "tables" | "check" | "kitchen" | "checklist"; title: string; value: string; sub: string; hot?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} className={`press block text-left ${onClick ? "" : "cursor-default"}`}>
      <ArtScene name={art} layout="row" focal={42} className="h-full rounded-[24px] p-4" footer={<p className={`mt-3 truncate text-[12.5px] ${hot ? "font-semibold text-g-orange" : "text-g-muted"}`}>{sub}</p>}>
        <p className="truncate text-[14px] leading-tight font-semibold text-g-ink-2">{title}</p>
        <p className={`mt-1 leading-none font-bold tracking-[-0.03em] whitespace-nowrap tabular-nums ${value.length > 5 ? "text-[19px]" : "text-[26px]"}`}>{value}</p>
      </ArtScene>
    </button>
  );
}

/** One person: @ID, roles and stations (tap to switch), what they can do, write to them. */
function PersonSheet({ p, onClose, onChange, onWrite }: { p: Person; onClose: () => void; onChange: (p: Person) => void; onWrite: (handle: string) => void }) {
  const tr = useTr();
  const perms = [...new Set(p.roles.flatMap((r) => ROLE_PERMISSIONS[r]))];
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  return (
    <Sheet
      open
      onClose={onClose}
      label={p.name}
      title={false}
      footer={
        <button onClick={() => onWrite(p.handle)} className="blue-grad press flex h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-semibold">
          <Send size={18} strokeWidth={2.2} /> {tr("Write to @{h}", { h: p.handle })}
        </button>
      }
    >
      <div className="px-5 pt-1 pb-10">
        <div className="flex items-center gap-4">
          <Avatar p={p} size={64} onFill={false} />
          <span className="min-w-0">
            <span className="block text-[26px] leading-tight font-bold tracking-[-0.02em]">{p.name}</span>
            <span className="block text-[15px] text-g-blue">@{p.handle}</span>
            <span className="block text-[13px] text-g-muted">{p.onShift ? tr("On shift now") : tr("Off today")}</span>
          </span>
        </div>
        <h3 className="mt-7 text-[12px] font-semibold tracking-[0.06em] text-g-muted uppercase">{tr("Roles")}</h3>
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
                className={`press h-10 rounded-full px-4 text-[14px] font-semibold ${on ? "bg-g-ink text-white" : "bg-g-fill text-g-ink-2"}`}
              >
                {tr(ROLE_NAMES[r])}
              </button>
            );
          })}
        </div>
        <h3 className="mt-6 text-[12px] font-semibold tracking-[0.06em] text-g-muted uppercase">{tr("Stations")}</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["hall", "bar", "hot", "cold", "grill", "pastry", "hookah"] as Station[]).map((s) => {
            const on = p.stations.includes(s);
            return (
              <button
                key={s}
                onClick={() => {
                  haptic("tick");
                  onChange({ ...p, stations: toggle(p.stations, s) });
                }}
                aria-pressed={on}
                className={`press h-10 rounded-full px-4 text-[14px] font-semibold ${on ? "bg-g-blue text-white" : "bg-g-fill text-g-ink-2"}`}
              >
                {tr(STATION_NAMES[s])}
              </button>
            );
          })}
        </div>
        <h3 className="mt-6 text-[12px] font-semibold tracking-[0.06em] text-g-muted uppercase">{tr("Can")}</h3>
        <div className="mt-2 divide-y divide-g-line rounded-[20px] bg-g-fill px-4">
          {perms.map((pm) => (
            <p key={pm} className="flex items-center gap-2.5 py-2.5 text-[14.5px]">
              <Check size={16} strokeWidth={2.6} className="shrink-0 text-g-green" /> {tr(PERM_NAMES[pm])}
            </p>
          ))}
        </div>
        <p className="mt-3 text-[12.5px] text-g-muted">{tr("Rights add up across roles and are checked on the server.")}</p>
      </div>
    </Sheet>
  );
}
