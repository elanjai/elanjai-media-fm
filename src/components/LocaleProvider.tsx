"use client";

import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import type { Dictionary } from "@/i18n";
import { hasLocale, LOCALE_COOKIE, type Locale } from "@/i18n/locales";

type Ctx = { lang: Locale; dict: Dictionary };

const LocaleCtx = createContext<Ctx | null>(null);

/** Carries the active locale + dictionary to every client component (F-3.1). */
export default function LocaleProvider({
  lang,
  dict,
  children,
}: {
  lang: Locale;
  dict: Dictionary;
  children: ReactNode;
}) {
  return <LocaleCtx.Provider value={{ lang, dict }}>{children}</LocaleCtx.Provider>;
}

/** Current UI locale — falls back to the [lang] route param. */
export function useLang(): Locale {
  const ctx = useContext(LocaleCtx);
  const p = useParams().lang;
  if (ctx) return ctx.lang;
  return typeof p === "string" && hasLocale(p) ? p : "en";
}

/** Dictionary lookup: t("nav.home") — missing keys fall back to the key. */
export function useT() {
  const ctx = useContext(LocaleCtx);
  return (key: string): string => {
    if (!ctx) return key;
    const [group, k] = key.split(".");
    const val = (ctx.dict as Record<string, Record<string, string>>)[group]?.[k];
    return val ?? key;
  };
}

/**
 * Localized display name for a catalog genre/language slug ("tamil" →
 * "தமிழ்" under ta, "तमिल" under hi). Falls back to the given English
 * name, then to a title-cased slug. Server components use genreName()
 * from "@/i18n" instead.
 */
export function useGenreName() {
  const ctx = useContext(LocaleCtx);
  return useCallback(
    (slug: string, fallback?: string): string => {
      const names = (
        ctx?.dict as { genreNames?: Record<string, string> } | undefined
      )?.genreNames;
      return names?.[slug] ?? fallback ?? slug[0].toUpperCase() + slug.slice(1);
    },
    [ctx]
  );
}

/** Pathname without the /{lang} prefix — for active-tab comparisons. */
export function useLocalePath(): string {
  const pathname = usePathname() ?? "/";
  return pathname.replace(/^\/(en|ta|hi)(?=\/|$)/, "") || "/";
}

/**
 * Switch the UI locale: navigates to the same page under /{locale} (keeping
 * the query string and hash) and remembers the choice in a cookie the proxy
 * reads before Accept-Language. Client-side nav keeps AudioProvider mounted,
 * so playback continues across the switch.
 */
export function useSwitchLocale() {
  const router = useRouter();
  const path = useLocalePath();
  return useCallback(
    (l: Locale) => {
      try {
        document.cookie = `${LOCALE_COOKIE}=${l};path=/;max-age=31536000;SameSite=Lax`;
      } catch {
        /* cookie unavailable */
      }
      router.push(
        `/${l}${path === "/" ? "" : path}${window.location.search}${window.location.hash}`
      );
    },
    [router, path]
  );
}
