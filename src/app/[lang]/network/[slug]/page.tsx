import type { Metadata } from "next";
import Link from "@/components/LangLink";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import StationRowsWithAds from "@/components/StationRowsWithAds";
import {
  getNetwork,
  getNetworks,
  getStationsByNetwork,
  toPublic,
} from "@/lib/data";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { dictionaryFor, fmt, getDictionary, hasLocale, langAlternates } from "@/i18n";
import { SITE } from "@/lib/site";

type Props = { params: Promise<{ lang: string; slug: string }> };

export function generateStaticParams() {
  return getNetworks().map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const dict = await dictionaryFor(hasLocale(lang) ? lang : "en");
  const n = getNetwork(slug);
  if (!n) return { title: dict.meta.notFound };
  const list = getStationsByNetwork(slug);
  const title = fmt(dict.meta.networkDetailTitle, { name: n.name, count: list.length });
  const description = fmt(dict.meta.networkDetailDesc, { count: list.length, name: n.name, site: SITE.name });
  return {
    title,
    description,
    alternates: { canonical: `${SITE.url}/${lang}/network/${n.slug}`, ...langAlternates(`/network/${n.slug}`) },
  };
}

export default async function NetworkPage({ params }: Props) {
  const { lang, slug } = await params;
  const dict = await getDictionary();
  const n = getNetwork(slug);
  if (!n) notFound();
  const stations = getStationsByNetwork(slug).map(toPublic);
  if (!stations.length) notFound();
  const networks = getNetworks();

  return (
    <div className="py-5">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: `${SITE.url}/${lang}` },
              { name: "Networks", url: `${SITE.url}/${lang}/network` },
              { name: n.name, url: `${SITE.url}/${lang}/network/${n.slug}` },
            ])
          ),
        }}
      />

      <div className="flex items-center gap-3">
        <Link
          href="/network"
          aria-label={dict.network.back}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-ink transition hover:border-brand-2/50"
        >
          <Icon name="chevL" size={16} />
        </Link>
        <h1 className="font-display text-lg font-semibold text-ink">{n.name}</h1>
        <Link
          href="/search"
          aria-label={dict.nav.search}
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-muted transition hover:text-ink"
        >
          <Icon name="search" size={18} />
        </Link>
      </div>

      <div className="rail -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {networks.map((x) =>
          x.slug === n.slug ? (
            <span
              key={x.slug}
              className="shrink-0 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-ink"
            >
              {x.name}
            </span>
          ) : (
            <Link
              key={x.slug}
              href={`/network/${x.slug}`}
              className="shrink-0 rounded-full border border-border bg-surface-2 px-4 py-2 text-xs font-medium text-ink transition hover:border-brand-2/50"
            >
              {x.name}
            </Link>
          )
        )}
      </div>
      <p className="mt-3 text-xs text-muted">
        {fmt(dict.network.count, { count: stations.length })}
      </p>

      <div className="mt-4">
        <StationRowsWithAds stations={stations} />
      </div>
    </div>
  );
}
