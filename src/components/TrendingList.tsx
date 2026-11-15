"use client";

import { useMemo } from "react";
import type { PublicStation } from "@/lib/types";
import { orderByLangs } from "@/lib/languages";
import { usePrefs } from "./PrefsProvider";
import StationRow from "./StationRow";

/**
 * Trending stations on the search page — preferred languages bubble to the
 * top once prefs are hydrated (F-1.5).
 */
export default function TrendingList({
  stations,
}: {
  stations: PublicStation[];
}) {
  const { langs } = usePrefs();
  const ordered = useMemo(
    () =>
      langs?.length
        ? orderByLangs(
            stations.map((s) => ({ slug: s.genre, s })),
            langs
          ).map((x) => x.s)
        : stations,
    [stations, langs]
  );

  return (
    <div className="mt-2.5 grid grid-cols-1 gap-2.5 md:grid-cols-2">
      {ordered.map((s, i) => (
        <div key={s.id} className="flex items-center gap-3">
          <span className="w-5 shrink-0 text-center font-display text-[15px] font-bold text-brand-2 dark:text-accent">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <StationRow station={s} queue={ordered} />
          </div>
        </div>
      ))}
    </div>
  );
}
