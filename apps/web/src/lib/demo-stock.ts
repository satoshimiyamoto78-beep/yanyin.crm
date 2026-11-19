import { createStore } from "./store";

/*
 * Demo stock of the pilot venue: what is on the shelves, how fast it goes,
 * who supplies it, which dishes use it (tech cards), and the purchase orders.
 * The backend replaces this with stock tables fed by sales (each sold dish
 * writes off its tech card), deliveries and counts.
 */

export type StockCat = "Meat" | "Vegetables" | "Dry goods" | "Dairy" | "Drinks";
export type Unit = "kg" | "l" | "pcs";

export type StockItem = {
  id: string;
  name: string;
  cat: StockCat;
  unit: Unit;
  /** Level that should trigger a purchase. */
  min: number;
  /** Average use per day from the last two weeks of sales. */
  perDay: number;
  /** Price per unit, in VND. */
  cost: number;
  supplier: string;
};

export type Supplier = {
  id: string;
  name: string;
  phone: string;
  days: string;
  cats: StockCat[];
};

export type Movement = {
  at: string;
  kind: "sale" | "delivery" | "writeoff" | "count";
  qty: number;
  note: string;
};

export type PurchaseLine = { item: string; qty: number };
export type Purchase = {
  id: string;
  supplier: string;
  status: "draft" | "sent" | "received";
  at: string;
  lines: PurchaseLine[];
};

export const SUPPLIERS: Supplier[] = [
  {
    id: "meat",
    name: "Da Nang Meat Co.",
    phone: "+84 905 111 202",
    days: "Mon · Wed · Fri",
    cats: ["Meat"],
  },
  {
    id: "greens",
    name: "Han Market Greens",
    phone: "+84 905 333 404",
    days: "Every morning",
    cats: ["Vegetables"],
  },
  {
    id: "metro",
    name: "MM Mega Market",
    phone: "+84 236 3 666 888",
    days: "Tue · Sat",
    cats: ["Dry goods"],
  },
  {
    id: "dalat",
    name: "Dalat Milk",
    phone: "+84 263 3 822 822",
    days: "Thu",
    cats: ["Dairy"],
  },
  {
    id: "drinks",
    name: "Bia & Nước Đà Nẵng",
    phone: "+84 905 777 808",
    days: "Mon · Thu",
    cats: ["Drinks"],
  },
];

export const STOCK: StockItem[] = [
  {
    id: "lamb",
    name: "Lamb",
    cat: "Meat",
    unit: "kg",
    min: 10,
    perDay: 6,
    cost: 280_000,
    supplier: "meat",
  },
  {
    id: "beef",
    name: "Beef",
    cat: "Meat",
    unit: "kg",
    min: 8,
    perDay: 4,
    cost: 260_000,
    supplier: "meat",
  },
  {
    id: "chicken",
    name: "Chicken",
    cat: "Meat",
    unit: "kg",
    min: 6,
    perDay: 4.5,
    cost: 95_000,
    supplier: "meat",
  },
  {
    id: "rice",
    name: "Devzira rice",
    cat: "Dry goods",
    unit: "kg",
    min: 15,
    perDay: 5,
    cost: 60_000,
    supplier: "metro",
  },
  {
    id: "flour",
    name: "Flour",
    cat: "Dry goods",
    unit: "kg",
    min: 20,
    perDay: 4,
    cost: 18_000,
    supplier: "metro",
  },
  {
    id: "oil",
    name: "Cotton oil",
    cat: "Dry goods",
    unit: "l",
    min: 8,
    perDay: 2,
    cost: 45_000,
    supplier: "metro",
  },
  {
    id: "carrot",
    name: "Yellow carrot",
    cat: "Vegetables",
    unit: "kg",
    min: 8,
    perDay: 3,
    cost: 25_000,
    supplier: "greens",
  },
  {
    id: "onion",
    name: "Onion",
    cat: "Vegetables",
    unit: "kg",
    min: 10,
    perDay: 3.5,
    cost: 20_000,
    supplier: "greens",
  },
  {
    id: "tomato",
    name: "Tomatoes",
    cat: "Vegetables",
    unit: "kg",
    min: 5,
    perDay: 2,
    cost: 30_000,
    supplier: "greens",
  },
  {
    id: "cucumber",
    name: "Cucumbers",
    cat: "Vegetables",
    unit: "kg",
    min: 4,
    perDay: 1.5,
    cost: 25_000,
    supplier: "greens",
  },
  {
    id: "herbs",
    name: "Herbs",
    cat: "Vegetables",
    unit: "kg",
    min: 1,
    perDay: 0.6,
    cost: 80_000,
    supplier: "greens",
  },
  {
    id: "cheese",
    name: "Cheese",
    cat: "Dairy",
    unit: "kg",
    min: 3,
    perDay: 0.8,
    cost: 220_000,
    supplier: "dalat",
  },
  {
    id: "cream",
    name: "Cream",
    cat: "Dairy",
    unit: "l",
    min: 3,
    perDay: 1,
    cost: 90_000,
    supplier: "dalat",
  },
  {
    id: "cola",
    name: "Coca-Cola 330 ml",
    cat: "Drinks",
    unit: "pcs",
    min: 36,
    perDay: 20,
    cost: 9_000,
    supplier: "drinks",
  },
  {
    id: "water",
    name: "LaVie water",
    cat: "Drinks",
    unit: "pcs",
    min: 48,
    perDay: 25,
    cost: 5_000,
    supplier: "drinks",
  },
  {
    id: "beer",
    name: "Larue beer",
    cat: "Drinks",
    unit: "pcs",
    min: 48,
    perDay: 30,
    cost: 15_000,
    supplier: "drinks",
  },
];

