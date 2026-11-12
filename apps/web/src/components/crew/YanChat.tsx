"use client";

import { Armchair, ArrowUp, CalendarDays, Check, ChevronLeft, ChevronRight, FlaskConical, Languages, ListOrdered, MessageCircle, MessageCircleHeart, Mic, PanelLeft, ReceiptText, ShieldAlert, Sparkles, SquarePen, Trash2, TrendingUp, Search as SearchIcon, type LucideIcon } from "lucide-react";
import { LiveTranslator } from "./LiveTranslator";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { MenuItem } from "@yanyin/domain";
import { ticketTotal, type Booking, type ClosedOrder, type FloorTable } from "@/lib/demo-floor";
import { haptic } from "@/lib/haptics";
import { ScrollLock } from "@/lib/scroll-lock";
import { useLongPress, PeekCard } from "@/components/guest/motion";
import { YanOrb } from "@/components/guest/YanSheet";
import { PeekActions } from "@/components/system/PeekParts";
import { useDish, usePrefs, type TrVars } from "./prefs";

type Tr = (en: string, v?: TrVars) => string;

/** One message. Yan's answers can carry table and dish cards and follow-up actions. */
type Msg = {
  id: string;
  from: "me" | "yan";
  text: string;
  tables?: number[];
  dishes?: string[];
  next?: string[];
};
type Session = { id: string; title: string; at: number; msgs: Msg[] };

const KEY = "yanyin:yan-sessions";
const HOUR = 3_600_000;
let seq = 0;
const uid = () => `m${Date.now().toString(36)}${++seq}`;

type Ctx = { tables: FloorTable[]; bookings: Booking[]; items: MenuItem[]; history: ClosedOrder[]; money: (n: number) => string; name: string; tr: Tr; dish: (n: MenuItem["name"] | undefined) => string };

/**
 * Demo brain. In production Yan is Claude with the shift as context: the
 * waiter's tables, bookings, menu and history (docs/02, yanyin.engine). Here
 * simple intent rules answer from the same live data, in the waiter's language.
 */
