"use client";

import { UserRound, Armchair, Ban, CalendarCheck, CalendarDays, CalendarPlus, Check, Hourglass, Pencil, Phone, StickyNote, Users } from "lucide-react";
import { useState } from "react";
import type { Booking, FloorTable } from "@/lib/demo-floor";
import { haptic } from "@/lib/haptics";
import { loadIfChanged, PeekCard, Reveal, useLongPress } from "@/components/guest/motion";
import { ChoiceChip, Sheet } from "@/components/guest/ui";
import { Counter } from "./CrewApp";
import { useTr } from "./prefs";
import { ActionListWidget, IconStat, WidgetCard } from "@/components/system/Widgets";
import { TimeWheel } from "@/components/system/WheelPicker";
import { GuestsArt, SeatedArt } from "./Illustrations";

const DAY_NAMES = ["Today", "Tomorrow"];
const dayLabel = (d: number) => {
  if (d < 2) return DAY_NAMES[d]!;
  const date = new Date(Date.now() + d * 86_400_000);
  return `${date.toLocaleDateString("en", { weekday: "short" })} ${date.getDate()}`;
};
/** Times guests ask for most, as quick picks under the wheel. */
const POPULAR = ["12:00", "12:30", "13:00", "18:30", "19:00", "19:30", "20:00"];

const STATE: Record<Booking["status"], { label: string; chip: string }> = {
  confirmed: { label: "Confirmed", chip: "chip-blue" },
  waiting: { label: "Waiting list", chip: "chip-orange" },
  seated: { label: "Seated", chip: "chip-green" },
};

const mins = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
/** "in 45 min", "in 2 h", "now", "15 min late" — relative to the demo clock (12:45). */
const NOW = mins("12:45");
const relative = (time: string) => {
  const d = mins(time) - NOW;
  if (d < -5) return `${-d} min late`;
  if (d <= 5) return "now";
  return d < 60 ? `in ${d} min` : `in ${Math.floor(d / 60)}h${d % 60 ? ` ${d % 60}m` : ""}`;
};

export function BookingsView({
  bookings,
  tables,
  onNew,
  onSeat,
  onEdit,
  onUpdate,
  onCancel,
}: {
  bookings: Booking[];
  tables: FloorTable[];
  onNew: () => void;
  onSeat: (b: Booking) => void;
  onEdit: (b: Booking) => void;
  onUpdate: (b: Booking) => void;
  onCancel: (b: Booking) => void;
}) {
  const [day, setDay] = useState(0);
  const [menu, setMenu] = useState<string | null>(null);
  const list = bookings.filter((b) => b.day === day).sort((a, b) => a.time.localeCompare(b.time));
  const guests = list.reduce((s, b) => s + b.guests, 0);
  const upcoming = list.filter((b) => b.status !== "seated");
  const next = day === 0 ? upcoming.find((b) => mins(b.time) >= NOW - 5) : upcoming[0];
  const tr = useTr();
  return (
    <div className="px-5">
      {/* When guests arrive (bars), how many are already seated (ring), who waits for a table (meter). */}
      <Reveal className="mt-5 grid grid-cols-2 gap-2.5">
        <DayTimeline className="col-span-2" list={list} today={day === 0} initial={next?.id} />
        <IconStat
          title={tr("Seated")}
          art={<SeatedArt size={130} />}
          value={`${list.filter((b) => b.status === "seated").length} / ${list.length}`}
          sub={tr("bookings arrived")}
          tone="green"
        />
        <IconStat title={tr("Guests")} art={<GuestsArt size={130} />} value={String(guests)} sub={tr("expected today")} tone="blue" />
        <ActionListWidget
          className="col-span-2"
          title={tr("Waiting list")}
          icon={<Hourglass size={13} strokeWidth={2.4} />}
          rows={list
            .filter((b) => b.status === "waiting")
            .map((b) => {
              // The smallest free table that fits the party.
              const fit = tables.filter((x) => x.status === "free" && x.seats >= b.guests).sort((p, q) => p.seats - q.seats)[0];
              return {
                id: b.id,
                badge: String(b.guests),
                badgeLabel: tr("guests"),
                title: b.name,
                sub: fit ? `${b.time} · ${tr("Table")} ${fit.no} ${tr("is free")} · ${fit.seats} ${tr("seats")}` : `${b.time} · ${tr("no free table yet")}`,
                action: day === 0 && fit ? { label: `${tr("Seat at")} ${fit.no}`, onClick: () => onSeat({ ...b, table: fit.no }) } : undefined,
              };
            })}
          empty={tr("No one is waiting for a table")}
        />
      </Reveal>
      <div className="no-scrollbar -mx-5 mt-5 flex gap-2 overflow-x-auto px-5">
        {[0, 1, 2, 3, 4, 5, 6].map((d) => (
          <ChoiceChip key={d} on={day === d} onClick={() => { setDay(d); loadIfChanged(`bookings:${d}`, JSON.stringify(bookings.filter((b) => b.day === d).map((b) => [b.id, b.status])), 450); }} icon={<span />}>
            {dayLabel(d)}
          </ChoiceChip>
        ))}
      </div>

      <Reveal className="mt-3 grid gap-2.5 pb-24">
        {list.map((b) => (
          <BookingCard key={b.id} b={b} today={day === 0} onSeat={() => onSeat(b)} onHold={() => setMenu(b.id)} />
        ))}
        {!list.length && <p className="py-12 text-center text-[15px] text-g-muted">{tr("No bookings for this day")}</p>}
      </Reveal>
      {(() => {
        const m = list.find((b) => b.id === menu);
        return m ? <BookingMenu b={m} today={day === 0} onClose={() => setMenu(null)} onSeat={() => { setMenu(null); onSeat(m); }} onEdit={() => { setMenu(null); onEdit(m); }} onUpdate={(nb) => { setMenu(null); onUpdate(nb); }} onCancel={() => { setMenu(null); onCancel(m); }} /> : null;
      })()}

      {/* Primary action sits where the thumb is: above the tab bar. */}
      <button
        onClick={() => {
          haptic("light");
          onNew();
        }}
        className="blue-grad press fixed bottom-[calc(max(8px,env(safe-area-inset-bottom))+76px)] left-1/2 z-30 flex h-12 -translate-x-1/2 items-center gap-2 rounded-full px-6 text-[15px] font-semibold"
      >
        <CalendarPlus size={18} strokeWidth={2} /> New booking
      </button>
    </div>
  );
}

