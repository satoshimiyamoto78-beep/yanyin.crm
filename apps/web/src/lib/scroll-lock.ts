"use client";

import { useEffect } from "react";

/*
 * Real scroll lock for overlays, iOS included. `overflow: hidden` on <body> is
 * not enough on iPhone: the page still scrolls under a sheet or a peek. While
 * anything is open we pin <body> in place (position: fixed at the current
 * offset) and put the page back exactly where it was when the last overlay
 * closes. Counted, so nested overlays work.
 */
let locks = 0;
let savedY = 0;

function lock() {
  if (locks++ > 0) return;
  savedY = window.scrollY;
  const b = document.body.style;
  b.position = "fixed";
  b.top = `-${savedY}px`;
  b.left = "0";
  b.right = "0";
  b.width = "100%";
  b.overflow = "hidden";
  document.documentElement.style.overscrollBehavior = "none";
}

function unlock() {
  if (--locks > 0) return;
  locks = 0;
  const b = document.body.style;
  b.position = "";
  b.top = "";
  b.left = "";
  b.right = "";
  b.width = "";
  b.overflow = "";
  document.documentElement.style.overscrollBehavior = "";
  window.scrollTo(0, savedY);
}

/** Locks page scroll while `active` is true. */
export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    lock();
    return unlock;
  }, [active]);
}

/** Drop-in for conditional overlays: render it inside the overlay to freeze the page behind. */
export function ScrollLock() {
  useScrollLock(true);
  return null;
}
