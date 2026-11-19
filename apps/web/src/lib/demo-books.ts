import { createStore } from "./store";
import { dayTakings, rnd } from "./demo-money";

/*
 * The owner's books beyond the P&L (docs/11 · Finance): money accounts and
 * their movements (transfers, bank reconciliation), expenses and supplier
 * bills with statuses and due dates (some repeat monthly), the month's
 * budget per line, and month closing. Demo rows; the backend keeps these as
 * a ledger (every movement has two sides) per venue.
 */

export type AccountId = "bank" | "safe" | "drawer" | "acquiring" | "momo";
export type Account = {
  id: AccountId;
  name: string;
  kind: string;
  open: number;
};
export const ACCOUNTS: Account[] = [
  {
    id: "bank",
    name: "VPBank · current account",
    kind: "Bank",
    open: 386_400_000,
  },
  { id: "safe", name: "Safe", kind: "Cash", open: 18_000_000 },
  { id: "drawer", name: "Shift cash drawer", kind: "Cash", open: 2_000_000 },
  {
    id: "acquiring",
    name: "Card money on the way",
    kind: "In transit",
    open: 14_100_000,
  },
  { id: "momo", name: "MoMo wallet", kind: "E-wallet", open: 2_600_000 },
];

export type Move = {
  id: string;
  at: string;
  account: AccountId;
  amount: number;
  text: string;
  kind: "in" | "out" | "transfer";
  matched?: boolean;
};

/** The last ten days of money movements, newest first. */
export const SEED_MOVES: Move[] = (() => {
  const out: Move[] = [];
  const card = (d: number) => Math.round(dayTakings(d) * 0.28);
  const cash = (d: number) => Math.round(dayTakings(d) * 0.21);
  for (let d = 0; d < 10; d++) {
    const date = `${14 - d} Nov`;
    out.push({
      id: `qr${d}`,
      at: date,
      account: "bank",
      amount: Math.round(dayTakings(d) * 0.46),
      text: "VietQR takings",
      kind: "in",
      matched: d > 0,
    });
    out.push({
      id: `cd${d}`,
      at: date,
      account: "acquiring",
      amount: card(d),
      text: "Card takings",
      kind: "in",
    });
    // Yesterday's cards arrive today, less the acquirer's 2.2%.
    out.push({
      id: `ao${d}`,
      at: date,
      account: "acquiring",
      amount: -card(d + 1),
      text: "Paid out to the bank",
      kind: "transfer",
    });
    out.push({
      id: `ai${d}`,
      at: date,
      account: "bank",
      amount: Math.round(card(d + 1) * 0.978),
      text: "Card payout from the acquirer",
      kind: "in",
      matched: d > 1,
    });
    out.push({
      id: `ca${d}`,
      at: date,
      account: "drawer",
      amount: cash(d),
      text: "Cash takings",
      kind: "in",
    });
    if (d > 0) {
      out.push({
        id: `do${d}`,
        at: date,
        account: "drawer",
        amount: -cash(d),
        text: "From the drawer to the safe",
        kind: "transfer",
      });
      out.push({
        id: `si${d}`,
        at: date,
        account: "safe",
        amount: cash(d),
        text: "From the drawer to the safe",
        kind: "transfer",
      });
    }
    if (d % 3 === 1) {
      const sum = Math.round(cash(d) * 2.4);
      out.push({
        id: `so${d}`,
        at: date,
        account: "safe",
        amount: -sum,
        text: "Cash to the bank",
        kind: "transfer",
      });
      out.push({
        id: `bi${d}`,
        at: date,
        account: "bank",
        amount: sum,
        text: "Cash to the bank",
        kind: "in",
        matched: d > 2,
      });
    }
    if (d % 4 === 2)
      out.push({
        id: `sp${d}`,
        at: date,
        account: "bank",
        amount: -Math.round(8e6 + rnd(`sp${d}`) * 12e6),
        text:
          d % 8 === 2
            ? "Da Nang Meat Co. · invoice"
            : "Han Market Greens · invoice",
        kind: "out",
        matched: d > 2,
      });
  }
  out.push({
    id: "rent",
    at: "1 Nov",
    account: "bank",
    amount: -120_000_000,
    text: "Rent for November",
    kind: "out",
    matched: true,
  });
  out.push({
    id: "vat",
    at: "10 Nov",
    account: "bank",
    amount: -79_200_000,
    text: "VAT for September",
    kind: "out",
    matched: true,
  });
  return out;
})();
export const movesStore = createStore<Move[]>("yanyin:moves", SEED_MOVES);

