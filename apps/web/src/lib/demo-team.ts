import type { ChecklistRun, ChecklistTemplate, Person } from "@yanyin/domain";

/*
 * Demo team of the pilot venue, each with their @ID, roles and stations, and
 * the shift checklists. The backend replaces this with real staff profiles.
 * Three bartenders share the bar: tickets go to the bar, one of them takes it.
 */
export const TEAM: Person[] = [
  { id: "staff-linh", handle: "linh", name: "Linh", roles: ["waiter"], stations: ["hall"], onShift: true },
  { id: "staff-minh", handle: "minh", name: "Minh", roles: ["waiter"], stations: ["hall"], onShift: true },
  { id: "staff-thao", handle: "thao_bar", name: "Thảo", roles: ["bartender"], stations: ["bar"], onShift: true },
  { id: "staff-an", handle: "an_bar", name: "An", roles: ["bartender"], stations: ["bar"], onShift: true },
  { id: "staff-tuan", handle: "tuan_bar", name: "Tuấn", roles: ["bartender"], stations: ["bar"], onShift: false },
  { id: "staff-dima", handle: "chef_dima", name: "Dima", roles: ["cook"], stations: ["hot", "grill"], onShift: true },
  { id: "staff-lan", handle: "lan_cold", name: "Lan", roles: ["cook"], stations: ["cold", "pastry"], onShift: true },
  { id: "staff-huong", handle: "huong", name: "Hương", roles: ["admin", "manager"], stations: ["hall"], onShift: true },
  { id: "staff-owner", handle: "rustam", name: "Rustam", roles: ["owner"], stations: [], onShift: false },
];

export const personById = (id: string) => TEAM.find((p) => p.id === id);

/** The waiter's shift list, set up by the admin. */
export const WAITER_CHECKLIST: ChecklistTemplate = {
  id: "waiter-shift",
  title: "Waiter shift",
  role: "waiter",
  xp: 120,
  items: [
    { id: "wipe", title: "Wipe tables and chairs in your zone", phase: "open", due: "10:30" },
    { id: "cutlery", title: "Lay cutlery and napkins", phase: "open", due: "10:30" },
    { id: "qr", title: "Check the QR plates on every table", phase: "open" },
    { id: "station", title: "Fill the station: water, ice, lemons", phase: "open", due: "11:00" },
    { id: "fridge", title: "Drinks fridge temperature", phase: "open", proof: { kind: "number", unit: "°C", min: 1, max: 5 } },
    { id: "rounds", title: "Walk your tables every 15 minutes", phase: "during", required: false },
    { id: "napkins", title: "Refill napkin holders before the evening", phase: "during", due: "18:00" },
    { id: "bills", title: "Close every bill on your tables", phase: "close" },
    { id: "photo", title: "Photo of your station after the shift", phase: "close", proof: { kind: "photo" } },
    { id: "tips", title: "Hand the cash tips to the pool", phase: "close" },
  ],
};

/** Today's run: the morning part is done (one item late), the rest is open. */
export const WAITER_RUN: ChecklistRun = {
  templateId: "waiter-shift",
  personId: "staff-linh",
  date: "today",
  marks: {
    wipe: { at: "10:12", by: "staff-linh" },
    cutlery: { at: "10:20", by: "staff-linh" },
    qr: { at: "10:24", by: "staff-linh" },
    station: { at: "11:06", by: "staff-linh" },
  },
};

/** Who set the list up, shown on it. */
export const CHECKLIST_OWNER = "staff-huong";
