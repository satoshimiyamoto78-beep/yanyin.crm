"use client";

import { Download, Landmark, PiggyBank, Wallet } from "lucide-react";
import { useState } from "react";
import { haptic } from "@/lib/haptics";
import { TEAM } from "@/lib/demo-team";
import { IconStat, WidgetCard } from "@/components/system/Widgets";
import { PersonPic } from "@/components/system/PersonPic";
import { compactMoney as shortMoney } from "@/components/crew/CrewApp";
import { CountMoney } from "@/components/guest/motion";
import { useTr } from "@/components/crew/prefs";

/*
 * The owner's money: the month's profit and loss, what the team is paid, the
 * tax to set aside and where the takings land. Only the owner opens this; the
 * admin runs the floor, the menu and the stock without seeing the books.
 * Demo numbers; the backend sums bills, purchases, payroll and fixed costs.
 */

type Range = "month" | "last";
/** A month's takings run into billions of dong: "1.29B ₫" reads faster than "1294M ₫". */
const compactMoney = (n: number) =>
  Math.abs(n) >= 1e9
    ? `${(n / 1e9).toFixed(2).replace(/\.?0+$/, "")}B ₫`
    : shortMoney(n);

const PNL: Record<
  Range,
  {
    takings: number;
    food: number;
    payroll: number;
    purchases: number;
    rent: number;
    utilities: number;
    fees: number;
  }
> = {
  month: {
    takings: 1_294_000_000,
    food: 401_000_000,
    payroll: 262_000_000,
    purchases: 38_000_000,
    rent: 120_000_000,
    utilities: 34_000_000,
    fees: 17_000_000,
  },
  last: {
    takings: 1_156_000_000,
    food: 374_000_000,
    payroll: 251_000_000,
    purchases: 41_000_000,
    rent: 120_000_000,
    utilities: 31_000_000,
    fees: 15_000_000,
  },
};

/** Base pay and tips this month, by person (the waiter's tips come from their bills). */
const PAY: [string, number, number, number][] = [
  ["staff-huong", 22_000_000, 0, 182],
  ["staff-dima", 24_000_000, 0, 196],
  ["staff-linh", 9_500_000, 6_800_000, 168],
  ["staff-minh", 9_500_000, 5_900_000, 160],
  ["staff-thao", 10_000_000, 3_100_000, 171],
  ["staff-lan", 12_000_000, 0, 158],
  ["staff-an", 9_000_000, 2_200_000, 120],
  ["staff-tuan", 9_000_000, 1_900_000, 104],
];

