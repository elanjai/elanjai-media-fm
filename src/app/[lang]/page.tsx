import Link from "@/components/LangLink";
import AdSlot from "@/components/AdSlot";
import BrandLogo from "@/components/BrandLogo";
import FavoritesRail from "@/components/FavoritesRail";
import HeroPlay from "@/components/HeroPlay";
import Icon from "@/components/Icon";
import LanguageRail from "@/components/LanguageRail";
import LiveBadge from "@/components/LiveBadge";
import OrderedGenreSections from "@/components/OrderedGenreSections";
import StationCard from "@/components/StationCard";
import {
  getCollectionStations,
  getCollections,
  getGenres,
  getStations,
  getStationsByGenre,
  toPublic,
  todayCached,
} from "@/lib/data";
import { genreStyle } from "@/lib/genre-style";
import { websiteJsonLd } from "@/lib/jsonld";
import { fmt, getDictionary } from "@/i18n";

export default async function HomePage() {
  const dict = await getDictionary();
  const editorial = getCollections(await todayCached());
  const genres = getGenres();
  const total = getStations().length;
  const tamil = getStationsByGenre("tamil").slice(0, 8).map(toPublic);
  const tamilGenre = genres.find((g) => g.slug === "tamil");
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
        <h1 className="relative mt-3 font-display text-[26px] font-semibold leading-[1.18] tracking-tight sm:text-[32px] lg:text-[38px]">
          {dict.hero.title}
        </h1>
        <p className="relative mt-2 text-xs text-brand-ink/75">
          {dict.hero.subtitle}
        </p>
        <p className="relative mt-1.5 text-[11px] text-brand-ink/60">
          {genres.slice(0, 3).map((g) => g.name).join(" · ")} · +{Math.max(genres.length - 3, 0)} more
        </p>
        {tamil[0] && (
          <HeroPlay
            fallback={tamil[0]}
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
                  />
                  <span
                    className="pointer-events-none absolute left-5 top-5 z-10 rounded-full px-2 py-[3px] text-[11px] font-bold uppercase tracking-wider shadow-sm"
                    style={{ backgroundColor: st.bg, color: st.fg }}
                  >
                    {genre.name}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Ad — after "Popular now" (placement map §6.3) */}
      <AdSlot id="home-infeed-1" className="mt-8" />

      {/* Editorial collections — seasonal/curated rails (F-2.5) */}
      {editorial.map((col) => {
        const stations = getCollectionStations(col).map(toPublic);
        if (!stations.length) return null;
        return (
          <section
            key={col.slug}
            aria-labelledby={`col-${col.slug}`}
            className="mt-8"
          >
            <div className="mb-3 flex items-baseline justify-between">
              <h2
                id={`col-${col.slug}`}
                className="font-display text-[16.5px] font-semibold text-ink"
              >
                {col.title}
              </h2>
              <Link
                href={`/collection/${col.slug}`}
                className="text-xs font-semibold text-brand-2 dark:text-accent"
              >
                {dict.home.seeAll}
              </Link>
            </div>
            <div className="rail -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
              {stations.map((s) => (
                <div key={s.id} className="w-[130px] shrink-0">
                  <StationCard station={s} queue={stations} />
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* Favorites — user's saved stations, hidden until ≥1 exists */}
      <FavoritesRail />

      {/* Tamil radio — card rail */}
      {tamilGenre && tamil.length > 0 && (
        <section aria-labelledby="tamil-rail" className="mt-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="tamil-rail" className="font-display text-[16.5px] font-semibold text-ink">
              {fmt(dict.home.popularIn, { lang: tamilGenre.name })}
            </h2>
            <Link
              href="/genre/tamil"
              className="text-xs font-semibold text-brand-2 dark:text-accent"
            >
              {dict.home.seeAll} {tamilGenre.count}
            </Link>
          </div>
          <div className="rail -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {tamil.map((s) => (
              <div key={s.id} className="w-[130px] shrink-0">
                <StationCard station={s} queue={tamil} />
              </div>
            ))}
            <Link
              href="/genre/tamil"
              className="flex w-[80px] shrink-0 flex-col items-center justify-center gap-2 rounded-[20px] border border-dashed border-border text-muted transition hover:border-brand-2 hover:text-brand-2"
            >
              <Icon name="chevR" size={20} />
              <span className="text-[11px] font-semibold">All {tamilGenre.count}</span>
            </Link>
          </div>
        </section>
      )}

      {/* Other languages — section per genre, rows; re-sorted by language pref.
          Ad sits after the 2nd language section (placement map §6.3). */}
      <OrderedGenreSections
        insertAfter={
          <AdSlot id="home-infeed-2" className="mt-8" />
        }
        sections={genres
          .filter((g) => g.slug !== "tamil")
          .slice(0, 4)
          .map((g) => ({
            genre: g,
            stations: getStationsByGenre(g.slug).slice(0, 4).map(toPublic),
          }))}
      />
    </div>
  );
}