export function NewBookingPage({ tables, initial, onClose, onSave }: { tables: FloorTable[]; initial?: Booking; onClose: () => void; onSave: (b: Booking) => void }) {
  const tr = useTr();
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [guests, setGuests] = useState(initial?.guests ?? 2);
  const [day, setDay] = useState(initial?.day ?? 0);
  const [time, setTime] = useState(initial?.time ?? "19:00");
  const [table, setTable] = useState<number | undefined>(initial?.table);
  const [note, setNote] = useState(initial?.note ?? "");
  const fits = tables.filter((x) => x.seats >= guests && (day > 0 || x.status === "free")).sort((a, b) => a.seats - b.seats);
  const ok = name.trim().length > 1 && phone.trim().length > 5;
  const field = "h-12 w-full rounded-[16px] bg-white px-4 text-[16px] outline-none placeholder:text-g-faint focus:ring-2 focus:ring-g-blue/30";
  const card = "mt-3 rounded-[24px] bg-g-fill p-4";
  const label = "flex items-center gap-2 text-[13px] font-semibold text-g-ink-2";
  return (
    <Sheet
      open
      onClose={onClose}
      label={initial ? tr("Edit booking") : tr("New booking")}
      title={false}
      footer={
        <button
          disabled={!ok}
          onClick={() => {
            haptic("success");
            onSave({ id: initial?.id ?? `b${Date.now()}`, name: name.trim(), phone: phone.trim(), guests, day, time, table, note: note.trim() || undefined, status: initial?.status ?? (table || fits.length ? "confirmed" : "waiting") });
          }}
          className="blue-grad press flex h-14 w-full items-center justify-between rounded-full px-6 text-[16px] font-semibold disabled:opacity-40"
        >
          <span>{initial ? tr("Save changes") : tr("Save booking")}</span>
          <span className="tabular-nums">
            {dayLabel(day)} · {time} · {guests}
          </span>
        </button>
      }
    >
      <div className="px-5 pt-1 pb-8">
        <h2 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">{initial ? tr("Edit booking") : tr("New booking")}</h2>

        {/* Who. */}
        <section className={card}>
          <p className={label}>
            <UserRound size={15} strokeWidth={2.2} className="text-g-blue" /> {tr("Guest")}
          </p>
          <div className="mt-3 grid gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr("Name")} aria-label={tr("Name")} className={field} />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={tr("Phone or Zalo")} inputMode="tel" aria-label={tr("Phone or Zalo")} className={field} />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-[15px] font-semibold">
              <Users size={17} strokeWidth={2.2} className="text-g-muted" /> {guests} {tr("guests")}
            </span>
            <Counter value={guests} min={1} max={20} onChange={setGuests} />
          </div>
        </section>

        {/* When: day chips, then the time on wheels with quick picks under them. */}
        <section className={card}>
          <p className={label}>
            <CalendarDays size={15} strokeWidth={2.2} className="text-g-blue" /> {tr("Date and time")}
          </p>
          <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
              <button
                key={d}
                onClick={() => {
                  haptic("tick");
                  setDay(d);
                }}
                aria-pressed={day === d}
                className={`press h-10 shrink-0 rounded-full px-4 text-[14px] font-semibold whitespace-nowrap ${day === d ? "bg-g-ink text-white" : "bg-white"}`}
              >
                {dayLabel(d)}
              </button>
            ))}
          </div>
          <div className="mt-3">
            <TimeWheel value={time} onChange={setTime} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {POPULAR.map((t) => (
              <button
                key={t}
                onClick={() => {
                  haptic("tick");
                  setTime(t);
                }}
                aria-pressed={time === t}
                className={`press h-8 rounded-full px-3 text-[13px] font-semibold tabular-nums ${time === t ? "bg-g-blue text-white" : "bg-white text-g-ink-2"}`}
              >
                {t}
              </button>
            ))}
          </div>
        </section>

        {/* Where. */}
        <section className={card}>
          <p className={`${label} justify-between`}>
            <span className="flex items-center gap-2">
              <Armchair size={15} strokeWidth={2.2} className="text-g-blue" /> {tr("Table")}
            </span>
            <span className="font-medium text-g-muted">{tr("Optional")}</span>
          </p>
          {fits.length ? (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {fits.map((x) => (
                <button
                  key={x.no}
                  onClick={() => {
                    haptic("tick");
                    setTable((v) => (v === x.no ? undefined : x.no));
                  }}
                  aria-pressed={table === x.no}
                  className={`press flex h-14 flex-col items-center justify-center rounded-[16px] ${table === x.no ? "blue-grad" : "bg-white"}`}
                >
                  <span className="text-[17px] leading-none font-semibold tabular-nums">{x.no}</span>
                  <span className={`mt-1 text-[10px] ${table === x.no ? "text-white/75" : "text-g-muted"}`}>
                    {x.seats} {tr("seats")}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-3 flex items-center gap-2 rounded-[16px] bg-g-tint-orange px-3 py-2.5 text-[13px] text-g-ink-2">
              <Hourglass size={15} className="shrink-0 text-g-orange" /> {tr("No free table for this party now: the booking goes to the waiting list.")}
            </p>
          )}
        </section>

        {/* Anything to know. */}
        <section className={card}>
          <p className={`${label} justify-between`}>
            <span className="flex items-center gap-2">
              <StickyNote size={15} strokeWidth={2.2} className="text-g-blue" /> {tr("Note")}
            </span>
            <span className="font-medium text-g-muted">{tr("Optional")}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {["Birthday", "High chair", "Allergies", "Window seat", "Halal only"].map((q) => (
              <button
                key={q}
                onClick={() => {
                  haptic("tick");
                  setNote((n) => (n.includes(tr(q)) ? n : n ? `${n}, ${tr(q)}` : tr(q)));
                }}
                className="press h-8 rounded-full bg-white px-3 text-[13px] font-semibold text-g-ink-2"
              >
                + {tr(q)}
              </button>
            ))}
          </div>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={tr("Anything the team should know")} className={`${field} mt-2 h-auto py-3`} />
        </section>
      </div>
    </Sheet>
  );
}

const OPEN = 11 * 60;
const CLOSE = 23 * 60;

/**
 * The day's bookings as a timeline, like a calendar: each booking is a dot at
 * its time (guests inside), the past is shaded up to the "now" line. The
 * chosen booking (the next one by default) is shown on top; tap a dot to see
 * another. Waiting-list bookings are orange, seated ones green.
 */
function DayTimeline({ list, today, initial, className = "" }: { list: Booking[]; today: boolean; initial?: string; className?: string }) {
  const tr = useTr();
  const [sel, setSel] = useState<string | undefined>(initial ?? list[0]?.id);
  const cur = list.find((b) => b.id === sel) ?? list[0];
  const pos = (m: number) => `${Math.max(0, Math.min(1, (m - OPEN) / (CLOSE - OPEN))) * 100}%`;
  const total = list.reduce((n, b) => n + b.guests, 0);
  return (
    <WidgetCard
      className={className}
      title={tr("Bookings today")}
      icon={<CalendarDays size={13} strokeWidth={2.4} />}
      aside={
        <span className="text-[13px] text-g-muted tabular-nums">
          {list.length} · {total} {tr("guests")}
        </span>
      }
    >
      {cur ? (
        <div key={cur.id} className="animate-tab mt-3 flex items-center gap-3">
          <span className="text-[30px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{cur.time}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[16px] font-semibold">{cur.name}</span>
            <span className="block text-[12px] leading-snug text-g-muted tabular-nums">
              {cur.guests} {tr("guests")} · {cur.table ? `${tr("Table")} ${cur.table}` : tr("No table")}
              {today && cur.status !== "seated" ? ` · ${relative(cur.time)}` : ""}
            </span>
          </span>
        </div>
      ) : (
        <p className="mt-3 text-[15px] text-g-muted">{tr("nothing planned")}</p>
      )}

      {/* The day: 11:00 to 23:00. */}
      <div className="relative mt-5 h-14">
        <span className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white" />
        {today && <span className="absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-full bg-g-fill-2" style={{ width: pos(NOW) }} />}
        {today && (
          <span className="absolute top-0 bottom-0 flex -translate-x-1/2 flex-col items-center" style={{ left: pos(NOW) }}>
            <span className="text-[9px] leading-none font-bold tracking-[0.06em] text-g-blue uppercase">{tr("now")}</span>
            <span className="mt-0.5 w-0.5 flex-1 rounded-full bg-g-blue" />
          </span>
        )}
        {list.map((b) => {
          const on = b.id === cur?.id;
          const tone = b.status === "waiting" ? "bg-g-orange text-white" : b.status === "seated" ? "bg-g-green text-white" : on ? "blue-grad" : "bg-[#fff] text-g-blue ring-2 ring-g-blue/40";
          return (
            <button
              key={b.id}
              onClick={() => {
                haptic("tick");
                setSel(b.id);
              }}
              aria-label={`${b.time} ${b.name}`}
              className={`press absolute top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[12px] font-bold tabular-nums transition-all ${tone} ${on ? "size-9 ring-4 ring-g-blue/20" : "size-7"}`}
              style={{ left: pos(mins(b.time)) }}
            >
              {b.guests}
            </button>
          );
        })}
      </div>
      <div className="relative mt-1 h-4 text-[11px] text-g-muted tabular-nums">
        {[11, 14, 17, 20, 23].map((h) => (
          <span key={h} className="absolute -translate-x-1/2" style={{ left: pos(h * 60) }}>
            {h}:00
          </span>
        ))}
      </div>
    </WidgetCard>
  );
}

/**
 * One booking. Left: the time and how soon. Right: the guest, the status, and
 * one line of facts (party, table, phone). A note sits under it. The one action
 * for now (Seat) is on the card; everything else is behind a hold.
 */
function BookingCard({ b, today, onSeat, onHold }: { b: Booking; today: boolean; onSeat: () => void; onHold: () => void }) {
  const tr = useTr();
  const press = useLongPress(onHold);
  const seated = b.status === "seated";
  const soon = today && !seated && mins(b.time) - NOW <= 60;
  return (
    <article {...press} style={{ WebkitTouchCallout: "none" }} className={`rounded-[22px] p-4 select-none ${soon ? "bg-g-tint-blue" : "bg-g-fill"} ${seated ? "opacity-55" : ""}`}>
      <div className="flex items-start gap-3.5">
        <div className="w-[58px] shrink-0">
          <p className="text-[22px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{b.time}</p>
          {today && !seated && <p className={`mt-1 text-[12px] font-semibold ${soon ? "text-g-blue" : "text-g-muted"}`}>{relative(b.time)}</p>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[16px] font-semibold">{b.name}</p>
            <span className={`${STATE[b.status].chip} shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold`}>{tr(STATE[b.status].label)}</span>
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-g-ink-2">
            <span className="flex items-center gap-1 tabular-nums">
              <Users size={14} strokeWidth={2} className="text-g-muted" /> {b.guests}
            </span>
            <span className={`flex items-center gap-1 ${b.table ? "" : "font-semibold text-g-orange"}`}>
              <Armchair size={14} strokeWidth={2} className={b.table ? "text-g-muted" : ""} /> {b.table ? `${tr("Table")} ${b.table}` : tr("No table")}
            </span>
            <span className="flex items-center gap-1 text-g-muted tabular-nums">
              <Phone size={13} strokeWidth={2} /> ··{b.phone.replace(/\D/g, "").slice(-4)}
            </span>
          </p>
        </div>
      </div>
      {(b.note || (today && !seated)) && (
        <div className="mt-3 flex items-center gap-2">
          {b.note ? (
            <p className="flex min-w-0 flex-1 items-center gap-1.5 rounded-full bg-g-tint-note px-3 py-1.5 text-[12px] text-g-ink-2">
              <StickyNote size={13} strokeWidth={2} className="shrink-0 text-g-orange" /> <span className="truncate">{b.note}</span>
            </p>
          ) : (
            <span className="flex-1 text-[11px] text-g-faint">{tr("Hold for more")}</span>
          )}
          {today && !seated && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                haptic("success");
                onSeat();
              }}
              className="press flex h-9 shrink-0 items-center gap-1 rounded-full bg-g-ink px-3.5 text-[13px] font-semibold text-white"
            >
              <Check size={15} strokeWidth={2.5} /> {tr("Seat")}
            </button>
          )}
        </div>
      )}
    </article>
  );
}

