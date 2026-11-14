"use client";

import { allItems, formatMoney, type Menu, type MenuItem } from "@yanyin/domain";
import {
  Armchair,
  AtSign,
  Banknote,
  CheckCheck,
  RotateCcw,
  PenLine,
  Ban,
  ChefHat,
  Hourglass,
  CookingPot,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  BriefcaseBusiness,
  CalendarPlus,
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
  ScanLine,
  Users,
  UserRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { CrewData } from "@/lib/demo-crew";
import { ticketTotal, type Booking, type ClosedOrder, type FloorData, type FloorTable, type LineState, type PayMethod, type TicketLine } from "@/lib/demo-floor";
import { useStopList } from "@/lib/stoplist";
import { applyEdits, menuEdits } from "@/lib/menu-edits";
import { RoleSwitch } from "@/components/auth/RoleSwitch";
import { OfflineBar } from "@/components/system/Kit";
import { haptic } from "@/lib/haptics";
import { ScrollLock } from "@/lib/scroll-lock";
import { Island, loadIfChanged, markShown, PeekCard, Reveal, useLongPress, type IslandNotice } from "@/components/guest/motion";
import { Sheet, StepHead } from "@/components/guest/ui";
import { BookingsView, NewBookingPage } from "./Bookings";
import { CrewBoard } from "./CrewBoard";
import { useScheme } from "@/components/system/scheme";
import { CabinetView, pastOrders } from "./Cabinet";
import { noticeMeta } from "./notices";
import { PeekActions, PeekHeader } from "@/components/system/PeekParts";
import { InsightCard, ActionListWidget, DaysCompareWidget, FlowWidget, IconStat, LineWidget } from "@/components/system/Widgets";
import { createPortal } from "react-dom";
import { CrewPrefsProvider, useDish, useLocale, useTr, type TrVars } from "./prefs";
import { Scanner } from "./Scanner";
import { CrewSearch } from "./Search";
import { BillsPage, KitchenPage } from "./HallPages";
import { ArtScene, type ArtName } from "@/components/system/Art";
import { YanChat } from "./YanChat";
import { YanOrb } from "@/components/guest/YanSheet";
import { PersonalInfoPage, ProfilePage, type Me } from "./Settings";
import { InboxPage, kindOf, seedInbox, type InboxItem } from "./Inbox";
import { HandlePicker } from "./HandlePicker";
import { TEAM } from "@/lib/demo-team";
import { saveHandle, useHandles, withHandles } from "@/lib/handles";
import { markRead, useNews } from "@/lib/news";
import { BadgesPage } from "./Collections";
import { levelFromXp } from "@yanyin/domain";

type Tab = "me" | "hall" | "tables" | "orders" | "bookings" | "cabinet";
type HallSeg = "tables" | "orders" | "bookings";

/** The last five days of takings, today last (earlier days are demo until the backend). */
const PAST_TAKINGS = [3_900_000, 5_200_000, 4_300_000, 4_200_000];
function lastDays(today: number, locale: string) {
  return [...PAST_TAKINGS, today].map((value, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (4 - i));
    const wd = d.toLocaleDateString(locale, { weekday: "short" }).replace(".", "");
    return { short: `${wd.charAt(0).toUpperCase()}${wd.slice(1)}`, date: String(d.getDate()), value };
  });
}

const STATUS: Record<FloorTable["status"], { label: string; chip: string }> = {
  free: { label: "Free", chip: "chip-gray" },
  seated: { label: "Seated", chip: "chip-blue" },
  ordered: { label: "Ordered", chip: "chip-blue" },
  bill: { label: "Bill", chip: "chip-orange" },
  reserved: { label: "Reserved", chip: "chip-teal" },
};
const LINE: Record<LineState, { label: string; chip: string; next: LineState }> = {
  new: { label: "New", chip: "chip-gray", next: "cooking" },
  cooking: { label: "Cooking", chip: "chip-orange", next: "served" },
  served: { label: "Served", chip: "chip-green", next: "served" },
};
const METHOD: Record<PayMethod, { label: string; icon: LucideIcon }> = {
  cash: { label: "Cash", icon: Banknote },
  card: { label: "Card", icon: CreditCard },
  vietqr: { label: "VietQR", icon: QrCode },
  momo: { label: "MoMo", icon: Wallet },
};

type Notice = IslandNotice & { table?: number };

/** A tiny store for the island, so a notification never re-renders the app. */
const noticeStore = (() => {
  let cur: Notice | null = null;
  const subs = new Set<() => void>();
  return {
    get: () => cur,
    set: (v: Notice | null | ((c: Notice | null) => Notice | null)) => {
      const next = typeof v === "function" ? v(cur) : v;
      if (next === cur) return;
      cur = next;
      subs.forEach((f) => f());
    },
    subscribe: (f: () => void) => {
      subs.add(f);
      return () => subs.delete(f);
    },
  };
})();

function CrewIsland({ onExpand }: { onExpand: (open: boolean) => void }) {
  const notice = useSyncExternalStore(noticeStore.subscribe, noticeStore.get, () => null);
  return <Island notice={notice} onExpand={onExpand} />;
}

/**
 * yanyin.crew — the waiter's phone app: the floor (tables), open and closed
 * orders, bookings and the waiter's own quest page. Every secondary screen is a
 * full-screen page (table, take order, check, payment, new booking).
 */
export function CrewApp(props: { data: CrewData; floor: FloorData; menu: Menu }) {
  return (
    <CrewPrefsProvider>
      <CrewAppInner {...props} />
    </CrewPrefsProvider>
  );
}

