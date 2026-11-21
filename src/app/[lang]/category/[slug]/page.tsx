import type { Metadata } from "next";
import Link from "@/components/LangLink";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import StationRowsWithAds from "@/components/StationRowsWithAds";
import {
  getCategories,
  getCategory,
  getStationsByCategory,
  toPublic,
  todayCached,
} from "@/lib/data";
import { featuredStations } from "@/lib/featured";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { dictionaryFor, fmt, fmtCount, getDictionary, hasLocale, langAlternates } from "@/i18n";
import { SITE } from "@/lib/site";

type Props = { params: Promise<{ lang: string; slug: string }> };

export function generateStaticParams() {
  return getCategories().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const dict = await dictionaryFor(hasLocale(lang) ? lang : "en");
  const c = getCategory(slug);
  if (!c) return { title: dict.meta.notFound };
  const list = getStationsByCategory(slug);
  const title = fmt(dict.meta.radioTitle, { name: c.name, count: list.length });
  const description = fmt(dict.meta.categoryDesc, { description: c.description, count: list.length, site: SITE.name });
  return {
    title,
    description,
    alternates: { canonical: `${SITE.url}/${lang}/category/${c.slug}`, ...langAlternates(`/category/${c.slug}`) },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { lang, slug } = await params;
  const dict = await getDictionary();
  const c = getCategory(slug);
  if (!c) notFound();
  const stations = getStationsByCategory(slug).map(toPublic);
  if (!stations.length) notFound();
  const categories = getCategories();
  const featured = featuredStations({
    slot: "featured-top",
    today: await todayCached(),
    category: slug,
  });

  return (
    <div className="py-5">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: `${SITE.url}/${lang}` },
              { name: "Categories", url: `${SITE.url}/${lang}/genres` },
              { name: c.name, url: `${SITE.url}/${lang}/category/${c.slug}` },
            ])
          ),
        }}
      />

      <div className="flex items-center gap-3">
        <Link
          href="/genres"
          aria-label={dict.category.back}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-ink transition hover:border-brand-2/50"
        >
          <Icon name="chevL" size={16} />
        </Link>
        <h1 className="font-display text-lg font-semibold text-ink">{c.name}</h1>
        <Link
          href="/search"
          aria-label={dict.nav.search}
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-muted transition hover:text-ink"
        >
          <Icon name="search" size={18} />
        </Link>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">{c.description}</p>

      {/* Category switcher chips */}
      <div className="rail -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {categories.map((x) =>
          x.slug === c.slug ? (
            <span
              key={x.slug}
              className="shrink-0 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-ink"
            >
              {x.name}
            </span>
          ) : (
            <Link
              key={x.slug}
              href={`/category/${x.slug}`}
              className="shrink-0 rounded-full border border-border bg-surface-2 px-4 py-2 text-xs font-medium text-ink transition hover:border-brand-2/50"
            >
              {x.name}
            </Link>
          )
        )}
      </div>
      <p className="mt-3 text-xs text-muted">
        {fmtCount(dict.common.liveStationTapOne, dict.common.liveStationsTap, stations.length)}
      </p>

      <div className="mt-4">
        <StationRowsWithAds stations={stations} featured={featured} />
      </div>
    </div>
  );
}
