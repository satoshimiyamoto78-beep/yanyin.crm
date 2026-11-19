"use client";

import type {
  CategoryRole,
  I18nText,
  Menu,
  MenuItem,
  ModifierGroup,
  Station,
} from "@yanyin/domain";
import { createStore } from "./store";

/*
 * What the admin changed in the menu editor, on top of the seed menu. One
 * store per venue, read by the guest menu and the waiter's picker, so a saved
 * change reaches them at once (any tab).
 *  - items: per dish — text, price, photos, category, variants, modifier
 *    groups from the library, station and time, tags, allergens, weight,
 *    calories, spiciness, where it is sold and when, VAT, archived.
 *  - cats: per category — name, hidden, station, hours; new categories; order.
 *  - mods: the modifier library (groups shared by many dishes).
 *  - prices: price history per dish.
 */

export type Channels = { qr: boolean; waiter: boolean; delivery: boolean };
export type Schedule = { days: number[]; from: string; to: string };
export type VariantEdit = { id: string; name: string; price: number };

export type ItemEdit = {
  name?: I18nText;
  description?: I18nText;
  price?: number;
  photo?: string;
  /** Up to five photos, the first is the cover. */
  photos?: string[];
  hidden?: boolean;
  categoryId?: string;
  variants?: VariantEdit[];
  /** Modifier groups attached from the library, in order. */
  modIds?: string[];
  station?: Station;
  cookMin?: number;
  tags?: string[];
  allergens?: string[];
  weight?: number;
  kcal?: number;
  spicy?: 0 | 1 | 2 | 3;
  channels?: Channels;
  /** Null: always on sale. */
  schedule?: Schedule | null;
  vat?: number;
  archived?: boolean;
};
export type NewItem = {
  id: string;
  categoryId: string;
  name: I18nText;
  description?: I18nText;
  price: number;
  photo?: string;
  photos?: string[];
};
export type CatEdit = {
  name?: I18nText;
  hidden?: boolean;
  station?: Station;
  hours?: { from: string; to: string } | null;
};
export type NewCat = { id: string; name: I18nText; role: CategoryRole };
export type PriceChange = { at: string; from: number; to: number; by: string };

export type MenuEdits = {
  items: Record<string, ItemEdit>;
  added: NewItem[];
  order: Record<string, string[]>;
  cats?: Record<string, CatEdit>;
  addedCats?: NewCat[];
  catOrder?: string[];
  mods?: Record<string, ModifierGroup>;
  /** Library groups the admin deleted. */
  modsRemoved?: string[];
  prices?: Record<string, PriceChange[]>;
};

const EMPTY: MenuEdits = { items: {}, added: [], order: {} };
const stores = new Map<string, ReturnType<typeof createStore<MenuEdits>>>();
export const menuEdits = (slug: string) => {
  let s = stores.get(slug);
  if (!s) {
    s = createStore<MenuEdits>(`yanyin:menu-edits:${slug}`, EMPTY);
    stores.set(slug, s);
  }
  return s;
};

/** The modifier library: every group the seed menu uses, plus the admin's own and edited ones. */
export function modLibrary(menu: Menu, e: MenuEdits): ModifierGroup[] {
  const seen = new Map<string, ModifierGroup>();
  for (const c of menu.categories)
    for (const i of c.items)
      for (const g of i.modifierGroups) if (!seen.has(g.id)) seen.set(g.id, g);
  for (const [id, g] of Object.entries(e.mods ?? {})) seen.set(id, g);
  for (const id of e.modsRemoved ?? []) seen.delete(id);
  return [...seen.values()];
}

/** The category list as the admin arranged it (new ones included), with edits applied. */
export function categoriesOf(menu: Menu, e: MenuEdits) {
  const base = [
    ...menu.categories.map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      count: c.items.length,
      isNew: false,
    })),
    ...(e.addedCats ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      count: 0,
      isNew: true,
    })),
  ].map((c) => ({
    ...c,
    ...(e.cats?.[c.id]?.name
      ? { name: { ...c.name, ...e.cats[c.id]!.name } }
      : {}),
    edit: e.cats?.[c.id] ?? {},
  }));
  const order = e.catOrder ?? [];
  return [...base].sort(
    (a, b) =>
      (order.indexOf(a.id) + 1 || 999) - (order.indexOf(b.id) + 1 || 999),
  );
}

const DAY = 5; // demo: Saturday 14 November
const NOW = "12:45";
const onSale = (s?: Schedule | null) =>
  !s || (s.days.includes(DAY) && s.from <= NOW && NOW < s.to);

