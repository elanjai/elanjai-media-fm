import type { Metadata } from "next";
import Link from "@/components/LangLink";
import { notFound } from "next/navigation";
import AdSlot from "@/components/AdSlot";
import Icon from "@/components/Icon";
import StationRowsWithAds from "@/components/StationRowsWithAds";
import { getCategories, getGenre, getGenres, getStationsByGenre, toPublic, todayCached } from "@/lib/data";
import { featuredStations } from "@/lib/featured";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import {
  dictionaryFor,
  fmt,
  genreName,
  getDictionary,
  hasLocale,
  langAlternates,
} from "@/i18n";
import { SITE } from "@/lib/site";

type Props = { params: Promise<{ lang: string; slug: string }> };

export function generateStaticParams() {
  return getGenres().map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const dict = await dictionaryFor(hasLocale(lang) ? lang : "en");
  const g = getGenre(slug);
  if (!g) return { title: dict.meta.notFound };
  const title = fmt(dict.meta.radioTitle, { name: g.name, count: g.count });
  const description = fmt(dict.meta.genreDesc, { count: g.count, name: g.name, site: SITE.name });
  return {
    title,
    description,
    alternates: { canonical: `${SITE.url}/${lang}/genre/${g.slug}`, ...langAlternates(`/genre/${g.slug}`) },
  };
}

export default async function GenrePage({ params }: Props) {
  const { lang, slug } = await params;
  const dict = await getDictionary();
  const g = getGenre(slug);
  if (!g) notFound();
  const stations = getStationsByGenre(g.slug).map(toPublic);
  const genres = getGenres();
  const featured = featuredStations({
    slot: "featured-top",
    today: await todayCached(),
    language: slug,
  });
  const categories = getCategories();

  return (
    <div className="py-5">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: `${SITE.url}/${lang}` },
              { name: g.name, url: `${SITE.url}/${lang}/genre/${g.slug}` },
            ])
          ),
        }}
      />

      {/* App-style header — back, title, search shortcut */}
      <div className="flex items-center gap-3">
        <Link
          href="/genres"
          aria-label={dict.genre.back}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-ink transition hover:border-brand-2/50"
        >
          <Icon name="chevL" size={16} />
        </Link>
        <h1 className="font-display text-lg font-semibold capitalize text-ink">{fmt(dict.home.genreRadio, { lang: genreName(dict, g.slug, g.name) })}</h1>
        <Link
          href="/search"
          aria-label={dict.nav.search}
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-muted transition hover:text-ink"
        >
          <Icon name="search" size={18} />
        </Link>
      </div>

      {/* Genre switcher chips */}
      <div className="rail -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {genres.map((x) =>
          x.slug === g.slug ? (
            <span
              key={x.slug}
              className="shrink-0 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-ink"
            >
              {genreName(dict, x.slug, x.name)}
            </span>
          ) : (
            <Link
              key={x.slug}
              href={`/genre/${x.slug}`}
              className="shrink-0 rounded-full border border-border bg-surface-2 px-4 py-2 text-xs font-medium text-ink transition hover:border-brand-2/50"
            >
              {genreName(dict, x.slug, x.name)}
            </Link>
          )
        )}
      </div>
      {/* Category chips — browse by mood/content across languages */}
      <div className="rail -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/category/${c.slug}`}
            className="shrink-0 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-muted transition hover:border-brand-2/50 hover:text-ink"
          >
            {c.name}
          </Link>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">
        {fmt(dict.common.liveStationsTap, { count: g.count })}
      </p>

      {/* Desktop right rail (§6.3) — only where it can't crowd the content */}
      <div className="fixed right-5 top-28 z-30 hidden w-[290px] min-[1500px]:block">
        <AdSlot id="rail-desktop" language={slug} />
      </div>

      <div className="mt-4">
        <StationRowsWithAds stations={stations} language={slug} featured={featured} />
      </div>
    </div>
  );
}