function CrewAppInner({ data, floor, menu }: { data: CrewData; floor: FloorData; menu: Menu }) {
  const [tab, setTab] = useState<Tab>("me");
  const tr = useTr();
  const dish = useDish();
  // The same light/dark choice as the guest menu: one system, one preference.
  const scheme = useScheme();
  // Profile (from the avatar), personal info, all badges and the notification inbox are full pages.
  const [me, setMe] = useState<Me>({ first: data.staff.name, last: "Nguyen", phone: "+84 905 123 456", email: "linh@samarkand.vn", role: "Waiter · Samarkand" });
  const [profile, setProfile] = useState<"profile" | "personal" | "badges" | null>(null);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- seed the demo history once, with the real clock
    setInbox(seedInbox(Date.now()));
  }, []);
  // The team with everyone's chosen @ID; mine is asked for on first entry.
  const ME_ID = data.staff.id;
  const handles = useHandles();
  const team = useMemo(() => withHandles(TEAM, handles), [handles]);
  const myHandle = handles[ME_ID];
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the @ID screen waits for the saved choice to load
    setMounted(true);
  }, []);
  const [pickHandle, setPickHandle] = useState(false);
  const [roles, setRoles] = useState(false);
  // News that mention me (or my station, or @all), from the admin console.
  const news = useNews();
  const myNews = useMemo(() => news.filter((p) => p.to.includes(ME_ID)), [news, ME_ID]);
  const [inboxTab, setInboxTab] = useState<"notifications" | "news">("notifications");
  const unread = inbox.filter((i) => !i.read).length + myNews.filter((p) => !p.read.includes(ME_ID)).length;
  const [cabBadges, setCabBadges] = useState(false);
  const [tables, setTables] = useState(floor.tables);
  const [bookings, setBookings] = useState(floor.bookings);
  const [history, setHistory] = useState(floor.history);
  // The full order history: today's closed orders plus earlier shifts (demo until the backend).
  const past = useMemo(() => pastOrders(history), [history]);
  const [open, setOpen] = useState<number | null>(null);
  const [page, setPage] = useState<"picker" | "check" | "pay" | null>(null);
  const [receipt, setReceipt] = useState<ClosedOrder | null>(null);
  const [newBooking, setNewBooking] = useState(false);
  // The Hall's quick pages: all bills, and the kitchen queue.
  const [hallPage, setHallPage] = useState<"bills" | "kitchen" | null>(null);
  // The bill opened straight from a notification: closing it goes back to where the waiter was.
  const [direct, setDirect] = useState(false);
  // Search over everything, and Yan's chat (optionally opened with a question from search).
  const [searching, setSearching] = useState(false);
  const [yan, setYan] = useState<{ q?: string } | null>(null);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [scan, setScan] = useState(false);
  // The island lives in its own little store: showing a notice re-renders only
  // the island, never the whole app (that was the lag when a table asked for the bill).
  const setNotice = noticeStore.set;
  const items = useMemo(() => allItems(menu), [menu]);
  const itemById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const money = useCallback((n: number) => formatMoney(n, floor.venue.currency, "en"), [floor.venue.currency]);
  const table = tables.find((x) => x.no === open) ?? null;

  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const notify = useCallback((raw: Notice) => {
    haptic("success");
    // Colour and icon follow the meaning of the notification (English, Russian, Vietnamese wording).
    const meta = noticeMeta(raw.title);
    const n: Notice = { ...raw, tone: raw.tone ?? meta.tone, icon: raw.icon ?? <meta.icon size={16} strokeWidth={2.25} /> };
    setNotice(n);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice((cur) => (cur === n ? null : cur)), raw.action ? 7000 : 2600);
    // Every notification is kept in the inbox history, written once the island has
    // finished arriving so the app re-render never competes with its animation.
    const at = Date.now();
    setTimeout(() => startTransition(() => setInbox((xs) => [{ id: `i${at}${xs.length}`, kind: kindOf(raw.title), table: raw.table, title: raw.title, text: typeof raw.text === "string" ? raw.text : undefined, at, read: false }, ...xs].slice(0, 80))), 450);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the store setter is stable
  }, []);
  // A new post that mentions me arrives as an island with a way to read it.
  const seenNews = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!seenNews.current) {
      seenNews.current = new Set(myNews.map((p) => p.id));
      return;
    }
    for (const p of myNews) {
      if (seenNews.current.has(p.id)) continue;
      seenNews.current.add(p.id);
      const by = team.find((x) => x.id === p.by);
      notify({
        title: tr("{who} mentioned you", { who: `@${by?.handle ?? "team"}` }),
        text: p.text,
        tone: "blue",
        icon: <AtSign size={16} strokeWidth={2.4} />,
        action: {
          label: tr("Read it"),
          onClick: () => {
            setNotice(null);
            setInboxTab("news");
            setInboxOpen(true);
          },
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the notice store setter is stable
  }, [myNews, team, notify, tr]);
  const patch = (no: number, f: (x: FloorTable) => FloorTable) => setTables((ts) => ts.map((x) => (x.no === no ? f(x) : x)));
  const now = () => new Date().toTimeString().slice(0, 5);
  const openBill = (no: number) => {
    // A table with nothing on it has no bill: open the table instead.
    const x = tables.find((t) => t.no === no);
    if (!x || !x.lines.some((l) => !l.cancelled)) {
      setNotice(null);
      setOpen(no);
      return;
    }
    haptic("light");
    setNotice(null);
    setInboxOpen(false);
    setDirect(true);
    patch(no, (x) => ({ ...x, status: "bill" }));
    setOpen(no);
    setPage("check");
  };
  // Demo: a guest at table 4 asks for the bill a few seconds into the shift.
  // The words are read when it fires, so they follow the language saved on this phone.
  const trNow = useRef(tr);
  const dishNow = useRef(dish);
  useEffect(() => {
    trNow.current = tr;
    dishNow.current = dish;
  });
  useEffect(() => {
    const t = setTimeout(() => {
      const tr = trNow.current;
      const x = floor.tables.find((t) => t.no === 4);
      if (!x || !x.lines.length) return;
      const sum = Math.round(ticketTotal(x.lines) * 1.05);
      const last = [...x.lines].reverse().find((l) => l.at)?.at;
      notify({
        title: tr("Table {n} asks for the bill", { n: 4 }),
        tone: "orange",
        table: 4,
        icon: <ReceiptText size={16} strokeWidth={2.25} />,
        action: { label: tr("Open bill"), onClick: () => openBill(4) },
        details: (
          // The bill at a glance: the sum large, the table, then what was eaten and when.
          <div>
            <div className="flex items-end justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-[12px] text-white/55">{tr("To pay")}</span>
                <span className="block text-[30px] leading-none font-bold tracking-[-0.02em] whitespace-nowrap tabular-nums">{money(sum)}</span>
              </span>
              <span className="flex shrink-0 flex-col items-center rounded-[14px] bg-[#ff8a3d] px-3 py-1.5 text-white">
                <span className="text-[9px] leading-none font-semibold uppercase">{tr("Table")}</span>
                <span className="text-[20px] leading-tight font-bold tabular-nums">4</span>
              </span>
            </div>
            <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-white/70">
              <span className="flex items-center gap-1"><Users size={13} strokeWidth={2.2} /> {tr("{n} guest|{n} guests", { n: x.guests })}</span>
              <span className="flex items-center gap-1"><Clock size={13} strokeWidth={2.2} /> {seatedFor(x.since, tr)}</span>
              <span className="flex items-center gap-1"><ReceiptText size={13} strokeWidth={2.2} /> {tr("{n} item|{n} items", { n: x.lines.reduce((n, l) => n + l.qty, 0) })}</span>
            </p>
            <div className="mt-3 divide-y divide-white/10 rounded-[18px] bg-white/8 px-3">
              {x.lines.slice(0, 3).map((l) => (
                <p key={l.id} className="flex items-center gap-2 py-2 text-[13.5px]">
                  <span className="w-6 shrink-0 text-white/55 tabular-nums">{l.qty}×</span>
                  <span className="min-w-0 flex-1 truncate">{dishNow.current(itemById.get(l.itemId)?.name)}</span>
                  {l.at && <span className="shrink-0 text-[12px] text-white/45 tabular-nums">{l.at}</span>}
                </p>
              ))}
              {x.lines.length > 3 && <p className="py-2 text-[12.5px] text-white/55">{tr("and {n} more", { n: x.lines.length - 3 })}{last ? ` · ${tr("last at {t}", { t: last })}` : ""}</p>}
            </div>
          </div>
        ),
      });
    }, 7000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one demo ping per visit
  }, []);
  const billCount = tables.filter((x) => x.status === "bill").length;
  useEffect(() => {
    markShown("tab:me", JSON.stringify([floor.history.length])); // the first screen already played its load
  }, [floor.history.length]);
  // A link can open a section directly (the host's seat opens Bookings: crew.html?tab=bookings).
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time deep link on mount
    if (t === "hall" || t === "tables" || t === "orders" || t === "bookings" || t === "cabinet") setTab(t);
  }, []);
  const inHall = tab !== "me" && tab !== "cabinet";
  const go = (t: Tab) => {
    haptic("tick");
    setTab(t);
    window.scrollTo({ top: 0 });
    loadIfChanged(`tab:${t}`, signatureOf(t)); // only new or changed data blurs and pulls into focus
  };
  const todays = bookings.filter((b) => b.day === 0 && b.status === "confirmed").sort((a, b) => a.time.localeCompare(b.time));
  // Fingerprint of what each section shows: same data means no loading animation.
  const signatureOf = (t: Tab) =>
    t === "tables"
      ? JSON.stringify(tables.map((x) => [x.no, x.status, x.guests, x.lines.length, x.lines.map((l) => l.state).join("")]))
      : t === "orders"
        ? JSON.stringify([history.length, tables.map((x) => [x.no, x.status, x.lines.map((l) => l.qty + l.state).join("")])])
        : t === "bookings"
          ? JSON.stringify(bookings.map((b) => [b.id, b.status, b.table]))
          : JSON.stringify([history.length]);
  const hot = {
    busy: tables.filter((x) => x.status !== "free" && x.status !== "reserved").length,
    tables: tables.length,
    bills: billCount,
    openOrders: tables.filter((x) => x.lines.length).length,
    inKitchen: tables.reduce((n, x) => n + x.lines.filter((l) => l.state !== "served" && !l.cancelled).length, 0),
    bookings: todays.length,
    nextBooking: todays[0]?.time,
  };

  return (
    <div className="app-column-page min-h-dvh bg-white text-g-ink">
      <OfflineBar text={tr("No internet · orders are saved and go out when it is back")} />
      <div key={tab} className="app-column animate-tab mx-auto max-w-[480px] pb-28">
        {tab === "hall" && (
          <HallHome
            sections={[
              { id: "tables", title: tr("Tables"), value: `${hot.busy}/${hot.tables}`, sub: hot.bills ? tr("{n} table wants the bill|{n} tables want the bill", { n: hot.bills }) : tr("all calm"), hot: hot.bills > 0, art: "tables" },
              { id: "orders", title: tr("Orders"), value: String(hot.openOrders), sub: tr("{n} dish in the kitchen|{n} dishes in the kitchen", { n: hot.inKitchen }), art: "orders" },
              { id: "bookings", title: tr("Bookings"), value: String(hot.bookings), sub: hot.nextBooking ? tr("next at {t}", { t: hot.nextBooking }) : tr("nothing planned"), art: "bookings" },
              { id: "bills", title: tr("Till"), value: compactMoney(tables.reduce((n, x) => n + (x.status !== "free" && x.status !== "reserved" ? Math.round(ticketTotal(x.lines) * 1.05) : 0), 0)).replace(/(\.\d)\d(M)/, "$1$2"), sub: hot.bills ? tr("{n} table wants the bill|{n} tables want the bill", { n: hot.bills }) : tr("still to pay"), hot: hot.bills > 0, art: "check" },
              { id: "kitchen", title: tr("Kitchen"), value: String(hot.inKitchen), sub: tr("dish in work|dishes in work", { n: hot.inKitchen }), art: "kitchen" },
            ]}
            onOpen={(id) => (id === "bills" || id === "kitchen" ? setHallPage(id) : go(id))}
            actions={[
              { icon: ScanLine, label: tr("Scan"), onClick: () => setScan(true) },
              { icon: CalendarPlus, label: tr("New booking"), onClick: () => setNewBooking(true) },
            ]}
          />
        )}
        {(tab === "tables" || tab === "orders" || tab === "bookings") && (
          <SectionHead
            title={tr(tab === "tables" ? "Tables" : tab === "orders" ? "Orders" : "Bookings")}
            sub={tab === "tables" ? `Samarkand · ${tr("lunch")}` : tab === "orders" ? tr("Today") : tr("Today and the week ahead")}
            art={tab === "tables" ? "tables" : tab === "orders" ? "orders" : "bookings"}
            onBack={() => go("hall")}
          />
        )}
        {tab === "tables" && (
          <TablesView
            tables={tables}
            money={money}
            itemById={itemById}
            actions={{
              scan: () => setScan(true),
              open: setOpen,
              bill: openBill,
              addItems: (no) => {
                setOpen(no);
                setPage("picker");
              },
              check: (no) => {
                const x = tables.find((t) => t.no === no);
                if (x && x.status !== "bill") notify({ title: tr("Bill opened · table {n}", { n: no }), text: tr("Show the QR or take payment") });
                patch(no, (t) => ({ ...t, status: "bill" }));
                setOpen(no);
                setPage("check");
              },
              serveAll: (no) => {
                patch(no, (t) => ({ ...t, lines: t.lines.map((l) => ({ ...l, state: "served" as const })) }));
                notify({ title: tr("Table {n}: everything is served", { n: no }), text: tr("Kitchen tickets are closed") });
              },
              seat: (no) => {
                const x = tables.find((t) => t.no === no);
                const g = Math.min(2, x?.seats ?? 2);
                patch(no, (t) => ({ ...t, status: "seated", guests: g, since: now(), booking: undefined }));
                notify({ title: tr("Guests seated at table {n}", { n: no }), text: `${tr("{n} guest|{n} guests", { n: g })} · ${now()}` });
              },
            }}
          />
        )}
        {tab === "orders" && <OrdersView tables={tables} history={history} money={money} itemById={itemById} onOpenTable={setOpen} />}
        {tab === "bookings" && (
          <BookingsView
            bookings={bookings}
            tables={tables}
            onNew={() => setNewBooking(true)}
            onSeat={(b) => {
              setBookings((bs) => bs.map((x) => (x.id === b.id ? { ...x, status: "seated" } : x)));
              if (b.table) patch(b.table, (x) => ({ ...x, status: "seated", guests: b.guests, since: now(), booking: undefined }));
              notify({ title: tr("{name} is seated", { name: b.name.split(" ")[0]! }), text: b.table ? `${tr("Table {n}", { n: b.table })} · ${tr("{n} guest|{n} guests", { n: b.guests })}` : tr("{n} guest|{n} guests", { n: b.guests }) });
            }}
            onEdit={setEditBooking}
            onUpdate={(b) => {
              setBookings((bs) => bs.map((x) => (x.id === b.id ? b : x)));
              notify({ title: tr("Booking updated"), text: `${b.time} · ${tr("{n} guest|{n} guests", { n: b.guests })}` });
            }}
            onQueue={(b) => {
              setBookings((bs) => (bs.some((x) => x.id === b.id) ? bs.map((x) => (x.id === b.id ? b : x)) : [...bs, b]));
              notify({ title: tr("{name} is in the queue", { name: b.name.split(" ")[0]! }), text: tr("We will tell you when a table for {n} frees up", { n: b.guests }) });
            }}
            onCancel={(b) => {
              setBookings((bs) => bs.map((x) => (x.id === b.id ? { ...x, status: "cancelled", cancelled: { at: now(), reason: "Cancelled by the waiter" } } : x)));
              if (b.day === 0 && b.table) patch(b.table, (x) => (x.status === "reserved" ? { ...x, status: "free", booking: undefined } : x));
              notify(b.status === "waiting" ? { title: tr("{name} left the queue", { name: b.name.split(" ")[0]! }), text: tr("{n} guest|{n} guests", { n: b.guests }), tone: "orange" } : { title: tr("Booking cancelled"), text: `${b.name} · ${b.time}`, tone: "orange" });
            }}
          />
        )}
        {tab === "cabinet" && (
          <CabinetView
            data={data}
            history={past}
            itemById={itemById}
            money={money}
            onReceipt={setReceipt}
            onBadges={() => setCabBadges(true)}
            onQuests={() => go("me")}
          />
        )}
        {tab === "me" && (
          <CrewBoard
            data={data}
            embedded
            hot={hot}
            onGo={(t) => (t === "settings" ? setProfile("profile") : go(t))}
            onNotify={(title, text) => notify({ title, text })}
            onScan={() => setScan(true)}
            dark={scheme.dark}
            onTheme={scheme.toggle}
            onProfile={() => setProfile("profile")}
            onInbox={() => setInboxOpen(true)}
            onSearch={() => setSearching(true)}
            unread={unread}
            photo={me.photo}
            name={`${me.first} ${me.last}`}
          />
        )}
      </div>

      {/* Tab bar: a floating capsule (Home, Hall) and a separate round scan button, iOS 26 style. */}
      <nav aria-label={tr("Sections")} className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(10px,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-[440px] items-center gap-2.5">
          <div className="relative grid h-[56px] flex-1 grid-cols-3 rounded-full bg-white/95 p-1 ring-1 ring-black/5">
            <span
              aria-hidden
              className="absolute top-1 bottom-1 left-1 rounded-full bg-g-fill transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ width: "calc((100% - 8px) / 3)", transform: `translateX(${(tab === "me" ? 0 : tab === "cabinet" ? 2 : 1) * 100}%)` }}
            />
            {(
              [
                ["me", tr("Home"), House, 0],
                ["hall", tr("Hall"), LayoutGrid, billCount],
                ["cabinet", tr("Cabinet"), BriefcaseBusiness, 0],
              ] as const
            ).map(([id, label, Icon, badge], i) => {
              const on = i === 0 ? tab === "me" : i === 1 ? inHall : tab === "cabinet";
              return (
                <button
                  key={label}
                  onClick={() => go(id)}
                  aria-current={on ? "page" : undefined}
                  className={`relative z-10 flex flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-semibold transition-colors ${on ? "text-g-ink" : "text-g-faint"}`}
                >
                  <Icon size={19} strokeWidth={on ? 2.1 : 1.8} />
                  {label}
                  {badge > 0 && <span className="blue-grad absolute top-1 left-[calc(50%+6px)] grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold">{badge}</span>}
                </button>
              );
            })}
          </div>
          {/* Yan sits right above the scan button: one tap to the shift assistant. */}
          <div className="relative shrink-0">
            <button
              aria-label={tr("Ask Yan")}
              onClick={() => {
                haptic("light");
                setYan({});
              }}
              className="press absolute bottom-[calc(100%+10px)] left-1/2 grid -translate-x-1/2 place-items-center rounded-full shadow-[0_8px_24px_-8px_rgba(47,91,255,0.55)] ring-4 ring-[var(--g-bg)]"
            >
              <YanOrb size={44} />
            </button>
            <button aria-label={tr("Scan table QR")} onClick={() => setScan(true)} className="blue-grad press grid size-[52px] place-items-center rounded-full">
              <ScanLine size={21} strokeWidth={2} />
            </button>
          </div>
        </div>
      </nav>

      {profile === "profile" && (
        <ProfilePage
          me={me}
          level={levelFromXp(data.staff.xp)}
          badges={data.badges}
          onPersonal={() => setProfile("personal")}
          onAllBadges={() => setProfile("badges")}
          onClose={() => setProfile(null)}
          onNotify={(title, text) => notify({ title, text })}
          dark={scheme.dark}
          onTheme={scheme.toggle}
          handle={myHandle}
          onHandle={() => setPickHandle(true)}
          onRoles={() => setRoles(true)}
        />
      )}
      {roles && <RoleSwitch current="crew" onClose={() => setRoles(false)} />}
      {profile === "personal" && (
        <PersonalInfoPage
          me={me}
          onClose={() => setProfile("profile")}
          onSave={(m) => {
            setMe(m);
            setProfile("profile");
            notify({ title: tr("Profile saved"), text: `${m.first} ${m.last}` });
          }}
        />
      )}
      {profile === "badges" && <BadgesPage badges={data.badges} onClose={() => setProfile("profile")} />}
      {cabBadges && <BadgesPage badges={data.badges} onClose={() => setCabBadges(false)} />}
      {inboxOpen && (
        <InboxPage
          items={inbox}
          tab={inboxTab}
          news={myNews.map((p) => ({ id: p.id, by: team.find((x) => x.id === p.by)?.handle ?? "team", text: p.text, at: p.at, read: p.read.includes(ME_ID) }))}
          known={(h) => team.some((x) => x.handle === h)}
          onOpenBill={openBill}
          onClose={() => {
            setInboxOpen(false);
            setInboxTab("notifications");
          }}
          onReadAll={() => {
            setInbox((xs) => xs.map((i) => ({ ...i, read: true })));
            myNews.filter((p) => !p.read.includes(ME_ID)).forEach((p) => markRead(p.id, ME_ID));
          }}
        />
      )}
      {mounted && (!myHandle || pickHandle) && (
        <HandlePicker
          me={me}
          others={team.filter((x) => x.id !== ME_ID)}
          current={myHandle}
          onClose={myHandle ? () => setPickHandle(false) : undefined}
          onDone={(h) => {
            saveHandle(ME_ID, h);
            setPickHandle(false);
            notify({ title: tr("Your ID is @{h}", { h }), text: tr("The team can mention you now") });
          }}
        />
      )}

      <CrewIsland
        onExpand={(open) => {
          // Unfolded, it stays until the waiter acts or folds it; folded, it leaves a moment later.
          clearTimeout(noticeTimer.current);
          if (!open) noticeTimer.current = setTimeout(() => setNotice(null), 2500);
        }}
      />

      {/* Table page and its flow: take order → check → payment */}
      {table && (
        <TablePage
          table={table}
          itemById={itemById}
          money={money}
          onClose={() => setOpen(null)}
          onSeat={(guests) => {
            patch(table.no, (x) => ({ ...x, status: "seated", guests, since: now(), booking: undefined }));
            notify({ title: tr("Guests seated at table {n}", { n: table.no }), text: `${tr("{n} guest|{n} guests", { n: guests })} · ${now()}` });
          }}
          onAdvance={(lineId) => {
            const l = table.lines.find((x) => x.id === lineId);
            if (!l || l.state === "served") return;
            const next = LINE[l.state].next;
            patch(table.no, (x) => ({ ...x, lines: x.lines.map((y) => (y.id === lineId ? { ...y, state: next } : y)) }));
            const name = dish(itemById.get(l.itemId)?.name);
            notify({ title: next === "served" ? tr("{dish} is served", { dish: name }) : tr("{dish} is cooking", { dish: name }), text: `${tr("Table {n}", { n: table.no })} · ${l.qty}×` });
          }}
          onTakeOrder={() => setPage("picker")}
          onEditLine={(lineId, qty) => {
            const l = table.lines.find((x) => x.id === lineId);
            patch(table.no, (x) => ({ ...x, lines: x.lines.map((y) => (y.id === lineId ? { ...y, qty } : y)) }));
            notify({ title: `${dish(itemById.get(l?.itemId ?? "")?.name)} · ${qty}×`, text: tr("Table {n} · order updated", { n: table.no }) });
          }}
          onCancelLine={(lineId, reason) => {
            const l = table.lines.find((x) => x.id === lineId);
            patch(table.no, (x) => ({ ...x, lines: x.lines.map((y) => (y.id === lineId ? { ...y, cancelled: { reason, at: now(), by: floor.waiter } } : y)) }));
            notify({ title: tr("{dish} cancelled", { dish: dish(itemById.get(l?.itemId ?? "")?.name) }), text: `${tr("Table {n}", { n: table.no })} · ${tr(reason)}`, tone: "orange" });
          }}
          onCheck={() => {
            if (table.status !== "bill") notify({ title: tr("Bill opened · table {n}", { n: table.no }), text: tr("Show the QR or take payment") });
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
            notify({ title: tr("Sent to the kitchen"), text: `${tr("Table {n}", { n: table.no })} · ${tr("{n} item|{n} items", { n: add.reduce((s, l) => s + l.qty, 0) })}` });
          }}
        />
      )}
      {table && page === "check" && (
        // The bill: who asks and how long they have sat, then the receipt; print or take payment.
        <Sheet
          open
          onClose={() => {
            setPage(null);
            if (direct) setOpen(null);
            setDirect(false);
          }}
          label={tr("Bill · table {n}", { n: table.no })}
          title={false}
          footer={
            <div className="flex gap-2.5">
              <button onClick={() => notify({ title: tr("Bill printed"), text: tr("Hall printer") })} className="press flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-g-fill text-[16px] font-semibold">
                <Printer size={18} strokeWidth={2} /> {tr("Print")}
              </button>
              <button onClick={() => setPage("pay")} className="blue-grad press flex h-14 flex-[1.6] items-center justify-center gap-2 rounded-full text-[16px] font-semibold tabular-nums">
                {tr("Take payment")} · {compactMoney(Math.round(ticketTotal(table.lines) * 1.05))}
              </button>
            </div>
          }
        >
          <div className="px-5 pt-2 pb-8">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">{tr("Bill · table {n}", { n: table.no })}</h2>
                <p className="mt-1 text-[14px] text-g-muted">
                  {tr("{n} guest|{n} guests", { n: table.guests })} · {tr("at the table for {d}", { d: seatedFor(table.since, tr) })}
                </p>
              </div>
              {table.status === "bill" && <span className="chip-orange mt-1.5 shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold">{tr("Wants the bill")}</span>}
            </div>
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
            if (!subtotal) return; // nothing to pay, nothing to record
            notify({ title: tr("Table {n} is paid", { n: table.no }), text: `${tr(METHOD[method].label)}${tip ? ` · ${tr("tip {sum}", { sum: money(tip) })}` : ""}` });
            setHistory((h) => [{ id: (h[0]?.id ?? 1000) + 1, table: table.no, closedAt: now(), lines: table.lines, subtotal, tip, method, guests: table.guests }, ...h]);
            patch(table.no, (x) => ({ ...x, status: "free", guests: 0, since: undefined, lines: [] }));
            // A freed table goes first to whoever has waited longest and fits.
            const next = bookings.filter((b) => b.day === 0 && b.status === "waiting" && b.guests <= table.seats).sort((a, b) => a.time.localeCompare(b.time))[0];
            if (next) notify({ title: tr("Table {n} is free · {name} is waiting", { n: table.no, name: next.name.split(" ")[0]! }), text: tr("{n} guests, in the queue since {t}", { n: next.guests, t: next.time }), tone: "green" });
          }}
          onDone={() => {
            setPage(null);
            setOpen(null);
          }}
        />
      )}

      {hallPage === "bills" && (
        <BillsPage
          tables={tables}
          history={history}
          money={money}
          onClose={() => setHallPage(null)}
          onOpenBill={(no) => {
            setHallPage(null);
            openBill(no);
          }}
          onReceipt={(o) => setReceipt(o)}
        />
      )}
      {hallPage === "kitchen" && (
        <KitchenPage
          tables={tables}
          itemById={itemById}
          onClose={() => setHallPage(null)}
          onOpenTable={(no) => {
            setHallPage(null);
            setOpen(no);
          }}
          onServe={(no, l) => {
            patch(no, (x) => ({ ...x, lines: x.lines.map((y) => (y.id === l.id ? { ...y, state: "served" } : y)) }));
            notify({ title: tr("{dish} is served", { dish: dish(itemById.get(l.itemId)?.name) }), text: tr("Table {n}", { n: no }) });
          }}
          onServeAll={(no) => {
            patch(no, (x) => ({ ...x, lines: x.lines.map((y) => (y.cancelled ? y : { ...y, state: "served" as const })) }));
            notify({ title: tr("Table {n}: everything is served", { n: no }), text: tr("Kitchen tickets are closed") });
          }}
          onHurry={(no, l) => notify({ title: tr("Kitchen asked to hurry"), text: `${tr("Table {n}", { n: no })} · ${dish(itemById.get(l.itemId)?.name)}`, tone: "orange" })}
          onPing={() => notify({ title: tr("Kitchen pinged"), text: tr("The pass sees your call") })}
        />
      )}
      {searching && (
        <CrewSearch
          tables={tables}
          bookings={bookings}
          items={items}
          history={history}
          money={money}
          onClose={() => setSearching(false)}
          onGo={(g) => {
            setSearching(false);
            if (g.kind === "table") setOpen(g.no);
            else if (g.kind === "bookings") go("bookings");
            else if (g.kind === "receipt") setReceipt(g.order);
            else if (g.kind === "yan") setYan({ q: g.q });
            else if (g.id === "new-booking") setNewBooking(true);
            else if (g.id === "scan") setScan(true);
            else if (g.id === "break") notify({ title: tr("Break started"), text: tr("Tables see “back in 10 min”") });
            else if (g.id === "settings") setProfile("profile");
            else if (g.id === "inbox") setInboxOpen(true);
            else if (g.id === "history") go("cabinet");
            else go(g.id);
          }}
        />
      )}
      {yan && (
        <YanChat
          tables={tables}
          bookings={bookings}
          items={items}
          history={history}
          money={money}
          name={me.first}
          initial={yan.q}
          onOpenTable={(no) => {
            setYan(null);
            setOpen(no);
          }}
          onClose={() => setYan(null)}
        />
      )}
      {receipt && (
        <Sheet open onClose={() => setReceipt(null)} label={`Order #${receipt.id}`}>
          <div className="px-5 pt-2 pb-8">
            <Receipt venue={floor.venue} waiter={floor.waiter} table={receipt.table} guests={receipt.guests} time={receipt.closedAt} lines={receipt.lines} itemById={itemById} money={money} tip={receipt.tip} paid={receipt.method} />
          </div>
        </Sheet>
      )}

      {scan && (
        <Scanner
          tables={tables.map((x) => x.no)}
          onClose={() => setScan(false)}
          onTable={(no) => {
            setScan(false);
            setOpen(no);
            notify({ title: tr("Table {n} scanned", { n: no }), tone: "blue" });
          }}
        />
      )}

      {(newBooking || editBooking) && (
        <NewBookingPage
          tables={tables}
          initial={editBooking ?? undefined}
          onClose={() => {
            setNewBooking(false);
            setEditBooking(null);
          }}
          onSave={(b: Booking) => {
            setEditBooking(null);
            setBookings((bs) => (bs.some((x) => x.id === b.id) ? bs.map((x) => (x.id === b.id ? b : x)) : [...bs, b]));
            if (b.day === 0 && b.table) patch(b.table, (x) => (x.status === "free" ? { ...x, status: "reserved", booking: { name: b.name.split(" ")[0]!, time: b.time } } : x));
            setNewBooking(false);
            notify({ title: tr("Booking saved"), text: `${b.name} · ${tr("{n} guest|{n} guests", { n: b.guests })} · ${b.time}` });
          }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Dashboard strip */

/** Money that always fits a dashboard tile: 4,708,000 → "4.71M ₫", 256,000 → "256k ₫". */
export function compactMoney(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2).replace(/\.?0+$/, "")}M ₫`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k ₫`;
  return `${n} ₫`;
}

/* ---------------------------------------------------------------- Long press */

/* ---------------------------------------------------------------- Tables */

type TableActions = {
  scan: () => void;
  open: (no: number) => void;
  /** Opens the bill straight away (a table that asked for it). */
  bill: (no: number) => void;
  addItems: (no: number) => void;
  check: (no: number) => void;
  serveAll: (no: number) => void;
  seat: (no: number) => void;
};

function tableState(x: FloorTable, tr: (en: string, v?: TrVars) => string) {
  const cooking = x.lines.filter((l) => l.state !== "served" && !l.cancelled).length;
  if (x.status === "bill") return { text: tr("Wants the bill"), dot: "bg-white" };
  if (x.status === "seated") return { text: tr("Ready to order"), dot: "bg-[#8fb2ff]" };
  if (cooking) return { text: tr("{n} dish cooking|{n} dishes cooking", { n: cooking }), dot: "bg-g-orange" };
  return { text: tr("All served"), dot: "bg-[#5ce0a0]" };
}

function TableTile({ x, money, onTap, onLong }: { x: FloorTable; money: (n: number) => string; onTap: () => void; onLong: () => void }) {
  const press = useLongPress(onLong, onTap);
  const tr = useTr();
  const total = ticketTotal(x.lines);
  const busy = x.status === "seated" || x.status === "ordered";
  const st = tableState(x, tr);
  const look = x.status === "bill" ? "blue-grad" : busy ? "bg-g-ink text-white" : x.status === "reserved" ? "border-[1.5px] border-dashed border-g-fill-2" : "bg-g-fill";
  return (
    <button {...press} style={{ WebkitTouchCallout: "none" }} className={`press flex aspect-[0.9] flex-col justify-between rounded-[22px] p-3 text-left select-none ${look}`}>
      <span className="flex items-start justify-between">
        <span className="flex items-center gap-1.5">
          <span className="text-[28px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{x.no}</span>
          {x.lines.some((l) => l.by === "guest") && (
            <span title={tr("Guest ordered from the QR menu")} className={`grid size-5 place-items-center rounded-full ${busy || x.status === "bill" ? "bg-white/20 text-white" : "bg-g-blue-soft text-g-blue"}`}>
              <QrCode size={11} strokeWidth={2.4} />
            </span>
          )}
        </span>
        <span className={`flex items-center gap-0.5 text-[12px] font-medium ${busy || x.status === "bill" ? "text-white/70" : "text-g-muted"}`}>
          <Users size={12} strokeWidth={2} /> {busy || x.status === "bill" ? x.guests : x.seats}
        </span>
      </span>
      {x.status === "free" ? (
        <span className="text-[12px] font-medium text-g-faint">{tr("Free")}</span>
      ) : x.status === "reserved" ? (
        <span>
          <span className="live block text-[14px] font-semibold tabular-nums">{x.booking?.time}</span>
          <span className="live block truncate text-[12px] font-medium text-g-teal">{x.booking?.name}</span>
        </span>
      ) : (
        <span>
          <span className="live block truncate text-[13px] font-semibold tabular-nums">{total ? money(total) : tr("since {t}", { t: x.since ?? "" })}</span>
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
  const tr = useTr();
  const [zone, setZone] = useState<"All" | FloorTable["zone"]>("All");
  const [peek, setPeek] = useState<number | null>(null);
  const shown = tables.filter((x) => zone === "All" || x.zone === zone);
  const busy = tables.filter((x) => x.status !== "free" && x.status !== "reserved").length;
  const bills = tables.filter((x) => x.status === "bill");
  const seats = tables.reduce((n, x) => n + (x.status === "free" ? x.seats : 0), 0);
  const peeked = tables.find((x) => x.no === peek) ?? null;
  return (
    <div className="px-5">
      <PageHead
        hidden
        title={tr("Tables")}
        sub={`Samarkand · ${tr("lunch")}`}
        action={
          <button aria-label={tr("Scan table QR")} onClick={actions.scan} className="press grid size-11 place-items-center rounded-full bg-g-fill">
            <ScanLine size={20} strokeWidth={2} />
          </button>
        }
      />
      {/* Different forms for different questions: how the hall filled up, how full it is now, who waits for the bill. */}
      <Reveal className="mt-6 grid grid-cols-2 gap-3">
        <LineWidget
          className="col-span-2"
          title={tr("Hall occupancy")}
          icon={<Users size={13} strokeWidth={2.4} />}
          labels={["10:00", "11:00", "12:00", "12:45"]}
          values={[1, 3, 6, busy]}
          format={(v) => tr("{v} of {n} tables", { v, n: tables.length })}
        />
        <IconStat title={tr("Busy now")} art="floor" value={`${busy} / ${tables.length}`} sub={tr("tables taken")} />
        <IconStat title={tr("Free seats")} art="seats" value={String(seats)} sub={tr("{n} free table|{n} free tables", { n: tables.filter((x) => x.status === "free").length })} />
        <ActionListWidget
          className="col-span-2"
          title={tr("Waiting for the bill")}
          icon={<ReceiptText size={13} strokeWidth={2.4} />}
          rows={bills.map((x) => ({
            id: String(x.no),
            badge: String(x.no),
            badgeLabel: tr("Table"),
            title: money(ticketTotal(x.lines)),
            sub: `${tr("{n} guest|{n} guests", { n: x.guests })} · ${tr("at the table for {d}", { d: seatedFor(x.since, tr) })}`,
            action: { label: tr("Bill"), onClick: () => actions.check(x.no) },
          }))}
          empty={tr("No one is waiting")}
        />
      </Reveal>
      <div className="mt-8 flex rounded-full bg-g-fill p-1">
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
            {tr(z)}
          </button>
        ))}
      </div>
      <Reveal className="mt-4 grid grid-cols-3 gap-3">
        {shown.map((x) => (
          <TableTile key={x.no} x={x} money={money} onTap={() => (x.status === "bill" ? actions.bill(x.no) : actions.open(x.no))} onLong={() => setPeek(x.no)} />
        ))}
      </Reveal>
      <p className="mt-4 text-center text-[12px] text-g-faint">{tr("Hold a table for quick actions")}</p>
      {peeked && <TablePeek x={peeked} money={money} actions={actions} itemById={itemById} onClose={() => setPeek(null)} />}
    </div>
  );
}

/** Long-press preview: the table's short story and quick actions, without opening the full page. */
function TablePeek({ x, money, actions, itemById, onClose }: { x: FloorTable; money: (n: number) => string; actions: TableActions; itemById: Map<string, MenuItem>; onClose: () => void }) {
  const tr = useTr();
  const dish = useDish();
  const total = ticketTotal(x.lines);
  const empty = x.status === "free" || x.status === "reserved";
  const run = (f: (no: number) => void) => () => {
    haptic("light");
    onClose();
    f(x.no);
  };
  const items: [string, LucideIcon, () => void][] = empty
    ? [
        [tr("Seat guests"), Users, run(actions.seat)],
        [tr("Open the table"), LayoutGrid, run(actions.open)],
      ]
    : [
        [tr("Add dishes"), Plus, run(actions.addItems)],
        [x.status === "bill" ? tr("Open the bill") : tr("Bring the bill"), ReceiptText, run(actions.check)],
        ...(x.lines.some((l) => l.state !== "served") ? [[tr("Mark everything served"), ChefHat, run(actions.serveAll)] as [string, LucideIcon, () => void]] : []),
        [tr("Open the table"), LayoutGrid, run(actions.open)],
      ];
  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center px-6" role="dialog" aria-label={tr("Table {n}", { n: x.no })}>
      <ScrollLock />
      <button aria-label={tr("Close")} onClick={onClose} className="animate-fade absolute inset-0 bg-[rgba(11,11,15,0.45)]" />
      <div className="animate-pop relative w-full max-w-[340px]">
        <div className="rounded-[28px] bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[28px] leading-none font-bold tracking-[-0.03em]">{tr("Table {n}", { n: x.no })}</p>
              <p className="mt-1.5 text-[13px] text-g-muted">
                {tr(x.zone)} · {empty ? tr("{n} seat|{n} seats", { n: x.seats }) : `${tr("{n} guest|{n} guests", { n: x.guests })} · ${tr("since {t}", { t: x.since ?? "" })}`}
              </p>
            </div>
            <span className={`${STATUS[x.status].chip} inline-flex h-7 items-center rounded-full px-3 text-[12px] font-semibold`}>{tr(STATUS[x.status].label)}</span>
          </div>
          {!empty && x.lines.length > 0 && (
            <div className="mt-4 grid gap-1.5 border-t border-g-line pt-3.5">
              {x.lines.slice(0, 4).map((l) => (
                <p key={l.id} className="flex items-center gap-2 text-[14px]">
                  <span className="w-6 text-g-muted tabular-nums">{l.qty}×</span>
                  <span className="min-w-0 flex-1 truncate">{dish(itemById.get(l.itemId)?.name) || l.itemId}</span>
                  <span className={`${LINE[l.state].chip} inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold`}>{tr(LINE[l.state].label)}</span>
                </p>
              ))}
              {x.lines.length > 4 && <p className="text-[13px] text-g-muted">{tr("and {n} more", { n: x.lines.length - 4 })}</p>}
              <p className="mt-1 flex items-baseline justify-between border-t border-g-line pt-2.5">
                <span className="text-[13px] text-g-muted">{tr("Total")}</span>
                <span className="text-[20px] font-semibold tabular-nums">{money(total)}</span>
              </p>
            </div>
          )}
          {x.status === "reserved" && x.booking && (
            <p className="mt-4 rounded-[16px] bg-g-fill px-3.5 py-2.5 text-[14px]">
              {tr("Booked by {name} for {t}", { name: x.booking.name, t: x.booking.time })}
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
    </div>,
    document.body,
  );
}

function PageHead({ title, sub, action, hidden }: { title: string; sub?: string; action?: ReactNode; hidden?: boolean }) {
  if (hidden) return null;
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

function TablePage({
  table,
  itemById,
  money,
  onClose,
  onSeat,
  onAdvance,
  onTakeOrder,
  onCheck,
  onEditLine,
  onCancelLine,
}: {
  table: FloorTable;
  itemById: Map<string, MenuItem>;
  money: (n: number) => string;
  onClose: () => void;
  onSeat: (guests: number) => void;
  onAdvance: (lineId: string) => void;
  onTakeOrder: () => void;
  onCheck: () => void;
  onEditLine: (lineId: string, qty: number) => void;
  onCancelLine: (lineId: string, reason: string) => void;
}) {
  const tr = useTr();
  const dish = useDish();
  const [guests, setGuests] = useState(Math.min(2, table.seats));
  // Hold a dish for its menu; cancelling asks for a reason; a cancelled dish shows why.
  const [menu, setMenu] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const total = ticketTotal(table.lines);
  const empty = table.status === "free" || table.status === "reserved";
  return (
    <Sheet
      open
      onClose={onClose}
      label={tr("Table {n}", { n: table.no })}
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
            {table.status === "reserved" ? tr("Guests arrived · seat") : tr("Seat guests")} · {guests}
          </button>
        ) : (
          <div className="flex gap-2.5">
            <button onClick={onTakeOrder} className="press flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-g-fill text-[16px] font-semibold">
              <Plus size={18} strokeWidth={2.25} /> {tr("Add dishes")}
            </button>
            <button disabled={!table.lines.length} onClick={onCheck} className="blue-grad press h-14 flex-[1.3] rounded-full text-[16px] font-semibold disabled:opacity-40">
              {table.status === "bill" ? tr("Open the bill") : tr("Bring the bill")}
            </button>
          </div>
        )
      }
    >
      <div className="px-5 pt-2 pb-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[34px] leading-none font-bold tracking-[-0.03em]">{tr("Table {n}", { n: table.no })}</h2>
            <p className="mt-2 text-[14px] text-g-muted">
              {tr(table.zone)} · {tr("{n} seat|{n} seats", { n: table.seats })}
            </p>
          </div>
          <span className={`${STATUS[table.status].chip} mt-1 inline-flex h-7 items-center rounded-full px-3 text-[13px] font-semibold`}>{tr(STATUS[table.status].label)}</span>
        </div>

        {!empty && (
          // The table at a glance: the total big, the share per guest, then guests, time seated and where the order came from.
          <div className="mt-6 rounded-[24px] bg-g-fill p-4">
            <div className="flex items-end justify-between gap-3">
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-g-muted">{tr("Total")}</span>
                <span className="block text-[32px] leading-tight font-semibold tracking-[-0.035em] tabular-nums">{total ? money(total) : "—"}</span>
              </span>
              {total > 0 && table.guests > 0 && (
                <span className="shrink-0 pb-1.5 text-right text-[12px] text-g-muted tabular-nums">
                  ≈ {compactMoney(Math.round(total / table.guests / 1000) * 1000)}
                  <br />
                  {tr("per guest")}
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[13px] font-semibold tabular-nums">
                <Users size={14} strokeWidth={2.2} className="text-g-blue" /> {tr("{n} guest|{n} guests", { n: table.guests })}
              </span>
              <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[13px] font-semibold tabular-nums">
                <Clock size={14} strokeWidth={2.2} className="text-g-blue" /> {seatedFor(table.since, tr)}
                <span className="font-medium text-g-muted">· {tr("since {t}", { t: table.since ?? "" })}</span>
              </span>
              {table.lines.some((l) => l.by === "guest") && (
                <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[13px] font-semibold">
                  <QrCode size={14} strokeWidth={2.2} className="text-g-blue" /> {tr("QR menu")}
                </span>
              )}
            </div>
          </div>
        )}

        {empty ? (
          <section className="mt-8">
            {table.booking && (
              <div className="mb-7 rounded-[22px] bg-g-fill p-4">
                <p className="text-[13px] font-medium text-g-teal">{tr("Booked for {t}", { t: table.booking.time })}</p>
                <p className="mt-0.5 text-[17px] font-semibold">{table.booking.name}</p>
              </div>
            )}
            <StepHead title={tr("Guests")} />
            <div className="flex items-center justify-between">
              <span className="text-[56px] leading-[0.9] font-semibold tracking-[-0.04em] tabular-nums">{guests}</span>
              <Counter value={guests} min={1} max={table.seats + 2} onChange={setGuests} />
            </div>
          </section>
        ) : (
          <section className="mt-8">
            <StepHead title={tr("Order")} aside={table.lines.length ? tr("Hold a dish to change it") : undefined} />
            {table.lines.length ? (
              <div className="grid gap-5">
                {(
                  [
                    ["guest", tr("Guest · QR menu"), QrCode],
                    ["waiter", tr("Added by the waiter"), UserRound],
                  ] as const
                ).map(([by, label, Icon]) => {
                  const ls = table.lines.filter((l) => (l.by ?? "waiter") === by);
                  if (!ls.length) return null;
                  return (
                    <div key={by}>
                      <p className="flex items-center gap-1.5 text-[12px] font-semibold tracking-[0.04em] text-g-muted uppercase">
                        <Icon size={13} strokeWidth={2.4} className="text-g-blue" /> {label}
                      </p>
                      <div className="mt-1 divide-y divide-g-line">
                        {ls.map((l) => (
                          <OrderLineRow
                            key={l.id}
                            line={l}
                            name={dish(itemById.get(l.itemId)?.name) || l.itemId}
                            money={money}
                            onHold={() => setMenu(l.id)}
                            onStatus={() => (l.cancelled ? setWhy(l.id) : onAdvance(l.id))}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center rounded-[22px] bg-g-fill py-10 text-center">
                <Armchair size={26} strokeWidth={1.75} className="text-g-blue" />
                <p className="mt-2 text-[15px] text-g-muted">{tr("No order yet. Tap “Add dishes”.")}</p>
              </div>
            )}
          </section>
        )}
      </div>
      {(() => {
        const name = (id: string) => dish(itemById.get(table.lines.find((x) => x.id === id)?.itemId ?? "")?.name);
        const m = table.lines.find((x) => x.id === menu);
        const c = table.lines.find((x) => x.id === cancelling);
        const w = table.lines.find((x) => x.id === why);
        return (
          <>
            {m && (
              <LineMenu
                line={m}
                name={name(m.id)}
                money={money}
                onClose={() => setMenu(null)}
                onQty={(q) => {
                  onEditLine(m.id, q);
                  setMenu(null);
                }}
                onCancel={() => {
                  setMenu(null);
                  setCancelling(m.id);
                }}
              />
            )}
            {c && (
              <CancelSheet
                line={c}
                name={name(c.id)}
                money={money}
                onClose={() => setCancelling(null)}
                onConfirm={(r) => {
                  onCancelLine(c.id, r);
                  setCancelling(null);
                }}
              />
            )}
            {w?.cancelled && <CancelInfo line={w} name={name(w.id)} money={money} onClose={() => setWhy(null)} />}
          </>
        );
      })()}
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

function OrderPicker({ table, menu: seedMenu, money, onClose, onSend }: { table: FloorTable; menu: Menu; money: (n: number) => string; onClose: () => void; onSend: (lines: TicketLine[]) => void }) {
  // The waiter picks from the menu as the admin published it.
  const edits = menuEdits(seedMenu.venue.slug).use();
  const menu = useMemo(() => applyEdits(seedMenu, edits), [seedMenu, edits]);
  const tr = useTr();
  const dish = useDish();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(menu.categories[0]!.id);
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [review, setReview] = useState(false);
  const [note, setNote] = useState("");
  const stop = useStopList();
  const simple = (i: MenuItem) => i.price > 0 && !i.variants.length && !i.modifierGroups.some((g) => g.required) && !stop.includes(i.id);
  const query = q.trim().toLowerCase();
  const list = menu.categories.flatMap((c) => c.items.filter((i) => simple(i) && (query ? Object.values(i.name).some((v) => (v ?? "").toLowerCase().includes(query)) : c.id === cat)));
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
  const send = () => onSend(entries.map(([itemId, qty]) => ({ id: lineId(), itemId, qty, price: byId.get(itemId)?.price ?? 0, state: "new" as const, by: "waiter" as const, at: new Date().toTimeString().slice(0, 5) })));
  const stepper = (id: string, n: number) => (
    <div className="flex h-10 w-[104px] shrink-0 items-center justify-between rounded-full bg-g-ink px-1 text-white">
      <button aria-label={tr("One less")} onClick={() => set(id, n - 1)} className="grid size-8 place-items-center">
        <Minus size={16} />
      </button>
      <span className="text-[15px] font-semibold tabular-nums">{n}</span>
      <button aria-label={tr("One more")} onClick={() => set(id, n + 1)} className="grid size-8 place-items-center">
        <Plus size={16} />
      </button>
    </div>
  );
  return (
    <>
      <Sheet
        open
        onClose={onClose}
        label={tr("Table {n} · add dishes", { n: table.no })}
        footer={
          count ? (
            <div className="flex gap-2.5">
              {/* Preview before sending: see the whole order, change it, add a note. */}
              <button onClick={() => setReview(true)} className="press flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-g-fill text-[16px] font-semibold">
                <span key={count} className="animate-pop grid size-7 place-items-center rounded-full bg-g-ink text-[13px] text-white tabular-nums">
                  {count}
                </span>
                {tr("Check order")}
              </button>
              <button onClick={send} className="blue-grad press flex h-14 flex-[1.4] items-center justify-center gap-2 rounded-full text-[16px] font-semibold tabular-nums">
                <Send size={18} strokeWidth={2} /> {tr("Send")} · {money(total)}
              </button>
            </div>
          ) : (
            <p className="flex h-14 items-center justify-center text-[15px] text-g-muted">{tr("Tap + to add a dish")}</p>
          )
        }
      >
        <div className="px-5 pt-1 pb-6">
          <label className="flex h-12 items-center gap-3 rounded-full bg-g-fill px-4 text-g-muted">
            <Search size={20} strokeWidth={2} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Find a dish")} className="min-w-0 flex-1 bg-transparent text-[16px] text-g-ink outline-none placeholder:text-g-faint" />
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
                  {dish(c.name)}
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
                    <span className="block truncate text-[15px] font-medium">{dish(i.name)}</span>
                    <span className="text-[13px] text-g-muted tabular-nums">{money(i.price)}</span>
                  </span>
                  {n ? (
                    stepper(i.id, n)
                  ) : (
                    <button aria-label={`Add ${dish(i.name)}`} onClick={() => set(i.id, 1)} className="blue-grad press grid size-10 place-items-center rounded-full">
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
          label={tr("Check order · table {n}", { n: table.no })}
          footer={
            <button disabled={!count} onClick={send} className="blue-grad press flex h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-semibold tabular-nums disabled:opacity-40">
              <Send size={18} strokeWidth={2} /> {tr("Send to the kitchen")} · {money(total)}
            </button>
          }
        >
          <div className="px-5 pt-2 pb-8">
            <p className="text-[14px] text-g-muted">
              {tr("Table {n}", { n: table.no })} · {tr("{n} guest|{n} guests", { n: table.guests })} · {tr("new round")}
            </p>
            <p className="text-[40px] leading-tight font-semibold tracking-[-0.03em] tabular-nums">{money(total)}</p>
            <div className="mt-5 divide-y divide-g-line">
              {entries.map(([id, n]) => (
                <div key={id} className="flex h-16 items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{dish(byId.get(id)!.name)}</span>
                    <span className="text-[13px] text-g-muted tabular-nums">
                      {n} × {money(byId.get(id)!.price)}
                    </span>
                  </span>
                  {stepper(id, n)}
                </div>
              ))}
            </div>
            {!count && <p className="py-10 text-center text-[15px] text-g-muted">{tr("The order is empty. Go back and add dishes.")}</p>}
            {table.lines.length > 0 && (
              <p className="mt-5 rounded-[18px] bg-g-fill px-4 py-3 text-[13px] text-g-muted">
                {tr("Already on the table: {n} item|Already on the table: {n} items", { n: table.lines.reduce((s, l) => s + l.qty, 0) })} · {money(ticketTotal(table.lines))}
              </p>
            )}
            <label className="mt-6 block text-[13px] font-semibold tracking-[0.06em] text-g-muted uppercase" htmlFor="kitchen-note">
              {tr("Note for the kitchen")}
            </label>
            <textarea
              id="kitchen-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder={tr("No onion, kids portion, serve together…")}
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

function Receipt({
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
  const tr = useTr();
  const dish = useDish();
  const subtotal = ticketTotal(lines);
  const service = Math.round(subtotal * 0.05);
  const total = subtotal + service + tip;
  return (
    <div className="rounded-[26px] bg-g-fill px-5 pt-6 pb-5">
      <div className="text-center">
        <p className="text-[20px] font-bold tracking-[-0.02em]">{venue.name}</p>
        <p className="text-[13px] text-g-muted">{venue.address}</p>
        <p className="mt-3 text-[13px] text-g-muted tabular-nums">
          {tr("Table {n}", { n: table })} · {tr("{n} guest|{n} guests", { n: guests })} · {waiter} · {time}
        </p>
      </div>
      <div className="my-4 border-t border-dashed border-g-faint/60" />
      <div className="grid gap-2.5">
        {lines.map((l) => (
          <div key={l.id} className={`flex items-baseline gap-2 text-[15px] ${l.cancelled ? "text-g-faint line-through" : ""}`}>
            <span className="w-6 shrink-0 text-g-muted tabular-nums">{l.qty}×</span>
            <span className="min-w-0 flex-1 truncate">{dish(itemById.get(l.itemId)?.name) || l.itemId}</span>
            <span className="shrink-0 tabular-nums">{l.cancelled ? money(0) : money(l.price * l.qty)}</span>
          </div>
        ))}
      </div>
      <div className="my-4 border-t border-dashed border-g-faint/60" />
      <div className="grid gap-1.5 text-[14px] text-g-muted tabular-nums">
        <Row label={tr("Dishes")} value={money(subtotal)} />
        <Row label={tr("Service 5%")} value={money(service)} />
        {tip > 0 && <Row label={tr("Tip")} value={money(tip)} />}
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-[15px] font-semibold">{tr("Total")}</span>
        <span className="text-[30px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{money(total)}</span>
      </div>
      <p className="mt-1 text-right text-[12px] text-g-faint">{tr("VAT included · e-invoice on request")}</p>
      {qr && (
        <div className="mt-5 flex items-center gap-4 rounded-[20px] bg-white p-3.5">
          <span className="text-g-ink">
            <FakeQr seed={table * 97 + subtotal} size={96} />
          </span>
          <span>
            <span className="block text-[15px] font-semibold">{tr("Scan to pay")}</span>
            <span className="block text-[13px] text-g-muted">{tr("VietQR · any bank app, MoMo, ZaloPay")}</span>
          </span>
        </div>
      )}
      {paid && (
        <p className="chip-green mt-5 flex h-10 items-center justify-center gap-1.5 rounded-full text-[14px] font-semibold">
          {tr("Paid")} · {tr(METHOD[paid].label)}
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
  const tr = useTr();
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
      <Sheet open onClose={onDone} label={tr("Paid")}>
        <div className="flex flex-col items-center px-6 pt-16 pb-10 text-center">
          <span className="blue-grad animate-pop grid size-24 place-items-center rounded-full">
            <svg viewBox="0 0 24 24" width={44} height={44} fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m5 12.5 4.5 4.5L19 7.5" />
            </svg>
          </span>
          <h2 className="mt-7 text-[30px] font-bold tracking-[-0.025em]">{tr("Paid")}</h2>
          <p className="mt-1 text-[44px] leading-none font-semibold tracking-[-0.04em] tabular-nums">{money(done.total)}</p>
          <p className="mt-3 text-[15px] text-g-muted">
            {tr("Table {n}", { n: table.no })} · {tr(METHOD[method].label)}
            {done.tip ? ` · ${tr("tip {sum}", { sum: money(done.tip) })}` : ""}
          </p>
          {done.change > 0 && <p className="chip-blue mt-5 rounded-full px-4 py-2 text-[15px] font-semibold tabular-nums">{tr("Change {sum}", { sum: money(done.change) })}</p>}
          <button onClick={onDone} className="press mt-10 h-14 w-full max-w-[320px] rounded-full bg-g-fill text-[16px] font-semibold">
            {tr("Back to tables")}
          </button>
        </div>
      </Sheet>
    );

  return (
    <Sheet
      open
      onClose={onClose}
      label={tr("Payment · table {n}", { n: table.no })}
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
          {tr("Close the bill")} · {money(total)}
        </button>
      }
    >
      <div className="px-5 pt-2 pb-8">
        <p className="text-[14px] font-medium text-g-muted">{tr("To pay")}</p>
        <p className="live text-[48px] leading-none font-semibold tracking-[-0.04em] tabular-nums">{money(total)}</p>
        {split > 1 && <p className="mt-2 text-[15px] text-g-blue tabular-nums">{tr("{sum} each × {n}", { sum: money(Math.ceil(total / split / 1000) * 1000), n: split })}</p>}

        <section className="mt-9">
          <StepHead n={1} title={tr("Payment method")} />
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
                  <Icon size={20} strokeWidth={1.9} /> {tr(label)}
                </button>
              );
            })}
          </div>
          {(method === "vietqr" || method === "momo") && (
            <div className="mt-3 flex items-center gap-4 rounded-[20px] bg-g-fill p-3.5">
              <span className="rounded-[12px] bg-white p-2">
                <FakeQr seed={table.no * 31 + total} size={88} />
              </span>
              <span className="text-[14px] text-g-muted">{tr("Show this to the guest. Payment confirms automatically when the bank sends the notice.")}</span>
            </div>
          )}
          {method === "cash" && (
            <div className="mt-3">
              <p className="mb-2 text-[13px] font-medium text-g-muted">{tr("Guest gives")}</p>
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
                    {v === total ? tr("Exact amount") : money(v)}
                  </button>
                ))}
              </div>
              {received !== null && received > total && <p className="mt-3 text-[15px] font-semibold text-g-blue tabular-nums">{tr("Change {sum}", { sum: money(received - total) })}</p>}
            </div>
          )}
        </section>

        <section className="mt-9">
          <StepHead n={2} title={tr("Tip")} aside={tr("Goes to the team pool")} />
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
                {p ? `${p}%` : tr("No tip")}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-9">
          <StepHead n={3} title={tr("Split the bill")} aside={tr("Optional")} />
          <div className="flex items-center justify-between">
            <span className="text-[15px] text-g-muted">
              {tr("Split between")} <span className="font-semibold text-g-ink tabular-nums">{tr("{n} guest|{n} guests", { n: split })}</span>
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
}: {
  tables: FloorTable[];
  history: ClosedOrder[];
  money: (n: number) => string;
  itemById: Map<string, MenuItem>;
  onOpenTable: (no: number) => void;
}) {
  const tr = useTr();
  const dish = useDish();
  const open = tables.filter((x) => x.lines.length);
  const dishes = (st: LineState) => open.reduce((n, x) => n + x.lines.filter((l) => l.state === st && !l.cancelled).reduce((q, l) => q + l.qty, 0), 0);
  const billTables = open.filter((x) => x.status === "bill").sort((a, b) => (a.since ?? "").localeCompare(b.since ?? ""));
  const [pickBill, setPickBill] = useState(false);
  // How long a table has been seated, against the demo clock (12:45).
  const sat = (since?: string) => {
    if (!since) return "—";
    const [h, m] = since.split(":").map(Number);
    const d = 12 * 60 + 45 - ((h ?? 0) * 60 + (m ?? 0));
    return d >= 60 ? tr("{h} h {m} min", { h: Math.floor(d / 60), m: d % 60 }) : tr("{n} min", { n: d });
  };
  const groups: [string, FloorTable[]][] = [
    [tr("Want the bill"), open.filter((x) => x.status === "bill")],
    [tr("In the kitchen"), open.filter((x) => x.status !== "bill" && x.lines.some((l) => l.state !== "served"))],
    [tr("All served"), open.filter((x) => x.status !== "bill" && x.lines.every((l) => l.state === "served"))],
  ];
  const summary = (ls: TicketLine[]) => {
    const names = ls.map((l) => `${l.qty}× ${dish(itemById.get(l.itemId)?.name)}`);
    return names.slice(0, 2).join(", ") + (names.length > 2 ? ` +${names.length - 2}` : "");
  };
  return (
    <div className="px-5">
      {/* The day's money as a hero, the live pipeline of orders, then two small rings. */}
      <Reveal className="mt-6 grid grid-cols-2 gap-3">
        <FlowWidget
          className="col-span-2"
          title={tr("Orders now")}
          icon={<ClipboardList size={13} strokeWidth={2.4} />}
          headline={
            <p>
              <span className="live text-[30px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{dishes("new") + dishes("cooking")}</span>
              <span className="ml-1.5 text-[14px] text-g-muted">
                {tr("dish in work|dishes in work", { n: dishes("new") + dishes("cooking") })} · {tr("{n} open table|{n} open tables", { n: open.length })}
              </span>
            </p>
          }
          stages={[
            { label: tr("New"), count: dishes("new"), color: "#8fb2ff", icon: <Hourglass size={14} strokeWidth={2.4} />, hint: tr("Sent, waiting for the kitchen") },
            { label: tr("Cooking"), count: dishes("cooking"), color: "#2f5bff", icon: <CookingPot size={14} strokeWidth={2.4} />, hint: tr("In the kitchen now") },
            {
              label: tr("Bill"),
              count: billTables.length,
              color: "#ef6c1a",
              icon: <ReceiptText size={14} strokeWidth={2.4} />,
              hint:
                billTables.length === 1
                  ? `${tr("Table {n}", { n: billTables[0]!.no })} · ${compactMoney(ticketTotal(billTables[0]!.lines))}`
                  : billTables.length
                    ? tr("Tables {list}", { list: billTables.map((x) => x.no).join(", ") })
                    : tr("No one is waiting"),
              // One table: straight to its bill. Several: choose who pays first.
              action: billTables.length
                ? {
                    label: billTables.length > 1 ? `${tr("Take payment")} · ${billTables.length}` : tr("Take payment"),
                    onClick: () => (billTables.length > 1 ? setPickBill(true) : onOpenTable(billTables[0]!.no)),
                  }
                : undefined,
            },
          ]}
          footnote={tr("{n} bill paid today|{n} bills paid today", { n: history.length })}
        />
      </Reveal>
      {open.length ? (
        groups.map(([title, list]) =>
          list.length ? (
            <section key={title} className="mt-7">
              <h2 className="text-[13px] font-semibold tracking-[0.06em] text-g-muted uppercase">
                {title} · {list.length}
              </h2>
              <Reveal className="mt-1 divide-y divide-g-line">
                {list.map((x) => {
                  const cooking = x.lines.filter((l) => l.state !== "served" && !l.cancelled).length;
                  return (
                    <button key={x.no} onClick={() => onOpenTable(x.no)} className="press flex w-full gap-3.5 py-4 text-left">
                      <span className={`grid size-12 shrink-0 place-items-center rounded-full text-[18px] font-semibold tabular-nums ${x.status === "bill" ? "blue-grad" : "bg-g-fill"}`}>{x.no}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="text-[16px] font-semibold">{tr("Table {n}", { n: x.no })}</span>
                          <span className="live shrink-0 text-[16px] font-semibold tabular-nums">{money(ticketTotal(x.lines))}</span>
                        </span>
                        <span className="live mt-0.5 block truncate text-[14px] text-g-ink-2">{summary(x.lines)}</span>
                        <span className="mt-1.5 flex items-center gap-2 text-[12px] text-g-muted">
                          {cooking > 0 && <span className="chip-orange inline-flex h-6 items-center rounded-full px-2 font-semibold">{tr("{n} cooking", { n: cooking })}</span>}
                          <span className="live">
                            {tr("since {t}", { t: x.since ?? "" })} · {tr("{n} guest|{n} guests", { n: x.guests })}
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
      ) : null}
      {pickBill && (
        <PeekCard label={tr("Waiting for the bill")} onClose={() => setPickBill(false)}>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[22px] leading-tight font-bold tracking-[-0.02em]">{tr("Waiting for the bill")}</p>
            <span className="chip-orange rounded-full px-2.5 py-1 text-[12px] font-semibold tabular-nums">
              {tr("{n} table|{n} tables", { n: billTables.length })}
            </span>
          </div>
          <div className="mt-4 grid gap-2">
            {billTables.map((x, i) => (
              <button
                key={x.no}
                onClick={() => {
                  haptic("light");
                  setPickBill(false);
                  onOpenTable(x.no);
                }}
                className="press flex items-center gap-3.5 rounded-[22px] bg-g-fill p-3 pr-3.5 text-left"
              >
                <span className="flex w-12 shrink-0 flex-col items-center">
                  <span className="text-[11px] font-medium text-g-muted">{tr("Table")}</span>
                  <span className="text-[30px] leading-none font-bold tracking-[-0.03em] tabular-nums">{x.no}</span>
                </span>
                <span className="min-w-0 flex-1">
                  {i === 0 && <span className="mb-1 inline-block rounded-full bg-[#ef6c1a] px-2 py-0.5 text-[10px] font-semibold text-white">{tr("Longest at the table")}</span>}
                  <span className="block text-[17px] font-semibold tabular-nums">{money(ticketTotal(x.lines))}</span>
                  <span className="flex items-center gap-1 text-[12px] whitespace-nowrap text-g-muted tabular-nums">
                    {tr("{n} guest|{n} guests", { n: x.guests })} · <Clock size={12} strokeWidth={2.2} className="shrink-0" /> {sat(x.since)}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-g-ink px-3.5 py-2 text-[13px] font-semibold text-white">{tr("Pay")}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 flex items-baseline justify-between px-1 text-[13px] text-g-muted">
            <span>{tr("All bills")}</span>
            <span className="text-[15px] font-semibold text-g-ink tabular-nums">{money(billTables.reduce((n, x) => n + ticketTotal(x.lines), 0))}</span>
          </p>
        </PeekCard>
      )}
      {!open.length && <p className="py-12 text-center text-[15px] text-g-muted">{tr("No open orders")}</p>}
    </div>
  );
}

/**
 * The shift's money, for the till page: takings against the last days, then
 * tips and the average check over the whole shift by hour.
 */
export function ShiftMoney({ history }: { history: ClosedOrder[] }) {
  const tr = useTr();
  const locale = useLocale();
  const takings = history.reduce((s, o) => s + total5(o), 0);
  const tips = history.reduce((s, o) => s + o.tip, 0);
  return (
    <Reveal className="grid grid-cols-2 gap-3">
        <DaysCompareWidget
          className="col-span-2"
          title={tr("Taken today")}
          icon={<Wallet size={13} strokeWidth={2.4} />}
          days={lastDays(takings, locale)}
          format={compactMoney}
          todayNote={tr("tap a day to compare")}
        />
        {/* Full-width insight cards over the whole shift: worked hours in colour, the rest grey. */}
        {(() => {
          const bills = [...history].reverse();
          const START = 10;
          const END = 22;
          const NOW_H = 12;
          const hourOf = (t: string) => Number(t.slice(0, 2));
          const inHour = (h: number) => bills.filter((o) => hourOf(o.closedAt) === h);
          const label = (h: number) => `${String(h).padStart(2, "0")}:00`;
          const hours = Array.from({ length: END - START + 1 }, (_, k) => START + k);
          const tipsSlots = hours.map((h) => ({ label: label(h), value: h > NOW_H ? null : inHour(h).reduce((n, o) => n + o.tip, 0) }));
          const checkSlots = hours.map((h) => {
            const os = inHour(h);
            return { label: label(h), value: h > NOW_H ? null : os.length ? Math.round(os.reduce((n, o) => n + total5(o), 0) / os.length) : 0 };
          });
          const tipped = bills.filter((o) => o.tip > 0);
          const totals = bills.map(total5);
          const avg = bills.length ? Math.round(takings / bills.length / 1000) * 1000 : 0;
          return (
            <>
              <InsightCard
                className="col-span-2"
                title={tr("Tips")}
                tone="green"
                value={compactMoney(tips)}
                slots={tipsSlots}
                now={NOW_H - START}
                nowLabel={tr("now")}
                format={compactMoney}
                facts={[
                  { label: tr("Bills with a tip"), value: `${tipped.length} / ${bills.length}` },
                  { label: tr("Average tip"), value: compactMoney(tipped.length ? Math.round(tips / tipped.length / 1000) * 1000 : 0) },
                  { label: tr("Biggest"), value: compactMoney(Math.max(0, ...bills.map((o) => o.tip))) },
                ]}
                info={{
                  title: tr("How tips work"),
                  text: tr("Tips go to the team pool. Guests add them when they pay; at the end of the shift the pool is shared by everyone on shift, by hours worked."),
                  points: [tr("Each bar is one hour of the shift; grey hours are still ahead. Tap a bar to see it."), tr("A warm goodbye by name and a quick bill raise tips the most."), tr("Tips are counted separately from takings.")],
                }}
              />
              <InsightCard
                className="col-span-2"
                title={tr("Avg check")}
                tone="red"
                value={compactMoney(avg)}
                slots={checkSlots}
                now={NOW_H - START}
                nowLabel={tr("now")}
                format={compactMoney}
                facts={[
                  { label: tr("Bills today"), value: String(bills.length) },
                  { label: tr("Smallest"), value: compactMoney(totals.length ? Math.min(...totals) : 0) },
                  { label: tr("Biggest"), value: compactMoney(Math.max(0, ...totals)) },
                ]}
                info={{
                  title: tr("What is the average check"),
                  text: tr("Today's takings with service, divided by the number of closed bills. It shows how much one table spends on average."),
                  points: [tr("Each bar is one hour of the shift; grey hours are still ahead. Tap a bar to see it."), tr("It grows when you offer a drink with the dish and a dessert after."), tr("Big groups raise it; quick coffees lower it.")],
                }}
              />
            </>
          );
        })()}
    </Reveal>
  );
}

/**
 * The Hall: one place for the floor. Three big illustrated sections on top
 * (tables, orders, bookings), each opening its own page; quick services below.
 */
function HallHome({
  sections,
  onOpen,
  actions,
}: {
  sections: HallSection[];
  onOpen: (s: HallSection["id"]) => void;
  actions: { icon: LucideIcon; label: string; onClick: () => void }[];
}) {
  const tr = useTr();
  const [first, ...rest] = sections;
  return (
    <div className="px-5 pt-[max(20px,env(safe-area-inset-top))]">
      <PageHead title={tr("Hall")} sub={`Samarkand · ${tr("lunch")}`} />
      <Reveal className="mt-6 grid grid-cols-2 gap-3">
        {first && <HallCard s={first} big onOpen={onOpen} />}
        {rest.map((s) => (
          <HallCard key={s.id} s={s} onOpen={onOpen} />
        ))}
      </Reveal>
      {/* The two quick actions as wide buttons, under the cards. */}
      <div className="mt-3 grid grid-cols-2 gap-3">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={() => {
              haptic("light");
              a.onClick();
            }}
            className="press flex h-14 items-center gap-2.5 rounded-[20px] bg-g-fill px-3.5 text-left"
          >
            <span className="blue-grad grid size-9 shrink-0 place-items-center rounded-[12px]">
              <a.icon size={18} strokeWidth={2} />
            </span>
            <span className="truncate text-[14px] font-semibold">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Header of a Hall section: back to the Hall, the section's illustration, title and context. */
function SectionHead({ title, sub, art, onBack }: { title: string; sub: string; art: ArtName; onBack: () => void }) {
  const tr = useTr();
  return (
    <div className="px-5 pt-[max(14px,env(safe-area-inset-top))]">
      <button onClick={onBack} aria-label={tr("Hall")} className="press flex h-10 items-center gap-1 rounded-full bg-g-fill pr-4 pl-2 text-[14px] font-semibold">
        <ChevronLeft size={20} strokeWidth={2.2} /> {tr("Hall")}
      </button>
      <ArtScene name={art} layout="row" focal={64} className="mt-5 rounded-[28px] p-5">
        <span className="block pl-1">
          <span className="block text-[30px] leading-tight font-bold tracking-[-0.03em]">{title}</span>
          <span className="mt-0.5 block text-[14px] text-g-muted">{sub}</span>
        </span>
      </ArtScene>
    </div>
  );
}

type HallSection = { id: HallSeg | "bills" | "kitchen"; title: string; value: string; sub: string; hot?: boolean; art: ArtName };

/** One Hall section as a button on its illustrated scene; the same rhythm as the stat cards. */
function HallCard({ s, big, onOpen }: { s: HallSection; big?: boolean; onOpen: (s: HallSection["id"]) => void }) {
  return (
    <button
      onClick={() => {
        haptic("light");
        onOpen(s.id);
      }}
      className={`press relative block text-left ${big ? "col-span-2" : ""}`}
    >
      <ArtScene
        name={s.art}
        layout="row"
        focal={big ? 64 : 42}
        className={`rounded-[26px] ${big ? "p-5" : "p-4"}`}
        footer={<p className={`truncate pr-5 ${big ? "mt-4 text-[14px]" : "mt-3.5 text-[13px]"} ${s.hot ? "font-semibold text-g-orange" : "text-g-muted"}`}>{s.sub}</p>}
      >
        <p className={`truncate leading-tight font-semibold text-g-ink-2 ${big ? "text-[15px]" : "text-[14px]"}`}>{s.title}</p>
        <p className={`live mt-1 leading-none font-bold tracking-[-0.03em] whitespace-nowrap tabular-nums ${big ? "text-[34px]" : s.value.length > 5 ? "text-[18px]" : s.value.length > 3 ? "text-[23px]" : "text-[28px]"}`}>{s.value}</p>
      </ArtScene>
      <ChevronRight size={18} className="absolute right-4 bottom-4 text-g-faint" />
    </button>
  );
}

/** How long a table has been seated, against the demo clock (12:45). */
function seatedFor(since: string | undefined, tr: (en: string, v?: TrVars) => string) {
  if (!since) return "—";
  const [h, m] = since.split(":").map(Number);
  const d = Math.max(0, 12 * 60 + 45 - ((h ?? 0) * 60 + (m ?? 0)));
  return d >= 60 ? tr("{h} h {m} min", { h: Math.floor(d / 60), m: d % 60 }) : tr("{n} min", { n: d });
}


/** One dish on the table's ticket. Hold it for its menu; tap the status to move it on, or to see why it was cancelled. */
function OrderLineRow({ line: l, name, money, onHold, onStatus }: { line: TicketLine; name: string; money: (n: number) => string; onHold: () => void; onStatus: () => void }) {
  const tr = useTr();
  const press = useLongPress(onHold);
  const off = Boolean(l.cancelled);
  return (
    <div className="flex items-center gap-3 py-3">
      <div {...press} style={{ WebkitTouchCallout: "none" }} className={`flex min-w-0 flex-1 items-center gap-3 select-none ${off ? "opacity-55" : ""}`}>
        <span className="w-7 shrink-0 text-[15px] font-semibold text-g-muted tabular-nums">{l.qty}×</span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[15px] font-medium ${off ? "line-through decoration-g-faint" : ""}`}>{name}</span>
          <span className="flex items-center gap-1.5 text-[13px] text-g-muted tabular-nums">
            <span className={off ? "line-through" : ""}>{money(l.price * l.qty)}</span>
            {/* When it was added: every dish on the ticket is tracked. */}
            {l.at && (
              <span className="inline-flex items-center gap-0.5 text-[12px] text-g-faint">
                <Clock size={11} strokeWidth={2.4} /> {l.at}
              </span>
            )}
          </span>
        </span>
      </div>
      <button
        onClick={() => {
          haptic("light");
          onStatus();
        }}
        className={`press h-8 shrink-0 rounded-full px-3 text-[12px] font-semibold ${off ? "chip-red" : LINE[l.state].chip}`}
      >
        {off ? tr("Cancelled") : tr(LINE[l.state].label)}
      </button>
    </div>
  );
}

/** The dish's own header card, shared by its menu, the cancel sheet and the cancel info. */
function DishHead({ line, name, money }: { line: TicketLine; name: string; money: (n: number) => string }) {
  const tr = useTr();
  return (
    <PeekHeader
      kicker={`${line.qty} × ${money(line.price)}`}
      title={name}
      facts={[
        line.by === "guest" ? { icon: QrCode, text: tr("Guest · QR menu"), tone: "blue" } : { icon: UserRound, text: tr("Added by the waiter") },
        { icon: ReceiptText, text: money(line.price * line.qty) },
        ...(line.at ? [{ icon: Clock, text: tr("added at {t}", { t: line.at }) }] : []),
        ...(line.cancelled ? [] : [{ icon: line.state === "served" ? CheckCheck : line.state === "cooking" ? CookingPot : Hourglass, text: tr(LINE[line.state].label) }]),
      ]}
    />
  );
}

/** iOS-style context menu for a held dish: the dish on top, its actions in a list below. */
function LineMenu({ line, name, money, onClose, onQty, onCancel }: { line: TicketLine; name: string; money: (n: number) => string; onClose: () => void; onQty: (q: number) => void; onCancel: () => void }) {
  const tr = useTr();
  const [qtyMode, setQtyMode] = useState(false);
  const [qty, setQty] = useState(line.qty);
  return (
    <PeekCard label={name} onClose={onClose}>
      <DishHead line={line} name={name} money={money} />
      {qtyMode ? (
        <div className="mt-4">
          <div className="flex items-center justify-between rounded-[18px] bg-g-fill p-3">
            <span className="text-[34px] leading-none font-semibold tracking-[-0.04em] tabular-nums">{qty}</span>
            <Counter value={qty} min={1} max={20} onChange={setQty} />
          </div>
          <button disabled={qty === line.qty} onClick={() => onQty(qty)} className="blue-grad press mt-3 h-12 w-full rounded-full text-[15px] font-semibold tabular-nums disabled:opacity-40">
            {tr("Save")} · {money(line.price * qty)}
          </button>
        </div>
      ) : (
        <PeekActions
          items={
            line.cancelled
              ? []
              : [
                  { icon: Plus, label: tr("Change quantity"), onClick: () => setQtyMode(true) },
                  { icon: Ban, label: tr("Cancel dish"), onClick: onCancel, tone: "danger" },
                ]
          }
        />
      )}
    </PeekCard>
  );
}

const CANCEL_REASONS: { id: string; icon: LucideIcon }[] = [
  { id: "Guest changed their mind", icon: UserRound },
  { id: "Wrong order", icon: RotateCcw },
  { id: "Problem in the kitchen", icon: ChefHat },
  { id: "Took too long", icon: Clock },
];

/** Cancel a dish: pick a reason or write one. The dish stays on the check, crossed out and not charged. */
function CancelSheet({ line, name, money, onClose, onConfirm }: { line: TicketLine; name: string; money: (n: number) => string; onClose: () => void; onConfirm: (reason: string) => void }) {
  const tr = useTr();
  const [pick, setPick] = useState<string | null>(null);
  const [own, setOwn] = useState("");
  const reason = pick === "other" ? own.trim() : pick ? tr(pick) : "";
  return (
    <PeekCard label={tr("Cancel dish")} onClose={onClose}>
      <DishHead line={line} name={name} money={money} />
      <p className="mt-4 text-[17px] font-bold">{tr("Why cancel it?")}</p>
      <p className="mt-0.5 text-[13px] leading-snug text-g-muted">{tr("It stays on the check crossed out and is not charged. The manager sees the reason.")}</p>
      <div className="mt-3 divide-y divide-g-line overflow-hidden rounded-[18px] bg-g-fill">
        {[...CANCEL_REASONS, { id: "other", icon: PenLine }].map((r) => (
          <button
            key={r.id}
            onClick={() => {
              haptic("tick");
              setPick(r.id);
            }}
            aria-pressed={pick === r.id}
            className="press flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] font-medium"
          >
            <r.icon size={17} strokeWidth={2.2} className="shrink-0 text-g-muted" />
            <span className="flex-1">{r.id === "other" ? tr("Other reason") : tr(r.id)}</span>
            <span className={`grid size-5 shrink-0 place-items-center rounded-full border-2 ${pick === r.id ? "border-g-blue bg-g-blue" : "border-g-fill-2"}`}>
              {pick === r.id && <span className="size-2 rounded-full bg-[#fff]" />}
            </span>
          </button>
        ))}
      </div>
      {pick === "other" && (
        <textarea
          autoFocus
          value={own}
          onChange={(e) => setOwn(e.target.value)}
          rows={2}
          placeholder={tr("Write the reason")}
          className="mt-2 w-full resize-none rounded-[16px] bg-g-fill px-4 py-3 text-[15px] outline-none placeholder:text-g-faint focus:ring-2 focus:ring-g-blue/30"
        />
      )}
      <div className="mt-4 flex gap-2">
        <button onClick={onClose} className="press h-12 flex-1 rounded-full bg-g-fill text-[15px] font-semibold">
          {tr("Keep")}
        </button>
        <button
          disabled={!reason}
          onClick={() => {
            haptic("success");
            onConfirm(reason);
          }}
          className="press h-12 flex-[1.4] rounded-full bg-[#e5484d] text-[15px] font-semibold text-white disabled:opacity-40"
        >
          {tr("Cancel dish")}
        </button>
      </div>
    </PeekCard>
  );
}

/** Why a dish was cancelled: who, when, the reason and what was not charged. */
function CancelInfo({ line, name, money, onClose }: { line: TicketLine; name: string; money: (n: number) => string; onClose: () => void }) {
  const tr = useTr();
  const c = line.cancelled!;
  return (
    <PeekCard label={tr("Cancelled")} onClose={onClose}>
      <span className="chip-red inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold">
        <Ban size={13} strokeWidth={2.4} /> {tr("Cancelled")}
      </span>
      <div className="mt-3">
        <DishHead line={line} name={name} money={money} />
      </div>
      <p className="mt-4 rounded-[18px] bg-g-fill px-4 py-3 text-[15px] leading-snug">“{c.reason}”</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[13px]">
        <div className="rounded-[16px] bg-g-fill p-3">
          <p className="text-g-muted">{tr("Cancelled by")}</p>
          <p className="font-semibold">
            {c.by} · {c.at}
          </p>
        </div>
        <div className="rounded-[16px] bg-g-fill p-3">
          <p className="text-g-muted">{tr("Not charged")}</p>
          <p className="font-semibold tabular-nums">−{money(line.price * line.qty)}</p>
        </div>
      </div>
    </PeekCard>
  );
}

