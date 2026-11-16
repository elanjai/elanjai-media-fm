/**
 * Client-safe locale constants (F-3.1). Everything here must stay free of
 * server-only imports (next/root-params, next/navigation) AND heavy data —
 * LangLink and LocaleProvider pull this into the client bundle. (Importing
 * @/lib/site here would drag the whole station catalog into client JS.)
 */
export const LOCALE_META = {
  en: { name: "English", native: "English", dir: "ltr", font: null },
  ta: { name: "Tamil", native: "தமிழ்", dir: "ltr", font: "tamil" },
  hi: { name: "Hindi", native: "हिन्दी", dir: "ltr", font: "devanagari" },
} as const;

export type Locale = keyof typeof LOCALE_META;
export const LOCALES = Object.keys(LOCALE_META) as Locale[];
export const DEFAULT_LOCALE: Locale = "en";

export const hasLocale = (l: string): l is Locale => l in LOCALE_META;

/** Tiny "{count} stations" interpolation used by dictionary strings. */
export const fmt = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));

/** Preferred locale from an Accept-Language header. */
export function detectLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;
  for (const part of acceptLanguage.split(",")) {
    const tag = part.split(";")[0].trim().toLowerCase();
    const base = tag.split("-")[0];
    if (hasLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