/** Hold a booking: its details on top, then call, edit, confirm or move to the waiting list, cancel. */
function BookingMenu({ b, today, onClose, onSeat, onEdit, onUpdate, onCancel }: { b: Booking; today: boolean; onClose: () => void; onSeat: () => void; onEdit: () => void; onUpdate: (b: Booking) => void; onCancel: () => void }) {
  const tr = useTr();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const row = "press flex w-full items-center justify-between px-4 py-3.5 text-left text-[15px] font-semibold";
  return (
    <PeekCard label={b.name} onClose={onClose}>
      <div className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-g-fill text-[15px] font-bold tabular-nums">{b.time}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[18px] font-bold">{b.name}</span>
          <span className="block text-[12px] text-g-muted tabular-nums">
            {b.guests} {tr("guests")} · {b.table ? `${tr("Table")} ${b.table}` : tr("No table")} · {b.phone}
          </span>
        </span>
      </div>
      {b.note && <p className="mt-3 rounded-[14px] bg-g-tint-note px-3 py-2 text-[13px]">{b.note}</p>}
      {!confirmCancel ? (
        <div className="mt-4 divide-y divide-g-line overflow-hidden rounded-[18px] bg-g-fill">
          {today && b.status !== "seated" && (
            <button onClick={onSeat} className={row}>
              {tr("Seat now")} <Check size={18} strokeWidth={2.2} className="text-g-green" />
            </button>
          )}
          <a href={`tel:${b.phone.replace(/\s/g, "")}`} onClick={() => haptic("light")} className={row}>
            {tr("Call")} <Phone size={18} strokeWidth={2.2} className="text-g-muted" />
          </a>
          <button onClick={onEdit} className={row}>
            {tr("Edit booking")} <Pencil size={18} strokeWidth={2.2} className="text-g-muted" />
          </button>
          {b.status === "waiting" ? (
            <button onClick={() => onUpdate({ ...b, status: "confirmed" })} className={row}>
              {tr("Confirm booking")} <CalendarCheck size={18} strokeWidth={2.2} className="text-g-muted" />
            </button>
          ) : b.status === "confirmed" ? (
            <button onClick={() => onUpdate({ ...b, status: "waiting", table: undefined })} className={row}>
              {tr("Move to waiting list")} <Hourglass size={18} strokeWidth={2.2} className="text-g-muted" />
            </button>
          ) : null}
          <button onClick={() => setConfirmCancel(true)} className={`${row} text-[#e5484d]`}>
            {tr("Cancel booking")} <Ban size={18} strokeWidth={2.2} />
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-[15px] font-semibold">{tr("Cancel this booking?")}</p>
          <p className="mt-0.5 text-[13px] text-g-muted">{tr("The table is freed and the guest gets a message.")}</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setConfirmCancel(false)} className="press h-12 flex-1 rounded-full bg-g-fill text-[15px] font-semibold">
              {tr("Keep")}
            </button>
            <button
              onClick={() => {
                haptic("success");
                onCancel();
              }}
              className="press h-12 flex-[1.4] rounded-full bg-[#e5484d] text-[15px] font-semibold text-white"
            >
              {tr("Cancel booking")}
            </button>
          </div>
        </div>
      )}
    </PeekCard>
  );
}
