import { describe, expect, it } from "vitest";
import {
  addLine, cartTotal, defaultOptionIds, formatMoney, levelFromXp, missingRequired, moodsFor, normalizeMenu,
  questPercent, questProgress, roleFor, spinRoulette, t, unitPrice, xpForLevel,
  type DomainEvent, type Quest, type RawMenu,
} from "../src";

const raw: RawMenu = {
  venue: { slug: "v", name: "V", type: "restaurant", city: "Da Nang", country: "VN", currency: "VND", timezone: "Asia/Ho_Chi_Minh", languages: ["en", "ru"] },
  categories: [
    { name: { en: "Main dishes", ru: "Основные" }, items: [{ name: { en: "Plov" }, price: 200000, tags: ["signature"] }, { name: { en: "Lagman" }, price: 150000 }] },
    { name: { en: "Side dishes" }, items: [{ name: { en: "Rice" }, price: 40000, tags: ["vegan"] }] },
    { name: { en: "Soft drinks" }, items: [{ name: { en: "Cola" }, price: 30000 }] },
    { name: { en: "Lemonades" }, variants_shared: [{ name: { en: "0.4 L" }, price: 79000 }, { name: { en: "1 L" }, price: 169000 }], items: [{ name: { en: "Mango" } }] },
    { name: { en: "Beer" }, items: [{ name: { en: "Saigon" }, price: 45000 }] },
    { name: { en: "Hookah" }, modifier_groups: [{ id: "flavor", name: { en: "Flavor" }, required: true, max: 1, options: [{ name: { en: "Mint" }, price: 0 }, { name: { en: "Berry" }, price: 0 }] }, { id: "extras", name: { en: "Extras" }, options: [{ name: { en: "Ice hose" }, price: 50000 }] }], items: [{ name: { en: "Classic" }, price: 350000, status: "suggested" }] },
  ],
};
const menu = normalizeMenu(raw);
const seq = (...v: number[]) => { let i = 0; return () => v[i++ % v.length]!; };

describe("normalize", () => {
  it("maps roles, shared variants and statuses", () => {
    expect(menu.categories.map((c) => c.role)).toEqual(["main", "side", "drink", "drink", "alcohol", "hookah"]);
    const mango = menu.categories[3]!.items[0]!;
    expect(mango.variants.map((v) => v.price)).toEqual([79000, 169000]);
    expect(mango.price).toBe(79000);
    expect(menu.categories[5]!.items[0]!.status).toBe("suggested");
    expect(menu.categories[4]!.ageRestricted).toBe(true);
  });
  it("classifies real category names", () => {
    expect(roleFor("Plov")).toBe("main");
    expect(roleFor("Classic cocktails")).toBe("alcohol");
    expect(roleFor("Leaf tea 1 L")).toBe("hot_drink");
  });
});

describe("i18n and money", () => {
  it("falls back to English", () => {
    expect(t({ en: "Rice", ru: "Рис" }, "ru")).toBe("Рис");
    expect(t({ en: "Rice" }, "vi")).toBe("Rice");
  });
  it("formats VND without decimals", () => {
    expect(formatMoney(180000, "VND", "en")).toBe("180,000 ₫");
  });
});

