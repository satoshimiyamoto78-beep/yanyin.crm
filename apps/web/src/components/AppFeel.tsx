"use client";

import { useEffect } from "react";
import { haptic } from "@/lib/haptics";

const EDITABLE = "input, textarea, select, [contenteditable], .selectable";

/**
 * Makes the web app behave like a native one: a long press never opens the
 * browser's context menu (copy text, save image, open link). Text fields keep
 * their own menu for paste. Every real tap on a control answers with a light
 * haptic, so no button is left silent; buttons that need a stronger one
 * (success, ticks on a dial) still fire their own.
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
    const onTap = (e: MouseEvent) => {
      if (!e.isTrusted) return; // our own iOS switch click, or scripted clicks
      const t = e.target as Element | null;
      const el = t?.closest?.("button, a, [role=button], [role=tab], [role=switch], summary, label, input[type=checkbox], input[type=radio]");
      if (el && !(el as HTMLButtonElement).disabled) haptic("light");
    };
    document.addEventListener("click", onTap, true);
    document.addEventListener("contextmenu", onMenu);
    document.addEventListener("dragstart", onDrag);
    return () => {
      document.removeEventListener("click", onTap, true);
      document.removeEventListener("contextmenu", onMenu);
      document.removeEventListener("dragstart", onDrag);
    };
  }, []);
  return null;
}
