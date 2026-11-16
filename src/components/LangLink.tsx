"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { ComponentProps } from "react";
import { hasLocale } from "@/i18n/locales";

type Props = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

/**
 * Locale-aware Link (F-3.1): internal absolute hrefs ("/station/x") get
 * the current /{lang} prefix; external URLs, hashes and already-prefixed
 * paths pass through untouched.
 */
export default function LangLink({ href, ...rest }: Props) {
  const params = useParams();
  const lang = params?.lang;
  const resolved =
    typeof lang === "string" &&
    hasLocale(lang) &&
    href.startsWith("/") &&
    !/^\/(en|ta|hi)(\/|$)/.test(href)
      ? `/${lang}${href === "/" ? "" : href}` || "/"
      : href;
  return <Link href={resolved} {...rest} />;
}
