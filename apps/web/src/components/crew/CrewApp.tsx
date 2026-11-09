"use client";

import { allItems, formatMoney, t, type Menu, type MenuItem } from "@yanyin/domain";
import {
  Armchair,
  Banknote,
  CalendarDays,
  ChefHat,
  Clock,
  CreditCard,
  House,
  LayoutGrid,
  Minus,
  Plus,
  Printer,
  QrCode,
  ReceiptText,
  Search,
  Send,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import type { CrewData } from "@/lib/demo-crew";
import { ticketTotal, type Booking, type ClosedOrder, type FloorData, type FloorTable, type LineState, type PayMethod, type TicketLine } from "@/lib/demo-floor";
import { haptic } from "@/lib/haptics";
import { loadOnce, Reveal } from "@/components/guest/motion";
import { Sheet, StepHead } from "@/components/guest/ui";
import { BookingsView, NewBookingPage } from "./Bookings";
import { CrewBoard } from "./CrewBoard";
import { SettingsView } from "./Settings";

type Tab = "me" | "tables" | "orders" | "bookings" | "settings";

const STATUS: Record<FloorTable["status"], { label: string; chip: string }> = {
  free: { label: "Free", chip: "chip-gray" },
  seated: { label: "Seated", chip: "chip-blue" },
  ordered: { label: "Ordered", chip: "chip-blue" },
  bill: { label: "Bill", chip: "chip-orange" },
  reserved: { label: "Reserved", chip: "chip-purple" },
};
const LINE: Record<LineState, { label: string; chip: string; next: LineState }> = {
  new: { label: "New", chip: "chip-gray", next: "cooking" },
  cooking: { label: "Cooking", chip: "chip-orange", next: "served" },
  served: { label: "Served", chip: "chip-green", next: "served" },
};
export const METHOD: Record<PayMethod, { label: string; icon: LucideIcon }> = {
  cash: { label: "Cash", icon: Banknote },
  card: { label: "Card", icon: CreditCard },
  vietqr: { label: "VietQR", icon: QrCode },
  momo: { label: "MoMo", icon: Wallet },
};

type Notice = { title: string; text?: string };

/**
 * yanyin.crew — the waiter's phone app: the floor (tables), open and closed
 * orders, bookings and the waiter's own quest page. Every secondary screen is a
 * full-screen page (table, take order, check, payment, new booking).
 */
export function CrewApp({ data, floor, menu }: { data: CrewData; floor: FloorData; menu: Menu }) {
  const [tab, setTab] = useState<Tab>("me");
  const [tables, setTables] = useState(floor.tables);
  const [bookings, setBookings] = useState(floor.bookings);
  const [history, setHistory] = useState(floor.history);
  const [open, setOpen] = useState<number | null>(null);
  const [page, setPage] = useState<"picker" | "check" | "pay" | null>(null);
  const [receipt, setReceipt] = useState<ClosedOrder | null>(null);
  const [newBooking, setNewBooking] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const items = useMemo(() => allItems(menu), [menu]);
  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const money = useCallback((n: number) => formatMoney(n, floor.venue.currency, "en"), [floor.venue.currency]);
  const table = tables.find((x) => x.no === open) ?? null;

  const notify = useCallback((n: Notice) => {
    haptic("success");
    setNotice(n);
    setTimeout(() => setNotice((cur) => (cur === n ? null : cur)), 2600);
  }, []);
  const patch = (no: number, f: (x: FloorTable) => FloorTable) => setTables((ts) => ts.map((x) => (x.no === no ? f(x) : x)));
  const now = () => new Date().toTimeString().slice(0, 5);
  const billCount = tables.filter((x) => x.status === "bill").length;
  const go = (t: Tab) => {
    haptic("tick");
    setTab(t);
    window.scrollTo({ top: 0 });
    loadOnce(`tab:${t}`, 550); // fresh data blurs then pulls into focus; a section seen <60 s ago shows at once
  };
  const todays = bookings.filter((b) => b.day === 0 && b.status !== "seated").sort((a, b) => a.time.localeCompare(b.time));
  const hot = {
    busy: tables.filter((x) => x.status !== "free" && x.status !== "reserved").length,
    tables: tables.length,
    bills: billCount,
    openOrders: tables.filter((x) => x.lines.length).length,
    inKitchen: tables.reduce((n, x) => n + x.lines.filter((l) => l.state !== "served").length, 0),
    bookings: todays.length,
    nextBooking: todays[0]?.time,
  };

  return (
    <div className="min-h-dvh bg-white text-g-ink">
      <div className="mx-auto max-w-[480px] pb-28">
        {tab === "tables" && (
          <TablesView
            tables={tables}
            money={money}
            itemById={itemById}
            actions={{
              open: setOpen,
              addItems: (no) => {
                setOpen(no);
                setPage("picker");
              },
              check: (no) => {
                const x = tables.find((t) => t.no === no);
                if (x && x.status !== "bill") notify({ title: `Check opened · Table ${no}`, text: "Show the QR or take payment" });
                patch(no, (t) => ({ ...t, status: "bill" }));
                setOpen(no);
                setPage("check");
              },
              serveAll: (no) => {
                patch(no, (t) => ({ ...t, lines: t.lines.map((l) => ({ ...l, state: "served" as const })) }));
                notify({ title: `Table ${no}: all served`, text: "Kitchen tickets closed" });
              },
              seat: (no) => {
                const x = tables.find((t) => t.no === no);
                const g = Math.min(2, x?.seats ?? 2);
                patch(no, (t) => ({ ...t, status: "seated", guests: g, since: now(), booking: undefined }));
                notify({ title: `Table ${no} seated`, text: `${g} guests · ${now()}` });
              },
            }}
          />
        )}
        {tab === "orders" && <OrdersView tables={tables} history={history} money={money} itemById={itemById} onOpenTable={setOpen} onReceipt={setReceipt} />}
        {tab === "bookings" && (
          <BookingsView
            bookings={bookings}
            onNew={() => setNewBooking(true)}
            onSeat={(b) => {
              setBookings((bs) => bs.map((x) => (x.id === b.id ? { ...x, status: "seated" } : x)));
              if (b.table) patch(b.table, (x) => ({ ...x, status: "seated", guests: b.guests, since: now(), booking: undefined }));
              notify({ title: `${b.name.split(" ")[0]} is seated`, text: b.table ? `Table ${b.table} · ${b.guests} guests` : `${b.guests} guests` });
            }}
          />
        )}
        {tab === "me" && <CrewBoard data={data} embedded hot={hot} onGo={go} onNotify={(title, text) => notify({ title, text })} />}
        {tab === "settings" && <SettingsView onNotify={(title, text) => notify({ title, text })} />}
      </div>

      {/* Tab bar */}
      <nav aria-label="Sections" className="fixed inset-x-0 bottom-0 z-40 border-t border-g-line bg-white/95 backdrop-blur-xl">
        <div className="mx-auto grid max-w-[480px] grid-cols-5 px-1 pt-1.5 pb-[max(8px,env(safe-area-inset-bottom))]">
          {(
            [
              ["me", "Home", House, 0],
              ["tables", "Tables", LayoutGrid, billCount],
              ["orders", "Orders", ReceiptText, 0],
              ["bookings", "Bookings", CalendarDays, 0],
              ["settings", "Settings", Settings, 0],
            ] as const
          ).map(([id, label, Icon, badge]) => (
            <button
              key={id}
              onClick={() => go(id)}
              aria-current={tab === id ? "page" : undefined}
              className={`press relative flex h-14 flex-col items-center justify-center gap-1 text-[11px] font-semibold ${tab === id ? "text-g-ink" : "text-g-faint"}`}
            >
              <Icon size={22} strokeWidth={tab === id ? 2.1 : 1.75} />
              {label}
              {badge > 0 && <span className="blue-grad absolute top-1 left-[calc(50%+6px)] grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold">{badge}</span>}
            </button>
          ))}
        </div>
      </nav>

      {notice && (
        <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] flex justify-center px-4 pt-[max(12px,env(safe-area-inset-top))]">
          <div key={notice.title} role="status" className="animate-notice flex w-full max-w-[440px] items-center gap-3 rounded-[22px] bg-g-ink px-4 py-3.5 text-white">
            <span className="blue-grad grid size-10 shrink-0 place-items-center rounded-full">
              <ChefHat size={18} strokeWidth={2} />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] leading-tight font-semibold">{notice.title}</span>
              {notice.text && <span className="mt-0.5 block text-[13px] text-white/60">{notice.text}</span>}
            </span>
          </div>
        </div>
      )}

      {/* Table page and its flow: take order → check → payment */}
      {table && (
        <TablePage
          table={table}
          itemById={itemById}
          money={money}
          onClose={() => setOpen(null)}
          onSeat={(guests) => {
            patch(table.no, (x) => ({ ...x, status: "seated", guests, since: now(), booking: undefined }));
            notify({ title: `Table ${table.no} seated`, text: `${guests} guests · ${now()}` });
          }}
          onAdvance={(lineId) => {
            const l = table.lines.find((x) => x.id === lineId);
            if (!l || l.state === "served") return;
            const next = LINE[l.state].next;
            patch(table.no, (x) => ({ ...x, lines: x.lines.map((y) => (y.id === lineId ? { ...y, state: next } : y)) }));
            const name = itemById.get(l.itemId)?.name.en ?? "Item";
            notify({ title: next === "served" ? `${name} served` : `${name} is cooking`, text: `Table ${table.no} · ${l.qty}×` });
          }}
          onTakeOrder={() => setPage("picker")}
          onCheck={() => {
            if (table.status !== "bill") notify({ title: `Check opened · Table ${table.no}`, text: "Show the QR or take payment" });
            patch(table.no, (x) => ({ ...x, status: "bill" }));
            setPage("check");
          }}
        />
      )}
      {table && page === "picker" && (
        <OrderPicker
          table={table}
          menu={menu}
          money={money}
          onClose={() => setPage(null)}
          onSend={(add) => {
            patch(table.no, (x) => ({ ...x, status: "ordered", lines: [...x.lines, ...add] }));
            setPage(null);
            notify({ title: "Sent to the kitchen", text: `Table ${table.no} · ${add.reduce((s, l) => s + l.qty, 0)} items` });
          }}
        />
      )}
      {table && page === "check" && (
        <Sheet open onClose={() => setPage(null)} label={`Check · Table ${table.no}`} footer={
          <div className="flex gap-2.5">
            <button onClick={() => notify({ title: "Check printed", text: "Kitchen printer · Hall" })} className="press flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-g-fill text-[16px] font-semibold">
              <Printer size={18} strokeWidth={2} /> Print
            </button>
            <button onClick={() => setPage("pay")} className="blue-grad press h-14 flex-[1.6] rounded-full text-[16px] font-semibold">
              Take payment
            </button>
          </div>
        }>
          <div className="px-5 pt-2 pb-8">
            <Receipt venue={floor.venue} waiter={floor.waiter} table={table.no} guests={table.guests} time={now()} lines={table.lines} itemById={itemById} money={money} qr />
          </div>
        </Sheet>
      )}
      {table && page === "pay" && (
        <PaymentPage
          table={table}
          money={money}
          onClose={() => setPage("check")}
          onPaid={(method, tip) => {
            const subtotal = ticketTotal(table.lines);
            notify({ title: `Table ${table.no} closed`, text: `${METHOD[method].label}${tip ? ` · tip ${money(tip)}` : ""}` });
            setHistory((h) => [{ id: (h[0]?.id ?? 1000) + 1, table: table.no, closedAt: now(), lines: table.lines, subtotal, tip, method, guests: table.guests }, ...h]);
            patch(table.no, (x) => ({ ...x, status: "free", guests: 0, since: undefined, lines: [] }));
          }}
          onDone={() => {
            setPage(null);
            setOpen(null);
          }}
        />
      )}

      {receipt && (
        <Sheet open onClose={() => setReceipt(null)} label={`Order #${receipt.id}`}>
          <div className="px-5 pt-2 pb-8">
            <Receipt venue={floor.venue} waiter={floor.waiter} table={receipt.table} guests={receipt.guests} time={receipt.closedAt} lines={receipt.lines} itemById={itemById} money={money} tip={receipt.tip} paid={receipt.method} />
          </div>
        </Sheet>
      )}

      {newBooking && (
        <NewBookingPage
          tables={tables}
          onClose={() => setNewBooking(false)}
          onSave={(b: Booking) => {
            setBookings((bs) => [...bs, b]);
            if (b.day === 0 && b.table) patch(b.table, (x) => (x.status === "free" ? { ...x, status: "reserved", booking: { name: b.name.split(" ")[0]!, time: b.time } } : x));
            setNewBooking(false);
            notify({ title: "Booking saved", text: `${b.name} · ${b.guests} guests · ${b.time}` });
          }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Dashboard strip */

export type DashItem = { label: string; value: string; sub?: string; icon: LucideIcon; tone?: "blue" | "orange" | "green" | "plain"; bar?: number; hot?: boolean };

/** The stats at the top of every waiter page: two by two, big numbers, one optional progress bar. */
export function Dash({ items }: { items: DashItem[] }) {
  const tone = { blue: "text-g-blue", orange: "text-g-orange", green: "text-g-green", plain: "text-g-muted" };
  return (
    <Reveal className="mt-5 grid grid-cols-2 gap-2.5">
      {items.map((d) => (
        <div key={d.label} className={`flex h-[104px] flex-col justify-between rounded-[22px] p-3.5 ${d.hot ? "blue-grad" : "bg-g-fill"}`}>
          <span className="flex items-center justify-between gap-2">
            <span className={`truncate text-[12px] font-medium ${d.hot ? "text-white/80" : "text-g-muted"}`}>{d.label}</span>
            <d.icon size={16} strokeWidth={2} className={d.hot ? "text-white/80" : tone[d.tone ?? "blue"]} />
          </span>
          <span>
            <span className="live block truncate text-[24px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{d.value}</span>
            {d.bar !== undefined ? (
              <span className={`mt-2 block h-1.5 overflow-hidden rounded-full ${d.hot ? "bg-white/25" : "bg-white"}`}>
                <span className={`live block h-full rounded-full ${d.hot ? "bg-white" : "bar-grad"}`} style={{ width: `${Math.round(d.bar * 100)}%` }} />
              </span>
            ) : (
              d.sub && <span className={`live mt-1.5 block truncate text-[12px] ${d.hot ? "text-white/80" : "text-g-muted"}`}>{d.sub}</span>
            )}
          </span>
        </div>
      ))}
    </Reveal>
  );
}

/* ---------------------------------------------------------------- Long press */

/** Long press (≈0.45 s) with a haptic tick, like the iOS / One UI context menu; a short tap stays a tap. */
function useLongPress(onLong: () => void, onTap: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);
  const start = useRef<[number, number]>([0, 0]);
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  return {
    onPointerDown: (e: React.PointerEvent) => {
      fired.current = false;
      start.current = [e.clientX, e.clientY];
      clear();
      timer.current = setTimeout(() => {
        fired.current = true;
        haptic("success");
        onLong();
      }, 450);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (Math.hypot(e.clientX - start.current[0], e.clientY - start.current[1]) > 8) clear();
    },
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onClick: () => {
      if (fired.current) return;
      haptic("light");
      onTap();
    },
  };
}

/* ---------------------------------------------------------------- Tables */

export type TableActions = {
  open: (no: number) => void;
  addItems: (no: number) => void;
  check: (no: number) => void;
  serveAll: (no: number) => void;
  seat: (no: number) => void;
};

function tableState(x: FloorTable) {
  const cooking = x.lines.filter((l) => l.state !== "served").length;
  if (x.status === "bill") return { text: "Bill asked", dot: "bg-white" };
  if (x.status === "seated") return { text: "Waiting to order", dot: "bg-[#8fb2ff]" };
  if (cooking) return { text: `${cooking} cooking`, dot: "bg-g-orange" };
  return { text: "All served", dot: "bg-[#5ce0a0]" };
}

function TableTile({ x, money, onTap, onLong }: { x: FloorTable; money: (n: number) => string; onTap: () => void; onLong: () => void }) {
  const press = useLongPress(onLong, onTap);
  const total = ticketTotal(x.lines);
  const busy = x.status === "seated" || x.status === "ordered";
  const st = tableState(x);
  const look = x.status === "bill" ? "blue-grad" : busy ? "bg-g-ink text-white" : x.status === "reserved" ? "border-[1.5px] border-dashed border-g-fill-2" : "bg-g-fill";
  return (
    <button {...press} style={{ WebkitTouchCallout: "none" }} className={`press flex aspect-[0.9] flex-col justify-between rounded-[22px] p-3 text-left select-none ${look}`}>
      <span className="flex items-start justify-between">
        <span className="text-[28px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{x.no}</span>
        <span className={`flex items-center gap-0.5 text-[12px] font-medium ${busy || x.status === "bill" ? "text-white/70" : "text-g-muted"}`}>
          <Users size={12} strokeWidth={2} /> {busy || x.status === "bill" ? x.guests : x.seats}
        </span>
      </span>
      {x.status === "free" ? (
        <span className="text-[12px] font-medium text-g-faint">Free</span>
      ) : x.status === "reserved" ? (
        <span>
          <span className="live block text-[14px] font-semibold tabular-nums">{x.booking?.time}</span>
          <span className="live block truncate text-[12px] font-medium text-g-purple">{x.booking?.name}</span>
        </span>
      ) : (
        <span>
          <span className="live block truncate text-[13px] font-semibold tabular-nums">{total ? money(total) : `since ${x.since}`}</span>
          <span className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-white/75">
            <span className={`size-1.5 shrink-0 rounded-full ${st.dot}`} />
            <span className="live truncate">{st.text}</span>
          </span>
        </span>
      )}
    </button>
  );
}

function TablesView({ tables, money, actions, itemById }: { tables: FloorTable[]; money: (n: number) => string; actions: TableActions; itemById: Map<string, MenuItem> }) {
  const [zone, setZone] = useState<"All" | FloorTable["zone"]>("All");
  const [peek, setPeek] = useState<number | null>(null);
  const shown = tables.filter((x) => zone === "All" || x.zone === zone);
  const busy = tables.filter((x) => x.status !== "free" && x.status !== "reserved").length;
  const bills = tables.filter((x) => x.status === "bill");
  const reserved = tables.filter((x) => x.status === "reserved").sort((a, b) => (a.booking?.time ?? "").localeCompare(b.booking?.time ?? ""));
  const seats = tables.reduce((n, x) => n + (x.status === "free" ? x.seats : 0), 0);
  const peeked = tables.find((x) => x.no === peek) ?? null;
  return (
    <div className="px-5 pt-[max(20px,env(safe-area-inset-top))]">
      <PageHead title="Tables" sub="Samarkand · lunch" />
      <Dash
        items={[
          { label: "Busy", value: `${busy}/${tables.length}`, icon: Users, bar: busy / tables.length },
          { label: "Bill asked", value: String(bills.length), sub: bills.length ? `Table ${bills.map((b) => b.no).join(", ")}` : "none", icon: ReceiptText, tone: "orange", hot: bills.length > 0 },
          { label: "Free now", value: String(tables.filter((x) => x.status === "free").length), sub: `${seats} seats`, icon: Armchair, tone: "green" },
          { label: "Reserved", value: String(reserved.length), sub: reserved[0] ? `next ${reserved[0].booking?.time}` : "none today", icon: CalendarDays, tone: "plain" },
        ]}
      />
      <div className="mt-5 flex rounded-full bg-g-fill p-1">
        {(["All", "Hall", "Terrace"] as const).map((z) => (
          <button
            key={z}
            onClick={() => {
              haptic("tick");
              setZone(z);
            }}
            aria-pressed={zone === z}
            className={`h-10 flex-1 rounded-full text-[14px] font-semibold transition-colors ${zone === z ? "bg-white text-g-ink" : "text-g-muted"}`}
          >
            {z}
          </button>
        ))}
      </div>
      <Reveal className="mt-4 grid grid-cols-3 gap-2.5">
        {shown.map((x) => (
          <TableTile key={x.no} x={x} money={money} onTap={() => actions.open(x.no)} onLong={() => setPeek(x.no)} />
        ))}
      </Reveal>
      <p className="mt-4 text-center text-[12px] text-g-faint">Hold a table for quick actions</p>
      {peeked && <TablePeek x={peeked} money={money} actions={actions} itemById={itemById} onClose={() => setPeek(null)} />}
    </div>
  );
}

/** Long-press preview: the table's short story and quick actions, without opening the full page. */
function TablePeek({ x, money, actions, itemById, onClose }: { x: FloorTable; money: (n: number) => string; actions: TableActions; itemById: Map<string, MenuItem>; onClose: () => void }) {
  const total = ticketTotal(x.lines);
  const empty = x.status === "free" || x.status === "reserved";
  const run = (f: (no: number) => void) => () => {
    haptic("light");
    onClose();
    f(x.no);
  };
  const items: [string, LucideIcon, () => void][] = empty
    ? [
        ["Seat guests", Users, run(actions.seat)],
        ["Open table", LayoutGrid, run(actions.open)],
      ]
    : [
        ["Add items", Plus, run(actions.addItems)],
        [x.status === "bill" ? "Open check" : "Bill", ReceiptText, run(actions.check)],
        ...(x.lines.some((l) => l.state !== "served") ? [["Mark all served", ChefHat, run(actions.serveAll)] as [string, LucideIcon, () => void]] : []),
        ["Open table", LayoutGrid, run(actions.open)],
      ];
  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center px-6" role="dialog" aria-label={`Table ${x.no} quick actions`}>
      <button aria-label="Close" onClick={onClose} className="animate-fade absolute inset-0 bg-[rgba(11,11,15,0.35)] backdrop-blur-md" />
      <div className="animate-pop relative w-full max-w-[340px]">
        <div className="rounded-[28px] bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[28px] leading-none font-bold tracking-[-0.03em]">Table {x.no}</p>
              <p className="mt-1.5 text-[13px] text-g-muted">
                {x.zone} · {empty ? `${x.seats} seats` : `${x.guests} guests · since ${x.since}`}
              </p>
            </div>
            <span className={`${STATUS[x.status].chip} inline-flex h-7 items-center rounded-full px-3 text-[12px] font-semibold`}>{STATUS[x.status].label}</span>
          </div>
          {!empty && x.lines.length > 0 && (
            <div className="mt-4 grid gap-1.5 border-t border-g-line pt-3.5">
              {x.lines.slice(0, 4).map((l) => (
                <p key={l.id} className="flex items-center gap-2 text-[14px]">
                  <span className="w-6 text-g-muted tabular-nums">{l.qty}×</span>
                  <span className="min-w-0 flex-1 truncate">{itemById.get(l.itemId)?.name.en ?? l.itemId}</span>
                  <span className={`${LINE[l.state].chip} inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold`}>{LINE[l.state].label}</span>
                </p>
              ))}
              {x.lines.length > 4 && <p className="text-[13px] text-g-muted">+{x.lines.length - 4} more</p>}
              <p className="mt-1 flex items-baseline justify-between border-t border-g-line pt-2.5">
                <span className="text-[13px] text-g-muted">Total</span>
                <span className="text-[20px] font-semibold tabular-nums">{money(total)}</span>
              </p>
            </div>
          )}
          {x.status === "reserved" && x.booking && (
            <p className="mt-4 rounded-[16px] bg-g-fill px-3.5 py-2.5 text-[14px]">
              Booked by <b className="font-semibold">{x.booking.name}</b> for {x.booking.time}
            </p>
          )}
        </div>
        <div className="mt-2.5 divide-y divide-g-line overflow-hidden rounded-[22px] bg-white">
          {items.map(([label, Icon, f]) => (
            <button key={label} onClick={f} className="press flex h-[52px] w-full items-center justify-between px-5 text-[16px] font-medium">
              {label}
              <Icon size={19} strokeWidth={1.9} className="text-g-blue" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PageHead({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-[30px] leading-tight font-bold tracking-[-0.025em]">{title}</h1>
        {sub && <p className="mt-0.5 text-[14px] text-g-muted">{sub}</p>}
      </div>
      {action}
    </header>
  );
}
export { PageHead };

function TablePage({
  table,
  itemById,
  money,
  onClose,
  onSeat,
  onAdvance,
  onTakeOrder,
  onCheck,
}: {
  table: FloorTable;
  itemById: Map<string, MenuItem>;
  money: (n: number) => string;
  onClose: () => void;
  onSeat: (guests: number) => void;
  onAdvance: (lineId: string) => void;
  onTakeOrder: () => void;
  onCheck: () => void;
}) {
  const [guests, setGuests] = useState(Math.min(2, table.seats));
  const total = ticketTotal(table.lines);
  const empty = table.status === "free" || table.status === "reserved";
  return (
    <Sheet
      open
      onClose={onClose}
      label={`Table ${table.no}`}
      title={false}
      footer={
        empty ? (
          <button
            onClick={() => {
              haptic("success");
              onSeat(guests);
            }}
            className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold"
          >
            {table.status === "reserved" ? "Guests arrived · seat" : "Seat guests"} · {guests}
          </button>
        ) : (
          <div className="flex gap-2.5">
            <button onClick={onTakeOrder} className="press flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-g-fill text-[16px] font-semibold">
              <Plus size={18} strokeWidth={2.25} /> Add items
            </button>
            <button disabled={!table.lines.length} onClick={onCheck} className="blue-grad press h-14 flex-[1.3] rounded-full text-[16px] font-semibold disabled:opacity-40">
              {table.status === "bill" ? "Open check" : "Bill"}
            </button>
          </div>
        )
      }
    >
      <div className="px-5 pt-2 pb-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[34px] leading-none font-bold tracking-[-0.03em]">Table {table.no}</h2>
            <p className="mt-2 text-[14px] text-g-muted">
              {table.zone} · {table.seats} seats
            </p>
          </div>
          <span className={`${STATUS[table.status].chip} mt-1 inline-flex h-7 items-center rounded-full px-3 text-[13px] font-semibold`}>{STATUS[table.status].label}</span>
        </div>

        {!empty && (
          <div className="mt-6 grid grid-cols-[0.8fr_0.8fr_1.5fr] divide-x divide-g-line rounded-[22px] bg-g-fill py-3.5">
            {[
              [Users, "Guests", String(table.guests)],
              [Clock, "Since", table.since ?? "—"],
              [ReceiptText, "Total", total ? money(total) : "—"],
            ].map(([Icon, label, value]) => {
              const I = Icon as LucideIcon;
              return (
                <div key={label as string} className="px-3.5">
                  <p className="flex items-center gap-1 text-[12px] font-medium text-g-muted">
                    <I size={13} strokeWidth={2} /> {label as string}
                  </p>
                  <p className="mt-1 truncate text-[16px] font-semibold tabular-nums">{value as string}</p>
                </div>
              );
            })}
          </div>
        )}

        {empty ? (
          <section className="mt-8">
            {table.booking && (
              <div className="mb-7 rounded-[22px] bg-g-fill p-4">
                <p className="text-[13px] font-medium text-g-purple">Booked for {table.booking.time}</p>
                <p className="mt-0.5 text-[17px] font-semibold">{table.booking.name}</p>
              </div>
            )}
            <StepHead title="Guests" />
            <div className="flex items-center justify-between">
              <span className="text-[56px] leading-[0.9] font-semibold tracking-[-0.04em] tabular-nums">{guests}</span>
              <Counter value={guests} min={1} max={table.seats + 2} onChange={setGuests} />
            </div>
          </section>
        ) : (
          <section className="mt-8">
            <StepHead title="Order" aside={table.lines.length ? "Tap a status to move it on" : undefined} />
            {table.lines.length ? (
              <div className="divide-y divide-g-line">
                {table.lines.map((l) => {
                  const it = itemById.get(l.itemId);
                  return (
                    <div key={l.id} className="flex items-center gap-3 py-3.5">
                      <span className="w-7 shrink-0 text-[15px] font-semibold text-g-muted tabular-nums">{l.qty}×</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium">{it ? t(it.name, "en") : l.itemId}</span>
                        <span className="text-[13px] text-g-muted tabular-nums">{money(l.price * l.qty)}</span>
                      </span>
                      <button
                        onClick={() => {
                          haptic("light");
                          onAdvance(l.id);
                        }}
                        className={`${LINE[l.state].chip} press h-8 shrink-0 rounded-full px-3 text-[12px] font-semibold`}
                      >
                        {LINE[l.state].label}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center rounded-[22px] bg-g-fill py-10 text-center">
                <Armchair size={26} strokeWidth={1.75} className="text-g-blue" />
                <p className="mt-2 text-[15px] text-g-muted">No order yet. Tap “Add items”.</p>
              </div>
            )}
          </section>
        )}
      </div>
    </Sheet>
  );
}

export function Counter({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="flex h-12 items-center gap-1 rounded-full bg-g-fill px-1.5">
      {(
        [
          [-1, Minus, "Fewer"],
          [1, Plus, "More"],
        ] as const
      ).map(([d, Icon, label]) => (
        <button
          key={d}
          aria-label={label}
          onClick={() => {
            haptic("tick");
            onChange(Math.min(max, Math.max(min, value + d)));
          }}
          className="press grid size-10 place-items-center rounded-full"
        >
          <Icon size={18} />
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- Take order */

let lineSeq = 0;
const lineId = () => `n${++lineSeq}`;

function OrderPicker({ table, menu, money, onClose, onSend }: { table: FloorTable; menu: Menu; money: (n: number) => string; onClose: () => void; onSend: (lines: TicketLine[]) => void }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(menu.categories[0]!.id);
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [review, setReview] = useState(false);
  const [note, setNote] = useState("");
  const simple = (i: MenuItem) => i.price > 0 && !i.variants.length && !i.modifierGroups.some((g) => g.required);
  const query = q.trim().toLowerCase();
  const list = menu.categories.flatMap((c) => c.items.filter((i) => simple(i) && (query ? (i.name.en ?? "").toLowerCase().includes(query) : c.id === cat)));
  const all = allItems(menu);
  const byId = new Map(all.map((i) => [i.id, i]));
  const entries = Object.entries(picked);
  const count = entries.reduce((s, [, n]) => s + n, 0);
  const total = entries.reduce((s, [id, n]) => s + (byId.get(id)?.price ?? 0) * n, 0);
  const set = (id: string, n: number) => {
    haptic("tick");
    setPicked((p) => {
      const next = { ...p };
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });
  };
  const send = () => onSend(entries.map(([itemId, qty]) => ({ id: lineId(), itemId, qty, price: byId.get(itemId)?.price ?? 0, state: "new" as const })));
  const stepper = (id: string, n: number) => (
    <div className="flex h-10 w-[104px] shrink-0 items-center justify-between rounded-full bg-g-ink px-1 text-white">
      <button aria-label="Remove one" onClick={() => set(id, n - 1)} className="grid size-8 place-items-center">
        <Minus size={16} />
      </button>
      <span className="text-[15px] font-semibold tabular-nums">{n}</span>
      <button aria-label="Add one" onClick={() => set(id, n + 1)} className="grid size-8 place-items-center">
        <Plus size={16} />
      </button>
    </div>
  );
  return (
    <>
      <Sheet
        open
        onClose={onClose}
        label={`Table ${table.no} · add items`}
        footer={
          count ? (
            <div className="flex gap-2.5">
              {/* Preview before sending: see the whole order, change it, add a note. */}
              <button onClick={() => setReview(true)} className="press flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-g-fill text-[16px] font-semibold">
                <span key={count} className="animate-pop grid size-7 place-items-center rounded-full bg-g-ink text-[13px] text-white tabular-nums">
                  {count}
                </span>
                Review
              </button>
              <button onClick={send} className="blue-grad press flex h-14 flex-[1.4] items-center justify-center gap-2 rounded-full text-[16px] font-semibold tabular-nums">
                <Send size={18} strokeWidth={2} /> Send · {money(total)}
              </button>
            </div>
          ) : (
            <p className="flex h-14 items-center justify-center text-[15px] text-g-muted">Tap + to add dishes</p>
          )
        }
      >
        <div className="px-5 pt-1 pb-6">
          <label className="flex h-12 items-center gap-3 rounded-full bg-g-fill px-4 text-g-muted">
            <Search size={20} strokeWidth={2} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a dish" className="min-w-0 flex-1 bg-transparent text-[16px] text-g-ink outline-none placeholder:text-g-faint" />
          </label>
          {!query && (
            <div className="no-scrollbar -mx-5 mt-3 flex gap-1 overflow-x-auto px-5">
              {menu.categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    haptic("tick");
                    setCat(c.id);
                  }}
                  className={`press h-9 shrink-0 rounded-full px-3.5 text-[14px] font-medium whitespace-nowrap ${cat === c.id ? "bg-g-ink text-white" : "text-g-muted"}`}
                >
                  {t(c.name, "en")}
                </button>
              ))}
            </div>
          )}
          <div className="mt-2 divide-y divide-g-line">
            {list.map((i) => {
              const n = picked[i.id] ?? 0;
              return (
                <div key={i.id} className="flex h-16 items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{t(i.name, "en")}</span>
                    <span className="text-[13px] text-g-muted tabular-nums">{money(i.price)}</span>
                  </span>
                  {n ? (
                    stepper(i.id, n)
                  ) : (
                    <button aria-label={`Add ${t(i.name, "en")}`} onClick={() => set(i.id, 1)} className="blue-grad press grid size-10 place-items-center rounded-full">
                      <Plus size={20} strokeWidth={2.25} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Sheet>

      {review && (
        <Sheet
          open
          onClose={() => setReview(false)}
          label={`Review · Table ${table.no}`}
          footer={
            <button disabled={!count} onClick={send} className="blue-grad press flex h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-semibold tabular-nums disabled:opacity-40">
              <Send size={18} strokeWidth={2} /> Send to kitchen · {money(total)}
            </button>
          }
        >
          <div className="px-5 pt-2 pb-8">
            <p className="text-[14px] text-g-muted">
              Table {table.no} · {table.guests} guests · new round
            </p>
            <p className="text-[40px] leading-tight font-semibold tracking-[-0.03em] tabular-nums">{money(total)}</p>
            <div className="mt-5 divide-y divide-g-line">
              {entries.map(([id, n]) => (
                <div key={id} className="flex h-16 items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{t(byId.get(id)!.name, "en")}</span>
                    <span className="text-[13px] text-g-muted tabular-nums">
                      {n} × {money(byId.get(id)!.price)}
                    </span>
                  </span>
                  {stepper(id, n)}
                </div>
              ))}
            </div>
            {!count && <p className="py-10 text-center text-[15px] text-g-muted">Nothing left. Go back and add dishes.</p>}
            {table.lines.length > 0 && (
              <p className="mt-5 rounded-[18px] bg-g-fill px-4 py-3 text-[13px] text-g-muted">
                Already on the table: {table.lines.reduce((s, l) => s + l.qty, 0)} items · {money(ticketTotal(table.lines))}
              </p>
            )}
            <label className="mt-6 block text-[13px] font-semibold tracking-[0.06em] text-g-muted uppercase" htmlFor="kitchen-note">
              Note for the kitchen
            </label>
            <textarea
              id="kitchen-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="No onion, kids portion, serve together…"
              className="mt-2 w-full rounded-[16px] bg-g-fill px-4 py-3 text-[16px] outline-none placeholder:text-g-faint focus:ring-2 focus:ring-g-blue/30"
            />
          </div>
        </Sheet>
      )}
    </>
  );
}

/* ---------------------------------------------------------------- Check */

/** Deterministic pseudo QR for the VietQR placeholder (real payload comes from the payment provider). */
function FakeQr({ seed, size = 132 }: { seed: number; size?: number }) {
  const n = 25;
  // Pure per-cell hash, so the pattern is stable across renders.
  const on = (r: number, c: number) => (Math.imul(r * 73 + c * 151 + seed, 2654435761) >>> 0) % 100 < 48;
  const finder = (r: number, c: number) => [0, n - 7].some((a) => r >= a && r < a + 7) && [0, n - 7].some((b) => c >= b && c < b + 7) && !(r >= n - 7 && c >= n - 7);
  const cells: ReactNode[] = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) {
      if (finder(r, c)) continue;
      if (on(r, c)) cells.push(<rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} />);
    }
  const eye = (r: number, c: number) => (
    <g key={`e${r}${c}`}>
      <rect x={c + 0.5} y={r + 0.5} width={6} height={6} rx={1.5} fill="none" stroke="currentColor" strokeWidth={1} />
      <rect x={c + 2} y={r + 2} width={3} height={3} rx={0.8} />
    </g>
  );
  return (
    <svg viewBox={`0 0 ${n} ${n}`} width={size} height={size} fill="currentColor" aria-label="VietQR code">
      {cells}
      {eye(0, 0)}
      {eye(0, n - 7)}
      {eye(n - 7, 0)}
    </svg>
  );
}

export function Receipt({
  venue,
  waiter,
  table,
  guests,
  time,
  lines,
  itemById,
  money,
  tip = 0,
  qr,
  paid,
}: {
  venue: FloorData["venue"];
  waiter: string;
  table: number;
  guests: number;
  time: string;
  lines: TicketLine[];
  itemById: Map<string, MenuItem>;
  money: (n: number) => string;
  tip?: number;
  qr?: boolean;
  paid?: PayMethod;
}) {
  const subtotal = ticketTotal(lines);
  const service = Math.round(subtotal * 0.05);
  const total = subtotal + service + tip;
  return (
    <div className="rounded-[26px] bg-g-fill px-5 pt-6 pb-5">
      <div className="text-center">
        <p className="text-[20px] font-bold tracking-[-0.02em]">{venue.name}</p>
        <p className="text-[13px] text-g-muted">{venue.address}</p>
        <p className="mt-3 text-[13px] text-g-muted tabular-nums">
          Table {table} · {guests} guests · {waiter} · {time}
        </p>
      </div>
      <div className="my-4 border-t border-dashed border-g-faint/60" />
      <div className="grid gap-2.5">
        {lines.map((l) => (
          <div key={l.id} className="flex items-baseline gap-2 text-[15px]">
            <span className="w-6 shrink-0 text-g-muted tabular-nums">{l.qty}×</span>
            <span className="min-w-0 flex-1 truncate">{t(itemById.get(l.itemId)?.name ?? { en: l.itemId }, "en")}</span>
            <span className="shrink-0 tabular-nums">{money(l.price * l.qty)}</span>
          </div>
        ))}
      </div>
      <div className="my-4 border-t border-dashed border-g-faint/60" />
      <div className="grid gap-1.5 text-[14px] text-g-muted tabular-nums">
        <Row label="Subtotal" value={money(subtotal)} />
        <Row label="Service 5%" value={money(service)} />
        {tip > 0 && <Row label="Tip" value={money(tip)} />}
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-[15px] font-semibold">Total</span>
        <span className="text-[30px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{money(total)}</span>
      </div>
      <p className="mt-1 text-right text-[12px] text-g-faint">VAT included · e-invoice on request</p>
      {qr && (
        <div className="mt-5 flex items-center gap-4 rounded-[20px] bg-white p-3.5">
          <span className="text-g-ink">
            <FakeQr seed={table * 97 + subtotal} size={96} />
          </span>
          <span>
            <span className="block text-[15px] font-semibold">Scan to pay</span>
            <span className="block text-[13px] text-g-muted">VietQR · any bank app, MoMo, ZaloPay</span>
          </span>
        </div>
      )}
      {paid && (
        <p className="chip-green mt-5 flex h-10 items-center justify-center gap-1.5 rounded-full text-[14px] font-semibold">
          Paid · {METHOD[paid].label}
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="text-g-ink">{value}</span>
    </div>
  );
}

/* ---------------------------------------------------------------- Payment */

function PaymentPage({ table, money, onClose, onPaid, onDone }: { table: FloorTable; money: (n: number) => string; onClose: () => void; onPaid: (m: PayMethod, tip: number) => void; onDone: () => void }) {
  const subtotal = ticketTotal(table.lines);
  const base = subtotal + Math.round(subtotal * 0.05);
  const [method, setMethod] = useState<PayMethod>("vietqr");
  const [tipPct, setTipPct] = useState(0);
  const [split, setSplit] = useState(1);
  const [received, setReceived] = useState<number | null>(null);
  // Snapshot at payment time: the table is cleared right after.
  const [done, setDone] = useState<{ total: number; tip: number; change: number } | null>(null);
  const tip = Math.round((subtotal * tipPct) / 100 / 1000) * 1000;
  const total = base + tip;
  const round = (step: number) => Math.ceil(total / step) * step;
  const cashOptions = [...new Set([total, round(50_000), round(100_000), round(500_000)])];

  if (done)
    return (
      <Sheet open onClose={onDone} label="Paid">
        <div className="flex flex-col items-center px-6 pt-16 pb-10 text-center">
          <span className="blue-grad animate-pop grid size-24 place-items-center rounded-full">
            <svg viewBox="0 0 24 24" width={44} height={44} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
          </span>
          <h2 className="mt-7 text-[30px] font-bold tracking-[-0.025em]">Paid</h2>
          <p className="mt-1 text-[44px] leading-none font-semibold tracking-[-0.04em] tabular-nums">{money(done.total)}</p>
          <p className="mt-3 text-[15px] text-g-muted">
            Table {table.no} · {METHOD[method].label}
            {done.tip ? ` · tip ${money(done.tip)}` : ""}
          </p>
          {done.change > 0 && <p className="chip-blue mt-5 rounded-full px-4 py-2 text-[15px] font-semibold tabular-nums">Change {money(done.change)}</p>}
          <button onClick={onDone} className="press mt-10 h-14 w-full max-w-[320px] rounded-full bg-g-fill text-[16px] font-semibold">
            Back to tables
          </button>
        </div>
      </Sheet>
    );

  return (
    <Sheet
      open
      onClose={onClose}
      label={`Payment · Table ${table.no}`}
      footer={
        <button
          disabled={method === "cash" && (received ?? 0) < total}
          onClick={() => {
            haptic("success");
            setDone({ total, tip, change: method === "cash" && received ? received - total : 0 });
            onPaid(method, tip);
          }}
          className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold tabular-nums disabled:opacity-40"
        >
          Close bill · {money(total)}
        </button>
      }
    >
      <div className="px-5 pt-2 pb-8">
        <p className="text-[14px] font-medium text-g-muted">To pay</p>
        <p className="live text-[48px] leading-none font-semibold tracking-[-0.04em] tabular-nums">{money(total)}</p>
        {split > 1 && <p className="mt-2 text-[15px] text-g-blue tabular-nums">{money(Math.ceil(total / split / 1000) * 1000)} per guest × {split}</p>}

        <section className="mt-9">
          <StepHead n={1} title="Method" />
          <div className="grid grid-cols-2 gap-2.5">
            {(Object.keys(METHOD) as PayMethod[]).map((m) => {
              const { label, icon: Icon } = METHOD[m];
              const on = m === method;
              return (
                <button
                  key={m}
                  onClick={() => {
                    haptic("light");
                    setMethod(m);
                  }}
                  aria-pressed={on}
                  className={`press flex h-16 items-center gap-3 rounded-[20px] px-4 text-[15px] font-semibold transition-colors ${on ? "bg-g-ink text-white" : "bg-g-fill"}`}
                >
                  <Icon size={20} strokeWidth={1.9} /> {label}
                </button>
              );
            })}
          </div>
          {(method === "vietqr" || method === "momo") && (
            <div className="mt-3 flex items-center gap-4 rounded-[20px] bg-g-fill p-3.5">
              <span className="rounded-[12px] bg-white p-2">
                <FakeQr seed={table.no * 31 + total} size={88} />
              </span>
              <span className="text-[14px] text-g-muted">Show this to the guest. Payment confirms automatically when the bank sends the notice.</span>
            </div>
          )}
          {method === "cash" && (
            <div className="mt-3">
              <p className="mb-2 text-[13px] font-medium text-g-muted">Received</p>
              <div className="flex flex-wrap gap-2">
                {cashOptions.map((v) => (
                  <button
                    key={v}
                    onClick={() => {
                      haptic("tick");
                      setReceived(v);
                    }}
                    aria-pressed={received === v}
                    className={`press h-10 rounded-full px-4 text-[14px] font-semibold tabular-nums ${received === v ? "bg-g-ink text-white" : "bg-g-fill"}`}
                  >
                    {v === total ? "Exact" : money(v)}
                  </button>
                ))}
              </div>
              {received !== null && received > total && <p className="mt-3 text-[15px] font-semibold text-g-blue tabular-nums">Change {money(received - total)}</p>}
            </div>
          )}
        </section>

        <section className="mt-9">
          <StepHead n={2} title="Tip" aside="Goes to the team pool" />
          <div className="flex rounded-full bg-g-fill p-1">
            {[0, 5, 10, 15].map((p) => (
              <button
                key={p}
                onClick={() => {
                  haptic("tick");
                  setTipPct(p);
                }}
                aria-pressed={tipPct === p}
                className={`h-10 flex-1 rounded-full text-[14px] font-semibold transition-colors ${tipPct === p ? "bg-white text-g-ink" : "text-g-muted"}`}
              >
                {p ? `${p}%` : "No tip"}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-9">
          <StepHead n={3} title="Split the bill" aside="Optional" />
          <div className="flex items-center justify-between">
            <span className="text-[15px] text-g-muted">
              Between <span className="font-semibold text-g-ink tabular-nums">{split}</span> {split === 1 ? "guest" : "guests"}
            </span>
            <Counter value={split} min={1} max={Math.max(table.guests, 2)} onChange={setSplit} />
          </div>
        </section>
      </div>
    </Sheet>
  );
}

/* ---------------------------------------------------------------- Orders */

const total5 = (o: ClosedOrder) => o.subtotal + Math.round(o.subtotal * 0.05) + o.tip;

function OrdersView({
  tables,
  history,
  money,
  itemById,
  onOpenTable,
  onReceipt,
}: {
  tables: FloorTable[];
  history: ClosedOrder[];
  money: (n: number) => string;
  itemById: Map<string, MenuItem>;
  onOpenTable: (no: number) => void;
  onReceipt: (o: ClosedOrder) => void;
}) {
  const [view, setView] = useState<"open" | "closed">("open");
  const open = tables.filter((x) => x.lines.length);
  const groups: [string, FloorTable[]][] = [
    ["Bill asked", open.filter((x) => x.status === "bill")],
    ["In the kitchen", open.filter((x) => x.status !== "bill" && x.lines.some((l) => l.state !== "served"))],
    ["Served", open.filter((x) => x.status !== "bill" && x.lines.every((l) => l.state === "served"))],
  ];
  const takings = history.reduce((s, o) => s + total5(o), 0);
  const tips = history.reduce((s, o) => s + o.tip, 0);
  const summary = (ls: TicketLine[]) => {
    const names = ls.map((l) => `${l.qty}× ${itemById.get(l.itemId)?.name.en ?? ""}`);
    return names.slice(0, 2).join(", ") + (names.length > 2 ? ` +${names.length - 2}` : "");
  };
  return (
    <div className="px-5 pt-[max(20px,env(safe-area-inset-top))]">
      <PageHead title="Orders" sub="Today" />
      <Dash
        items={[
          { label: "Taken today", value: money(takings), sub: `${history.length} bills closed`, icon: Wallet, hot: true },
          { label: "Tips", value: money(tips), sub: "team pool", icon: Banknote, tone: "green" },
          { label: "Open now", value: String(open.length), sub: `${open.reduce((n, x) => n + x.lines.filter((l) => l.state !== "served").length, 0)} dishes in kitchen`, icon: ChefHat, tone: "orange" },
          { label: "Avg check", value: money(history.length ? Math.round(takings / history.length / 1000) * 1000 : 0), sub: "today", icon: ReceiptText, tone: "plain" },
        ]}
      />
      <div className="mt-4 flex rounded-full bg-g-fill p-1">
        {(
          [
            ["open", `Open · ${open.length}`],
            ["closed", `Closed · ${history.length}`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => {
              haptic("tick");
              setView(id);
              loadOnce(`orders:${id}`, 450);
            }}
            aria-pressed={view === id}
            className={`h-10 flex-1 rounded-full text-[14px] font-semibold transition-colors ${view === id ? "bg-white text-g-ink" : "text-g-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "open" ? (
        groups.map(([title, list]) =>
          list.length ? (
            <section key={title} className="mt-7">
              <h2 className="text-[13px] font-semibold tracking-[0.06em] text-g-muted uppercase">
                {title} · {list.length}
              </h2>
              <Reveal className="mt-1 divide-y divide-g-line">
                {list.map((x) => {
                  const cooking = x.lines.filter((l) => l.state !== "served").length;
                  return (
                    <button key={x.no} onClick={() => onOpenTable(x.no)} className="press flex w-full gap-3.5 py-4 text-left">
                      <span className={`grid size-12 shrink-0 place-items-center rounded-[16px] text-[18px] font-semibold tabular-nums ${x.status === "bill" ? "blue-grad" : "bg-g-fill"}`}>{x.no}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="text-[16px] font-semibold">Table {x.no}</span>
                          <span className="live shrink-0 text-[16px] font-semibold tabular-nums">{money(ticketTotal(x.lines))}</span>
                        </span>
                        <span className="live mt-0.5 block truncate text-[14px] text-g-ink-2">{summary(x.lines)}</span>
                        <span className="mt-1.5 flex items-center gap-2 text-[12px] text-g-muted">
                          {cooking > 0 && <span className="chip-orange inline-flex h-6 items-center rounded-full px-2 font-semibold">{cooking} cooking</span>}
                          <span className="live">
                            since {x.since} · {x.guests} guests
                          </span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </Reveal>
            </section>
          ) : null,
        )
      ) : (
        <Reveal className="mt-4 divide-y divide-g-line">
          {history.map((o) => {
            const { icon: Icon, label } = METHOD[o.method];
            return (
              <button key={o.id} onClick={() => onReceipt(o)} className="press flex w-full gap-3.5 py-4 text-left">
                <span className="grid size-12 shrink-0 place-items-center rounded-[16px] bg-g-fill text-g-blue">
                  <Icon size={20} strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="text-[16px] font-semibold">Table {o.table}</span>
                    <span className="live shrink-0 text-[16px] font-semibold tabular-nums">{money(total5(o))}</span>
                  </span>
                  <span className="live mt-0.5 block truncate text-[14px] text-g-ink-2">{summary(o.lines)}</span>
                  <span className="mt-1 flex items-center justify-between gap-2 text-[12px] text-g-muted">
                    <span className="live">
                      #{o.id} · {o.closedAt} · {label}
                    </span>
                    {o.tip > 0 && <span className="live shrink-0 font-semibold text-g-green tabular-nums">tip {money(o.tip)}</span>}
                  </span>
                </span>
              </button>
            );
          })}
        </Reveal>
      )}
      {view === "open" && !open.length && <p className="py-12 text-center text-[15px] text-g-muted">No open orders</p>}
    </div>
  );
}
