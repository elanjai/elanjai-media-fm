import { lang as rootLang } from "next/root-params";
import { notFound } from "next/navigation";
import { SITE } from "@/lib/site";
import { DEFAULT_LOCALE, LOCALES, hasLocale, type Locale } from "./locales";

/**
 * Server-only i18n entry (F-3.1) — anything that needs the [lang] root
 * param or the dictionaries. Client components must import from
 * "@/i18n/locales" instead; next/root-params is server-only.
 */
export * from "./locales";

/** hreflang alternates for a locale-relative path ("" = home). Server-only. */
export const langAlternates = (path: string) => ({
  languages: Object.fromEntries([
    ...LOCALES.map((l) => [l, `${SITE.url}/${l}${path}`]),
    ["x-default", `${SITE.url}/${DEFAULT_LOCALE}${path}`],
  ]),
});

const dictionaries = {
  en: () => import("./dictionaries/en.json").then((m) => m.default),
  ta: () => import("./dictionaries/ta.json").then((m) => m.default),
  hi: () => import("./dictionaries/hi.json").then((m) => m.default),
};

export type Dictionary = Awaited<ReturnType<(typeof dictionaries)["en"]>>;

/** Server-side dictionary loader — resolves the [lang] root param itself. */
export async function getDictionary(): Promise<Dictionary> {
  const l = await rootLang();
  if (!hasLocale(l)) notFound();
  return dictionaries[l]();
}

/** Dictionary lookup for a known locale (generateMetadata etc.). */
export async function dictionaryFor(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}
