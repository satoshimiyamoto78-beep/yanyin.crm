"use client";

import { CalendarDays, CalendarPlus, Check, Clock, Hourglass, Phone, StickyNote, Users } from "lucide-react";
import { useState } from "react";
import type { Booking, FloorTable } from "@/lib/demo-floor";
import { haptic } from "@/lib/haptics";
import { loadIfChanged, Reveal } from "@/components/guest/motion";
import { ChoiceChip, Sheet, StepHead } from "@/components/guest/ui";
import { Counter, Dash, PageHead } from "./CrewApp";

const DAY_NAMES = ["Today", "Tomorrow"];
const dayLabel = (d: number) => {
  if (d < 2) return DAY_NAMES[d]!;
  const date = new Date(Date.now() + d * 86_400_000);
  return `${date.toLocaleDateString("en", { weekday: "short" })} ${date.getDate()}`;
};
const SLOTS = ["12:00", "12:30", "13:00", "13:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"];

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

export function BookingsView({ bookings, onNew, onSeat }: { bookings: Booking[]; onNew: () => void; onSeat: (b: Booking) => void }) {
  const [day, setDay] = useState(0);
  const list = bookings.filter((b) => b.day === day).sort((a, b) => a.time.localeCompare(b.time));
  const guests = list.reduce((s, b) => s + b.guests, 0);
  const upcoming = list.filter((b) => b.status !== "seated");
  const next = day === 0 ? upcoming.find((b) => mins(b.time) >= NOW - 5) : upcoming[0];
  return (
    <div className="px-5 pt-[max(20px,env(safe-area-inset-top))]">
      <PageHead title="Bookings" sub={dayLabel(day)} />
      <Dash
        items={[
          { label: "Next", value: next?.time ?? "—", sub: next ? `${next.name.split(" ")[0]} · ${next.guests} guests${day === 0 ? ` · ${relative(next.time)}` : ""}` : "nothing planned", icon: Clock, hot: Boolean(next) },
          { label: "Bookings", value: String(list.length), sub: `${list.filter((b) => b.status === "seated").length} seated`, icon: CalendarDays },
          { label: "Guests", value: String(guests), sub: "expected", icon: Users, tone: "green" },
          { label: "Waiting list", value: String(list.filter((b) => b.status === "waiting").length), sub: "need a table", icon: Hourglass, tone: "orange" },
        ]}
      />
      <div className="no-scrollbar -mx-5 mt-5 flex gap-2 overflow-x-auto px-5">
        {[0, 1, 2, 3, 4, 5, 6].map((d) => (
          <ChoiceChip key={d} on={day === d} onClick={() => { setDay(d); loadIfChanged(`bookings:${d}`, JSON.stringify(bookings.filter((b) => b.day === d).map((b) => [b.id, b.status])), 450); }} icon={<span />}>
            {dayLabel(d)}
          </ChoiceChip>
        ))}
      </div>

      <Reveal className="mt-3 divide-y divide-g-line pb-20">
        {list.map((b) => {
          const seated = b.status === "seated";
          return (
            <article key={b.id} className={`flex gap-4 py-5 ${seated ? "opacity-55" : ""}`}>
              {/* Time column: the time is the anchor of a booking. */}
              <div className="w-[62px] shrink-0">
                <p className="live text-[22px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{b.time}</p>
                {day === 0 && !seated && <p className="live mt-1.5 text-[12px] font-medium text-g-blue">{relative(b.time)}</p>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="live min-w-0 truncate text-[17px] font-semibold">{b.name}</p>
                  <span className={`${STATE[b.status].chip} inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[11px] font-semibold`}>{STATE[b.status].label}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex h-7 items-center gap-1 rounded-full bg-g-fill px-2.5 text-[13px] font-medium">
                    <Users size={13} strokeWidth={2} /> <span className="live">{b.guests}</span>
                  </span>
                  <span className={`inline-flex h-7 items-center rounded-full px-2.5 text-[13px] font-medium ${b.table ? "bg-g-fill" : "chip-orange"}`}>
                    <span className="live">{b.table ? `Table ${b.table}` : "No table"}</span>
                  </span>
                </div>
                {b.note && (
                  <p className="mt-2.5 flex items-start gap-1.5 rounded-[14px] bg-[#fff6ec] px-3 py-2 text-[13px] leading-snug text-g-ink-2">
                    <StickyNote size={14} strokeWidth={2} className="mt-0.5 shrink-0 text-g-orange" /> <span className="live">{b.note}</span>
                  </p>
                )}
                {!seated && (
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <a
                      href={`tel:${b.phone.replace(/\s/g, "")}`}
                      onClick={() => haptic("light")}
                      aria-label={`Call ${b.name}`}
                      className="press grid size-10 place-items-center rounded-full bg-g-fill text-g-ink"
                    >
                      <Phone size={17} strokeWidth={2} />
                    </a>
                    {day === 0 && (
                      <button
                        onClick={() => {
                          haptic("success");
                          onSeat(b);
                        }}
                        className="press flex h-10 items-center gap-1.5 rounded-full bg-g-ink px-4 text-[14px] font-semibold text-white"
                      >
                        <Check size={16} strokeWidth={2.5} /> Seat
                      </button>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
        {!list.length && <p className="py-12 text-center text-[15px] text-g-muted">No bookings for this day</p>}
      </Reveal>

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

export function NewBookingPage({ tables, onClose, onSave }: { tables: FloorTable[]; onClose: () => void; onSave: (b: Booking) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [guests, setGuests] = useState(2);
  const [day, setDay] = useState(0);
  const [time, setTime] = useState("19:00");
  const [table, setTable] = useState<number | undefined>(undefined);
  const [note, setNote] = useState("");
  const fits = tables.filter((x) => x.seats >= guests && (day > 0 || x.status === "free"));
  const ok = name.trim().length > 1 && phone.trim().length > 5;
  const field = "h-12 w-full rounded-[16px] bg-g-fill px-4 text-[16px] outline-none placeholder:text-g-faint focus:ring-2 focus:ring-g-blue/30";
  return (
    <Sheet
      open
      onClose={onClose}
      label="New booking"
      footer={
        <button
          disabled={!ok}
          onClick={() => onSave({ id: `b${Date.now()}`, name: name.trim(), phone: phone.trim(), guests, day, time, table, note: note.trim() || undefined, status: "confirmed" })}
          className="blue-grad press h-14 w-full rounded-full text-[16px] font-semibold disabled:opacity-40"
        >
          Save booking · {dayLabel(day)} {time}
        </button>
      }
    >
      <div className="px-5 pt-2 pb-8">
        <section>
          <StepHead n={1} title="Guest" />
          <div className="grid gap-2.5">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Guest name" className={field} />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone or Zalo" inputMode="tel" aria-label="Phone" className={field} />
          </div>
        </section>
        <section className="mt-9">
          <StepHead n={2} title="Guests" />
          <div className="flex items-center justify-between">
            <span className="text-[56px] leading-[0.9] font-semibold tracking-[-0.04em] tabular-nums">{guests}</span>
            <Counter value={guests} min={1} max={20} onChange={setGuests} />
          </div>
        </section>
        <section className="mt-9">
          <StepHead n={3} title="Date and time" />
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
              <ChoiceChip key={d} on={day === d} onClick={() => setDay(d)} icon={<span />}>
                {dayLabel(d)}
              </ChoiceChip>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {SLOTS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  haptic("tick");
                  setTime(s);
                }}
                aria-pressed={time === s}
                className={`press h-11 rounded-[14px] text-[15px] font-semibold tabular-nums ${time === s ? "bg-g-ink text-white" : "bg-g-fill"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </section>
        <section className="mt-9">
          <StepHead n={4} title="Table" aside="Optional" />
          <div className="grid grid-cols-5 gap-2">
            {fits.map((x) => (
              <button
                key={x.no}
                onClick={() => {
                  haptic("tick");
                  setTable((v) => (v === x.no ? undefined : x.no));
                }}
                aria-pressed={table === x.no}
                className={`press flex h-14 flex-col items-center justify-center rounded-[14px] ${table === x.no ? "blue-grad" : "bg-g-fill"}`}
              >
                <span className="text-[17px] leading-none font-semibold tabular-nums">{x.no}</span>
                <span className={`mt-1 text-[11px] ${table === x.no ? "text-white/75" : "text-g-muted"}`}>{x.seats} seats</span>
              </button>
            ))}
          </div>
          {!fits.length && <p className="text-[14px] text-g-muted">No free table for {guests} right now. The booking goes to the waiting list.</p>}
        </section>
        <section className="mt-9">
          <StepHead n={5} title="Note" aside="Optional" />
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Birthday, high chair, allergies…" className={`${field} h-auto py-3`} />
        </section>
      </div>
    </Sheet>
  );
}
