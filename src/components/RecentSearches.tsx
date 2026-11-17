"use client";

import Link from "@/components/LangLink";
import { useEffect, useState } from "react";
import { useT } from "./LocaleProvider";
import { RECENT_SEARCHES_KEY } from "./SearchInput";

/** Recent-search chips (stored in localStorage by SearchInput). */
export default function RecentSearches() {
  const t = useT();
  const [items, setItems] = useState<string[]>([]);
  useEffect(() => {
    queueMicrotask(() => {
      try {
        setItems(JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) ?? "[]"));
      } catch {
        /* private mode */
      }
    });
  }, []);
  if (!items.length) return null;
  return (
    <section aria-label={t("search.recentSearches")}>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
        {t("search.recentSearches")}
      </h2>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {items.map((q) => (
          <Link
            key={q}
            href={`/search?q=${encodeURIComponent(q)}`}
            className="rounded-full border border-border bg-surface-2 px-4 py-2 text-xs font-medium text-ink transition hover:border-brand-2/50"
          >
            {q}
          </Link>
        ))}
      </div>
    </section>
  );
}
