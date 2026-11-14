"use client";

import { Activity, BarChart3, Building2, Check, CircleDollarSign, Flag, LayoutDashboard, LifeBuoy, LogIn, ScrollText, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { haptic } from "@/lib/haptics";
import { createStore } from "@/lib/store";
import { Island, type IslandNotice } from "@/components/guest/motion";
import { Sheet } from "@/components/guest/ui";
import { YanOrb } from "@/components/guest/YanSheet";
import { ArtScene } from "@/components/system/Art";
import { NorthSky } from "@/components/system/NorthSky";
import { useScheme } from "@/components/system/scheme";
import { ThemeToggle } from "@/components/system/ThemeToggle";
import { DataTable, EmptyState, Group, ListRow, OfflineBar, Row, Sidebar, Switch, TabCapsule, Toolbar } from "@/components/system/Kit";
import { DaysCompareWidget, IconStat } from "@/components/system/Widgets";
import { compactMoney } from "@/components/crew/CrewApp";
import { CrewPrefsProvider, useLocale, useTr } from "@/components/crew/prefs";
import { RoleSwitch } from "@/components/auth/RoleSwitch";

/*
 * yanyin.core: the founder's console (docs/09, wave 4), computer first. The
 * platform at a glance (MRR, venues, GMV, Yan's cost), every venue with its
 * plan and health and a way in as that venue for support, subscriptions and
 * invoices, Yan's usage per venue with limits, features by plan, support
 * tickets and the action journal. Same kit as the venue console.
 */

type Section = "overview" | "venues" | "billing" | "ai" | "flags" | "support" | "journal";
type Venue = { id: string; name: string; city: string; country: string; plan: "Free" | "Starter" | "Pro" | "Ultimate"; status: "live" | "trial" | "setup" | "paused"; mrr: number; gmv: number; ai: number; active: string; staff: number };

const VENUES: Venue[] = [
  { id: "samarkand", name: "Samarkand", city: "Da Nang", country: "VN", plan: "Pro", status: "live", mrr: 1_490_000, gmv: 322_500_000, ai: 410_000, active: "now", staff: 9 },
  { id: "zabey", name: "Zabey Community", city: "Da Nang", country: "VN", plan: "Pro", status: "live", mrr: 1_490_000, gmv: 211_800_000, ai: 265_000, active: "now", staff: 7 },
  { id: "pho-an", name: "Phở An", city: "Da Nang", country: "VN", plan: "Starter", status: "trial", mrr: 0, gmv: 48_200_000, ai: 52_000, active: "12 min ago", staff: 4 },
  { id: "the-deck", name: "The Deck", city: "Hoi An", country: "VN", plan: "Ultimate", status: "setup", mrr: 0, gmv: 0, ai: 18_000, active: "yesterday", staff: 2 },
  { id: "chaikhana", name: "Chaikhana No.1", city: "Tashkent", country: "UZ", plan: "Free", status: "live", mrr: 0, gmv: 0, ai: 4_000, active: "3 days ago", staff: 1 },
];
const flagStore = createStore<Record<string, Record<string, boolean>>>("yanyin:flags", {
  roulette: { Free: false, Starter: true, Pro: true, Ultimate: true },
  quests: { Free: false, Starter: false, Pro: true, Ultimate: true },
  yanGuest: { Free: false, Starter: false, Pro: true, Ultimate: true },
  yanManager: { Free: false, Starter: false, Pro: false, Ultimate: true },
  einvoice: { Free: false, Starter: true, Pro: true, Ultimate: true },
  multiVenue: { Free: false, Starter: false, Pro: false, Ultimate: true },
});
const FLAG_NAMES: Record<string, string> = { roulette: "Food Roulette and Mystery dish", quests: "Quests, XP and badges", yanGuest: "Yan for guests", yanManager: "Yan for the manager", einvoice: "E-invoices", multiVenue: "Several venues" };
const PLANS = ["Free", "Starter", "Pro", "Ultimate"] as const;

export function CoreApp() {
  return (
    <CrewPrefsProvider>
      <Core />
    </CrewPrefsProvider>
  );
}

function Core() {
  const tr = useTr();
  const scheme = useScheme();
  const [sec, setSec] = useState<Section>("overview");
  const [venue, setVenue] = useState<string | null>(null);
  const [roles, setRoles] = useState(false);
  const [notice, setNotice] = useState<IslandNotice | null>(null);
  useEffect(() => {
    document.documentElement.dataset.console = "1";
    return () => {
      delete document.documentElement.dataset.console;
    };
  }, []);
  const say = (title: string) => {
    const n: IslandNotice = { title, tone: "green", icon: <Check size={15} strokeWidth={2.6} /> };
    setNotice(n);
    setTimeout(() => setNotice((c) => (c === n ? null : c)), 2600);
  };
  const go = (s: Section) => {
    haptic("light");
    setRoles(false);
    setVenue(null);
    setSec(s);
    window.scrollTo({ top: 0 });
  };
  const mrr = VENUES.reduce((n, v) => n + v.mrr, 0);
  const gmv = VENUES.reduce((n, v) => n + v.gmv, 0);
  const ai = VENUES.reduce((n, v) => n + v.ai, 0);
  const titles: Record<Section, [string, string]> = {
    overview: [tr("Platform"), tr("All venues, money and Yan at a glance")],
    venues: [tr("Venues"), tr("{n} venues · {live} live", { n: VENUES.length, live: VENUES.filter((v) => v.status === "live").length })],
    billing: [tr("Subscriptions"), tr("Plans, trials, invoices")],
    ai: [tr("Yan's usage"), tr("Requests, cost and limits per venue")],
    flags: [tr("Features"), tr("What each plan includes")],
    support: [tr("Support"), tr("Questions from venues")],
    journal: [tr("Journal"), tr("Who did what on the platform")],
  };
  const nav = [
    { id: "overview", label: tr("Overview"), icon: LayoutDashboard },
    { id: "venues", label: tr("Venues"), icon: Building2 },
    { id: "billing", label: tr("Subscriptions"), icon: CircleDollarSign },
    { id: "ai", label: tr("Yan's usage"), icon: Sparkles },
    { id: "flags", label: tr("Features"), icon: Flag },
    { id: "support", label: tr("Support"), icon: LifeBuoy, badge: 2 },
    { id: "journal", label: tr("Journal"), icon: ScrollText },
  ];

  return (
    <main className="min-h-dvh overflow-x-hidden bg-white pb-28 text-g-ink lg:pb-12">
      <Island notice={notice} />
      <OfflineBar text={tr("No internet · changes are saved and sync when it is back")} />
      <Sidebar
        active={sec}
        onPick={(id) => go(id as Section)}
        groups={[{ items: nav }]}
        head={
          <button type="button" onClick={() => setRoles(true)} className="press flex w-full items-center gap-3 rounded-full p-1.5 text-left">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-g-ink text-[16px] font-bold text-[var(--g-bg)]">y</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-bold">yanyin.core</span>
              <span className="block truncate text-[12.5px] text-g-muted">{tr("Platform owner")}</span>
            </span>
          </button>
        }
        foot={
          <div className="flex items-center gap-2">
            <ThemeToggle dark={scheme.dark} onToggle={scheme.toggle} label={tr("Light or dark theme")} look="plain" />
            <span className="flex h-10 flex-1 items-center gap-2 rounded-full bg-g-card px-1.5 pr-4 text-[14px] font-semibold">
              <YanOrb size={30} /> {tr("Ask Yan")}
            </span>
          </div>
        }
      />
      <div className="lg:pl-[264px]">
        {sec === "overview" ? (
          <>
            <section className="relative isolate px-5 pt-[max(20px,env(safe-area-inset-top))] pb-8 text-white lg:px-10 lg:pt-10">
              <NorthSky />
              <div className="mx-auto max-w-[1100px]">
                <p className="flex items-center gap-1.5 text-[14px] text-white/70">
                  <span className="size-1.5 rounded-full bg-[#5ce0a0]" /> <span className="font-semibold text-white">{tr("All systems normal")}</span> · {tr("uptime 99.98%")}
                </p>
                <p className="mt-2 text-[14px] text-white/70">MRR</p>
                <p className="text-[40px] leading-none font-bold tracking-[-0.03em] tabular-nums">{compactMoney(mrr)}</p>
                <p className="mt-1.5 text-[14px] text-white/75">{tr("ARR {a} · {n} paying venues", { a: compactMoney(mrr * 12), n: VENUES.filter((v) => v.mrr).length })}</p>
              </div>
            </section>
            <div className="relative z-10 mx-auto max-w-[1100px] px-5 lg:px-10">{overview()}</div>
          </>
        ) : (
          <div className="mx-auto max-w-[1100px] px-5 pt-[max(20px,env(safe-area-inset-top))] lg:px-10 lg:pt-10">
            <h1 className="text-[30px] leading-tight font-bold tracking-[-0.025em]">{titles[sec][0]}</h1>
            <p className="mt-0.5 text-[14px] text-g-muted">{titles[sec][1]}</p>
            <div key={sec} className="animate-tab mt-6">
              {sec === "venues" && venuesView()}
              {sec === "billing" && <Billing />}
              {sec === "ai" && aiView()}
              {sec === "flags" && <Flags say={say} />}
              {sec === "support" && <Support say={say} />}
              {sec === "journal" && <Journal />}
            </div>
          </div>
        )}
      </div>
      <TabCapsule label={tr("Sections")} active={["overview", "venues", "ai"].includes(sec) ? sec : "more"} onPick={(id) => go((id === "more" ? "billing" : id) as Section)} items={[nav[0]!, nav[1]!, nav[3]!, { id: "more", label: tr("More"), icon: BarChart3 }]} />
      {venue && <VenuePage v={VENUES.find((x) => x.id === venue)!} onClose={() => setVenue(null)} say={say} />}
      {roles && <RoleSwitch current="core" onClose={() => setRoles(false)} />}
    </main>
  );

  function overview() {
    return (
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <IconStat art="tables" title={tr("Venues")} value={String(VENUES.length)} sub={tr("{n} live · {t} on trial", { n: VENUES.filter((v) => v.status === "live").length, t: VENUES.filter((v) => v.status === "trial").length })} />
          <IconStat art="sales" title={tr("GMV this month")} value={compactMoney(gmv)} sub={tr("through yanyin")} />
          <IconStat art="guests" title={tr("Staff using it")} value={String(VENUES.reduce((n, v) => n + v.staff, 0))} sub={tr("this week")} />
          <IconStat art="trophy" title={tr("Yan's cost")} value={compactMoney(ai)} sub={tr("{p}% of MRR", { p: Math.round((ai / mrr) * 100) })} />
        </div>
        <Mrr />
        <section>
          <h3 className="mb-3 px-1 text-[20px] font-bold tracking-[-0.02em]">{tr("Needs you")}</h3>
          <div className="grid gap-2 md:grid-cols-2">
            <ListRow onClick={() => go("billing")} badge="3" badgeTone="chip-orange" title={tr("Phở An: trial ends in 3 days")} sub={tr("Offer Starter with the first month free")} />
            <ListRow onClick={() => go("support")} badge="2" badgeTone="chip-blue" title={tr("2 open support questions")} sub={tr("Oldest: 40 min ago, The Deck")} />
            <ListRow onClick={() => setVenue("the-deck")} badge="!" badgeTone="chip-red" title={tr("The Deck: setup stuck at the menu step")} sub={tr("Help them import the menu")} />
            <ListRow onClick={() => go("ai")} badge="%" badgeTone="chip-green" title={tr("Yan stays within budget")} sub={tr("{p}% of MRR this month", { p: Math.round((ai / mrr) * 100) })} />
          </div>
        </section>
      </div>
    );
  }

  function venuesView() {
    return <Venues onOpen={setVenue} />;
  }

  function aiView() {
    const limit = (v: Venue) => (v.plan === "Ultimate" ? 1_000_000 : v.plan === "Pro" ? 600_000 : 100_000);
    return (
      <div className="grid gap-3">
        {VENUES.map((v) => {
          const pct = Math.min(100, Math.round((v.ai / limit(v)) * 100));
          return (
            <div key={v.id} className="rounded-[22px] bg-g-fill p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-[16px] font-bold">{v.name}</span>
                <span className="shrink-0 text-[14px] font-semibold tabular-nums">
                  {compactMoney(v.ai)} <span className="text-g-muted">/ {compactMoney(limit(v))}</span>
                </span>
              </div>
              <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-g-card">
                <span className={`block h-full rounded-full ${pct > 80 ? "bg-g-orange" : "bg-g-blue"}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 text-[12.5px] text-g-muted">{tr("{n} requests · plan {p} · {pct}% of the limit", { n: Math.round(v.ai / 220), p: v.plan, pct })}</p>
            </div>
          );
        })}
      </div>
    );
  }
}

function Mrr() {
  const tr = useTr();
  const locale = useLocale();
  const vals = [0.6, 0.8, 1.0, 1.49, 1.49, 2.98, 2.98].map((m) => m * 1e6);
  const days = vals.map((value, i) => {
    const d = new Date(2026, 4 + i, 1);
    return { short: d.toLocaleDateString(locale, { month: "short" }).replace(/\.$/, ""), date: "", value };
  });
  return <DaysCompareWidget title={tr("MRR by month")} icon={<Activity size={13} strokeWidth={2.4} />} days={days} format={compactMoney} todayNote={tr("tap a month to compare")} />;
}

function statusOf(v: Venue, tr: (s: string) => string) {
  return v.status === "live" ? { t: tr("Live"), c: "chip-green" } : v.status === "trial" ? { t: tr("Trial"), c: "chip-blue" } : v.status === "setup" ? { t: tr("Setting up"), c: "chip-orange" } : { t: tr("Paused"), c: "chip-gray" };
}

function Venues({ onOpen }: { onOpen: (id: string) => void }) {
  const tr = useTr();
  const [q, setQ] = useState("");
  const [f, setF] = useState("all");
  const rows = VENUES.filter((v) => (f === "all" || v.status === f) && (!q || `${v.name} ${v.city}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <>
      <Toolbar
        query={q}
        onQuery={setQ}
        placeholder={tr("Venue or city")}
        chips={[
          { id: "all", label: tr("All"), count: VENUES.length },
          { id: "live", label: tr("Live"), count: VENUES.filter((v) => v.status === "live").length },
          { id: "trial", label: tr("Trial"), count: VENUES.filter((v) => v.status === "trial").length },
          { id: "setup", label: tr("Setting up"), count: VENUES.filter((v) => v.status === "setup").length },
        ]}
        active={f}
        onChip={setF}
      />
      <div className="mt-4">
        <DataTable
          rows={rows}
          rowKey={(v) => v.id}
          onRow={(v) => onOpen(v.id)}
          columns={[
            { key: "name", label: tr("Venue"), render: (v) => <span className="block"><span className="block font-semibold">{v.name}</span><span className="block text-[12.5px] text-g-muted">{v.city} · {v.country}</span></span>, sort: (v) => v.name },
            { key: "plan", label: tr("Plan"), render: (v) => v.plan },
            { key: "status", label: tr("Status"), render: (v) => <span className={`rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${statusOf(v, tr).c}`}>{statusOf(v, tr).t}</span> },
            { key: "gmv", label: "GMV", align: "right", render: (v) => compactMoney(v.gmv), sort: (v) => v.gmv },
            { key: "mrr", label: "MRR", align: "right", render: (v) => <span className="font-semibold">{v.mrr ? compactMoney(v.mrr) : "—"}</span>, sort: (v) => v.mrr },
            { key: "active", label: tr("Last active"), align: "right", render: (v) => <span className="text-g-muted">{tr(v.active)}</span> },
          ]}
          mobile={(v) => <ListRow onClick={() => onOpen(v.id)} badge={v.name[0]} badgeTone={statusOf(v, tr).c} title={v.name} sub={`${v.city} · ${v.plan} · ${statusOf(v, tr).t}`} right={<span className="shrink-0 text-[14px] font-semibold tabular-nums">{v.mrr ? compactMoney(v.mrr) : "—"}</span>} />}
          empty={<EmptyState art="tables" title={tr("No venues found")} text={tr("Try another word or filter.")} />}
        />
      </div>
    </>
  );
}

function VenuePage({ v, onClose, say }: { v: Venue; onClose: () => void; say: (t: string) => void }) {
  const tr = useTr();
  const s = statusOf(v, tr);
  return (
    <Sheet
      open
      wide
      onClose={onClose}
      label={v.name}
      footer={
        <a href="hq.html" onClick={() => haptic("success")} className="blue-grad press flex h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-semibold">
          <LogIn size={18} strokeWidth={2.2} /> {tr("Open as this venue (support)")}
        </a>
      }
    >
      <div className="grid gap-5 px-5 pt-2 pb-10 md:grid-cols-2 md:items-start">
        <div className="grid gap-4">
          <ArtScene name="tables" layout="row" focal={52} className="rounded-[26px] p-5" footer={<p className="mt-3 text-[13px] text-g-muted">{tr("{n} staff · last active {t}", { n: v.staff, t: tr(v.active) })}</p>}>
            <p className="text-[13px] font-semibold text-g-muted">
              {v.city} · {v.country}
            </p>
            <p className="text-[26px] leading-tight font-bold tracking-[-0.02em]">{v.name}</p>
            <span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${s.c}`}>{s.t}</span>
          </ArtScene>
          <div className="grid grid-cols-2 gap-3">
            <IconStat art="sales" title="GMV" value={compactMoney(v.gmv)} sub={tr("this month")} />
            <IconStat art="check" title="MRR" value={v.mrr ? compactMoney(v.mrr) : "—"} sub={`${tr("Plan")} ${v.plan}`} />
          </div>
        </div>
        <div className="grid gap-4">
          <Group title={tr("Plan")}>
            {PLANS.map((p) => (
              <Row key={p} title={p} sub={p === v.plan ? tr("Current") : undefined} right={p === v.plan ? <span className="blue-grad grid size-7 place-items-center rounded-full"><Check size={14} strokeWidth={3} /></span> : undefined} onClick={p === v.plan ? undefined : () => say(tr("{v} moves to {p} from the next month", { v: v.name, p }))} />
            ))}
          </Group>
          <Group title={tr("Setup")}>
            {[
              [tr("Menu"), v.status !== "setup"],
              [tr("Tables and QR"), v.status !== "setup"],
              [tr("Team invited"), v.staff > 2],
              [tr("E-invoices"), v.plan !== "Free" && v.status === "live"],
            ].map(([t, ok]) => (
              <Row key={t as string} title={t as string} right={<span className={`grid size-7 place-items-center rounded-full ${ok ? "chip-green" : "chip-orange"}`}>{ok ? <Check size={14} strokeWidth={3} /> : "!"}</span>} />
            ))}
          </Group>
        </div>
      </div>
    </Sheet>
  );
}

function Billing() {
  const tr = useTr();
  const rows = [
    { id: "INV-2611-01", venue: "Samarkand", plan: "Pro", sum: 1_490_000, state: "paid", date: "1 Nov" },
    { id: "INV-2611-02", venue: "Zabey Community", plan: "Pro", sum: 1_490_000, state: "paid", date: "1 Nov" },
    { id: "TRIAL-PHOAN", venue: "Phở An", plan: "Starter", sum: 0, state: "trial", date: "ends 17 Nov" },
    { id: "INV-2610-01", venue: "Samarkand", plan: "Pro", sum: 1_490_000, state: "paid", date: "1 Oct" },
  ];
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <IconStat art="sales" title="MRR" value={compactMoney(2_980_000)} sub={tr("+100% in a month")} />
        <IconStat art="guests" title={tr("Paying")} value="2" sub={tr("of 5 venues")} />
        <IconStat art="bookings" title={tr("On trial")} value="1" sub={tr("ends 17 Nov")} />
        <IconStat art="check" title={tr("Churn")} value="0%" sub={tr("this month")} />
      </div>
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        columns={[
          { key: "id", label: tr("Invoice"), render: (r) => <span className="font-semibold tabular-nums">{r.id}</span> },
          { key: "venue", label: tr("Venue"), render: (r) => r.venue },
          { key: "plan", label: tr("Plan"), render: (r) => r.plan },
          { key: "date", label: tr("Date"), render: (r) => <span className="text-g-muted">{tr(r.date)}</span> },
          { key: "state", label: tr("Status"), render: (r) => <span className={`rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${r.state === "paid" ? "chip-green" : "chip-blue"}`}>{r.state === "paid" ? tr("Paid") : tr("Trial")}</span> },
          { key: "sum", label: tr("Sum"), align: "right", render: (r) => <span className="font-semibold">{r.sum ? compactMoney(r.sum) : "—"}</span> },
        ]}
        mobile={(r) => <ListRow badge={r.venue[0]} badgeTone={r.state === "paid" ? "chip-green" : "chip-blue"} title={`${r.venue} · ${r.plan}`} sub={`${r.id} · ${tr(r.date)}`} right={<span className="shrink-0 text-[14px] font-semibold">{r.sum ? compactMoney(r.sum) : tr("Trial")}</span>} />}
        empty={null}
      />
    </div>
  );
}

function Flags({ say }: { say: (t: string) => void }) {
  const tr = useTr();
  const flags = flagStore.use();
  return (
    <div className="no-scrollbar -mx-5 overflow-x-auto px-5">
      <div className="grid min-w-[640px] gap-1.5" style={{ gridTemplateColumns: "minmax(220px,1fr) repeat(4, 110px)" }}>
        <span />
        {PLANS.map((p) => (
          <span key={p} className="py-1 text-center text-[13px] font-semibold text-g-muted">
            {p}
          </span>
        ))}
        {Object.keys(flags).map((k) => (
          <div key={k} className="contents">
            <span className="flex items-center rounded-l-[18px] bg-g-fill px-4 py-3 text-[15px] font-semibold">{tr(FLAG_NAMES[k] ?? k)}</span>
            {PLANS.map((p, i) => (
              <span key={p} className={`grid place-items-center bg-g-fill ${i === 3 ? "rounded-r-[18px]" : ""}`}>
                <Switch
                  on={!!flags[k]![p]}
                  onChange={(v) => {
                    flagStore.set({ ...flags, [k]: { ...flags[k], [p]: v } });
                    say(tr("{f}: {p} updated for every venue on it", { f: tr(FLAG_NAMES[k] ?? k), p }));
                  }}
                  label={`${tr(FLAG_NAMES[k] ?? k)} · ${p}`}
                />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Support({ say }: { say: (t: string) => void }) {
  const tr = useTr();
  const [done, setDone] = useState<string[]>([]);
  const tickets = [
    { id: "s1", venue: "The Deck", text: "How do we import a menu from a PDF with two columns?", at: "40 min ago" },
    { id: "s2", venue: "Phở An", text: "Can we print kitchen tickets on an 58 mm printer?", at: "2 h ago" },
    { id: "s3", venue: "Samarkand", text: "Add Korean to the guest menu", at: "yesterday" },
  ];
  return (
    <div className="grid gap-2">
      {tickets.map((t) => {
        const closed = done.includes(t.id) || t.id === "s3";
        return (
          <div key={t.id} className="flex items-center gap-3 rounded-[22px] bg-g-fill p-3 pr-3">
            <span className={`grid size-11 shrink-0 place-items-center rounded-full ${closed ? "chip-green" : "chip-blue"}`}>{closed ? <Check size={18} strokeWidth={2.8} /> : <LifeBuoy size={18} />}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold">{tr(t.text)}</span>
              <span className="block truncate text-[12.5px] text-g-muted">
                {t.venue} · {tr(t.at)}
              </span>
            </span>
            {!closed && (
              <button type="button" onClick={() => (haptic("success"), setDone((d) => [...d, t.id]), say(tr("Answered · {v} sees it in their console", { v: t.venue })))} className="press h-10 shrink-0 rounded-full bg-g-ink px-4 text-[13px] font-semibold text-white">
                {tr("Answer")}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Journal() {
  const tr = useTr();
  const rows = [
    ["12:46", "@huong", "Samarkand", "Changed the price of Tom Yum"],
    ["12:31", "@linh", "Samarkand", "Refund 130k on bill #1041"],
    ["11:58", "founder", "Phở An", "Opened the console as the venue (support)"],
    ["10:12", "@zabey_admin", "Zabey Community", "Invited @an_bar as bartender"],
    ["09:52", "@huong", "Samarkand", "Opened the shift"],
  ];
  return (
    <div className="grid gap-2">
      {rows.map(([at, who, where, what]) => (
        <div key={at + what} className="flex items-center gap-3 rounded-full bg-g-fill px-5 py-3">
          <span className="w-12 shrink-0 text-[13px] font-semibold text-g-muted tabular-nums">{at}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-medium">{tr(what!)}</span>
            <span className="block truncate text-[12.5px] text-g-muted">
              <span className="text-g-blue">{who}</span> · {where}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
