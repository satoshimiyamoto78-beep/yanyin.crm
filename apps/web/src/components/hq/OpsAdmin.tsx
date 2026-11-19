"use client";

import {
  Banknote,
  Check,
  CreditCard,
  FileCheck2,
  Printer,
  QrCode,
  RotateCcw,
  Wallet,
  Users,
  Receipt,
  Lock,
} from "lucide-react";
import { useMemo, useState } from "react";
import { formatMoney, type Menu } from "@yanyin/domain";
import { haptic } from "@/lib/haptics";
import {
  ticketTotal,
  type ClosedOrder,
  type FloorData,
  type FloorTable,
  type PayMethod,
} from "@/lib/demo-floor";
import { Sheet } from "@/components/guest/ui";
import { PeekCard, useLongPress } from "@/components/guest/motion";
import { PeekActions, PeekHeader } from "@/components/system/PeekParts";
import {
  BrandQr,
  DataTable,
  EmptyState,
  Group,
  ListRow,
  Row,
  TextArea,
  Toolbar,
} from "@/components/system/Kit";
import { IconStat } from "@/components/system/Widgets";
import { compactMoney } from "@/components/crew/CrewApp";
import { useDish, useTr } from "@/components/crew/prefs";

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
const total5 = (o: ClosedOrder) =>
  o.subtotal + Math.round(o.subtotal * 0.05) + o.tip;

/* ---------------------------------------------------------------- Floor */

/** One table on the floor grid: tap opens it, hold peeks into it. */
function TableTile({
  t,
  word,
  tone,
  zone,
  onOpen,
  onPeek,
}: {
  t: FloorTable;
  word: (t: FloorTable) => string;
  tone: string;
  zone: string;
  onOpen: () => void;
  onPeek: () => void;
}) {
  const press = useLongPress(onPeek, onOpen);
  const sum = Math.round(ticketTotal(t.lines) * 1.05);
  return (
    <button
      type="button"
      data-hold
      {...press}
      style={{ WebkitTouchCallout: "none" }}
      className="press flex aspect-square flex-col justify-between rounded-[24px] bg-g-fill p-3 text-left select-none"
    >
      <span className="flex items-start justify-between">
        <span className="text-[26px] leading-none font-bold tabular-nums">
          {t.no}
        </span>
        <span
          className={`grid size-7 place-items-center rounded-full text-[11px] font-bold ${tone}`}
        >
          {t.seats}
        </span>
      </span>
      <span className="min-w-0">
        <span className="live block truncate text-[12px] font-semibold text-g-ink-2">
          {word(t)}
        </span>
        <span className="live block truncate text-[12px] text-g-muted tabular-nums">
          {sum ? compactMoney(sum) : zone}
        </span>
      </span>
    </button>
  );
}

