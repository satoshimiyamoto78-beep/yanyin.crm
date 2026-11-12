import { allItems, type Menu, type MenuItem } from "@yanyin/domain";

/**
 * Demo floor for the waiter app: tables, open tickets, bookings and today's
 * closed orders. In Phase 1 these come from Supabase with Realtime updates.
 */
export type TableStatus = "free" | "seated" | "ordered" | "bill" | "reserved";
export type LineState = "new" | "cooking" | "served";

/** `by`: who put the line on the ticket, the guest from the QR menu or the waiter. */
export type TicketLine = {
  id: string;
  itemId: string;
  qty: number;
  price: number;
  state: LineState;
  by?: "guest" | "waiter";
  /** When the dish was added to the ticket ("12:31"). Every line is tracked. */
  at?: string;
  /** Cancelled by the waiter: kept on the ticket (crossed out, not charged) with the reason. */
  cancelled?: { reason: string; at: string; by: string };
};

export type FloorTable = {
  no: number;
  seats: number;
  zone: "Hall" | "Terrace";
  status: TableStatus;
  guests: number;
  /** Seated at, "HH:MM". */
  since?: string;
  lines: TicketLine[];
  /** Upcoming booking shown on a reserved table. */
  booking?: { name: string; time: string };
};

export type Booking = {
  id: string;
  name: string;
  phone: string;
  guests: number;
  day: number; // 0 = today
  time: string;
  table?: number;
  note?: string;
  /** `waiting` is the live queue: guests on site now with no fitting table free. */
  status: "confirmed" | "seated" | "waiting" | "cancelled";
  /** When the booking was cancelled: the time and the reason. */
  cancelled?: { at: string; reason?: string };
};

export type PayMethod = "cash" | "card" | "vietqr" | "momo";

export type ClosedOrder = {
  id: number;
  table: number;
  closedAt: string;
  lines: TicketLine[];
  subtotal: number;
  tip: number;
  method: PayMethod;
  guests: number;
};

export type FloorData = {
  tables: FloorTable[];
  bookings: Booking[];
  history: ClosedOrder[];
  venue: { name: string; address: string; currency: Menu["venue"]["currency"] };
  waiter: string;
};

