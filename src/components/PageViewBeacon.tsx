"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics";

/**
 * Pageview beacon (F-4.1) — fires once per App Router navigation, keyed
 * by page *type* rather than full path so counts stay aggregate and the
 * dashboard stays readable. Silent no-op until consent is granted.
 */
const GROUPS: [RegExp, string][] = [
  [/^\/[a-z]{2}\/?$/, "home"],
  [/^\/[a-z]{2}\/station\//, "station"],
  [/^\/[a-z]{2}\/genre\//, "genre"],
  [/^\/[a-z]{2}\/category\//, "category"],
  [/^\/[a-z]{2}\/city\//, "city"],
  [/^\/[a-z]{2}\/network\//, "network"],
  [/^\/[a-z]{2}\/collection\//, "collection"],
  [/^\/[a-z]{2}\/listen\//, "listen-market"],
  [/^\/[a-z]{2}\/listen\/?$/, "listen-index"],
  [/^\/[a-z]{2}\/search/, "search"],
  [/^\/[a-z]{2}\/simple/, "simple"],
];

export default function PageViewBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    const group = GROUPS.find(([re]) => re.test(pathname))?.[1] ?? "other";
    const lang = pathname.split("/")[1] ?? "en";
    track("pageview", { p: group, l: lang });
  }, [pathname]);
  return null;
}
