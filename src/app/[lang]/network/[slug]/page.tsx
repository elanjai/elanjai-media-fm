import type { Metadata } from "next";
import Link from "@/components/LangLink";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import StationRow from "@/components/StationRow";
import {
  getNetwork,
  getNetworks,
  getStationsByNetwork,
  toPublic,
} from "@/lib/data";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { langAlternates } from "@/i18n";
import { SITE } from "@/lib/site";

type Props = { params: Promise<{ lang: string; slug: string }> };

export function generateStaticParams() {
  return getNetworks().map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const n = getNetwork(slug);
  if (!n) return { title: "Network not found" };
  const list = getStationsByNetwork(slug);
  const title = `${n.name} — ${list.length} Live Stations`;
  const description = `Listen to all ${list.length} ${n.name} streams live and free on ${SITE.name}.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE.url}/${lang}/network/${n.slug}`, ...langAlternates(`/network/${n.slug}`) },
  };
}

export default async function NetworkPage({ params }: Props) {
  const { lang, slug } = await params;
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
          aria-label="Back to networks"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-ink transition hover:border-brand-2/50"
        >
          <Icon name="chevL" size={16} />
        </Link>
        <h1 className="font-display text-lg font-semibold text-ink">{n.name}</h1>
        <Link
          href="/search"
          aria-label="Search"
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
        {stations.length} live streams — tap to play
      </p>

      <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {stations.map((s) => (
          <StationRow key={s.id} station={s} queue={stations} />
        ))}
      </div>
    </div>
  );
}
