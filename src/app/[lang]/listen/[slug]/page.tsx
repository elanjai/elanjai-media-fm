import type { Metadata } from "next";
import Link from "@/components/LangLink";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import StationRow from "@/components/StationRow";
import {
  describeDiaspora,
  getDiasporaPage,
  getDiasporaPages,
  getStationsByGenre,
  toPublic,
} from "@/lib/data";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { langAlternates } from "@/i18n";
import { SITE } from "@/lib/site";

type Props = { params: Promise<{ lang: string; slug: string }> };

export function generateStaticParams() {
  return getDiasporaPages().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const p = getDiasporaPage(slug);
  if (!p) return { title: "Not found" };
  const count = getStationsByGenre(p.genre).length;
  const title = `${p.genreName} radio online in ${p.market.name} — listen free`;
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
          aria-label="Back home"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-ink transition hover:border-brand-2/50"
        >
          <Icon name="chevL" size={16} />
        </Link>
        <h1 className="font-display text-lg font-semibold text-ink">
          {p.genreName} radio in {p.market.name}
        </h1>
      </div>

      <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-muted">
        {intro}
      </p>
      <p className="mt-3 text-xs font-semibold text-ink">
        {stations.length} {p.genreName} stations live now
      </p>

      <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {stations.map((s) => (
          <StationRow key={s.id} station={s} queue={stations} />
        ))}
      </div>
    </div>
  );
}
