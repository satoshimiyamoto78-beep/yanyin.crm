import { createStore } from "./store";

/*
 * Demo shifts of the pilot venue. A shift is the venue's working day: it is
 * opened (cash float), people clock in and out against their planned hours,
 * the checklists run, and it is closed with the cash count and a Z-report
 * that stays in the history. The schedule plans each person's hours per day.
 * Times are "HH:MM"; hours as numbers (16.5 = 16:30).
 */

export type Station = "admin" | "hall" | "bar" | "kitchen";
export type Plan = { from: number; to: number; station: Station } | null;

export const PRESETS: {
  id: string;
  label: string;
  from: number;
  to: number;
}[] = [
  { id: "morning", label: "Morning", from: 7, to: 15 },
  { id: "day", label: "Day", from: 10, to: 18 },
  { id: "evening", label: "Evening", from: 16, to: 24 },
  { id: "long", label: "Long", from: 10, to: 22 },
];

/** How many people each station needs, by hour of the day (the venue's staffing plan). */
export const NEED: Record<Exclude<Station, "admin">, (h: number) => number> = {
  hall: (h) => (h >= 18 && h < 22 ? 2 : h < 23 ? 1 : 0),
  bar: () => 1,
  kitchen: (h) => (h < 23 ? 1 : 0),
};
export const OPEN_FROM = 7;
export const OPEN_TO = 24;

const P = (from: number, to: number, station: Station): Plan => ({
  from,
  to,
  station,
});
const off = null;

/** The week of 9–15 November; index 5 (Sat 14) is today. */
const RAW: Record<string, Plan[]> = {
  "staff-huong": [
    P(10, 19, "admin"),
    P(10, 19, "admin"),
    off,
    P(10, 19, "admin"),
    P(10, 19, "admin"),
    P(12, 22, "admin"),
    off,
  ],
  "staff-linh": [
    P(16, 24, "hall"),
    off,
    P(8, 16, "hall"),
    P(8, 16, "hall"),
    P(8, 16, "hall"),
    P(16, 24, "hall"),
    P(16, 24, "hall"),
  ],
  "staff-minh": [
    P(8, 16, "hall"),
    P(16, 24, "hall"),
    P(16, 24, "hall"),
    off,
    P(10, 22, "hall"),
    off,
    P(8, 16, "hall"),
  ],
  "staff-thao": [
    P(7, 15, "bar"),
    P(7, 15, "bar"),
    off,
    P(16, 24, "bar"),
    P(7, 15, "bar"),
    P(7, 15, "bar"),
    off,
  ],
  "staff-an": [
    off,
    P(16, 24, "bar"),
    P(7, 15, "bar"),
    P(7, 15, "bar"),
    P(12, 24, "bar"),
    off,
    P(16, 24, "bar"),
  ],
  "staff-tuan": [
    P(16, 24, "bar"),
    off,
    P(16, 24, "bar"),
    off,
    P(16, 24, "bar"),
    P(16, 24, "bar"),
    P(7, 15, "bar"),
  ],
  "staff-dima": [
    P(7, 15, "kitchen"),
    P(7, 15, "kitchen"),
    P(7, 15, "kitchen"),
    off,
    P(7, 15, "kitchen"),
    P(15, 23, "kitchen"),
    off,
  ],
  "staff-lan": [
    P(15, 23, "kitchen"),
    P(15, 23, "kitchen"),
    off,
    P(7, 15, "kitchen"),
    P(10, 23, "kitchen"),
    off,
    P(7, 15, "kitchen"),
  ],
  "staff-owner": [off, off, off, off, off, off, off],
};
// Written with today in column 4; Saturday is column 5.
export const WEEK_SEED: Record<string, Plan[]> = Object.fromEntries(
  Object.entries(RAW).map(([k, w]) => [
    k,
    [w[0]!, w[1]!, w[2]!, w[3]!, w[5]!, w[4]!, w[6]!],
  ]),
);
export const TODAY = 5;

export const scheduleStore = createStore<Record<string, Plan[]>>(
  "yanyin:schedule-v2",
  WEEK_SEED,
);
export const publishedStore = createStore<boolean>(
  "yanyin:schedule-published",
  true,
);

/** Who clocked in today and when (the waiter's app does it with one tap at the door). */
export const clockStore = createStore<
  Record<string, { in: string; out?: string }>
>("yanyin:clock", {
  "staff-dima": { in: "06:52" },
  "staff-thao": { in: "07:01" },
  "staff-linh": { in: "07:57" },
  "staff-huong": { in: "09:52" },
  "staff-minh": { in: "10:07" },
  "staff-lan": { in: "09:58" },
  "staff-an": { in: "11:56" },
});

