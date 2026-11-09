import type { MenuItem } from "./types";

export type CartLine = {
  /** Stable key: item + variant + sorted modifier options. */
  key: string;
  itemId: string;
  variantId?: string;
  optionIds: string[];
  qty: number;
  unitPrice: number;
};

export function unitPrice(item: MenuItem, variantId?: string, optionIds: string[] = []): number {
  const variant = item.variants.find((v) => v.id === variantId);
  const base = variant?.price ?? item.price;
  const options = item.modifierGroups.flatMap((g) => g.options);
  const extras = optionIds.reduce((sum, id) => sum + (options.find((o) => o.id === id)?.price ?? 0), 0);
  return base + extras;
}

export function lineKey(itemId: string, variantId: string | undefined, optionIds: string[]): string {
  return [itemId, variantId ?? "", [...optionIds].sort().join(",")].join("|");
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
  const key = lineKey(line.itemId, line.variantId, line.optionIds);
  const existing = lines.find((l) => l.key === key);
  if (existing) return lines.map((l) => (l.key === key ? { ...l, qty: l.qty + line.qty } : l));
  return [...lines, { ...line, key }];
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
