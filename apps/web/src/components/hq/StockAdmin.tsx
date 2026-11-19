"use client";

import {
  AlertTriangle,
  ClipboardList,
  PackageCheck,
  PackageMinus,
  Phone,
  Plus,
  Send,
  Sparkles,
  Truck,
} from "lucide-react";
import { useMemo, useState } from "react";
import { haptic } from "@/lib/haptics";
import {
  daysLeft,
  movementsStore,
  purchasesStore,
  RECIPES,
  STOCK,
  stockStore,
  suggestQty,
  SUPPLIERS,
  type Movement,
  type Purchase,
  type StockCat,
  type StockItem,
} from "@/lib/demo-stock";
import { Sheet } from "@/components/guest/ui";
import { PeekCard, useLongPress } from "@/components/guest/motion";
import { PeekActions, PeekHeader } from "@/components/system/PeekParts";
import { EmptyState, ListRow, Toolbar } from "@/components/system/Kit";
import { IconStat, WidgetCard } from "@/components/system/Widgets";
import { compactMoney } from "@/components/crew/CrewApp";
import { useTr } from "@/components/crew/prefs";

/*
 * Stock and purchasing (Склад и закуп). Two tabs:
 *  - Stock: every product on the shelf, how many days it lasts at today's
 *    pace, low items first. An item opens its page: the dishes that use it
 *    (tech cards), its movements, write-off and count.
 *  - Purchasing: Yan's order for what runs low (grouped by supplier, one tap
 *    sends it), and the orders already sent; receiving one raises the stock.
 * Sales write off tech cards automatically on the backend; here the demo keeps
 * levels in a device store so receiving and counting visibly change them.
 */

type Tab = "stock" | "buy";
const CATS: StockCat[] = ["Meat", "Vegetables", "Dry goods", "Dairy", "Drinks"];
const fmtQty = (n: number, unit: string) =>
  `${Number.isInteger(n) ? n : n.toFixed(1)} ${unit}`;

