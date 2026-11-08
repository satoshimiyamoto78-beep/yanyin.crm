import type { I18nText, Lang } from "./types";

/** Picks the text for `lang`, falling back to English, then to any available language. */
export function t(text: I18nText | undefined, lang: Lang): string {
  if (!text) return "";
  return text[lang] ?? text.en ?? Object.values(text).find(Boolean) ?? "";
}

/** True when the text has a real translation for `lang` (not a fallback). */
export function hasTranslation(text: I18nText, lang: Lang): boolean {
  return Boolean(text[lang]);
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
