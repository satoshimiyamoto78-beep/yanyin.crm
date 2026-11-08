/** Staff quest mechanics (ADR-005: progress comes only from system events). */

export type QuestMetric = "items_sold" | "category_sold" | "reviews_5star" | "orders_served" | "revenue";

export type Quest = {
  id: string;
  title: string;
  description: string;
  metric: QuestMetric;
  /** For items_sold / category_sold: which item or category ids count. */
  filterIds?: string[];
  target: number;
  mode: "solo" | "team" | "race";
  reward: { xp: number; bonus?: number; perk?: string };
  endsAt: string;
  icon: string;
};

export type DomainEvent =
  | { type: "order_item.served"; staffId: string; itemId: string; categoryId: string; qty: number; amount: number; at: string }
  | { type: "order.paid"; staffId: string; amount: number; at: string }
  | { type: "review.created"; staffId: string; stars: number; at: string };

export function questProgress(quest: Quest, events: DomainEvent[], staffId?: string): number {
  const mine = (e: DomainEvent) => quest.mode === "team" || !staffId || e.staffId === staffId;
  let value = 0;
  for (const e of events) {
    if (!mine(e)) continue;
    switch (quest.metric) {
      case "items_sold":
        if (e.type === "order_item.served" && quest.filterIds?.includes(e.itemId)) value += e.qty;
        break;
      case "category_sold":
        if (e.type === "order_item.served" && quest.filterIds?.includes(e.categoryId)) value += e.qty;
        break;
      case "reviews_5star":
        if (e.type === "review.created" && e.stars === 5) value += 1;
        break;
      case "orders_served":
        if (e.type === "order.paid") value += 1;
        break;
      case "revenue":
        if (e.type === "order.paid") value += e.amount;
        break;
    }
  }
  return value;
}

export function questPercent(progress: number, target: number): number {
  return target <= 0 ? 100 : Math.min(100, Math.round((progress / target) * 100));
}

/** XP needed to reach level n: 100 × n^1.5 (from the game design reference). */
export function xpForLevel(level: number): number {
  return Math.round(100 * level ** 1.5);
}

export type LevelInfo = { level: number; title: string; xpIntoLevel: number; xpForNext: number };

const TITLES = ["Rookie", "Pro", "Master", "Legend"];

export function levelFromXp(totalXp: number): LevelInfo {
  let level = 1;
  let spent = 0;
  while (totalXp - spent >= xpForLevel(level)) {
    spent += xpForLevel(level);
    level++;
  }
  const title = TITLES[Math.min(TITLES.length - 1, Math.floor((level - 1) / 5))]!;
  return { level, title, xpIntoLevel: totalXp - spent, xpForNext: xpForLevel(level) };
}
