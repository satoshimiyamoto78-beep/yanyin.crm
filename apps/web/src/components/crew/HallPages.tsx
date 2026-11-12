"use client";

import { BellRing, CheckCheck, ChevronRight, Clock, CookingPot, Hourglass, ReceiptText, Users, Zap } from "lucide-react";
import type { MenuItem } from "@yanyin/domain";
import { ticketTotal, type ClosedOrder, type FloorTable, type TicketLine } from "@/lib/demo-floor";
import { haptic } from "@/lib/haptics";
import { Sheet } from "@/components/guest/ui";
import { ArtScene } from "@/components/system/Art";
import { compactMoney, ShiftMoney } from "./CrewApp";
import { useDish, useTr } from "./prefs";

/** Minutes since a "HH:MM" time by the demo clock (12:45). */
const ago = (t?: string) => {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return Math.max(0, 12 * 60 + 45 - ((h ?? 0) * 60 + (m ?? 0)));
};
const withService = (n: number) => Math.round(n * 1.05);
const paidOf = (o: ClosedOrder) => withService(o.subtotal) + o.tip;
const section = "mt-7 mb-2.5 flex items-center gap-2 text-[12px] font-semibold tracking-[0.06em] text-g-muted uppercase";

/**
 * Shift till: everything about money on this shift. A scene card with what is still to pay and
 * what is paid; then the tables that asked for the bill (longest first), the
 * other open tables, and today's paid bills. One tap opens a bill.
 */
