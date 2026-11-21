"use client";

import Link from "@/components/LangLink";
import { Fragment, useMemo } from "react";
import { fmt } from "@/i18n/locales";
import type { Genre, PublicStation } from "@/lib/types";
import { useGenreName, useT } from "./LocaleProvider";
import { usePrefs } from "./PrefsProvider";
import StationRow from "./StationRow";

export type GenreSection = {
  genre: Genre;
  stations: PublicStation[];
};

/**
 * Home-page per-language sections — every language the listener did NOT
 * pick already renders as a "Popular {lang}" rail above, so those are
 * skipped here and the rest keep their server order (F-1.5).
 */
export default function OrderedGenreSections({
  sections,
  insertAfter,
}: {
  sections: GenreSection[];
  /** Rendered between the 2nd and 3rd language sections (ad placement). */
  insertAfter?: React.ReactNode;
}) {
  const { langs } = usePrefs();
  const t = useT();
  const gn = useGenreName();
  const ordered = useMemo(() => {
    // Picked languages are already covered by the "Popular {lang}" rails —
    // skip them all so no language shows twice, then cap at 4 sections.
    const picked = new Set(langs?.length ? langs : ["tamil"]);
    return sections.filter((s) => !picked.has(s.genre.slug)).slice(0, 4);
  }, [sections, langs]);

  return (
    <>
      {ordered.map(({ genre, stations }, idx) => {
        if (!stations.length) return null;
        return (
          <Fragment key={genre.slug}>
            {idx === 2 && insertAfter}
            <section
              aria-labelledby={`g-${genre.slug}`}
              className="mt-8"
            >
            <div className="mb-3 flex items-baseline justify-between">
              <h2
                id={`g-${genre.slug}`}
                className="font-display text-[16.5px] font-semibold text-ink"
              >
                {fmt(t("home.genreRadio"), { lang: gn(genre.slug, genre.name) })}
              </h2>
              <Link
                href={`/genre/${genre.slug}`}
                className="text-xs font-semibold text-brand-2 dark:text-accent"
              >
                {fmt(t("common.allCount"), { count: genre.count })}
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {stations.map((s) => (
                <StationRow key={s.id} station={s} queue={stations} fav />
              ))}
            </div>
            </section>
          </Fragment>
        );
      })}
    </>
  );
}
