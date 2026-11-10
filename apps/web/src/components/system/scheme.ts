"use client";

import { useEffect, useState } from "react";

/**
 * One light/dark preference for every yanyin surface (guest menu, waiter app).
 * We keep it in our own attribute, `data-scheme` on <html>, so a host page that
 * sets its own `data-theme` (the Claude artifact viewer does) cannot flip half
 * of our colours behind our back.
 */
const KEY = "yanyin:theme";

function apply(dark: boolean) {
  const root = document.documentElement;
  if (dark) root.dataset.scheme = "dark";
  else delete root.dataset.scheme;
}

export function useScheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    let saved = false;
    try {
      saved = localStorage.getItem(KEY) === "dark";
    } catch {
      /* private mode: stay light */
    }
    apply(saved);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read the saved choice once on mount
    if (saved) setDark(true);
    return () => apply(false);
  }, []);
  const toggle = () => {
    const next = !dark;
    try {
      localStorage.setItem(KEY, next ? "dark" : "light");
    } catch {
      /* not saved, still switches */
    }
    // One GPU cross-fade of the whole screen instead of hundreds of colour transitions.
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    const run = () => {
      apply(next);
      setDark(next);
    };
    if (doc.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) doc.startViewTransition(run);
    else run();
  };
  return { dark, toggle };
}
