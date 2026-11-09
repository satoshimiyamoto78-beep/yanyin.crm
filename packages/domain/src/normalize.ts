import { slugify } from "./i18n";
import type {
  Category,
  CategoryRole,
  I18nText,
  ItemStatus,
  Lang,
  Menu,
  MenuItem,
  ModifierGroup,
  Venue,
  VenueType,
} from "./types";

/** Loose shape of the seed / import JSON (as transcribed from paper menus). */
export type RawMenu = {
  venue: {
    slug: string;
    name: string;
    type: string;
    city: string;
    country: string;
    currency: string;
    timezone: string;
    languages: string[];
    age_restricted?: boolean;
  };
  categories: RawCategory[];
};

type RawVariant = { name: I18nText; price: number };
type RawOption = { name: I18nText; price: number; note?: I18nText; logo?: string; color?: string; glyph?: string };

type RawCategory = {
  name: I18nText;
  group?: string;
  status?: string;
  age_restricted?: boolean;
  price_shared?: number;
  variants_shared?: RawVariant[];
  modifier_groups?: {
    id: string;
    name: I18nText;
    required?: boolean;
    max?: number;
    display?: "chips" | "scale" | "brands" | "tiles";
    /** Index of the preselected option. */
    default?: number;
    options: RawOption[];
  }[];
  service_calls?: { id: string; name: I18nText }[];
  items: RawItem[];
};

type RawItem = {
  name: I18nText;
  description?: I18nText;
  price?: number;
  variants?: RawVariant[];
  tags?: string[];
  status?: string;
  photo?: string;
  note?: string;
  /** Ids of the category's modifier groups this item uses; all of them when omitted. */
  modifier_groups?: string[];
  builder?: "pizza" | "drink";
};

const ROLE_RULES: [RegExp, CategoryRole][] = [
  [/hookah/i, "hookah"],
  [/soup/i, "soup"],
  [/salad/i, "salad"],
  [/starter/i, "starter"],
  [/plov|main|chef/i, "main"],
  [/grill|shashlik/i, "grill"],
  [/side/i, "side"],
  [/pasta/i, "pasta"],
  [/pastr|tandoor/i, "pastry"],
  [/dessert/i, "dessert"],
  [/snack/i, "snack"],
  [/coffee|tea/i, "hot_drink"],
  [/gin|rum|vermouth|liqueur|tequila|whiskey|brandy|cocktail|mix|beer|wine|shot/i, "alcohol"],
  [/drink|juice|smoothie|lemonade|coconut/i, "drink"],
];

export function roleFor(categoryNameEn: string, group?: string): CategoryRole {
  const key = `${group ?? ""} ${categoryNameEn}`;
  for (const [re, role] of ROLE_RULES) if (re.test(key)) return role;
  return "main";
}

const status = (s?: string): ItemStatus => (s === "suggested" ? "suggested" : "confirmed");

function uniqueId(base: string, used: Set<string>): string {
  let id = base || "item";
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
  used.add(id);
  return id;
}

export function normalizeMenu(raw: RawMenu): Menu {
  const venue: Venue = {
    slug: raw.venue.slug,
    name: raw.venue.name,
    type: raw.venue.type as VenueType,
    city: raw.venue.city,
    country: raw.venue.country,
    currency: raw.venue.currency as Venue["currency"],
    timezone: raw.venue.timezone,
    languages: raw.venue.languages as Lang[],
    ageRestricted: Boolean(raw.venue.age_restricted),
  };

  const catIds = new Set<string>();
  const itemIds = new Set<string>();

  const categories: Category[] = raw.categories.map((rc) => {
    const nameEn = rc.name.en ?? Object.values(rc.name)[0] ?? "category";
    const categoryId = uniqueId(slugify(nameEn), catIds);

    const modifierGroups: ModifierGroup[] = (rc.modifier_groups ?? []).map((g) => {
      const display = g.display ?? "chips";
      const options = g.options.map((o, i) => ({
        id: display === "scale" ? `${g.id}-${i + 1}` : `${g.id}-${slugify(o.name.en ?? String(i)) || i}`,
        name: o.name,
        price: o.price,
        ...(o.note ? { note: o.note } : {}),
        ...(o.logo ? { logo: o.logo } : {}),
        ...(o.color ? { color: o.color } : {}),
        ...(o.glyph ? { glyph: o.glyph } : {}),
      }));
      return {
        id: g.id,
        name: g.name,
        required: Boolean(g.required),
        max: display === "scale" ? 1 : g.max ?? (g.required ? 1 : g.options.length),
        display,
        defaultOptionId: g.default !== undefined ? options[g.default]?.id : undefined,
        options,
      };
    });

    const items: MenuItem[] = rc.items.map((ri) => {
      const rawVariants = ri.variants ?? rc.variants_shared ?? [];
      const variants = rawVariants.map((v, i) => ({
        id: slugify(v.name.en ?? String(i)) || String(i),
        name: v.name,
        price: v.price,
      }));
      const price =
        ri.price ??
        rc.price_shared ??
        (variants.length ? Math.min(...variants.map((v) => v.price)) : 0);
      const itemNameEn = ri.name.en ?? Object.values(ri.name)[0] ?? "item";
      return {
        id: uniqueId(slugify(itemNameEn), itemIds),
        categoryId,
        name: ri.name,
        ...(ri.description ? { description: ri.description } : {}),
        price,
        variants,
        modifierGroups: ri.modifier_groups ? modifierGroups.filter((g) => ri.modifier_groups!.includes(g.id)) : modifierGroups,
        tags: ri.tags ?? [],
        status: status(ri.status),
        ...(ri.photo ? { photo: ri.photo } : {}),
        ...(ri.builder ? { builder: ri.builder } : {}),
        ...(ri.note ? { note: ri.note } : {}),
      };
    });

    return {
      id: categoryId,
      name: rc.name,
      ...(rc.group ? { group: rc.group } : {}),
      role: roleFor(nameEn, rc.group),
      status: status(rc.status),
      ageRestricted: Boolean(rc.age_restricted) || roleFor(nameEn, rc.group) === "alcohol",
      items,
      serviceCalls: rc.service_calls ?? [],
    };
  });

  return { venue, categories };
}

export function allItems(menu: Menu): MenuItem[] {
  return menu.categories.flatMap((c) => c.items);
}
