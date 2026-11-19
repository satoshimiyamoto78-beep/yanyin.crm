import { createStore } from "./store";
import { RECIPES, STOCK, type StockItem } from "./demo-stock";

/*
 * Tech cards (техкарты): what one portion of a dish takes from stock, its
 * yield and the steps. Every sale writes the card off the stock (backend);
 * the cost of the card is the dish's cost price for margins and reports.
 */

export type TechLine = { item: string; qty: number };
export type TechCard = {
  lines: TechLine[];
  portion: number;
  steps: string;
  minutes: number;
};

export const techStore = createStore<Record<string, TechCard>>(
  "yanyin:techcards",
  {},
);

/** The saved card, else the seed recipe by the dish's English name, else an empty card. */
export function techCardFor(
  id: string,
  enName: string | undefined,
  saved: Record<string, TechCard>,
): TechCard {
  if (saved[id]) return saved[id];
  const r = RECIPES.find(
    (x) => x.dish.toLowerCase() === (enName ?? "").toLowerCase(),
  );
  if (!r) return { lines: [], portion: 0, steps: "", minutes: 10 };
  const lines = r.uses.map(([item, qty]) => ({ item, qty }));
  return {
    lines,
    portion: Math.round(lines.reduce((n, l) => n + l.qty * 1000, 0) * 0.85),
    steps: "",
    minutes: 12,
  };
}

export const stockOf = (id: string) =>
  STOCK.find((s) => s.id === id) as StockItem;
export const cardCost = (c: TechCard) =>
  Math.round(
    c.lines.reduce((n, l) => n + (stockOf(l.item)?.cost ?? 0) * l.qty, 0),
  );
/** Quantity as people read it: grams and millilitres for small amounts. */
export const qtyLabel = (
  qty: number,
  unit: string,
  tr: (s: string) => string,
) =>
  unit === "kg"
    ? `${Math.round(qty * 1000)} ${tr("g")}`
    : unit === "l"
      ? `${Math.round(qty * 1000)} ${tr("ml")}`
      : `${qty} ${tr("pcs")}`;
