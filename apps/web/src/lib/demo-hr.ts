import { createStore } from "./store";

/*
 * People operations (docs/11 · Team): what each role may do, requests
 * (time off, sick days, shift swaps), invitations and onboarding, pay terms
 * and the pay ledger (advances, bonuses, fines), documents with expiry dates,
 * 1:1 notes, and leaving. Demo rows; the backend keeps them per venue with
 * the permission checks on the server.
 */

export type Perm = {
  id: string;
  label: string;
  group: string;
  money?: boolean;
};
export const PERMS: Perm[] = [
  { id: "orders.take", label: "Take orders", group: "Hall" },
  { id: "orders.void", label: "Cancel a dish after it is sent", group: "Hall" },
  {
    id: "orders.discount",
    label: "Give a discount",
    group: "Hall",
    money: true,
  },
  { id: "orders.refund", label: "Make a refund", group: "Hall", money: true },
  { id: "orders.move", label: "Move or split bills", group: "Hall" },
  {
    id: "cash.drawer",
    label: "Open the cash drawer",
    group: "Money",
    money: true,
  },
  {
    id: "shift.close",
    label: "Open and close the shift",
    group: "Money",
    money: true,
  },
  {
    id: "station.screen",
    label: "Work on the station screen",
    group: "Kitchen",
  },
  { id: "stop.edit", label: "Mark dishes ran out", group: "Kitchen" },
  { id: "menu.edit", label: "Edit the menu and prices", group: "Admin" },
  { id: "stock.edit", label: "Stock, write-offs and orders", group: "Admin" },
  { id: "team.edit", label: "Invite and manage people", group: "Admin" },
  { id: "schedule.edit", label: "Make the schedule", group: "Admin" },
  { id: "reports.view", label: "See reports", group: "Owner", money: true },
  {
    id: "finance.view",
    label: "See finance and payroll",
    group: "Owner",
    money: true,
  },
  {
    id: "settings.money",
    label: "Payments, taxes and the plan",
    group: "Owner",
    money: true,
  },
];

export type RoleDef = {
  id: string;
  name: string;
  perms: string[];
  custom?: boolean;
};
const ALL = PERMS.map((p) => p.id);
export const SEED_ROLES: RoleDef[] = [
  { id: "owner", name: "Owner", perms: ALL },
  {
    id: "admin",
    name: "Admin",
    perms: ALL.filter(
      (p) =>
        ![
          "reports.view",
          "finance.view",
          "settings.money",
          "orders.refund",
        ].includes(p),
    ),
  },
  {
    id: "senior",
    name: "Senior waiter",
    perms: [
      "orders.take",
      "orders.void",
      "orders.discount",
      "orders.move",
      "cash.drawer",
      "stop.edit",
    ],
    custom: true,
  },
  { id: "waiter", name: "Waiter", perms: ["orders.take", "orders.move"] },
  {
    id: "bartender",
    name: "Bartender",
    perms: ["orders.take", "stop.edit", "cash.drawer"],
  },
  { id: "cook", name: "Cook", perms: ["stop.edit"] },
  { id: "host", name: "Host", perms: ["orders.take"] },
];
export const rolesStore = createStore<RoleDef[]>("yanyin:roles", SEED_ROLES);

export type Request = {
  id: string;
  person: string;
  kind: "vacation" | "sick" | "swap" | "dayoff";
  when: string;
  days: number;
  note: string;
  with?: string;
  status: "new" | "ok" | "no";
  at: string;
};
export const SEED_REQUESTS: Request[] = [
  {
    id: "r1",
    person: "staff-minh",
    kind: "swap",
    when: "Sat 21 Nov, 16–24",
    days: 1,
    note: "My sister's wedding",
    with: "staff-linh",
    status: "new",
    at: "today 11:20",
  },
  {
    id: "r2",
    person: "staff-thao",
    kind: "vacation",
    when: "1–7 Dec",
    days: 7,
    note: "Trip home to Huế",
    status: "new",
    at: "yesterday",
  },
  {
    id: "r3",
    person: "staff-lan",
    kind: "sick",
    when: "13 Nov",
    days: 1,
    note: "Fever, the doctor's note is attached",
    status: "ok",
    at: "13 Nov 07:10",
  },
  {
    id: "r4",
    person: "staff-an",
    kind: "dayoff",
    when: "Wed 18 Nov",
    days: 1,
    note: "Exam at the university",
    status: "new",
    at: "today 09:05",
  },
  {
    id: "r5",
    person: "staff-tuan",
    kind: "vacation",
    when: "24–26 Oct",
    days: 3,
    note: "",
    status: "ok",
    at: "10 Oct",
  },
];
export const requestsStore = createStore<Request[]>(
  "yanyin:requests",
  SEED_REQUESTS,
);

