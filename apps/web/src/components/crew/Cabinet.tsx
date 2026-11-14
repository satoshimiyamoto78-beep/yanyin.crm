"use client";

import { BookOpen, ChevronRight, Flame, Heart, MessageCircle, QrCode, Search, ShieldCheck, Sparkles, Star, Trophy, UtensilsCrossed, Wallet, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import type { MenuItem } from "@yanyin/domain";
import type { CrewData } from "@/lib/demo-crew";
import type { ClosedOrder } from "@/lib/demo-floor";
import { haptic } from "@/lib/haptics";
import { Reveal } from "@/components/guest/motion";
import { Sheet } from "@/components/guest/ui";
import { BarsWidget, HeroStat, IconStat, RingWidget } from "@/components/system/Widgets";
import { ArtTile } from "@/components/system/Art";
import { BADGE_ICON, BADGE_TIER } from "./CrewBoard";
import { BadgeEmblem } from "./Emblems";
import { useDish, useLocale, useTr } from "./prefs";

/*
 * The waiter's cabinet: everything about their own work beyond today's floor.
 * Money for the month, shifts and quality, the full order history, growth
 * (level, badges, quests) and guides. Today's open and closed orders stay in
 * the Hall; this is where the long view lives.
 */

export type PastOrder = ClosedOrder & { day: number };

const DAY = 86_400_000;
/** Demo shift length until clock-in arrives with the backend. */
const HOURS = 8;
/** Money on cards: 1.2M ₫, 340k ₫. */
const compact = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2).replace(/\.?0+$/, "")}M ₫` : n >= 1000 ? `${Math.round(n / 1000)}k ₫` : `${n} ₫`);
type Range = "week" | "month" | "all";
const RANGE_DAYS: Record<Range, number> = { week: 6, month: 29, all: 999 };

/** Week / month / all, as one row of pills. */
function RangePills({ value, onChange }: { value: Range; onChange: (r: Range) => void }) {
  const tr = useTr();
  return (
    <div className="mt-4 flex gap-2">
      {(
        [
          ["week", tr("Week")],
          ["month", tr("Month")],
          ["all", tr("All")],
        ] as const
      ).map(([id, label]) => (
        <button
          key={id}
          onClick={() => {
            haptic("tick");
            onChange(id);
          }}
          aria-pressed={value === id}
          className={`press h-9 rounded-full px-4 text-[14px] font-semibold ${value === id ? "bg-g-ink text-white" : "bg-g-fill text-g-ink-2"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Three numbers in one quiet row. */
function Facts({ items }: { items: [string, string][] }) {
  return (
    <div className="mt-4 grid grid-cols-3 rounded-[20px] bg-g-fill px-4 py-3">
      {items.map(([label, value]) => (
        <span key={label} className="min-w-0">
          <span className="block truncate text-[11.5px] text-g-muted">{label}</span>
          <span className="mt-0.5 block truncate text-[16px] font-semibold tabular-nums">{value}</span>
        </span>
      ))}
    </div>
  );
}

/** Tips history: totals for the period, then day by day; open a day to see which bills tipped. */
function TipsHistoryPage({ history, money, onOpen, onClose }: { history: PastOrder[]; money: (n: number) => string; onOpen: (o: ClosedOrder) => void; onClose: () => void }) {
  const tr = useTr();
  const locale = useLocale();
  const [now] = useState(() => Date.now());
  const [range, setRange] = useState<Range>("week");
  const [openDay, setOpenDay] = useState<number | null>(null);
  const list = history.filter((o) => o.day <= RANGE_DAYS[range]);
  const days = [...new Set(list.map((o) => o.day))].sort((a, b) => a - b);
  const byDay = days.map((d) => ({ d, orders: list.filter((o) => o.day === d) })).map((x) => ({ ...x, tips: x.orders.reduce((n, o) => n + o.tip, 0) }));
  const total = byDay.reduce((n, x) => n + x.tips, 0);
  const best = byDay.reduce((m, x) => (x.tips > m.tips ? x : m), byDay[0] ?? { d: 0, orders: [], tips: 0 });
  return (
    <Sheet open onClose={onClose} label={tr("Tips")} title={false}>
      <div className="px-5 pt-1 pb-10">
        <h2 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">{tr("Tips")}</h2>
        <p className="mt-1 text-[14px] text-g-muted">{tr("Your share from the team pool, by day")}</p>
        <RangePills value={range} onChange={setRange} />
        <Facts
          items={[
            [tr("Total"), compact(total)],
            [tr("Per shift"), compact(byDay.length ? Math.round(total / byDay.length / 1000) * 1000 : 0)],
            [tr("Best day"), byDay.length ? dayName(best.d, tr, now, locale) : "—"],
          ]}
        />
        <div className="mt-4 divide-y divide-g-line">
          {byDay.map((x) => {
            const tipped = x.orders.filter((o) => o.tip > 0);
            const on = openDay === x.d;
            return (
              <div key={x.d}>
                <button
                  onClick={() => {
                    haptic("tick");
                    setOpenDay(on ? null : x.d);
                  }}
                  aria-expanded={on}
                  className="press flex w-full items-center gap-3 py-3.5 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold">{dayName(x.d, tr, now, locale)}</span>
                    <span className="block text-[13px] text-g-muted">{tr("{a} of {b} bills with a tip", { a: tipped.length, b: x.orders.length })}</span>
                  </span>
                  <span className={`shrink-0 text-[16px] font-semibold tabular-nums ${x.tips ? "text-g-green" : "text-g-faint"}`}>{x.tips ? `+${compact(x.tips)}` : "0 ₫"}</span>
                  <ChevronRight size={18} className={`shrink-0 text-g-faint transition-transform ${on ? "rotate-90" : ""}`} />
                </button>
                {on && (
                  <div className="mb-3 grid gap-1.5">
                    {tipped.map((o) => (
                      <button key={o.id} onClick={() => onOpen(o)} className="press flex items-center gap-3 rounded-[16px] bg-g-fill px-3.5 py-2.5 text-left">
                        <span className="w-12 shrink-0 text-[13px] text-g-muted tabular-nums">{o.closedAt}</span>
                        <span className="min-w-0 flex-1 truncate text-[14px]">{tr("Table {n}", { n: o.table })} · {money(o.subtotal)}</span>
                        <span className="shrink-0 text-[14px] font-semibold text-g-green tabular-nums">+{compact(o.tip)}</span>
                      </button>
                    ))}
                    {!tipped.length && <p className="px-1 py-2 text-[13px] text-g-muted">{tr("No tips this day")}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}

/** Shifts history: one row per worked day with hours, orders, takings and tips. */
function ShiftsHistoryPage({ history, onClose }: { history: PastOrder[]; onClose: () => void }) {
  const tr = useTr();
  const locale = useLocale();
  const [now] = useState(() => Date.now());
  const [range, setRange] = useState<Range>("week");
  const list = history.filter((o) => o.day <= RANGE_DAYS[range]);
  const days = [...new Set(list.map((o) => o.day))].sort((a, b) => a - b);
  const takings = list.reduce((n, o) => n + o.subtotal, 0);
  return (
    <Sheet open onClose={onClose} label={tr("Shifts")} title={false}>
      <div className="px-5 pt-1 pb-10">
        <h2 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">{tr("Shifts")}</h2>
        <p className="mt-1 text-[14px] text-g-muted">{tr("Days you worked and how they went")}</p>
        <RangePills value={range} onChange={setRange} />
        <Facts
          items={[
            [tr("Shifts"), String(days.length)],
            [tr("Hours"), String(days.length * HOURS)],
            [tr("Takings"), compact(takings)],
          ]}
        />
        <div className="mt-4 divide-y divide-g-line">
          {days.map((d) => {
            const os = list.filter((o) => o.day === d);
            const times = os.map((o) => o.closedAt).sort();
            return (
              <div key={d} className="flex items-center gap-3 py-3.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold">{dayName(d, tr, now, locale)}</span>
                  <span className="block truncate text-[13px] text-g-muted">
                    {tr("{n} h", { n: HOURS })} · {tr("{n} order|{n} orders", { n: os.length })}
                    {times.length ? ` · ${times[0]}–${times[times.length - 1]}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[15px] font-semibold tabular-nums">{compact(os.reduce((n, o) => n + o.subtotal, 0))}</span>
                  <span className="block text-[12.5px] text-g-green tabular-nums">+{compact(os.reduce((n, o) => n + o.tip, 0))}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}
const dayName = (d: number, tr: (s: string) => string, now: number, locale: string) => {
  if (d === 0) return tr("Today");
  if (d === 1) return tr("Yesterday");
  const date = new Date(now - d * DAY);
  return date.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
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
  const locale = useLocale();
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
          {data.staff.name} · {(() => {
            const m = new Date(now).toLocaleDateString(locale, { month: "long", year: "numeric" }).replace(" г.", "");
            return m.charAt(0).toUpperCase() + m.slice(1);
          })()}
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
        <IconStat title={tr("Shifts")} art="shifts" value={`${shifts}`} sub={tr("{n} hour this month|{n} hours this month", { n: shifts * 8 })} />
        <IconStat title={tr("Orders")} art="orders" value={`${orders}`} sub={tr("served this month")} />
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

      {/* History: the waiter's own record, one row per kind, each opens its page. */}
      <section className="mt-10">
        <h2 className="text-[24px] leading-tight font-bold tracking-[-0.025em]">{tr("History")}</h2>
        <div className="mt-3 divide-y divide-g-line rounded-[24px] bg-g-fill px-4">
          {(
            [
              ["history", "orders", tr("Orders"), tr("{n} order|{n} orders", { n: orders }), compact(history.reduce((n, o) => n + o.subtotal + o.tip, 0))],
              ["tips", "tips", tr("Tips"), tr("{n} bill with a tip|{n} bills with a tip", { n: history.filter((o) => o.tip > 0).length }), compact(history.reduce((n, o) => n + o.tip, 0))],
              ["shifts", "shifts", tr("Shifts"), tr("{n} shift|{n} shifts", { n: shifts }), tr("{n} h", { n: shifts * HOURS })],
            ] as const
          ).map(([id, art, title, sub, value]) => (
            <button
              key={id}
              onClick={() => {
                haptic("light");
                setPage(id);
              }}
              className="press flex w-full items-center gap-3 py-3 text-left"
            >
              <ArtTile name={art} size={36} bare />
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold">{title}</span>
                <span className="block truncate text-[13px] text-g-muted">{sub}</span>
              </span>
              <span className="shrink-0 text-[15px] font-semibold tabular-nums">{value}</span>
              <ChevronRight size={18} className="shrink-0 text-g-faint" />
            </button>
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
                {tr("{a} of {b} earned", { a: data.badges.filter((b) => b.earned).length, b: data.badges.length })}
              </span>
            </span>
            <ChevronRight size={18} className="text-g-faint" />
          </button>
          {/* Icon and text on one line: two low cards side by side. */}
          <button onClick={onQuests} className="press flex min-w-0 items-center gap-3 rounded-[22px] bg-g-tint-blue p-3.5 text-left">
            <span className="blue-grad grid size-10 shrink-0 place-items-center rounded-full">
              <Trophy size={19} strokeWidth={2} />
            </span>
            <span className="min-w-0">
              <span className="line-clamp-2 text-[15px] leading-tight font-semibold">{tr("Quests")}</span>
              <span className="block truncate text-[12.5px] text-g-muted">{tr("{n} in progress", { n: data.quests.filter((q) => q.state !== "available").length })}</span>
            </span>
          </button>
          <div className="flex min-w-0 items-center gap-3 rounded-[22px] bg-g-tint-green p-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-g-green text-white">
              <MessageCircle size={19} strokeWidth={2} />
            </span>
            <span className="min-w-0">
              <span className="line-clamp-2 text-[15px] leading-tight font-semibold">{tr("Kind words")}</span>
              <span className="block truncate text-[12.5px] text-g-muted">{tr("12 reviews mention you")}</span>
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
      {page === "tips" && <TipsHistoryPage history={history} money={money} onOpen={onReceipt} onClose={() => setPage(null)} />}
      {page === "shifts" && <ShiftsHistoryPage history={history} onClose={() => setPage(null)} />}
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
  const dish = useDish();
  const names = o.lines.map((l) => `${l.qty}× ${dish(itemById.get(l.itemId)?.name)}`);
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
            {tr("Table {n}", { n: o.table })} · #{o.id}
          </span>
          <span className="shrink-0 text-[15px] font-semibold tabular-nums">{money(total)}</span>
        </span>
        <span className="block truncate text-[13px] text-g-muted">{names.slice(0, 2).join(", ") + (names.length > 2 ? ` +${names.length - 2}` : "")}</span>
        <span className="block text-[12px] text-g-faint tabular-nums">
          {o.closedAt} · {tr("{n} guest|{n} guests", { n: o.guests })}
          {o.tip ? ` · ${tr("tip {sum}", { sum: money(o.tip) })}` : ""}
        </span>
      </span>
    </button>
  );
}

/** Every order the waiter closed: search by table or dish, filter by period, grouped by day. */
function HistoryPage({ history, itemById, money, onOpen, onClose }: { history: PastOrder[]; itemById: Map<string, MenuItem>; money: (n: number) => string; onOpen: (o: ClosedOrder) => void; onClose: () => void }) {
  const tr = useTr();
  const locale = useLocale();
  const [now] = useState(() => Date.now());
  const [q, setQ] = useState("");
  const [range, setRange] = useState<"today" | "yesterday" | "week" | "all">("all");
  const list = useMemo(() => {
    const max = { today: 0, yesterday: 1, week: 6, all: 99 }[range];
    const min = range === "yesterday" ? 1 : 0;
    const needle = q.trim().toLowerCase();
    return history.filter((o) => o.day >= min && o.day <= max && (!needle || String(o.table) === needle || String(o.id).includes(needle) || o.lines.some((l) => Object.values(itemById.get(l.itemId)?.name ?? {}).some((v) => (v ?? "").toLowerCase().includes(needle)))));
  }, [history, q, range, itemById]);
  const days = [...new Set(list.map((o) => o.day))];
  return (
    <Sheet open onClose={onClose} label={tr("Order history")} title={false}>
      <div className="px-5 pt-1 pb-10">
        <h2 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">{tr("Order history")}</h2>
        <p className="mt-1 text-[14px] text-g-muted">
          {tr("{n} order|{n} orders", { n: list.length })} · {money(list.reduce((n, o) => n + o.subtotal + o.tip, 0))}
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
                <span>{dayName(d, tr, now, locale)}</span>
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
