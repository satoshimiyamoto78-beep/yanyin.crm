"use client";

import { ChevronRight, History, UserRound, Armchair, Ban, CalendarCheck, CalendarDays, CalendarPlus, Check, Hourglass, Pencil, Phone, StickyNote, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  cancelled: { label: "Cancelled", chip: "chip-red" },
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
  return d < 60 ? `in ${d} min` : `in ${Math.floor(d / 60)}h${d % 60 ? `${d % 60}m` : ""}`;
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
  const list = bookings.filter((b) => b.day === day && b.status !== "cancelled").sort((a, b) => a.time.localeCompare(b.time));
  const [history, setHistory] = useState(false);
  const guests = list.reduce((s, b) => s + b.guests, 0);
  const upcoming = list.filter((b) => b.status !== "seated");
  const next = day === 0 ? upcoming.find((b) => mins(b.time) >= NOW - 5) : upcoming[0];
  const tr = useTr();
  return (
    <div className="px-5">
      {/* When guests arrive (bars), how many are already seated (ring), who waits for a table (meter). */}
      <Reveal className="mt-5 grid grid-cols-2 gap-2.5">
        <BookingRuler className="col-span-2" list={list} today={day === 0} initial={next?.id} />
        <IconStat
          title={tr("Seated")}
          fit art={<SeatedArt size={84} />}
          value={`${list.filter((b) => b.status === "seated").length} / ${list.length}`}
          sub={tr("bookings arrived")}
          tone="green"
        />
        <IconStat title={tr("Guests")} fit art={<GuestsArt size={84} />} value={String(guests)} sub={tr("expected today")} tone="blue" />
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
      <button
        onClick={() => {
          haptic("light");
          setHistory(true);
        }}
        className="press mt-3 flex w-full items-center gap-3 rounded-[22px] bg-g-fill px-4 py-3 text-left"
      >
        <History size={18} strokeWidth={2.2} className="text-g-blue" />
        <span className="flex-1 text-[15px] font-semibold">{tr("Booking history")}</span>
        <span className="text-[13px] text-g-muted tabular-nums">
          {bookings.filter((b) => b.status === "cancelled").length} {tr("cancelled")}
        </span>
        <ChevronRight size={18} className="text-g-faint" />
      </button>
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
      {history && <BookingHistory bookings={bookings} onClose={() => setHistory(false)} />}

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
        <div className="min-w-[60px] shrink-0">
          <p className="text-[22px] leading-none font-semibold tracking-[-0.03em] tabular-nums">{b.time}</p>
          {today && !seated && <p className={`mt-1 text-[11px] font-semibold whitespace-nowrap tabular-nums ${soon ? "text-g-blue" : "text-g-muted"}`}>{relative(b.time)}</p>}
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

/**
 * The day's bookings on a ruler you scrub, like a tuning dial. A fixed blue
 * line stands in the middle; drag the dashed scale left or right and it ticks
 * on every mark. The scale spans the first to the last booking of the day,
 * and gets finer when there are more bookings (hourly, half-hourly, every 15
 * minutes). Bookings sit on the scale as dots with their party size; bring one
 * to the middle and its details appear on top.
 */
function BookingRuler({ list, today, initial, className = "" }: { list: Booking[]; today: boolean; initial?: string; className?: string }) {
  const tr = useTr();
  const ref = useRef<HTMLDivElement>(null);
  const times = list.map((b) => mins(b.time));
  const start = Math.floor(Math.min(...(times.length ? times : [11 * 60]), today ? NOW : 24 * 60) / 60) * 60 - 30;
  const end = Math.ceil(Math.max(...(times.length ? times : [23 * 60])) / 60) * 60 + 30;
  // More bookings, finer marks.
  const step = list.length >= 7 ? 15 : list.length >= 4 ? 30 : 60;
  const PX = step === 15 ? 1.9 : step === 30 ? 1.5 : 1.15; // px per minute
  const FINE = 5; // a small dash every 5 minutes
  const [vw, setVw] = useState(360);
  const pad = vw / 2 / PX; // minutes of scale drawn beyond each end, so it never runs out
  const width = (end - start) * PX;
  const firstFocus = list.find((b) => b.id === initial) ?? list[0];
  const [center, setCenter] = useState(firstFocus ? mins(firstFocus.time) : start);
  const lastMark = useRef(-1);
  const near = list.reduce<Booking | undefined>((best, b) => (Math.abs(mins(b.time) - center) <= step / 2 && (!best || Math.abs(mins(b.time) - center) < Math.abs(mins(best.time) - center)) ? b : best), undefined);
  const hhmm = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(Math.round(m % 60)).padStart(2, "0")}`;
  const x = (m: number) => (m - start) * PX + vw / 2; // position inside the scrolled strip

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setVw(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollLeft = ((firstFocus ? mins(firstFocus.time) : start) - start) * PX;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const m = start + el.scrollLeft / PX;
        setCenter(m);
        const mark = Math.round(m / step);
        if (mark !== lastMark.current) {
          lastMark.current = mark;
          haptic("tick");
        }
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-centre only when the day's bookings change
  }, [list.length, start, PX, vw]);

  const go = (m: number) => ref.current?.scrollTo({ left: (m - start) * PX, behavior: "smooth" });
  const from = Math.floor((start - pad) / FINE) * FINE;
  const to = Math.ceil((end + pad) / FINE) * FINE;
  const marks = Array.from({ length: (to - from) / FINE + 1 }, (_, i) => from + i * FINE);
  return (
    <WidgetCard
      className={className}
      title={tr("Bookings today")}
      icon={<CalendarDays size={13} strokeWidth={2.4} />}
      aside={
        <span className="text-[13px] text-g-muted tabular-nums">
          {list.length} · {list.reduce((n, b) => n + b.guests, 0)} {tr("guests")}
        </span>
      }
    >
      {/* What is under the needle. */}
      <div className="mt-3 flex h-[56px] items-center">
        {near ? (
          <div key={near.id} className="animate-tab flex w-full items-center gap-3">
            <span className="bg-[linear-gradient(135deg,#6c96ff,#2f5bff_55%,#2530b0)] bg-clip-text text-[30px] leading-none font-semibold tracking-[-0.03em] text-transparent tabular-nums">{near.time}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[16px] font-semibold">{near.name}</span>
              <span className="flex flex-wrap gap-x-1 text-[12px] leading-snug text-g-muted tabular-nums">
                <span className="whitespace-nowrap">
                  {near.guests} {tr("guests")} · {near.table ? `${tr("Table")} ${near.table}` : tr("No table")}
                </span>
                {today && near.status !== "seated" && <span className="whitespace-nowrap">· {relative(near.time)}</span>}
              </span>
            </span>
            <span className={`${STATE[near.status].chip} shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold`}>{tr(STATE[near.status].label)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-g-muted">
            <span className="text-[30px] leading-none font-semibold tracking-[-0.03em] text-g-faint tabular-nums">{hhmm(center)}</span>
            <span className="text-[13px] whitespace-nowrap">{tr("Drag the scale")}</span>
          </div>
        )}
      </div>

      <div className="relative -mx-4 mt-1">
        {/* The needle: starts under the booking bubbles and runs through the scale. */}
        <span aria-hidden className="pointer-events-none absolute top-[40px] bottom-5 left-1/2 z-10 w-[3px] -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,#6c96ff,#2f5bff_60%,#2530b0)]" />
        <div ref={ref} className="no-scrollbar edge-fade overflow-x-auto overscroll-x-contain select-none">
          <div className="relative h-[108px]" style={{ width: width + vw }}>
            {/* Open hours, softly tinted; the past greyed out. */}
            <span className="absolute top-[46px] h-[30px] rounded-[8px] bg-g-blue/5" style={{ left: x(start), width }} />
            {today && NOW > start && <span className="absolute top-[46px] h-[30px] rounded-[8px] bg-g-fill-2/60" style={{ left: x(start), width: Math.min(width, (NOW - start) * PX) }} />}
            {marks.map((m) => {
              const hour = m % 60 === 0;
              const major = m % step === 0;
              const out = m < start || m > end;
              return (
                <span key={m} className={`absolute ${out ? "opacity-40" : ""}`} style={{ left: x(m) }}>
                  <span className={`absolute top-[50px] -translate-x-1/2 rounded-full ${hour ? "h-[22px] w-[2px] bg-g-ink-2" : major ? "h-[14px] w-[1.5px] bg-g-muted" : "h-[7px] w-px bg-g-faint"}`} style={{ marginTop: hour ? 0 : major ? 4 : 7.5 }} />
                  {hour && <span className="absolute top-[82px] -translate-x-1/2 text-[11px] font-semibold text-g-muted tabular-nums">{hhmm(m)}</span>}
                </span>
              );
            })}
            <span className="absolute top-[61px] right-0 left-0 border-t-[1.5px] border-dashed border-g-faint/60" />
            {today && NOW >= start && NOW <= end && <span className="absolute top-[42px] h-[38px] w-[2px] -translate-x-1/2 rounded-full bg-g-orange" style={{ left: x(NOW) }} />}
            {/* Bookings: chat-style bubbles pointing down at their time. */}
            {list.map((b) => {
              const on = near?.id === b.id;
              const seated = b.status === "seated";
              const waiting = b.status === "waiting";
              const look = seated ? "bg-g-green/15 text-g-green" : waiting ? "bg-g-orange text-white" : on ? "blue-grad" : "bg-[#fff] text-g-blue";
              const tail = seated ? "border-t-g-green/15" : waiting ? "border-t-g-orange" : on ? "border-t-[#2a45d0]" : "border-t-[#fff]";
              return (
                <button
                  key={b.id}
                  onClick={() => go(mins(b.time))}
                  aria-label={`${b.time} ${b.name}`}
                  className={`absolute top-[2px] flex -translate-x-1/2 flex-col items-center transition-transform duration-200 ${on ? "scale-110" : ""}`}
                  style={{ left: x(mins(b.time)) }}
                >
                  <span className={`flex h-7 items-center gap-1 rounded-full px-2.5 text-[12px] font-bold whitespace-nowrap tabular-nums ${look}`}>
                    {seated ? <Check size={12} strokeWidth={3} /> : <Users size={12} strokeWidth={2.6} />}
                    {b.guests}
                  </span>
                  <span className={`-mt-px size-0 border-x-[6px] border-t-[7px] border-x-transparent ${tail}`} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </WidgetCard>
  );
}

/** Every booking that is over: past visits and cancelled ones, newest first. */
function BookingHistory({ bookings, onClose }: { bookings: Booking[]; onClose: () => void }) {
  const tr = useTr();
  const [tab, setTab] = useState<"past" | "cancelled">("past");
  const past = bookings.filter((b) => b.status === "seated" || (b.day < 0 && b.status !== "cancelled"));
  const cancelled = bookings.filter((b) => b.status === "cancelled");
  const list = (tab === "past" ? past : cancelled).sort((a, b) => b.day - a.day || b.time.localeCompare(a.time));
  const dayName = (d: number) => (d === 0 ? tr("Today") : d === -1 ? tr("Yesterday") : `${-d} ${tr("days ago")}`);
  return (
    <Sheet open onClose={onClose} label={tr("Booking history")} title={false}>
      <div className="px-5 pt-1 pb-10">
        <h2 className="text-[28px] leading-tight font-bold tracking-[-0.02em]">{tr("Booking history")}</h2>
        <div className="mt-4 flex rounded-full bg-g-fill p-1">
          {(
            [
              ["past", `${tr("Visited")} · ${past.length}`],
              ["cancelled", `${tr("Cancelled")} · ${cancelled.length}`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => {
                haptic("tick");
                setTab(id);
              }}
              aria-pressed={tab === id}
              className={`h-10 flex-1 rounded-full text-[14px] font-semibold ${tab === id ? "bg-white text-g-ink" : "text-g-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-2">
          {list.map((b) => (
            <div key={b.id} className="rounded-[20px] bg-g-fill p-3.5">
              <div className="flex items-center gap-3">
                <span className="min-w-[58px] shrink-0">
                  <span className="block text-[18px] leading-none font-semibold tabular-nums">{b.time}</span>
                  <span className="mt-1 block text-[11px] whitespace-nowrap text-g-muted">{dayName(b.day)}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{b.name}</span>
                  <span className="block text-[12px] text-g-muted tabular-nums">
                    {b.guests} {tr("guests")} · {b.table ? `${tr("Table")} ${b.table}` : tr("No table")}
                  </span>
                </span>
                <span className={`${STATE[b.status].chip} shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold`}>{tr(STATE[b.status].label)}</span>
              </div>
              {b.cancelled && (
                <p className="mt-2 rounded-[12px] bg-white px-3 py-2 text-[12px] text-g-ink-2">
                  {tr("Cancelled at")} {b.cancelled.at}
                  {b.cancelled.reason ? ` · ${tr(b.cancelled.reason)}` : ""}
                </p>
              )}
            </div>
          ))}
          {!list.length && <p className="py-12 text-center text-[15px] text-g-muted">{tr("Nothing here yet")}</p>}
        </div>
      </div>
    </Sheet>
  );
}
