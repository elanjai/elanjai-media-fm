"use client";

import Link from "@/components/LangLink";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { Genre, PublicStation } from "@/lib/types";
import { NATIVE_NAMES } from "@/lib/languages";
import { track } from "@/lib/analytics";
import type { Campaign } from "@/lib/ads";
import AdSlotClient from "./AdSlotClient";
import { searchLocal } from "@/lib/search";
import { useCatalog } from "./AudioProvider";
import Icon from "./Icon";
import { useLang, useT } from "./LocaleProvider";
import RecentSearches from "./RecentSearches";
import SearchInput from "./SearchInput";
import StationRow from "./StationRow";
import TrendingList from "./TrendingList";

/**
 * Instant search (F-1.7): a compact client-side index filters as you type —
 * no server round-trip per keystroke. The ?q URL param still syncs via
 * history.replaceState so results stay shareable/bookmarkable, and a
 * server-rendered `initialQ` seeds the field on arrival.
 */
export default function SearchClient({
  initialQ,
  trending,
  genres,
  adCampaigns = [],
}: {
  initialQ: string;
  trending: PublicStation[];
  genres: Genre[];
  adCampaigns?: Campaign[];
}) {
  const [q, setQ] = useState(initialQ);
  const { stations } = useCatalog();
  const lang = useLang();
  const t = useT();
  const term = q.trim();

  const results = useMemo(
    () => (stations && term ? searchLocal(stations, term) : []),
    [stations, term]
  );

  // Keep the URL in sync without triggering a server re-render, and
  // count settled queries (≥2 chars, after the typing pause) once each.
  const trackedRef = useRef("");
  useEffect(() => {
    const t = setTimeout(() => {
      const url = term ? `/${lang}/search?q=${encodeURIComponent(term)}` : `/${lang}/search`;
      window.history.replaceState(null, "", url);
      if (term.length >= 2 && trackedRef.current !== term) {
        trackedRef.current = term;
        track("search", {});
      }
    }, 300);
    return () => clearTimeout(t);
  }, [term, lang]);

  return (
    <>
      <SearchInput
        autoFocus
        withMic
        value={q}
        onValueChange={setQ}
        onSearchSubmit={() => {
          /* stay on-page; results are already live */
        }}
      />

      {!term && (
        <div className="mt-6 flex flex-col gap-6">
          <RecentSearches />
          <section aria-labelledby="trending">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              {t("search.trending")}
            </h2>
            <TrendingList stations={trending} />
          </section>
        </div>
      )}

      {term && (
        <div className="mt-6">
          <p className="text-xs text-muted" aria-live="polite">
            {stations === null
              ? "Loading stations…"
              : `${results.length} station${results.length === 1 ? "" : "s"} for “${term}”`}
          </p>

          {stations !== null && results.length === 0 && (
            <div className="mt-6 flex flex-col items-center rounded-[22px] border border-dashed border-border bg-surface px-6 py-12 text-center">
              <Icon name="search" size={30} strokeWidth={1.5} className="text-muted" />
              <p className="mt-4 font-display text-sm font-semibold text-ink">
                {t("search.noResults")} “{term}”
              </p>
              <p className="mt-1.5 text-xs text-muted">
                {t("search.noResultsHint")}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {genres.slice(0, 6).map((g) => (
                  <Link
                    key={g.slug}
                    href={`/genre/${g.slug}`}
                    className="rounded-full border border-border bg-surface-2 px-4 py-2 text-xs font-medium text-ink transition hover:border-brand-2/50"
                  >
                    {NATIVE_NAMES[g.slug] ?? g.name}
                  </Link>
                ))}
              </div>
              <Link
                href="/add-station"
                className="mt-4 text-xs font-semibold text-brand-2 underline-offset-2 hover:underline dark:text-accent"
              >
                Request this station →
              </Link>
            </div>
          )}

          {results.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-2">
              {results.map((s, i) => (
                <Fragment key={s.id}>
                  <StationRow station={s} queue={results} />
                  {/* Ad after result 5 (placement map §6.3) */}
                  {i === 4 && adCampaigns.length > 0 && (
                    <div className="md:col-span-2">
                      <AdSlotClient slot="search-infeed" campaigns={adCampaigns} />
                    </div>
                  )}
                </Fragment>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
