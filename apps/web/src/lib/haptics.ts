/**
 * Haptic feedback for the guest and staff PWAs.
 * Android: Vibration API. iOS Safari has no Vibration API, but since iOS 18
 * toggling a native `<input type="checkbox" switch>` plays the system tick,
 * so we click a hidden one.
 */
export type Haptic = "tick" | "light" | "success";

const PATTERN: Record<Haptic, number | number[]> = { tick: 6, light: 12, success: [14, 50, 22] };

let iosSwitch: HTMLLabelElement | null = null;
let last = 0;
let lastRank = 0;
const RANK: Record<Haptic, number> = { tick: 1, light: 2, success: 3 };

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

export function haptic(kind: Haptic = "light") {
  if (typeof window === "undefined") return;
  const now = performance.now();
  // One gesture, one buzz: a weaker haptic right after another is dropped (fast-spin
  // ticks, or a global tap tick followed by the button's own one); a stronger one wins.
  if (now - last < 40 && RANK[kind] <= lastRank) return;
  last = now;
  lastRank = RANK[kind];
  try {
    if (typeof navigator.vibrate === "function") navigator.vibrate(PATTERN[kind]);
    else if (/iP(hone|ad|od)/.test(navigator.userAgent)) {
      iosTick();
      if (kind === "success") setTimeout(iosTick, 90);
    }
  } catch {
    /* haptics are a nicety */
  }
}
