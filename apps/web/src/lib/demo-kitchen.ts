import { allItems, stationFor, type ChecklistRun, type I18nText, type ChecklistTemplate, type Menu, type MenuItem, type Station } from "@yanyin/domain";

/*
 * Demo data for the station screen (bar and kitchen). Samarkand runs three
 * stations: the hot kitchen (with the grill and tandoor), the cold kitchen
 * (salads, starters, desserts) and the bar (every drink, tea and coffee).
 * Orders arrive per table; each line goes to its station; the whole station
 * works the queue together (ADR-014).
 */

export type KdsState = "new" | "making" | "ready";
export type KdsLine = { id: string; itemId: string; name: I18nText; qty: number; station: Station; state: KdsState; note?: string };
export type KdsOrder = { id: string; table: number; waiter: string; at: string; lines: KdsLine[]; guest?: boolean };

/** This venue's stations and which default stations they absorb. */
export const VENUE_STATIONS: { id: Station; label: string; art: "kitchen" | "salad" | "drink"; absorbs: Station[] }[] = [
  { id: "hot", label: "Hot kitchen", art: "kitchen", absorbs: ["hot", "grill"] },
  { id: "cold", label: "Cold kitchen", art: "salad", absorbs: ["cold", "pastry"] },
  { id: "bar", label: "Bar", art: "drink", absorbs: ["bar", "hookah"] },
];

/** Where an item is made in this venue: its default station, merged into one of ours. Tandoor bread goes to the hot kitchen. */
export function venueStation(menu: Menu, item: MenuItem): Station {
  const cat = menu.categories.find((c) => c.id === item.categoryId);
  const role = cat?.role ?? "main";
  const base = /tandoor|pastr/i.test(cat?.name.en ?? "") ? "hot" : stationFor(role);
  return VENUE_STATIONS.find((s) => s.absorbs.includes(base))?.id ?? "hot";
}

let seq = 0;
const lineOf = (menu: Menu, it: MenuItem, qty: number, state: KdsState, note?: string): KdsLine => ({
  id: `k${++seq}`,
  itemId: it.id,
  name: it.name,
  qty,
  station: venueStation(menu, it),
  state,
  note,
});

/** The queue at 12:45 and a pool of orders that keep arriving. */
export function demoKitchen(menu: Menu) {
  const items = allItems(menu).filter((i) => i.price > 0);
  const find = (re: RegExp) => items.find((i) => re.test(i.name.en ?? "")) ?? items[0]!;
  const L = (re: RegExp, qty: number, state: KdsState = "new", note?: string) => lineOf(menu, find(re), qty, state, note);

  const orders: KdsOrder[] = [
    { id: "o1", table: 10, waiter: "linh", at: "12:27", lines: [L(/lamb shashlik/i, 2, "making"), L(/bread|lepyoshka/i, 1, "ready"), L(/lemonade/i, 2, "ready")] },
    { id: "o2", table: 7, waiter: "minh", at: "12:35", guest: true, lines: [L(/shurpa|fatir/i, 2, "making"), L(/samsa/i, 2, "new", "One without onion"), L(/green tea|tea/i, 1, "making")] },
    { id: "o3", table: 2, waiter: "linh", at: "12:38", lines: [L(/achichuk|tomato/i, 1, "new"), L(/plov/i, 1, "new"), L(/espresso|americano|coffee/i, 2, "new")] },
    { id: "o4", table: 5, waiter: "minh", at: "12:42", guest: true, lines: [L(/beef shashlik/i, 2, "new", "Medium"), L(/salad/i, 1, "new"), L(/mango|smoothie/i, 2, "new"), L(/cola|soft/i, 1, "new")] },
    { id: "o5", table: 12, waiter: "linh", at: "12:44", lines: [L(/baklava|honey|chak/i, 2, "new"), L(/tea/i, 2, "new")] },
  ];

  const pool: { table: number; waiter: string; guest?: boolean; lines: [RegExp, number, string?][] }[] = [
    { table: 3, waiter: "minh", guest: true, lines: [[/lagman/i, 2], [/tarragon|lemonade/i, 2]] },
    { table: 8, waiter: "linh", lines: [[/lamb shashlik/i, 4, "Two well done"], [/bread|lepyoshka/i, 2], [/salad/i, 2], [/beer|saigon/i, 4]] },
    { table: 11, waiter: "minh", guest: true, lines: [[/manti/i, 2], [/latte|cappuccino|coffee/i, 2]] },
    { table: 6, waiter: "linh", lines: [[/plov/i, 3], [/achichuk|tomato/i, 1], [/tea/i, 1]] },
  ];
  const nextOrder = (k: number, at: string): KdsOrder => {
    const p = pool[k % pool.length]!;
    return { id: `n${k}`, table: p.table, waiter: p.waiter, at, guest: p.guest, lines: p.lines.map(([re, q, note]) => L(re, q, "new", note)) };
  };
  return { orders, nextOrder };
}

/** The bar's opening and closing list. */
export const BAR_CHECKLIST: ChecklistTemplate = {
  id: "bar-shift",
  title: "Bar shift",
  station: "bar",
  xp: 100,
  items: [
    { id: "ice", title: "Fill the ice machine and bins", phase: "open", due: "10:00" },
    { id: "fruit", title: "Cut lemons, limes and mint", phase: "open", due: "10:30" },
    { id: "fridge", title: "Bar fridge temperature", phase: "open", proof: { kind: "number", unit: "°C", min: 1, max: 5 } },
    { id: "syrups", title: "Check syrups and juices dates", phase: "open" },
    { id: "glass", title: "Polish glasses for the evening", phase: "during", due: "17:00" },
    { id: "clean", title: "Wash the shakers and the coffee machine", phase: "close" },
    { id: "photo", title: "Photo of the bar after the shift", phase: "close", proof: { kind: "photo" } },
  ],
};

/** The kitchen's list. */
export const KITCHEN_CHECKLIST: ChecklistTemplate = {
  id: "kitchen-shift",
  title: "Kitchen shift",
  station: "hot",
  xp: 100,
  items: [
    { id: "fridges", title: "Cold room temperature", phase: "open", proof: { kind: "number", unit: "°C", min: 0, max: 4 } },
    { id: "prep", title: "Prep: onions, carrots, dough", phase: "open", due: "10:30" },
    { id: "dates", title: "Label everything with today's date", phase: "open" },
    { id: "oil", title: "Change the fryer oil if dark", phase: "during", required: false },
    { id: "clean", title: "Clean the grill and the tandoor", phase: "close" },
    { id: "photo", title: "Photo of the line after the shift", phase: "close", proof: { kind: "photo" } },
  ],
};

export const BAR_RUN: ChecklistRun = { templateId: "bar-shift", personId: "staff-thao", date: "today", marks: { ice: { at: "09:52", by: "staff-thao" }, fruit: { at: "10:18", by: "staff-an" }, fridge: { at: "10:20", by: "staff-an", value: "3" }, syrups: { at: "10:25", by: "staff-thao" } } };
export const KITCHEN_RUN: ChecklistRun = { templateId: "kitchen-shift", personId: "staff-dima", date: "today", marks: { fridges: { at: "09:40", by: "staff-dima", value: "3" }, prep: { at: "10:41", by: "staff-dima" } } };
