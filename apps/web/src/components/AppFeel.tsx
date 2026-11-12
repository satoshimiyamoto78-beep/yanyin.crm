"use client";

import { useEffect } from "react";
import { haptic } from "@/lib/haptics";

const EDITABLE = "input, textarea, select, [contenteditable], .selectable";
/** Decorations that move on their own; they pause off screen. */
const DECO = ".yan-orb, .wheel-idle, .aurora";

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
    // iOS Safari ignores user-scalable=no: its own pinch gesture events are
    // stopped here, and CSS touch-action (pan only) blocks pinch elsewhere.
    // No touchmove listener: a blocking one makes every scroll wait for JS.
    const noZoom = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", noZoom, { passive: false } as AddEventListenerOptions);
    document.addEventListener("gesturechange", noZoom, { passive: false } as AddEventListenerOptions);
    document.addEventListener("click", onTap, true);
    document.addEventListener("contextmenu", onMenu);
    document.addEventListener("dragstart", onDrag);

    // Decorative idle motion rests off screen and while anything scrolls.
    const root = document.documentElement;
    const io = new IntersectionObserver((es) => es.forEach((e) => e.target.classList.toggle("deco-off", !e.isIntersecting)));
    const seen = new WeakSet<Element>();
    let scanQueued = 0;
    const scan = () => {
      scanQueued = 0;
      document.querySelectorAll(DECO).forEach((el) => {
        if (!seen.has(el)) {
          seen.add(el);
          io.observe(el);
        }
      });
    };
    scan();
    const mo = new MutationObserver(() => {
      if (!scanQueued) scanQueued = requestAnimationFrame(scan);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    let still: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      if (!("scrolling" in root.dataset)) root.dataset.scrolling = "";
      clearTimeout(still);
      still = setTimeout(() => delete root.dataset.scrolling, 200);
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      cancelAnimationFrame(scanQueued);
      clearTimeout(still);
      document.removeEventListener("scroll", onScroll, { capture: true });
      document.removeEventListener("click", onTap, true);
      document.removeEventListener("gesturestart", noZoom);
      document.removeEventListener("gesturechange", noZoom);
      document.removeEventListener("contextmenu", onMenu);
      document.removeEventListener("dragstart", onDrag);
    };
  }, []);
  return null;
}
