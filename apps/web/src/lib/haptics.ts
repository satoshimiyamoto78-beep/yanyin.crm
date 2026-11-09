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
  if (kind === "tick" && now - last < 35) return; // ticks during a fast spin would blur into one buzz
  last = now;
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
