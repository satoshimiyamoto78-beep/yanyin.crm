"use client";

import { useSyncExternalStore } from "react";

/*
 * A small shared store for the demo: one value in this browser's storage, read
 * with useSyncExternalStore, so every open screen (guest, waiter, admin,
 * station) sees a change at once, in this tab and in the others. On the backend
 * each store is a table with realtime updates; the screens keep the same API.
 */
export function createStore<T>(key: string, seed: T) {
  const event = `store:${key}`;
  let cache: { raw: string | null; value: T } = { raw: null, value: seed };
  const get = (): T => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      return seed;
    }
    if (raw !== cache.raw) {
      let value = seed;
      try {
        if (raw) value = JSON.parse(raw) as T;
      } catch {
        /* a broken value falls back to the seed */
      }
      cache = { raw, value };
    }
    return cache.value;
  };
  const subscribe = (f: () => void) => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key) f();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(event, f);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(event, f);
    };
  };
  const set = (next: T | ((cur: T) => T)) => {
    const value = typeof next === "function" ? (next as (cur: T) => T)(get()) : next;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* not saved; this screen still shows it */
    }
    window.dispatchEvent(new Event(event));
  };
  const use = () => useSyncExternalStore(subscribe, get, () => seed);
  return { use, get, set };
}
