"use client";

import Link from "@/components/LangLink";
import { Fragment, useMemo } from "react";
import { fmt } from "@/i18n/locales";
import type { Genre, PublicStation } from "@/lib/types";
import { orderByLangs } from "@/lib/languages";
import { useGenreName, useT } from "./LocaleProvider";
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
    // The featured rail already shows the first-picked genre — skip it here,
    // then lift the listener's languages into the visible 4-section window.
    const pref = langs?.[0] ?? "tamil";
    const rest = sections.filter((s) => s.genre.slug !== pref);
    const sorted = langs?.length
      ? orderByLangs(
          rest.map((s) => ({ slug: s.genre.slug, s })),
          langs
        ).map((x) => x.s)
      : rest;
    return sorted.slice(0, 4);
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
                <StationRow key={s.id} station={s} queue={stations} />
              ))}
            </div>
            </section>
          </Fragment>
        );
      })}
    </>
  );
}
