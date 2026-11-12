"use client";

import { useSyncExternalStore } from "react";
import type { Menu } from "@yanyin/domain";

/*
 * The stop-list: dishes a station marked as run out. The station screen
 * writes it; the guest menu and the waiter's picker hide those dishes at
 * once, even in another tab (the storage event). On the backend this is a
 * realtime row per location.
 */
const KEY = "yanyin:stoplist";
const EVENT = "yanyin:stoplist";
const EMPTY: string[] = [];
let cache: { raw: string | null; ids: string[] } = { raw: null, ids: EMPTY };

function read(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw !== cache.raw) {
    let ids = EMPTY;
    try {
      ids = raw ? (JSON.parse(raw) as string[]) : EMPTY;
    } catch {
      /* broken value: treat as empty */
    }
    cache = { raw, ids };
  }
  return cache.ids;
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

/** Ids of dishes that ran out right now. */
export function useStopList(): string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** Saves the stop-list and tells this tab's listeners. */
export function saveStopList(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* not saved */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** The menu without dishes that ran out; empty categories drop out too. */
export function withoutStopped(menu: Menu, stop: string[]): Menu {
  if (!stop.length) return menu;
  const categories = menu.categories.map((c) => ({ ...c, items: c.items.filter((i) => !stop.includes(i.id)) })).filter((c) => c.items.length);
  return { ...menu, categories };
}
