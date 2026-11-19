"use client";

import {
  ChevronLeft,
  ChevronRight,
  Download,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { Menu, MenuItem } from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import { TEAM } from "@/lib/demo-team";
import {
  dayDate,
  dayTakings,
  PERIOD_DAYS,
  REFUNDS,
  rnd,
  type Period,
} from "@/lib/demo-money";
import { RECIPES, STOCK } from "@/lib/demo-stock";
import { Sheet } from "@/components/guest/ui";
import { WidgetCard } from "@/components/system/Widgets";
import { PersonPic } from "@/components/system/PersonPic";
import { Delta, ReportTable } from "@/components/system/ReportTable";
import { compactMoney } from "@/components/crew/CrewApp";
import { useDish, useLocale, useTr } from "@/components/crew/prefs";

/*
 * Reports (docs/07 §86): pick a period (day to year) and step back through
 * them, every number against the period before. Eight reports, each a real
 * table that sorts and opens its breakdown: overview, sales by day, dishes
 * (ABC with cost and margin from the tech cards), categories, people,
 * payments with fees, busy hours as a week heat map, discounts and refunds.
 */

type Report =
  | "overview"
  | "sales"
  | "dishes"
  | "cats"
  | "staff"
  | "pay"
  | "hours"
  | "refunds";
const REPORTS: [Report, string][] = [
  ["overview", "Overview"],
  ["sales", "Sales by day"],
  ["dishes", "Dishes"],
  ["cats", "Categories"],
  ["staff", "People"],
  ["pay", "Payments"],
  ["hours", "Busy hours"],
  ["refunds", "Discounts and refunds"],
];
const full = (n: number) => Math.round(n).toLocaleString("en-US");

type DishRow = {
  it: MenuItem;
  cat: string;
  qty: number;
  revenue: number;
  cost: number;
  margin: number;
  pct: number;
  share: number;
  abc: "A" | "B" | "C";
  prevQty: number;
};

export function ReportsAdmin({
  menu,
  notify,
}: {
  menu: Menu;
  notify: (t: string) => void;
}) {
  const tr = useTr();
  const dish = useDish();
  const locale = useLocale();
  const [period, setPeriod] = useState<Period>("month");
  const [back, setBack] = useState(0);
  const [report, setReport] = useState<Report>("overview");
  const [cat, setCat] = useState("all");
  const [open, setOpen] = useState<DishRow | null>(null);
  const [day, setDay] = useState<number | null>(null);
  const len = PERIOD_DAYS[period];
  const start = back * len; // days back from today where this period ends
  const days = Array.from({ length: len }, (_, i) => start + len - 1 - i); // oldest first
  const sumDays = (from: number) =>
    Array.from({ length: len }, (_, i) => dayTakings(from + i)).reduce(
      (a, b) => a + b,
      0,
    );
  const takings = sumDays(start);
  const prev = sumDays(start + len);
  const bills = Math.round(takings / 1_020_000);
  const prevBills = Math.round(prev / 1_000_000);
  const tips = Math.round(takings * 0.055);
  const label = (() => {
    const end = dayDate(start);
    const from = dayDate(start + len - 1);
    const f = (d: Date, o: Intl.DateTimeFormatOptions) =>
      d.toLocaleDateString(locale, o);
    if (period === "day")
      return f(end, { weekday: "short", day: "numeric", month: "long" });
    if (period === "year")
      return `${f(from, { month: "short", year: "numeric" })} – ${f(end, { month: "short", year: "numeric" })}`;
    return `${f(from, { day: "numeric", month: "short" })} – ${f(end, { day: "numeric", month: "short" })}`;
  })();

  // Dishes: quantity per period from popularity and price, cost from tech cards where they exist.
  const dishes = useMemo<DishRow[]>(() => {
    const cats = menu.categories;
    const rows = cats.flatMap((c) =>
      c.items
        .filter((i) => i.price > 0)
        .map((it) => {
          const pop = 0.2 + rnd(it.id) * 1.6;
          const per = (base: number) =>
            Math.round(
              ((base * pop * 9_000_000) / Math.max(it.price, 40_000)) *
                (0.9 + rnd(it.id + period + back) * 0.2),
            );
          const qty = Math.max(1, per(len / 7));
          const prevQty = Math.max(
            1,
            Math.round(qty * (0.85 + rnd(it.id + "p" + back) * 0.3)),
          );
          const recipe = RECIPES.find(
            (r) => r.dish.toLowerCase() === dish(it.name).toLowerCase(),
          );
          const unitCost = recipe
            ? recipe.uses.reduce(
                (n, [id, q]) =>
                  n + (STOCK.find((s) => s.id === id)?.cost ?? 0) * q,
                0,
              )
            : it.price * (0.24 + rnd(it.id + "c") * 0.14);
          const revenue = qty * it.price;
          const cost = Math.round(qty * unitCost);
          return {
            it,
            cat: dish(c.name),
            qty,
            revenue,
            cost,
            margin: revenue - cost,
            pct: Math.round(((revenue - cost) / revenue) * 100),
            share: 0,
            abc: "C" as const,
            prevQty,
          };
        }),
    );
    const total = rows.reduce((n, r) => n + r.revenue, 0);
    const sorted = [...rows].sort((a, b) => b.revenue - a.revenue);
    const cum = sorted.map(
      (_, i) =>
        sorted.slice(0, i + 1).reduce((n, r) => n + r.revenue, 0) / total,
    );
    return sorted.map((r, i) => ({
      ...r,
      share: (r.revenue / total) * 100,
      abc: cum[i]! <= 0.8 ? "A" : cum[i]! <= 0.95 ? "B" : "C",
    }));
  }, [menu, dish, period, back, len]);
  const dishTotal = dishes.reduce((n, r) => n + r.revenue, 0);
  const catRows = menu.categories
    .map((c) => {
      const rs = dishes.filter((d) => d.cat === dish(c.name));
      return {
        id: c.id,
        name: dish(c.name),
        qty: rs.reduce((n, r) => n + r.qty, 0),
        revenue: rs.reduce((n, r) => n + r.revenue, 0),
        cost: rs.reduce((n, r) => n + r.cost, 0),
        dishes: rs.length,
      };
    })
    .filter((c) => c.revenue > 0);
  const staff = TEAM.filter(
    (p) => p.roles.includes("waiter") || p.roles.includes("bartender"),
  ).map((p, i) => {
    const share = [0.31, 0.27, 0.16, 0.12, 0.1][i] ?? 0.04;
    const rev = Math.round(takings * share);
    const hours = Math.round((len / 7) * (38 + rnd(p.id) * 10));
    const b = Math.max(1, Math.round(rev / 1_020_000));
    return {
      p,
      rev,
      bills: b,
      avg: Math.round(rev / b),
      tips: Math.round(rev * 0.055),
      hours,
      perHour: Math.round(rev / Math.max(1, hours)),
      upsell: Math.round(18 + rnd(p.id + "u") * 22),
      rating: (4.5 + rnd(p.id + "r") * 0.5).toFixed(1),
      prev: Math.round(rev * (0.88 + rnd(p.id + back) * 0.24)),
    };
  });
  const pays = [
    { id: "vietqr", name: "VietQR", share: 0.46, fee: 0, when: tr("same day") },
    {
      id: "card",
      name: tr("Card"),
      share: 0.28,
      fee: 0.022,
      when: tr("next working day"),
    },
    {
      id: "cash",
      name: tr("Cash"),
      share: 0.21,
      fee: 0,
      when: tr("counted at closing"),
    },
    {
      id: "momo",
      name: "MoMo",
      share: 0.05,
      fee: 0.015,
      when: tr("every Monday"),
    },
  ];
  const sales = days.map((d) => {
    const t = dayTakings(d);
    const bl = Math.round(t / 1_020_000);
    return {
      d,
      date: dayDate(d),
      takings: t,
      bills: bl,
      guests: Math.round(bl * 2.4),
      avg: Math.round(t / bl),
      tips: Math.round(t * 0.055),
      prev: dayTakings(d + 7),
    };
  });
  const grow = [...dishes].sort(
    (a, b) => b.qty / b.prevQty - a.qty / a.prevQty,
  );

  return (
    <div className="grid gap-5">
      {/* Period: length, then step back through them. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="no-scrollbar flex overflow-x-auto rounded-full bg-g-fill p-1">
          {(["day", "week", "month", "quarter", "year"] as const).map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={period === p}
              onClick={() => (haptic("tick"), setPeriod(p), setBack(0))}
              className={`h-9 shrink-0 rounded-full px-3.5 text-[13.5px] font-semibold transition-colors ${period === p ? "bg-white text-g-ink shadow-[0_1px_3px_rgba(11,11,15,0.12)] [[data-scheme=dark]_&]:bg-g-card" : "text-g-muted"}`}
            >
              {tr(
                p === "day"
                  ? "Day"
                  : p === "week"
                    ? "Week"
                    : p === "month"
                      ? "Month"
                      : p === "quarter"
                        ? "Quarter"
                        : "Year",
              )}
            </button>
          ))}
        </div>
        <span className="flex items-center gap-1">
          <button
            type="button"
            aria-label={tr("Earlier")}
            onClick={() => (haptic("tick"), setBack(back + 1))}
            className="press grid size-9 place-items-center rounded-full bg-g-fill"
          >
            <ChevronLeft size={17} />
          </button>
          <span
            key={label}
            className="animate-rise min-w-[150px] text-center text-[14px] font-semibold capitalize"
          >
            {label}
          </span>
          <button
            type="button"
            aria-label={tr("Later")}
            disabled={!back}
            onClick={() => (haptic("tick"), setBack(back - 1))}
            className="press grid size-9 place-items-center rounded-full bg-g-fill disabled:opacity-30"
          >
            <ChevronRight size={17} />
          </button>
        </span>
        <button
          type="button"
          onClick={() => (
            haptic("success"),
            notify(tr("Report saved: Excel for the accountant"))
          )}
          className="press ml-auto flex h-10 items-center gap-1.5 rounded-full bg-g-fill px-4 text-[14px] font-semibold"
        >
          <Download size={16} strokeWidth={2.2} className="text-g-blue" />{" "}
          {tr("Export")}
        </button>
      </div>

      {/* Every number against the period before; tap one to open its report. */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {(
          [
            [tr("Takings"), compactMoney(takings), takings, prev, "sales"],
            [tr("Bills"), String(bills), bills, prevBills, "sales"],
            [
              tr("Avg check"),
              compactMoney(takings / bills),
              takings / bills,
              prev / prevBills,
              "staff",
            ],
            [
              tr("Food cost"),
              `${Math.round((dishes.reduce((n, d) => n + d.cost, 0) / dishTotal) * 100)}%`,
              0,
              0,
              "dishes",
            ],
          ] as const
        ).map(([k, v, n, p, to]) => (
          <button
            key={k}
            type="button"
            onClick={() => (haptic("light"), setReport(to))}
            className="press rounded-[22px] bg-g-fill p-3.5 text-left"
          >
            <p className="text-[12.5px] font-semibold text-g-muted">{k}</p>
            <p className="live mt-1 text-[22px] leading-none font-bold tracking-[-0.03em] tabular-nums">
              {v}
            </p>
            <p className="mt-1.5 text-[12px]">
              {p ? (
                <Delta now={n} prev={p} />
              ) : (
                <span className="text-g-muted">{tr("target under 32%")}</span>
              )}
            </p>
          </button>
        ))}
      </div>

      <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5">
        {REPORTS.map(([id, name]) => (
          <button
            key={id}
            type="button"
            aria-pressed={report === id}
            onClick={() => (haptic("tick"), setReport(id))}
            className={`press h-10 shrink-0 rounded-full px-4 text-[14px] font-semibold transition-colors ${report === id ? "bg-g-ink text-white [[data-scheme=dark]_&]:bg-[#fff] [[data-scheme=dark]_&]:text-[#0b0b0f]" : "bg-g-fill text-g-ink-2"}`}
          >
            {tr(name)}
          </button>
        ))}
      </div>

      <div key={report + period + back} className="animate-rise grid gap-4">
        {report === "overview" && (
          <>
            <WidgetCard
              title={tr("Takings by day")}
              icon={<TrendingUp size={13} strokeWidth={2.4} />}
              aside={<Delta now={takings} prev={prev} />}
            >
              <div className="mt-4 flex h-32 items-end gap-[3px]">
                {sales.slice(-Math.min(sales.length, 60)).map((s, i) => (
                  <button
                    key={s.d}
                    type="button"
                    aria-label={s.date.toDateString()}
                    onClick={() => (haptic("tick"), setDay(s.d))}
                    className="press flex h-full flex-1 items-end"
                  >
                    <span
                      className={`block w-full rounded-[4px] ${s.date.getDay() === 0 || s.date.getDay() === 6 ? "bg-g-blue" : "bg-g-blue/45"}`}
                      style={{
                        height: `${(s.takings / 70e6) * 100}%`,
                        animation: `rise 0.4s ${Math.min(i, 30) * 15}ms both cubic-bezier(0.22,1,0.36,1)`,
                      }}
                    />
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[12px] text-g-muted">
                {tr(
                  "Weekends in solid blue. Tap a day for its hours and payments.",
                )}
              </p>
            </WidgetCard>
            <div className="grid gap-4 md:grid-cols-2">
              <WidgetCard
                title={tr("Growing")}
                icon={<TrendingUp size={13} strokeWidth={2.4} />}
              >
                <div className="mt-2 grid gap-1">
                  {grow.slice(0, 4).map((d) => (
                    <button
                      key={d.it.id}
                      type="button"
                      onClick={() => setOpen(d)}
                      className="press flex items-center justify-between gap-3 py-1.5 text-left"
                    >
                      <span className="truncate text-[14.5px] font-semibold">
                        {dish(d.it.name)}
                      </span>
                      <span className="shrink-0 text-[13px]">
                        <Delta now={d.qty} prev={d.prevQty} />
                      </span>
                    </button>
                  ))}
                </div>
              </WidgetCard>
              <WidgetCard
                title={tr("Falling")}
                icon={<TrendingDown size={13} strokeWidth={2.4} />}
              >
                <div className="mt-2 grid gap-1">
                  {grow
                    .slice(-4)
                    .reverse()
                    .map((d) => (
                      <button
                        key={d.it.id}
                        type="button"
                        onClick={() => setOpen(d)}
                        className="press flex items-center justify-between gap-3 py-1.5 text-left"
                      >
                        <span className="truncate text-[14.5px] font-semibold">
                          {dish(d.it.name)}
                        </span>
                        <span className="shrink-0 text-[13px]">
                          <Delta now={d.qty} prev={d.prevQty} />
                        </span>
                      </button>
                    ))}
                </div>
              </WidgetCard>
            </div>
            <div className="flex items-start gap-3 rounded-[22px] bg-g-fill p-4">
              <span className="blue-grad grid size-9 shrink-0 place-items-center rounded-full">
                <Sparkles size={16} />
              </span>
              <p className="text-[14px] leading-snug">
                {tr(
                  "Yan: {a} sells well but earns little ({p}% margin). {b} is in class C: consider taking it off the menu.",
                  {
                    a: dish(
                      [...dishes]
                        .filter((d) => d.abc === "A")
                        .sort((x, y) => x.pct - y.pct)[0]?.it.name ??
                        dishes[0]!.it.name,
                    ),
                    p:
                      [...dishes]
                        .filter((d) => d.abc === "A")
                        .sort((x, y) => x.pct - y.pct)[0]?.pct ?? 0,
                    b: dish(dishes[dishes.length - 1]!.it.name),
                  },
                )}
              </p>
            </div>
          </>
        )}

        {report === "sales" && (
          <ReportTable
            rows={[...sales].reverse()}
            rowKey={(r) => String(r.d)}
            onRow={(r) => setDay(r.d)}
            cols={[
              {
                key: "date",
                label: tr("Day"),
                value: (r) => -r.d,
                render: (r) => (
                  <span className="capitalize">
                    {r.date.toLocaleDateString(locale, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                ),
                total: tr("Total"),
                width: 110,
              },
              {
                key: "takings",
                label: tr("Takings"),
                value: (r) => r.takings,
                render: (r) => full(r.takings),
                total: full(takings),
              },
              {
                key: "vs",
                label: tr("vs week before"),
                render: (r) => <Delta now={r.takings} prev={r.prev} />,
              },
              {
                key: "bills",
                label: tr("Bills"),
                value: (r) => r.bills,
                total: sales.reduce((n, r) => n + r.bills, 0),
              },
              {
                key: "guests",
                label: tr("Guests"),
                value: (r) => r.guests,
                total: sales.reduce((n, r) => n + r.guests, 0),
              },
              {
                key: "avg",
                label: tr("Avg check"),
                value: (r) => r.avg,
                render: (r) => full(r.avg),
              },
              {
                key: "tips",
                label: tr("Tips"),
                value: (r) => r.tips,
                render: (r) => full(r.tips),
                total: full(tips),
              },
            ]}
          />
        )}

        {report === "dishes" && (
          <>
            <div className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5">
              {[
                { id: "all", name: tr("All") },
                { id: "A", name: tr("Class A") },
                { id: "C", name: tr("Class C") },
                ...menu.categories.map((c) => ({
                  id: dish(c.name),
                  name: dish(c.name),
                })),
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={cat === c.id}
                  onClick={() => (haptic("tick"), setCat(c.id))}
                  className={`press h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold ${cat === c.id ? "chip-blue" : "bg-g-fill text-g-ink-2"}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
            <ReportTable
              rows={dishes.filter(
                (d) => cat === "all" || d.abc === cat || d.cat === cat,
              )}
              rowKey={(r) => r.it.id}
              onRow={setOpen}
              initialSort={{ key: "revenue", dir: -1 }}
              cols={[
                {
                  key: "name",
                  label: tr("Dish"),
                  value: (r) => dish(r.it.name),
                  render: (r) => (
                    <span className="block max-w-[180px] truncate">
                      {dish(r.it.name)}
                    </span>
                  ),
                  total: tr("Total"),
                  width: 150,
                },
                {
                  key: "abc",
                  label: "ABC",
                  value: (r) => r.abc,
                  render: (r) => (
                    <span
                      className={`inline-grid size-6 place-items-center rounded-full text-[11.5px] font-bold ${r.abc === "A" ? "chip-green" : r.abc === "B" ? "chip-blue" : "chip-orange"}`}
                    >
                      {r.abc}
                    </span>
                  ),
                },
                {
                  key: "qty",
                  label: tr("Sold"),
                  value: (r) => r.qty,
                  total: dishes
                    .reduce((n, r) => n + r.qty, 0)
                    .toLocaleString("en-US"),
                },
                {
                  key: "revenue",
                  label: tr("Takings"),
                  value: (r) => r.revenue,
                  render: (r) => full(r.revenue),
                  total: full(dishTotal),
                },
                {
                  key: "cost",
                  label: tr("Cost"),
                  value: (r) => r.cost,
                  render: (r) => (
                    <span className="text-g-muted">{full(r.cost)}</span>
                  ),
                },
                {
                  key: "margin",
                  label: tr("Margin"),
                  value: (r) => r.margin,
                  render: (r) => full(r.margin),
                },
                {
                  key: "pct",
                  label: tr("Margin %"),
                  value: (r) => r.pct,
                  render: (r) => (
                    <span
                      className={
                        r.pct < 62 ? "font-semibold text-g-orange" : ""
                      }
                    >
                      {r.pct}%
                    </span>
                  ),
                },
                {
                  key: "share",
                  label: tr("Share"),
                  value: (r) => r.share,
                  render: (r) => `${r.share.toFixed(1)}%`,
                },
              ]}
            />
            <p className="px-1 text-[12.5px] text-g-muted">
              {tr(
                "A: the dishes that make 80% of takings, B: the next 15%, C: the last 5%. Cost comes from the tech card; margin under 62% is orange.",
              )}
            </p>
          </>
        )}

        {report === "cats" && (
          <ReportTable
            rows={catRows}
            rowKey={(r) => r.id}
            onRow={(r) => (setCat(r.name), setReport("dishes"))}
            initialSort={{ key: "revenue", dir: -1 }}
            cols={[
              {
                key: "name",
                label: tr("Category"),
                value: (r) => r.name,
                total: tr("Total"),
                width: 140,
              },
              { key: "dishes", label: tr("Dishes"), value: (r) => r.dishes },
              { key: "qty", label: tr("Sold"), value: (r) => r.qty },
              {
                key: "revenue",
                label: tr("Takings"),
                value: (r) => r.revenue,
                render: (r) => full(r.revenue),
                total: full(dishTotal),
              },
              {
                key: "share",
                label: tr("Share"),
                value: (r) => r.revenue,
                render: (r) => (
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-block h-1.5 w-16 overflow-hidden rounded-full bg-g-card">
                      <span
                        className="block h-full rounded-full bg-g-blue"
                        style={{
                          width: `${(r.revenue / dishTotal) * 100 * 2.5}%`,
                        }}
                      />
                    </span>
                    {((r.revenue / dishTotal) * 100).toFixed(1)}%
                  </span>
                ),
              },
              {
                key: "fc",
                label: tr("Food cost"),
                value: (r) => r.cost / r.revenue,
                render: (r) => `${Math.round((r.cost / r.revenue) * 100)}%`,
              },
            ]}
          />
        )}

        {report === "staff" && (
          <ReportTable
            rows={staff}
            rowKey={(r) => r.p.id}
            initialSort={{ key: "rev", dir: -1 }}
            cols={[
              {
                key: "name",
                label: tr("Person"),
                value: (r) => r.p.name,
                render: (r) => (
                  <span className="flex items-center gap-2">
                    <span className="relative grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-g-card text-[11px] font-bold">
                      <PersonPic p={r.p} />
                    </span>
                    {r.p.name}
                  </span>
                ),
                total: tr("Total"),
                width: 120,
              },
              {
                key: "rev",
                label: tr("Takings"),
                value: (r) => r.rev,
                render: (r) => full(r.rev),
                total: full(staff.reduce((n, r) => n + r.rev, 0)),
              },
              {
                key: "vs",
                label: "Δ",
                render: (r) => <Delta now={r.rev} prev={r.prev} />,
              },
              { key: "bills", label: tr("Bills"), value: (r) => r.bills },
              {
                key: "avg",
                label: tr("Avg check"),
                value: (r) => r.avg,
                render: (r) => full(r.avg),
              },
              { key: "hours", label: tr("Hours"), value: (r) => r.hours },
              {
                key: "ph",
                label: tr("Per hour"),
                value: (r) => r.perHour,
                render: (r) => full(r.perHour),
              },
              {
                key: "up",
                label: tr("Upsell"),
                value: (r) => r.upsell,
                render: (r) => `${r.upsell}%`,
              },
              {
                key: "tips",
                label: tr("Tips"),
                value: (r) => r.tips,
                render: (r) => full(r.tips),
              },
              {
                key: "rating",
                label: tr("Rating"),
                value: (r) => Number(r.rating),
              },
            ]}
          />
        )}

        {report === "pay" && (
          <>
            <div className="flex h-4 overflow-hidden rounded-full">
              {pays.map((p, i) => (
                <span
                  key={p.id}
                  style={{
                    width: `${p.share * 100}%`,
                    background: ["#2f5bff", "#6c96ff", "#12a150", "#ef6c1a"][i],
                  }}
                />
              ))}
            </div>
            <ReportTable
              rows={pays}
              rowKey={(r) => r.id}
              cols={[
                {
                  key: "name",
                  label: tr("Method"),
                  value: (r) => r.name,
                  total: tr("Total"),
                  width: 100,
                },
                {
                  key: "bills",
                  label: tr("Bills"),
                  value: (r) => r.share,
                  render: (r) => Math.round(bills * r.share),
                  total: bills,
                },
                {
                  key: "sum",
                  label: tr("Amount"),
                  value: (r) => r.share,
                  render: (r) => full(takings * r.share),
                  total: full(takings),
                },
                {
                  key: "share",
                  label: tr("Share"),
                  render: (r) => `${Math.round(r.share * 100)}%`,
                },
                {
                  key: "fee",
                  label: tr("Fee"),
                  render: (r) =>
                    r.fee ? (
                      <span className="text-[#e5484d]">
                        −{full(takings * r.share * r.fee)}
                      </span>
                    ) : (
                      <span className="text-g-faint">0</span>
                    ),
                  total: (
                    <span className="text-[#e5484d]">
                      −
                      {full(
                        pays.reduce((n, p) => n + takings * p.share * p.fee, 0),
                      )}
                    </span>
                  ),
                },
                {
                  key: "net",
                  label: tr("You get"),
                  render: (r) => full(takings * r.share * (1 - r.fee)),
                },
                {
                  key: "when",
                  label: tr("When"),
                  align: "left",
                  render: (r) => <span className="text-g-muted">{r.when}</span>,
                },
              ]}
            />
          </>
        )}

        {report === "hours" && (
          <WidgetCard
            title={tr("Busy hours")}
            icon={<TrendingUp size={13} strokeWidth={2.4} />}
            aside={
              <span className="text-[12px] text-g-muted">
                {tr("average takings per hour")}
              </span>
            }
          >
            <div className="no-scrollbar -mx-[18px] mt-3 overflow-x-auto px-[18px]">
              <div className="grid min-w-[560px] grid-cols-[34px_repeat(14,minmax(0,1fr))] gap-[3px]">
                <span />
                {Array.from({ length: 14 }, (_, h) => (
                  <span
                    key={h}
                    className="text-center text-[10.5px] text-g-faint tabular-nums"
                  >
                    {h + 10}
                  </span>
                ))}
                {[1, 2, 3, 4, 5, 6, 0].map((wd) => (
                  <div key={wd} className="contents">
                    <span className="self-center text-[11.5px] font-semibold text-g-muted capitalize">
                      {new Date(2026, 10, 8 + wd).toLocaleDateString(locale, {
                        weekday: "short",
                      })}
                    </span>
                    {Array.from({ length: 14 }, (_, h) => {
                      const hour = h + 10;
                      const curve =
                        Math.exp(-((hour - 13) ** 2) / 3) * 0.7 +
                        Math.exp(-((hour - 20) ** 2) / 4);
                      const v =
                        curve *
                        (wd === 5 || wd === 6 || wd === 0 ? 1.3 : 1) *
                        (0.85 + rnd(`${wd}${h}`) * 0.3);
                      return (
                        <span
                          key={h}
                          title={`${hour}:00 · ${compactMoney(v * 6e6)}`}
                          className="h-8 rounded-[6px] bg-g-blue"
                          style={{
                            opacity: 0.08 + Math.min(1, v / 1.4) * 0.92,
                            animation: `rise 0.4s ${(wd * 14 + h) * 6}ms both cubic-bezier(0.22,1,0.36,1)`,
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-3 text-[12.5px] text-g-muted">
              {tr(
                "Darker is busier. Use it for the schedule: Friday and Saturday 19–21 need two people in the hall.",
              )}
            </p>
          </WidgetCard>
        )}

        {report === "refunds" && (
          <ReportTable
            rows={REFUNDS}
            rowKey={(r) => String(r.bill)}
            cols={[
              {
                key: "date",
                label: tr("Date"),
                render: (r) =>
                  `${r.date.split(" ")[0]} ${tr(r.date.split(" ")[1]!)}`,
                total: tr("Total"),
                width: 70,
              },
              {
                key: "kind",
                label: tr("Type"),
                align: "left",
                render: (r) => (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[12px] font-semibold ${r.kind === "refund" ? "chip-red" : "chip-blue"}`}
                  >
                    {tr(r.kind === "refund" ? "Refund" : "Discount")}
                  </span>
                ),
              },
              { key: "bill", label: tr("Bill"), render: (r) => `#${r.bill}` },
              {
                key: "reason",
                label: tr("Reason"),
                align: "left",
                render: (r) => (
                  <span className="font-normal">{tr(r.reason)}</span>
                ),
              },
              {
                key: "who",
                label: tr("Who"),
                align: "left",
                render: (r) => <span className="text-g-blue">@{r.who}</span>,
              },
              {
                key: "amount",
                label: tr("Amount"),
                value: (r) => r.amount,
                render: (r) => `−${full(r.amount)}`,
                total: (
                  <span className="text-[#e5484d]">
                    −{full(REFUNDS.reduce((n, r) => n + r.amount, 0))}
                  </span>
                ),
              },
            ]}
          />
        )}
      </div>

      {open && <DishSheet d={open} len={len} onClose={() => setOpen(null)} />}
      {day !== null && <DaySheet back={day} onClose={() => setDay(null)} />}
    </div>
  );
}

/** One dish: how it sells day by day, who sells it, what it costs to make, what Yan suggests. */
function DishSheet({
  d,
  len,
  onClose,
}: {
  d: DishRow;
  len: number;
  onClose: () => void;
}) {
  const tr = useTr();
  const dish = useDish();
  const name = dish(d.it.name);
  const recipe = RECIPES.find(
    (r) => r.dish.toLowerCase() === name.toLowerCase(),
  );
  const n = Math.min(len, 30);
  const daily = Array.from({ length: n }, (_, i) =>
    Math.max(0, Math.round((d.qty / len) * (0.5 + rnd(d.it.id + i) * 1.1))),
  );
  const max = Math.max(1, ...daily);
  const unit = d.cost / d.qty;
  const sellers = TEAM.filter(
    (p) => p.roles.includes("waiter") || p.roles.includes("bartender"),
  ).slice(0, 4);
  return (
    <Sheet open wide onClose={onClose} label={name}>
      <div className="grid gap-4 px-5 pt-2 pb-10 md:grid-cols-2 md:items-start">
        <div className="grid gap-4">
          <div>
            <p className="text-[13px] font-semibold text-g-blue">
              {d.cat} · {tr("class {c}", { c: d.abc })}
            </p>
            <h2 className="text-[28px] leading-tight font-bold tracking-[-0.025em]">
              {name}
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              [
                tr("Sold"),
                String(d.qty),
                <Delta key="d" now={d.qty} prev={d.prevQty} />,
              ],
              [
                tr("Takings"),
                compactMoney(d.revenue),
                `${d.share.toFixed(1)}% ${tr("of all")}`,
              ],
              [
                tr("Price"),
                compactMoney(d.it.price),
                `${tr("costs")} ${compactMoney(unit)}`,
              ],
              [tr("Margin"), `${d.pct}%`, compactMoney(d.margin)],
            ].map(([k, v, s], i) => (
              <div key={i} className="rounded-[20px] bg-g-fill p-3">
                <p className="text-[12px] font-semibold text-g-muted">{k}</p>
                <p className="live mt-1 text-[19px] font-bold tabular-nums">
                  {v}
                </p>
                <p className="text-[12px] text-g-muted">{s}</p>
              </div>
            ))}
          </div>
          <WidgetCard
            title={tr("Sold by day")}
            icon={<TrendingUp size={13} strokeWidth={2.4} />}
          >
            <div className="mt-3 flex h-24 items-end gap-[3px]">
              {daily.map((v, i) => (
                <span
                  key={i}
                  className="flex-1 rounded-[4px] bg-g-blue/70"
                  style={{
                    height: `${(v / max) * 100}%`,
                    animation: `rise 0.4s ${i * 15}ms both cubic-bezier(0.22,1,0.36,1)`,
                  }}
                />
              ))}
            </div>
          </WidgetCard>
        </div>
        <div className="grid gap-4">
          <div className="rounded-[24px] bg-g-fill p-4">
            <p className="text-[13px] font-semibold text-g-ink-2">
              {tr("Tech card · one portion")}
            </p>
            {recipe ? (
              <div className="mt-2 grid gap-1.5">
                {recipe.uses.map(([id, q]) => {
                  const s = STOCK.find((x) => x.id === id)!;
                  return (
                    <div
                      key={id}
                      className="flex justify-between gap-2 text-[14px]"
                    >
                      <span>{tr(s.name)}</span>
                      <span className="text-g-muted tabular-nums">
                        {q} {tr(s.unit)} · {compactMoney(s.cost * q)}
                      </span>
                    </div>
                  );
                })}
                <div className="mt-1 flex justify-between border-t border-g-line pt-2 text-[14px] font-bold">
                  <span>{tr("Cost of a portion")}</span>
                  <span className="tabular-nums">{compactMoney(unit)}</span>
                </div>
              </div>
            ) : (
              <p className="mt-2 text-[13.5px] text-g-muted">
                {tr(
                  "No tech card yet: the cost is estimated from the category. Add one in Stock to see the real margin.",
                )}
              </p>
            )}
          </div>
          <div className="rounded-[24px] bg-g-fill p-4">
            <p className="text-[13px] font-semibold text-g-ink-2">
              {tr("Who sells it")}
            </p>
            <div className="mt-2 grid gap-2">
              {sellers.map((p, i) => {
                const q = Math.round(d.qty * [0.38, 0.3, 0.2, 0.12][i]!);
                return (
                  <div key={p.id} className="flex items-center gap-2.5">
                    <span className="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-g-card text-[12px] font-bold">
                      <PersonPic p={p} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex justify-between text-[14px]">
                        <span className="font-semibold">{p.name}</span>
                        <span className="tabular-nums">{q}</span>
                      </span>
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-g-card">
                        <span
                          className="block h-full rounded-full bg-g-blue"
                          style={{ width: `${(q / d.qty) * 100}%` }}
                        />
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-[22px] bg-g-fill p-4">
            <span className="blue-grad grid size-9 shrink-0 place-items-center rounded-full">
              <Sparkles size={16} />
            </span>
            <p className="text-[14px] leading-snug">
              {d.pct < 62
                ? tr(
                    "Yan: the margin is low. +10% on the price keeps it under similar dishes and adds {sum} a month.",
                    { sum: compactMoney(d.revenue * 0.1 * (30 / len)) },
                  )
                : d.abc === "C"
                  ? tr(
                      "Yan: few people order it. Put it in the Mystery dish deck or take it off the menu.",
                    )
                  : tr(
                      "Yan: a strong dish. Make it a quest for the waiters to sell more.",
                    )}
            </p>
          </div>
        </div>
      </div>
    </Sheet>
  );
}

/** One day: takings by hour and how it was paid. */
function DaySheet({ back, onClose }: { back: number; onClose: () => void }) {
  const tr = useTr();
  const locale = useLocale();
  const t = dayTakings(back);
  const hours = Array.from({ length: 14 }, (_, h) => {
    const hour = h + 10;
    return (
      Math.exp(-((hour - 13) ** 2) / 3) * 0.7 +
      Math.exp(-((hour - 20) ** 2) / 4) * (0.85 + rnd(`${back}${h}`) * 0.3)
    );
  });
  const sum = hours.reduce((a, b) => a + b, 0);
  const max = Math.max(...hours);
  return (
    <Sheet open onClose={onClose} label={tr("Day")}>
      <div className="grid gap-4 px-5 pt-2 pb-10">
        <div>
          <p className="text-[13px] font-semibold text-g-blue capitalize">
            {dayDate(back).toLocaleDateString(locale, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <h2 className="text-[30px] leading-tight font-bold tracking-[-0.025em] tabular-nums">
            {full(t)} ₫
          </h2>
          <p className="text-[14px] text-g-muted">
            {tr("{n} bills", { n: Math.round(t / 1_020_000) })} ·{" "}
            <Delta now={t} prev={dayTakings(back + 7)} /> {tr("vs week before")}
          </p>
        </div>
        <WidgetCard
          title={tr("By hour")}
          icon={<TrendingUp size={13} strokeWidth={2.4} />}
        >
          <div className="mt-3 flex h-28 items-end gap-1">
            {hours.map((v, i) => (
              <span
                key={i}
                className="flex flex-1 flex-col items-center justify-end gap-1"
              >
                <span
                  className="w-full rounded-[5px] bg-g-blue/70"
                  style={{
                    height: `${(v / max) * 100}%`,
                    animation: `rise 0.4s ${i * 20}ms both cubic-bezier(0.22,1,0.36,1)`,
                  }}
                />
                <span className="text-[10px] text-g-faint tabular-nums">
                  {i + 10}
                </span>
              </span>
            ))}
          </div>
          <p className="mt-2 text-[12.5px] text-g-muted">
            {tr("Peak at {h}:00 · {sum}", {
              h: hours.indexOf(max) + 10,
              sum: compactMoney((max / sum) * t),
            })}
          </p>
        </WidgetCard>
      </div>
    </Sheet>
  );
}