function think(q: string, c: Ctx): Omit<Msg, "id" | "from"> {
  const { tr, tables, bookings, items, money, dish } = c;
  const s = q.toLowerCase();
  const num = Number(s.match(/\d+/)?.[0] ?? NaN);
  const find = (re: RegExp) => items.filter((i) => re.test(i.name.en ?? "")).slice(0, 3).map((i) => i.id);

  if (/bill|check|сч[её]т|tính tiền|hóa đơn|pay/.test(s)) {
    const b = tables.filter((x) => x.status === "bill");
    if (!b.length) return { text: tr("No one is waiting for the bill right now. I will tell you as soon as a table asks."), next: [tr("Who is free?"), tr("Shift summary")] };
    const top = b[0]!;
    return {
      text: tr("{n} table is waiting for the bill.|{n} tables are waiting for the bill.", { n: b.length }) + " " + tr("Start with table {t}: {sum}, the guests have been sitting there the longest.", { t: top.no, sum: money(ticketTotal(top.lines)) }),
      tables: b.map((x) => x.no),
      next: [tr("Shift summary"), tr("Who is free?")],
    };
  }
  if (/free|свобод|trống|seat|посад/.test(s)) {
    const f = tables.filter((x) => x.status === "free");
    const queue = bookings.filter((b) => b.status === "waiting");
    return {
      text: tr("{n} table is free right now, {s} seats in all.|{n} tables are free right now, {s} seats in all.", { n: f.length, s: f.reduce((n, x) => n + x.seats, 0) }) + (queue.length ? " " + tr("{n} guests are waiting in the queue: seat them first.", { n: queue.length }) : ""),
      tables: f.map((x) => x.no),
      next: [tr("Who is in the queue?"), tr("Bookings tonight")],
    };
  }
  if (/queue|очеред|hàng chờ|chờ bàn|wait/.test(s)) {
    const qu = bookings.filter((b) => b.status === "waiting");
    return {
      text: qu.length ? tr("In the queue: {list}. As soon as a fitting table frees up, I will tell you who goes first.", { list: qu.map((b) => `${b.name.split(" ")[0]} (${b.guests})`).join(", ") }) : tr("The queue is empty."),
      next: [tr("Who is free?")],
    };
  }
  if (/upsell|offer|suggest|предлож|допрод|посовет|gợi ý|bán thêm/.test(s) || (!Number.isNaN(num) && /table|стол|bàn/.test(s))) {
    const t = tables.find((x) => x.no === num) ?? tables.find((x) => x.status === "ordered");
    if (!t) return { text: tr("Tell me the table number and I will suggest what to offer.") };
    const has = (re: RegExp) => t.lines.some((l) => re.test(items.find((i) => i.id === l.itemId)?.name.en ?? ""));
    const drink = !has(/lemonade|tea|juice|coffee|compote/i);
    const pick = drink ? find(/tarragon|lemonade|tea/i) : find(/medovik|baklava|chak|cake|dessert/i);
    return {
      text: drink
        ? tr("Table {t} has food but nothing to drink yet. Offer tarragon lemonade or a pot of tea: with plov and shashlik they are taken twice as often.", { t: t.no })
        : tr("Table {t} has drinks already. A good moment for dessert: medovik is fresh today and counts toward your quest.", { t: t.no }),
      tables: [t.no],
      dishes: pick,
      next: [tr("What do they have already?"), tr("Shift summary")],
    };
  }
  if (/summary|итог|сводк|смен|tổng|shift/.test(s)) {
    const open = tables.filter((x) => x.status === "seated" || x.status === "ordered" || x.status === "bill");
    const next = bookings.filter((b) => b.day === 0 && b.status === "confirmed").sort((a, b) => a.time.localeCompare(b.time))[0];
    const taken = c.history.reduce((n, o) => n + o.subtotal, 0);
    return {
      text: [
        tr("Here is your shift so far."),
        tr("• Taken: {sum} on {n} closed bills.", { sum: money(taken), n: c.history.length }),
        tr("• Open now: {n} tables, {b} waiting for the bill.", { n: open.length, b: tables.filter((x) => x.status === "bill").length }),
        next ? tr("• Next booking: {name} at {t}, {g} guests.", { name: next.name, t: next.time, g: next.guests }) : tr("• No more bookings today."),
        tr("Tip: tables 4 and 9 are booked for the evening rush, set them before 19:00."),
      ].join("\n"),
      next: [tr("Who waits for the bill?"), tr("What to offer table 7?")],
    };
  }
  if (/book|брон|đặt bàn|tonight|вечер/.test(s)) {
    const list = bookings.filter((b) => b.day === 0 && b.status === "confirmed").sort((a, b) => a.time.localeCompare(b.time));
    return {
      text: list.length ? tr("Bookings today: {list}.", { list: list.map((b) => `${b.time} ${b.name.split(" ")[0]} (${b.guests})`).join(", ") }) : tr("No more bookings today."),
      tables: list.filter((b) => b.table).map((b) => b.table!),
      next: [tr("Who is free?")],
    };
  }
  if (/allerg|аллерг|dị ứng|halal|халял|nut|орех|gluten|глютен|vegan|веган|spicy|остр/.test(s)) {
    // Word stems, so "плове" finds "Плов" and "lagman's" finds "Lagman".
    const words = s.split(/[^\p{L}]+/u).filter((w) => w.length > 3 && !/^(allerg|аллерг|halal|халял|gluten|глютен|trong|есть)/.test(w)).map((w) => w.slice(0, Math.max(4, w.length - 2)));
    const hit = items.find((i) => words.some((w) => Object.values(i.name).some((n) => n?.toLowerCase().includes(w))));
    if (hit)
      return {
        text: tr("{dish}: {desc}.", { dish: dish(hit.name), desc: hit.description?.en ?? tr("no description in the menu") }) + " " + (hit.tags.includes("halal") ? tr("It is halal.") : tr("It is not marked halal.")) + " " + tr("For a strong allergy, double-check with the kitchen."),
        dishes: [hit.id],
      };
    return { text: tr("Halal dishes carry the moon badge. Nuts are in baklava and some salads; gluten in bread, lagman and samsa. Name a dish and I will check it."), next: [tr("Allergens in plov")] };
  }
  if (/complain|жалоб|недовол|phàn nàn/.test(s)) {
    return {
      text: [
        tr("Calmly, in four steps:"),
        tr("1. Listen to the end and do not argue."),
        tr("2. Apologise and name the problem: “I'm sorry the soup came cold.”"),
        tr("3. Offer a fix right away: redo the dish, swap it, or take it off the bill."),
        tr("4. Tell the manager and come back to the table in 5 minutes."),
      ].join("\n"),
      next: [tr("Who waits for the bill?")],
    };
  }
  if (/translat|перевед|скажи гостю|dịch|vietnam|вьетнам|english|англ/.test(s)) {
    return {
      text: tr("Here is how to say it:") + "\n" + "VI · «Món của anh chị sẽ có trong khoảng 10 phút ạ.»\nEN · “Your dishes will be ready in about 10 minutes.”\n" + tr("Want another phrase? Write it in your own words."),
      next: [tr("How to say “the bill is coming”?")],
    };
  }
  return {
    text: tr("I am Yan, your shift assistant. I know your tables, bookings, the menu and the bills. Ask me who waits for the bill, what to offer a table, what is in a dish, or how to say something to a guest."),
    next: [tr("Who waits for the bill?"), tr("What to offer table 7?"), tr("Shift summary")],
  };
}

