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
type CrewPrefs = {
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

/** Values for `{name}` slots in a phrase; `n` also picks the plural form. */
export type TrVars = Record<string, string | number>;
type Tr = (en: string, vars?: TrVars) => string;
type Names = { en?: string; ru?: string; vi?: string };
type Ctx = { prefs: CrewPrefs; set: (p: Partial<CrewPrefs>) => void; tr: Tr; dish: (n: Names | undefined) => string; locale: string };

/**
 * Plural forms are written in one string, split by "|": English "a|b"
 * (one, many), Russian "a|b|c" (1 гость, 2 гостя, 5 гостей). Vietnamese has
 * no plural, so its phrases have a single form.
 */
const plural = (forms: string[], n: number, lang: CrewLang) => {
  if (forms.length === 1) return forms[0]!;
  if (lang === "ru" && forms.length >= 3) {
    const a = Math.abs(n) % 100;
    const b = a % 10;
    return forms[a > 10 && a < 20 ? 2 : b === 1 ? 0 : b >= 2 && b <= 4 ? 1 : 2]!;
  }
  return forms[Math.abs(n) === 1 ? 0 : forms.length - 1]!;
};

/** Translates a whole phrase (never glued pieces), fills `{slots}` and picks the plural form by `n`. */
const translate = (dict: Record<string, string> | null, lang: CrewLang): Tr => (en, vars) => {
  let s = dict?.[en] ?? en;
  if (s.includes("|")) s = plural(s.split("|"), typeof vars?.n === "number" ? vars.n : 2, dict?.[en] ? lang : "en");
  return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
};

const PrefsContext = createContext<Ctx>({ prefs: DEFAULT, set: () => {}, tr: translate(null, "en"), dish: (n) => n?.en ?? "", locale: "en" });

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
  const tr = translate(dict, prefs.lang);
  // Dish names come from the venue's menu, which carries its own translations.
  const dish = (n: Names | undefined) => (n ? (n[prefs.lang] ?? n.en ?? n.ru ?? n.vi ?? "") : "");
  const locale = prefs.lang === "ru" ? "ru-RU" : prefs.lang === "vi" ? "vi-VN" : "en-GB";
  return (
    <PrefsContext.Provider value={{ prefs, set, tr, dish, locale }}>
      {/* Large text scales the whole waiter app, pages and bars included. */}
      <div style={prefs.text === "large" ? { zoom: 1.12 } : undefined}>{children}</div>
    </PrefsContext.Provider>
  );
}

export const usePrefs = () => useContext(PrefsContext);
export const useTr = () => useContext(PrefsContext).tr;
export const useDish = () => useContext(PrefsContext).dish;
export const useLocale = () => useContext(PrefsContext).locale;