export type Invite = {
  id: string;
  name: string;
  phone: string;
  role: string;
  sent: string;
  status: "sent" | "opened" | "joined";
};
export const invitesStore = createStore<Invite[]>("yanyin:invites", [
  {
    id: "i1",
    name: "Quân",
    phone: "+84 905 221 774",
    role: "waiter",
    sent: "12 Nov",
    status: "opened",
  },
  {
    id: "i2",
    name: "Mai",
    phone: "+84 935 118 402",
    role: "cook",
    sent: "14 Nov",
    status: "sent",
  },
]);

export type PayType = "hourly" | "salary" | "shift";
export type LedgerRow = {
  at: string;
  kind: "advance" | "bonus" | "fine";
  amount: number;
  note: string;
};
export type DocFile = { name: string; url: string; type: string; at: string };
export type Doc = {
  kind: string;
  number?: string;
  expires?: string;
  daysLeft?: number;
  file?: DocFile;
};
/** Pay on top of the base: share of own sales, per-shift bonus, night, weekend and overtime rates, a monthly minimum. */
export type PayExtraKind =
  | "sales"
  | "perShift"
  | "night"
  | "weekend"
  | "overtime"
  | "minimum";
export type PayExtra = { kind: PayExtraKind; value: number };
export type HR = {
  joined: string;
  pay: PayType;
  rate: number;
  rates: { from: string; rate: number }[];
  extras?: PayExtra[];
  ledger: LedgerRow[];
  docs: Doc[];
  vacation: { total: number; used: number };
  probationUntil?: string;
  onboarding?: { step: string; done: boolean }[];
  notes: { at: string; text: string }[];
  left?: string;
};

