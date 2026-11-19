"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  LogIn,
  LogOut,
  Minus,
  Plus,
  Printer,
  Send,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Person } from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import {
  clockStore,
  historyStore,
  hm,
  NEED,
  OPEN_FROM,
  OPEN_TO,
  PRESETS,
  publishedStore,
  scheduleStore,
  shiftStore,
  toH,
  TODAY,
  type Plan,
  type ShiftReport,
  type Station,
} from "@/lib/demo-shifts";
import { Sheet } from "@/components/guest/ui";
import { PeekCard } from "@/components/guest/motion";
import { PeekActions, PeekHeader } from "@/components/system/PeekParts";
import { PersonPic } from "@/components/system/PersonPic";
import { StepBar } from "@/components/system/Kit";
import { WidgetCard } from "@/components/system/Widgets";
import { compactMoney } from "@/components/crew/CrewApp";
import { useLocale, useTr } from "@/components/crew/prefs";

/*
 * Shifts (docs/07 §85). Three tabs:
 *  - Today: the shift's clock across opening hours, who is in, late or still
 *    to come, and the staffing coverage by hour with the gaps to fill.
 *    Closing runs three steps: closing checklists, the cash count, the report.
 *  - Schedule: one day at a time as a timeline of everyone's hours (fits a
 *    phone), the gaps under it, each person's hours for the week; publish
 *    sends it to the team.
 *  - History: every closed shift with its Z-report (money, cash, people,
 *    checklists, what happened). Kept per the retention rules (ADR-020).
 */

type Tab = "today" | "plan" | "history";
const NOW = 12.75; // 12:45, the demo clock
const SPAN = OPEN_TO - OPEN_FROM;
const STATIONS: Exclude<Station, "admin">[] = ["hall", "bar", "kitchen"];
const ST_LABEL: Record<Station, string> = {
  admin: "Admin",
  hall: "Hall",
  bar: "Bar",
  kitchen: "Kitchen",
};
const ST_BAR: Record<Station, string> = {
  admin: "bg-[#8b93a7]",
  hall: "bg-g-blue",
  bar: "bg-[#14b8a6]",
  kitchen: "bg-g-orange",
};
const pct = (h: number) =>
  `${((Math.min(Math.max(h, OPEN_FROM), OPEN_TO) - OPEN_FROM) / SPAN) * 100}%`;
const hoursOf = (w: Plan[]) =>
  w.reduce((n, p) => n + (p ? p.to - p.from : 0), 0);

export type ShiftToday = {
  takings: number;
  bills: number;
  guests: number;
  tips: number;
  pay: ShiftReport["pay"];
};

