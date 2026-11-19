import {
  Cake,
  Crown,
  Flame,
  GlassWater,
  HeartHandshake,
  ShieldCheck,
  Star,
  Target,
  Timer,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { createStore } from "./store";

/*
 * The game layer of the venue (yanyin.quest): quests the admin runs, badges
 * people earn, and the history of both. Progress counts itself from domain
 * events (orders, reviews, checklists); the backend replaces these demo rows.
 */

export type Tier = "bronze" | "silver" | "gold" | "sapphire" | "diamond";
export const TIERS: Tier[] = [
  "bronze",
  "silver",
  "gold",
  "sapphire",
  "diamond",
];

export const ICONS: Record<string, LucideIcon> = {
  crown: Crown,
  zap: Zap,
  users: Users,
  shield: ShieldCheck,
  star: Star,
  flame: Flame,
  cake: Cake,
  target: Target,
  timer: Timer,
  glass: GlassWater,
  heart: HeartHandshake,
};

export type BadgeRule =
  | {
      kind: "count";
      metric:
        | "upsells"
        | "fast_tickets"
        | "five_stars"
        | "checklists_clean"
        | "shifts"
        | "dishes";
      target: number;
      period: "shift" | "week" | "ever";
    }
  | { kind: "manual" };

export type GameBadge = {
  id: string;
  name: string;
  text: string;
  tier: Tier;
  icon: string;
  rule: BadgeRule;
  earned: { id: string; at: string }[];
  close?: { id: string; value: number }[];
};

export const BADGE_SEED: GameBadge[] = [
  {
    id: "upsell",
    name: "Upsell king",
    text: "Added a drink or a dessert to 30 bills.",
    tier: "gold",
    icon: "crown",
    rule: { kind: "count", metric: "upsells", target: 30, period: "ever" },
    earned: [
      { id: "staff-linh", at: "2 Nov" },
      { id: "staff-minh", at: "11 Nov" },
    ],
    close: [{ id: "staff-an", value: 22 }],
  },
  {
    id: "lightning",
    name: "Lightning",
    text: "Ten orders sent to the kitchen within a minute of the guest choosing.",
    tier: "sapphire",
    icon: "zap",
    rule: {
      kind: "count",
      metric: "fast_tickets",
      target: 10,
      period: "shift",
    },
    earned: [{ id: "staff-linh", at: "8 Nov" }],
    close: [{ id: "staff-minh", value: 7 }],
  },
  {
    id: "mentor",
    name: "Mentor",
    text: "Trained two new people through their first shifts.",
    tier: "silver",
    icon: "users",
    rule: { kind: "manual" },
    earned: [{ id: "staff-huong", at: "20 Oct" }],
  },
  {
    id: "clean",
    name: "Clean station",
    text: "Every closing checklist done for two weeks in a row.",
    tier: "bronze",
    icon: "shield",
    rule: {
      kind: "count",
      metric: "checklists_clean",
      target: 14,
      period: "ever",
    },
    earned: [
      { id: "staff-thao", at: "13 Nov" },
      { id: "staff-dima", at: "5 Nov" },
      { id: "staff-linh", at: "30 Oct" },
    ],
    close: [{ id: "staff-lan", value: 11 }],
  },
  {
    id: "star",
    name: "Guest star",
    text: "Twenty five-star reviews that name this person.",
    tier: "diamond",
    icon: "star",
    rule: { kind: "count", metric: "five_stars", target: 20, period: "ever" },
    earned: [],
    close: [
      { id: "staff-linh", value: 17 },
      { id: "staff-minh", value: 12 },
    ],
  },
  {
    id: "marathon",
    name: "Marathon",
    text: "Fifty shifts in the team.",
    tier: "silver",
    icon: "flame",
    rule: { kind: "count", metric: "shifts", target: 50, period: "ever" },
    earned: [
      { id: "staff-dima", at: "1 Oct" },
      { id: "staff-huong", at: "14 Sep" },
    ],
    close: [{ id: "staff-thao", value: 41 }],
  },
];
export const badgeStore = createStore<GameBadge[]>("yanyin:badges", BADGE_SEED);

export type LiveQuest = {
  id: string;
  title: string;
  text: string;
  icon: string;
  mode: "solo" | "team" | "race";
  target: number;
  unit: string;
  ends: string;
  left: string;
  xp: number;
  bonus?: number;
  /** Progress per person (team quests count the sum). */
  players: { id: string; value: number }[];
  feed: { at: string; who: string; text: string }[];
};

export const LIVE_SEED: LiveQuest[] = [
  {
    id: "q-plov",
    title: "Plov master",
    text: "Serve 5 plovs in a shift",
    icon: "target",
    mode: "solo",
    target: 5,
    unit: "plovs",
    ends: "End of shift",
    left: "11 h",
    xp: 150,
    bonus: 50_000,
    players: [
      { id: "staff-linh", value: 4 },
      { id: "staff-minh", value: 3 },
    ],
    feed: [
      { at: "12:31", who: "staff-linh", text: "Samarkand plov ×2 · table 6" },
      { at: "12:02", who: "staff-minh", text: "Samarkand plov · table 8" },
    ],
  },
  {
    id: "q-sunday",
    title: "Shashlik Sunday",
    text: "10 shashlik or kebab, first to get there wins",
    icon: "flame",
    mode: "race",
    target: 10,
    unit: "skewers",
    ends: "Sunday",
    left: "1 day",
    xp: 200,
    bonus: 100_000,
    players: [
      { id: "staff-minh", value: 6 },
      { id: "staff-linh", value: 5 },
    ],
    feed: [
      { at: "12:40", who: "staff-minh", text: "Lamb shashlik ×2 · table 11" },
    ],
  },
  {
    id: "q-team",
    title: "Team goal of the week",
    text: "The whole team reaches 60M ₫ of sales",
    icon: "users",
    mode: "team",
    target: 60,
    unit: "M ₫",
    ends: "Sunday",
    left: "1 day",
    xp: 300,
    bonus: 300_000,
    players: [
      { id: "staff-linh", value: 18.4 },
      { id: "staff-minh", value: 15.9 },
      { id: "staff-an", value: 7.2 },
    ],
    feed: [{ at: "12:44", who: "staff-linh", text: "Bill #1042 · 667k ₫" }],
  },
  {
    id: "q-sweet",
    title: "Sweet finale",
    text: "Sell 8 desserts today",
    icon: "cake",
    mode: "solo",
    target: 8,
    unit: "desserts",
    ends: "End of shift",
    left: "11 h",
    xp: 120,
    players: [
      { id: "staff-linh", value: 6 },
      { id: "staff-minh", value: 2 },
    ],
    feed: [],
  },
];
export const liveStore = createStore<LiveQuest[]>(
  "yanyin:quests-live",
  LIVE_SEED,
);

export type DoneQuest = {
  id: string;
  title: string;
  icon: string;
  mode: LiveQuest["mode"];
  dates: string;
  result: string;
  winners: string[];
  xp: number;
  bonus: number;
  done: boolean;
};
export const DONE_SEED: DoneQuest[] = [
  {
    id: "d1",
    title: "Lemonade week",
    icon: "glass",
    mode: "team",
    dates: "3–9 Nov",
    result: "84 of 80 lemonades",
    winners: ["staff-linh", "staff-minh", "staff-thao", "staff-an"],
    xp: 200,
    bonus: 100_000,
    done: true,
  },
  {
    id: "d2",
    title: "Fast hands",
    icon: "timer",
    mode: "race",
    dates: "8 Nov",
    result: "10 tickets under 12 min",
    winners: ["staff-dima"],
    xp: 200,
    bonus: 50_000,
    done: true,
  },
  {
    id: "d3",
    title: "Five stars Friday",
    icon: "star",
    mode: "solo",
    dates: "7 Nov",
    result: "2 of 3 reached 5 reviews",
    winners: ["staff-linh", "staff-minh"],
    xp: 150,
    bonus: 0,
    done: true,
  },
  {
    id: "d4",
    title: "Dessert duel",
    icon: "cake",
    mode: "race",
    dates: "1–2 Nov",
    result: "Nobody reached 15",
    winners: [],
    xp: 0,
    bonus: 0,
    done: false,
  },
  {
    id: "d5",
    title: "Clean October",
    icon: "shield",
    mode: "team",
    dates: "October",
    result: "96% of checklists on time",
    winners: [
      "staff-thao",
      "staff-dima",
      "staff-linh",
      "staff-lan",
      "staff-an",
    ],
    xp: 300,
    bonus: 0,
    done: true,
  },
];

/*
 * Today's shift as events (docs/07 §93). A quest is a rule over events, so a
 * quest published at 15:00 counts everything since the shift opened: the
 * progress is there the moment it appears on the board, in the admin and on
 * everyone's phone. The backend runs the same rule over `domain_events`
 * (packages/domain questProgress); here a seeded log stands in for them.
 */
export type ShiftEvent = {
  at: string;
  who: string;
  kind: "dish" | "order" | "review" | "ticket";
  /** Index into the quest editor's dish list. */
  dish?: number;
  qty: number;
  table: number;
};
const seed = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10_000) / 10_000;
};
const HALL = ["staff-linh", "staff-minh", "staff-an"];
const KITCHEN = ["staff-dima", "staff-lan"];
export const SHIFT_LOG: ShiftEvent[] = (() => {
  const out: ShiftEvent[] = [];
  for (let m = 10 * 60 + 5; m < 15 * 60 + 10; m += 7) {
    const k = String(m);
    const who = HALL[Math.floor(seed(k + "w") * HALL.length)]!;
    const at = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    const table = 1 + Math.floor(seed(k + "t") * 14);
    out.push({
      at,
      who,
      kind: "dish",
      dish: Math.floor(seed(k + "d") * 12),
      qty: 1 + Math.floor(seed(k + "q") * 2),
      table,
    });
    if (seed(k + "o") > 0.55) out.push({ at, who, kind: "order", qty: 1, table });
    if (seed(k + "r") > 0.86) out.push({ at, who, kind: "review", qty: 1, table });
    if (seed(k + "f") > 0.4)
      out.push({
        at,
        who: KITCHEN[Math.floor(seed(k + "c") * KITCHEN.length)]!,
        kind: "ticket",
        qty: 1,
        table,
      });
  }
  return out.reverse();
})();

/** Progress of a new quest from today's events: per person, and the latest matching events for its feed. */
export function recount(
  goal: "dishes" | "orders" | "reviews" | "speed",
  dish: number | null,
  dishName: (i: number) => string,
) {
  const kind =
    goal === "dishes"
      ? "dish"
      : goal === "orders"
        ? "order"
        : goal === "reviews"
          ? "review"
          : "ticket";
  const hits = SHIFT_LOG.filter(
    (e) => e.kind === kind && (dish === null || e.dish === dish),
  );
  const by = new Map<string, number>();
  for (const e of hits) by.set(e.who, (by.get(e.who) ?? 0) + e.qty);
  const players = [...by.entries()]
    .map(([id, value]) => ({ id, value }))
    .sort((a, b) => b.value - a.value);
  const feed = hits.slice(0, 4).map((e) => ({
    at: e.at,
    who: e.who,
    text:
      kind === "dish"
        ? `${dishName(e.dish!)}${e.qty > 1 ? ` ×${e.qty}` : ""} · #${e.table}`
        : `#${e.table}`,
  }));
  return { players, feed, total: hits.reduce((n, e) => n + e.qty, 0) };
}
