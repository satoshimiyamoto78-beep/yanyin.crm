"use client";

import { allItems, formatMoney, t, type Menu, type MenuItem } from "@yanyin/domain";
import {
  Armchair,
  Banknote,
  CalendarDays,
  ChefHat,
  Clock,
  CreditCard,
  LayoutGrid,
  Minus,
  Plus,
  Printer,
  QrCode,
  ReceiptText,
  Search,
  Send,
  Trophy,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import type { CrewData } from "@/lib/demo-crew";
import { ticketTotal, type Booking, type ClosedOrder, type FloorData, type FloorTable, type LineState, type PayMethod, type TicketLine } from "@/lib/demo-floor";
import { haptic } from "@/lib/haptics";
import { Reveal } from "@/components/guest/motion";
import { Sheet, StepHead } from "@/components/guest/ui";
import { BookingsView, NewBookingPage } from "./Bookings";
import { CrewBoard } from "./CrewBoard";

type Tab = "tables" | "orders" | "bookings" | "me";

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
  const [tab, setTab] = useState<Tab>("tables");
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

  return (
    <div className="min-h-dvh bg-white text-g-ink">
      <div className="mx-auto max-w-[480px] pb-28">
        {tab === "tables" && <TablesView tables={tables} money={money} onOpen={setOpen} />}
        {tab === "orders" && <OrdersView tables={tables} history={history} money={money} onOpenTable={setOpen} onReceipt={setReceipt} />}
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
        {tab === "me" && <CrewBoard data={data} embedded />}
      </div>

      {/* Tab bar */}
      <nav aria-label="Sections" className="fixed inset-x-0 bottom-0 z-40 border-t border-g-line bg-white/95 backdrop-blur-xl">
        <div className="mx-auto grid max-w-[480px] grid-cols-4 px-2 pt-1.5 pb-[max(8px,env(safe-area-inset-bottom))]">
          {(
            [
              ["tables", "Tables", LayoutGrid, billCount],
              ["orders", "Orders", ReceiptText, 0],
              ["bookings", "Bookings", CalendarDays, 0],
              ["me", "Me", Trophy, 0],
            ] as const
          ).map(([id, label, Icon, badge]) => (
            <button
              key={id}
              onClick={() => {
                haptic("tick");
                setTab(id);
                window.scrollTo({ top: 0 });
              }}
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
          onAdvance={(lineId) => patch(table.no, (x) => ({ ...x, lines: x.lines.map((l) => (l.id === lineId ? { ...l, state: LINE[l.state].next } : l)) }))}
          onTakeOrder={() => setPage("picker")}
          onCheck={() => {
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

/* ---------------------------------------------------------------- Tables */

function TablesView({ tables, money, onOpen }: { tables: FloorTable[]; money: (n: number) => string; onOpen: (no: number) => void }) {
  const [zone, setZone] = useState<"All" | FloorTable["zone"]>("All");
  const shown = tables.filter((x) => zone === "All" || x.zone === zone);
  const busy = tables.filter((x) => x.status !== "free" && x.status !== "reserved").length;
  return (
    <div className="px-5 pt-[max(20px,env(safe-area-inset-top))]">
      <PageHead title="Tables" sub={`${busy} of ${tables.length} busy · Samarkand`} />
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
      <Reveal className="mt-5 grid grid-cols-3 gap-2.5">
        {shown.map((x) => {
          const total = ticketTotal(x.lines);
          const bill = x.status === "bill";
          return (
            <button
              key={x.no}
              onClick={() => {
                haptic("light");
                onOpen(x.no);
              }}
              className={`press flex aspect-[0.92] flex-col justify-between rounded-[22px] p-3 text-left ${bill ? "blue-grad" : x.status === "reserved" ? "border-[1.5px] border-dashed border-g-fill-2" : x.status === "free" ? "bg-g-fill" : "bg-g-blue-soft"}`}
            >
              <span className="flex items-start justify-between">
                <span className="text-[28px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{x.no}</span>
                <span className={`flex items-center gap-0.5 text-[12px] font-medium ${bill ? "text-white/75" : "text-g-muted"}`}>
                  <Users size={12} strokeWidth={2} /> {x.status === "free" || x.status === "reserved" ? x.seats : x.guests}
                </span>
              </span>
              <span>
                <span className={`live block text-[13px] font-semibold tabular-nums ${bill ? "text-white" : ""}`}>
                  {x.status === "reserved" ? x.booking?.time : total ? money(total) : x.status === "free" ? "" : x.since}
                </span>
                <span className={`mt-0.5 block text-[12px] font-medium ${bill ? "text-white/75" : x.status === "free" ? "text-g-faint" : x.status === "reserved" ? "text-g-purple" : "text-g-blue"}`}>
                  {x.status === "reserved" ? x.booking?.name : STATUS[x.status].label}
                </span>
              </span>
            </button>
          );
        })}
      </Reveal>
      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[12px] font-medium text-g-muted">
        {[
          ["bg-g-fill", "Free"],
          ["bg-g-blue-soft", "Busy"],
          ["blue-grad", "Bill asked"],
          ["border-[1.5px] border-dashed border-g-fill-2", "Reserved"],
        ].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1.5">
            <span className={`size-3 rounded-[4px] ${c}`} /> {l}
          </span>
        ))}
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
  const simple = (i: MenuItem) => i.price > 0 && !i.variants.length && !i.modifierGroups.some((g) => g.required);
  const query = q.trim().toLowerCase();
  const list = menu.categories.flatMap((c) => c.items.filter((i) => simple(i) && (query ? (i.name.en ?? "").toLowerCase().includes(query) : c.id === cat)));
  const all = allItems(menu);
  const count = Object.values(picked).reduce((s, n) => s + n, 0);
  const total = Object.entries(picked).reduce((s, [id, n]) => s + (all.find((i) => i.id === id)?.price ?? 0) * n, 0);
  const set = (id: string, n: number) => {
    haptic("tick");
    setPicked((p) => {
      const next = { ...p };
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });
  };
  return (
    <Sheet
      open
      onClose={onClose}
      label={`Table ${table.no} · add items`}
      footer={
        <button
          disabled={!count}
          onClick={() => {
            onSend(Object.entries(picked).map(([itemId, qty]) => ({ id: lineId(), itemId, qty, price: all.find((i) => i.id === itemId)?.price ?? 0, state: "new" as const })));
          }}
          className="blue-grad press flex h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-semibold tabular-nums disabled:opacity-40"
        >
          <Send size={18} strokeWidth={2} /> Send to kitchen{count ? ` · ${count} · ${money(total)}` : ""}
        </button>
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
                  <div className="flex h-10 w-[104px] items-center justify-between rounded-full bg-g-ink px-1 text-white">
                    <button aria-label="Remove one" onClick={() => set(i.id, n - 1)} className="grid size-8 place-items-center">
                      <Minus size={16} />
                    </button>
                    <span className="text-[15px] font-semibold tabular-nums">{n}</span>
                    <button aria-label="Add one" onClick={() => set(i.id, n + 1)} className="grid size-8 place-items-center">
                      <Plus size={16} />
                    </button>
                  </div>
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

function OrdersView({
  tables,
  history,
  money,
  onOpenTable,
  onReceipt,
}: {
  tables: FloorTable[];
  history: ClosedOrder[];
  money: (n: number) => string;
  onOpenTable: (no: number) => void;
  onReceipt: (o: ClosedOrder) => void;
}) {
  const [view, setView] = useState<"open" | "closed">("open");
  const openTables = tables.filter((x) => x.lines.length);
  const takings = history.reduce((s, o) => s + o.subtotal + Math.round(o.subtotal * 0.05) + o.tip, 0);
  return (
    <div className="px-5 pt-[max(20px,env(safe-area-inset-top))]">
      <PageHead title="Orders" sub={`Today · ${history.length} closed · ${money(takings)}`} />
      <div className="mt-5 flex rounded-full bg-g-fill p-1">
        {(
          [
            ["open", `Open · ${openTables.length}`],
            ["closed", `Closed · ${history.length}`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => {
              haptic("tick");
              setView(id);
            }}
            aria-pressed={view === id}
            className={`h-10 flex-1 rounded-full text-[14px] font-semibold transition-colors ${view === id ? "bg-white text-g-ink" : "text-g-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <Reveal key={view} className="mt-3 divide-y divide-g-line">
        {view === "open"
          ? openTables.map((x) => {
              const cooking = x.lines.filter((l) => l.state !== "served").length;
              return (
                <button key={x.no} onClick={() => onOpenTable(x.no)} className="press flex w-full items-center gap-3.5 py-4 text-left">
                  <span className={`grid size-12 shrink-0 place-items-center rounded-[16px] text-[17px] font-semibold tabular-nums ${x.status === "bill" ? "blue-grad" : "bg-g-fill"}`}>{x.no}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-semibold">Table {x.no}</span>
                    <span className="live block text-[13px] text-g-muted">
                      {x.lines.reduce((s, l) => s + l.qty, 0)} items · since {x.since}
                      {cooking ? ` · ${cooking} in kitchen` : " · all served"}
                    </span>
                  </span>
                  <span className="live shrink-0 text-[15px] font-semibold tabular-nums">{money(ticketTotal(x.lines))}</span>
                </button>
              );
            })
          : history.map((o) => {
              const { icon: Icon, label } = METHOD[o.method];
              return (
                <button key={o.id} onClick={() => onReceipt(o)} className="press flex w-full items-center gap-3.5 py-4 text-left">
                  <span className="grid size-12 shrink-0 place-items-center rounded-[16px] bg-g-fill text-g-muted">
                    <Icon size={20} strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-semibold">
                      #{o.id} · Table {o.table}
                    </span>
                    <span className="live block text-[13px] text-g-muted">
                      {o.closedAt} · {o.lines.reduce((s, l) => s + l.qty, 0)} items · {label}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="live block text-[15px] font-semibold tabular-nums">{money(o.subtotal + Math.round(o.subtotal * 0.05) + o.tip)}</span>
                    {o.tip > 0 && <span className="live block text-[12px] text-g-green tabular-nums">tip {money(o.tip)}</span>}
                  </span>
                </button>
              );
            })}
        {view === "open" && !openTables.length && <p className="py-12 text-center text-[15px] text-g-muted">No open orders</p>}
      </Reveal>
    </div>
  );
}