export function ShiftsAdmin({
  team,
  notify,
  owner,
  today,
  closing,
}: {
  team: Person[];
  notify: (t: string) => void;
  owner: boolean;
  today: ShiftToday;
  /** Closing items of every checklist, for the first closing step. */
  closing: { done: number; total: number; left: string[] };
}) {
  const tr = useTr();
  const [tab, setTab] = useState<Tab>("today");
  const staff = team.filter((p) => !p.roles.includes("owner"));
  return (
    <div className="grid gap-5">
      <div className="flex justify-self-start rounded-full bg-g-fill p-1">
        {(["today", "plan", "history"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => (haptic("tick"), setTab(t))}
            aria-pressed={tab === t}
            className={`h-10 rounded-full px-4 text-[14px] font-semibold transition-colors ${tab === t ? "bg-white text-g-ink shadow-[0_1px_3px_rgba(11,11,15,0.12)] [[data-scheme=dark]_&]:bg-g-card" : "text-g-muted"}`}
          >
            {tr(
              t === "today" ? "Today" : t === "plan" ? "Schedule" : "History",
            )}
          </button>
        ))}
      </div>
      <div key={tab} className="animate-rise grid gap-5">
        {tab === "today" && (
          <TodayView
            staff={staff}
            notify={notify}
            today={today}
            closing={closing}
          />
        )}
        {tab === "plan" && <PlanView staff={staff} notify={notify} />}
        {tab === "history" && <HistoryView owner={owner} team={team} />}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Today */

function coverage(week: Record<string, Plan[]>, day: number) {
  return STATIONS.map((st) => ({
    st,
    hours: Array.from({ length: SPAN }, (_, i) => {
      const h = OPEN_FROM + i;
      const have = Object.values(week).filter((w) => {
        const p = w[day];
        return p && p.station === st && p.from <= h && p.to > h;
      }).length;
      return { h, have, need: NEED[st](h) };
    }),
  }));
}
/** Runs of hours where a station has fewer people than it needs. */
function gaps(cov: ReturnType<typeof coverage>) {
  return cov.flatMap(({ st, hours }) => {
    const out: {
      st: Station;
      from: number;
      to: number;
      have: number;
      need: number;
    }[] = [];
    hours.forEach((x) => {
      if (x.have >= x.need) return;
      const last = out[out.length - 1];
      if (
        last &&
        last.to === x.h &&
        last.have === x.have &&
        last.need === x.need
      )
        last.to = x.h + 1;
      else out.push({ st, from: x.h, to: x.h + 1, have: x.have, need: x.need });
    });
    return out;
  });
}

function TodayView({
  staff,
  notify,
  today,
  closing,
}: {
  staff: Person[];
  notify: (t: string) => void;
  today: ShiftToday;
  closing: { done: number; total: number; left: string[] };
}) {
  const tr = useTr();
  const shift = shiftStore.use();
  const week = scheduleStore.use();
  const clock = clockStore.use();
  const [closingFlow, setClosingFlow] = useState(false);
  const [opening, setOpening] = useState(false);
  const [fill, setFill] = useState<ReturnType<typeof gaps>[number] | null>(
    null,
  );
  const [peek, setPeek] = useState<string | null>(null);
  const cov = useMemo(() => coverage(week, TODAY), [week]);
  const holes = gaps(cov);
  const opened = toH(shift.openedAt);
  const elapsed = Math.max(0, NOW - opened);
  const rows = staff
    .map((p) => ({ p, plan: week[p.id]?.[TODAY] ?? null, c: clock[p.id] }))
    .filter((r) => r.plan || r.c);
  const lateOf = (r: (typeof rows)[number]) =>
    r.plan && r.c ? Math.round((toH(r.c.in) - r.plan.from) * 60) : 0;
  const working = rows.filter((r) => r.c && !r.c.out);
  const later = rows.filter((r) => !r.c && r.plan && r.plan.from > NOW);
  const missing = rows.filter((r) => !r.c && r.plan && r.plan.from <= NOW);
  const gone = rows.filter((r) => r.c?.out);
  const lateN = working.filter((r) => lateOf(r) > 5).length;
  const peekRow = rows.find((r) => r.p.id === peek);

  return (
    <>
      {/* The shift's clock: opening hours as a track, the open part filled, "now" as a dot. */}
      <section className="relative overflow-hidden rounded-[28px] bg-[#0b1020] p-5 text-white">
        <div className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-g-blue/40 blur-3xl" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3">
            <span
              className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold ${shift.open ? "bg-[#12a150]/25 text-[#5ce0a0]" : "bg-white/10 text-white/70"}`}
            >
              <span
                className={`size-1.5 rounded-full ${shift.open ? "animate-pulse bg-[#5ce0a0]" : "bg-white/50"}`}
              />
              {shift.open ? tr("Shift is open") : tr("Shift is closed")}
            </span>
            <span className="text-[12.5px] text-white/55">
              {shift.open ? `@${shift.openedBy} · ${shift.openedAt}` : ""}
            </span>
          </div>
          <p className="live mt-4 text-[40px] leading-none font-bold tracking-[-0.04em] tabular-nums">
            {shift.open
              ? tr("{h} h {m} min", {
                  h: Math.floor(elapsed),
                  m: Math.round((elapsed % 1) * 60),
                })
              : "—"}
          </p>
          <p className="mt-1 text-[13.5px] text-white/60">
            {shift.open
              ? tr("open since {t}", { t: shift.openedAt })
              : tr("Open it when the first people arrive")}
          </p>
          <div className="relative mt-5 h-2 rounded-full bg-white/10">
            {shift.open && (
              <span
                className="absolute inset-y-0 rounded-full bg-gradient-to-r from-[#6c96ff] to-[#2f5bff] transition-[width] duration-700"
                style={{
                  left: pct(opened),
                  width: `calc(${pct(NOW)} - ${pct(opened)})`,
                }}
              />
            )}
            <span
              className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#0b1020] bg-white shadow-[0_0_0_4px_rgba(255,255,255,0.15)]"
              style={{ left: pct(NOW) }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-white/40 tabular-nums">
            {[7, 10, 13, 16, 19, 22, 24].map((h) => (
              <span key={h}>{hm(h)}</span>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              [tr("On shift"), String(working.length)],
              [tr("Taken"), compactMoney(today.takings)],
              [tr("Bills"), String(today.bills)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-[18px] bg-white/8 px-3 py-2.5">
                <p className="text-[11.5px] text-white/55">{k}</p>
                <p className="live mt-0.5 truncate text-[17px] font-bold tabular-nums">
                  {v}
                </p>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => (
              haptic("light"),
              shift.open ? setClosingFlow(true) : setOpening(true)
            )}
            className={`press mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold ${shift.open ? "bg-[#fff] text-[#0b1020]" : "blue-grad"}`}
          >
            {shift.open ? (
              <LogOut size={17} strokeWidth={2.2} />
            ) : (
              <LogIn size={17} strokeWidth={2.2} />
            )}
            {shift.open ? tr("Close the shift") : tr("Open the shift")}
          </button>
        </div>
      </section>

      {/* Coverage: per station, each hour is a cell; orange where fewer people than needed. */}
      <WidgetCard
        title={tr("Coverage by hour")}
        icon={<CalendarCheck2 size={13} strokeWidth={2.4} />}
        aside={
          <span
            className={`text-[12.5px] font-semibold ${holes.length ? "text-g-orange" : "text-g-green"}`}
          >
            {holes.length
              ? tr("{n} gap|{n} gaps", { n: holes.length })
              : tr("all covered")}
          </span>
        }
      >
        <div className="mt-3 grid gap-2">
          {cov.map(({ st, hours }) => (
            <div
              key={st}
              className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-2"
            >
              <span className="text-[12.5px] font-semibold text-g-ink-2">
                {tr(ST_LABEL[st])}
              </span>
              <div className="relative flex gap-[3px]">
                {hours.map((x, i) => (
                  <span
                    key={x.h}
                    title={`${hm(x.h)} · ${x.have}/${x.need}`}
                    className={`h-7 flex-1 rounded-[6px] ${x.need === 0 && x.have === 0 ? "bg-g-card" : x.have < x.need ? "bg-g-orange" : x.have > x.need ? "bg-g-blue" : "bg-g-blue/45"} ${x.h < NOW ? "opacity-45" : ""}`}
                    style={{
                      animation: `rise 0.4s ${i * 18}ms both cubic-bezier(0.22,1,0.36,1)`,
                    }}
                  />
                ))}
                <span
                  className="pointer-events-none absolute -inset-y-1 w-0.5 rounded-full bg-g-ink"
                  style={{ left: pct(NOW) }}
                />
              </div>
            </div>
          ))}
          <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-2">
            <span />
            <div className="flex justify-between text-[10.5px] text-g-faint tabular-nums">
              {[7, 11, 15, 19, 23].map((h) => (
                <span key={h}>{h}</span>
              ))}
            </div>
          </div>
        </div>
        {holes.length > 0 && (
          <div className="mt-3 grid gap-1.5">
            {holes.map((g) => (
              <button
                key={`${g.st}${g.from}`}
                type="button"
                onClick={() => (haptic("light"), setFill(g))}
                className="press flex items-center gap-3 rounded-[16px] bg-white px-3 py-2.5 text-left [[data-scheme=dark]_&]:bg-g-card"
              >
                <span className="chip-orange grid size-8 shrink-0 place-items-center rounded-full">
                  <AlertTriangle size={15} strokeWidth={2.2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">
                    {hm(g.from)}–{hm(g.to)} · {tr(ST_LABEL[g.st])}
                  </span>
                  <span className="block text-[12.5px] text-g-muted">
                    {tr("{a} of {b} people", { a: g.have, b: g.need })}
                  </span>
                </span>
                <span className="shrink-0 text-[13px] font-semibold text-g-blue">
                  {tr("Find someone")}
                </span>
              </button>
            ))}
          </div>
        )}
      </WidgetCard>

      {/* People today: in, late, not yet, gone. Tap for clock in or out. */}
      <section>
        <div className="mb-2 flex items-baseline justify-between px-1">
          <h3 className="text-[20px] font-bold tracking-[-0.02em]">
            {tr("People today")}
          </h3>
          {lateN > 0 && (
            <span className="text-[13px] font-semibold text-g-orange">
              {tr("{n} came late|{n} came late", { n: lateN })}
            </span>
          )}
        </div>
        <div className="stagger grid gap-1.5 md:grid-cols-2 md:gap-x-4">
          {[...missing, ...working, ...later, ...gone].map((r) => {
            const late = lateOf(r);
            const chip = r.c?.out
              ? ["chip-gray", tr("left {t}", { t: r.c.out })]
              : r.c
                ? late > 5
                  ? [
                      "chip-orange",
                      tr("{t} · +{n} min", { t: r.c.in, n: late }),
                    ]
                  : ["chip-green", tr("in {t}", { t: r.c.in })]
                : r.plan && r.plan.from <= NOW
                  ? ["chip-red", tr("not in yet")]
                  : ["chip-gray", tr("comes at {t}", { t: hm(r.plan!.from) })];
            return (
              <button
                key={r.p.id}
                type="button"
                onClick={() => (haptic("light"), setPeek(r.p.id))}
                className="press flex items-center gap-3 rounded-[20px] bg-g-fill px-3 py-2.5 text-left"
              >
                <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-g-card text-[15px] font-bold">
                  <PersonPic p={r.p} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">
                    {r.p.name}
                  </span>
                  <span className="block truncate text-[12.5px] text-g-muted tabular-nums">
                    {r.plan
                      ? `${tr(ST_LABEL[r.plan.station])} · ${hm(r.plan.from)}–${hm(r.plan.to)}`
                      : tr("not planned")}
                  </span>
                </span>
                <span
                  className={`live shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold tabular-nums ${chip[0]}`}
                >
                  {chip[1]}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {peekRow && (
        <PeekCard label={peekRow.p.name} onClose={() => setPeek(null)}>
          <PeekHeader
            kicker={
              peekRow.plan
                ? `${tr(ST_LABEL[peekRow.plan.station])} · ${hm(peekRow.plan.from)}–${hm(peekRow.plan.to)}`
                : ""
            }
            title={peekRow.p.name}
            facts={[
              {
                icon: Clock,
                text: peekRow.c
                  ? tr("in {t}", { t: peekRow.c.in })
                  : tr("not in yet"),
                tone: lateOf(peekRow) > 5 ? "warn" : "plain",
              },
            ]}
          />
          <PeekActions
            items={
              peekRow.c && !peekRow.c.out
                ? [
                    {
                      icon: LogOut,
                      label: tr("Clock out now"),
                      onClick: () => (
                        clockStore.set({
                          ...clock,
                          [peekRow.p.id]: { ...peekRow.c!, out: "12:45" },
                        }),
                        notify(
                          tr("{name} clocked out", { name: peekRow.p.name }),
                        ),
                        setPeek(null)
                      ),
                    },
                  ]
                : [
                    {
                      icon: LogIn,
                      label: tr("Clock in now"),
                      onClick: () => (
                        clockStore.set({
                          ...clock,
                          [peekRow.p.id]: { in: "12:45" },
                        }),
                        notify(
                          tr("{name} clocked in", { name: peekRow.p.name }),
                        ),
                        setPeek(null)
                      ),
                    },
                  ]
            }
          />
        </PeekCard>
      )}
      {fill && (
        <FillGap
          gap={fill}
          staff={staff}
          onClose={() => setFill(null)}
          notify={notify}
        />
      )}
      {opening && (
        <OpenFlow onClose={() => setOpening(false)} notify={notify} />
      )}
      {closingFlow && (
        <CloseFlow
          staff={staff}
          today={today}
          closing={closing}
          lateN={lateN}
          onClose={() => setClosingFlow(false)}
          notify={notify}
        />
      )}
    </>
  );
}

/** Who could cover a gap: free that day, fewest hours this week first. Yan picks the first. */
function FillGap({
  gap,
  staff,
  onClose,
  notify,
}: {
  gap: ReturnType<typeof gaps>[number];
  staff: Person[];
  onClose: () => void;
  notify: (t: string) => void;
}) {
  const tr = useTr();
  const week = scheduleStore.use();
  const can = (p: Person) =>
    gap.st === "hall"
      ? p.roles.includes("waiter")
      : gap.st === "bar"
        ? p.roles.includes("bartender")
        : p.roles.includes("cook");
  const options = staff
    .filter(can)
    .map((p) => ({
      p,
      plan: week[p.id]?.[TODAY] ?? null,
      hours: hoursOf(week[p.id] ?? []),
    }))
    .filter(
      (o) =>
        !o.plan ||
        o.plan.to <= gap.from ||
        o.plan.from >= gap.to ||
        o.plan.to < gap.to,
    )
    .sort((a, b) => a.hours - b.hours);
  const ask = (p: Person) => {
    haptic("success");
    notify(
      tr("Asked @{h} to cover {a}–{b}", {
        h: p.handle,
        a: hm(gap.from),
        b: hm(gap.to),
      }),
    );
    onClose();
  };
  return (
    <Sheet open onClose={onClose} label={tr("Find someone")}>
      <div className="grid gap-4 px-5 pt-2 pb-10">
        <div>
          <h2 className="text-[28px] leading-tight font-bold tracking-[-0.025em]">
            {hm(gap.from)}–{hm(gap.to)} · {tr(ST_LABEL[gap.st])}
          </h2>
          <p className="text-[14px] text-g-muted">
            {tr("{a} of {b} people. Ask someone to come or stay longer.", {
              a: gap.have,
              b: gap.need,
            })}
          </p>
        </div>
        {options.length ? (
          <div className="stagger grid gap-1.5">
            {options.map((o, i) => (
              <button
                key={o.p.id}
                type="button"
                onClick={() => ask(o.p)}
                className="press flex items-center gap-3 rounded-[20px] bg-g-fill px-3 py-2.5 text-left"
              >
                <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-g-card text-[15px] font-bold">
                  <PersonPic p={o.p} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 truncate text-[15px] font-semibold">
                    {o.p.name}
                    {i === 0 && (
                      <span className="chip-blue inline-flex h-5 items-center gap-1 rounded-full px-1.5 text-[11px] font-semibold">
                        <Sparkles size={11} strokeWidth={2.4} /> {tr("Yan")}
                      </span>
                    )}
                  </span>
                  <span className="block text-[12.5px] text-g-muted tabular-nums">
                    {o.plan
                      ? tr("works {a}–{b} · {n} h this week", {
                          a: hm(o.plan.from),
                          b: hm(o.plan.to),
                          n: o.hours,
                        })
                      : tr("free today · {n} h this week", { n: o.hours })}
                  </span>
                </span>
                <Send
                  size={17}
                  strokeWidth={2.2}
                  className="shrink-0 text-g-blue"
                />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-[14px] text-g-muted">
            {tr(
              "Nobody of that station is free. Post it in the news: someone may swap.",
            )}
          </p>
        )}
      </div>
    </Sheet>
  );
}

function OpenFlow({
  onClose,
  notify,
}: {
  onClose: () => void;
  notify: (t: string) => void;
}) {
  const tr = useTr();
  const [float, setFloat] = useState("2000000");
  return (
    <Sheet
      open
      onClose={onClose}
      label={tr("Open the shift")}
      footer={
        <button
          type="button"
          onClick={() => {
            haptic("success");
            shiftStore.set({
              open: true,
              openedAt: "12:45",
              openedBy: "huong",
              float: Number(float) || 0,
            });
            notify(tr("Shift opened · the team sees it"));
            onClose();
          }}
          className="blue-grad press flex h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-semibold"
        >
          <LogIn size={18} strokeWidth={2.2} /> {tr("Open the shift")}
        </button>
      }
    >
      <div className="grid gap-4 px-5 pt-2 pb-10">
        <h2 className="text-[28px] leading-tight font-bold tracking-[-0.025em]">
          {tr("Open the shift")}
        </h2>
        <p className="text-[14px] text-g-muted">
          {tr(
            "Count the float in the drawer: it is the start of tonight's cash count.",
          )}
        </p>
        <MoneyInput
          value={float}
          onChange={setFloat}
          label={tr("Float in the drawer")}
        />
        <p className="text-[13px] text-g-muted">
          {tr(
            "Opening checklists start for every station; the waiters see the shift in their app.",
          )}
        </p>
      </div>
    </Sheet>
  );
}

function MoneyInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <label className="block">
      <span className="px-1 text-[13px] font-semibold text-g-ink-2">
        {label}
      </span>
      <span className="mt-1.5 flex h-14 items-center gap-2 rounded-[20px] bg-g-fill px-4">
        <input
          inputMode="numeric"
          value={Number(value || 0).toLocaleString("en-US")}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
          className="min-w-0 flex-1 bg-transparent text-[22px] font-bold tracking-[-0.02em] outline-none tabular-nums"
        />
        <span className="text-[16px] text-g-muted">₫</span>
      </span>
    </label>
  );
}

/** Closing in three steps; the last saves the Z-report to the history. */
function CloseFlow({
  staff,
  today,
  closing,
  lateN,
  onClose,
  notify,
}: {
  staff: Person[];
  today: ShiftToday;
  closing: { done: number; total: number; left: string[] };
  lateN: number;
  onClose: () => void;
  notify: (t: string) => void;
}) {
  const tr = useTr();
  const shift = shiftStore.use();
  const clock = clockStore.use();
  const history = historyStore.use();
  const [step, setStep] = useState(0);
  const [cash, setCash] = useState("");
  const [why, setWhy] = useState("");
  const [note, setNote] = useState("");
  const expected = shift.float + today.pay.cash;
  const counted = Number(cash || 0);
  const diff = cash ? counted - expected : 0;
  const steps = [
    tr("Closing checklists"),
    tr("Cash count"),
    tr("Shift report"),
  ];
  const report: ShiftReport = {
    id: `S-${1181}`,
    date: "14 Nov",
    weekday: 5,
    opened: shift.openedAt,
    closed: "23:48",
    by: shift.openedBy,
    takings: today.takings,
    bills: today.bills,
    guests: today.guests,
    tips: today.tips,
    refunds: 0,
    pay: today.pay,
    cashExpected: expected,
    cashCounted: counted,
    checklists: Math.round((closing.done / Math.max(1, closing.total)) * 100),
    late: lateN,
    hours: 61,
    people: staff
      .filter((p) => clock[p.id])
      .map((p) => ({
        id: p.id,
        from: clock[p.id]!.in,
        to: clock[p.id]!.out ?? "23:48",
      })),
    events: [
      { at: shift.openedAt, text: "Shift opened" },
      {
        at: "23:40",
        text: diff
          ? `Cash count: difference ${diff > 0 ? "+" : "−"}${compactMoney(Math.abs(diff))}${why ? ` · ${why}` : ""}`
          : "Cash count: matches",
        tone: diff ? "warn" : "good",
      },
      { at: "23:48", text: "Shift closed" },
    ],
    note: note.trim() || undefined,
  };
  const can =
    step === 0 || (step === 1 ? !!cash && (!diff || why.length > 0) : true);
  const next = () => {
    haptic(step === 2 ? "success" : "light");
    if (step < 2) return setStep(step + 1);
    historyStore.set([report, ...history]);
    shiftStore.set({ ...shift, open: false });
    notify(
      diff
        ? tr("Shift closed · difference {sum}", { sum: compactMoney(diff) })
        : tr("Shift closed · the cash matches"),
    );
    onClose();
  };
  return (
    <Sheet
      open
      wide
      onClose={onClose}
      label={tr("Close the shift")}
      footer={
        <div className="flex gap-2">
          {step > 0 && (
            <button
              type="button"
              aria-label={tr("Back")}
              onClick={() => (haptic("light"), setStep(step - 1))}
              className="press grid size-14 shrink-0 place-items-center rounded-full bg-g-fill"
            >
              <ArrowLeft size={19} strokeWidth={2.2} />
            </button>
          )}
          <button
            type="button"
            disabled={!can}
            onClick={next}
            className="blue-grad press h-14 flex-1 rounded-full text-[16px] font-semibold transition-opacity disabled:opacity-40"
          >
            {step === 2 ? tr("Close the shift") : tr("Next")}
          </button>
        </div>
      }
    >
      <div className="grid gap-5 px-5 pt-2 pb-10">
        <StepBar steps={steps} at={step} />
        <div key={step} className="animate-rise grid gap-4">
          {step === 0 && (
            <>
              <h2 className="text-[28px] leading-tight font-bold tracking-[-0.025em]">
                {tr("Closing checklists")}
              </h2>
              <div className="flex items-center gap-4 rounded-[24px] bg-g-fill p-4">
                <Ring
                  value={closing.done / Math.max(1, closing.total)}
                  size={64}
                />
                <div className="min-w-0">
                  <p className="text-[22px] font-bold tabular-nums">
                    {closing.done}/{closing.total}
                  </p>
                  <p className="text-[13px] text-g-muted">
                    {closing.left.length ? tr("not done yet") : tr("all done")}
                  </p>
                </div>
              </div>
              {closing.left.length > 0 && (
                <div className="rounded-[24px] bg-g-fill p-1.5">
                  {closing.left.map((t) => (
                    <p
                      key={t}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-[14.5px]"
                    >
                      <span className="size-2 shrink-0 rounded-full bg-g-orange" />{" "}
                      {tr(t)}
                    </p>
                  ))}
                </div>
              )}
              <p className="text-[13px] text-g-muted">
                {tr("You can close anyway: what is left goes into the report.")}
              </p>
            </>
          )}
          {step === 1 && (
            <>
              <h2 className="text-[28px] leading-tight font-bold tracking-[-0.025em]">
                {tr("Count the cash")}
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  [tr("Float"), shift.float],
                  [tr("Cash bills"), today.pay.cash],
                ].map(([k, v]) => (
                  <div
                    key={k as string}
                    className="rounded-[20px] bg-g-fill p-3"
                  >
                    <p className="text-[12px] font-semibold text-g-muted">
                      {k}
                    </p>
                    <p className="mt-1 text-[17px] font-bold tabular-nums">
                      {compactMoney(v as number)}
                    </p>
                  </div>
                ))}
              </div>
              <p className="px-1 text-[14px]">
                {tr("Expected in the drawer")}:{" "}
                <b className="tabular-nums">
                  {expected.toLocaleString("en-US")} ₫
                </b>
              </p>
              <MoneyInput
                value={cash}
                onChange={setCash}
                label={tr("Counted")}
              />
              <button
                type="button"
                onClick={() => (haptic("tick"), setCash(String(expected)))}
                className="press h-10 justify-self-start rounded-full bg-g-fill px-4 text-[14px] font-semibold text-g-blue"
              >
                {tr("Exactly as expected")}
              </button>
              {cash && (
                <div
                  className={`animate-rise rounded-[20px] p-3.5 ${diff ? "chip-orange" : "chip-green"}`}
                >
                  <p className="text-[15px] font-semibold">
                    {diff
                      ? tr("Difference {sum}", {
                          sum: `${diff > 0 ? "+" : "−"}${compactMoney(Math.abs(diff))}`,
                        })
                      : tr("Matches")}
                  </p>
                  {diff !== 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[
                        tr("Change given wrong"),
                        tr("Bill paid twice"),
                        tr("Shortage"),
                        tr("Tip left in cash"),
                      ].map((r) => (
                        <button
                          key={r}
                          type="button"
                          aria-pressed={why === r}
                          onClick={() => (haptic("tick"), setWhy(r))}
                          className={`press h-8 rounded-full px-3 text-[13px] font-semibold ${why === r ? "bg-g-ink text-white [[data-scheme=dark]_&]:bg-white [[data-scheme=dark]_&]:text-[#0b0b0f]" : "bg-white/60 text-g-ink [[data-scheme=dark]_&]:bg-white/10 [[data-scheme=dark]_&]:text-white"}`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          {step === 2 && (
            <>
              <h2 className="text-[28px] leading-tight font-bold tracking-[-0.025em]">
                {tr("Shift report")}
              </h2>
              <ReportBody r={report} owner team={staff} />
              <label className="block">
                <span className="px-1 text-[13px] font-semibold text-g-ink-2">
                  {tr("Note for tomorrow")}
                </span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder={tr(
                    "The fridge in the bar is noisy, call the technician",
                  )}
                  className="mt-1.5 w-full resize-none rounded-[20px] bg-g-fill px-4 py-3 text-[15px] outline-none"
                />
              </label>
            </>
          )}
        </div>
      </div>
    </Sheet>
  );
}

/* ---------------------------------------------------------------- Schedule */

function PlanView({
  staff,
  notify,
}: {
  staff: Person[];
  notify: (t: string) => void;
}) {
  const tr = useTr();
  const locale = useLocale();
  const week = scheduleStore.use();
  const published = publishedStore.use();
  const [day, setDay] = useState(TODAY);
  const [edit, setEdit] = useState<string | null>(null);
  const start = new Date(2026, 10, 9);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const holes = gaps(coverage(week, i));
    return {
      i,
      short: d.toLocaleDateString(locale, { weekday: "short" }),
      date: d.getDate(),
      holes: holes.length,
    };
  });
  const cov = coverage(week, day);
  const holes = gaps(cov);
  const set = (pid: string, plan: Plan) => {
    const cur = week[pid] ?? Array<Plan>(7).fill(null);
    scheduleStore.set({
      ...week,
      [pid]: cur.map((p, i) => (i === day ? plan : p)),
    });
    publishedStore.set(false);
  };
  const person = staff.find((p) => p.id === edit);
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1">
          <button
            type="button"
            aria-label={tr("Previous week")}
            className="press grid size-9 place-items-center rounded-full bg-g-fill text-g-muted"
          >
            <ChevronLeft size={17} />
          </button>
          <span className="px-2 text-[15px] font-semibold">
            {tr("9–15 November")}
          </span>
          <button
            type="button"
            aria-label={tr("Next week")}
            className="press grid size-9 place-items-center rounded-full bg-g-fill text-g-muted"
          >
            <ChevronRight size={17} />
          </button>
        </span>
        <span
          className={`ml-auto rounded-full px-3 py-1.5 text-[12.5px] font-semibold ${published ? "chip-green" : "chip-orange"}`}
        >
          {published ? tr("Published") : tr("Draft · not sent")}
        </span>
      </div>

      {/* Days: weekday, date, a dot when the day has gaps. */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => (
          <button
            key={d.i}
            type="button"
            onClick={() => (haptic("tick"), setDay(d.i))}
            aria-pressed={day === d.i}
            className={`press relative flex h-16 flex-col items-center justify-center rounded-[18px] transition-colors ${day === d.i ? "bg-g-ink text-white [[data-scheme=dark]_&]:bg-white [[data-scheme=dark]_&]:text-[#0b0b0f]" : "bg-g-fill"}`}
          >
            <span
              className={`text-[11.5px] font-semibold capitalize ${day === d.i ? "opacity-70" : "text-g-muted"}`}
            >
              {d.short}
            </span>
            <span className="text-[18px] leading-tight font-bold tabular-nums">
              {d.date}
            </span>
            <span
              className={`absolute bottom-1.5 size-1.5 rounded-full ${d.holes ? "bg-g-orange" : d.i === TODAY ? "bg-g-blue" : "bg-transparent"}`}
            />
          </button>
        ))}
      </div>

      {/* The day as a timeline: everyone's hours on one scale, tap a row to change it. */}
      <section key={day} className="rounded-[24px] bg-g-fill p-3.5">
        <div className="grid grid-cols-[88px_minmax(0,1fr)_34px] gap-x-2 pb-1.5 text-[10.5px] text-g-faint tabular-nums">
          <span />
          <div className="relative h-3">
            {[7, 10, 13, 16, 19, 22].map((h) => (
              <span
                key={h}
                className="absolute -translate-x-1/2"
                style={{ left: pct(h) }}
              >
                {h}
              </span>
            ))}
          </div>
          <span className="text-right">{tr("wk")}</span>
        </div>
        <div className="stagger grid gap-1">
          {staff.map((p) => {
            const plan = week[p.id]?.[day] ?? null;
            const hours = hoursOf(week[p.id] ?? []);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => (haptic("light"), setEdit(p.id))}
                className="press grid grid-cols-[88px_minmax(0,1fr)_34px] items-center gap-x-2 rounded-[14px] py-1 text-left"
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="relative grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-g-card text-[11px] font-bold">
                    <PersonPic p={p} />
                  </span>
                  <span className="truncate text-[13px] font-semibold">
                    {p.name}
                  </span>
                </span>
                <span className="relative h-8 rounded-[10px] bg-white/70 [[data-scheme=dark]_&]:bg-white/5">
                  {day === TODAY && (
                    <span
                      className="absolute inset-y-0 w-px bg-g-ink/40"
                      style={{ left: pct(NOW) }}
                    />
                  )}
                  {plan ? (
                    <span
                      className={`absolute inset-y-1 flex items-center overflow-hidden rounded-[8px] px-1.5 text-[11px] font-semibold whitespace-nowrap text-white tabular-nums ${ST_BAR[plan.station]}`}
                      style={{
                        left: pct(plan.from),
                        width: `calc(${pct(plan.to)} - ${pct(plan.from)})`,
                        animation: "rise 0.4s both cubic-bezier(0.22,1,0.36,1)",
                      }}
                    >
                      {hm(plan.from)}–{hm(plan.to)}
                    </span>
                  ) : (
                    <span className="absolute inset-0 grid place-items-center text-[11.5px] text-g-faint">
                      {tr("Day off")}
                    </span>
                  )}
                </span>
                <span
                  className={`text-right text-[12px] font-semibold tabular-nums ${hours > 48 ? "text-g-orange" : "text-g-muted"}`}
                >
                  {hours}
                </span>
              </button>
            );
          })}
          {/* Under the people: where the day falls short. */}
          <div className="mt-1 grid grid-cols-[88px_minmax(0,1fr)_34px] items-center gap-x-2 border-t border-g-line pt-2">
            <span className="text-[12px] font-semibold text-g-ink-2">
              {tr("Short")}
            </span>
            <span className="relative h-5">
              {holes.map((g) => (
                <span
                  key={`${g.st}${g.from}`}
                  title={`${tr(ST_LABEL[g.st])} ${g.have}/${g.need}`}
                  className="absolute inset-y-0.5 rounded-full bg-g-orange/80"
                  style={{
                    left: pct(g.from),
                    width: `calc(${pct(g.to)} - ${pct(g.from)})`,
                  }}
                />
              ))}
              {!holes.length && (
                <span className="absolute inset-0 flex items-center text-[12px] font-semibold text-g-green">
                  {tr("everyone needed is planned")}
                </span>
              )}
            </span>
            <span />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-g-muted">
          {(["hall", "bar", "kitchen", "admin"] as const).map((s) => (
            <span key={s} className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${ST_BAR[s]}`} />{" "}
              {tr(ST_LABEL[s])}
            </span>
          ))}
          <span className="ml-auto">{tr("wk = hours this week")}</span>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => (
            haptic("success"),
            notify(tr("Copied from last week · check it and publish")),
            publishedStore.set(false)
          )}
          className="press flex h-12 items-center justify-center gap-2 rounded-full bg-g-fill text-[14.5px] font-semibold"
        >
          <Copy size={16} strokeWidth={2.2} className="text-g-blue" />{" "}
          {tr("Copy last week")}
        </button>
        <button
          type="button"
          disabled={published}
          onClick={() => (
            haptic("success"),
            publishedStore.set(true),
            notify(tr("Schedule sent · everyone sees their hours"))
          )}
          className="blue-grad press flex h-12 items-center justify-center gap-2 rounded-full text-[14.5px] font-semibold transition-opacity disabled:bg-none disabled:bg-g-fill disabled:text-g-muted"
        >
          <Send size={16} strokeWidth={2.2} /> {tr("Publish")}
        </button>
      </div>

      {person && (
        <PlanSheet
          person={person}
          dayLabel={`${days[day]!.short} ${days[day]!.date}`}
          plan={week[person.id]?.[day] ?? null}
          onClose={() => setEdit(null)}
          onSave={(pl) => (
            set(person.id, pl),
            setEdit(null),
            haptic("success")
          )}
        />
      )}
    </>
  );
}

