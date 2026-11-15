"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useParams, usePathname } from "next/navigation";
import type { Dictionary } from "@/i18n";
import { hasLocale, type Locale } from "@/i18n/locales";

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

/** Pathname without the /{lang} prefix — for active-tab comparisons. */
export function useLocalePath(): string {
  const pathname = usePathname() ?? "/";
  return pathname.replace(/^\/(en|ta|hi)(?=\/|$)/, "") || "/";
}
