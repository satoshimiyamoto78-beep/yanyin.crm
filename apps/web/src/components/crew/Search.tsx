"use client";

import { ArrowUpRight, CalendarDays, CalendarPlus, ChevronRight, Clock, Coffee, History, LayoutGrid, ListOrdered, ReceiptText, ScanLine, Search as SearchIcon, Settings2, Bell, UtensilsCrossed, X, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { MenuItem } from "@yanyin/domain";
import type { Booking, ClosedOrder, FloorTable } from "@/lib/demo-floor";
import { haptic } from "@/lib/haptics";
import { ScrollLock } from "@/lib/scroll-lock";
import { YanOrb } from "@/components/guest/YanSheet";
import { useDish, useTr } from "./prefs";

/** What a search result can lead to; the app decides how to open it. */
export type SearchGo =
  | { kind: "table"; no: number }
  | { kind: "bookings" }
  | { kind: "receipt"; order: ClosedOrder }
  | { kind: "action"; id: ActionId }
  | { kind: "yan"; q: string };

export type ActionId = "new-booking" | "scan" | "break" | "settings" | "inbox" | "history" | "tables" | "orders" | "bookings";

const ACTIONS: { id: ActionId; label: string; icon: LucideIcon; words: string }[] = [
  { id: "new-booking", label: "New booking", icon: CalendarPlus, words: "booking reserve бронь забронировать đặt bàn" },
  { id: "scan", label: "Scan table QR", icon: ScanLine, words: "qr scan скан сканер quét" },
  { id: "break", label: "Break", icon: Coffee, words: "break pause перерыв пауза nghỉ" },
  { id: "tables", label: "Tables", icon: LayoutGrid, words: "tables hall столы зал bàn sảnh" },
  { id: "orders", label: "Orders", icon: ReceiptText, words: "orders заказы đơn" },
  { id: "bookings", label: "Bookings", icon: CalendarDays, words: "bookings брони đặt bàn" },
  { id: "history", label: "Order history", icon: History, words: "history история заказов lịch sử" },
  { id: "inbox", label: "Notifications", icon: Bell, words: "notifications уведомления thông báo" },
  { id: "settings", label: "Settings", icon: Settings2, words: "settings настройки profile профиль cài đặt" },
];

const RECENT_KEY = "yanyin:crew-search-recent";
const loadRecent = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
};
const saveRecent = (list: string[]) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 6)));
  } catch {
    /* fine without */
  }
};

/** Lowercase without accents: "com" finds "Cơm", "plov" finds "Plov". */
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/ё/g, "е").toLowerCase();

type Quick = "bill" | "free" | "bookings" | "queue";

/**
 * Search for the waiter: one field for tables, guests, dishes, past orders and
 * app actions. Empty, it offers quick lists and recent searches; while typing,
 * results come grouped (tables first: they are what a waiter needs most), the
 * match is highlighted, and the last row hands the question to Yan.
 */
