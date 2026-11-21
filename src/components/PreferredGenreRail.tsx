"use client";

import Link from "@/components/LangLink";
import Icon from "./Icon";
import { fmt } from "@/i18n/locales";
import type { Genre, PublicStation } from "@/lib/types";
import { useGenreName, useT } from "./LocaleProvider";
import { usePrefs } from "./PrefsProvider";
import StationCard from "./StationCard";

export type RailSection = { genre: Genre; stations: PublicStation[] };

/**
 * "Popular {lang}" card rails — one per language the listener picked in the
 * first-run picker (in pick order), defaulting to Tamil through SSR + first
 * render, then swapping on hydration so the choice is actually visible.
 */
export default function PreferredGenreRail({
  sections,
}: {
  sections: RailSection[];
}) {
  const t = useT();
  const gn = useGenreName();
  const { langs } = usePrefs();
  const slugs = [...new Set(langs?.length ? langs : ["tamil"])];
  let rails = slugs
    .map((slug) =>
      sections.find((s) => s.genre.slug === slug && s.stations.length)
    )
    .filter((s): s is RailSection => Boolean(s));
  if (!rails.length) {
    const fallback =
      sections.find((s) => s.genre.slug === "tamil" && s.stations.length) ??
      sections.find((s) => s.stations.length);
    if (fallback) rails = [fallback];
  }
  if (!rails.length) return null;

  return (
    <>
      {rails.map(({ genre, stations }) => {
        const label = gn(genre.slug, genre.name);
        return (
          <section
            key={genre.slug}
            aria-labelledby={`rail-${genre.slug}`}
            className="mt-8"
          >
            <div className="mb-3 flex items-baseline justify-between">
              <h2
                id={`rail-${genre.slug}`}
                className="font-display text-[16.5px] font-semibold text-ink"
              >
                {fmt(t("home.popularIn"), { lang: label })}
              </h2>
              <Link
                href={`/genre/${genre.slug}`}
                className="text-xs font-semibold text-brand-2 dark:text-accent"
              >
                {fmt(t("home.seeAllCount"), { count: genre.count })}
              </Link>
            </div>
            <div className="rail -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {stations.map((s) => (
                <div key={s.id} className="w-[130px] shrink-0">
                  <StationCard station={s} queue={stations} genreLabel={label} />
                </div>
              ))}
              <Link
                href={`/genre/${genre.slug}`}
                className="flex w-[80px] shrink-0 flex-col items-center justify-center gap-2 rounded-[20px] border border-dashed border-border text-muted transition hover:border-brand-2 hover:text-brand-2"
              >
                <Icon name="chevR" size={20} />
                <span className="text-[11px] font-semibold">
                  {fmt(t("common.allCountPlain"), { count: genre.count })}
                </span>
              </Link>
            </div>
          </section>
        );
      })}
    </>
  );
}