export const balanceOf = (id: AccountId, moves: Move[]) => {
  const a = ACCOUNTS.find((x) => x.id === id)!;
  return moves
    .filter((m) => m.account === id)
    .reduce((n, m) => n + m.amount, a.open);
};

export type Expense = {
  id: string;
  date: string;
  due: string;
  /** Days until due (negative: overdue) in the demo's today. */
  dueIn: number;
  who: string;
  line: string;
  amount: number;
  status: "paid" | "due";
  doc?: string;
  repeat?: "monthly";
  from?: "purchase";
};
export const SEED_EXPENSES: Expense[] = [
  {
    id: "e1",
    date: "13 Nov",
    due: "18 Nov",
    dueIn: 4,
    who: "Da Nang Meat Co.",
    line: "food",
    amount: 14_200_000,
    status: "due",
    doc: "e-invoice 1442",
    from: "purchase",
  },
  {
    id: "e2",
    date: "12 Nov",
    due: "15 Nov",
    dueIn: 1,
    who: "Han Market Greens",
    line: "food",
    amount: 3_850_000,
    status: "due",
    doc: "e-invoice 0931",
    from: "purchase",
  },
  {
    id: "e3",
    date: "8 Nov",
    due: "12 Nov",
    dueIn: -2,
    who: "Bia & Nước Đà Nẵng",
    line: "drinks",
    amount: 6_480_000,
    status: "due",
    doc: "e-invoice 2207",
    from: "purchase",
  },
  {
    id: "e4",
    date: "10 Nov",
    due: "20 Nov",
    dueIn: 6,
    who: "EVN Đà Nẵng",
    line: "power",
    amount: 11_700_000,
    status: "due",
    doc: "e-invoice",
    repeat: "monthly",
  },
  {
    id: "e5",
    date: "1 Nov",
    due: "1 Dec",
    dueIn: 17,
    who: "An Thượng Properties",
    line: "rent",
    amount: 120_000_000,
    status: "due",
    repeat: "monthly",
  },
  {
    id: "e6",
    date: "1 Nov",
    due: "1 Nov",
    dueIn: -13,
    who: "An Thượng Properties",
    line: "rent",
    amount: 120_000_000,
    status: "paid",
    repeat: "monthly",
  },
  {
    id: "e7",
    date: "5 Nov",
    due: "5 Nov",
    dueIn: -9,
    who: "Instagram ads",
    line: "marketing",
    amount: 7_000_000,
    status: "paid",
    repeat: "monthly",
  },
  {
    id: "e8",
    date: "9 Nov",
    due: "9 Nov",
    dueIn: -5,
    who: "Fridge repair",
    line: "supplies",
    amount: 2_400_000,
    status: "paid",
    doc: "receipt",
  },
  {
    id: "e9",
    date: "1 Nov",
    due: "1 Nov",
    dueIn: -13,
    who: "yanyin Pro",
    line: "software",
    amount: 2_900_000,
    status: "paid",
    repeat: "monthly",
  },
  {
    id: "e10",
    date: "11 Nov",
    due: "25 Nov",
    dueIn: 11,
    who: "MM Mega Market",
    line: "food",
    amount: 9_320_000,
    status: "due",
    doc: "e-invoice 7781",
    from: "purchase",
  },
];
export const expensesStore = createStore<Expense[]>(
  "yanyin:expenses-v2",
  SEED_EXPENSES,
);

/** The month's plan per P&L line (what the owner allows), in VND. */
export const SEED_BUDGET: Record<string, number> = {
  food: 345_000_000,
  drinks: 78_000_000,
  wages: 232_000_000,
  bonus: 8_000_000,
  insurance: 36_000_000,
  rent: 120_000_000,
  power: 30_000_000,
  gas: 8_000_000,
  fees: 17_000_000,
  supplies: 40_000_000,
  marketing: 15_000_000,
  software: 2_900_000,
};
export const budgetStore = createStore<Record<string, number>>(
  "yanyin:budget",
  SEED_BUDGET,
);

/** Months the owner closed (no more changes; the accountant gets the package). */
export const closedStore = createStore<string[]>("yanyin:closed-months", [
  "Jun",
  "Jul",
  "Aug",
  "Sep",
]);
