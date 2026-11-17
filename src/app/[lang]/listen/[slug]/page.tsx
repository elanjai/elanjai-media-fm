import type { Metadata } from "next";
import Link from "@/components/LangLink";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import StationRowsWithAds from "@/components/StationRowsWithAds";
import {
  describeDiaspora,
  getDiasporaPage,
  getDiasporaPages,
  getStationsByGenre,
  toPublic,
} from "@/lib/data";
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
  return getDiasporaPages().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const dict = await dictionaryFor(hasLocale(lang) ? lang : "en");
  const p = getDiasporaPage(slug);
  if (!p) return { title: dict.meta.notFound };
  const count = getStationsByGenre(p.genre).length;
  const title = fmt(dict.meta.listenDetailTitle, { genre: genreName(dict, p.genre, p.genreName), market: p.market.name });
  return {
    title,
    description: describeDiaspora(p, count),
    alternates: {
      canonical: `${SITE.url}/${lang}/listen/${p.slug}`,
      ...langAlternates(`/listen/${p.slug}`),
    },
    openGraph: { title, description: describeDiaspora(p, count) },
  };
}

/** Diaspora SEO landing page — /en/listen/tamil-radio-in-usa (F-3.6). */
export default async function ListenPage({ params }: Props) {
  const { lang, slug } = await params;
  const dict = await getDictionary();
  const p = getDiasporaPage(slug);
  if (!p) notFound();

  const stations = getStationsByGenre(p.genre).map(toPublic);
  const intro = describeDiaspora(p, stations.length);

  return (
    <div className="py-5">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: `${SITE.url}/${lang}` },
              { name: "Listen abroad", url: `${SITE.url}/${lang}/listen` },
              { name: p.market.name, url: `${SITE.url}/${lang}/listen/${p.slug}` },
            ])
          ),
        }}
      />

      <div className="flex items-center gap-3">
        <Link
          href="/"
          aria-label={dict.common.backHome}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-ink transition hover:border-brand-2/50"
        >
          <Icon name="chevL" size={16} />
        </Link>
        <h1 className="font-display text-lg font-semibold text-ink">
          {fmt(dict.listen.chip, { genre: genreName(dict, p.genre, p.genreName), market: p.market.name })}
        </h1>
      </div>

      <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-muted">
        {intro}
      </p>
      <p className="mt-3 text-xs font-semibold text-ink">
        {fmt(dict.listen.liveNow, { count: stations.length, genre: genreName(dict, p.genre, p.genreName) })}
      </p>

      <div className="mt-4">
        <StationRowsWithAds stations={stations} language={p.genre} />
      </div>
    </div>
  );
}
