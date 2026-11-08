import { normalizeMenu, type Menu, type RawMenu } from "@yanyin/domain";
import samarkand from "./samarkand.menu.json";
import zabey from "./zabey.menu.json";

/** Pilot venues (Da Nang). Source: founder-provided menu photos; see docs/05-pilot-vietnam.md. */
const RAW: Record<string, RawMenu> = {
  "samarkand-danang": samarkand as RawMenu,
  "zabey-danang": zabey as RawMenu,
};

const cache = new Map<string, Menu>();

export function getMenu(slug: string): Menu | null {
  const raw = RAW[slug];
  if (!raw) return null;
  if (!cache.has(slug)) cache.set(slug, normalizeMenu(raw));
  return cache.get(slug)!;
}

export function venueSlugs(): string[] {
  return Object.keys(RAW);
}
