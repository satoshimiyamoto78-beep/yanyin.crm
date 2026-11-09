import type { Venue } from "@yanyin/domain";

/**
 * What a venue contributes to the guest app. The look itself is one yanyin
 * system (white, black, one blue) for every venue (docs/07-design-audit.md);
 * venues bring their name, mark, photos and copy.
 */
export type VenueBrand = {
  mark: string;
  cuisine: Record<"en" | "ru" | "vi", string>;
  about: { bio: string; address: string; hours: string };
  /** Hero slides: a featured dish (needs a photo) or the Food Roulette card. */
  hero: ({ kind: "dish"; itemId: string; kicker: Record<"en" | "ru" | "vi", string> } | { kind: "roulette" })[];
  ageRestricted: boolean;
};

export function venueBrand(venue: Venue): VenueBrand {
  if (venue.type === "shisha_lounge") {
    return {
      mark: "Z",
      cuisine: { en: "Hookah lounge & bar", ru: "Кальянная и бар", vi: "Shisha lounge & bar" },
      about: {
        bio: "Zabey Community is a hookah lounge and bar in Da Nang. Good drinks, good people, great time.",
        address: "Da Nang, Vietnam (address to confirm)",
        hours: "Daily 17:00 – 02:00 (to confirm)",
      },
      hero: [{ kind: "roulette" }],
      ageRestricted: true,
    };
  }
  return {
    mark: "S",
    cuisine: { en: "Central Asian kitchen", ru: "Среднеазиатская кухня", vi: "Ẩm thực Trung Á" },
    about: {
      bio: "Samarkand brings the Central Asian table to Da Nang: plov from the kazan, shashlik over charcoal, fresh tandoor bread and big plates made for sharing.",
      address: "Da Nang, Vietnam (address to confirm)",
      hours: "Daily 10:00 – 23:00 (to confirm)",
    },
    hero: [
      { kind: "dish", itemId: "lamb-shashlik", kicker: { en: "From the charcoal grill", ru: "С углей", vi: "Nướng than hoa" } },
      { kind: "roulette" },
      { kind: "dish", itemId: "fatir-shurpa", kicker: { en: "Chef's soup", ru: "Суп от шефа", vi: "Súp của bếp trưởng" } },
    ],
    ageRestricted: false,
  };
}
