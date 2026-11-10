"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { RU, VI } from "./strings";
import { setHaptics } from "@/lib/haptics";

/*
 * Waiter preferences that outlive a page: language, text size, notification
 * switches, zone, printer. Saved on this phone. `tr()` translates interface
 * text by its English source; anything not translated yet stays in English.
 */

export type CrewLang = "en" | "ru" | "vi";
export const CREW_LANGS: Record<CrewLang, string> = { en: "English", ru: "Русский", vi: "Tiếng Việt" };

export type NotifyPrefs = {
  qrOrders: boolean;
  newOrders: boolean;
  kitchenReady: boolean;
  bills: boolean;
  calls: boolean;
  payments: boolean;
  bookings: boolean;
  arrivals: boolean;
  quests: boolean;
  sound: boolean;
  vibration: boolean;
};
export type CrewPrefs = {
  lang: CrewLang;
  text: "default" | "large";
  zone: "Hall" | "Terrace";
  onBreak: boolean;
  pin: boolean;
  faceId: boolean;
  notify: NotifyPrefs;
  printer: { id: string; autoPrint: boolean; copies: 1 | 2; width: 58 | 80 };
};

const DEFAULT: CrewPrefs = {
  lang: "en",
  text: "default",
  zone: "Hall",
  onBreak: false,
  pin: true,
  faceId: false,
  notify: { qrOrders: true, newOrders: true, kitchenReady: true, bills: true, calls: true, payments: true, bookings: false, arrivals: true, quests: true, sound: true, vibration: true },
  printer: { id: "hall", autoPrint: true, copies: 1, width: 80 },
};
const KEY = "yanyin:crew-prefs";

type Ctx = { prefs: CrewPrefs; set: (p: Partial<CrewPrefs>) => void; tr: (en: string) => string };
const PrefsContext = createContext<Ctx>({ prefs: DEFAULT, set: () => {}, tr: (s) => s });

export function CrewPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<CrewPrefs>(DEFAULT);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore saved preferences once on mount
      if (raw) setPrefs((p) => ({ ...p, ...JSON.parse(raw), notify: { ...p.notify, ...JSON.parse(raw).notify }, printer: { ...p.printer, ...JSON.parse(raw).printer } }));
    } catch {
      /* defaults */
    }
  }, []);
  const set = (p: Partial<CrewPrefs>) =>
    setPrefs((cur) => {
      const next = { ...cur, ...p };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* still applied */
      }
      return next;
    });
  // The "Vibration" switch governs every haptic in the app.
  useEffect(() => {
    setHaptics(prefs.notify.vibration);
  }, [prefs.notify.vibration]);
  const dict = prefs.lang === "ru" ? RU : prefs.lang === "vi" ? VI : null;
  const tr = (en: string) => (dict ? (dict[en] ?? en) : en);
  return (
    <PrefsContext.Provider value={{ prefs, set, tr }}>
      {/* Large text scales the whole waiter app, pages and bars included. */}
      <div style={prefs.text === "large" ? { zoom: 1.12 } : undefined}>{children}</div>
    </PrefsContext.Provider>
  );
}

export const usePrefs = () => useContext(PrefsContext);
export const useTr = () => useContext(PrefsContext).tr;