describe("cart", () => {
  const hookah = menu.categories[5]!.items[0]!;
  it("adds modifier prices and detects missing required groups", () => {
    const ice = hookah.modifierGroups[1]!.options[0]!.id;
    expect(unitPrice(hookah, undefined, [ice])).toBe(400000);
    expect(missingRequired(hookah, [ice])).toEqual(["flavor"]);
  });
  it("builds a 1–10 strength scale with a preselected step", () => {
    const scaled = normalizeMenu({
      ...raw,
      categories: [{ name: { en: "Hookah" }, modifier_groups: [{ id: "strength", name: { en: "Strength" }, required: true, display: "scale", default: 4, options: Array.from({ length: 10 }, (_, i) => ({ name: { en: `${i + 1}/10` }, price: 0 })) }], items: [{ name: { en: "Darkside" }, price: 450000 }] }],
    }).categories[0]!.items[0]!;
    const g = scaled.modifierGroups[0]!;
    expect(g.display).toBe("scale");
    expect(g.max).toBe(1);
    expect(g.options.map((o) => o.id).slice(0, 3)).toEqual(["strength-1", "strength-2", "strength-3"]);
    expect(defaultOptionIds(scaled)).toEqual(["strength-5"]);
    expect(missingRequired(scaled, defaultOptionIds(scaled))).toEqual([]);
  });
  it("builds one hookah constructor with tobacco tiles and lets combos use a subset of groups", () => {
    const cat = normalizeMenu({
      ...raw,
      categories: [
        {
          name: { en: "Hookah" },
          modifier_groups: [
            { id: "tobacco", name: { en: "Tobacco" }, required: true, max: 1, display: "brands", options: [{ name: { en: "Al Fakher" }, price: 0, note: { en: "Soft" } }, { name: { en: "Tangiers" }, price: 150000 }] },
            { id: "extras", name: { en: "Extras" }, options: [{ name: { en: "Ice hose" }, price: 50000 }] },
          ],
          items: [
            { name: { en: "Build your hookah" }, price: 350000 },
            { name: { en: "Zabey Signature" }, price: 450000, modifier_groups: ["extras"] },
          ],
        },
      ],
    }).categories[0]!;
    const [builder, combo] = cat.items;
    const tobacco = builder!.modifierGroups[0]!;
    expect(tobacco.display).toBe("brands");
    expect(tobacco.options[0]!.note).toEqual({ en: "Soft" });
    expect(missingRequired(builder!, [])).toEqual(["tobacco"]);
    expect(unitPrice(builder!, undefined, [tobacco.options[1]!.id])).toBe(500000);
    expect(combo!.modifierGroups.map((g) => g.id)).toEqual(["extras"]);
    expect(missingRequired(combo!, [])).toEqual([]);
  });
  it("merges identical lines", () => {
    let lines = addLine([], { itemId: "a", optionIds: ["x"], qty: 1, unitPrice: 10 });
    lines = addLine(lines, { itemId: "a", optionIds: ["x"], qty: 2, unitPrice: 10 });
    expect(lines).toHaveLength(1);
    expect(cartTotal(lines)).toBe(30);
  });
});

describe("roulette", () => {
  it("never exceeds the per-guest budget and skips alcohol by default", () => {
    for (let s = 0; s < 50; s++) {
      const r = spinRoulette({ menu, budget: 500000, guests: 2, mood: "hungry" })!;
      expect(r.perGuest).toBeLessThanOrEqual(250000);
      expect(r.items.some((i) => i.categoryId === "beer")).toBe(false);
    }
  });
  it("fills main + side + drink when the budget allows", () => {
    const r = spinRoulette({ menu, budget: 300000, guests: 1, mood: "hungry", rng: seq(0) })!;
    expect(r.items.map((i) => i.categoryId)).toEqual(["main-dishes", "side-dishes", "soft-drinks"]);
  });
  it("returns null when nothing fits", () => {
    expect(spinRoulette({ menu, budget: 1000, guests: 1, mood: "hungry" })).toBeNull();
  });
  it("offers chill for a hookah menu", () => {
    expect(moodsFor(menu)[0]).toBe("chill");
  });
});

describe("quests", () => {
  const quest: Quest = { id: "q", title: "Plov", description: "", metric: "items_sold", filterIds: ["plov"], target: 5, mode: "solo", reward: { xp: 100 }, endsAt: "", icon: "" };
  const events: DomainEvent[] = [
    { type: "order_item.served", staffId: "a", itemId: "plov", categoryId: "main-dishes", qty: 2, amount: 400000, at: "" },
    { type: "order_item.served", staffId: "b", itemId: "plov", categoryId: "main-dishes", qty: 1, amount: 200000, at: "" },
  ];
  it("counts only the staff member's own events for solo quests", () => {
    expect(questProgress(quest, events, "a")).toBe(2);
    expect(questProgress({ ...quest, mode: "team" }, events, "a")).toBe(3);
    expect(questPercent(2, 5)).toBe(40);
  });
  it("computes levels from the XP curve", () => {
    expect(xpForLevel(1)).toBe(100);
    expect(levelFromXp(0).level).toBe(1);
    expect(levelFromXp(100).level).toBe(2);
    expect(levelFromXp(100).title).toBe("Rookie");
  });
});
