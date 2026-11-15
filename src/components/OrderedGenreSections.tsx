"use client";

import Link from "@/components/LangLink";
import { useMemo } from "react";
import type { Genre, PublicStation } from "@/lib/types";
import { orderByLangs } from "@/lib/languages";
import { usePrefs } from "./PrefsProvider";
import StationRow from "./StationRow";

export type GenreSection = {
  genre: Genre;
  stations: PublicStation[];
};

/**
 * Home-page per-language sections — server order first, then re-sorted so
 * the listener's chosen languages surface above the rest (F-1.5).
 */
export default function OrderedGenreSections({
  sections,
}: {
  sections: GenreSection[];
}) {
  const { langs } = usePrefs();
  const ordered = useMemo(
    () =>
      langs?.length
        ? orderByLangs(
            sections.map((s) => ({ slug: s.genre.slug, s })),
            langs
          ).map((x) => x.s)
        : sections,
    [sections, langs]
  );

  return (
    <>
      {ordered.map(({ genre, stations }) => {
        if (!stations.length) return null;
        return (
          <section
            key={genre.slug}
            aria-labelledby={`g-${genre.slug}`}
            className="mt-8"
          >
            <div className="mb-3 flex items-baseline justify-between">
              <h2
                id={`g-${genre.slug}`}
                className="font-display text-[16.5px] font-semibold text-ink"
              >
                {genre.name} radio
              </h2>
              <Link
                href={`/genre/${genre.slug}`}
                className="text-xs font-semibold text-brand-2 dark:text-accent"
              >
                All {genre.count} →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {stations.map((s) => (
                <StationRow key={s.id} station={s} queue={stations} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
