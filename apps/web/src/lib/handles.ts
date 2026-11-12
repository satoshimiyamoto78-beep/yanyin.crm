"use client";

import { useSyncExternalStore } from "react";
import type { Person } from "@yanyin/domain";

/*
 * Each person's chosen @ID (ADR-015). One @ID per person across the whole
 * platform; changing it keeps every order, tip and review, which are stored
 * against the internal id. In the demo the choice lives in this browser and
 * is shared by the waiter app, the station screen and the admin console.
 */
const KEY = "yanyin:handles";
const EVENT = "yanyin:handles";
const EMPTY: Record<string, string> = {};
let cache: { raw: string | null; map: Record<string, string> } = { raw: null, map: EMPTY };

function read(): Record<string, string> {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw !== cache.raw) {
    let map = EMPTY;
    try {
      if (raw) map = JSON.parse(raw) as Record<string, string>;
    } catch {
      /* broken value: no overrides */
    }
    cache = { raw, map };
  }
  return cache.map;
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

/** Chosen @IDs by internal person id. */
export function useHandles(): Record<string, string> {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function saveHandle(personId: string, handle: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), [personId]: handle }));
  } catch {
    /* not saved */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** The team with everyone's chosen @ID applied. */
export function withHandles(team: Person[], handles: Record<string, string>): Person[] {
  return team.map((p) => (handles[p.id] ? { ...p, handle: handles[p.id]! } : p));
}
