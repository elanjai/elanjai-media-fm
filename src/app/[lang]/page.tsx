import Link from "@/components/LangLink";
import AdSlot from "@/components/AdSlot";
import BrandLogo from "@/components/BrandLogo";
import FavoritesRail from "@/components/FavoritesRail";
import HeroPlay from "@/components/HeroPlay";
import RecentsRail from "@/components/RecentsRail";
import WeekCard from "@/components/WeekCard";
import LanguageRail from "@/components/LanguageRail";
import LiveBadge from "@/components/LiveBadge";
import OrderedGenreSections from "@/components/OrderedGenreSections";
import PreferredGenreRail from "@/components/PreferredGenreRail";
import SponsoredStationRow from "@/components/SponsoredStationRow";
import StationCard from "@/components/StationCard";
import {
  getGenres,
  getStations,
  getStationsByGenre,
  toPublic,
  todayCached,
} from "@/lib/data";
import { featuredStations } from "@/lib/featured";
import { genreStyle } from "@/lib/genre-style";
import { websiteJsonLd } from "@/lib/jsonld";
import { fmt, genreName, getDictionary } from "@/i18n";

export default async function HomePage() {
  const dict = await getDictionary();
  const today = await todayCached();
  const featured = featuredStations({ slot: "featured-rail", today });
  const genres = getGenres();
  const total = getStations().length;
  // One section object per language — PreferredGenreRail renders one
  // "Popular {lang}" rail per picked language and OrderedGenreSections
  // covers the rest.
  const allSections = genres.map((g) => ({
    genre: g,
    stations: getStationsByGenre(g.slug).slice(0, 8).map(toPublic),
  }));
  const heroFallback =
    allSections.find((s) => s.genre.slug === "tamil")?.stations[0] ??
    allSections.find((s) => s.stations.length)?.stations[0];
  // flagship station per language — top_rank #1 after editorial ranking
  const collections = genres.flatMap((g) => {
    const station = getStationsByGenre(g.slug)[0];
    return station ? [{ genre: g, station: toPublic(station) }] : [];
  });

  return (
    <div className="py-5">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd()) }}
      />

      {/* Hero — deep green gradient, brand mark, live chip, play FAB */}
      <section className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#10533b] to-brand px-5 pb-6 pt-5 text-brand-ink shadow-lg shadow-brand/20 md:px-10 md:pb-9 md:pt-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-14 -top-20 h-44 w-44 rounded-full bg-accent/15"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-24 h-28 w-28 rounded-full bg-white/10"
        />
        <div className="relative flex items-start justify-between gap-3">
          <LiveBadge count={total} />
          <BrandLogo size={84} className="shrink-0 md:hidden" />
          <BrandLogo size={104} className="hidden shrink-0 md:block" />
        </div>
        <h1 className="relative mt-3 max-w-md text-balance font-display text-[26px] font-semibold leading-[1.18] tracking-tight sm:text-[32px] lg:text-[38px]">
          {dict.hero.title}
        </h1>
        <p className="relative mt-2 text-xs text-brand-ink/75">
          {dict.hero.subtitle}
        </p>
        <p className="relative mt-1.5 text-xs text-brand-ink/80">
          {genres.slice(0, 3).map((g) => genreName(dict, g.slug, g.name)).join(" · ")} · {fmt(dict.hero.moreLangs, { count: Math.max(genres.length - 3, 0) })}
        </p>
        {heroFallback && (
          <HeroPlay
            fallback={heroFallback}
            flagships={collections.map((c) => ({
              slug: c.genre.slug,
              station: c.station,
            }))}
          />
        )}
      </section>

      {/* Languages — pastel chip rail */}
      <section aria-labelledby="languages" className="mt-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="languages" className="font-display text-[16.5px] font-semibold text-ink">
            {dict.home.browseLanguages}
          </h2>
          <Link href="/genres" className="text-xs font-semibold text-brand-2 dark:text-accent">
            {dict.home.seeAll}
          </Link>
        </div>
        <LanguageRail genres={genres} />
      </section>

      {/* Explore — consolidated discovery: cities, near-me, networks, diaspora */}
      <nav aria-label={dict.home.explore} className="rail -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {([
          ["/city", dict.home.exploreCities],
          ["/genres", dict.footer.allGenres],
          ["/network", dict.home.exploreNetworks],
          ["/listen", dict.home.exploreAbroad],
        ] as const).map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="hit shrink-0 rounded-full border border-border bg-surface px-4 py-2 text-xs font-semibold text-ink transition hover:border-brand-2/50"
          >
            {label}
          </Link>
        ))}
      </nav>

      {/* Ad — first in-feed slot (placement map §6.3) */}
      <AdSlot id="home-infeed-1" className="mt-8" />

      {/* Featured stations (F-4.4) — broadcaster listings, Sponsored-labeled */}
      {featured.length > 0 && (
        <section aria-labelledby="featured" className="mt-8">
          <h2
            id="featured"
            className="mb-3 font-display text-[16.5px] font-semibold text-ink"
          >
            {dict.home.featured}
          </h2>
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {featured.map((f) => (
              <SponsoredStationRow
                key={f.campaign.id}
                station={f.station}
                campaignId={f.campaign.id}
                slot="featured-rail"
                queue={featured.map((x) => x.station)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Favorites — user's saved stations, hidden until ≥1 exists */}
      <FavoritesRail />

      {/* Recently played — one-tap re-entry for returning listeners;
          renders only once ≥1 station has been played */}
      <RecentsRail />

      {/* Popular {lang} — one card rail per picked language (default Tamil) */}
      <PreferredGenreRail sections={allSections} />

      {/* Popular now — flagship station per language */}
      {collections.length > 0 && (
        <section aria-labelledby="popular" className="mt-8">
          <h2
            id="popular"
            className="mb-3 font-display text-[16.5px] font-semibold text-ink lg:text-lg"
          >
            {dict.home.popularNow}
          </h2>
          <div className="rail -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {collections.map(({ genre, station }) => {
              const st = genreStyle(genre.slug);
              return (
                <div key={station.id} className="relative w-[130px] shrink-0">
                  <StationCard
                    station={station}
                    queue={collections.map((c) => c.station)}
                    genreLabel={genreName(dict, genre.slug, genre.name)}
                  />
                  <span
                    className="pointer-events-none absolute left-5 top-5 z-10 rounded-full px-2 py-[3px] text-[11px] font-bold uppercase tracking-wider shadow-sm"
                    style={{ backgroundColor: st.bg, color: st.fg }}
                  >
                    {genreName(dict, genre.slug, genre.name)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* "Your week" listening recap — only for returning listeners */}
      <WeekCard />

      {/* Other languages — section per genre, rows; re-sorted by language pref.
          Ad sits after the 2nd language section (placement map §6.3). */}
      <OrderedGenreSections
        insertAfter={
          <AdSlot id="home-infeed-2" className="mt-8" />
        }
        sections={allSections}
      />
    </div>
  );
}