export function FinanceAdmin({ notify }: { notify: (t: string) => void }) {
  const tr = useTr();
  const [range, setRange] = useState<Range>("month");
  const p = PNL[range];
  const prev = PNL.last;
  const costs: [string, number][] = [
    [tr("Food cost"), p.food],
    [tr("Payroll"), p.payroll],
    [tr("Rent"), p.rent],
    [tr("Utilities"), p.utilities],
    [tr("Supplies and repairs"), p.purchases],
    [tr("Bank and card fees"), p.fees],
  ];
  const spent = costs.reduce((n, [, v]) => n + v, 0);
  const profit = p.takings - spent;
  const vat = Math.round((p.takings / 1.08) * 0.08);
  const margin = Math.round((profit / p.takings) * 100);
  const growth = Math.round(
    ((PNL.month.takings - prev.takings) / prev.takings) * 100,
  );
  const payTotal = PAY.reduce((n, [, b, t]) => n + b + t, 0);
  const landed: [string, number, string][] = [
    [tr("Bank account · VietQR"), 0.46, tr("same day")],
    [tr("Cards · acquirer"), 0.28, tr("next working day")],
    [tr("Cash in the safe"), 0.21, tr("counted at closing")],
    [tr("MoMo wallet"), 0.05, tr("every Monday")],
  ];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-full bg-g-fill p-1">
          {(["month", "last"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => (haptic("tick"), setRange(r))}
              aria-pressed={range === r}
              className={`h-10 rounded-full px-4 text-[14px] font-semibold transition-colors ${range === r ? "bg-white text-g-ink shadow-[0_1px_3px_rgba(11,11,15,0.12)]" : "text-g-muted"}`}
            >
              {tr(r === "month" ? "This month" : "Last month")}
            </button>
          ))}
        </div>
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <IconStat
          art="sales"
          title={tr("Takings")}
          value={compactMoney(p.takings)}
          sub={
            range === "month"
              ? tr("+{n}% to last month", { n: growth })
              : tr("October")
          }
        />
        <IconStat
          art="tips"
          title={tr("Profit")}
          value={compactMoney(profit)}
          sub={tr("{n}% of takings", { n: margin })}
        />
        <IconStat
          art="salad"
          title={tr("Food cost")}
          value={`${Math.round((p.food / p.takings) * 100)}%`}
          sub={tr("target under 32%")}
        />
        <IconStat
          art="guests"
          title={tr("Payroll")}
          value={compactMoney(p.payroll)}
          sub={tr("{n}% of takings", {
            n: Math.round((p.payroll / p.takings) * 100),
          })}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Profit and loss: takings on top, each cost as a share of them, what is left at the bottom. */}
        <WidgetCard
          title={tr("Profit and loss")}
          icon={<PiggyBank size={13} strokeWidth={2.4} />}
        >
          <div className="mt-3 flex items-baseline justify-between gap-3">
            <span className="text-[14.5px] font-semibold">{tr("Takings")}</span>
            <span className="live text-[17px] font-bold tabular-nums">
              <CountMoney key={range} to={p.takings} format={compactMoney} />
            </span>
          </div>
          <div className="stagger mt-3 grid gap-2.5">
            {costs.map(([label, v]) => (
              <div key={label}>
                <span className="flex justify-between gap-2 text-[14px]">
                  <span className="truncate text-g-ink-2">{label}</span>
                  <span className="live shrink-0 text-g-muted tabular-nums">
                    −{compactMoney(v)}
                  </span>
                </span>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-g-card">
                  <span
                    className="block h-full rounded-full bg-g-blue/70 transition-[width] duration-500"
                    style={{ width: `${(v / p.takings) * 100}%` }}
                  />
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-g-line pt-3">
            <span className="text-[15px] font-bold">{tr("Profit")}</span>
            <span className="live text-[20px] font-bold tracking-[-0.02em] text-g-green tabular-nums">
              <CountMoney key={range} to={profit} format={compactMoney} />
            </span>
          </div>
        </WidgetCard>

        <div className="grid gap-4">
          <WidgetCard
            title={tr("Where the money lands")}
            icon={<Landmark size={13} strokeWidth={2.4} />}
          >
            <div className="mt-2 grid gap-1">
              {landed.map(([label, share, when]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 py-1.5"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[14.5px] font-semibold">
                      {label}
                    </span>
                    <span className="block text-[12.5px] text-g-muted">
                      {when}
                    </span>
                  </span>
                  <span className="live shrink-0 text-[15px] font-semibold tabular-nums">
                    {compactMoney(Math.round(p.takings * share))}
                  </span>
                </div>
              ))}
            </div>
          </WidgetCard>
          <WidgetCard
            title={tr("Taxes to set aside")}
            icon={<Wallet size={13} strokeWidth={2.4} />}
          >
            <div className="mt-2 flex items-center justify-between gap-3 py-1.5">
              <span className="min-w-0">
                <span className="block text-[14.5px] font-semibold">
                  {tr("VAT 8%")}
                </span>
                <span className="block text-[12.5px] text-g-muted">
                  {tr("from e-invoices · due by the 20th")}
                </span>
              </span>
              <span className="live shrink-0 text-[15px] font-semibold tabular-nums">
                {compactMoney(vat)}
              </span>
            </div>
          </WidgetCard>
        </div>
      </div>

      <WidgetCard
        title={tr("Payroll and tips")}
        icon={<Wallet size={13} strokeWidth={2.4} />}
        aside={
          <span className="live text-[13px] font-semibold text-g-muted tabular-nums">
            {compactMoney(payTotal)}
          </span>
        }
      >
        <div className="stagger mt-2 grid gap-1 md:grid-cols-2 md:gap-x-6">
          {PAY.map(([id, base, tips, hours]) => {
            const person = TEAM.find((t) => t.id === id)!;
            return (
              <div key={id} className="flex items-center gap-3 py-1.5">
                <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-g-card text-[15px] font-bold">
                  <PersonPic p={person} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">
                    {person.name}
                  </span>
                  <span className="block text-[12.5px] text-g-muted tabular-nums">
                    {tr("{h} h", { h: hours })}
                    {tips > 0 &&
                      ` · ${tr("tips {sum}", { sum: compactMoney(tips) })}`}
                  </span>
                </span>
                <span className="live shrink-0 text-[15px] font-semibold tabular-nums">
                  {compactMoney(base + tips)}
                </span>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => (
            haptic("success"),
            notify(tr("Payslips sent to the team"))
          )}
          className="press mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white text-[14.5px] font-semibold"
        >
          {tr("Send payslips")}
        </button>
      </WidgetCard>
    </div>
  );
}
