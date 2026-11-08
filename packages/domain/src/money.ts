import type { Currency, Lang } from "./types";

const LOCALES: Record<Lang, string> = {
  en: "en-US",
  ru: "ru-RU",
  vi: "vi-VN",
  ko: "ko-KR",
  zh: "zh-CN",
};

const FRACTION_DIGITS: Record<Currency, number> = { VND: 0, UZS: 0, TJS: 2, USD: 2 };

/**
 * Formats an integer amount for display. VND and UZS have no minor units in
 * practice, so amounts are stored as whole units; TJS and USD are stored in
 * minor units (diram / cents).
 */
export function formatMoney(amount: number, currency: Currency, lang: Lang = "en"): string {
  const digits = FRACTION_DIGITS[currency];
  const value = digits === 0 ? amount : amount / 10 ** digits;
  const formatted = new Intl.NumberFormat(LOCALES[lang], {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
  return currency === "VND" ? `${formatted} ₫` : `${formatted} ${currency}`;
}

/** Short form for tight UI, e.g. 180 000 ₫ → "180k". */
export function formatMoneyShort(amount: number, currency: Currency): string {
  if (currency === "VND" || currency === "UZS") {
    if (amount >= 1_000_000) return `${+(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `${Math.round(amount / 1_000)}k`;
  }
  return String(amount);
}