/** One dish with the admin's edits on it (text, price, photos, variants, modifiers, tags). */
export function applyItem(
  i: MenuItem,
  e: MenuEdits,
  lib: Map<string, ModifierGroup>,
): MenuItem {
  const x = e.items[i.id];
  if (!x) return i;
  const variants = x.variants?.length
    ? x.variants.map((v) => ({
        id: v.id,
        name: { en: v.name, ru: v.name, vi: v.name },
        price: v.price,
      }))
    : i.variants;
  return {
    ...i,
    ...(x.name ? { name: { ...i.name, ...x.name } } : {}),
    ...(x.description
      ? { description: { ...i.description, ...x.description } }
      : {}),
    ...(x.price !== undefined ? { price: x.price } : {}),
    ...(x.photos?.length
      ? { photo: x.photos[0] }
      : x.photo
        ? { photo: x.photo }
        : {}),
    variants,
    ...(x.variants?.length
      ? { price: Math.min(...x.variants.map((v) => v.price)) }
      : {}),
    ...(x.modIds
      ? {
          modifierGroups: x.modIds
            .map((id) => lib.get(id))
            .filter((g): g is ModifierGroup => !!g),
        }
      : {}),
    ...(x.tags ? { tags: x.tags } : {}),
  };
}

/** Every dish for the editor: seed and new, edits applied, moved to its category, nothing filtered out. */
export function editorItems(menu: Menu, e: MenuEdits): MenuItem[] {
  const lib = new Map(modLibrary(menu, e).map((g) => [g.id, g]));
  return [
    ...menu.categories.flatMap((c) => c.items),
    ...e.added.map((n) => ({
      id: n.id,
      categoryId: n.categoryId,
      name: n.name,
      description: n.description,
      price: n.price,
      photo: n.photos?.[0] ?? n.photo,
      variants: [],
      modifierGroups: [],
      tags: [],
      status: "confirmed" as const,
    })),
  ].map((i) => ({
    ...applyItem(i, e, lib),
    categoryId: e.items[i.id]?.categoryId ?? i.categoryId,
  }));
}

/** The menu as guests see it: edits applied, hidden, archived, off-channel and off-hours dishes out, new dishes in. */
export function applyEdits(menu: Menu, e: MenuEdits, channel: keyof Channels = "qr"): Menu {
  if (
    !Object.keys(e.items).length &&
    !e.added.length &&
    !Object.keys(e.order).length &&
    !e.cats &&
    !e.addedCats &&
    !e.catOrder &&
    !e.mods
  )
    return menu;
  const lib = new Map(modLibrary(menu, e).map((g) => [g.id, g]));
  const shown = (id: string) => {
    const x = e.items[id];
    return (
      !x?.hidden &&
      !x?.archived &&
      x?.channels?.[channel] !== false &&
      onSale(x?.schedule)
    );
  };
  const apply = (i: MenuItem) => applyItem(i, e, lib);
  // Every dish (seed and new) lands in its category, moved ones included.
  const all: MenuItem[] = [
    ...menu.categories.flatMap((c) => c.items),
    ...e.added.map((n) => ({
      id: n.id,
      categoryId: n.categoryId,
      name: n.name,
      description: n.description,
      price: e.items[n.id]?.price ?? n.price,
      photo: e.items[n.id]?.photos?.[0] ?? n.photos?.[0] ?? n.photo,
      variants: [],
      modifierGroups: [],
      tags: [],
      status: "confirmed" as const,
    })),
  ]
    .filter((i) => shown(i.id))
    .map((i) => ({
      ...apply(i),
      categoryId: e.items[i.id]?.categoryId ?? i.categoryId,
    }));
  const cats = [
    ...menu.categories,
    ...(e.addedCats ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      role: c.role,
      status: "confirmed" as const,
      ageRestricted: false,
      items: [],
      serviceCalls: [],
    })),
  ]
    .filter((c) => !e.cats?.[c.id]?.hidden)
    .map((c) => {
      const items = all.filter((i) => i.categoryId === c.id);
      const order = e.order[c.id];
      if (order)
        items.sort(
          (a, b) =>
            (order.indexOf(a.id) + 1 || 999) - (order.indexOf(b.id) + 1 || 999),
        );
      return {
        ...c,
        ...(e.cats?.[c.id]?.name
          ? { name: { ...c.name, ...e.cats[c.id]!.name } }
          : {}),
        items,
      };
    })
    .filter((c) => c.items.length);
  const co = e.catOrder ?? [];
  cats.sort(
    (a, b) => (co.indexOf(a.id) + 1 || 999) - (co.indexOf(b.id) + 1 || 999),
  );
  return { ...menu, categories: cats };
}