export function BillsPage({ tables, history, money, onOpenBill, onReceipt, onClose }: { tables: FloorTable[]; history: ClosedOrder[]; money: (n: number) => string; onOpenBill: (no: number) => void; onReceipt: (o: ClosedOrder) => void; onClose: () => void }) {
  const tr = useTr();
  const live = (x: FloorTable) => x.lines.some((l) => !l.cancelled);
  const asking = tables.filter((x) => x.status === "bill" && live(x)).sort((a, b) => ago(b.since) - ago(a.since));
  const open = tables.filter((x) => (x.status === "ordered" || x.status === "seated") && live(x)).sort((a, b) => ago(b.since) - ago(a.since));
  const due = [...asking, ...open].reduce((n, x) => n + withService(ticketTotal(x.lines)), 0);
  const paid = history.filter((o) => o.subtotal > 0);
  const paidSum = paid.reduce((n, o) => n + paidOf(o), 0);

  const row = (x: FloorTable, hot: boolean) => (
    <button key={x.no} onClick={() => onOpenBill(x.no)} className="press flex w-full min-w-0 items-center gap-3 rounded-[20px] bg-g-fill p-3 text-left">
      <span className={`flex w-12 shrink-0 flex-col items-center rounded-[14px] py-1.5 ${hot ? "chip-orange" : "bg-g-card"}`}>
        <span className="text-[9px] leading-none font-semibold uppercase opacity-80">{tr("Table")}</span>
        <span className="text-[20px] leading-tight font-bold tabular-nums">{x.no}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold whitespace-nowrap tabular-nums">{money(withService(ticketTotal(x.lines)))}</span>
        <span className="mt-0.5 flex items-center gap-2.5 text-[12.5px] text-g-muted tabular-nums">
          <span className="flex items-center gap-1">
            <Users size={12} strokeWidth={2.2} /> {x.guests}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} strokeWidth={2.2} /> {tr("{n} min", { n: ago(x.since) })}
          </span>
        </span>
      </span>
      {hot ? (
        <span className="shrink-0 rounded-full bg-g-ink px-3.5 py-2 text-[13px] font-semibold text-white">{tr("Open it")}</span>
      ) : (
        <ChevronRight size={18} className="shrink-0 text-g-faint" />
      )}
    </button>
  );

  return (
    <Sheet open onClose={onClose} label={tr("Shift till")} title={false}>
      <div className="px-5 pt-1 pb-10">
        <h2 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">{tr("Shift till")}</h2>
        <p className="mt-1 text-[14px] text-g-muted">{tr("Everything about money on this shift")}</p>

        <ArtScene
          name="check"
          layout="row"
          focal={52}
          className="mt-4 rounded-[26px] p-4"
          footer={
            <div className="mt-4 flex items-center justify-between gap-3 rounded-[16px] bg-g-card/70 px-3.5 py-2.5">
              <span className="flex items-center gap-2 text-[13px] text-g-ink-2">
                <CheckCheck size={15} strokeWidth={2.4} className="text-g-green" /> {tr("Paid today")}
              </span>
              <span className="text-[15px] font-semibold whitespace-nowrap tabular-nums">
                {compactMoney(paidSum)} · {paid.length}
              </span>
            </div>
          }
        >
          <p className="text-[13px] font-semibold text-g-ink-2">{tr("Still to pay")}</p>
          <p className="mt-1 text-[28px] leading-none font-bold tracking-[-0.03em] whitespace-nowrap tabular-nums">{compactMoney(due)}</p>
          <p className="mt-1.5 text-[12.5px] text-g-muted">{tr("{n} open table|{n} open tables", { n: asking.length + open.length })}</p>
        </ArtScene>

        <h3 className={section}>
          <span className="size-2 rounded-full bg-g-orange" /> {tr("Want the bill")} · {asking.length}
        </h3>
        {asking.length ? (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-2">{asking.map((x) => row(x, true))}</div>
        ) : (
          <p className="rounded-[18px] bg-g-fill px-4 py-3.5 text-[14px] text-g-muted">{tr("No one is waiting")}</p>
        )}

        {open.length > 0 && (
          <>
            <h3 className={section}>
              {tr("Open")} · {open.length}
            </h3>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-2">{open.map((x) => row(x, false))}</div>
          </>
        )}

        {/* The shift's money: takings, tips and the average check. */}
        <h3 className={section}>{tr("Shift money")}</h3>
        <ShiftMoney history={history} />

        {paid.length > 0 && (
          <>
            <h3 className={section}>
              {tr("Paid today")} · {paid.length}
            </h3>
            <div className="divide-y divide-g-line rounded-[20px] bg-g-fill px-3.5">
              {paid.map((o) => (
                <button key={o.id} onClick={() => onReceipt(o)} className="press flex w-full min-w-0 items-center gap-3 py-3 text-left">
                  <span className="chip-green grid size-9 shrink-0 place-items-center rounded-full">
                    <ReceiptText size={16} strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{tr("Table {n}", { n: o.table })}</span>
                    <span className="block truncate text-[12.5px] text-g-muted tabular-nums">
                      {o.closedAt} · #{o.id}
                      {o.tip ? ` · ${tr("tip {sum}", { sum: compactMoney(o.tip) })}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-[15px] font-semibold whitespace-nowrap tabular-nums">{compactMoney(paidOf(o))}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}

/**
 * Kitchen, by table: every table with dishes not served yet is one card,
 * the longest-waiting table first. Each card shows the table, how long the
 * oldest dish waits, and its dishes with their state and time. Serve one dish
 * or the whole table; hurry the kitchen for a late one.
 */
export function KitchenPage({ tables, itemById, onServe, onServeAll, onHurry, onPing, onOpenTable, onClose }: { tables: FloorTable[]; itemById: Map<string, MenuItem>; onServe: (table: number, line: TicketLine) => void; onServeAll: (table: number) => void; onHurry: (table: number, line: TicketLine) => void; onPing: () => void; onOpenTable: (no: number) => void; onClose: () => void }) {
  const tr = useTr();
  const dish = useDish();
  const groups = tables
    .map((x) => ({ x, lines: x.lines.filter((l) => !l.cancelled && l.state !== "served").sort((a, b) => ago(b.at ?? x.since) - ago(a.at ?? x.since)) }))
    .filter((gr) => gr.lines.length)
    .map((gr) => ({ ...gr, wait: ago(gr.lines[0]!.at ?? gr.x.since) }))
    .sort((a, b) => b.wait - a.wait);
  const all = groups.flatMap((gr) => gr.lines);
  const cooking = all.filter((l) => l.state === "cooking").length;
  const waiting = all.filter((l) => l.state === "new").length;
  const longest = groups[0]?.wait ?? 0;

  return (
    <Sheet
      open
      onClose={onClose}
      label={tr("Kitchen")}
      title={false}
      footer={
        <button
          onClick={() => {
            haptic("success");
            onPing();
          }}
          className="blue-grad press flex h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-semibold"
        >
          <BellRing size={19} strokeWidth={2} /> {tr("Call the kitchen")}
        </button>
      }
    >
      <div className="px-5 pt-1 pb-8">
        <h2 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">{tr("Kitchen")}</h2>

        <ArtScene
          name="kitchen"
          layout="row"
          focal={52}
          className="mt-4 rounded-[26px] p-4"
          footer={
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                [CookingPot, tr("Cooking"), String(cooking), "text-g-orange"],
                [Hourglass, tr("New"), String(waiting), "text-g-blue"],
                [Clock, tr("Longest"), tr("{n} min", { n: longest }), longest >= 15 ? "text-g-orange" : "text-g-muted"],
              ].map(([Icon, label, value, tone]) => {
                const I = Icon as typeof Clock;
                return (
                  <span key={label as string} className="min-w-0 rounded-[14px] bg-g-card/70 px-2.5 py-2">
                    <span className="flex items-center gap-1 text-[11px] text-g-muted">
                      <I size={12} strokeWidth={2.4} className={tone as string} /> <span className="truncate">{label as string}</span>
                    </span>
                    <span className="block truncate text-[15px] font-semibold tabular-nums">{value as string}</span>
                  </span>
                );
              })}
            </div>
          }
        >
          <p className="text-[13px] font-semibold text-g-ink-2">{tr("Not on the tables yet")}</p>
          <p className="mt-1 text-[28px] leading-none font-bold tracking-[-0.03em] tabular-nums">{tr("{n} dish|{n} dishes", { n: all.reduce((n, l) => n + l.qty, 0) })}</p>
          <p className="mt-1.5 text-[12.5px] text-g-muted">{tr("{n} table|{n} tables", { n: groups.length })}</p>
        </ArtScene>

        {groups.length ? (
          <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-3">
            {groups.map(({ x, lines, wait }) => (
              <section key={x.no} className="rounded-[24px] bg-g-fill p-3.5">
                <header className="flex items-center gap-3">
                  <button onClick={() => onOpenTable(x.no)} className={`press flex w-12 shrink-0 flex-col items-center rounded-[14px] py-1.5 ${wait >= 15 ? "chip-orange" : "bg-g-card"}`}>
                    <span className="text-[9px] leading-none font-semibold uppercase opacity-80">{tr("Table")}</span>
                    <span className="text-[20px] leading-tight font-bold tabular-nums">{x.no}</span>
                  </button>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold">{tr("{n} dish|{n} dishes", { n: lines.reduce((n, l) => n + l.qty, 0) })}</span>
                    <span className={`flex items-center gap-1 text-[12.5px] tabular-nums ${wait >= 15 ? "font-semibold text-g-orange" : "text-g-muted"}`}>
                      <Clock size={12} strokeWidth={2.4} /> {tr("waiting up to {n} min", { n: wait })}
                    </span>
                  </span>
                  <button
                    onClick={() => {
                      haptic("success");
                      onServeAll(x.no);
                    }}
                    className="press h-9 shrink-0 rounded-full bg-g-ink px-3.5 text-[13px] font-semibold text-white"
                  >
                    {tr("All served")}
                  </button>
                </header>
                <div className="mt-3 divide-y divide-g-line rounded-[18px] bg-g-card px-3">
                  {lines.map((l) => {
                    const m = ago(l.at ?? x.since);
                    return (
                      <div key={l.id} className="flex min-w-0 items-center gap-2.5 py-2.5">
                        <span className={`grid size-8 shrink-0 place-items-center rounded-full ${l.state === "cooking" ? "chip-orange" : "chip-blue"}`}>
                          {l.state === "cooking" ? <CookingPot size={15} strokeWidth={2.2} /> : <Hourglass size={14} strokeWidth={2.2} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14.5px] font-semibold">
                            {l.qty}× {dish(itemById.get(l.itemId)?.name)}
                          </span>
                          <span className={`block text-[12px] tabular-nums ${m >= 15 ? "text-g-orange" : "text-g-muted"}`}>
                            {l.at ?? x.since} · {tr("{n} min", { n: m })}
                          </span>
                        </span>
                        {m >= 15 && (
                          <button
                            aria-label={tr("Hurry the kitchen")}
                            onClick={() => {
                              haptic("light");
                              onHurry(x.no, l);
                            }}
                            className="press grid size-8 shrink-0 place-items-center rounded-full bg-g-tint-orange text-g-orange"
                          >
                            <Zap size={15} strokeWidth={2.2} />
                          </button>
                        )}
                        <button
                          aria-label={tr("Served")}
                          onClick={() => {
                            haptic("success");
                            onServe(x.no, l);
                          }}
                          className="press grid size-8 shrink-0 place-items-center rounded-full bg-g-fill text-g-green"
                        >
                          <CheckCheck size={16} strokeWidth={2.4} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <p className="mt-5 rounded-[18px] bg-g-fill px-4 py-3.5 text-center text-[14px] text-g-muted">{tr("Everything is on the tables")}</p>
        )}
      </div>
    </Sheet>
  );
}