function PlanSheet({
  person,
  dayLabel,
  plan,
  onClose,
  onSave,
}: {
  person: Person;
  dayLabel: string;
  plan: Plan;
  onClose: () => void;
  onSave: (p: Plan) => void;
}) {
  const tr = useTr();
  const def: Station = person.roles.includes("cook")
    ? "kitchen"
    : person.roles.includes("bartender")
      ? "bar"
      : person.roles.includes("admin")
        ? "admin"
        : "hall";
  const [p, setP] = useState<NonNullable<Plan>>(
    plan ?? { from: 10, to: 18, station: def },
  );
  const [off, setOff] = useState(!plan);
  const nudge = (k: "from" | "to", d: number) => {
    haptic("tick");
    setOff(false);
    setP((x) => {
      const v = Math.min(OPEN_TO, Math.max(OPEN_FROM, x[k] + d));
      return k === "from"
        ? { ...x, from: Math.min(v, x.to - 1) }
        : { ...x, to: Math.max(v, x.from + 1) };
    });
  };
  return (
    <Sheet
      open
      onClose={onClose}
      label={person.name}
      footer={
        <button
          type="button"
          onClick={() => onSave(off ? null : p)}
          className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold"
        >
          {tr("Save")}
        </button>
      }
    >
      <div className="grid gap-5 px-5 pt-2 pb-10">
        <div>
          <p className="text-[13px] font-semibold text-g-blue capitalize">
            {dayLabel}
          </p>
          <h2 className="text-[28px] leading-tight font-bold tracking-[-0.025em]">
            {person.name}
          </h2>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((x) => {
            const on = !off && p.from === x.from && p.to === x.to;
            return (
              <button
                key={x.id}
                type="button"
                aria-pressed={on}
                onClick={() => (
                  haptic("tick"),
                  setOff(false),
                  setP({ ...p, from: x.from, to: x.to })
                )}
                className={`press flex h-11 flex-col items-center justify-center rounded-full px-4 leading-tight ${on ? "bg-g-blue text-white" : "bg-g-fill"}`}
              >
                <span className="text-[13.5px] font-semibold">
                  {tr(x.label)}
                </span>
                <span
                  className={`text-[11px] tabular-nums ${on ? "text-white/75" : "text-g-muted"}`}
                >
                  {hm(x.from)}–{hm(x.to)}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={off}
            onClick={() => (haptic("tick"), setOff(true))}
            className={`press h-11 rounded-full px-4 text-[13.5px] font-semibold ${off ? "bg-g-ink text-white [[data-scheme=dark]_&]:bg-white [[data-scheme=dark]_&]:text-[#0b0b0f]" : "bg-g-fill"}`}
          >
            {tr("Day off")}
          </button>
        </div>
        <div
          className={`grid grid-cols-2 gap-2 transition-opacity ${off ? "opacity-40" : ""}`}
        >
          {(["from", "to"] as const).map((k) => (
            <div key={k} className="rounded-[22px] bg-g-fill p-3">
              <p className="text-[12px] font-semibold text-g-muted">
                {tr(k === "from" ? "From" : "To")}
              </p>
              <div className="mt-1 flex items-center justify-between">
                <button
                  type="button"
                  aria-label="−30"
                  onClick={() => nudge(k, -0.5)}
                  className="press grid size-9 place-items-center rounded-full bg-white [[data-scheme=dark]_&]:bg-g-card"
                >
                  <Minus size={16} />
                </button>
                <span className="text-[22px] font-bold tabular-nums">
                  {hm(p[k])}
                </span>
                <button
                  type="button"
                  aria-label="+30"
                  onClick={() => nudge(k, 0.5)}
                  className="press grid size-9 place-items-center rounded-full bg-white [[data-scheme=dark]_&]:bg-g-card"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div
          className={`flex flex-wrap gap-1.5 transition-opacity ${off ? "opacity-40" : ""}`}
        >
          {(["hall", "bar", "kitchen", "admin"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={p.station === s}
              onClick={() => (
                haptic("tick"),
                setOff(false),
                setP({ ...p, station: s })
              )}
              className={`press flex h-10 items-center gap-2 rounded-full px-3.5 text-[13.5px] font-semibold ${p.station === s ? "chip-blue" : "bg-g-fill"}`}
            >
              <span className={`size-2 rounded-full ${ST_BAR[s]}`} />{" "}
              {tr(ST_LABEL[s])}
            </button>
          ))}
        </div>
        {!off && (
          <p className="text-[13px] text-g-muted tabular-nums">
            {tr("{n} h on this day", { n: p.to - p.from })}
          </p>
        )}
      </div>
    </Sheet>
  );
}

/* ---------------------------------------------------------------- History */

function HistoryView({ owner, team }: { owner: boolean; team: Person[] }) {
  const tr = useTr();
  const history = historyStore.use();
  const [open, setOpen] = useState<string | null>(null);
  const last = history.slice(0, 14).reverse();
  const max = Math.max(...last.map((r) => (owner ? r.takings : r.bills)));
  const diffs = history.filter((r) => r.cashCounted !== r.cashExpected).length;
  const avgList = Math.round(
    history.reduce((n, r) => n + r.checklists, 0) / history.length,
  );
  const report = history.find((r) => r.id === open);
  return (
    <>
      <WidgetCard
        title={tr(owner ? "Takings by shift" : "Bills by shift")}
        icon={<CalendarCheck2 size={13} strokeWidth={2.4} />}
        aside={
          <span className="text-[12.5px] text-g-muted">
            {tr("{n} shifts", { n: last.length })}
          </span>
        }
      >
        <div className="mt-4 flex h-28 items-end gap-1.5">
          {last.map((r, i) => {
            const v = owner ? r.takings : r.bills;
            const bad = r.cashCounted !== r.cashExpected;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => (haptic("tick"), setOpen(r.id))}
                className="press group relative flex h-full flex-1 flex-col justify-end"
                aria-label={r.date}
              >
                <span
                  className={`block rounded-[6px] ${bad ? "bg-g-orange" : r.weekday >= 4 ? "bg-g-blue" : "bg-g-blue/45"}`}
                  style={{
                    height: `${(v / max) * 100}%`,
                    animation: `rise 0.5s ${i * 30}ms both cubic-bezier(0.22,1,0.36,1)`,
                  }}
                />
              </button>
            );
          })}
        </div>
        <div className="mt-1.5 flex justify-between text-[10.5px] text-g-faint">
          <span>{last[0]?.date}</span>
          <span>{last[last.length - 1]?.date}</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            [
              tr("Cash off"),
              tr("{n} of {m}", { n: diffs, m: history.length }),
              diffs ? "text-g-orange" : "",
            ],
            [tr("Checklists"), `${avgList}%`, ""],
            [tr("Closed at"), "23:46", ""],
          ].map(([k, v, c]) => (
            <div
              key={k}
              className="rounded-[16px] bg-white px-3 py-2 [[data-scheme=dark]_&]:bg-g-card"
            >
              <p className="text-[11.5px] text-g-muted">{k}</p>
              <p className={`live text-[15px] font-bold tabular-nums ${c}`}>
                {v}
              </p>
            </div>
          ))}
        </div>
      </WidgetCard>

      <div className="stagger grid gap-1.5">
        {history.map((r) => {
          const diff = r.cashCounted - r.cashExpected;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => (haptic("light"), setOpen(r.id))}
              className="press flex items-center gap-3 rounded-[20px] bg-g-fill px-3 py-2.5 text-left"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-white leading-none [[data-scheme=dark]_&]:bg-g-card">
                <span className="text-[16px] font-bold tabular-nums">
                  {r.date.split(" ")[0]}
                </span>
                <span className="text-[10px] text-g-muted uppercase">
                  {tr(r.date.split(" ")[1]!)}
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold tabular-nums">
                  {r.opened}–{r.closed} · @{r.by}
                </span>
                <span className="live block truncate text-[12.5px] text-g-muted tabular-nums">
                  {owner ? `${compactMoney(r.takings)} · ` : ""}
                  {tr("{n} bills", { n: r.bills })} ·{" "}
                  {tr("checklists {n}%", { n: r.checklists })}
                  {r.late
                    ? ` · ${tr("{n} came late|{n} came late", { n: r.late })}`
                    : ""}
                </span>
              </span>
              <span
                className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold tabular-nums ${diff ? "chip-orange" : "chip-green"}`}
              >
                {diff
                  ? `${diff > 0 ? "+" : "−"}${compactMoney(Math.abs(diff))}`
                  : tr("cash ok")}
              </span>
            </button>
          );
        })}
      </div>
      <p className="px-1 text-[12.5px] text-g-faint">
        {tr(
          "Shift reports are kept 10 years, like every bill. The full history is in the plan; see the retention rules.",
        )}
      </p>

      {report && (
        <Sheet
          open
          wide
          onClose={() => setOpen(null)}
          label={tr("Shift report")}
        >
          <div className="grid gap-4 px-5 pt-2 pb-10">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-semibold text-g-blue">
                  {report.id}
                </p>
                <h2 className="text-[28px] leading-tight font-bold tracking-[-0.025em]">
                  {report.date} · {report.opened}–{report.closed}
                </h2>
              </div>
              <span className="flex gap-1.5">
                <button
                  type="button"
                  aria-label={tr("Print")}
                  className="press grid size-10 place-items-center rounded-full bg-g-fill"
                >
                  <Printer size={17} />
                </button>
                <button
                  type="button"
                  aria-label={tr("Export")}
                  className="press grid size-10 place-items-center rounded-full bg-g-fill"
                >
                  <Download size={17} />
                </button>
              </span>
            </div>
            <ReportBody r={report} owner={owner} team={team} />
          </div>
        </Sheet>
      )}
    </>
  );
}

/** The Z-report: money, cash, people, checklists and what happened during the shift. */
function ReportBody({
  r,
  owner,
  team,
}: {
  r: ShiftReport;
  owner: boolean;
  team: Person[];
}) {
  const tr = useTr();
  const diff = r.cashCounted - r.cashExpected;
  const pays: [string, number, string][] = [
    ["VietQR", r.pay.vietqr, "#2f5bff"],
    [tr("Card"), r.pay.card, "#6c96ff"],
    [tr("Cash"), r.pay.cash, "#12a150"],
    ["MoMo", r.pay.momo, "#ef6c1a"],
  ];
  const total = pays.reduce((n, [, v]) => n + v, 0) || 1;
  return (
    <div className="grid gap-4 md:grid-cols-2 md:items-start">
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-2">
          {[
            ...(owner ? [[tr("Takings"), compactMoney(r.takings)]] : []),
            [tr("Bills"), String(r.bills)],
            [tr("Guests"), String(r.guests)],
            ...(owner
              ? [[tr("Tips"), compactMoney(r.tips)]]
              : [[tr("Hours worked"), tr("{n} h", { n: r.hours })]]),
          ].map(([k, v]) => (
            <div key={k} className="rounded-[20px] bg-g-fill p-3">
              <p className="text-[12px] font-semibold text-g-muted">{k}</p>
              <p className="live mt-1 text-[19px] font-bold tracking-[-0.02em] tabular-nums">
                {v}
              </p>
            </div>
          ))}
        </div>
        {owner && (
          <div className="rounded-[24px] bg-g-fill p-4">
            <p className="text-[13px] font-semibold text-g-ink-2">
              {tr("How guests paid")}
            </p>
            <div className="mt-2.5 flex h-3 overflow-hidden rounded-full">
              {pays.map(([k, v, c]) => (
                <span
                  key={k}
                  className="transition-[width] duration-500"
                  style={{ width: `${(v / total) * 100}%`, background: c }}
                />
              ))}
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5">
              {pays.map(([k, v, c]) => (
                <span
                  key={k}
                  className="flex items-center justify-between gap-2 text-[13px]"
                >
                  <span className="flex items-center gap-1.5 text-g-muted">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: c }}
                    />{" "}
                    {k}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {compactMoney(v)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
        <div
          className={`flex items-center gap-3 rounded-[24px] p-4 ${diff ? "chip-orange" : "chip-green"}`}
        >
          <Banknote size={22} strokeWidth={2} />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold">
              {diff
                ? tr("Difference {sum}", {
                    sum: `${diff > 0 ? "+" : "−"}${compactMoney(Math.abs(diff))}`,
                  })
                : tr("The cash matches")}
            </p>
            <p className="text-[12.5px] opacity-80 tabular-nums">
              {tr("expected {a} · counted {b}", {
                a: compactMoney(r.cashExpected),
                b: compactMoney(r.cashCounted),
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-[24px] bg-g-fill p-4">
          <Ring value={r.checklists / 100} size={52} />
          <div>
            <p className="text-[15px] font-semibold">
              {tr("Checklists {n}%", { n: r.checklists })}
            </p>
            <p className="text-[12.5px] text-g-muted">
              {r.late
                ? tr("{n} came late|{n} came late", { n: r.late })
                : tr("everyone on time")}
            </p>
          </div>
        </div>
      </div>
      <div className="grid gap-4">
        <div className="rounded-[24px] bg-g-fill p-4">
          <p className="text-[13px] font-semibold text-g-ink-2">{tr("Team")}</p>
          <div className="mt-2 grid gap-1.5">
            {r.people.map((x) => {
              const p = team.find((t) => t.id === x.id);
              if (!p) return null;
              return (
                <div key={x.id} className="flex items-center gap-2.5">
                  <span className="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-g-card text-[12px] font-bold">
                    <PersonPic p={p} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">
                    {p.name}
                  </span>
                  <span
                    className={`shrink-0 text-[13px] tabular-nums ${x.late ? "font-semibold text-g-orange" : "text-g-muted"}`}
                  >
                    {x.from}–{x.to}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-[24px] bg-g-fill p-4">
          <p className="text-[13px] font-semibold text-g-ink-2">
            {tr("What happened")}
          </p>
          <div className="relative mt-3 grid gap-3 pl-5">
            <span className="absolute top-1.5 bottom-1.5 left-[5px] w-px bg-g-line" />
            {r.events.map((e, i) => (
              <div key={i} className="relative">
                <span
                  className={`absolute top-1.5 -left-5 size-[11px] rounded-full border-2 border-[var(--g-fill)] ${e.tone === "warn" ? "bg-g-orange" : e.tone === "good" ? "bg-g-green" : "bg-g-blue"}`}
                />
                <p className="text-[12px] text-g-muted tabular-nums">{e.at}</p>
                <p className="text-[14px] font-medium">{tr(e.text)}</p>
              </div>
            ))}
          </div>
          {r.note && (
            <p className="mt-3 rounded-[16px] bg-white p-3 text-[13.5px] [[data-scheme=dark]_&]:bg-g-card">
              {r.note}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** A progress ring that draws itself in. */
export function Ring({
  value,
  size = 56,
  stroke = 7,
  color = "var(--color-g-green)",
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0 -rotate-90"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        className="text-g-card"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, value))}
        style={{
          transition: "stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1)",
          animation: "ring-in 0.9s cubic-bezier(0.22,1,0.36,1)",
          ["--ring-c" as string]: c,
        }}
      />
    </svg>
  );
}
