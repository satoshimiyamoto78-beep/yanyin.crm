"use client";

import type { I18nText, Menu, MenuItem } from "@yanyin/domain";
import { createStore } from "./store";

/*
 * What the admin changed in the menu editor, on top of the seed menu: price,
 * name, description, photo, hidden, and new dishes. Published changes reach
 * the guest menu and the waiter's picker at once (same store, any tab).
 */

export type ItemEdit = { name?: I18nText; description?: I18nText; price?: number; photo?: string; hidden?: boolean };
export type NewItem = { id: string; categoryId: string; name: I18nText; description?: I18nText; price: number; photo?: string };
export type MenuEdits = { items: Record<string, ItemEdit>; added: NewItem[]; order: Record<string, string[]> };

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

/** The menu as guests see it: edits applied, hidden dishes out, new dishes in. */
export function applyEdits(menu: Menu, e: MenuEdits): Menu {
  if (!Object.keys(e.items).length && !e.added.length && !Object.keys(e.order).length) return menu;
  const categories = menu.categories.map((c) => {
    const items: MenuItem[] = c.items
      .filter((i) => !e.items[i.id]?.hidden)
      .map((i) => {
        const x = e.items[i.id];
        return x ? { ...i, ...(x.name ? { name: { ...i.name, ...x.name } } : {}), ...(x.description ? { description: { ...i.description, ...x.description } } : {}), ...(x.price !== undefined ? { price: x.price } : {}), ...(x.photo ? { photo: x.photo } : {}) } : i;
      });
    for (const n of e.added.filter((a) => a.categoryId === c.id && !e.items[a.id]?.hidden))
      items.push({ id: n.id, categoryId: c.id, name: n.name, description: n.description, price: e.items[n.id]?.price ?? n.price, photo: n.photo, variants: [], modifierGroups: [], tags: [], status: "confirmed" });
    const order = e.order[c.id];
    if (order) items.sort((a, b) => (order.indexOf(a.id) + 1 || 999) - (order.indexOf(b.id) + 1 || 999));
    return { ...c, items };
  });
  return { ...menu, categories: categories.filter((c) => c.items.length) };
}