export function CrewSearch({
  tables,
  bookings,
  items,
  history,
  money,
  onGo,
  onClose,
}: {
  tables: FloorTable[];
  bookings: Booking[];
  items: MenuItem[];
  history: ClosedOrder[];
  money: (n: number) => string;
  onGo: (g: SearchGo) => void;
  onClose: () => void;
}) {
  const tr = useTr();
  const dish = useDish();
  const [q, setQ] = useState("");
  const [quick, setQuick] = useState<Quick | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the saved list once on open
    setRecent(loadRecent());
    input.current?.focus();
  }, []);

  const needle = fold(q.trim());
  const remember = () => {
    if (!q.trim()) return;
    const next = [q.trim(), ...recent.filter((r) => r !== q.trim())];
    setRecent(next);
    saveRecent(next);
  };
  const go = (g: SearchGo) => {
    haptic("light");
    remember();
    onGo(g);
  };

  const res = useMemo(() => {
    if (!needle && !quick) return null;
    const num = needle.match(/\d+/)?.[0];
    const words = needle.replace(/[#№]/g, "").split(/\s+/).filter(Boolean);
    const has = (s: string) => words.every((w) => fold(s).includes(w));
    // Tables by number, or by what is happening at them.
    const wantsBill = /(bill|check|счет|счёт|tinh tien|hoa don)/.test(needle) || quick === "bill";
    const wantsFree = /(free|empty|свобод|trong)/.test(needle) || quick === "free";
    const ts = tables.filter((x) => (num && String(x.no).startsWith(num) && !needle.startsWith("#")) || (wantsBill && x.status === "bill") || (wantsFree && x.status === "free"));
    const live = bookings.filter((b) => b.day >= 0 && b.status !== "cancelled");
    const bs =
      quick === "bookings"
        ? live.filter((b) => b.day === 0 && b.status === "confirmed")
        : quick === "queue"
          ? live.filter((b) => b.status === "waiting")
          : needle.length >= 2
            ? live.filter((b) => has(b.name) || (num && num.length >= 3 && b.phone.replace(/\D/g, "").includes(num)))
            : [];
    const ds = !quick && needle.length >= 2 && !/^\d+$/.test(needle) ? items.filter((i) => Object.values(i.name).some((n) => n && has(n))).slice(0, 6) : [];
    const os = !quick && num && (needle.startsWith("#") || num.length >= 3) ? history.filter((o) => String(o.id).includes(num)).slice(0, 4) : [];
    const acts = !quick && needle.length >= 2 ? ACTIONS.filter((a) => has(`${a.words} ${tr(a.label)}`)) : [];
    return { ts, bs, ds, os, acts };
  }, [needle, quick, tables, bookings, items, history, tr]);

  const count = res ? res.ts.length + res.bs.length + res.ds.length + res.os.length + res.acts.length : 0;
  const onTables = (id: string) => tables.filter((x) => x.lines.some((l) => l.itemId === id && !l.cancelled));
  const chip = (x: FloorTable) => (x.status === "bill" ? "chip-orange" : x.status === "free" ? "chip-gray" : x.status === "reserved" ? "chip-teal" : "chip-blue");
  const stateText = (x: FloorTable) => (x.status === "bill" ? tr("Wants the bill") : x.status === "free" ? tr("{n} seat|{n} seats", { n: x.seats }) : x.status === "reserved" ? tr("Booked for {t}", { t: x.booking?.time ?? "" }) : tr("{n} guest|{n} guests", { n: x.guests }));

  const quicks: [Quick, string, number][] = [
    ["bill", tr("Want the bill"), tables.filter((x) => x.status === "bill").length],
    ["free", tr("Free tables"), tables.filter((x) => x.status === "free").length],
    ["bookings", tr("Bookings today"), bookings.filter((b) => b.day === 0 && b.status === "confirmed").length],
    ["queue", tr("Queue now"), bookings.filter((b) => b.status === "waiting").length],
  ];

  return createPortal(
    <div className="animate-fade fixed inset-0 z-[80] flex flex-col bg-white text-g-ink" role="dialog" aria-label={tr("Search")}>
      <ScrollLock />
      <div className="mx-auto flex w-full max-w-[480px] items-center gap-2 px-4 pt-[max(14px,env(safe-area-inset-top))] pb-3">
        <label className="flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-full bg-g-fill px-4">
          <SearchIcon size={19} strokeWidth={2.2} className="shrink-0 text-g-muted" />
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setQuick(null);
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || !res) return;
              if (res.ts[0]) go({ kind: "table", no: res.ts[0].no });
              else if (res.bs[0]) go({ kind: "bookings" });
              else if (q.trim()) go({ kind: "yan", q: q.trim() });
            }}
            enterKeyHint="search"
            placeholder={tr("Table, guest, dish or #order")}
            aria-label={tr("Search")}
            className="min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-g-faint"
          />
          {q && (
            <button aria-label={tr("Clear")} onClick={() => setQ("")} className="press grid size-6 shrink-0 place-items-center rounded-full bg-g-fill-2 text-white">
              <X size={14} strokeWidth={2.6} />
            </button>
          )}
        </label>
        <button onClick={onClose} className="press h-12 shrink-0 px-2 text-[16px] font-semibold text-g-blue">
          {tr("Cancel")}
        </button>
      </div>

      <div className="no-scrollbar mx-auto w-full max-w-[480px] flex-1 overflow-y-auto overscroll-contain px-4 pb-10">
        {/* Quick lists: the questions a waiter asks most, one tap each. */}
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pt-1">
          {quicks.map(([id, label, n]) => (
            <button
              key={id}
              onClick={() => {
                haptic("tick");
                setQ("");
                setQuick(quick === id ? null : id);
              }}
              aria-pressed={quick === id}
              className={`press flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold whitespace-nowrap ${quick === id ? "bg-g-ink text-white" : "bg-g-fill"}`}
            >
              {label}
              <span className={`tabular-nums ${quick === id ? "text-white/60" : "text-g-muted"}`}>{n}</span>
            </button>
          ))}
        </div>

        {!res && (
          <>
            {recent.length > 0 && (
              <Group
                title={tr("Recent")}
                aside={
                  <button
                    onClick={() => {
                      setRecent([]);
                      saveRecent([]);
                    }}
                    className="text-[13px] font-semibold text-g-blue"
                  >
                    {tr("Clear")}
                  </button>
                }
              >
                {recent.map((r) => (
                  <Row key={r} icon={Clock} tone="plain" title={r} onClick={() => setQ(r)} />
                ))}
              </Group>
            )}
            {/* Every table as a key: tap the number to jump straight in. */}
            <Group title={tr("Jump to a table")}>
              <div className="grid grid-cols-6 gap-2 pt-1">
                {tables.map((x) => (
                  <button key={x.no} onClick={() => go({ kind: "table", no: x.no })} className="press relative grid h-12 place-items-center rounded-[14px] bg-g-fill text-[17px] font-semibold tabular-nums">
                    {x.no}
                    <span className={`absolute top-1.5 right-1.5 size-1.5 rounded-full ${x.status === "bill" ? "bg-g-orange" : x.status === "free" ? "bg-g-fill-2" : x.status === "reserved" ? "bg-g-teal" : "bg-g-blue"}`} />
                  </button>
                ))}
              </div>
            </Group>
            <p className="mt-8 text-center text-[13px] leading-relaxed text-g-muted">{tr("Search knows tables, guests and phones, dishes in every language, order numbers and app actions.")}</p>
          </>
        )}

        {res && (
          <>
            {res.ts.length > 0 && (
              <Group title={`${tr("Tables")} · ${res.ts.length}`}>
                {res.ts.map((x) => (
                  <Row
                    key={x.no}
                    badge={String(x.no)}
                    title={<Mark text={tr("Table {n}", { n: x.no })} q={needle} />}
                    sub={`${tr(x.zone)} · ${stateText(x)}${x.lines.length ? ` · ${money(x.lines.reduce((s, l) => s + (l.cancelled ? 0 : l.price * l.qty), 0))}` : ""}`}
                    aside={<span className={`${chip(x)} rounded-full px-2 py-0.5 text-[11px] font-semibold`}>{tr({ free: "Free", seated: "Seated", ordered: "Ordered", bill: "Bill", reserved: "Reserved" }[x.status])}</span>}
                    onClick={() => go({ kind: "table", no: x.no })}
                  />
                ))}
              </Group>
            )}
            {res.bs.length > 0 && (
              <Group title={`${tr("Guests")} · ${res.bs.length}`}>
                {res.bs.map((b) => (
                  <Row
                    key={b.id}
                    icon={b.status === "waiting" ? ListOrdered : CalendarDays}
                    tone={b.status === "waiting" ? "orange" : "teal"}
                    title={<Mark text={b.name} q={needle} />}
                    sub={`${b.status === "waiting" ? tr("In the queue") : `${b.day === 0 ? tr("Today") : b.day === 1 ? tr("Tomorrow") : ""} ${b.time}`} · ${tr("{n} guest|{n} guests", { n: b.guests })}${b.table ? ` · ${tr("Table {n}", { n: b.table })}` : ""}`}
                    onClick={() => go({ kind: "bookings" })}
                  />
                ))}
              </Group>
            )}
            {res.ds.length > 0 && (
              <Group title={`${tr("Dishes")} · ${res.ds.length}`}>
                {res.ds.map((i) => {
                  const at = onTables(i.id);
                  return (
                    <div key={i.id} className="flex items-center gap-3 py-2.5">
                      <span className="chip-blue grid size-10 shrink-0 place-items-center rounded-full">
                        <UtensilsCrossed size={18} strokeWidth={2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold">
                          <Mark text={dish(i.name)} q={needle} />
                        </span>
                        <span className="block text-[13px] text-g-muted tabular-nums">
                          {money(i.price)}
                          {at.length ? ` · ${tr("on the tables")}` : ` · ${tr("not ordered now")}`}
                        </span>
                      </span>
                      <span className="flex shrink-0 gap-1">
                        {at.slice(0, 3).map((x) => (
                          <button key={x.no} onClick={() => go({ kind: "table", no: x.no })} className="press grid size-9 place-items-center rounded-full bg-g-fill text-[14px] font-semibold tabular-nums">
                            {x.no}
                          </button>
                        ))}
                      </span>
                    </div>
                  );
                })}
              </Group>
            )}
            {res.os.length > 0 && (
              <Group title={`${tr("Orders")} · ${res.os.length}`}>
                {res.os.map((o) => (
                  <Row key={o.id} icon={ReceiptText} tone="plain" title={<Mark text={`#${o.id}`} q={needle.replace(/[#№]/g, "")} />} sub={`${tr("Table {n}", { n: o.table })} · ${o.closedAt} · ${money(o.subtotal + o.tip)}`} onClick={() => go({ kind: "receipt", order: o })} />
                ))}
              </Group>
            )}
            {res.acts.length > 0 && (
              <Group title={tr("Actions")}>
                {res.acts.map((a) => (
                  <Row key={a.id} icon={a.icon} tone="plain" title={<Mark text={tr(a.label)} q={needle} />} onClick={() => go({ kind: "action", id: a.id })} />
                ))}
              </Group>
            )}
            {!count && quick && <p className="py-12 text-center text-[15px] text-g-muted">{tr("Nothing here right now")}</p>}
            {q.trim() && (
              // Anything search cannot answer goes to Yan, with the question already typed.
              <button onClick={() => go({ kind: "yan", q: q.trim() })} className="press mt-5 flex w-full items-center gap-3 rounded-[22px] bg-g-tint-blue p-3.5 text-left">
                <YanOrb size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold">{count ? tr("Ask Yan") : tr("Nothing found. Ask Yan?")}</span>
                  <span className="block truncate text-[13px] text-g-muted">«{q.trim()}»</span>
                </span>
                <ArrowUpRight size={19} className="shrink-0 text-g-blue" />
              </button>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Group({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[12px] font-semibold tracking-[0.06em] text-g-muted uppercase">{title}</h3>
        {aside}
      </div>
      <div className="mt-1 divide-y divide-g-line">{children}</div>
    </section>
  );
}

function Row({ icon: Icon, badge, tone = "blue", title, sub, aside, onClick }: { icon?: LucideIcon; badge?: string; tone?: "blue" | "orange" | "teal" | "plain"; title: ReactNode; sub?: string; aside?: ReactNode; onClick: () => void }) {
  const look = { blue: "chip-blue", orange: "chip-orange", teal: "chip-teal", plain: "bg-g-fill text-g-ink-2" }[tone];
  return (
    <button onClick={onClick} className="press flex w-full items-center gap-3 py-2.5 text-left">
      <span className={`grid size-10 shrink-0 place-items-center rounded-full ${badge ? "bg-g-ink text-[16px] font-semibold text-white tabular-nums" : look}`}>{badge ?? (Icon && <Icon size={18} strokeWidth={2} />)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{title}</span>
        {sub && <span className="block truncate text-[13px] text-g-muted">{sub}</span>}
      </span>
      {aside ?? <ChevronRight size={17} className="shrink-0 text-g-faint" />}
    </button>
  );
}

/** The typed part shown in blue, so the eye lands on why this row matched. */
function Mark({ text, q }: { text: string; q: string }) {
  const w = q.split(/\s+/).find((x) => x && fold(text).includes(x));
  if (!w) return <>{text}</>;
  const i = fold(text).indexOf(w);
  return (
    <>
      {text.slice(0, i)}
      <span className="text-g-blue">{text.slice(i, i + w.length)}</span>
      {text.slice(i + w.length)}
    </>
  );
}
