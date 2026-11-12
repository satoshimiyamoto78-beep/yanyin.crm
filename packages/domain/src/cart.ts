import type { MenuItem } from "./types";

export type CartLine = {
  /** Stable key: item + variant + sorted modifier options. */
  key: string;
  itemId: string;
  variantId?: string;
  optionIds: string[];
  qty: number;
  unitPrice: number;
  /** The guest's word to the kitchen about this dish only ("no onion"). */
  note?: string;
};

/** Service charge most venues add to the bill; a venue can set its own. */
export const DEFAULT_SERVICE_RATE = 0.05;

/** Dishes, service and the total, so the guest sees the full price before ordering. */
export function withService(subtotal: number, rate = DEFAULT_SERVICE_RATE): { subtotal: number; service: number; total: number; rate: number } {
  const service = Math.round(subtotal * rate);
  return { subtotal, service, total: subtotal + service, rate };
}

export function unitPrice(item: MenuItem, variantId?: string, optionIds: string[] = []): number {
  const variant = item.variants.find((v) => v.id === variantId);
  const base = variant?.price ?? item.price;
  const options = item.modifierGroups.flatMap((g) => g.options);
  const extras = optionIds.reduce((sum, id) => sum + (options.find((o) => o.id === id)?.price ?? 0), 0);
  return base + extras;
}

export function lineKey(itemId: string, variantId: string | undefined, optionIds: string[], note = ""): string {
  const base = [itemId, variantId ?? "", [...optionIds].sort().join(",")].join("|");
  // A dish with its own note is its own line: two Tom Yums, one "no shrimp".
  return note.trim() ? `${base}|${note.trim().toLowerCase()}` : base;
}

/** Returns the ids of required modifier groups that have no selection yet. */
export function missingRequired(item: MenuItem, optionIds: string[]): string[] {
  return item.modifierGroups
    .filter((g) => g.required && !g.options.some((o) => optionIds.includes(o.id)))
    .map((g) => g.id);
}

/** Preselected options (e.g. hookah strength 5, master's choice flavour). */
export function defaultOptionIds(item: MenuItem): string[] {
  return item.modifierGroups.flatMap((g) => (g.defaultOptionId ? [g.defaultOptionId] : []));
}

export function addLine(lines: CartLine[], line: Omit<CartLine, "key">): CartLine[] {
  const note = line.note?.trim() || undefined;
  const key = lineKey(line.itemId, line.variantId, line.optionIds, note);
  const existing = lines.find((l) => l.key === key);
  if (existing) return lines.map((l) => (l.key === key ? { ...l, qty: l.qty + line.qty } : l));
  return [...lines, { ...line, note, key }];
}

/** Sets or clears one line's note; merges into a line that already has the same note. */
export function setNote(lines: CartLine[], key: string, note: string): CartLine[] {
  const line = lines.find((l) => l.key === key);
  if (!line) return lines;
  const rest = lines.filter((l) => l.key !== key);
  const at = lines.indexOf(line);
  const next = addLine(rest, { ...line, note });
  // Keep the line where it was in the list.
  const moved = next.find((l) => l.key === lineKey(line.itemId, line.variantId, line.optionIds, note.trim()))!;
  if (next.length === rest.length) return next; // merged into an existing line
  const without = next.filter((l) => l !== moved);
  return [...without.slice(0, at), moved, ...without.slice(at)];
}

export function setQty(lines: CartLine[], key: string, qty: number): CartLine[] {
  return qty <= 0 ? lines.filter((l) => l.key !== key) : lines.map((l) => (l.key === key ? { ...l, qty } : l));
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.qty, 0);
}