export type ShiftState = {
  open: boolean;
  openedAt: string;
  openedBy: string;
  float: number;
};
export const shiftStore = createStore<ShiftState>("yanyin:shift-v2", {
  open: true,
  openedAt: "09:52",
  openedBy: "huong",
  float: 2_000_000,
});

export type ShiftEvent = {
  at: string;
  text: string;
  tone?: "warn" | "good" | "plain";
};
export type ShiftReport = {
  id: string;
  date: string;
  weekday: number;
  opened: string;
  closed: string;
  by: string;
  takings: number;
  bills: number;
  guests: number;
  tips: number;
  refunds: number;
  pay: { cash: number; card: number; vietqr: number; momo: number };
  cashExpected: number;
  cashCounted: number;
  checklists: number;
  late: number;
  hours: number;
  people: { id: string; from: string; to: string; late?: number }[];
  events: ShiftEvent[];
  note?: string;
};

const DAY_TAKINGS = [
  38.2, 41.5, 36.9, 44.8, 52.3, 61.7, 47.1, 39.4, 42.8, 35.1, 46.2, 55.9, 63.4,
  49.8,
];
/** The last two weeks, newest first (yesterday is Fri 13 November). */
export const SEED_HISTORY: ShiftReport[] = DAY_TAKINGS.map((m, i) => {
  const takings = Math.round(m * 1e6);
  const day = 13 - i;
  const date = day > 0 ? `${day} Nov` : `${31 + day} Oct`;
  const cash = Math.round(takings * 0.21);
  const diff = i === 2 ? -50_000 : i === 6 ? 20_000 : 0;
  return {
    id: `S-${1180 - i}`,
    date,
    weekday: (4 - i + 70) % 7,
    opened: i % 3 === 0 ? "09:48" : "09:55",
    closed: i % 4 === 1 ? "00:12" : "23:46",
    by: i % 2 ? "huong" : "minh",
    takings,
    bills: Math.round(takings / 1_020_000),
    guests: Math.round((takings / 1_020_000) * 2.4),
    tips: Math.round(takings * 0.055),
    refunds: i === 4 ? 180_000 : 0,
    pay: {
      cash,
      card: Math.round(takings * 0.28),
      vietqr: Math.round(takings * 0.46),
      momo:
        takings -
        cash -
        Math.round(takings * 0.28) -
        Math.round(takings * 0.46),
    },
    cashExpected: cash + 2_000_000,
    cashCounted: cash + 2_000_000 + diff,
    checklists: [96, 100, 88, 100, 92, 79, 100, 94, 100, 85, 97, 100, 90, 100][
      i
    ]!,
    late: [0, 1, 0, 2, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1][i]!,
    hours: 58 + (i % 4) * 3,
    people: [
      { id: "staff-huong", from: "09:48", to: "19:05" },
      { id: "staff-linh", from: "07:58", to: "16:02" },
      {
        id: "staff-minh",
        from: i % 4 === 3 ? "10:12" : "15:58",
        to: "23:50",
        late: i % 4 === 3 ? 12 : undefined,
      },
      { id: "staff-thao", from: "07:00", to: "15:01" },
      { id: "staff-tuan", from: "16:00", to: "00:05" },
      { id: "staff-dima", from: "06:55", to: "15:04" },
      { id: "staff-lan", from: "14:57", to: "23:10" },
    ],
    events: [
      { at: "09:48", text: "Shift opened · float 2M ₫" },
      ...(i % 4 === 3
        ? [
            {
              at: "10:12",
              text: "@minh came 12 min late",
              tone: "warn" as const,
            },
          ]
        : []),
      { at: "14:20", text: "Samarkand plov on the stop-list" },
      ...(i === 4
        ? [
            {
              at: "15:10",
              text: "Refund 180k ₫ · cold soup",
              tone: "warn" as const,
            },
          ]
        : []),
      { at: "21:30", text: "Peak: 11 tables at once", tone: "good" as const },
      {
        at: "23:40",
        text: diff
          ? `Cash count: difference ${diff > 0 ? "+" : "−"}${Math.abs(diff / 1000)}k ₫`
          : "Cash count: matches",
        tone: diff ? "warn" : "good",
      },
      { at: "23:46", text: "Shift closed" },
    ],
  };
});
export const historyStore = createStore<ShiftReport[]>(
  "yanyin:shift-history",
  SEED_HISTORY,
);

export const hm = (h: number) =>
  `${String(Math.floor(h) % 24).padStart(2, "0")}:${h % 1 ? "30" : "00"}`;
export const toH = (t: string) =>
  Number(t.slice(0, 2)) + Number(t.slice(3)) / 60;
