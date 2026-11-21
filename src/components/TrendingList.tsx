"use client";

import { useEffect, useMemo, useState } from "react";
import type { PublicStation } from "@/lib/types";
import { orderByLangs } from "@/lib/languages";
import { usePrefs } from "./PrefsProvider";
import StationRow from "./StationRow";

/**
 * Trending stations on the search page — live 24h/7d play counts blended
 * with editorial rank (F-2.6), preferred languages bubble up once prefs
 * hydrate (F-1.5). The server-rendered `stations` prop is the fallback
 * until the fetch lands or if it fails.
 */
export default function TrendingList({
  stations,
}: {
  stations: PublicStation[];
}) {
  const { langs } = usePrefs();
  const [live, setLive] = useState<PublicStation[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/trending?n=12")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.stations?.length) setLive(d.stations);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const base = live ?? stations;
  const ordered = useMemo(
    () =>
      langs?.length
        ? orderByLangs(
            base.map((s) => ({ slug: s.genre, s })),
            langs
          ).map((x) => x.s)
        : base,
    [base, langs]
  );

  return (
    <div className="mt-2.5 grid grid-cols-1 gap-2.5 md:grid-cols-2">
      {ordered.map((s, i) => (
        <div key={s.id} className="flex items-center gap-3">
          <span className="w-5 shrink-0 text-center font-display text-[15px] font-bold text-brand-2 dark:text-accent">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <StationRow station={s} queue={ordered} fav />
          </div>
        </div>
      ))}
    </div>
  );
}
