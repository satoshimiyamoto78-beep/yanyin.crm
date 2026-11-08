import { allItems, questProgress, type DomainEvent, type Menu, type Quest } from "@yanyin/domain";

/**
 * Demo data for the quest board. In Phase 1 these come from the database and
 * quest progress is evaluated from real `domain_events` (ADR-005).
 */
export type CrewQuest = Quest & { progress: number; state: "active" | "available" | "done" };

export type CrewData = {
  staff: { id: string; name: string; role: string; venue: string; avatar: string; xp: number; streakDays: number; week: boolean[] };
  today: { sales: number; tips: number; avgCheck: number; tables: number };
  quests: CrewQuest[];
  boss: { title: string; progress: number; target: number; reward: string; endsIn: string };
  badges: { id: string; name: string; emoji: string; earned: boolean }[];
  leaderboard: { name: string; xp: number; me?: boolean }[];
  currency: Menu["venue"]["currency"];
};

const ME = "staff-linh";

export function demoCrew(menu: Menu): CrewData {
  const items = allItems(menu);
  const ids = (re: RegExp) => items.filter((i) => re.test(i.name.en ?? "")).map((i) => i.id);
  const plov = ids(/plov/i);
  const shashlik = ids(/shashlik|kebab/i);
  const dessertCat = menu.categories.find((c) => c.role === "dessert")?.id ?? "desserts";

  const served = (itemId: string, qty: number, staffId = ME): DomainEvent => ({
    type: "order_item.served",
    staffId,
    itemId,
    categoryId: items.find((i) => i.id === itemId)?.categoryId ?? "",
    qty,
    amount: (items.find((i) => i.id === itemId)?.price ?? 0) * qty,
    at: "2026-11-08T12:00:00+07:00",
  });
  const dessertItems = items.filter((i) => i.categoryId === dessertCat).map((i) => i.id);
  const events: DomainEvent[] = [
    served(plov[0]!, 2),
    served(plov[1]!, 1),
    served(plov[0]!, 1, "staff-minh"),
    ...dessertItems.slice(0, 3).map((id) => served(id, 2)),
    served(shashlik[0]!, 3),
    { type: "review.created", staffId: ME, stars: 5, at: "" },
    { type: "review.created", staffId: ME, stars: 5, at: "" },
    { type: "review.created", staffId: ME, stars: 4, at: "" },
    { type: "review.created", staffId: ME, stars: 5, at: "" },
  ];

  const base: (Quest & { state: CrewQuest["state"] })[] = [
    {
      id: "plov-master",
      title: "Plov Master",
      description: "Serve 5 plov this shift",
      metric: "items_sold",
      filterIds: plov,
      target: 5,
      mode: "solo",
      reward: { xp: 150, bonus: 50_000 },
      endsAt: "Ends 23:00",
      icon: "🍚",
      state: "active",
    },
    {
      id: "sweet-finish",
      title: "Sweet Finish",
      description: "Sell 8 desserts today",
      metric: "category_sold",
      filterIds: [dessertCat],
      target: 8,
      mode: "solo",
      reward: { xp: 120 },
      endsAt: "Ends today",
      icon: "🍰",
      state: "active",
    },
    {
      id: "five-stars",
      title: "Guest Favorite",
      description: "Get 3 five-star reviews this week",
      metric: "reviews_5star",
      target: 3,
      mode: "solo",
      reward: { xp: 200, perk: "Pick your next shift" },
      endsAt: "Ends Sunday",
      icon: "⭐",
      state: "active",
    },
    {
      id: "shashlik-sunday",
      title: "Shashlik Sunday",
      description: "Serve 10 shashlik or kebab on Sunday",
      metric: "items_sold",
      filterIds: shashlik,
      target: 10,
      mode: "race",
      reward: { xp: 200, bonus: 100_000 },
      endsAt: "Sunday",
      icon: "🍢",
      state: "available",
    },
    {
      id: "roulette-host",
      title: "Roulette Host",
      description: "Help 5 tables order with Food Roulette",
      metric: "orders_served",
      target: 5,
      mode: "solo",
      reward: { xp: 150 },
      endsAt: "This week",
      icon: "🎰",
      state: "available",
    },
  ];

  return {
    staff: {
      id: ME,
      name: "Linh",
      role: "Waiter",
      venue: menu.venue.name,
      avatar: "🧑🏻‍🍳",
      xp: 1_380,
      streakDays: 6,
      week: [true, true, true, true, true, true, false],
    },
    today: { sales: 4_820_000, tips: 210_000, avgCheck: 602_000, tables: 8 },
    quests: base.map((q) => {
      const progress = q.state === "available" ? 0 : questProgress(q, events, ME);
      return { ...q, progress, state: q.state === "active" && progress >= q.target ? "done" : q.state };
    }),
    boss: { title: "Team boss fight: 60M ₫ this week", progress: 41_200_000, target: 60_000_000, reward: "+300k ₫ each", endsIn: "3 days left" },
    badges: [
      { id: "upsell", name: "Upsell King", emoji: "👑", earned: true },
      { id: "speed", name: "Speed Demon", emoji: "⚡", earned: true },
      { id: "fav", name: "Guest Favorite", emoji: "💛", earned: false },
      { id: "waste", name: "Zero Waste", emoji: "♻️", earned: false },
    ],
    leaderboard: [
      { name: "Minh", xp: 1_520 },
      { name: "Linh", xp: 1_380, me: true },
      { name: "Anna", xp: 1_105 },
      { name: "Tuan", xp: 860 },
    ],
    currency: menu.venue.currency,
  };
}
