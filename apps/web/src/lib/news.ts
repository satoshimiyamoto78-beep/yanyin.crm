"use client";

import { useSyncExternalStore } from "react";

/*
 * News and messages with @mentions (ADR-015). The admin console posts; each
 * post keeps the internal ids it reaches (resolved from the @IDs when sent),
 * so only those people see it. In the demo the feed lives in this browser's
 * storage and reaches the waiter app in another tab; on the backend it is a
 * table with a recipients join and realtime delivery.
 */

export type NewsPost = { id: string; by: string; text: string; at: string; to: string[]; read: string[] };

const KEY = "yanyin:news";
const EVENT = "yanyin:news";

/** Two posts already in the feed this morning. */
export const SEED_NEWS: NewsPost[] = [
  { id: "n-seed-2", by: "staff-huong", text: "@all Briefing at 17:00 by the bar: new lemonades and the birthday at table 12.", at: "11:30", to: ["staff-linh", "staff-minh", "staff-thao", "staff-an", "staff-dima", "staff-lan"], read: ["staff-linh", "staff-thao", "staff-dima"] },
  { id: "n-seed-1", by: "staff-huong", text: "@thao_bar @an_bar the new syrups arrive at 14:00, please check the dates.", at: "10:05", to: ["staff-thao", "staff-an"], read: ["staff-thao", "staff-an"] },
];
// Starts on the seed: an empty storage means "nothing posted yet", not "no news".
let cache: { raw: string | null; posts: NewsPost[] } = { raw: null, posts: SEED_NEWS };

function read(): NewsPost[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return SEED_NEWS;
  }
  if (raw !== cache.raw) {
    let posts = SEED_NEWS;
    try {
      if (raw) posts = JSON.parse(raw) as NewsPost[];
    } catch {
      /* broken value: back to the seed */
    }
    cache = { raw, posts };
  }
  return cache.posts;
}

function subscribe(f: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) f();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, f);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, f);
  };
}

/** The whole feed, newest first. */
export function useNews(): NewsPost[] {
  return useSyncExternalStore(subscribe, read, () => SEED_NEWS);
}

function save(posts: NewsPost[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(posts));
  } catch {
    /* not saved */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function postNews(p: Omit<NewsPost, "id">) {
  save([{ ...p, id: `n${Date.now()}` }, ...read()]);
}

/** Marks a post read by one person. */
export function markRead(id: string, personId: string) {
  save(read().map((p) => (p.id === id && !p.read.includes(personId) ? { ...p, read: [...p.read, personId] } : p)));
}
