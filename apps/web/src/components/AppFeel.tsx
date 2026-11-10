"use client";

import { useEffect } from "react";

const EDITABLE = "input, textarea, select, [contenteditable], .selectable";

/**
 * Makes the web app behave like a native one: a long press never opens the
 * browser's context menu (copy text, save image, open link). Text fields keep
 * their own menu for paste.
 */
export function AppFeel() {
  useEffect(() => {
    const onMenu = (e: Event) => {
      const t = e.target as Element | null;
      if (!t?.closest?.(EDITABLE)) e.preventDefault();
    };
    const onDrag = (e: DragEvent) => {
      const t = e.target as Element | null;
      if (t?.closest?.("img, a")) e.preventDefault();
    };
    document.addEventListener("contextmenu", onMenu);
    document.addEventListener("dragstart", onDrag);
    return () => {
      document.removeEventListener("contextmenu", onMenu);
      document.removeEventListener("dragstart", onDrag);
    };
  }, []);
  return null;
}
