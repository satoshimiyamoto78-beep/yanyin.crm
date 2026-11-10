import { allItems, type Menu, type MenuItem } from "@yanyin/domain";

/**
 * Demo floor for the waiter app: tables, open tickets, bookings and today's
 * closed orders. In Phase 1 these come from Supabase with Realtime updates.
 */
export type TableStatus = "free" | "seated" | "ordered" | "bill" | "reserved";
export type LineState = "new" | "cooking" | "served";

/** `by`: who put the line on the ticket, the guest from the QR menu or the waiter. */
export type TicketLine = { id: string; itemId: string; qty: number; price: number; state: LineState; by?: "guest" | "waiter" };

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
  status: "confirmed" | "seated" | "waiting";
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
  const line = (it: MenuItem, qty: number, state: LineState, by: "guest" | "waiter" = "waiter"): TicketLine => ({ id: `l${++seq}`, itemId: it.id, qty, price: it.price, state, by });

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
    { no: 2, seats: 4, zone: "Hall", status: "ordered", guests: 3, since: "12:10", lines: [line(plov, 2, "served", "guest"), line(salad, 1, "served", "guest"), line(tea, 1, "cooking")] },
    { no: 3, seats: 4, zone: "Hall", status: "reserved", guests: 0, lines: [], booking: { name: "Nguyen", time: "13:30" } },
    { no: 4, seats: 6, zone: "Hall", status: "bill", guests: 5, since: "11:40", lines: [line(shashlik, 3, "served", "guest"), line(beef, 2, "served", "guest"), line(bread, 2, "served"), line(juice, 5, "served", "guest"), line(dessert, 2, "served")] },
    { no: 5, seats: 2, zone: "Hall", status: "seated", guests: 2, since: "12:42", lines: [] },
    { no: 6, seats: 4, zone: "Hall", status: "free", guests: 0, lines: [] },
    { no: 7, seats: 4, zone: "Hall", status: "ordered", guests: 2, since: "12:25", lines: [line(soup, 2, "cooking"), line(samsa, 2, "new", "guest"), line(tea, 1, "served")] },
    { no: 8, seats: 8, zone: "Hall", status: "free", guests: 0, lines: [] },
    { no: 10, seats: 2, zone: "Terrace", status: "ordered", guests: 2, since: "12:30", lines: [line(shashlik, 2, "cooking"), line(juice, 2, "served")] },
    { no: 11, seats: 4, zone: "Terrace", status: "free", guests: 0, lines: [] },
    { no: 12, seats: 4, zone: "Terrace", status: "reserved", guests: 0, lines: [], booking: { name: "Alex", time: "19:00" } },
    { no: 14, seats: 6, zone: "Terrace", status: "free", guests: 0, lines: [] },
  ];

  const bookings: Booking[] = [
    { id: "b1", name: "Nguyen Van An", phone: "+84 905 123 456", guests: 4, day: 0, time: "13:30", table: 3, status: "confirmed" },
    { id: "b2", name: "Alex Petrov", phone: "+7 916 555 12 34", guests: 3, day: 0, time: "19:00", table: 12, note: "Birthday, needs a cake candle", status: "confirmed" },
    { id: "b3", name: "Kim Ji-woo", phone: "+82 10 2345 6789", guests: 2, day: 0, time: "20:30", status: "waiting" },
    { id: "b4", name: "Sarah Miller", phone: "+1 415 555 0182", guests: 6, day: 1, time: "18:30", table: 8, note: "Halal only", status: "confirmed" },
    { id: "b5", name: "Dmitry", phone: "+84 935 777 001", guests: 2, day: 1, time: "21:00", status: "confirmed" },
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

export const ticketTotal = (lines: TicketLine[]) => lines.reduce((s, l) => s + l.price * l.qty, 0);
