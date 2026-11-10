import { allItems } from "./normalize";
import type { CategoryRole, Menu, MenuItem } from "./types";

export type Mood = "hungry" | "light" | "adventurous" | "chill" | "meat" | "soup" | "sweet" | "snack" | "drinks" | "share";

/** Which course slots a mood fills, in order. Each slot lists acceptable category roles. */
const SLOTS: Record<Mood, CategoryRole[][]> = {
  hungry: [["main", "grill", "pasta"], ["side", "salad", "pastry"], ["drink"]],
  light: [["salad", "soup"], ["drink", "hot_drink"]],
  adventurous: [["main", "grill", "soup", "pasta"], ["starter", "salad", "pastry"], ["dessert"], ["drink", "hot_drink"]],
  chill: [["hookah"], ["drink", "alcohol"], ["snack"]],
  // Grill first, something fresh next to it.
  meat: [["grill"], ["salad", "side"], ["pastry", "side"], ["drink", "alcohol"]],
  // A bowl of something hot, bread or a pastry, tea.
  soup: [["soup"], ["pastry", "side"], ["hot_drink", "drink"]],
  // Dessert and a hot drink.
  sweet: [["dessert"], ["hot_drink", "drink"]],
  // A quick bite, no full meal.
  snack: [["pastry", "starter", "snack"], ["drink", "hot_drink"]],
  // Only something to drink.
  drinks: [["drink", "alcohol"], ["hot_drink", "drink"]],
  // Plates for the middle of the table.
  share: [["starter", "snack", "pastry"], ["salad", "side"], ["main", "grill"], ["drink"]],
};

/** The order moods are offered in. */
const MOOD_ORDER: Mood[] = ["hungry", "light", "adventurous", "meat", "soup", "share", "snack", "sweet", "drinks"];

export type RouletteInput = {
  menu: Menu;
  /** Budget for the whole table, in the menu currency. */
  budget: number;
  mood: Mood;
  guests: number;
  /** Tags every food item must carry, e.g. ["vegetarian"]. Drinks are exempt. */
  requireTags?: string[];
  excludeItemIds?: string[];
  includeAlcohol?: boolean;
  /** Deterministic RNG for tests; defaults to Math.random. */
  rng?: () => number;
};

export type RouletteResult = { items: MenuItem[]; total: number; perGuest: number } | null;

/**
 * Moods that make sense for the venue: a mood is offered when the menu can
 * fill its leading course (a shisha lounge gets "chill" first, a venue with no
 * desserts gets no "sweet").
 */
export function moodsFor(menu: Menu): Mood[] {
  const roles = new Set(menu.categories.filter((c) => c.items.some((i) => i.price > 0)).map((c) => c.role));
  const can = (m: Mood) => SLOTS[m][0]!.some((r) => roles.has(r));
  const moods = MOOD_ORDER.filter(can);
  if (can("chill")) moods.unshift("chill");
  return moods.length ? moods : ["hungry"];
}

/**
 * Builds a random meal set for one guest that fits `budget / guests`.
 * Tries many random combinations and keeps the one that uses the budget best
 * without exceeding it. Returns null when nothing fits.
 */
export function spinRoulette(input: RouletteInput): RouletteResult {
  const { menu, budget, mood, guests, rng = Math.random } = input;
  const perGuestBudget = Math.floor(budget / Math.max(1, guests));
  const roleOf = new Map(menu.categories.map((c) => [c.id, c.role] as const));
  const excluded = new Set(input.excludeItemIds ?? []);

  const pool = allItems(menu).filter((item) => {
    if (excluded.has(item.id)) return false;
    if (!input.includeAlcohol && roleOf.get(item.categoryId) === "alcohol") return false;
    if (input.requireTags?.length) {
      const role = roleOf.get(item.categoryId);
      const isDrink = role === "drink" || role === "hot_drink" || role === "alcohol";
      if (!isDrink && !input.requireTags.every((t) => item.tags.includes(t))) return false;
    }
    return item.price > 0;
  });

  const slots = SLOTS[mood].map((roles) => pool.filter((i) => roles.includes(roleOf.get(i.categoryId)!)));
  const usable = slots.filter((s) => s.length > 0);
  if (!usable.length) return null;

  let best: MenuItem[] | null = null;
  let bestTotal = -1;
  for (let attempt = 0; attempt < 200; attempt++) {
    const pick: MenuItem[] = [];
    let total = 0;
    for (const options of usable) {
      const affordable = options.filter((o) => total + o.price <= perGuestBudget && !pick.includes(o));
      if (!affordable.length) continue;
      const choice = affordable[Math.floor(rng() * affordable.length)]!;
      pick.push(choice);
      total += choice.price;
    }
    // Prefer more courses first, then the fuller use of the budget.
    const score = pick.length * 1e12 + total;
    const bestScore = (best?.length ?? 0) * 1e12 + bestTotal;
    if (pick.length && score > bestScore) {
      best = pick;
      bestTotal = total;
    }
  }
  if (!best) return null;
  return { items: best, total: bestTotal * Math.max(1, guests), perGuest: bestTotal };
}
