/**
 * Haptic feedback that adapts to the device.
 *
 * - Android (Chrome, Samsung Internet, Firefox): the Vibration API, with short
 *   patterns tuned per kind. Needs one earlier tap on the page (browsers ask for
 *   a user gesture once); after that it works from timers too.
 * - iPhone and iPad on iOS 18+: Safari has no Vibration API, but toggling a native
 *   `<input type="checkbox" switch>` plays the system haptic, so we click a
 *   hidden one. Works inside a tap; iOS may stay silent for haptics fired from
 *   timers (hold timers), which is the platform's rule.
 * - Older iOS, desktops, browsers without either: silent, never an error.
 *
 * One switch turns it all off (the waiter's "Vibration" setting).
 */
export type Haptic = "tick" | "light" | "success";

const PATTERN: Record<Haptic, number | number[]> = { tick: 6, light: 12, success: [14, 50, 22] };

let iosSwitch: HTMLLabelElement | null = null;
let last = 0;
let lastRank = 0;
let enabled = true;
const RANK: Record<Haptic, number> = { tick: 1, light: 2, success: 3 };

type Engine = "vibrate" | "ios-switch" | "none";
let engine: Engine | null = null;

function detect(): Engine {
  if (typeof navigator === "undefined") return "none";
  if (typeof navigator.vibrate === "function") return "vibrate";
  const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!ios) return "none";
  // The switch haptic exists from iOS 17.4 / 18; older iOS ignores the attribute.
  const probe = document.createElement("input");
  probe.setAttribute("switch", "");
  return "switch" in probe || /OS (1[89]|[2-9]\d)_/.test(navigator.userAgent) ? "ios-switch" : "none";
}

function iosTick() {
  if (!iosSwitch) {
    const label = document.createElement("label");
    label.setAttribute("aria-hidden", "true");
    label.style.cssText = "position:fixed;left:-100px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    input.tabIndex = -1;
    label.appendChild(input);
    document.body.appendChild(label);
    iosSwitch = label;
  }
  iosSwitch.click();
}

/** Turn every haptic on or off (the user's vibration setting). */
export function setHaptics(on: boolean) {
  enabled = on;
}

export function haptic(kind: Haptic = "light") {
  if (typeof window === "undefined" || !enabled) return;
  engine ??= detect();
  if (engine === "none") return;
  const now = performance.now();
  // One gesture, one buzz: a weaker haptic right after another is dropped (fast-spin
  // ticks, or a global tap tick followed by the button's own one); a stronger one wins.
  if (now - last < 40 && RANK[kind] <= lastRank) return;
  last = now;
  lastRank = RANK[kind];
  try {
    if (engine === "vibrate") navigator.vibrate(PATTERN[kind]);
    else {
      iosTick();
      if (kind === "success") setTimeout(iosTick, 90);
    }
  } catch {
    /* haptics are a nicety */
  }
}
