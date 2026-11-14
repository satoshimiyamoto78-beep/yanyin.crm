"use client";

import { Banknote, CalendarDays, Check, CreditCard, Download, FileCheck2, Printer, QrCode, RotateCcw, TrendingUp, Users, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { formatMoney, type Menu, type MenuItem } from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import { ticketTotal, type ClosedOrder, type FloorData, type FloorTable, type PayMethod } from "@/lib/demo-floor";
import { Sheet } from "@/components/guest/ui";
import { BrandQr, DataTable, EmptyState, Group, ListRow, Row, TextArea, Toolbar } from "@/components/system/Kit";
import { BarsWidget, DaysCompareWidget, IconStat } from "@/components/system/Widgets";
import { compactMoney } from "@/components/crew/CrewApp";
import { useDish, useLocale, useTr } from "@/components/crew/prefs";

/*
 * The admin's floor, orders and reports (docs/09 §9–11). Floor: zones and
 * tables with their state, a table page with its QR code, printing all QR
 * codes. Orders: today's journal (open tables and closed bills), a bill page
 * with the e-invoice and refunds with a reason. Reports: takings by day and by
 * hour, top dishes, waiters, how guests paid.
 */

const METHOD: Record<PayMethod, { label: string; icon: typeof Banknote }> = {
  cash: { label: "Cash", icon: Banknote },
  card: { label: "Card", icon: CreditCard },
  vietqr: { label: "VietQR", icon: QrCode },
  momo: { label: "MoMo", icon: Wallet },
};
const total5 = (o: ClosedOrder) => o.subtotal + Math.round(o.subtotal * 0.05) + o.tip;

/* ---------------------------------------------------------------- Floor */

export function FloorAdmin({ floor, notify }: { floor: FloorData; notify: (t: string) => void }) {
  const tr = useTr();
  const [zone, setZone] = useState<"all" | "Hall" | "Terrace">("all");
  const [open, setOpen] = useState<number | null>(null);
  const [print, setPrint] = useState(false);
  const money = (n: number) => formatMoney(n, floor.venue.currency, "en");
  const tables = floor.tables.filter((t) => zone === "all" || t.zone === zone);
  const busy = floor.tables.filter((t) => t.status !== "free" && t.status !== "reserved").length;
  const tone = (t: FloorTable) => (t.status === "free" ? "chip-gray" : t.status === "reserved" ? "chip-blue" : t.status === "bill" ? "chip-orange" : "chip-green");
  const word = (t: FloorTable) => (t.status === "free" ? tr("Free") : t.status === "reserved" ? tr("Booked") : t.status === "bill" ? tr("Wants the bill") : t.status === "seated" ? tr("Ready to order") : tr("Eating"));
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <IconStat art="tables" title={tr("Busy now")} value={`${busy}/${floor.tables.length}`} sub={tr("tables")} />
        <IconStat art="check" title={tr("Want the bill")} value={String(floor.tables.filter((t) => t.status === "bill").length)} sub={tr("tables")} />
        <IconStat art="bookings" title={tr("Booked")} value={String(floor.tables.filter((t) => t.status === "reserved").length)} sub={tr("for later today")} />
        <IconStat art="seats" title={tr("Seats")} value={String(floor.tables.reduce((n, t) => n + t.seats, 0))} sub={tr("in two zones")} />
      </div>
      <div className="mt-6 flex items-center gap-2">
        {(["all", "Hall", "Terrace"] as const).map((z) => (
          <button key={z} type="button" aria-pressed={zone === z} onClick={() => (haptic("tick"), setZone(z))} className={`press h-10 rounded-full px-4 text-[14px] font-semibold transition-colors ${zone === z ? "bg-g-ink text-white" : "bg-g-fill text-g-ink-2"}`}>
            {z === "all" ? tr("All zones") : tr(z)}
          </button>
        ))}
        <button type="button" onClick={() => (haptic("light"), setPrint(true))} className="press ml-auto flex h-10 items-center gap-1.5 rounded-full bg-g-fill px-4 text-[14px] font-semibold">
          <Printer size={16} strokeWidth={2.2} className="text-g-blue" /> <span className="hidden sm:inline">{tr("Print QR codes")}</span>
          <span className="sm:hidden">QR</span>
        </button>
      </div>
      {/* The floor as a grid of round-cornered tables, coloured by state; tap one for its page. */}
      <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
        {tables.map((t) => {
          const sum = Math.round(ticketTotal(t.lines) * 1.05);
          return (
            <button key={t.no} type="button" onClick={() => (haptic("light"), setOpen(t.no))} className="press flex aspect-square flex-col justify-between rounded-[24px] bg-g-fill p-3 text-left">
              <span className="flex items-start justify-between">
                <span className="text-[26px] leading-none font-bold tabular-nums">{t.no}</span>
                <span className={`grid size-7 place-items-center rounded-full text-[11px] font-bold ${tone(t)}`}>{t.seats}</span>
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[12px] font-semibold text-g-ink-2">{word(t)}</span>
                <span className="block truncate text-[12px] text-g-muted tabular-nums">{sum ? compactMoney(sum) : tr(t.zone)}</span>
              </span>
            </button>
          );
        })}
      </div>

      {open !== null && <TablePage t={floor.tables.find((x) => x.no === open)!} word={word} money={money} onClose={() => setOpen(null)} />}
      {print && (
        <PrintQr
          tables={floor.tables}
          onClose={() => setPrint(false)}
          onPrint={() => {
            notify(tr("Sent {n} QR codes to print", { n: floor.tables.length }));
            setPrint(false);
          }}
        />
      )}
    </div>
  );
}

