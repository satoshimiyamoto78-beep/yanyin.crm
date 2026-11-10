"use client";

import { BookOpen, ChevronRight, Clock, Flame, Heart, MessageCircle, QrCode, Receipt as ReceiptIcon, Search, ShieldCheck, Sparkles, Star, Trophy, UtensilsCrossed, Wallet, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import type { MenuItem } from "@yanyin/domain";
import type { CrewData } from "@/lib/demo-crew";
import type { ClosedOrder } from "@/lib/demo-floor";
import { haptic } from "@/lib/haptics";
import { Reveal } from "@/components/guest/motion";
import { Sheet } from "@/components/guest/ui";
import { BarsWidget, HeroStat, IconStat, RingWidget } from "@/components/system/Widgets";
import { BADGE_ICON, BADGE_TIER } from "./CrewBoard";
import { BadgeEmblem } from "./Emblems";
import { useTr } from "./prefs";

/*
 * The waiter's cabinet: everything about their own work beyond today's floor.
 * Money for the month, shifts and quality, the full order history, growth
 * (level, badges, quests) and guides. Today's open and closed orders stay in
 * the Hall; this is where the long view lives.
 */

export type PastOrder = ClosedOrder & { day: number };

const DAY = 86_400_000;
const dayName = (d: number, tr: (s: string) => string, now: number) => {
  if (d === 0) return tr("Today");
  if (d === 1) return tr("Yesterday");
  const date = new Date(now - d * DAY);
  return date.toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short" });
};

/** Demo history for the past three weeks, built from today's real orders (the backend replaces this). */
export function pastOrders(today: ClosedOrder[]): PastOrder[] {
  const out: PastOrder[] = today.map((o) => ({ ...o, day: 0 }));
  let id = Math.min(...today.map((o) => o.id)) - 1;
  for (let d = 1; d <= 21; d++) {
    if (d % 7 === 3) continue; // a day off every week
    const count = 3 + ((d * 7) % 4);
    for (let k = 0; k < count; k++) {
      const base = today[(d + k) % today.length]!;
      const hour = 11 + ((d + k * 3) % 10);
      out.push({ ...base, id: id--, day: d, table: 1 + ((d * 3 + k * 5) % 12), closedAt: `${String(hour).padStart(2, "0")}:${String((d * 13 + k * 17) % 60).padStart(2, "0")}`, tip: Math.round((base.subtotal * (((d + k) % 4) * 4)) / 100 / 1000) * 1000 });
    }
  }
  return out;
}

const GUIDES: { id: string; icon: LucideIcon; title: string; text: string; points: string[] }[] = [
  { id: "steps", icon: UtensilsCrossed, title: "Service in 7 steps", text: "From the greeting to the goodbye.", points: ["Greet within 1 minute, offer water.", "Show the QR menu and the roulette.", "Take the order, read it back.", "Serve hot dishes within 12 minutes.", "Check on the table after 3 minutes.", "Offer dessert or tea.", "Bring the bill, thank by name."] },
  { id: "menu", icon: ShieldCheck, title: "Menu and allergens", text: "What is in every dish, what is halal.", points: ["Halal: every meat dish marked with the moon badge.", "Nuts: baklava, some salads; always ask.", "Gluten: bread, lagman noodles, samsa.", "Spicy: the flame badge; ask about heat."] },
  { id: "upsell", icon: Sparkles, title: "Upsell without pressure", text: "Phrases that work in our hall.", points: ["“Tarragon lemonade goes great with plov.”", "“Shall I bring the bread while you decide?”", "“Our medovik is fresh today.”", "Suggest the roulette to groups who can’t choose."] },
  { id: "pay", icon: QrCode, title: "Payments and VietQR", text: "Cash, cards, QR, MoMo.", points: ["Open the bill, show the VietQR code.", "Card: tap on the terminal, wait for the beep.", "Cash: count change twice, say it out loud.", "Tips go to the team pool automatically."] },
  { id: "hookah", icon: Flame, title: "Hookah and 18+", text: "Safety and age check.", points: ["Ask for ID when a guest looks under 25.", "Change coals every 20–25 minutes.", "No hookah for pregnant guests.", "Keep the hookah away from the walkway."] },
];

export function CabinetView({
  data,
  history,
  itemById,
  money,
  onReceipt,
  onBadges,
  onQuests,
}: {
  data: CrewData;
  history: PastOrder[];
  itemById: Map<string, MenuItem>;
  money: (n: number) => string;
  onReceipt: (o: ClosedOrder) => void;
  onBadges: () => void;
  onQuests: () => void;
}) {
  const tr = useTr();
  const [page, setPage] = useState<"history" | string | null>(null);
  // Read the clock once per visit.
  const [now] = useState(() => Date.now());
  const days = Array.from({ length: 14 }, (_, i) => 13 - i);
  const tipsByDay = days.map((d) => history.filter((o) => o.day === d).reduce((n, o) => n + o.tip, 0));
  // Running tips through this month, built from the same orders by day (thousands of ₫),
  // against last month at the same pace with its own ups and downs (demo reference).
  const monthDays = Array.from({ length: 30 }, (_, i) => String(i + 1));
  const todayIdx = Math.min(29, new Date(now).getDate() - 1);
  const daily = Array.from({ length: todayIdx + 1 }, (_, i) => history.filter((o) => o.day === todayIdx - i).reduce((n, o) => n + o.tip, 0) / 1000);
  const thisMonth = daily.reduce<number[]>((acc, v) => [...acc, (acc[acc.length - 1] ?? 0) + v], []);
  const avg = (thisMonth[thisMonth.length - 1] ?? 0) / Math.max(1, todayIdx + 1);
  const lastMonth = monthDays.reduce<number[]>((acc, _, i) => [...acc, (acc[acc.length - 1] ?? 0) + avg * 0.9 * (0.75 + 0.5 * ((Math.sin(i * 1.7) + 1) / 2))], []);
  const k = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(2)}M ₫` : `${Math.round(v)}k ₫`);
  const orders = history.length;
  const shifts = new Set(history.map((o) => o.day)).size;
  const guide = GUIDES.find((g) => g.id === page);
  return (
    <div className="px-5 pt-[max(20px,env(safe-area-inset-top))]">
      <header>
        <h1 className="text-[30px] leading-tight font-bold tracking-[-0.025em]">{tr("Cabinet")}</h1>
        <p className="mt-0.5 text-[14px] text-g-muted">
          {data.staff.name} · {new Date(now).toLocaleDateString("en", { month: "long", year: "numeric" })}
        </p>
      </header>

      <Reveal className="mt-6 grid grid-cols-2 gap-3">
        <HeroStat
          className="col-span-2"
          title={tr("Tips this month")}
          icon={<Wallet size={13} strokeWidth={2.4} />}
          value={k(thisMonth[thisMonth.length - 1] ?? 0)}
          labels={monthDays}
          today={thisMonth}
          reference={lastMonth}
          referenceName={tr("Last month")}
          format={k}
        />
        <IconStat title={tr("Shifts")} art={<Clock size={120} strokeWidth={1.4} className="text-g-blue opacity-40" />} value={`${shifts}`} sub={`${shifts * 8} ${tr("hours this month")}`} tone="blue" />
        <IconStat title={tr("Orders")} art={<ReceiptIcon size={120} strokeWidth={1.4} className="text-g-orange opacity-40" />} value={`${orders}`} sub={tr("served this month")} tone="orange" />
        <BarsWidget
          className="col-span-2"
          title={tr("Tips by day")}
          icon={<Heart size={13} strokeWidth={2.4} />}
          labels={days.map((d) => String(new Date(now - d * DAY).getDate()))}
          values={tipsByDay.map((t) => Math.round(t / 1000))}
          unit="k ₫"
          initial={13}
        />
        <RingWidget title={tr("Guest rating")} icon={<Star size={13} strokeWidth={2.4} />} value="4.8" unit={tr("from 126 reviews")} part={0.96} tone="green" />
        <RingWidget title={tr("Upsell")} icon={<Sparkles size={13} strokeWidth={2.4} />} value="34%" unit={tr("tables with an add-on")} part={0.34} />
      </Reveal>

      {/* Order history: the latest three, the rest on its own page. */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[24px] leading-tight font-bold tracking-[-0.025em]">{tr("Order history")}</h2>
          <button onClick={() => setPage("history")} className="press flex items-center gap-0.5 text-[15px] font-semibold text-g-blue underline decoration-g-blue/30 decoration-2 underline-offset-4">
            {tr("See all")} <ChevronRight size={16} strokeWidth={2.4} />
          </button>
        </div>
        <div className="mt-2 divide-y divide-g-line">
          {history.slice(0, 3).map((o) => (
            <OrderRow key={o.id} o={o} itemById={itemById} money={money} onOpen={() => onReceipt(o)} />
          ))}
        </div>
      </section>

      {/* Growth: level, badges, quests. */}
      <section className="mt-10">
        <h2 className="text-[24px] leading-tight font-bold tracking-[-0.025em]">{tr("Growth")}</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button onClick={onBadges} className="press col-span-2 flex items-center gap-3 rounded-[26px] bg-g-fill p-4 text-left">
            <span className="flex -space-x-3">
              {data.badges
                .filter((b) => b.earned)
                .map((b) => (
                  <BadgeEmblem key={b.id} tier={BADGE_TIER[b.id] ?? "silver"} icon={BADGE_ICON[b.id] ?? Trophy} earned size={48} />
                ))}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-semibold">{tr("Badges")}</span>
              <span className="block text-[13px] text-g-muted">
                {data.badges.filter((b) => b.earned).length} {tr("of")} {data.badges.length} {tr("earned")}
              </span>
            </span>
            <ChevronRight size={18} className="text-g-faint" />
          </button>
          <button onClick={onQuests} className="press flex flex-col justify-between gap-6 rounded-[26px] bg-g-tint-blue p-4 text-left">
            <Trophy size={22} className="text-g-blue" />
            <span>
              <span className="block text-[16px] font-semibold">{tr("Quests")}</span>
              <span className="block text-[13px] text-g-muted">{data.quests.filter((q) => q.state !== "available").length} {tr("in progress")}</span>
            </span>
          </button>
          <div className="flex flex-col justify-between gap-6 rounded-[26px] bg-g-tint-green p-4">
            <MessageCircle size={22} className="text-g-green" />
            <span>
              <span className="block text-[16px] font-semibold">{tr("Kind words")}</span>
              <span className="block text-[13px] text-g-muted">{tr("12 reviews mention you")}</span>
            </span>
          </div>
        </div>
      </section>

      {/* Guides. */}
      <section className="mt-10 pb-6">
        <h2 className="text-[24px] leading-tight font-bold tracking-[-0.025em]">{tr("Guides")}</h2>
        <div className="mt-2 divide-y divide-g-line">
          {GUIDES.map((g) => (
            <button
              key={g.id}
              onClick={() => {
                haptic("light");
                setPage(g.id);
              }}
              className="press flex w-full items-center gap-3.5 py-3.5 text-left"
            >
              <span className="chip-blue grid size-11 shrink-0 place-items-center rounded-full">
                <g.icon size={20} strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold">{tr(g.title)}</span>
                <span className="block truncate text-[13px] text-g-muted">{tr(g.text)}</span>
              </span>
              <ChevronRight size={18} className="text-g-faint" />
            </button>
          ))}
        </div>
      </section>

      {page === "history" && <HistoryPage history={history} itemById={itemById} money={money} onOpen={onReceipt} onClose={() => setPage(null)} />}
      {guide && (
        <Sheet open onClose={() => setPage(null)} label={tr(guide.title)} title={false}>
          <div className="px-5 pt-1 pb-10">
            <span className="blue-grad grid size-16 place-items-center rounded-full">
              <guide.icon size={28} strokeWidth={1.9} />
            </span>
            <h2 className="mt-4 text-[28px] leading-tight font-bold tracking-[-0.02em]">{tr(guide.title)}</h2>
            <p className="mt-1 text-[15px] text-g-muted">{tr(guide.text)}</p>
            <ol className="mt-6 grid gap-3">
              {guide.points.map((pt, i) => (
                <li key={pt} className="flex gap-3 rounded-[20px] bg-g-fill p-4">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-g-ink text-[13px] font-semibold text-white tabular-nums">{i + 1}</span>
                  <span className="text-[15px] leading-snug">{tr(pt)}</span>
                </li>
              ))}
            </ol>
            <p className="mt-6 flex items-center gap-2 text-[13px] text-g-muted">
              <BookOpen size={15} /> {tr("Your venue can add its own guides.")}
            </p>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function OrderRow({ o, itemById, money, onOpen }: { o: PastOrder; itemById: Map<string, MenuItem>; money: (n: number) => string; onOpen: () => void }) {
  const tr = useTr();
  const names = o.lines.map((l) => `${l.qty}× ${itemById.get(l.itemId)?.name.en ?? ""}`);
  const total = o.subtotal + o.tip;
  return (
    <button
      onClick={() => {
        haptic("light");
        onOpen();
      }}
      className="press flex w-full items-center gap-3.5 py-3.5 text-left"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-g-fill text-[16px] font-semibold tabular-nums">{o.table}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[15px] font-semibold">
            {tr("Table")} {o.table} · #{o.id}
          </span>
          <span className="shrink-0 text-[15px] font-semibold tabular-nums">{money(total)}</span>
        </span>
        <span className="block truncate text-[13px] text-g-muted">{names.slice(0, 2).join(", ") + (names.length > 2 ? ` +${names.length - 2}` : "")}</span>
        <span className="block text-[12px] text-g-faint tabular-nums">
          {o.closedAt} · {o.guests} {tr("guests")}
          {o.tip ? ` · ${tr("tip")} ${money(o.tip)}` : ""}
        </span>
      </span>
    </button>
  );
}

/** Every order the waiter closed: search by table or dish, filter by period, grouped by day. */
function HistoryPage({ history, itemById, money, onOpen, onClose }: { history: PastOrder[]; itemById: Map<string, MenuItem>; money: (n: number) => string; onOpen: (o: ClosedOrder) => void; onClose: () => void }) {
  const tr = useTr();
  const [now] = useState(() => Date.now());
  const [q, setQ] = useState("");
  const [range, setRange] = useState<"today" | "yesterday" | "week" | "all">("all");
  const list = useMemo(() => {
    const max = { today: 0, yesterday: 1, week: 6, all: 99 }[range];
    const min = range === "yesterday" ? 1 : 0;
    const needle = q.trim().toLowerCase();
    return history.filter((o) => o.day >= min && o.day <= max && (!needle || String(o.table) === needle || String(o.id).includes(needle) || o.lines.some((l) => (itemById.get(l.itemId)?.name.en ?? "").toLowerCase().includes(needle))));
  }, [history, q, range, itemById]);
  const days = [...new Set(list.map((o) => o.day))];
  return (
    <Sheet open onClose={onClose} label={tr("Order history")} title={false}>
      <div className="px-5 pt-1 pb-10">
        <h2 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">{tr("Order history")}</h2>
        <p className="mt-1 text-[14px] text-g-muted">
          {list.length} {tr("orders")} · {money(list.reduce((n, o) => n + o.subtotal + o.tip, 0))}
        </p>
        <label className="mt-4 flex h-12 items-center gap-2 rounded-full bg-g-fill px-4 text-g-faint">
          <Search size={18} strokeWidth={2} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr("Table, order number or dish")} className="min-w-0 flex-1 bg-transparent text-[16px] text-g-ink outline-none placeholder:text-g-faint" />
        </label>
        <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
          {(
            [
              ["all", tr("All")],
              ["today", tr("Today")],
              ["yesterday", tr("Yesterday")],
              ["week", tr("This week")],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => {
                haptic("tick");
                setRange(id);
              }}
              aria-pressed={range === id}
              className={`press h-9 shrink-0 rounded-full px-4 text-[14px] font-semibold ${range === id ? "bg-g-ink text-white" : "bg-g-fill text-g-ink-2"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {days.map((d) => {
          const dayList = list.filter((o) => o.day === d);
          return (
            <section key={d} className="mt-6">
              <h3 className="flex items-baseline justify-between text-[13px] font-semibold tracking-[0.06em] text-g-muted uppercase">
                <span>{dayName(d, tr, now)}</span>
                <span className="tracking-normal normal-case tabular-nums">{money(dayList.reduce((n, o) => n + o.subtotal + o.tip, 0))}</span>
              </h3>
              <div className="mt-1 divide-y divide-g-line">
                {dayList.map((o) => (
                  <OrderRow key={o.id} o={o} itemById={itemById} money={money} onOpen={() => onOpen(o)} />
                ))}
              </div>
            </section>
          );
        })}
        {!list.length && <p className="py-16 text-center text-[15px] text-g-muted">{tr("Nothing found")}</p>}
      </div>
    </Sheet>
  );
}