/** A drawn page standing in for a scan in the demo (a real venue uploads photos and PDFs). */
export function demoScan(title: string, lines = 7): DocFile {
  const rows = Array.from(
    { length: lines },
    (_, i) =>
      `<rect x="48" y="${170 + i * 34}" width="${300 - ((i * 53) % 120)}" height="12" rx="6" fill="#d9dce3"/>`,
  ).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="560" viewBox="0 0 420 560"><rect width="420" height="560" fill="#fbfaf7"/><rect x="24" y="24" width="372" height="512" rx="10" fill="none" stroke="#e4e1da" stroke-width="2"/><rect x="48" y="56" width="64" height="64" rx="12" fill="#2f5bff" opacity=".14"/><text x="128" y="84" font-family="Arial" font-size="20" font-weight="700" fill="#14151a">${title}</text><text x="128" y="110" font-family="Arial" font-size="13" fill="#8a8d96">Da Nang · 2026</text>${rows}<circle cx="320" cy="470" r="36" fill="none" stroke="#e5484d" stroke-width="3" opacity=".6"/><rect x="48" y="462" width="140" height="2" fill="#14151a" opacity=".5"/></svg>`;
  return {
    name: `${title.toLowerCase().replace(/\W+/g, "-")}.jpg`,
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    type: "image/svg+xml",
    at: "Oct 2026",
  };
}
const docs = (health: number, contract = 210): Doc[] => [
  {
    kind: "Passport or ID",
    number: "•••• 4821",
    file: demoScan("Citizen ID", 5),
  },
  {
    kind: "Health certificate",
    expires: health < 0 ? "2 Nov" : health < 30 ? "8 Dec" : "Mar 2027",
    daysLeft: health,
    file: health >= 0 ? demoScan("Health certificate") : undefined,
  },
  {
    kind: "Work contract",
    expires: "Jun 2027",
    daysLeft: contract,
    file: demoScan("Labour contract", 9),
  },
];
export const SEED_HR: Record<string, HR> = {
  "staff-huong": {
    joined: "Mar 2024",
    pay: "salary",
    rate: 22_000_000,
    rates: [
      { from: "Mar 2024", rate: 18_000_000 },
      { from: "Jan 2025", rate: 20_000_000 },
      { from: "Jul 2026", rate: 22_000_000 },
    ],
    ledger: [],
    docs: docs(140),
    vacation: { total: 14, used: 6 },
    notes: [
      {
        at: "1 Nov",
        text: "Wants to run the second venue next year. Start training her on purchasing.",
      },
    ],
  },
  "staff-linh": {
    joined: "Aug 2024",
    pay: "hourly",
    rate: 55_000,
    rates: [
      { from: "Aug 2024", rate: 45_000 },
      { from: "Feb 2026", rate: 55_000 },
    ],
    extras: [
      { kind: "sales", value: 2 },
      { kind: "night", value: 30 },
    ],
    ledger: [
      {
        at: "10 Nov",
        kind: "bonus",
        amount: 150_000,
        note: "Quest: Lemonade week",
      },
      {
        at: "3 Nov",
        kind: "advance",
        amount: 1_000_000,
        note: "Asked before the 15th",
      },
    ],
    docs: docs(24),
    vacation: { total: 12, used: 3 },
    notes: [
      {
        at: "28 Oct",
        text: "Best upseller. Ready for senior waiter in December.",
      },
    ],
  },
  "staff-minh": {
    joined: "Jan 2025",
    pay: "hourly",
    rate: 55_000,
    rates: [
      { from: "Jan 2025", rate: 50_000 },
      { from: "Jun 2026", rate: 55_000 },
    ],
    ledger: [
      {
        at: "7 Nov",
        kind: "fine",
        amount: 100_000,
        note: "Late 25 min without a call",
      },
    ],
    docs: docs(-12),
    vacation: { total: 12, used: 8 },
    notes: [],
  },
  "staff-thao": {
    joined: "May 2024",
    pay: "hourly",
    rate: 60_000,
    rates: [
      { from: "May 2024", rate: 52_000 },
      { from: "Jan 2026", rate: 60_000 },
    ],
    ledger: [],
    docs: docs(200),
    vacation: { total: 12, used: 2 },
    notes: [],
  },
  "staff-an": {
    joined: "Oct 2026",
    pay: "hourly",
    rate: 50_000,
    rates: [{ from: "Oct 2026", rate: 50_000 }],
    ledger: [],
    docs: [
      { kind: "Passport or ID", number: "•••• 9017" },
      { kind: "Health certificate" },
      { kind: "Work contract", expires: "Apr 2027", daysLeft: 150 },
    ],
    vacation: { total: 12, used: 0 },
    probationUntil: "20 Dec",
    onboarding: [
      { step: "Account and @ID", done: true },
      { step: "Tour of the bar and the stock", done: true },
      { step: "Menu test: 30 drinks", done: true },
      { step: "Three shifts with a buddy (@thao_bar)", done: false },
      { step: "Cash drawer and the shift close", done: false },
      { step: "Health certificate", done: false },
    ],
    notes: [],
  },
  "staff-tuan": {
    joined: "Feb 2025",
    pay: "shift",
    rate: 450_000,
    rates: [
      { from: "Feb 2025", rate: 400_000 },
      { from: "Apr 2026", rate: 450_000 },
    ],
    extras: [
      { kind: "perShift", value: 50_000 },
      { kind: "weekend", value: 20 },
    ],
    ledger: [],
    docs: docs(65),
    vacation: { total: 12, used: 5 },
    notes: [],
  },
  "staff-dima": {
    joined: "Nov 2023",
    pay: "salary",
    rate: 24_000_000,
    rates: [
      { from: "Nov 2023", rate: 20_000_000 },
      { from: "Jan 2026", rate: 24_000_000 },
    ],
    ledger: [
      {
        at: "1 Nov",
        kind: "bonus",
        amount: 500_000,
        note: "Clean kitchen inspection",
      },
    ],
    docs: [
      ...docs(90),
      { kind: "Work permit (foreigner)", expires: "15 Jan", daysLeft: 62 },
    ],
    vacation: { total: 14, used: 10 },
    notes: [],
  },
  "staff-lan": {
    joined: "Jul 2025",
    pay: "hourly",
    rate: 70_000,
    rates: [
      { from: "Jul 2025", rate: 65_000 },
      { from: "Jul 2026", rate: 70_000 },
    ],
    ledger: [],
    docs: docs(12),
    vacation: { total: 12, used: 4 },
    notes: [],
  },
};
export const hrStore = createStore<Record<string, HR>>("yanyin:hr", SEED_HR);

/** Per-person exceptions to their roles' rights (true: allowed, false: taken away). */
export const overridesStore = createStore<
  Record<string, Record<string, boolean>>
>("yanyin:perm-overrides", {});

/*
 * Joining (docs/07 §93): the venue has one team link. A person installs the
 * staff app, signs in with their phone, opens the link and asks to join; an
 * admin approves and picks the roles. Access lasts until they are let go or
 * removed. A personal invite is the same link sent to one phone with the
 * roles chosen in advance, so it joins without a request.
 */
export type TeamLink = {
  code: string;
  open: boolean;
  approve: boolean;
  role: string;
  joined: number;
};
export const teamLinkStore = createStore<TeamLink>("yanyin:team-link", {
  code: "8F2K",
  open: true,
  approve: true,
  role: "waiter",
  joined: 9,
});
export type JoinRequest = {
  id: string;
  name: string;
  handle: string;
  phone: string;
  wants: string;
  at: string;
  status: "new" | "ok" | "no";
};
export const joinStore = createStore<JoinRequest[]>("yanyin:join-requests", [
  {
    id: "j1",
    name: "Phúc",
    handle: "phuc_hall",
    phone: "+84 905 663 120",
    wants: "waiter",
    at: "today 12:40",
    status: "new",
  },
  {
    id: "j2",
    name: "Vy",
    handle: "vy.kitchen",
    phone: "+84 934 557 018",
    wants: "cook",
    at: "yesterday",
    status: "new",
  },
]);
