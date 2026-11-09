"use client";

import { CalendarPlus, Phone, StickyNote, Users } from "lucide-react";
import { useState } from "react";
import type { Booking, FloorTable } from "@/lib/demo-floor";
import { haptic } from "@/lib/haptics";
import { Reveal, startLoading } from "@/components/guest/motion";
import { ChoiceChip, Sheet, StepHead } from "@/components/guest/ui";
import { Counter, PageHead } from "./CrewApp";

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

export function BookingsView({ bookings, onNew, onSeat }: { bookings: Booking[]; onNew: () => void; onSeat: (b: Booking) => void }) {
  const [day, setDay] = useState(0);
  const list = bookings.filter((b) => b.day === day).sort((a, b) => a.time.localeCompare(b.time));
  const guests = list.reduce((s, b) => s + b.guests, 0);
  return (
    <div className="px-5 pt-[max(20px,env(safe-area-inset-top))]">
      <PageHead title="Bookings" sub={`${list.length} bookings · ${guests} guests`} />
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
      <div className="no-scrollbar -mx-5 mt-5 flex gap-2 overflow-x-auto px-5">
        {[0, 1, 2, 3, 4, 5, 6].map((d) => (
          <ChoiceChip key={d} on={day === d} onClick={() => { setDay(d); startLoading(450); }} icon={<span />}>
            {dayLabel(d)}
          </ChoiceChip>
        ))}
      </div>
      <Reveal className="mt-3 divide-y divide-g-line pb-16">
        {list.map((b) => (
          <div key={b.id} className="flex gap-4 py-4">
            <span className="live w-14 shrink-0 pt-0.5 text-[20px] font-semibold tracking-[-0.02em] tabular-nums">{b.time}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="live min-w-0 truncate text-[16px] font-semibold">{b.name}</p>
                <span className={`${STATE[b.status].chip} inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-[12px] font-semibold`}>{STATE[b.status].label}</span>
              </div>
              <p className="live mt-0.5 flex items-center gap-1.5 text-[13px] text-g-muted">
                <Users size={13} strokeWidth={2} /> {b.guests} · {b.table ? `Table ${b.table}` : "No table yet"}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-g-muted">
                <Phone size={13} strokeWidth={2} /> <span className="live">{b.phone}</span>
              </p>
              {b.note && (
                <p className="mt-1.5 flex items-start gap-1.5 text-[13px] text-g-ink-2">
                  <StickyNote size={13} strokeWidth={2} className="mt-0.5 shrink-0 text-g-orange" /> <span className="live">{b.note}</span>
                </p>
              )}
              {day === 0 && b.status !== "seated" && (
                <button onClick={() => { haptic("success"); onSeat(b); }} className="press mt-3 h-9 rounded-full bg-g-ink px-4 text-[14px] font-semibold text-white">
                  Guests arrived
                </button>
              )}
            </div>
          </div>
        ))}
        {!list.length && <p className="py-12 text-center text-[15px] text-g-muted">No bookings for this day</p>}
      </Reveal>
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
