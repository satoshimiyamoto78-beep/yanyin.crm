"use client";

import { BellRing, ChefHat, CheckCheck, ChevronRight, Clock, CookingPot, Hourglass, ReceiptText, Zap } from "lucide-react";
import type { MenuItem } from "@yanyin/domain";
import { ticketTotal, type ClosedOrder, type FloorTable, type TicketLine } from "@/lib/demo-floor";
import { haptic } from "@/lib/haptics";
import { Sheet } from "@/components/guest/ui";
import { useDish, useTr } from "./prefs";

/** Minutes since a "HH:MM" time by the demo clock (12:45). */
const ago = (t?: string) => {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return Math.max(0, 12 * 60 + 45 - ((h ?? 0) * 60 + (m ?? 0)));
};
const SERVICE = 1.05;

/**
 * Bills: everything about money on the floor in one place. Who asks for the
 * bill now (oldest first), the other open tables with what they would pay,
 * and what is already paid today. One tap opens a bill.
 */
export function BillsPage({ tables, history, money, onOpenBill, onReceipt, onClose }: { tables: FloorTable[]; history: ClosedOrder[]; money: (n: number) => string; onOpenBill: (no: number) => void; onReceipt: (o: ClosedOrder) => void; onClose: () => void }) {
  const tr = useTr();
  const asking = tables.filter((x) => x.status === "bill").sort((a, b) => ago(b.since) - ago(a.since));
  const open = tables.filter((x) => (x.status === "ordered" || x.status === "seated") && x.lines.length).sort((a, b) => ago(b.since) - ago(a.since));
  const due = [...asking, ...open].reduce((n, x) => n + Math.round(ticketTotal(x.lines) * SERVICE), 0);
  const paid = history.reduce((n, o) => n + o.subtotal + Math.round(o.subtotal * 0.05) + o.tip, 0);
  // Render helpers (plain functions, not components, so nothing remounts).
  const row = (x: FloorTable, hot?: boolean) => (
    <button key={x.no} onClick={() => onOpenBill(x.no)} className="press flex w-full items-center gap-3 rounded-[20px] bg-g-fill p-3 text-left">
      <span className={`grid size-12 shrink-0 place-items-center rounded-[16px] text-[20px] font-bold tabular-nums ${hot ? "chip-orange" : "bg-g-card"}`}>{x.no}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold tabular-nums">{money(Math.round(ticketTotal(x.lines) * SERVICE))}</span>
        <span className="block truncate text-[12.5px] text-g-muted">
          {tr("{n} guest|{n} guests", { n: x.guests })} · {tr("{n} min", { n: ago(x.since) })} {tr("at the table")}
        </span>
      </span>
      <span className={`shrink-0 rounded-full px-3.5 py-2 text-[13px] font-semibold ${hot ? "bg-g-ink text-white" : "bg-g-card"}`}>{hot ? tr("Open bill") : tr("Bring the bill")}</span>
    </button>
  );
  return (
    <Sheet open onClose={onClose} label={tr("Bills")} title={false}>
      <div className="px-5 pt-1 pb-10">
        <h2 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">{tr("Bills")}</h2>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-[20px] bg-g-tint-orange p-3.5">
            <p className="text-[12.5px] font-semibold text-g-ink-2">{tr("Still to pay")}</p>
            <p className="mt-1 text-[22px] leading-none font-bold tabular-nums">{money(due)}</p>
            <p className="mt-1 text-[12px] text-g-muted">{tr("{n} open table|{n} open tables", { n: asking.length + open.length })}</p>
          </div>
          <div className="rounded-[20px] bg-g-tint-green p-3.5">
            <p className="text-[12.5px] font-semibold text-g-ink-2">{tr("Paid today")}</p>
            <p className="mt-1 text-[22px] leading-none font-bold tabular-nums">{money(paid)}</p>
            <p className="mt-1 text-[12px] text-g-muted">{tr("{n} bill paid today|{n} bills paid today", { n: history.length })}</p>
          </div>
        </div>

        <h3 className="mt-7 mb-2.5 flex items-center gap-2 text-[12px] font-semibold tracking-[0.06em] text-g-muted uppercase">
          <span className="size-2 rounded-full bg-g-orange" /> {tr("Want the bill")} · {asking.length}
        </h3>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-2">{asking.length ? asking.map((x) => row(x, true)) : <p className="py-3 text-[14px] text-g-muted">{tr("No one is waiting")}</p>}</div>

        {open.length > 0 && (
          <>
            <h3 className="mt-7 mb-2.5 text-[12px] font-semibold tracking-[0.06em] text-g-muted uppercase">
              {tr("Open")} · {open.length}
            </h3>
            <div className="grid grid-cols-[minmax(0,1fr)] gap-2">{open.map((x) => row(x))}</div>
          </>
        )}

        <h3 className="mt-7 mb-1 text-[12px] font-semibold tracking-[0.06em] text-g-muted uppercase">
          {tr("Paid today")} · {history.length}
        </h3>
        <div className="divide-y divide-g-line">
          {history.map((o) => (
            <button key={o.id} onClick={() => onReceipt(o)} className="press flex w-full items-center gap-3 py-3 text-left">
              <span className="chip-green grid size-10 shrink-0 place-items-center rounded-full">
                <ReceiptText size={17} strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">
                  {tr("Table {n}", { n: o.table })} · #{o.id}
                </span>
                <span className="block text-[12.5px] text-g-muted tabular-nums">
                  {o.closedAt}
                  {o.tip ? ` · ${tr("tip {sum}", { sum: money(o.tip) })}` : ""}
                </span>
              </span>
              <span className="shrink-0 text-[15px] font-semibold tabular-nums">{money(o.subtotal + Math.round(o.subtotal * 0.05) + o.tip)}</span>
              <ChevronRight size={16} className="shrink-0 text-g-faint" />
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

/**
 * Kitchen: every dish of the waiter's tables that is not on a table yet,
 * longest waiting first, with when it was ordered. Hurry the kitchen for one
 * dish, mark it served when it leaves the pass, or call the kitchen.
 */
export function KitchenPage({ tables, itemById, onServe, onHurry, onPing, onOpenTable, onClose }: { tables: FloorTable[]; itemById: Map<string, MenuItem>; onServe: (table: number, line: TicketLine) => void; onHurry: (table: number, line: TicketLine) => void; onPing: () => void; onOpenTable: (no: number) => void; onClose: () => void }) {
  const tr = useTr();
  const dish = useDish();
  const rows = tables
    .flatMap((x) => x.lines.filter((l) => !l.cancelled && l.state !== "served").map((l) => ({ x, l })))
    .sort((a, b) => ago(b.l.at ?? b.x.since) - ago(a.l.at ?? a.x.since));
  const cooking = rows.filter((r) => r.l.state === "cooking");
  const waiting = rows.filter((r) => r.l.state === "new");
  const group = (title: string, list: typeof rows, Icon: typeof CookingPot, tone: string) =>
    list.length ? (
      <>
        <h3 className="mt-7 mb-2.5 flex items-center gap-2 text-[12px] font-semibold tracking-[0.06em] text-g-muted uppercase">
          <Icon size={14} strokeWidth={2.4} className={tone} /> {title} · {list.length}
        </h3>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
          {list.map(({ x, l }) => {
            const m = ago(l.at ?? x.since);
            const late = m >= 15;
            return (
              <div key={l.id} className="flex min-w-0 items-center gap-2.5 rounded-[20px] bg-g-fill p-3">
                <button onClick={() => onOpenTable(x.no)} className="press grid size-12 shrink-0 place-items-center rounded-[16px] bg-g-card text-[18px] font-bold tabular-nums">
                  {x.no}
                </button>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">
                    {l.qty}× {dish(itemById.get(l.itemId)?.name)}
                  </span>
                  <span className={`flex items-center gap-1 text-[12.5px] tabular-nums ${late ? "font-semibold text-g-orange" : "text-g-muted"}`}>
                    <Clock size={12} strokeWidth={2.4} /> {l.at ?? x.since} · {tr("{n} min", { n: m })}
                  </span>
                </span>
                {late && (
                  <button
                    aria-label={tr("Hurry the kitchen")}
                    onClick={() => {
                      haptic("light");
                      onHurry(x.no, l);
                    }}
                    className="press grid size-10 shrink-0 place-items-center rounded-full bg-g-card text-g-orange"
                  >
                    <Zap size={17} strokeWidth={2.2} />
                  </button>
                )}
                <button
                  onClick={() => {
                    haptic("success");
                    onServe(x.no, l);
                  }}
                  className="press h-10 shrink-0 rounded-full bg-g-ink px-3.5 text-[13px] font-semibold text-white"
                >
                  {tr("Served")}
                </button>
              </div>
            );
          })}
        </div>
      </>
    ) : null;
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
        <p className="mt-1 text-[14px] text-g-muted">{tr("Your dishes that are not on the tables yet, longest first.")}</p>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-[20px] bg-g-tint-orange p-3.5">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-g-ink-2">
              <CookingPot size={14} strokeWidth={2.4} className="text-g-orange" /> {tr("Cooking")}
            </p>
            <p className="mt-1 text-[24px] leading-none font-bold tabular-nums">{cooking.length}</p>
          </div>
          <div className="rounded-[20px] bg-g-tint-blue p-3.5">
            <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-g-ink-2">
              <Hourglass size={14} strokeWidth={2.4} className="text-g-blue" /> {tr("Sent, waiting for the kitchen")}
            </p>
            <p className="mt-1 text-[24px] leading-none font-bold tabular-nums">{waiting.length}</p>
          </div>
        </div>
        {group(tr("Cooking"), cooking, CookingPot, "text-g-orange")}
        {group(tr("New"), waiting, Hourglass, "text-g-blue")}
        {!rows.length && (
          <div className="mt-8 flex flex-col items-center rounded-[24px] bg-g-fill py-10 text-center">
            <span className="chip-green grid size-14 place-items-center rounded-full">
              <CheckCheck size={24} strokeWidth={2} />
            </span>
            <p className="mt-3 text-[16px] font-semibold">{tr("Everything is on the tables")}</p>
          </div>
        )}
        <p className="mt-6 flex items-center gap-1.5 text-[12px] text-g-faint">
          <ChefHat size={13} /> {tr("Dishes late by 15 minutes or more show a hurry button.")}
        </p>
      </div>
    </Sheet>
  );
}