export function FloorAdmin({
  floor,
  menu,
  notify,
}: {
  floor: FloorData;
  menu: Menu;
  notify: (t: string) => void;
}) {
  const dish = useDish();
  const items = useMemo(
    () =>
      new Map(menu.categories.flatMap((c) => c.items).map((i) => [i.id, i])),
    [menu],
  );
  const tr = useTr();
  const [zone, setZone] = useState<"all" | "Hall" | "Terrace">("all");
  const [open, setOpen] = useState<number | null>(null);
  const [print, setPrint] = useState(false);
  const [peek, setPeek] = useState<number | null>(null);
  const peeked =
    peek !== null ? floor.tables.find((x) => x.no === peek) : undefined;
  const money = (n: number) => formatMoney(n, floor.venue.currency, "en");
  const tables = floor.tables.filter((t) => zone === "all" || t.zone === zone);
  const busy = floor.tables.filter(
    (t) => t.status !== "free" && t.status !== "reserved",
  ).length;
  const tone = (t: FloorTable) =>
    t.status === "free"
      ? "chip-gray"
      : t.status === "reserved"
        ? "chip-blue"
        : t.status === "bill"
          ? "chip-orange"
          : "chip-green";
  const word = (t: FloorTable) =>
    t.status === "free"
      ? tr("Free")
      : t.status === "reserved"
        ? tr("Booked")
        : t.status === "bill"
          ? tr("Wants the bill")
          : t.status === "seated"
            ? tr("Ready to order")
            : tr("Eating");
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <IconStat
          art="tables"
          title={tr("Busy now")}
          value={`${busy}/${floor.tables.length}`}
          sub={tr("tables")}
        />
        <IconStat
          art="check"
          title={tr("Want the bill")}
          value={String(floor.tables.filter((t) => t.status === "bill").length)}
          sub={tr("tables")}
        />
        <IconStat
          art="bookings"
          title={tr("Booked")}
          value={String(
            floor.tables.filter((t) => t.status === "reserved").length,
          )}
          sub={tr("for later today")}
        />
        <IconStat
          art="seats"
          title={tr("Seats")}
          value={String(floor.tables.reduce((n, t) => n + t.seats, 0))}
          sub={tr("in two zones")}
        />
      </div>
      <div className="mt-6 flex items-center gap-2">
        {(["all", "Hall", "Terrace"] as const).map((z) => (
          <button
            key={z}
            type="button"
            aria-pressed={zone === z}
            onClick={() => (haptic("tick"), setZone(z))}
            className={`press h-10 rounded-full px-4 text-[14px] font-semibold transition-colors ${zone === z ? "bg-g-ink text-white" : "bg-g-fill text-g-ink-2"}`}
          >
            {z === "all" ? tr("All zones") : tr(z)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => (haptic("light"), setPrint(true))}
          className="press ml-auto flex h-10 items-center gap-1.5 rounded-full bg-g-fill px-4 text-[14px] font-semibold"
        >
          <Printer size={16} strokeWidth={2.2} className="text-g-blue" />{" "}
          <span className="hidden sm:inline">{tr("Print QR codes")}</span>
          <span className="sm:hidden">QR</span>
        </button>
      </div>
      {/* The floor as a grid of round-cornered tables, coloured by state; tap one for its page. */}
      <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
        {tables.map((t) => (
          <TableTile
            key={t.no}
            t={t}
            word={word}
            tone={tone(t)}
            zone={tr(t.zone)}
            onOpen={() => setOpen(t.no)}
            onPeek={() => setPeek(t.no)}
          />
        ))}
      </div>

      {/* Hold a table for a quick look: who sits there, the bill so far, two actions. */}
      {peeked && (
        <PeekCard
          onClose={() => setPeek(null)}
          label={tr("Table {n}", { n: peeked.no })}
        >
          <PeekHeader
            kicker={`${tr(peeked.zone)} · ${tr("{n} seat|{n} seats", { n: peeked.seats })}`}
            title={tr("Table {n}", { n: peeked.no })}
            facts={[
              {
                icon: Users,
                text: peeked.guests
                  ? `${tr("{n} guest|{n} guests", { n: peeked.guests })}${peeked.since ? ` · ${peeked.since}` : ""}`
                  : word(peeked),
              },
              {
                icon: Wallet,
                text: ticketTotal(peeked.lines)
                  ? money(Math.round(ticketTotal(peeked.lines) * 1.05))
                  : tr("Nothing ordered yet"),
                tone: "blue",
              },
            ]}
          />
          <PeekActions
            items={[
              {
                icon: Receipt,
                label: tr("Open the table"),
                onClick: () => (setPeek(null), setOpen(peeked.no)),
              },
              ...(peeked.lines.length
                ? [
                    {
                      icon: Printer,
                      label: tr("Print the pre-bill"),
                      onClick: () => (
                        setPeek(null),
                        notify(tr("Pre-bill sent to the printer"))
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </PeekCard>
      )}
      {open !== null && (
        <TablePage
          t={floor.tables.find((x) => x.no === open)!}
          word={word}
          money={money}
          name={(id) => dish(items.get(id)?.name)}
          onPrint={() => notify(tr("Pre-bill sent to the printer"))}
          onClose={() => setOpen(null)}
        />
      )}
      {print && (
        <PrintQr
          tables={floor.tables}
          onClose={() => setPrint(false)}
          onPrint={() => {
            notify(
              tr("Sent {n} QR codes to print", { n: floor.tables.length }),
            );
            setPrint(false);
          }}
        />
      )}
    </div>
  );
}

/** A table: who sits there and since when, the bill as it stands now (a pre-bill), and the table's QR code. */
function TablePage({
  t,
  word,
  money,
  name,
  onPrint,
  onClose,
}: {
  t: FloorTable;
  word: (t: FloorTable) => string;
  money: (n: number) => string;
  name: (id: string) => string;
  onPrint: () => void;
  onClose: () => void;
}) {
  const tr = useTr();
  const lines = t.lines.filter((l) => !l.cancelled);
  const sub = ticketTotal(t.lines);
  const service = Math.round(sub * 0.05);
  const state = {
    new: ["Just ordered", "text-g-blue"],
    cooking: ["In the kitchen", "text-g-orange"],
    served: ["Served", "text-g-green"],
  } as const;
  return (
    <Sheet
      open
      wide
      onClose={onClose}
      label={tr("Table {n}", { n: t.no })}
      title={false}
      footer={
        lines.length ? (
          <button
            type="button"
            onClick={() => (haptic("success"), onPrint())}
            className="press flex h-13 w-full items-center justify-center gap-2 rounded-full bg-g-ink text-[15px] font-semibold text-white md:w-auto md:px-8"
          >
            <Printer size={17} strokeWidth={2.2} /> {tr("Print the pre-bill")}
          </button>
        ) : undefined
      }
    >
      <div className="grid gap-6 px-5 pt-1 pb-10 md:grid-cols-[1fr_260px] md:items-start">
        <div className="min-w-0">
          <h2 className="text-[28px] leading-tight font-bold tracking-[-0.025em]">
            {tr("Table {n}", { n: t.no })}
          </h2>
          <p className="mt-0.5 text-[14px] text-g-muted">
            {[
              tr(t.zone),
              tr("{n} seat|{n} seats", { n: t.seats }),
              word(t),
            ].join(" · ")}
          </p>
          <p className="mt-1 text-[14px] text-g-ink-2">
            {t.guests
              ? `${tr("{n} guest|{n} guests", { n: t.guests })}${t.since ? ` · ${tr("Seated at {t}", { t: t.since })}` : ""}`
              : t.booking
                ? `${t.booking.name} · ${t.booking.time}`
                : tr("Waiting for guests")}
          </p>

          {/* The bill as it stands: every dish, its state, then service and the total. */}
          {lines.length ? (
            <div className="mt-5 rounded-[24px] bg-g-fill p-4">
              <p className="text-[13px] font-semibold text-g-muted">
                {tr("Bill now")}
              </p>
              <div className="mt-2 divide-y divide-g-line">
                {lines.map((l) => (
                  <div key={l.id} className="flex items-baseline gap-3 py-2.5">
                    <span className="w-6 shrink-0 text-[14px] font-semibold text-g-muted tabular-nums">
                      {l.qty}×
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] leading-snug font-medium">
                        {name(l.itemId)}
                      </span>
                      <span
                        className={`text-[12.5px] font-medium ${state[l.state][1]}`}
                      >
                        {tr(state[l.state][0])}
                        {l.at ? (
                          <span className="font-normal text-g-faint">
                            {" "}
                            · {l.at}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className="shrink-0 text-[15px] font-semibold tabular-nums">
                      {money(l.price * l.qty)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 grid gap-1 border-t border-g-line pt-3 text-[14px]">
                <p className="flex justify-between text-g-muted">
                  <span>{tr("Subtotal")}</span>
                  <span className="tabular-nums">{money(sub)}</span>
                </p>
                <p className="flex justify-between text-g-muted">
                  <span>{tr("Service 5%")}</span>
                  <span className="tabular-nums">{money(service)}</span>
                </p>
                <p className="mt-1 flex items-baseline justify-between text-[18px] font-bold">
                  <span>{tr("Total")}</span>
                  <span className="tabular-nums">{money(sub + service)}</span>
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-5 rounded-[24px] bg-g-fill px-5 py-4 text-[14px] text-g-muted">
              {tr("Nothing ordered yet")}
            </p>
          )}
        </div>
        <div className="flex flex-col items-center rounded-[24px] bg-g-fill p-5 text-center">
          <BrandQr
            value={`https://yanyin.app/m/samarkand?table=${t.no}`}
            size={148}
            label={tr("Table QR code")}
          />
          <p className="mt-3 text-[14px] font-semibold">
            {tr("Guests scan it to order")}
          </p>
          <p className="mt-0.5 text-[12px] break-all text-g-muted">
            yanyin.app/m/samarkand?table={t.no}
          </p>
        </div>
      </div>
    </Sheet>
  );
}

function PrintQr({
  tables,
  onClose,
  onPrint,
}: {
  tables: FloorTable[];
  onClose: () => void;
  onPrint: () => void;
}) {
  const tr = useTr();
  return (
    <Sheet
      open
      wide
      onClose={onClose}
      label={tr("Print QR codes")}
      footer={
        <button
          type="button"
          onClick={() => (haptic("success"), onPrint())}
          className="blue-grad press flex h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-semibold"
        >
          <Printer size={18} strokeWidth={2.2} />{" "}
          {tr("Print {n} cards", { n: tables.length })}
        </button>
      }
    >
      <div className="px-5 pt-2 pb-10">
        <p className="text-[14px] text-g-muted">
          {tr(
            'A6 table cards: the code, the table number and "Scan to order". Laminate them or put them in stands.',
          )}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {tables.map((t) => (
            <div
              key={t.no}
              className="flex flex-col items-center rounded-[22px] bg-white p-3 text-[#0b0b0f] shadow-[0_1px_3px_rgba(11,11,15,0.1),0_10px_24px_-16px_rgba(11,11,15,0.3)]"
            >
              <BrandQr
                value={`https://yanyin.app/m/samarkand?table=${t.no}`}
                size={112}
                label={tr("Table QR code")}
              />
              <p className="mt-2 text-[22px] leading-none font-bold">{t.no}</p>
              <p className="mt-1 text-[11px] font-semibold tracking-[0.06em] uppercase opacity-60">
                {tr("Scan to order")}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

/* ---------------------------------------------------------------- Orders */

type Bill = {
  id: string;
  table: number;
  at: string;
  total: number;
  method?: PayMethod;
  guests: number;
  state: "open" | "paid" | "refund";
  lines: ClosedOrder["lines"];
  tip: number;
  subtotal: number;
  waiter: string;
};

export function OrdersAdmin({
  floor,
  menu,
  notify,
  owner = true,
}: {
  floor: FloorData;
  menu: Menu;
  notify: (t: string) => void;
  /** Refunds move money back: only the owner makes them, the admin sees the bill. */
  owner?: boolean;
}) {
  const tr = useTr();
  const dish = useDish();
  const money = (n: number) => formatMoney(n, floor.venue.currency, "en");
  const items = useMemo(
    () =>
      new Map(menu.categories.flatMap((c) => c.items).map((i) => [i.id, i])),
    [menu],
  );
  const [refunds, setRefunds] = useState<
    Record<string, { reason: string; amount: number }>
  >({});
  const bills: Bill[] = useMemo(
    () => [
      ...floor.tables
        .filter((t) => t.lines.length)
        .map((t) => ({
          id: `T${t.no}`,
          table: t.no,
          at: t.since ?? "12:00",
          total: Math.round(ticketTotal(t.lines) * 1.05),
          guests: t.guests,
          state: "open" as const,
          lines: t.lines,
          tip: 0,
          subtotal: ticketTotal(t.lines),
          waiter: t.no % 2 ? "linh" : "minh",
        })),
      ...floor.history.map((o) => ({
        id: String(o.id),
        table: o.table,
        at: o.closedAt,
        total: total5(o),
        method: o.method,
        guests: o.guests,
        state: (refunds[String(o.id)] ? "refund" : "paid") as Bill["state"],
        lines: o.lines,
        tip: o.tip,
        subtotal: o.subtotal,
        waiter: o.table % 2 ? "linh" : "minh",
      })),
    ],
    [floor, refunds],
  );
  const [q, setQ] = useState("");
  const [f, setF] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const rows = bills.filter(
    (b) =>
      (f === "all" || b.state === f) &&
      (!q ||
        `${b.id} ${b.table} ${b.waiter}`.includes(q.trim().replace("#", ""))),
  );
  const tone = {
    open: "chip-blue",
    paid: "chip-green",
    refund: "chip-red",
  } as const;
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
          {
            id: "open",
            label: tr("Open"),
            count: bills.filter((b) => b.state === "open").length,
          },
          {
            id: "paid",
            label: tr("Paid"),
            count: bills.filter((b) => b.state === "paid").length,
          },
          {
            id: "refund",
            label: tr("Refunds"),
            count: bills.filter((b) => b.state === "refund").length,
          },
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
            {
              key: "id",
              label: tr("Bill"),
              width: "110px",
              render: (b) => (
                <span className="font-semibold tabular-nums">
                  {b.state === "open" ? "—" : `#${b.id}`}
                </span>
              ),
            },
            {
              key: "table",
              label: tr("Table"),
              width: "90px",
              render: (b) => (
                <span className="font-semibold tabular-nums">{b.table}</span>
              ),
              sort: (b) => b.table,
            },
            {
              key: "at",
              label: tr("Time"),
              width: "90px",
              render: (b) => (
                <span className="tabular-nums text-g-muted">{b.at}</span>
              ),
              sort: (b) => b.at,
            },
            {
              key: "waiter",
              label: tr("Waiter"),
              render: (b) => <span className="text-g-blue">@{b.waiter}</span>,
            },
            {
              key: "pay",
              label: tr("Paid by"),
              render: (b) =>
                b.method ? (
                  tr(METHOD[b.method].label)
                ) : (
                  <span className="text-g-faint">—</span>
                ),
            },
            {
              key: "state",
              label: tr("Status"),
              render: (b) => (
                <span
                  className={`rounded-full px-2.5 py-1 text-[12.5px] font-semibold ${tone[b.state]}`}
                >
                  {word[b.state]}
                </span>
              ),
            },
            {
              key: "total",
              label: tr("Total"),
              align: "right",
              render: (b) => (
                <span className="font-semibold">{money(b.total)}</span>
              ),
              sort: (b) => b.total,
            },
          ]}
          mobile={(b) => (
            <ListRow
              onClick={() => setOpen(b.id)}
              badge={b.table}
              badgeTone={tone[b.state]}
              title={
                b.state === "open"
                  ? tr("Table {n} · open", { n: b.table })
                  : `#${b.id} · ${word[b.state]}`
              }
              sub={`${b.at} · @${b.waiter}${b.method ? ` · ${tr(METHOD[b.method].label)}` : ""}`}
              right={
                <span className="shrink-0 text-[14.5px] font-semibold tabular-nums">
                  {compactMoney(b.total)}
                </span>
              }
            />
          )}
          empty={
            <EmptyState
              art="orders"
              title={tr("No bills yet today")}
              text={tr("They appear here as tables order and pay.")}
            />
          }
        />
      </div>
      {bill && (
        <BillPage
          bill={bill}
          name={(id) => dish(items.get(id)?.name)}
          money={money}
          refunded={refunds[bill.id]}
          owner={owner}
          onClose={() => setOpen(null)}
          onRefund={(reason, amount) => {
            setRefunds((r) => ({ ...r, [bill.id]: { reason, amount } }));
            notify(
              tr("Refund {sum} · the e-invoice is adjusted", {
                sum: compactMoney(amount),
              }),
            );
          }}
        />
      )}
    </div>
  );
}

function BillPage({
  bill,
  name,
  money,
  refunded,
  owner,
  onClose,
  onRefund,
}: {
  bill: Bill;
  name: (id: string) => string;
  money: (n: number) => string;
  refunded?: { reason: string; amount: number };
  owner: boolean;
  onClose: () => void;
  onRefund: (reason: string, amount: number) => void;
}) {
  const tr = useTr();
  const [pick, setPick] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [refunding, setRefunding] = useState(false);
  const amount = Math.round(
    bill.lines
      .filter((l) => pick.includes(l.id))
      .reduce((n, l) => n + l.price * l.qty, 0) * 1.05,
  );
  return (
    <Sheet
      open
      wide
      onClose={onClose}
      label={
        bill.state === "open"
          ? tr("Table {n}", { n: bill.table })
          : `#${bill.id}`
      }
      footer={
        bill.state === "paid" && !refunded && !owner ? (
          <p className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-g-fill text-[14.5px] font-semibold text-g-muted">
            <Lock size={16} strokeWidth={2.2} />{" "}
            {tr("Refunds are made by the owner")}
          </p>
        ) : bill.state === "paid" && !refunded ? (
          refunding ? (
            <button
              type="button"
              disabled={!amount || reason.trim().length < 3}
              onClick={() => (
                haptic("success"),
                onRefund(reason.trim(), amount),
                setRefunding(false)
              )}
              className="press flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#e5484d] text-[16px] font-semibold text-white transition-opacity disabled:opacity-40"
            >
              <RotateCcw size={18} strokeWidth={2.2} />{" "}
              {amount
                ? tr("Refund {sum}", { sum: money(amount) })
                : tr("Pick the dishes")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => (haptic("light"), setRefunding(true))}
              className="press flex h-14 w-full items-center justify-center gap-2 rounded-full bg-g-fill text-[16px] font-semibold"
            >
              <RotateCcw size={18} strokeWidth={2.2} /> {tr("Make a refund")}
            </button>
          )
        ) : undefined
      }
    >
      <div className="grid gap-5 px-5 pt-2 pb-10 md:grid-cols-[1fr_300px] md:items-start">
        <div>
          <h2 className="text-[30px] leading-tight font-bold tracking-[-0.025em]">
            {bill.state === "open"
              ? tr("Table {n}", { n: bill.table })
              : tr("Bill #{n}", { n: bill.id })}
          </h2>
          <p className="text-[14px] text-g-muted">
            {tr("Table {n}", { n: bill.table })} · {bill.at} · @{bill.waiter} ·{" "}
            {tr("{n} guest|{n} guests", { n: bill.guests })}
          </p>
          <div className="card mt-4 rounded-[24px] p-1.5">
            {bill.lines.map((l) => {
              const on = pick.includes(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  disabled={!refunding}
                  onClick={() => (
                    haptic("tick"),
                    setPick((p) =>
                      on ? p.filter((x) => x !== l.id) : [...p, l.id],
                    )
                  )}
                  className={`flex w-full items-center gap-3 rounded-full px-3 py-3 text-left transition-colors ${on ? "bg-[#e5484d]/10" : ""}`}
                >
                  {refunding && (
                    <span
                      className={`grid size-6 shrink-0 place-items-center rounded-full ${on ? "bg-[#e5484d] text-white" : "bg-g-fill-2"}`}
                    >
                      {on && <Check size={14} strokeWidth={3} />}
                    </span>
                  )}
                  <span className="w-8 shrink-0 text-[15px] font-bold tabular-nums">
                    {l.qty}×
                  </span>
                  <span
                    className={`min-w-0 flex-1 truncate text-[15px] ${l.cancelled ? "text-g-faint line-through" : ""}`}
                  >
                    {name(l.itemId)}
                  </span>
                  <span className="shrink-0 text-[15px] font-semibold tabular-nums">
                    {money(l.price * l.qty)}
                  </span>
                </button>
              );
            })}
            <div className="mx-3 mt-1 grid gap-1.5 border-t border-g-line py-3 text-[14px]">
              <p className="flex justify-between text-g-muted">
                <span>{tr("Service 5%")}</span>
                <span className="tabular-nums">
                  {money(Math.round(bill.subtotal * 0.05))}
                </span>
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
              <p className="mb-2 px-1 text-[14px] font-semibold text-g-ink-2">
                {tr("Why")}
              </p>
              <TextArea
                value={reason}
                onChange={setReason}
                placeholder={tr(
                  "The dish was cold, the guest changed their mind…",
                )}
                rows={2}
              />
            </div>
          )}
        </div>
        <div className="grid gap-3">
          <Group>
            {bill.method && (
              <Row
                icon={METHOD[bill.method].icon}
                title={tr(METHOD[bill.method].label)}
                sub={tr("Paid at {t}", { t: bill.at })}
              />
            )}
            <Row
              icon={FileCheck2}
              title={
                bill.state === "open"
                  ? tr("E-invoice after payment")
                  : tr("E-invoice sent")
              }
              sub={
                bill.state === "open"
                  ? tr("Goes to the tax office when the bill is paid")
                  : `MISA · ${tr("code")} C26TAA-${bill.id}`
              }
            />
          </Group>
          {refunded && (
            <p className="chip-red rounded-[24px] px-4 py-3 text-[13.5px] leading-snug font-medium">
              {tr("Refunded {sum}: {reason}", {
                sum: money(refunded.amount),
                reason: refunded.reason,
              })}
            </p>
          )}
        </div>
      </div>
    </Sheet>
  );
}

/* ---------------------------------------------------------------- Reports */
