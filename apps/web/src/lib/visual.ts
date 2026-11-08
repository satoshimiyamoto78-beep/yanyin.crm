import type { Category, Menu, Venue } from "@yanyin/domain";

/**
 * yanyin guest design system: one platform look (light, white grouped cards,
 * bold numerals, one accent), white-labelled per venue with its accent, mark
 * and copy. Venues never restyle the structure, the same way every store on
 * Grab or Yandex Eda shares one interface.
 */
export type VenueBrand = {
  accent: string;
  /** Short mark shown in the round logo badge. */
  mark: string;
  headline: Record<"en" | "ru" | "vi", string>;
  about: { bio: string; address: string; hours: string; phone?: string };
  /** Hero promo cards on the home screen (item ids that have photos, or roulette). */
  promos: { kicker: string; title: string; itemId?: string; action: "item" | "roulette" }[];
  ageRestricted: boolean;
};

export const YANYIN_BLUE = "#2E5BFF";

export function venueBrand(venue: Venue): VenueBrand {
  if (venue.type === "shisha_lounge") {
    return {
      accent: "#E3262E",
      mark: "Z",
      headline: { en: "Good drinks, good people", ru: "Хорошие напитки, хорошие люди", vi: "Đồ uống ngon, bạn bè vui" },
      about: {
        bio: "Zabey Community is a hookah lounge and bar in Da Nang. Good drinks, good people, great time.",
        address: "Da Nang, Vietnam (address to confirm)",
        hours: "Daily 17:00 – 02:00 (to confirm)",
      },
      promos: [
        { kicker: "Tonight", title: "Can't choose? Let Food Roulette pick your set", action: "roulette" },
      ],
      ageRestricted: true,
    };
  }
  return {
    accent: "#E8762B",
    mark: "S",
    headline: { en: "What are you craving?", ru: "Чего хочется сегодня?", vi: "Hôm nay bạn muốn ăn gì?" },
    about: {
      bio: "Samarkand brings the Central Asian table to Da Nang: plov from the kazan, shashlik over charcoal, fresh tandoor bread and big plates made for sharing.",
      address: "Da Nang, Vietnam (address to confirm)",
      hours: "Daily 10:00 – 23:00 (to confirm)",
    },
    promos: [
      { kicker: "From the grill", title: "Lamb shashlik over charcoal", itemId: "lamb-shashlik", action: "item" },
      { kicker: "Food Roulette", title: "Set a budget, we pick the meal", action: "roulette" },
      { kicker: "Chef's soup", title: "Fatir Shurpa, slow-cooked lamb", itemId: "fatir-shurpa", action: "item" },
    ],
    ageRestricted: false,
  };
}

/** 3D category icons (from the founder's guest-order design) by category role / name. */
const ICON_BY_NAME: [RegExp, string][] = [
  [/hookah/i, "/icons3d/shisha.webp"],
  [/coffee/i, "/icons3d/coffee.webp"],
  [/breakfast|egg/i, "/icons3d/bowls.webp"],
  [/pastr|tandoor|toast|bake/i, "/icons3d/toast.webp"],
  [/smoothie|juice|lemonade|soft|iced/i, "/icons3d/cold.webp"],
  [/main|chef/i, "/icons3d/mains.svg"],
];

const EMOJI_BY_NAME: [RegExp, string][] = [
  [/plov|rice/i, "🍚"],
  [/salad/i, "🥗"],
  [/soup/i, "🍲"],
  [/grill|shashlik/i, "🍢"],
  [/pasta/i, "🍝"],
  [/side/i, "🍟"],
  [/starter/i, "🫒"],
  [/dessert/i, "🍰"],
  [/tea/i, "🍵"],
  [/beer/i, "🍺"],
  [/wine/i, "🍷"],
  [/cocktail|mix|shot/i, "🍸"],
  [/gin|rum|vermouth|liqueur|tequila|whiskey|brandy/i, "🥃"],
  [/traditional|coconut/i, "🥥"],
  [/snack/i, "🧀"],
];

export type CategoryIcon = { kind: "img"; src: string } | { kind: "emoji"; char: string };

/** Picks the most appetising icon: a real dish cut-out, a 3D icon, or an emoji. */
export function categoryIcon(category: Category): CategoryIcon {
  const en = category.name.en ?? "";
  const photo = category.items.find((i) => i.photo)?.photo;
  if (photo) return { kind: "img", src: photo };
  for (const [re, src] of ICON_BY_NAME) if (re.test(en)) return { kind: "img", src };
  for (const [re, char] of EMOJI_BY_NAME) if (re.test(en)) return { kind: "emoji", char };
  return { kind: "emoji", char: "🍽️" };
}

export function popularItems(menu: Menu, n = 6) {
  const photos = menu.categories.flatMap((c) => c.items.filter((i) => i.photo));
  const rest = menu.categories.flatMap((c) => c.items.slice(0, 1));
  return [...photos, ...rest.filter((i) => !photos.includes(i))].slice(0, n);
}