/** Tech cards: what one portion of a dish takes from stock (written off on every sale). */
export const RECIPES: { dish: string; uses: [string, number][] }[] = [
  {
    dish: "Samarkand plov",
    uses: [
      ["rice", 0.15],
      ["lamb", 0.12],
      ["carrot", 0.1],
      ["onion", 0.05],
      ["oil", 0.03],
    ],
  },
  {
    dish: "Fatir shurpa",
    uses: [
      ["lamb", 0.15],
      ["carrot", 0.05],
      ["onion", 0.04],
      ["flour", 0.08],
    ],
  },
  {
    dish: "Lamb shashlik",
    uses: [
      ["lamb", 0.25],
      ["onion", 0.05],
    ],
  },
  {
    dish: "Beef shashlik",
    uses: [
      ["beef", 0.25],
      ["onion", 0.05],
    ],
  },
  {
    dish: "Chicken wings",
    uses: [
      ["chicken", 0.3],
      ["oil", 0.02],
    ],
  },
  {
    dish: "Caesar with chicken",
    uses: [
      ["chicken", 0.1],
      ["cheese", 0.02],
      ["tomato", 0.05],
    ],
  },
  {
    dish: "Tomato and cucumber salad",
    uses: [
      ["tomato", 0.2],
      ["cucumber", 0.1],
      ["herbs", 0.02],
    ],
  },
  { dish: "Tandoor flatbread", uses: [["flour", 0.2]] },
  {
    dish: "Creamy mushroom soup",
    uses: [
      ["cream", 0.12],
      ["onion", 0.03],
    ],
  },
];

const QTY: Record<string, number> = {
  lamb: 18.5,
  beef: 9,
  chicken: 14,
  rice: 22,
  flour: 30,
  oil: 12,
  carrot: 6,
  onion: 9,
  tomato: 7,
  cucumber: 4,
  herbs: 1.2,
  cheese: 3.5,
  cream: 5,
  cola: 48,
  water: 30,
  beer: 60,
};

/** Levels on the shelf now (changes with deliveries, write-offs and counts). */
export const stockStore = createStore<Record<string, number>>(
  "yanyin:stock",
  QTY,
);

/** Every change to stock, newest first. */
export const movementsStore = createStore<Record<string, Movement[]>>(
  "yanyin:stock-moves",
  {
    lamb: [
      {
        at: "Today 12:40",
        kind: "sale",
        qty: -2.4,
        note: "Sales since opening",
      },
      {
        at: "Today 09:10",
        kind: "delivery",
        qty: 20,
        note: "Da Nang Meat Co. · PO-0140",
      },
      { at: "Yesterday", kind: "sale", qty: -6.2, note: "Sales of the day" },
      { at: "Yesterday", kind: "count", qty: -0.4, note: "Evening count" },
    ],
  },
);

export const purchasesStore = createStore<Purchase[]>("yanyin:purchases", [
  {
    id: "PO-0142",
    supplier: "greens",
    status: "sent",
    at: "Today 08:30",
    lines: [
      { item: "tomato", qty: 6 },
      { item: "herbs", qty: 1 },
    ],
  },
  {
    id: "PO-0141",
    supplier: "drinks",
    status: "draft",
    at: "Today 11:05",
    lines: [{ item: "cola", qty: 48 }],
  },
  {
    id: "PO-0140",
    supplier: "meat",
    status: "received",
    at: "Today 09:10",
    lines: [
      { item: "lamb", qty: 20 },
      { item: "beef", qty: 10 },
    ],
  },
]);

export const daysLeft = (qty: number, perDay: number) =>
  perDay > 0 ? qty / perDay : Infinity;
/** What Yan suggests ordering: enough for five days on top of the minimum, rounded to a sensible pack. */
export const suggestQty = (it: StockItem, qty: number) => {
  const need = it.perDay * 5 + it.min - qty;
  const step = it.unit === "pcs" ? 24 : it.unit === "l" ? 5 : 1;
  return need > 0 ? Math.ceil(need / step) * step : 0;
};