function TablePage({ t, word, money, onClose }: { t: FloorTable; word: (t: FloorTable) => string; money: (n: number) => string; onClose: () => void }) {
  const tr = useTr();
  const sum = Math.round(ticketTotal(t.lines) * 1.05);
  return (
    <Sheet open wide onClose={onClose} label={tr("Table {n}", { n: t.no })}>
      <div className="grid gap-5 px-5 pt-2 pb-10 md:grid-cols-[1fr_280px] md:items-start">
        <div className="grid gap-4">
          <div>
            <h2 className="text-[30px] leading-tight font-bold tracking-[-0.025em]">{tr("Table {n}", { n: t.no })}</h2>
            <p className="text-[14px] text-g-muted">
              {tr(t.zone)} · {tr("{n} seat|{n} seats", { n: t.seats })} · {word(t)}
            </p>
          </div>
          <Group>
            <Row icon={Users} title={t.guests ? tr("{n} guest|{n} guests", { n: t.guests }) : tr("No guests")} sub={t.since ? tr("Seated at {t}", { t: t.since }) : t.booking ? `${t.booking.name} · ${t.booking.time}` : tr("Waiting for guests")} />
            <Row icon={Wallet} title={sum ? money(sum) : tr("Nothing ordered")} sub={tr("{n} dish|{n} dishes", { n: t.lines.reduce((n, l) => n + l.qty, 0) })} />
          </Group>
        </div>
        <div className="card flex flex-col items-center rounded-[26px] p-5 text-center">
          <BrandQr value={`https://yanyin.app/m/samarkand?table=${t.no}`} size={176} label={tr("Table QR code")} />
          <p className="mt-3 text-[15px] font-bold">{tr("Guests scan it to order")}</p>
          <p className="mt-0.5 text-[12.5px] text-g-muted">yanyin.app/m/samarkand?table={t.no}</p>
        </div>
      </div>
    </Sheet>
  );
}