export function demoFloor(menu: Menu): FloorData {
  const items = allItems(menu).filter((i) => i.price > 0 && !i.variants.length && !i.modifierGroups.some((g) => g.required));
  const find = (re: RegExp) => items.find((i) => re.test(i.name.en ?? "")) ?? items[0]!;
  let seq = 0;
  const line = (it: MenuItem, qty: number, state: LineState, by: "guest" | "waiter" = "waiter", at?: string): TicketLine => ({ id: `l${++seq}`, itemId: it.id, qty, price: it.price, state, by, at });
  /** Adds minutes to a "HH:MM" time (demo: dishes arrive a few minutes after the guests sit). */
  const plus = (t: string, m: number) => {
    const [h, mm] = t.split(":").map(Number);
    const v = (h ?? 0) * 60 + (mm ?? 0) + m;
    return `${String(Math.floor(v / 60)).padStart(2, "0")}:${String(v % 60).padStart(2, "0")}`;
  };

  const plov = find(/plov/i);
  const shashlik = find(/lamb shashlik/i);
  const beef = find(/beef shashlik/i);
  const soup = find(/fatir|shurpa/i);
  const salad = find(/salad/i);
  const bread = find(/bread|lepyoshka|non\b/i);
  const tea = find(/tea/i);
  const juice = find(/juice|lemonade|cola/i);
  const samsa = find(/samsa/i);
  const dessert = find(/baklava|honey|cake|chak/i);

  const tables: FloorTable[] = [
    { no: 1, seats: 2, zone: "Hall", status: "free", guests: 0, lines: [] },
    { no: 2, seats: 4, zone: "Hall", status: "ordered", guests: 3, since: "12:10", lines: [line(plov, 2, "served", "guest", plus("12:10", 4)), line(salad, 1, "served", "guest", plus("12:10", 4)), line(tea, 1, "cooking", "waiter", plus("12:10", 9))] },
    { no: 3, seats: 4, zone: "Hall", status: "reserved", guests: 0, lines: [], booking: { name: "Nguyen", time: "13:30" } },
    { no: 4, seats: 6, zone: "Hall", status: "bill", guests: 5, since: "11:40", lines: [line(shashlik, 3, "served", "guest", plus("11:40", 4)), line(beef, 2, "served", "guest", plus("11:40", 4)), line(bread, 2, "served", "waiter", plus("11:40", 9)), line(juice, 5, "served", "guest", plus("11:40", 15)), line(dessert, 2, "served", "waiter", plus("11:40", 22))] },
    { no: 5, seats: 2, zone: "Hall", status: "seated", guests: 2, since: "12:42", lines: [] },
    { no: 6, seats: 4, zone: "Hall", status: "free", guests: 0, lines: [] },
    { no: 7, seats: 4, zone: "Hall", status: "ordered", guests: 2, since: "12:25", lines: [line(soup, 2, "cooking", "waiter", plus("12:25", 4)), line(samsa, 2, "new", "guest", plus("12:25", 4)), line(tea, 1, "served", "waiter", plus("12:25", 9))] },
    { no: 8, seats: 8, zone: "Hall", status: "free", guests: 0, lines: [] },
    { no: 10, seats: 2, zone: "Terrace", status: "ordered", guests: 2, since: "12:30", lines: [line(shashlik, 2, "cooking", "waiter", plus("12:30", 4)), line(juice, 2, "served", "waiter", plus("12:30", 4))] },
    { no: 11, seats: 4, zone: "Terrace", status: "free", guests: 0, lines: [] },
    { no: 12, seats: 4, zone: "Terrace", status: "reserved", guests: 0, lines: [], booking: { name: "Alex", time: "19:00" } },
    { no: 14, seats: 6, zone: "Terrace", status: "free", guests: 0, lines: [] },
  ];

  const bookings: Booking[] = [
    { id: "b1", name: "Nguyen Van An", phone: "+84 905 123 456", guests: 4, day: 0, time: "13:30", table: 3, status: "confirmed" },
    { id: "b2", name: "Alex Petrov", phone: "+7 916 555 12 34", guests: 3, day: 0, time: "19:00", table: 12, note: "Birthday, needs a cake candle", status: "confirmed" },
    // The live queue: on site now, no fitting table free; `time` is when they joined.
    { id: "b3", name: "Kim Ji-woo", phone: "+82 10 2345 6789", guests: 2, day: 0, time: "12:31", status: "waiting" },
    { id: "w1", name: "Ivan", phone: "", guests: 9, day: 0, time: "12:38", status: "waiting" },
    { id: "b4", name: "Sarah Miller", phone: "+1 415 555 0182", guests: 6, day: 1, time: "18:30", table: 8, note: "Halal only", status: "confirmed" },
    { id: "b5", name: "Dmitry", phone: "+84 935 777 001", guests: 2, day: 1, time: "21:00", status: "confirmed" },
    { id: "b6", name: "Tran Thi Mai", phone: "+84 912 345 678", guests: 5, day: 0, time: "17:00", table: 8, status: "confirmed" },
    { id: "b7", name: "Oliver Brown", phone: "+44 7700 900123", guests: 2, day: 0, time: "18:15", table: 6, status: "confirmed" },
    { id: "b8", name: "Lee Min", phone: "+82 10 9876 5432", guests: 4, day: 0, time: "22:30", table: 11, status: "confirmed" },
    // Earlier days, for the booking history.
    { id: "p1", name: "Pham Quang", phone: "+84 903 111 222", guests: 4, day: -1, time: "19:30", table: 3, status: "seated" },
    { id: "p2", name: "Anna Ivanova", phone: "+7 921 555 44 33", guests: 2, day: -1, time: "20:00", status: "cancelled", cancelled: { at: "17:40", reason: "Guest cancelled by phone" } },
    { id: "p3", name: "Hoang Duc", phone: "+84 905 222 333", guests: 6, day: -2, time: "13:00", table: 8, status: "seated" },
    { id: "p4", name: "Maria Lopez", phone: "+34 612 345 678", guests: 3, day: -3, time: "19:00", status: "cancelled", cancelled: { at: "18:55", reason: "No-show" } },
  ];

  const closed = (id: number, table: number, at: string, ls: TicketLine[], tipPct: number, method: PayMethod, guests: number): ClosedOrder => {
    const subtotal = ls.reduce((s, l) => s + l.price * l.qty, 0);
    return { id, table, closedAt: at, lines: ls, subtotal, tip: Math.round((subtotal * tipPct) / 100 / 1000) * 1000, method, guests };
  };
  const history: ClosedOrder[] = [
    closed(1042, 6, "12:05", [line(plov, 2, "served"), line(tea, 2, "served")], 10, "vietqr", 2),
    closed(1041, 1, "11:48", [line(samsa, 3, "served"), line(juice, 1, "served")], 0, "cash", 1),
    closed(1040, 8, "11:20", [line(shashlik, 4, "served"), line(beef, 2, "served"), line(bread, 3, "served"), line(salad, 2, "served"), line(juice, 6, "served")], 5, "card", 6),
    closed(1039, 11, "10:52", [line(soup, 2, "served"), line(tea, 2, "served")], 10, "momo", 2),
  ];

  return {
    tables,
    bookings,
    history,
    venue: { name: menu.venue.name, address: "Da Nang, Vietnam", currency: menu.venue.currency },
    waiter: "Linh",
  };
}

/** What the table pays: cancelled lines stay on the ticket but are not charged. */
export const ticketTotal = (lines: TicketLine[]) => lines.reduce((s, l) => s + (l.cancelled ? 0 : l.price * l.qty), 0);
