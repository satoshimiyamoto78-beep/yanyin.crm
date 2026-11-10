"use client";

import { Bell, CalendarDays, ChefHat, Megaphone, ReceiptText, Sparkles, Trophy, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { haptic } from "@/lib/haptics";
import { Sheet } from "@/components/guest/ui";

export type InboxKind = "orders" | "kitchen" | "bills" | "bookings" | "team";
export type InboxItem = { id: string; kind: InboxKind; title: string; text?: string; at: number; read: boolean };

const KIND: Record<InboxKind, { label: string; icon: LucideIcon; chip: string }> = {
  orders: { label: "Orders", icon: UtensilsCrossed, chip: "chip-blue" },
  kitchen: { label: "Kitchen", icon: ChefHat, chip: "chip-green" },
  bills: { label: "Bills", icon: ReceiptText, chip: "chip-orange" },
  bookings: { label: "Bookings", icon: CalendarDays, chip: "chip-blue" },
  team: { label: "Team", icon: Trophy, chip: "chip-purple" },
};

/** Which shelf a live notification goes to, from its wording. */
export function kindOf(title: string): InboxKind {
  if (/bill|check|paid|payment|tip/i.test(title)) return "bills";
  if (/seated|booking|arriv/i.test(title)) return "bookings";
  if (/served|kitchen|ready|cooking/i.test(title)) return "kitchen";
  if (/quest|xp|break|shift|badge|level/i.test(title)) return "team";
  return "orders";
}

const MIN = 60_000;
/** A few earlier events so the history is never a blank screen in the demo. */
export function seedInbox(now: number): InboxItem[] {
  return [
    { id: "s1", kind: "kitchen", title: "Plov for table 4 is ready", text: "Pick it up at the pass", at: now - 4 * MIN, read: false },
    { id: "s2", kind: "bills", title: "Table 4 asked for the bill", text: "5 guests · 2,170,000 ₫", at: now - 9 * MIN, read: false },
    { id: "s3", kind: "bookings", title: "Booking at 13:30", text: "Nguyen Van An · 4 guests · table 3", at: now - 35 * MIN, read: false },
    { id: "s4", kind: "team", title: "New quest: Shashlik Sunday", text: "Serve 10 shashlik or kebab · +200 XP", at: now - 80 * MIN, read: true },
    { id: "s5", kind: "orders", title: "Table 2 ordered from the QR menu", text: "2× Lagman, 1× Tarragon lemonade", at: now - 26 * 60 * MIN, read: true },
    { id: "s6", kind: "team", title: "Badge earned: Speed Demon", text: "10 tables served under 12 minutes", at: now - 27 * 60 * MIN, read: true },
  ];
}

const NEWS = [
  { id: "n1", icon: Megaphone, from: "Manager · Aziz", title: "Team meeting on Friday at 10:30", text: "New summer menu tasting before the shift. Lunch is on the house.", when: "Today" },
  { id: "n2", icon: UtensilsCrossed, from: "Menu", title: "Pizza from halves is live", text: "Guests can combine two halves in the QR menu. Suggest it to groups of two.", when: "Yesterday" },
  { id: "n3", icon: Sparkles, from: "yanyin", title: "Dark theme and a new home", text: "Switch the theme from the header, and customize your main screen at the bottom of Home.", when: "Mon" },
];

const timeOf = (at: number, now: number) => {
  const d = Math.round((now - at) / MIN);
  if (d < 1) return "now";
  if (d < 60) return `${d} min`;
  return new Date(at).toTimeString().slice(0, 5);
};
const dayOf = (at: number, now: number) => (new Date(at).toDateString() === new Date(now).toDateString() ? "Today" : "Earlier");

/** Notifications (live history, filterable) and news from the venue and yanyin. */
export function InboxPage({ items, onClose, onReadAll }: { items: InboxItem[]; onClose: () => void; onReadAll: () => void }) {
  const [tab, setTab] = useState<"notifications" | "news">("notifications");
  const [filter, setFilter] = useState<InboxKind | "all">("all");
  // Read once on open: the clock for "5 min ago" labels.
  const [now] = useState(() => Date.now());
  const list = items.filter((i) => filter === "all" || i.kind === filter).sort((a, b) => b.at - a.at);
  const unread = items.filter((i) => !i.read).length;
  const groups = ["Today", "Earlier"].map((g) => [g, list.filter((i) => dayOf(i.at, now) === g)] as const).filter(([, l]) => l.length);
  return (
    <Sheet
      open
      onClose={() => {
        onReadAll();
        onClose();
      }}
      label="Notifications"
      title={false}
    >
      <div className="px-5 pt-1 pb-10">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">Notifications</h2>
          {unread > 0 && (
            <button
              onClick={() => {
                haptic("light");
                onReadAll();
              }}
              className="press pb-1 text-[15px] font-semibold text-g-blue"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="mt-5 flex rounded-full bg-g-fill p-1">
          {(
            [
              ["notifications", `Notifications${unread ? ` · ${unread}` : ""}`],
              ["news", "News"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => {
                haptic("tick");
                setTab(id);
              }}
              aria-pressed={tab === id}
              className={`h-10 flex-1 rounded-full text-[14px] font-semibold transition-colors ${tab === id ? "bg-white text-g-ink" : "text-g-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "notifications" ? (
          <>
            <div className="no-scrollbar -mx-5 mt-4 flex gap-2 overflow-x-auto px-5">
              {(["all", ...Object.keys(KIND)] as (InboxKind | "all")[]).map((k) => (
                <button
                  key={k}
                  onClick={() => {
                    haptic("tick");
                    setFilter(k);
                  }}
                  aria-pressed={filter === k}
                  className={`press h-9 shrink-0 rounded-full px-4 text-[14px] font-semibold ${filter === k ? "bg-g-ink text-white" : "bg-g-fill text-g-ink-2"}`}
                >
                  {k === "all" ? "All" : KIND[k].label}
                </button>
              ))}
            </div>

            {groups.map(([g, l]) => (
              <section key={g} className="mt-6">
                <h3 className="text-[13px] font-semibold tracking-[0.06em] text-g-muted uppercase">{g}</h3>
                <ul className="mt-1 divide-y divide-g-line">
                  {l.map((i) => {
                    const k = KIND[i.kind];
                    return (
                      <li key={i.id} className="flex gap-3.5 py-3.5">
                        <span className={`${k.chip} grid size-10 shrink-0 place-items-center rounded-full`}>
                          <k.icon size={18} strokeWidth={2} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-3">
                            <span className={`truncate text-[15px] ${i.read ? "font-medium" : "font-semibold"}`}>{i.title}</span>
                            <span className="shrink-0 text-[12px] text-g-muted tabular-nums">{timeOf(i.at, now)}</span>
                          </span>
                          {i.text && <span className="mt-0.5 block text-[13px] leading-snug text-g-muted">{i.text}</span>}
                        </span>
                        {!i.read && <span aria-label="New" className="mt-2 size-2 shrink-0 rounded-full bg-g-blue" />}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            {!list.length && (
              <div className="py-20 text-center">
                <span className="mx-auto grid size-16 place-items-center rounded-full bg-g-fill text-g-faint">
                  <Bell size={26} strokeWidth={1.7} />
                </span>
                <p className="mt-4 text-[17px] font-semibold">Nothing here yet</p>
                <p className="mt-1 text-[14px] text-g-muted">{filter === "all" ? "New orders, bills and kitchen calls will show up here." : `No ${KIND[filter].label.toLowerCase()} notifications yet.`}</p>
              </div>
            )}
          </>
        ) : (
          <div className="mt-5 grid gap-3">
            {NEWS.map((n) => (
              <article key={n.id} className="rounded-[24px] bg-g-fill p-4">
                <div className="flex items-center gap-2.5">
                  <span className="blue-grad grid size-8 shrink-0 place-items-center rounded-full">
                    <n.icon size={15} strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-g-ink-2">{n.from}</span>
                  <span className="text-[12px] text-g-muted">{n.when}</span>
                </div>
                <p className="mt-3 text-[17px] leading-snug font-semibold">{n.title}</p>
                <p className="mt-1 text-[14px] leading-snug text-g-muted">{n.text}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