function PrintQr({ tables, onClose, onPrint }: { tables: FloorTable[]; onClose: () => void; onPrint: () => void }) {
  const tr = useTr();
  return (
    <Sheet
      open
      wide
      onClose={onClose}
      label={tr("Print QR codes")}
      footer={
        <button type="button" onClick={() => (haptic("success"), onPrint())} className="blue-grad press flex h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-semibold">
          <Printer size={18} strokeWidth={2.2} /> {tr("Print {n} cards", { n: tables.length })}
        </button>
      }
    >
      <div className="px-5 pt-2 pb-10">
        <p className="text-[14px] text-g-muted">{tr("A6 table cards: the code, the table number and \"Scan to order\". Laminate them or put them in stands.")}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {tables.map((t) => (
            <div key={t.no} className="flex flex-col items-center rounded-[22px] bg-white p-3 text-[#0b0b0f] shadow-[0_1px_3px_rgba(11,11,15,0.1),0_10px_24px_-16px_rgba(11,11,15,0.3)]">
              <BrandQr value={`https://yanyin.app/m/samarkand?table=${t.no}`} size={112} label={tr("Table QR code")} />
              <p className="mt-2 text-[22px] leading-none font-bold">{t.no}</p>
              <p className="mt-1 text-[11px] font-semibold tracking-[0.06em] uppercase opacity-60">{tr("Scan to order")}</p>
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

/* ---------------------------------------------------------------- Orders */

type Bill = { id: string; table: number; at: string; total: number; method?: PayMethod; guests: number; state: "open" | "paid" | "refund"; lines: ClosedOrder["lines"]; tip: number; subtotal: number; waiter: string };

export function OrdersAdmin({ floor, menu, notify }: { floor: FloorData; menu: Menu; notify: (t: string) => void }) {
  const tr = useTr();
  const dish = useDish();
  const money = (n: number) => formatMoney(n, floor.venue.currency, "en");
  const items = useMemo(() => new Map(menu.categories.flatMap((c) => c.items).map((i) => [i.id, i])), [menu]);
  const [refunds, setRefunds] = useState<Record<string, { reason: string; amount: number }>>({});
  const bills: Bill[] = useMemo(
    () => [
      ...floor.tables
        .filter((t) => t.lines.length)
        .map((t) => ({ id: `T${t.no}`, table: t.no, at: t.since ?? "12:00", total: Math.round(ticketTotal(t.lines) * 1.05), guests: t.guests, state: "open" as const, lines: t.lines, tip: 0, subtotal: ticketTotal(t.lines), waiter: t.no % 2 ? "linh" : "minh" })),
      ...floor.history.map((o) => ({ id: String(o.id), table: o.table, at: o.closedAt, total: total5(o), method: o.method, guests: o.guests, state: (refunds[String(o.id)] ? "refund" : "paid") as Bill["state"], lines: o.lines, tip: o.tip, subtotal: o.subtotal, waiter: o.table % 2 ? "linh" : "minh" })),
    ],
    [floor, refunds],
  );
  const [q, setQ] = useState("");
  const [f, setF] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const rows = bills.filter((b) => (f === "all" || b.state === f) && (!q || `${b.id} ${b.table} ${b.waiter}`.includes(q.trim().replace("#", ""))));
  const tone = { open: "chip-blue", paid: "chip-green", refund: "chip-red" } as const;
  const word = { open: tr("Open"), paid: tr("Paid"), refund: tr("Refund") };
  const bill = bills.find((b) => b.id === open);
  return (
    <div>
      <Toolbar
        query={q}
        onQuery={setQ}
        placeholder={tr("Bill number, table or @waiter")}
        chips={[
          { id: "all", label: tr("All"), count: bills.length },
          { id: "open", label: tr("Open"), count: bills.filter((b) => b.state === "open").length },
          { id: "paid", label: tr("Paid"), count: bills.filter((b) => b.state === "paid").length },
          { id: "refund", label: tr("Refunds"), count: bills.filter((b) => b.state === "refund").length },
        ]}
        active={f}
        onChip={setF}
      />
      <div className="mt-4">
        <DataTable
          rows={rows}
          rowKey={(b) => b.id}
          onRow={(b) => setOpen(b.id)}
          columns={[
            { key: "id", label: tr("Bill"), width: "110px", render: (b) => <span className="font-semibold tabular-nums">{b.state === "open" ? "—" : `#${b.id}`}</span> },
            { key: "table", label: tr("Table"), width: "90px", render: (b) => <span className="font-semibold tabular-nums">{b.table}</span>, sort: (b) => b.table },
            { key: "at", label: tr("Time"), width: "90px", render: (b) => <span className="tabular-nums text-g-muted">{b.at}</span>, sort: (b) => b.at },
            { key: "waiter", label: tr("Waiter"), render: (b) => <span className="text-g-blue">@{b.waiter}</span> },
            { key: "pay", label: tr("Paid by"), render: (b) => (b.method ? tr(METHOD[b.method].label) : <span className="text-g-faint">—</span>) },
            { key: "state", label: tr("Status"), render: (b) => <span className={`rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${tone[b.state]}`}>{word[b.state]}</span> },
            { key: "total", label: tr("Total"), align: "right", render: (b) => <span className="font-semibold">{money(b.total)}</span>, sort: (b) => b.total },
          ]}
          mobile={(b) => <ListRow onClick={() => setOpen(b.id)} badge={b.table} badgeTone={tone[b.state]} title={b.state === "open" ? tr("Table {n} · open", { n: b.table }) : `#${b.id} · ${word[b.state]}`} sub={`${b.at} · @${b.waiter}${b.method ? ` · ${tr(METHOD[b.method].label)}` : ""}`} right={<span className="shrink-0 text-[14.5px] font-semibold tabular-nums">{compactMoney(b.total)}</span>} />}
          empty={<EmptyState art="orders" title={tr("No bills yet today")} text={tr("They appear here as tables order and pay.")} />}
        />
      </div>
      {bill && (
        <BillPage
          bill={bill}
          name={(id) => dish(items.get(id)?.name)}
          money={money}
          refunded={refunds[bill.id]}
          onClose={() => setOpen(null)}
          onRefund={(reason, amount) => {
            setRefunds((r) => ({ ...r, [bill.id]: { reason, amount } }));
            notify(tr("Refund {sum} · the e-invoice is adjusted", { sum: compactMoney(amount) }));
          }}
        />
      )}
    </div>
  );
}

function BillPage({ bill, name, money, refunded, onClose, onRefund }: { bill: Bill; name: (id: string) => string; money: (n: number) => string; refunded?: { reason: string; amount: number }; onClose: () => void; onRefund: (reason: string, amount: number) => void }) {
  const tr = useTr();
  const [pick, setPick] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [refunding, setRefunding] = useState(false);
  const amount = Math.round(bill.lines.filter((l) => pick.includes(l.id)).reduce((n, l) => n + l.price * l.qty, 0) * 1.05);
  return (
    <Sheet
      open
      wide
      onClose={onClose}
      label={bill.state === "open" ? tr("Table {n}", { n: bill.table }) : `#${bill.id}`}
      footer={
        bill.state === "paid" && !refunded ? (
          refunding ? (
            <button type="button" disabled={!amount || reason.trim().length < 3} onClick={() => (haptic("success"), onRefund(reason.trim(), amount), setRefunding(false))} className="press flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#e5484d] text-[16px] font-semibold text-white transition-opacity disabled:opacity-40">
              <RotateCcw size={18} strokeWidth={2.2} /> {amount ? tr("Refund {sum}", { sum: money(amount) }) : tr("Pick the dishes")}
            </button>
          ) : (
            <button type="button" onClick={() => (haptic("light"), setRefunding(true))} className="press flex h-14 w-full items-center justify-center gap-2 rounded-full bg-g-fill text-[16px] font-semibold">
              <RotateCcw size={18} strokeWidth={2.2} /> {tr("Make a refund")}
            </button>
          )
        ) : undefined
      }
    >
      <div className="grid gap-5 px-5 pt-2 pb-10 md:grid-cols-[1fr_300px] md:items-start">
        <div>
          <h2 className="text-[30px] leading-tight font-bold tracking-[-0.025em]">{bill.state === "open" ? tr("Table {n}", { n: bill.table }) : tr("Bill #{n}", { n: bill.id })}</h2>
          <p className="text-[14px] text-g-muted">
            {tr("Table {n}", { n: bill.table })} · {bill.at} · @{bill.waiter} · {tr("{n} guest|{n} guests", { n: bill.guests })}
          </p>
          <div className="card mt-4 rounded-[24px] p-1.5">
            {bill.lines.map((l) => {
              const on = pick.includes(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  disabled={!refunding}
                  onClick={() => (haptic("tick"), setPick((p) => (on ? p.filter((x) => x !== l.id) : [...p, l.id])))}
                  className={`flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left transition-colors ${on ? "bg-[#e5484d]/10" : ""}`}
                >
                  {refunding && <span className={`grid size-6 shrink-0 place-items-center rounded-full ${on ? "bg-[#e5484d] text-white" : "bg-g-fill-2"}`}>{on && <Check size={14} strokeWidth={3} />}</span>}
                  <span className="w-8 shrink-0 text-[15px] font-bold tabular-nums">{l.qty}×</span>
                  <span className={`min-w-0 flex-1 truncate text-[15px] ${l.cancelled ? "text-g-faint line-through" : ""}`}>{name(l.itemId)}</span>
                  <span className="shrink-0 text-[15px] font-semibold tabular-nums">{money(l.price * l.qty)}</span>
                </button>
              );
            })}
            <div className="mx-3 mt-1 grid gap-1.5 border-t border-g-line py-3 text-[14px]">
              <p className="flex justify-between text-g-muted">
                <span>{tr("Service 5%")}</span>
                <span className="tabular-nums">{money(Math.round(bill.subtotal * 0.05))}</span>
              </p>
              {bill.tip > 0 && (
                <p className="flex justify-between text-g-muted">
                  <span>{tr("Tip")}</span>
                  <span className="tabular-nums">{money(bill.tip)}</span>
                </p>
              )}
              <p className="flex justify-between text-[18px] font-bold">
                <span>{tr("Total")}</span>
                <span className="tabular-nums">{money(bill.total)}</span>
              </p>
            </div>
          </div>
          {refunding && (
            <div className="animate-rise mt-4">
              <p className="mb-2 px-1 text-[14px] font-semibold text-g-ink-2">{tr("Why")}</p>
              <TextArea value={reason} onChange={setReason} placeholder={tr("The dish was cold, the guest changed their mind…")} rows={2} />
            </div>
          )}
        </div>
        <div className="grid gap-3">
          <Group>
            {bill.method && <Row icon={METHOD[bill.method].icon} title={tr(METHOD[bill.method].label)} sub={tr("Paid at {t}", { t: bill.at })} />}
            <Row icon={FileCheck2} title={bill.state === "open" ? tr("E-invoice after payment") : tr("E-invoice sent")} sub={bill.state === "open" ? tr("Goes to the tax office when the bill is paid") : `MISA · ${tr("code")} C26TAA-${bill.id}`} />
          </Group>
          {refunded && (
            <p className="chip-red rounded-[20px] px-4 py-3 text-[13.5px] leading-snug font-medium">
              {tr("Refunded {sum}: {reason}", { sum: money(refunded.amount), reason: refunded.reason })}
            </p>
          )}
        </div>
      </div>
    </Sheet>
  );
}

/* ---------------------------------------------------------------- Reports */

export function ReportsAdmin({ floor, menu, notify }: { floor: FloorData; menu: Menu; notify: (t: string) => void }) {
  const tr = useTr();
  const dish = useDish();
  const locale = useLocale();
  const [range, setRange] = useState<"day" | "week" | "month">("week");
  const items = useMemo(() => menu.categories.flatMap((c) => c.items).filter((i) => i.price > 0), [menu]);
  // Demo numbers, steady from one render to the next.
  const week = [38.2, 41.5, 36.9, 44.8, 52.3, 61.7, 47.1].map((m) => m * 1e6);
  const today = new Date(2026, 10, 14);
  const days = week.map((v, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return { short: d.toLocaleDateString(locale, { weekday: "short" }), date: d.toLocaleDateString(locale, { day: "numeric", month: "short" }), value: v };
  });
  const sum = week.reduce((a, b) => a + b, 0) * (range === "month" ? 4.2 : range === "day" ? 1 / 7 : 1);
  const bills = Math.round((range === "month" ? 1720 : range === "day" ? 58 : 410) * 1);
  const top: [MenuItem, number][] = items.slice(0, 40).filter((_, i) => i % 3 === 0).slice(0, 6).map((it, i) => [it, [64, 51, 47, 39, 33, 28][i]!]);
  const waiters = [
    ["linh", 18.4, 96, 4.8],
    ["minh", 15.9, 81, 4.6],
    ["anna", 9.1, 47, 4.9],
  ] as const;
  const pays = [
    ["vietqr", 46],
    ["card", 28],
    ["cash", 21],
    ["momo", 5],
  ] as const;
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-full bg-g-fill p-1">
          {(["day", "week", "month"] as const).map((r) => (
            <button key={r} type="button" onClick={() => (haptic("tick"), setRange(r))} aria-pressed={range === r} className={`h-10 rounded-full px-4 text-[14px] font-semibold transition-colors ${range === r ? "bg-white text-g-ink shadow-[0_1px_3px_rgba(11,11,15,0.12)]" : "text-g-muted"}`}>
              {tr(r === "day" ? "Today" : r === "week" ? "Week" : "Month")}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => (haptic("success"), notify(tr("Report saved: Excel for the accountant")))} className="press ml-auto flex h-10 items-center gap-1.5 rounded-full bg-g-fill px-4 text-[14px] font-semibold">
          <Download size={16} strokeWidth={2.2} className="text-g-blue" /> {tr("Export")}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <IconStat art="sales" title={tr("Takings")} value={compactMoney(sum)} sub={tr("+12% to the last one")} />
        <IconStat art="check" title={tr("Avg check")} value={compactMoney(sum / bills)} sub={tr("{n} bills", { n: bills })} />
        <IconStat art="guests" title={tr("Guests")} value={String(Math.round(bills * 2.4))} sub={tr("2.4 per table")} />
        <IconStat art="tips" title={tr("Tips")} value={compactMoney(sum * 0.06)} sub={tr("6% of takings")} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <DaysCompareWidget title={tr("Takings by day")} icon={<CalendarDays size={13} strokeWidth={2.4} />} days={days} format={compactMoney} todayNote={tr("tap a day to compare")} />
        <BarsWidget title={tr("Busy hours")} icon={<TrendingUp size={13} strokeWidth={2.4} />} labels={["10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22"]} values={[4, 9, 18, 21, 12, 7, 6, 9, 16, 24, 27, 19, 8]} unit={tr("bills")} initial={10} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-[24px] bg-g-fill p-[18px]">
          <p className="text-[13px] font-semibold text-g-ink-2">{tr("Top dishes")}</p>
          <div className="mt-3 grid gap-2.5">
            {top.map(([it, n], i) => (
              <div key={it.id} className="flex items-center gap-3">
                <span className="w-5 text-[14px] font-semibold text-g-faint tabular-nums">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex justify-between gap-2 text-[14.5px]">
                    <span className="truncate font-semibold">{dish(it.name)}</span>
                    <span className="shrink-0 text-g-muted tabular-nums">{n}</span>
                  </span>
                  <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-g-card">
                    <span className="block h-full rounded-full bg-g-blue" style={{ width: `${(n / 64) * 100}%` }} />
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-[24px] bg-g-fill p-[18px]">
          <p className="text-[13px] font-semibold text-g-ink-2">{tr("Waiters")}</p>
          <div className="mt-2 grid gap-1">
            {waiters.map(([h, m, b, r]) => (
              <div key={h} className="flex items-center gap-3 rounded-[16px] py-2">
                <span className="blue-grad grid size-10 shrink-0 place-items-center rounded-full text-[15px] font-bold uppercase">{h[0]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-g-blue">@{h}</span>
                  <span className="block text-[12.5px] text-g-muted">{tr("{n} bills · rating {r}", { n: b, r })}</span>
                </span>
                <span className="text-[15px] font-semibold tabular-nums">{m}M</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[13px] font-semibold text-g-ink-2">{tr("How guests paid")}</p>
          <div className="mt-2 flex h-3 overflow-hidden rounded-full">
            {pays.map(([k, p], i) => (
              <span key={k} style={{ width: `${p}%`, background: ["#2f5bff", "#6c96ff", "#12a150", "#ef6c1a"][i] }} />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-g-muted">
            {pays.map(([k, p], i) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ background: ["#2f5bff", "#6c96ff", "#12a150", "#ef6c1a"][i] }} />
                {tr(METHOD[k].label)} {p}%
              </span>
            ))}
          </div>
        </section>
      </div>
      <p className="px-1 text-[12.5px] text-g-faint">{tr("Closed bills today: {n}. Numbers update after every payment.", { n: floor.history.length })}</p>
    </div>
  );
}