const load = (): Session[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* demo seeds below */
  }
  return [];
};
const save = (ss: Session[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(ss.slice(0, 30)));
  } catch {
    /* still works for this visit */
  }
};

/**
 * Yan's own page: a chat for the shift, with past chats kept as sessions.
 * The answer streams in word by word after a short "thinking" beat; table and
 * dish cards inside answers open the real thing; follow-ups sit right above
 * the composer, where the thumb is.
 */
export function YanChat({
  tables,
  bookings,
  items,
  history,
  money,
  name,
  initial,
  onOpenTable,
  onClose,
}: {
  tables: FloorTable[];
  bookings: Booking[];
  items: MenuItem[];
  history: ClosedOrder[];
  money: (n: number) => string;
  name: string;
  initial?: string;
  onOpenTable: (no: number) => void;
  onClose: () => void;
}) {
  const { tr } = usePrefs();
  const dish = useDish();
  const ctx: Ctx = { tables, bookings, items, history, money, name, tr, dish };
  const [sessions, setSessions] = useState<Session[]>([]);
  const [cur, setCur] = useState<string | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [beta, setBeta] = useState(false);
  const [live, setLive] = useState(false);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState<{ id: string; shown: number } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const started = useRef(false);

  // Restore past chats once; seed two examples so the history is not empty in the demo.
  useEffect(() => {
    const now = Date.now();
    const seed: Session[] = [
      { id: "s-allergy", title: tr("Allergens in lagman"), at: now - 20 * HOUR, msgs: [{ id: "a1", from: "me", text: tr("Is there gluten in lagman?") }, { id: "a2", from: "yan", text: tr("Yes: the noodles are wheat. Offer plov instead, it is gluten-free.") }] },
      { id: "s-phrase", title: tr("How to say “the bill is coming”"), at: now - 50 * HOUR, msgs: [{ id: "b1", from: "me", text: tr("How to say “the bill is coming”?") }, { id: "b2", from: "yan", text: "VI · «Em mang hóa đơn ra ngay ạ.»\nEN · “I’ll bring the bill right away.”" }] },
    ];
    const saved = load();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read saved chats once on open
    setSessions(saved.length ? saved : seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seeds are built once, in the language of the moment
  }, []);
  useEffect(() => {
    if (sessions.length) save(sessions);
  }, [sessions]);

  const session = sessions.find((x) => x.id === cur) ?? null;
  const msgs = useMemo(() => session?.msgs ?? [], [session]);
  const last = msgs[msgs.length - 1];

  useEffect(() => {
    // Braces: scrollTo returns nothing, but keep effects free of returned values.
    if (msgs.length) scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length, typing?.shown]);

  // Streams the newest answer in, a few characters per frame.
  useEffect(() => {
    if (!typing) return;
    const m = msgs.find((x) => x.id === typing.id);
    if (!m) return;
    if (typing.shown >= m.text.length) {
      const done = setTimeout(() => setTyping(null), 120);
      return () => clearTimeout(done);
    }
    const t = setTimeout(() => setTyping({ id: typing.id, shown: Math.min(m.text.length, typing.shown + 4) }), 16);
    return () => clearTimeout(t);
  }, [typing, msgs]);

  const ask = (q: string) => {
    const query = q.trim();
    if (!query || typing) return;
    haptic("light");
    setText("");
    const mine: Msg = { id: uid(), from: "me", text: query };
    const yan: Msg = { id: uid(), from: "yan", ...think(query, ctx) };
    let id = cur;
    if (!id || !session) {
      id = `s${Date.now().toString(36)}`;
      const title = query.length > 38 ? `${query.slice(0, 36)}…` : query;
      setSessions((ss) => [{ id: id!, title, at: Date.now(), msgs: [mine] }, ...ss]);
      setCur(id);
    } else setSessions((ss) => ss.map((x) => (x.id === id ? { ...x, at: Date.now(), msgs: [...x.msgs, mine] } : x)));
    // A short beat of "thinking", then the answer streams in.
    setTyping({ id: yan.id, shown: -1 });
    setTimeout(() => {
      setSessions((ss) => ss.map((x) => (x.id === id ? { ...x, msgs: [...x.msgs, yan] } : x)));
      setTyping({ id: yan.id, shown: 0 });
      haptic("tick");
    }, 700);
  };

  // A question handed over from search starts its own chat right away.
  useEffect(() => {
    if (!initial || started.current) return;
    started.current = true;
    const t = setTimeout(() => ask(initial), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once for the handed-over question
  }, [initial]);

  const newChat = () => {
    haptic("light");
    setCur(null);
    setDrawer(false);
    setTimeout(() => field.current?.focus(), 50);
  };

  const first = name.split(" ")[0];
  // Hot questions: small pills in two rows that scroll sideways, so ten fit in the room of two.
  const starters: { icon: LucideIcon; text: string; tone: string }[] = [
    { icon: ReceiptText, text: tr("Who waits for the bill?"), tone: "text-g-orange" },
    { icon: TrendingUp, text: tr("What to offer table 7?"), tone: "text-g-green" },
    { icon: Sparkles, text: tr("Shift summary"), tone: "text-g-blue" },
    { icon: Armchair, text: tr("Who is free?"), tone: "text-g-teal" },
    { icon: ListOrdered, text: tr("Who is in the queue?"), tone: "text-g-teal" },
    { icon: CalendarDays, text: tr("Bookings tonight"), tone: "text-g-blue" },
    { icon: ShieldAlert, text: tr("Allergens in plov"), tone: "text-g-red" },
    { icon: MessageCircleHeart, text: tr("How to answer a complaint?"), tone: "text-g-orange" },
  ];

  return createPortal(
    <div className="animate-fade fixed inset-0 z-[80] flex flex-col bg-white text-g-ink" role="dialog" aria-label={tr("Yan")}>
      <ScrollLock />
      {/* Header: back and chats on the left, new chat on the right, the name centred with its beta mark. */}
      <header className="relative mx-auto flex w-full max-w-[480px] items-center gap-2 px-3 pt-[max(12px,env(safe-area-inset-top))] pb-2">
        <button onClick={onClose} aria-label={tr("Back")} className="press grid size-11 shrink-0 place-items-center rounded-full bg-g-fill">
          <ChevronLeft size={22} strokeWidth={2.2} />
        </button>
        <button
          onClick={() => {
            haptic("light");
            setDrawer(true);
          }}
          aria-label={tr("Chats")}
          className="press grid size-11 shrink-0 place-items-center rounded-full bg-g-fill"
        >
          <PanelLeft size={20} strokeWidth={2} />
        </button>
        <div className="pointer-events-none absolute inset-x-[112px] flex flex-col items-center">
          <span className="pointer-events-auto flex items-center gap-1.5 text-[17px] font-semibold">
            {tr("Yan")}
            <button
              onClick={() => {
                haptic("light");
                setBeta(true);
              }}
              className="press rounded-full bg-g-tint-blue px-1.5 py-0.5 text-[10px] font-bold tracking-[0.06em] text-g-blue uppercase"
            >
              {tr("Beta")}
            </button>
          </span>
          <span className="max-w-full truncate text-[12px] text-g-muted">{session ? session.title : tr("shift assistant")}</span>
        </div>
        <button onClick={newChat} aria-label={tr("New chat")} className="press ml-auto grid size-11 shrink-0 place-items-center rounded-full bg-g-fill">
          <SquarePen size={19} strokeWidth={2} />
        </button>
      </header>

      <div ref={scroller} className="no-scrollbar mx-auto w-full max-w-[480px] flex-1 overflow-y-auto overscroll-contain px-4">
        {!session ? (
          // A fresh chat: Yan says hello and offers the questions waiters ask most.
          <div className="flex flex-col pt-6 pb-6">
            <div className="flex flex-col items-center text-center">
              <YanOrb size={64} />
              <h1 className="mt-5 text-[26px] leading-tight font-bold tracking-[-0.02em]">{tr("Hi, {name}!", { name: first ?? "" })}</h1>
              <p className="mt-1.5 max-w-[300px] text-[15px] leading-snug text-g-muted">{tr("I know your tables, bookings and the menu. Ask anything about the shift.")}</p>
            </div>
            {/* Live translation is a tool of its own, so it leads as a card. */}
            <button
              onClick={() => {
                haptic("light");
                setLive(true);
              }}
              className="press mt-7 flex items-center gap-3.5 rounded-[22px] bg-g-tint-blue p-3.5 text-left"
            >
              <span className="blue-grad grid size-11 shrink-0 place-items-center rounded-[14px]">
                <Languages size={21} strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">{tr("Live translator")}</span>
                <span className="block truncate text-[13px] text-g-muted">{tr("Talk to a guest in Vietnamese, English or Russian")}</span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-g-faint" />
            </button>
            <p className="mt-6 mb-2.5 text-[12px] font-semibold tracking-[0.06em] text-g-muted uppercase">{tr("Quick questions")}</p>
            <div className="no-scrollbar -mx-4 grid grid-flow-col grid-rows-2 justify-start gap-2 overflow-x-auto px-4 [grid-auto-columns:max-content]">
              {starters.map((x) => (
                <button key={x.text} onClick={() => ask(x.text)} className="press flex h-10 items-center gap-2 rounded-full bg-g-fill pr-4 pl-3 text-[14px] font-medium whitespace-nowrap">
                  <x.icon size={16} strokeWidth={2.2} className={x.tone} />
                  {x.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[minmax(0,1fr)] gap-5 pt-3 pb-4">
            {msgs.map((m) =>
              m.from === "me" ? (
                <p key={m.id} className="blue-grad ml-auto max-w-[82%] rounded-[22px] rounded-br-[8px] px-4 py-2.5 text-[16px] leading-snug whitespace-pre-line">
                  {m.text}
                </p>
              ) : (
                <YanMessage key={m.id} m={m} shown={typing?.id === m.id ? typing.shown : undefined} ctx={ctx} onOpenTable={onOpenTable} />
              ),
            )}
            {typing && typing.shown < 0 && (
              <div className="flex items-center gap-2.5">
                <span className="animate-pulse">
                  <YanOrb size={26} />
                </span>
                <span className="text-[15px] text-g-muted">{tr("Yan is thinking…")}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Follow-ups above the composer, then the composer itself. */}
      <div className="mx-auto w-full max-w-[480px] px-3 pt-1 pb-[max(10px,env(safe-area-inset-bottom))]">
        {last?.from === "yan" && !typing && last.next?.length ? (
          <div className="no-scrollbar -mx-3 mb-2 flex gap-2 overflow-x-auto px-3">
            {last.next.map((n) => (
              <button key={n} onClick={() => ask(n)} className="press h-9 shrink-0 rounded-full border border-g-line bg-white px-3.5 text-[14px] font-medium whitespace-nowrap">
                {n}
              </button>
            ))}
          </div>
        ) : null}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(text);
          }}
          className="flex items-end gap-2 rounded-[26px] bg-g-fill p-1.5 pl-4"
        >
          <textarea
            ref={field}
            value={text}
            rows={1}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(120, e.target.scrollHeight)}px`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask(text);
              }
            }}
            placeholder={tr("Ask Yan")}
            aria-label={tr("Ask Yan")}
            className="max-h-[120px] min-h-[40px] flex-1 resize-none bg-transparent py-2.5 text-[16px] leading-snug outline-none placeholder:text-g-faint"
          />
          {text.trim() ? (
            <button type="submit" aria-label={tr("Send")} disabled={!!typing} className="blue-grad press grid size-10 shrink-0 place-items-center rounded-full disabled:opacity-40">
              <ArrowUp size={20} strokeWidth={2.4} />
            </button>
          ) : (
            <button type="button" aria-label={tr("Voice")} onClick={() => haptic("light")} className="press grid size-10 shrink-0 place-items-center rounded-full text-g-muted">
              <Mic size={20} strokeWidth={2} />
            </button>
          )}
        </form>
      </div>

      {beta && (
        <PeekCard z={100} label={tr("Beta")} onClose={() => setBeta(false)}>
          <span className="blue-grad grid size-12 place-items-center rounded-[16px]">
            <FlaskConical size={22} strokeWidth={2} />
          </span>
          <p className="mt-4 text-[20px] leading-tight font-bold">{tr("Yan is in beta")}</p>
          <p className="mt-2 text-[14px] leading-relaxed text-g-ink-2">{tr("We are still teaching Yan. Use him freely on shift: ask about tables, bills, bookings, the menu, or how to say something to a guest.")}</p>
          <ul className="mt-3 grid gap-2 text-[13px] leading-snug text-g-muted">
            <li className="flex gap-2"><Check size={15} strokeWidth={2.4} className="mt-0.5 shrink-0 text-g-green" /> {tr("He answers from your live shift: tables, bookings, menu.")}</li>
            <li className="flex gap-2"><Check size={15} strokeWidth={2.4} className="mt-0.5 shrink-0 text-g-green" /> {tr("Chats stay on this phone.")}</li>
            <li className="flex gap-2"><ShieldAlert size={15} strokeWidth={2.2} className="mt-0.5 shrink-0 text-g-orange" /> {tr("He can be wrong. For allergies and payments, double-check.")}</li>
          </ul>
          <button onClick={() => setBeta(false)} className="blue-grad press mt-5 h-12 w-full rounded-full text-[15px] font-semibold">
            {tr("Got it")}
          </button>
        </PeekCard>
      )}
      {live && <LiveTranslator onClose={() => setLive(false)} />}
      {drawer && (
        <Drawer
          sessions={sessions}
          cur={cur}
          onPick={(id) => {
            haptic("tick");
            setCur(id);
            setDrawer(false);
          }}
          onNew={newChat}
          onDelete={(id) => {
            setSessions((ss) => ss.filter((x) => x.id !== id));
            if (cur === id) setCur(null);
          }}
          onClose={() => setDrawer(false)}
        />
      )}
    </div>,
    document.body,
  );
}

/** Yan's answer: no bubble, just text by the orb, then cards that open the real table or dish. */
function YanMessage({ m, shown, ctx, onOpenTable }: { m: Msg; shown?: number; ctx: Ctx; onOpenTable: (no: number) => void }) {
  const { tr, tables, items, money, dish } = ctx;
  const streaming = shown !== undefined && shown < m.text.length;
  const text = shown === undefined ? m.text : m.text.slice(0, Math.max(0, shown));
  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 shrink-0">
        <YanOrb size={26} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[16px] leading-relaxed whitespace-pre-line">
          {text}
          {streaming && <span className="ml-0.5 inline-block h-4 w-[3px] translate-y-0.5 animate-pulse rounded-full bg-g-blue" />}
        </p>
        {!streaming && (m.tables?.length || m.dishes?.length) ? (
          <div className="animate-rise no-scrollbar -mr-4 mt-3 flex gap-2 overflow-x-auto pr-4">
            {m.tables?.map((no) => {
              const x = tables.find((t) => t.no === no);
              if (!x) return null;
              const total = ticketTotal(x.lines);
              return (
                <button key={`t${no}`} onClick={() => onOpenTable(no)} className="press flex w-[150px] shrink-0 flex-col rounded-[20px] bg-g-fill p-3 text-left">
                  <span className="flex items-center justify-between">
                    <span className="text-[22px] leading-none font-semibold tabular-nums">{no}</span>
                    <ChevronRight size={16} className="text-g-faint" />
                  </span>
                  <span className="mt-2 text-[13px] font-semibold">{x.status === "bill" ? tr("Wants the bill") : x.status === "free" ? tr("Free") : x.status === "reserved" ? tr("Reserved") : tr("{n} guest|{n} guests", { n: x.guests })}</span>
                  <span className="text-[12px] text-g-muted tabular-nums">{total ? money(total) : tr("{n} seat|{n} seats", { n: x.seats })}</span>
                </button>
              );
            })}
            {m.dishes?.map((id) => {
              const i = items.find((x) => x.id === id);
              if (!i) return null;
              return (
                <div key={`d${id}`} className="flex w-[170px] shrink-0 flex-col rounded-[20px] bg-g-tint-blue p-3">
                  <span className="line-clamp-2 text-[14px] leading-snug font-semibold">{dish(i.name)}</span>
                  <span className="mt-auto pt-2 text-[13px] text-g-blue tabular-nums">{money(i.price)}</span>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Past chats, newest first, grouped by day; search by title; hold one to delete. */
function Drawer({ sessions, cur, onPick, onNew, onDelete, onClose }: { sessions: Session[]; cur: string | null; onPick: (id: string) => void; onNew: () => void; onDelete: (id: string) => void; onClose: () => void }) {
  const { tr } = usePrefs();
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState<Session | null>(null);
  const [now] = useState(() => Date.now());
  const list = sessions.filter((s) => !q || s.title.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.at - a.at);
  const day = (at: number) => {
    const d = Math.floor((new Date(now).setHours(24, 0, 0, 0) - at) / (24 * HOUR));
    return d <= 0 ? tr("Today") : d === 1 ? tr("Yesterday") : tr("Earlier");
  };
  const groups = list.reduce<[string, Session[]][]>((acc, s) => {
    const g = day(s.at);
    const last = acc[acc.length - 1];
    if (last && last[0] === g) last[1].push(s);
    else acc.push([g, [s]]);
    return acc;
  }, []);
  return (
    <div className="fixed inset-0 z-[90]" role="dialog" aria-label={tr("Chats")}>
      <button aria-label={tr("Close")} onClick={onClose} className="animate-fade absolute inset-0 bg-[rgba(11,11,15,0.3)] backdrop-blur-sm" />
      <aside className="animate-drawer absolute inset-y-0 left-0 flex w-[86%] max-w-[360px] flex-col rounded-r-[28px] bg-white pt-[max(14px,env(safe-area-inset-top))] pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="px-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[26px] font-bold tracking-[-0.02em]">{tr("Chats")}</h2>
            <button onClick={onNew} className="press flex items-center gap-1.5 py-2 text-[15px] font-semibold text-[#4d7dff]">
              <SquarePen size={16} strokeWidth={2.2} /> {tr("New chat")}
            </button>
          </div>
          <label className="mt-3 flex h-11 items-center gap-2 rounded-full bg-g-fill px-3.5">
            <SearchIcon size={17} className="text-g-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Find a chat")} className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-g-faint" />
          </label>
        </div>
        <div className="no-scrollbar mt-4 flex-1 overflow-y-auto px-2">
          {groups.map(([g, ss]) => (
            <section key={g} className="mb-4">
              <h3 className="px-2 text-[12px] font-semibold tracking-[0.06em] text-g-muted uppercase">{g}</h3>
              {ss.map((s) => (
                <ChatRow key={s.id} s={s} on={s.id === cur} onPick={() => onPick(s.id)} onHold={() => setMenu(s)} />
              ))}
            </section>
          ))}
          {!list.length && <p className="py-10 text-center text-[14px] text-g-muted">{tr("No chats yet")}</p>}
          <p className="px-2 pt-2 text-[12px] leading-snug text-g-faint">{tr("Chats stay on this phone. Hold one to delete it.")}</p>
        </div>
      </aside>
      {menu && (
        <PeekCard z={100} label={menu.title} onClose={() => setMenu(null)}>
          <p className="text-[18px] leading-snug font-bold">{menu.title}</p>
          <p className="mt-1 text-[13px] text-g-muted">{tr("{n} message|{n} messages", { n: menu.msgs.length })}</p>
          <PeekActions
            items={[
              {
                icon: Trash2,
                label: tr("Delete chat"),
                tone: "danger",
                onClick: () => {
                  haptic("success");
                  onDelete(menu.id);
                  setMenu(null);
                },
              },
            ]}
          />
        </PeekCard>
      )}
    </div>
  );
}

function ChatRow({ s, on, onPick, onHold }: { s: Session; on: boolean; onPick: () => void; onHold: () => void }) {
  const press = useLongPress(onHold, onPick);
  const lastYan = [...s.msgs].reverse().find((m) => m.from === "yan");
  const d = new Date(s.at);
  const today = d.toDateString() === new Date().toDateString();
  const when = today ? d.toTimeString().slice(0, 5) : `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
  return (
    <button {...press} style={{ WebkitTouchCallout: "none" }} className={`press flex w-full items-start gap-3 rounded-[16px] px-2.5 py-2.5 text-left select-none ${on ? "bg-g-tint-blue" : ""}`}>
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-g-fill text-g-blue">
        <MessageCircle size={15} strokeWidth={2.2} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[15px] font-semibold">{s.title}</span>
          <span className="shrink-0 text-[12px] text-g-faint tabular-nums">{when}</span>
        </span>
        {lastYan && <span className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-g-muted">{lastYan.text.replace(/\n/g, " ")}</span>}
      </span>
    </button>
  );
}