export function StockAdmin({ notify }: { notify: (t: string) => void }) {
  const tr = useTr();
  const qty = stockStore.use();
  const purchases = purchasesStore.use();
  const [tab, setTab] = useState<Tab>("stock");
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [po, setPo] = useState<string | null>(null);
  const unit = (u: string) => tr(u === "kg" ? "kg" : u === "l" ? "l" : "pcs");

  const rows = useMemo(
    () =>
      STOCK.map((it) => ({
        it,
        q: qty[it.id] ?? 0,
        days: daysLeft(qty[it.id] ?? 0, it.perDay),
      }))
        .filter((r) =>
          cat === "all"
            ? true
            : cat === "low"
              ? r.q <= r.it.min
              : r.it.cat === cat,
        )
        .filter(
          (r) =>
            !query || tr(r.it.name).toLowerCase().includes(query.toLowerCase()),
        )
        .sort((a, b) => a.days - b.days),
    [qty, cat, query, tr],
  );
  const low = STOCK.filter((it) => (qty[it.id] ?? 0) <= it.min);
  const value = STOCK.reduce((n, it) => n + (qty[it.id] ?? 0) * it.cost, 0);
  const pending = purchases.filter((p) => p.status !== "received");
  // Yan's order: every item that will not last until the next delivery, grouped by who brings it.
  const suggestion = SUPPLIERS.map((s) => ({
    s,
    lines: STOCK.filter((it) => it.supplier === s.id)
      .filter(
        (it) => !pending.some((p) => p.lines.some((l) => l.item === it.id)),
      )
      .map((it) => ({ it, n: suggestQty(it, qty[it.id] ?? 0) }))
      .filter((l) => l.n > 0 && daysLeft(qty[l.it.id] ?? 0, l.it.perDay) < 3),
  })).filter((g) => g.lines.length);

  const sendOrder = (
    supplier: string,
    lines: { item: string; qty: number }[],
  ) => {
    const next: Purchase = {
      id: `PO-0${143 + purchases.length - 3}`,
      supplier,
      status: "sent",
      at: tr("Now"),
      lines,
    };
    purchasesStore.set([next, ...purchases]);
    haptic("success");
    notify(
      tr("Order sent to {who}", {
        who: SUPPLIERS.find((s) => s.id === supplier)!.name,
      }),
    );
  };
  const receive = (p: Purchase) => {
    const nextQty = { ...qty };
    const moves = { ...movementsStore.get() };
    const who = SUPPLIERS.find((s) => s.id === p.supplier)!.name;
    p.lines.forEach((l) => {
      nextQty[l.item] = Math.round(((nextQty[l.item] ?? 0) + l.qty) * 10) / 10;
      moves[l.item] = [
        {
          at: tr("Now"),
          kind: "delivery",
          qty: l.qty,
          note: `${who} · ${p.id}`,
        },
        ...(moves[l.item] ?? []),
      ];
    });
    stockStore.set(nextQty);
    movementsStore.set(moves);
    purchasesStore.set(
      purchases.map((x) => (x.id === p.id ? { ...x, status: "received" } : x)),
    );
    setPo(null);
    haptic("success");
    notify(tr("Delivery received · stock updated"));
  };

  const item = open ? STOCK.find((s) => s.id === open) : null;
  const order = po ? purchases.find((p) => p.id === po) : null;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="flex justify-self-start rounded-full bg-g-fill p-1">
        {(["stock", "buy"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => (haptic("tick"), setTab(t))}
            aria-pressed={tab === t}
            className={`flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold transition-colors ${tab === t ? "bg-white text-g-ink shadow-[0_1px_3px_rgba(11,11,15,0.12)]" : "text-g-muted"}`}
          >
            {tr(t === "stock" ? "Stock" : "Purchasing")}
            {t === "buy" && pending.length > 0 && (
              <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-g-blue px-1 text-[10.5px] font-bold text-white tabular-nums">
                {pending.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <IconStat
          art="orders"
          title={tr("Products")}
          value={String(STOCK.length)}
          sub={tr("{n} suppliers", { n: SUPPLIERS.length })}
        />
        <IconStat
          art="bell"
          title={tr("Running low")}
          value={String(low.length)}
          sub={
            low.length
              ? low
                  .slice(0, 2)
                  .map((i) => tr(i.name))
                  .join(", ")
              : tr("all calm")
          }
        />
        <IconStat
          art="sales"
          title={tr("On the shelf")}
          value={compactMoney(value)}
          sub={tr("at purchase price")}
        />
        <IconStat
          art="bookings"
          title={tr("On the way")}
          value={String(pending.filter((p) => p.status === "sent").length)}
          sub={tr("orders sent")}
        />
      </div>

      {tab === "stock" && (
        <>
          <Toolbar
            query={query}
            onQuery={setQuery}
            placeholder={tr("Find a product")}
            active={cat}
            onChip={(c) => (haptic("tick"), setCat(c))}
            chips={[
              { id: "all", label: tr("All"), count: STOCK.length },
              { id: "low", label: tr("Running low"), count: low.length },
              ...CATS.map((c) => ({ id: c, label: tr(c) })),
            ]}
          />
          {rows.length ? (
            <div className="stagger grid gap-1.5 md:grid-cols-2 md:gap-x-4">
              {rows.map(({ it, q, days }) => (
                <StockRow
                  key={it.id}
                  it={it}
                  q={q}
                  days={days}
                  unit={unit(it.unit)}
                  onOpen={() => (haptic("light"), setOpen(it.id))}
                  onOrder={() =>
                    sendOrder(it.supplier, [
                      { item: it.id, qty: suggestQty(it, q) || it.min },
                    ])
                  }
                />
              ))}
            </div>
          ) : (
            <EmptyState
              art="orders"
              title={tr("Nothing found")}
              text={tr("Try another word or category.")}
            />
          )}
        </>
      )}

      {tab === "buy" && (
        <>
          <WidgetCard
            title={tr("Yan suggests ordering")}
            icon={<Sparkles size={13} strokeWidth={2.4} />}
          >
            {suggestion.length ? (
              <div className="stagger mt-3 grid gap-3">
                {suggestion.map(({ s, lines }) => (
                  <div
                    key={s.id}
                    className="rounded-[20px] bg-white p-3.5 [[data-scheme=dark]_&]:bg-g-card"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-semibold">
                          {s.name}
                        </span>
                        <span className="block text-[12.5px] text-g-muted">
                          {tr("delivers {days}", { days: tr(s.days) })}
                        </span>
                      </span>
                      <span className="live shrink-0 text-[14px] font-semibold tabular-nums">
                        {compactMoney(
                          lines.reduce((n, l) => n + l.n * l.it.cost, 0),
                        )}
                      </span>
                    </div>
                    <p className="live mt-2 text-[13.5px] text-g-ink-2">
                      {lines
                        .map(
                          (l) =>
                            `${tr(l.it.name)} ${fmtQty(l.n, unit(l.it.unit))}`,
                        )
                        .join(" · ")}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        sendOrder(
                          s.id,
                          lines.map((l) => ({ item: l.it.id, qty: l.n })),
                        )
                      }
                      className="press mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-g-blue text-[14px] font-semibold text-white"
                    >
                      <Send size={15} strokeWidth={2.2} />{" "}
                      {tr("Send the order")}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-[14px] text-g-muted">
                {tr("Everything lasts until the next delivery.")}
              </p>
            )}
            <p className="mt-3 text-[12.5px] text-g-faint">
              {tr(
                "Five days of sales on top of the minimum, rounded to packs.",
              )}
            </p>
          </WidgetCard>

          <div>
            <p className="px-1 text-[13px] font-semibold text-g-ink-2">
              {tr("Orders")}
            </p>
            <div className="stagger mt-2 grid gap-1.5">
              {purchases.map((p) => {
                const s = SUPPLIERS.find((x) => x.id === p.supplier)!;
                const sum = p.lines.reduce(
                  (n, l) =>
                    n + l.qty * (STOCK.find((i) => i.id === l.item)?.cost ?? 0),
                  0,
                );
                return (
                  <ListRow
                    key={p.id}
                    badge={
                      p.status === "received" ? (
                        <PackageCheck size={18} strokeWidth={2} />
                      ) : p.status === "sent" ? (
                        <Truck size={18} strokeWidth={2} />
                      ) : (
                        <ClipboardList size={18} strokeWidth={2} />
                      )
                    }
                    badgeTone={
                      p.status === "received"
                        ? "chip-green"
                        : p.status === "sent"
                          ? "chip-blue"
                          : "bg-g-fill text-g-muted"
                    }
                    title={`${s.name}`}
                    sub={`${p.id} · ${p.at} · ${tr(p.status === "received" ? "Received" : p.status === "sent" ? "On the way" : "Draft")}`}
                    right={
                      <span className="text-[14.5px] font-semibold tabular-nums">
                        {compactMoney(sum)}
                      </span>
                    }
                    onClick={() => (haptic("light"), setPo(p.id))}
                  />
                );
              })}
            </div>
          </div>

          <div>
            <p className="px-1 text-[13px] font-semibold text-g-ink-2">
              {tr("Suppliers")}
            </p>
            <div className="mt-2 grid gap-1.5 md:grid-cols-2 md:gap-x-4">
              {SUPPLIERS.map((s) => (
                <ListRow
                  key={s.id}
                  badge={<Truck size={18} strokeWidth={2} />}
                  title={s.name}
                  sub={`${s.cats.map((c) => tr(c)).join(", ")} · ${tr(s.days)}`}
                  right={
                    <a
                      href={`tel:${s.phone.replace(/\s/g, "")}`}
                      aria-label={tr("Call")}
                      onClick={(e) => e.stopPropagation()}
                      className="press grid size-9 place-items-center rounded-full bg-g-fill text-g-blue"
                    >
                      <Phone size={16} strokeWidth={2.2} />
                    </a>
                  }
                />
              ))}
            </div>
          </div>
        </>
      )}

      {item && (
        <ItemPage
          it={item}
          q={qty[item.id] ?? 0}
          unit={unit(item.unit)}
          onClose={() => setOpen(null)}
          notify={notify}
          onOrder={(n) => (
            sendOrder(item.supplier, [{ item: item.id, qty: n }]),
            setOpen(null)
          )}
        />
      )}
      {order && (
        <Sheet
          open
          wide
          onClose={() => setPo(null)}
          label={order.id}
          footer={
            order.status !== "received" ? (
              <button
                type="button"
                onClick={() => receive(order)}
                className="press flex h-14 w-full items-center justify-center gap-2 rounded-full bg-g-blue text-[16px] font-semibold text-white"
              >
                <PackageCheck size={18} strokeWidth={2.2} />{" "}
                {tr("Receive the delivery")}
              </button>
            ) : undefined
          }
        >
          <div className="px-5 pt-2 pb-10">
            <h2 className="text-[30px] leading-tight font-bold tracking-[-0.025em]">
              {SUPPLIERS.find((s) => s.id === order.supplier)!.name}
            </h2>
            <p className="text-[14px] text-g-muted">
              {order.id} · {order.at} ·{" "}
              {tr(
                order.status === "received"
                  ? "Received"
                  : order.status === "sent"
                    ? "On the way"
                    : "Draft",
              )}
            </p>
            <div className="card mt-4 rounded-[24px] p-1.5">
              {order.lines.map((l) => {
                const it = STOCK.find((i) => i.id === l.item)!;
                return (
                  <div
                    key={l.item}
                    className="flex items-center justify-between gap-3 px-3.5 py-3"
                  >
                    <span className="truncate text-[15px] font-semibold">
                      {tr(it.name)}
                    </span>
                    <span className="shrink-0 text-[14.5px] text-g-muted tabular-nums">
                      {fmtQty(l.qty, unit(it.unit))} ·{" "}
                      {compactMoney(l.qty * it.cost)}
                    </span>
                  </div>
                );
              })}
            </div>
            {order.status !== "received" && (
              <p className="mt-3 px-1 text-[13px] text-g-muted">
                {tr(
                  "Check the boxes against the list, then receive: the stock goes up at once.",
                )}
              </p>
            )}
          </div>
        </Sheet>
      )}
    </div>
  );
}

/** One product: level bar against its minimum, days it lasts; hold for quick actions. */
function StockRow({
  it,
  q,
  days,
  unit,
  onOpen,
  onOrder,
}: {
  it: StockItem;
  q: number;
  days: number;
  unit: string;
  onOpen: () => void;
  onOrder: () => void;
}) {
  const tr = useTr();
  const [peek, setPeek] = useState(false);
  const press = useLongPress(() => setPeek(true), onOpen);
  const low = q <= it.min;
  const fill = Math.min(1, q / (it.min * 2.5));
  return (
    <>
      <button
        type="button"
        {...press}
        className="press flex w-full items-center gap-3 rounded-[20px] bg-g-fill px-4 py-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="live truncate text-[15px] font-semibold">
              {tr(it.name)}
            </span>
            <span className="live shrink-0 text-[14.5px] font-semibold tabular-nums">
              {fmtQty(q, unit)}
            </span>
          </span>
          <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-g-card">
            <span
              className={`block h-full rounded-full transition-[width] duration-500 ${low ? "bg-g-orange" : "bg-g-blue"}`}
              style={{ width: `${fill * 100}%` }}
            />
          </span>
          <span className="live mt-1.5 flex justify-between gap-2 text-[12.5px] text-g-muted">
            <span className={low ? "font-semibold text-g-orange" : ""}>
              {days < 1
                ? tr("runs out today")
                : tr("{n} day left|{n} days left", { n: Math.floor(days) })}
            </span>
            <span>{tr("min {n}", { n: fmtQty(it.min, unit) })}</span>
          </span>
        </span>
      </button>
      {peek && (
        <PeekCard label={tr(it.name)} onClose={() => setPeek(false)}>
          <PeekHeader
            kicker={tr(it.cat)}
            title={tr(it.name)}
            facts={[
              {
                icon: PackageMinus,
                text: fmtQty(q, unit),
                tone: low ? "warn" : "plain",
              },
              {
                icon: AlertTriangle,
                text:
                  days < 1
                    ? tr("runs out today")
                    : tr("{n} day left|{n} days left", { n: Math.floor(days) }),
                tone: days < 2 ? "warn" : "plain",
              },
            ]}
          />
          <PeekActions
            items={[
              {
                icon: Plus,
                label: tr("Order more"),
                onClick: () => (setPeek(false), onOrder()),
              },
              {
                icon: ClipboardList,
                label: tr("Open the product"),
                onClick: () => (setPeek(false), onOpen()),
              },
            ]}
          />
        </PeekCard>
      )}
    </>
  );
}

/** A product's page: level, the dishes it goes into, movements, write-off and count. */
function ItemPage({
  it,
  q,
  unit,
  onClose,
  notify,
  onOrder,
}: {
  it: StockItem;
  q: number;
  unit: string;
  onClose: () => void;
  notify: (t: string) => void;
  onOrder: (n: number) => void;
}) {
  const tr = useTr();
  const moves = movementsStore.use()[it.id] ?? [];
  const [mode, setMode] = useState<"writeoff" | "count" | null>(null);
  const [n, setN] = useState("");
  const [reason, setReason] = useState("");
  const uses = RECIPES.filter((r) => r.uses.some(([id]) => id === it.id)).map(
    (r) => ({ dish: r.dish, per: r.uses.find(([id]) => id === it.id)![1] }),
  );
  const supplier = SUPPLIERS.find((s) => s.id === it.supplier)!;
  const days = daysLeft(q, it.perDay);
  const suggest = suggestQty(it, q) || Math.ceil(it.min);
  const apply = () => {
    const v = Number(n.replace(",", "."));
    if (!Number.isFinite(v) || v < 0) return;
    const delta = mode === "count" ? Math.round((v - q) * 10) / 10 : -v;
    const next = Math.max(0, Math.round((q + delta) * 10) / 10);
    stockStore.set({ ...stockStore.get(), [it.id]: next });
    const mv: Movement = {
      at: tr("Now"),
      kind: mode!,
      qty: delta,
      note: mode === "count" ? tr("Count") : reason.trim() || tr("Write-off"),
    };
    movementsStore.set({ ...movementsStore.get(), [it.id]: [mv, ...moves] });
    haptic("success");
    notify(mode === "count" ? tr("Count saved") : tr("Written off"));
    setMode(null);
    setN("");
    setReason("");
  };
  const kindWord = (k: Movement["kind"]) =>
    tr(
      k === "sale"
        ? "Sales"
        : k === "delivery"
          ? "Delivery"
          : k === "writeoff"
            ? "Write-off"
            : "Count",
    );
  return (
    <Sheet
      open
      wide
      onClose={onClose}
      label={tr(it.name)}
      footer={
        mode ? (
          <button
            type="button"
            disabled={!n || (mode === "writeoff" && reason.trim().length < 3)}
            onClick={apply}
            className="press flex h-14 w-full items-center justify-center gap-2 rounded-full bg-g-blue text-[16px] font-semibold text-white transition-opacity disabled:opacity-40"
          >
            {tr(mode === "count" ? "Save the count" : "Write off")}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onOrder(suggest)}
            className="press flex h-14 w-full items-center justify-center gap-2 rounded-full bg-g-blue text-[16px] font-semibold text-white"
          >
            <Truck size={18} strokeWidth={2.2} />{" "}
            {tr("Order {n}", { n: fmtQty(suggest, unit) })}
          </button>
        )
      }
    >
      <div className="grid gap-5 px-5 pt-2 pb-10 md:grid-cols-[1fr_300px] md:items-start">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-g-blue">{tr(it.cat)}</p>
          <h2 className="text-[30px] leading-tight font-bold tracking-[-0.025em]">
            {tr(it.name)}
          </h2>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              [tr("On the shelf"), fmtQty(q, unit)],
              [
                tr("Lasts"),
                days < 1
                  ? tr("today")
                  : tr("{n} day|{n} days", { n: Math.floor(days) }),
              ],
              [tr("Per day"), fmtQty(it.perDay, unit)],
            ].map(([k, v]) => (
              <div key={k} className="rounded-[20px] bg-g-fill p-3">
                <p className="text-[12px] font-semibold text-g-muted">{k}</p>
                <p className="live mt-1 text-[18px] font-bold tracking-[-0.02em] tabular-nums">
                  {v}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            {(["writeoff", "count"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => (
                  haptic("light"),
                  setMode(mode === m ? null : m),
                  setN(m === "count" ? String(q) : "")
                )}
                className={`press flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full text-[14.5px] font-semibold transition-colors ${mode === m ? "bg-g-blue text-white" : "bg-g-fill"}`}
              >
                {m === "writeoff" ? (
                  <PackageMinus size={16} strokeWidth={2.2} />
                ) : (
                  <ClipboardList size={16} strokeWidth={2.2} />
                )}
                {tr(m === "writeoff" ? "Write off" : "Count")}
              </button>
            ))}
          </div>
          {mode && (
            <div className="animate-rise mt-3 grid gap-2">
              <label className="flex h-12 items-center gap-2 rounded-full bg-g-fill px-4">
                <input
                  autoFocus
                  inputMode="decimal"
                  value={n}
                  onChange={(e) => setN(e.target.value)}
                  placeholder={
                    mode === "count"
                      ? tr("What is on the shelf")
                      : tr("How much")
                  }
                  className="min-w-0 flex-1 bg-transparent text-[16px] font-semibold outline-none tabular-nums"
                />
                <span className="text-[14px] text-g-muted">{unit}</span>
              </label>
              {mode === "writeoff" && (
                <div className="flex flex-wrap gap-1.5">
                  {[
                    tr("Spoiled"),
                    tr("Dropped"),
                    tr("Staff meal"),
                    tr("Expired"),
                  ].map((r) => (
                    <button
                      key={r}
                      type="button"
                      aria-pressed={reason === r}
                      onClick={() => (haptic("tick"), setReason(r))}
                      className={`press h-9 rounded-full px-3.5 text-[13.5px] font-semibold ${reason === r ? "chip-blue" : "bg-g-fill text-g-ink-2"}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <p className="mt-6 px-1 text-[13px] font-semibold text-g-ink-2">
            {tr("Goes into")}
          </p>
          <div className="mt-2 rounded-[24px] bg-g-fill p-1.5">
            {uses.length ? (
              uses.map((u) => (
                <div
                  key={u.dish}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                >
                  <span className="truncate text-[15px] font-semibold">
                    {tr(u.dish)}
                  </span>
                  <span className="shrink-0 text-[13.5px] text-g-muted tabular-nums">
                    {tr("{n} per portion", { n: fmtQty(u.per, unit) })}
                  </span>
                </div>
              ))
            ) : (
              <p className="px-3.5 py-2.5 text-[14px] text-g-muted">
                {tr("Sold as it is")}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[24px] bg-g-fill p-[18px]">
            <p className="text-[13px] font-semibold text-g-ink-2">
              {tr("Supplier")}
            </p>
            <p className="mt-2 text-[15px] font-semibold">{supplier.name}</p>
            <p className="text-[12.5px] text-g-muted">
              {tr(supplier.days)} · {compactMoney(it.cost)} / {unit}
            </p>
            <a
              href={`tel:${supplier.phone.replace(/\s/g, "")}`}
              className="press mt-3 flex h-10 items-center justify-center gap-2 rounded-full bg-white text-[14px] font-semibold text-g-blue [[data-scheme=dark]_&]:bg-g-card"
            >
              <Phone size={15} strokeWidth={2.2} /> {supplier.phone}
            </a>
          </div>
          <div className="rounded-[24px] bg-g-fill p-[18px]">
            <p className="text-[13px] font-semibold text-g-ink-2">
              {tr("Movements")}
            </p>
            {moves.length ? (
              <div className="stagger mt-2 grid gap-1">
                {moves.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 py-1.5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-semibold">
                        {kindWord(m.kind)}
                      </span>
                      <span className="block truncate text-[12px] text-g-muted">
                        {m.at} · {m.note}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 text-[14px] font-semibold tabular-nums ${m.qty > 0 ? "text-g-green" : "text-g-ink-2"}`}
                    >
                      {m.qty > 0 ? "+" : "−"}
                      {fmtQty(Math.abs(m.qty), unit)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[13.5px] text-g-muted">
                {tr(
                  "Sales write it off by the tech cards; deliveries and counts show here.",
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </Sheet>
  );
}
