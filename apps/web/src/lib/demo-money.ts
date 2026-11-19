import { createStore } from "./store";

/*
 * Demo money of the pilot venue for the owner's Finance and Reports. Every
 * figure is reproducible (seeded), so moving between periods shows stable,
 * believable numbers. The backend computes the same shapes from bills,
 * purchases, payroll and the expenses the owner records.
 */

/** Deterministic pseudo-random in [0, 1) from any string. */
export function rnd(key: string) {
  let h = 2166136261;
  for (const c of key) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

export const MONTHS = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"] as const;
export const MONTH_FULL: Record<(typeof MONTHS)[number], string> = {
  Jun: "June",
  Jul: "July",
  Aug: "August",
  Sep: "September",
  Oct: "October",
  Nov: "November",
};
/** Takings per month (November so far: 14 of 30 days). */
export const TAKINGS = [968e6, 1041e6, 1112e6, 1087e6, 1156e6, 612e6];
export const NOV_FORECAST = 1294e6;

export type PnlLine = {
  id: string;
  label: string;
  share: number;
  fixed?: number;
};
export type PnlGroup = { id: string; label: string; lines: PnlLine[] };
/** Costs as a share of takings (or a fixed monthly sum). */
export const PNL: PnlGroup[] = [
  {
    id: "cogs",
    label: "Cost of goods",
    lines: [
      { id: "food", label: "Kitchen products", share: 0.252 },
      { id: "drinks", label: "Bar products", share: 0.058 },
    ],
  },
  {
    id: "staff",
    label: "Team",
    lines: [
      { id: "wages", label: "Wages", share: 0.168 },
      { id: "bonus", label: "Quest bonuses", share: 0.006 },
      { id: "insurance", label: "Social insurance", share: 0.028 },
    ],
  },
  {
    id: "place",
    label: "Premises",
    lines: [
      { id: "rent", label: "Rent", share: 0, fixed: 120e6 },
      { id: "power", label: "Electricity and water", share: 0.024 },
      { id: "gas", label: "Gas", share: 0.006 },
    ],
  },
  {
    id: "ops",
    label: "Running costs",
    lines: [
      { id: "fees", label: "Card and QR fees", share: 0.013 },
      { id: "supplies", label: "Supplies and repairs", share: 0.031 },
      { id: "marketing", label: "Marketing", share: 0, fixed: 15e6 },
      { id: "software", label: "yanyin and software", share: 0, fixed: 2.9e6 },
    ],
  },
];

/** A line's amount in month m; fixed costs count by the days passed in the current month. */
export const lineAmount = (l: PnlLine, takings: number, m: number) =>
  Math.round(
    (l.fixed !== undefined
      ? l.fixed * (m === 5 ? 14 / 30 : 1)
      : takings * l.share * (0.94 + rnd(`${l.id}${m}`) * 0.12)) / 1000,
  ) * 1000;

export type Entry = {
  date: string;
  who: string;
  text: string;
  amount: number;
  doc?: string;
};
const WHO: Record<string, string[]> = {
  food: [
    "Da Nang Meat Co.",
    "Han Market Greens",
    "MM Mega Market",
    "Dalat Milk",
  ],
  drinks: ["Bia & Nước Đà Nẵng", "MM Mega Market"],
  wages: ["Payroll 1–15", "Payroll 16–30"],
  bonus: ["Quest bonuses"],
  insurance: ["VSS social insurance"],
  rent: ["An Thượng Properties"],
  power: ["EVN Đà Nẵng", "DAWACO water"],
  gas: ["Petrolimex Gas"],
  fees: ["VietQR · VPBank", "Card acquiring · Vietcombank", "MoMo"],
  supplies: ["Cleaning supplies", "Fridge repair", "Glassware"],
  marketing: ["Instagram ads", "Google Maps promotion"],
  software: ["yanyin Pro"],
};
/** The operations behind a P&L line for a month: what the line is made of. */
export function entries(lineId: string, total: number, m: number): Entry[] {
  const who = WHO[lineId] ?? ["Other"];
  const n =
    lineId === "rent" || lineId === "software"
      ? 1
      : lineId === "wages"
        ? 2
        : 3 + Math.floor(rnd(lineId + m) * 4);
  const parts = Array.from(
    { length: n },
    (_, i) => 0.5 + rnd(`${lineId}${m}${i}`),
  );
  const sum = parts.reduce((a, b) => a + b, 0);
  const month = MONTHS[m]!;
  return parts.map((p, i) => ({
    date: `${Math.min(28, 1 + Math.floor((i * 28) / n) + Math.floor(rnd(`${lineId}d${i}`) * 3))} ${month}`,
    who: who[i % who.length]!,
    text:
      lineId === "food" || lineId === "drinks"
        ? `Invoice ${1200 + m * 40 + i}`
        : lineId === "wages"
          ? `${i ? "16–30" : "1–15"} ${month}`
          : "",
    amount: Math.round((total * p) / sum / 1000) * 1000,
    doc:
      lineId === "food" || lineId === "drinks" || lineId === "power"
        ? "e-invoice"
        : undefined,
  }));
}

/** Expenses the owner adds by hand, by month index and line. */
export const extraStore = createStore<{ m: number; line: string; e: Entry }[]>(
  "yanyin:expenses",
  [],
);

/** Payroll for November by person: hours, hourly rate, tips, quest bonuses, paid or not. */
export const PAYROLL: {
  id: string;
  role: string;
  hours: number;
  rate: number;
  tips: number;
  bonus: number;
  paid: boolean;
}[] = [
  {
    id: "staff-huong",
    role: "Admin",
    hours: 92,
    rate: 120_000,
    tips: 0,
    bonus: 0,
    paid: true,
  },
  {
    id: "staff-dima",
    role: "Cook",
    hours: 98,
    rate: 115_000,
    tips: 0,
    bonus: 50_000,
    paid: true,
  },
  {
    id: "staff-lan",
    role: "Cook",
    hours: 84,
    rate: 95_000,
    tips: 0,
    bonus: 0,
    paid: true,
  },
  {
    id: "staff-linh",
    role: "Waiter",
    hours: 88,
    rate: 55_000,
    tips: 3_400_000,
    bonus: 150_000,
    paid: false,
  },
  {
    id: "staff-minh",
    role: "Waiter",
    hours: 86,
    rate: 55_000,
    tips: 2_950_000,
    bonus: 100_000,
    paid: false,
  },
  {
    id: "staff-thao",
    role: "Bartender",
    hours: 80,
    rate: 60_000,
    tips: 1_550_000,
    bonus: 0,
    paid: false,
  },
  {
    id: "staff-an",
    role: "Bartender",
    hours: 64,
    rate: 55_000,
    tips: 1_100_000,
    bonus: 0,
    paid: false,
  },
  {
    id: "staff-tuan",
    role: "Bartender",
    hours: 56,
    rate: 55_000,
    tips: 950_000,
    bonus: 0,
    paid: false,
  },
];
export const paidStore = createStore<string[]>(
  "yanyin:paid",
  PAYROLL.filter((p) => p.paid).map((p) => p.id),
);

/** Upcoming payments: the owner's calendar of money going out. */
export const UPCOMING: {
  date: string;
  text: string;
  amount: number;
  kind: "rent" | "tax" | "payroll" | "supplier";
}[] = [
  {
    date: "15 Nov",
    text: "Payroll 1–15 November",
    amount: 68_400_000,
    kind: "payroll",
  },
  {
    date: "18 Nov",
    text: "Da Nang Meat Co. · invoice 1442",
    amount: 14_200_000,
    kind: "supplier",
  },
  { date: "20 Nov", text: "VAT for October", amount: 85_600_000, kind: "tax" },
  {
    date: "1 Dec",
    text: "Rent for December",
    amount: 120_000_000,
    kind: "rent",
  },
];

/** Money on hand now. */
export const BALANCES: { label: string; amount: number; note: string }[] = [
  {
    label: "Bank account · VPBank",
    amount: 412_800_000,
    note: "VietQR lands here the same day",
  },
  {
    label: "Card money on the way",
    amount: 18_300_000,
    note: "arrives next working day",
  },
  { label: "Safe", amount: 22_150_000, note: "counted at last closing" },
  { label: "MoMo wallet", amount: 3_900_000, note: "withdrawn on Mondays" },
];

/* ------------------------------------------------------------ Reports */

export type Period = "day" | "week" | "month" | "quarter" | "year";
export const PERIOD_DAYS: Record<Period, number> = {
  day: 1,
  week: 7,
  month: 30,
  quarter: 91,
  year: 365,
};

/** Takings of one day, by a day offset back from today (0 = today, 14 Nov 2026). */
export function dayTakings(back: number) {
  const d = new Date(2026, 10, 14 - back);
  const wd = d.getDay(); // 0 Sun
  const base = [47, 36, 34, 37, 41, 55, 62][wd]! * 1e6;
  return Math.round((base * (0.88 + rnd(`d${back}`) * 0.24)) / 1000) * 1000;
}
export const dayDate = (back: number) => new Date(2026, 10, 14 - back);

export type Refund = {
  date: string;
  bill: number;
  who: string;
  reason: string;
  amount: number;
  kind: "refund" | "discount";
};
export const REFUNDS: Refund[] = [
  {
    date: "13 Nov",
    bill: 1029,
    who: "huong",
    reason: "Birthday table · 10% off",
    amount: 145_000,
    kind: "discount",
  },
  {
    date: "11 Nov",
    bill: 987,
    who: "rustam",
    reason: "Cold soup · refunded the dish",
    amount: 180_000,
    kind: "refund",
  },
  {
    date: "9 Nov",
    bill: 954,
    who: "huong",
    reason: "Regular guest · 15% off",
    amount: 212_000,
    kind: "discount",
  },
  {
    date: "7 Nov",
    bill: 921,
    who: "rustam",
    reason: "Charged twice by card",
    amount: 640_000,
    kind: "refund",
  },
  {
    date: "4 Nov",
    bill: 877,
    who: "huong",
    reason: "Long wait · free dessert",
    amount: 95_000,
    kind: "discount",
  },
];
