"use client";

import {
  CalendarClock,
  Camera,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Landmark,
  Plus,
  Receipt,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { haptic } from "@/lib/haptics";
import { TEAM } from "@/lib/demo-team";
import {
  BALANCES,
  entries,
  extraStore,
  lineAmount,
  MONTH_FULL,
  MONTHS,
  NOV_FORECAST,
  paidStore,
  PAYROLL,
  PNL,
  TAKINGS,
  UPCOMING,
  type Entry,
  type PnlLine,
} from "@/lib/demo-money";
import { Sheet } from "@/components/guest/ui";
import { WidgetCard } from "@/components/system/Widgets";
import { PersonPic } from "@/components/system/PersonPic";
import { Delta, ReportTable } from "@/components/system/ReportTable";
import { compactMoney as shortMoney } from "@/components/crew/CrewApp";
import { CountMoney } from "@/components/guest/motion";
import { useTr } from "@/components/crew/prefs";

/*
 * The owner's money (ADR-017, docs/07 §86). One month at a time, any month
 * back: the headline numbers against the month before, six months of profit,
 * the profit and loss as a real table (each line opens the operations it is
 * made of, and the owner adds expenses), money on hand and what is due,
 * payroll per person with paying out, and the taxes to set aside.
 */

/** A month's takings run into billions of dong: "1.29B ₫" reads faster than "1294M ₫". */
const money = (n: number) =>
  Math.abs(n) >= 1e9
    ? `${(n / 1e9).toFixed(2).replace(/\.?0+$/, "")}B ₫`
    : shortMoney(n);
const r1000 = (n: number) => Math.round(n / 1000) * 1000;
const full = (n: number) => `${Math.round(n).toLocaleString("en-US")} ₫`;
type Tab = "pnl" | "cash" | "payroll" | "tax";

export function FinanceAdmin({ notify }: { notify: (t: string) => void }) {
  const tr = useTr();
  const extra = extraStore.use();
  const paid = paidStore.use();
  const [m, setM] = useState(5);
  const [tab, setTab] = useState<Tab>("pnl");
  const [line, setLine] = useState<PnlLine | null>(null);
  const [adding, setAdding] = useState(false);
  const month = MONTHS[m]!;
  const extraSum = (mi: number, id: string) =>
    extra
      .filter((x) => x.m === mi && x.line === id)
      .reduce((n, x) => n + x.e.amount, 0);
  const amount = (l: PnlLine, mi: number) =>
    lineAmount(l, TAKINGS[mi]!, mi) + extraSum(mi, l.id);
  const costsOf = (mi: number) =>
    PNL.flatMap((g) => g.lines).reduce((n, l) => n + amount(l, mi), 0);
  const takings = TAKINGS[m]!;
  const prevTakings = m ? r1000(TAKINGS[m - 1]! * (m === 5 ? 14 / 31 : 1)) : 0;
  const costs = costsOf(m);
  const profit = takings - costs;
  const prevCosts = m ? r1000(costsOf(m - 1) * (m === 5 ? 14 / 31 : 1)) : 0;
  const prevProfit = prevTakings - prevCosts;
  const profits = MONTHS.map((_, i) => TAKINGS[i]! - costsOf(i));
  const maxT = Math.max(...TAKINGS);

  type Row = {
    id: string;
    label: string;
    now: number;
    prev: number;
    group?: boolean;
    line?: PnlLine;
    costs?: boolean;
  };
  const rows: Row[] = [
    {
      id: "takings",
      label: tr("Takings"),
      now: takings,
      prev: prevTakings,
      group: true,
    },
    ...PNL.flatMap((g) => {
      const ls = g.lines.map((l) => ({
        id: l.id,
        label: tr(l.label),
        now: amount(l, m),
        prev: m
          ? r1000(
              amount(l, m - 1) *
                (m === 5 && l.fixed === undefined ? 14 / 31 : m === 5 ? 14 / 30 : 1),
            )
          : 0,
        line: l,
        costs: true,
      }));
      return [
        {
          id: g.id,
          label: tr(g.label),
          now: ls.reduce((n, x) => n + x.now, 0),
          prev: ls.reduce((n, x) => n + x.prev, 0),
          group: true,
          costs: true,
        },
        ...ls,
      ];
    }),
    {
      id: "profit",
      label: tr("Profit"),
      now: profit,
      prev: prevProfit,
      group: true,
    },
  ];

  return (
    <div className="grid gap-5">
      {/* Month: back and forth through every month the venue has. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 rounded-full bg-g-fill p-1">
          <button
            type="button"
            aria-label={tr("Previous month")}
            disabled={!m}
            onClick={() => (haptic("tick"), setM(m - 1))}
            className="press grid size-9 place-items-center rounded-full disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <span
            key={m}
            className="animate-rise min-w-[136px] text-center text-[15px] font-semibold"
          >
            {tr(MONTH_FULL[month])} 2026
          </span>
          <button
            type="button"
            aria-label={tr("Next month")}
            disabled={m === 5}
            onClick={() => (haptic("tick"), setM(m + 1))}
            className="press grid size-9 place-items-center rounded-full disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </span>
        {m === 5 && (
          <span className="chip-blue rounded-full px-3 py-1.5 text-[12.5px] font-semibold">
            {tr("14 of 30 days · forecast {sum}", { sum: money(NOV_FORECAST) })}
          </span>
        )}
        <button
          type="button"
          onClick={() => (
            haptic("success"),
            notify(tr("Report saved: Excel for the accountant"))
          )}
          className="press ml-auto flex h-10 items-center gap-1.5 rounded-full bg-g-fill px-4 text-[14px] font-semibold"
        >
          <Download size={16} strokeWidth={2.2} className="text-g-blue" />{" "}
          {tr("For the accountant")}
        </button>
      </div>

      {/* Headline: four numbers against the same days of the month before. */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          [tr("Takings"), takings, prevTakings, false],
          [tr("Costs"), costs, prevCosts, true],
          [tr("Profit"), profit, prevProfit, false],
          [
            tr("Margin"),
            Math.round((profit / takings) * 1000) / 10,
            Math.round((prevProfit / Math.max(1, prevTakings)) * 1000) / 10,
            false,
          ],
        ].map(([k, v, p, c], i) => (
          <div key={k as string} className="rounded-[22px] bg-g-fill p-3.5">
            <p className="text-[12.5px] font-semibold text-g-muted">{k}</p>
            <p
              className={`live mt-1 text-[22px] leading-none font-bold tracking-[-0.03em] tabular-nums ${i === 2 ? "text-g-green" : ""}`}
            >
              {i === 3 ? (
                `${v}%`
              ) : (
                <CountMoney key={`${m}${i}`} to={v as number} format={money} />
              )}
            </p>
            <p className="mt-1.5 text-[12px]">
              {m ? (
                <Delta
                  now={v as number}
                  prev={p as number}
                  costs={c as boolean}
                />
              ) : null}{" "}
              <span className="text-g-muted">
                {m ? tr("vs {mon}", { mon: tr(MONTHS[m - 1]!) }) : ""}
              </span>
            </p>
          </div>
        ))}
      </div>

      {/* Six months: takings as a pale column, profit solid inside it. Tap a month to open it. */}
      <WidgetCard
        title={tr("Six months")}
        icon={<CalendarClock size={13} strokeWidth={2.4} />}
        aside={
          <span className="text-[12px] text-g-muted">
            {tr("takings and profit")}
          </span>
        }
      >
        <div className="mt-4 flex h-36 items-end gap-3">
          {MONTHS.map((mo, i) => (
            <button
              key={mo}
              type="button"
              onClick={() => (haptic("tick"), setM(i))}
              className="press flex h-full flex-1 flex-col items-center justify-end gap-1.5"
            >
              <span className="live text-[11px] font-semibold text-g-muted tabular-nums">
                {money(profits[i]!)}
              </span>
              <span
                className={`relative flex w-full max-w-[56px] items-end overflow-hidden rounded-[10px] ${i === m ? "bg-g-blue/25" : "bg-g-card"}`}
                style={{
                  height: `${(TAKINGS[i]! / maxT) * 78}%`,
                  animation: `rise 0.5s ${i * 50}ms both cubic-bezier(0.22,1,0.36,1)`,
                }}
              >
                <span
                  className={`w-full rounded-[10px] ${i === m ? "bg-g-blue" : "bg-g-blue/45"}`}
                  style={{
                    height: `${Math.max(4, (profits[i]! / TAKINGS[i]!) * 100)}%`,
                  }}
                />
              </span>
              <span
                className={`text-[12px] font-semibold ${i === m ? "text-g-blue" : "text-g-muted"}`}
              >
                {tr(mo)}
              </span>
            </button>
          ))}
        </div>
      </WidgetCard>

      <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5">
        {(
          [
            ["pnl", "Profit and loss"],
            ["cash", "Money and payments"],
            ["payroll", "Payroll"],
            ["tax", "Taxes"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={() => (haptic("tick"), setTab(id))}
            className={`press h-10 shrink-0 rounded-full px-4 text-[14px] font-semibold transition-colors ${tab === id ? "bg-g-ink text-white [[data-scheme=dark]_&]:bg-white [[data-scheme=dark]_&]:text-[#0b0b0f]" : "bg-g-fill text-g-ink-2"}`}
          >
            {tr(label)}
          </button>
        ))}
      </div>

      <div key={tab + m} className="animate-rise grid gap-4">
        {tab === "pnl" && (
          <>
            <ReportTable
              rows={rows}
              rowKey={(r) => r.id}
              onRow={(r) => r.line && setLine(r.line)}
              cols={[
                {
                  key: "label",
                  label: tr("Line"),
                  render: (r) => (
                    <span
                      className={
                        r.group ? "font-bold" : "pl-3 font-medium text-g-ink-2"
                      }
                    >
                      {r.label}
                    </span>
                  ),
                  width: 190,
                },
                {
                  key: "now",
                  label: tr(MONTHS[m]!),
                  render: (r) => (
                    <span className={r.group ? "font-bold" : ""}>
                      {r.costs ? "−" : ""}
                      {full(r.now)}
                    </span>
                  ),
                },
                {
                  key: "prev",
                  label: m ? tr(MONTHS[m - 1]!) : "—",
                  render: (r) => (
                    <span className="text-g-muted">
                      {m ? full(r.prev) : "—"}
                    </span>
                  ),
                },
                {
                  key: "d",
                  label: "Δ",
                  render: (r) =>
                    m ? (
                      <Delta now={r.now} prev={r.prev} costs={r.costs} />
                    ) : (
                      "—"
                    ),
                },
                {
                  key: "share",
                  label: tr("% of takings"),
                  render: (r) => (
                    <span className="text-g-muted">
                      {((r.now / takings) * 100).toFixed(1)}%
                    </span>
                  ),
                },
              ]}
            />
            <div className="flex flex-wrap items-center gap-2">
              <p className="flex-1 px-1 text-[12.5px] text-g-muted">
                {tr(
                  "Tap a line to see what it is made of. Kitchen and bar products come from received deliveries; wages from the payroll.",
                )}
              </p>
              <button
                type="button"
                onClick={() => (haptic("light"), setAdding(true))}
                className="blue-grad press flex h-11 items-center gap-2 rounded-full px-5 text-[14.5px] font-semibold"
              >
                <Plus size={17} strokeWidth={2.4} /> {tr("Add an expense")}
              </button>
            </div>
          </>
        )}

        {tab === "cash" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <WidgetCard
              title={tr("Money on hand")}
              icon={<Landmark size={13} strokeWidth={2.4} />}
              aside={
                <span className="live text-[13px] font-bold tabular-nums">
                  {money(BALANCES.reduce((n, b) => n + b.amount, 0))}
                </span>
              }
            >
              <div className="mt-2 grid gap-1">
                {BALANCES.map((b) => (
                  <div
                    key={b.label}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[14.5px] font-semibold">
                        {tr(b.label)}
                      </span>
                      <span className="block text-[12.5px] text-g-muted">
                        {tr(b.note)}
                      </span>
                    </span>
                    <span className="live shrink-0 text-[15px] font-semibold tabular-nums">
                      {full(b.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </WidgetCard>
            <WidgetCard
              title={tr("Coming up")}
              icon={<CalendarClock size={13} strokeWidth={2.4} />}
              aside={
                <span className="live text-[13px] font-bold tabular-nums">
                  −{money(UPCOMING.reduce((n, u) => n + u.amount, 0))}
                </span>
              }
            >
              <div className="mt-2 grid gap-1">
                {UPCOMING.map((u) => (
                  <div key={u.text} className="flex items-center gap-3 py-2">
                    <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-white text-center leading-none [[data-scheme=dark]_&]:bg-g-card">
                      <span>
                        <span className="block text-[15px] font-bold tabular-nums">
                          {u.date.split(" ")[0]}
                        </span>
                        <span className="text-[10px] text-g-muted uppercase">
                          {tr(u.date.split(" ")[1]!)}
                        </span>
                      </span>
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[14.5px] font-semibold">
                      {tr(u.text)}
                    </span>
                    <span className="live shrink-0 text-[14.5px] font-semibold tabular-nums">
                      −{money(u.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </WidgetCard>
          </div>
        )}

        {tab === "payroll" && (
          <>
            <ReportTable
              rows={PAYROLL}
              rowKey={(r) => r.id}
              initialSort={{ key: "total", dir: -1 }}
              cols={[
                {
                  key: "who",
                  label: tr("Person"),
                  value: (r) => TEAM.find((t) => t.id === r.id)!.name,
                  render: (r) => {
                    const p = TEAM.find((t) => t.id === r.id)!;
                    return (
                      <span className="flex items-center gap-2">
                        <span className="relative grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-g-card text-[11px] font-bold">
                          <PersonPic p={p} />
                        </span>
                        {p.name}
                      </span>
                    );
                  },
                  total: tr("Total"),
                  width: 130,
                },
                {
                  key: "role",
                  label: tr("Role"),
                  align: "left",
                  render: (r) => (
                    <span className="text-g-muted">{tr(r.role)}</span>
                  ),
                },
                {
                  key: "hours",
                  label: tr("Hours"),
                  value: (r) => r.hours,
                  total: PAYROLL.reduce((n, r) => n + r.hours, 0),
                },
                {
                  key: "rate",
                  label: tr("Per hour"),
                  value: (r) => r.rate,
                  render: (r) => r.rate.toLocaleString("en-US"),
                },
                {
                  key: "base",
                  label: tr("Base"),
                  value: (r) => r.hours * r.rate,
                  render: (r) => (r.hours * r.rate).toLocaleString("en-US"),
                  total: PAYROLL.reduce(
                    (n, r) => n + r.hours * r.rate,
                    0,
                  ).toLocaleString("en-US"),
                },
                {
                  key: "tips",
                  label: tr("Tips"),
                  value: (r) => r.tips,
                  render: (r) =>
                    r.tips ? r.tips.toLocaleString("en-US") : "—",
                  total: PAYROLL.reduce((n, r) => n + r.tips, 0).toLocaleString(
                    "en-US",
                  ),
                },
                {
                  key: "bonus",
                  label: tr("Quests"),
                  value: (r) => r.bonus,
                  render: (r) =>
                    r.bonus ? r.bonus.toLocaleString("en-US") : "—",
                },
                {
                  key: "total",
                  label: tr("To pay"),
                  value: (r) => r.hours * r.rate + r.tips + r.bonus,
                  render: (r) => (
                    <b>
                      {(r.hours * r.rate + r.tips + r.bonus).toLocaleString(
                        "en-US",
                      )}
                    </b>
                  ),
                  total: PAYROLL.reduce(
                    (n, r) => n + r.hours * r.rate + r.tips + r.bonus,
                    0,
                  ).toLocaleString("en-US"),
                },
                {
                  key: "st",
                  label: tr("Status"),
                  align: "left",
                  render: (r) => (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${paid.includes(r.id) ? "chip-green" : "chip-orange"}`}
                    >
                      {tr(paid.includes(r.id) ? "Paid" : "To pay")}
                    </span>
                  ),
                },
              ]}
            />
            <div className="flex flex-wrap items-center gap-2">
              <p className="flex-1 px-1 text-[12.5px] text-g-muted">
                {tr(
                  "Hours come from clock-ins; tips from the waiters' bills; quest bonuses from finished quests. 1–15 November.",
                )}
              </p>
              <button
                type="button"
                disabled={paid.length === PAYROLL.length}
                onClick={() => (
                  haptic("success"),
                  paidStore.set(PAYROLL.map((p) => p.id)),
                  notify(tr("Paid out · payslips sent to the team"))
                )}
                className="blue-grad press flex h-11 items-center gap-2 rounded-full px-5 text-[14.5px] font-semibold transition-opacity disabled:bg-none disabled:bg-g-fill disabled:text-g-muted"
              >
                <Wallet size={17} strokeWidth={2.2} /> {tr("Pay out the rest")}
              </button>
            </div>
          </>
        )}

        {tab === "tax" && (
          <ReportTable
            rows={[
              {
                id: "vat-out",
                label: tr("VAT on sales (8%)"),
                sub: tr("from {n} e-invoices", { n: 1204 }),
                amount: Math.round((takings / 1.08) * 0.08),
                due: tr("by the 20th of next month"),
              },
              {
                id: "vat-in",
                label: tr("VAT on purchases"),
                sub: tr("from supplier e-invoices"),
                amount: -Math.round(amount(PNL[0]!.lines[0]!, m) * 0.05),
                due: tr("deducted"),
              },
              {
                id: "pit",
                label: tr("Personal income tax withheld"),
                sub: tr("from wages over the threshold"),
                amount: 6_850_000,
                due: tr("by the 20th of next month"),
              },
              {
                id: "si",
                label: tr("Social insurance"),
                sub: tr("21.5% employer + 10.5% staff"),
                amount: Math.round(amount(PNL[1]!.lines[2]!, m) * 1.5),
                due: tr("by the last day of the month"),
              },
            ]}
            rowKey={(r) => r.id}
            cols={[
              {
                key: "label",
                label: tr("Tax"),
                render: (r) => (
                  <span>
                    <span className="block">{r.label}</span>
                    <span className="block text-[12px] font-normal text-g-muted">
                      {r.sub}
                    </span>
                  </span>
                ),
                width: 220,
                total: tr("To pay"),
              },
              {
                key: "amount",
                label: tr("Amount"),
                value: (r) => r.amount,
                render: (r) => full(r.amount),
                total: (
                  <span className="text-[#e5484d]">
                    {full(
                      Math.round((takings / 1.08) * 0.08) -
                        Math.round(amount(PNL[0]!.lines[0]!, m) * 0.05) +
                        6_850_000 +
                        Math.round(amount(PNL[1]!.lines[2]!, m) * 1.5),
                    )}
                  </span>
                ),
              },
              {
                key: "due",
                label: tr("When"),
                align: "left",
                render: (r) => <span className="text-g-muted">{r.due}</span>,
              },
            ]}
          />
        )}
      </div>

      {line && (
        <LineSheet
          line={line}
          m={m}
          total={amount(line, m)}
          extra={extra
            .filter((x) => x.m === m && x.line === line.id)
            .map((x) => x.e)}
          onClose={() => setLine(null)}
          onAdd={() => (setLine(null), setAdding(true))}
        />
      )}
      {adding && (
        <ExpenseSheet
          onClose={() => setAdding(false)}
          onSave={(lineId, e) => {
            extraStore.set([...extra, { m, line: lineId, e }]);
            haptic("success");
            notify(tr("Expense added · the profit is recounted"));
            setAdding(false);
          }}
        />
      )}
    </div>
  );
}

/** What a P&L line is made of: every operation, with its document. */
function LineSheet({
  line,
  m,
  total,
  extra,
  onClose,
  onAdd,
}: {
  line: PnlLine;
  m: number;
  total: number;
  extra: Entry[];
  onClose: () => void;
  onAdd: () => void;
}) {
  const tr = useTr();
  const ops = [
    ...extra,
    ...entries(line.id, total - extra.reduce((n, e) => n + e.amount, 0), m),
  ];
  return (
    <Sheet open wide onClose={onClose} label={tr(line.label)}>
      <div className="grid gap-4 px-5 pt-2 pb-10">
        <div>
          <p className="text-[13px] font-semibold text-g-blue">
            {tr(MONTH_FULL[MONTHS[m]!])} 2026 ·{" "}
            {tr("{n} operations", { n: ops.length })}
          </p>
          <h2 className="text-[28px] leading-tight font-bold tracking-[-0.025em]">
            {tr(line.label)}
          </h2>
          <p className="live text-[22px] font-bold tabular-nums">
            −{full(total)}
          </p>
        </div>
        <ReportTable
          rows={ops.map((o, i) => ({ ...o, i }))}
          rowKey={(r) => String(r.i)}
          dense
          cols={[
            {
              key: "date",
              label: tr("Date"),
              render: (r) =>
                r.date.split(" ")[0] + " " + tr(r.date.split(" ")[1]!),
              width: 70,
            },
            {
              key: "who",
              label: tr("To whom"),
              align: "left",
              render: (r) => (
                <span>
                  <span className="block font-medium">{tr(r.who)}</span>
                  {r.text && (
                    <span className="block text-[12px] text-g-muted">
                      {tr(r.text)}
                    </span>
                  )}
                </span>
              ),
            },
            {
              key: "doc",
              label: tr("Document"),
              align: "left",
              render: (r) =>
                r.doc ? (
                  <span className="chip-green inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-semibold">
                    <FileText size={12} /> {r.doc}
                  </span>
                ) : (
                  <span className="text-g-faint">—</span>
                ),
            },
            {
              key: "amount",
              label: tr("Amount"),
              value: (r) => r.amount,
              render: (r) => `−${full(r.amount)}`,
              total: `−${full(total)}`,
            },
          ]}
        />
        <button
          type="button"
          onClick={onAdd}
          className="press flex h-12 items-center justify-center gap-2 rounded-full bg-g-fill text-[15px] font-semibold"
        >
          <Plus size={17} strokeWidth={2.4} className="text-g-blue" />{" "}
          {tr("Add an expense")}
        </button>
      </div>
    </Sheet>
  );
}

function ExpenseSheet({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (line: string, e: Entry) => void;
}) {
  const tr = useTr();
  const lines = PNL.flatMap((g) => g.lines);
  const [lineId, setLineId] = useState("supplies");
  const [sum, setSum] = useState("");
  const [who, setWho] = useState("");
  const [photo, setPhoto] = useState(false);
  const ok = Number(sum) > 0 && who.trim().length > 1;
  return (
    <Sheet
      open
      onClose={onClose}
      label={tr("Add an expense")}
      footer={
        <button
          type="button"
          disabled={!ok}
          onClick={() =>
            onSave(lineId, {
              date: "14 Nov",
              who: who.trim(),
              text: "",
              amount: Number(sum),
              doc: photo ? "receipt" : undefined,
            })
          }
          className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold transition-opacity disabled:opacity-40"
        >
          {tr("Save")}
        </button>
      }
    >
      <div className="grid gap-5 px-5 pt-2 pb-10">
        <h2 className="text-[28px] leading-tight font-bold tracking-[-0.025em]">
          {tr("Add an expense")}
        </h2>
        <label className="block">
          <span className="px-1 text-[13px] font-semibold text-g-ink-2">
            {tr("Amount")}
          </span>
          <span className="mt-1.5 flex h-14 items-center gap-2 rounded-[20px] bg-g-fill px-4">
            <input
              autoFocus
              inputMode="numeric"
              value={sum ? Number(sum).toLocaleString("en-US") : ""}
              onChange={(e) => setSum(e.target.value.replace(/\D/g, ""))}
              placeholder="0"
              className="min-w-0 flex-1 bg-transparent text-[22px] font-bold outline-none tabular-nums"
            />
            <span className="text-[16px] text-g-muted">₫</span>
          </span>
        </label>
        <div>
          <p className="mb-2 px-1 text-[13px] font-semibold text-g-ink-2">
            {tr("Line")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {lines.map((l) => (
              <button
                key={l.id}
                type="button"
                aria-pressed={lineId === l.id}
                onClick={() => (haptic("tick"), setLineId(l.id))}
                className={`press h-9 rounded-full px-3.5 text-[13px] font-semibold ${lineId === l.id ? "chip-blue" : "bg-g-fill text-g-ink-2"}`}
              >
                {tr(l.label)}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="px-1 text-[13px] font-semibold text-g-ink-2">
            {tr("To whom")}
          </span>
          <input
            value={who}
            onChange={(e) => setWho(e.target.value)}
            placeholder={tr("Fridge repair")}
            className="mt-1.5 h-12 w-full rounded-[20px] bg-g-fill px-4 text-[15px] outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => (haptic("light"), setPhoto(!photo))}
          className={`press flex h-12 items-center justify-center gap-2 rounded-full text-[14.5px] font-semibold ${photo ? "chip-green" : "bg-g-fill"}`}
        >
          {photo ? (
            <Receipt size={17} />
          ) : (
            <Camera size={17} className="text-g-blue" />
          )}{" "}
          {tr(photo ? "Receipt attached" : "Photo of the receipt")}
        </button>
      </div>
    </Sheet>
  );
}
