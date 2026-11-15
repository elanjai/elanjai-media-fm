import type { Metadata } from "next";
import Link from "@/components/LangLink";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import StationRow from "@/components/StationRow";
import {
  getCollectionStations,
  getCollections,
  toPublic,
  todayCached,
} from "@/lib/data";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { langAlternates } from "@/i18n";
import { SITE } from "@/lib/site";

type Props = { params: Promise<{ lang: string; slug: string }> };

// Collection pages render their current-window contents — static params
// come from the build-time window, and the page revalidates with the site.
const findCollection = async (slug: string) =>
  getCollections(await todayCached()).find((c) => c.slug === slug) ?? null;

export async function generateStaticParams() {
  return getCollections(await todayCached()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const c = await findCollection(slug);
  if (!c) return { title: "Collection not found" };
  return {
    title: `${c.title} — curated radio`,
    description: c.description,
    alternates: { canonical: `${SITE.url}/${lang}/collection/${c.slug}`, ...langAlternates(`/collection/${c.slug}`) },
  };
}

export default async function CollectionPage({ params }: Props) {
  const { lang, slug } = await params;
  const c = await findCollection(slug);
  if (!c) notFound();
  const stations = getCollectionStations(c).map(toPublic);

  return (
    <div className="py-5">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: `${SITE.url}/${lang}` },
              { name: c.title, url: `${SITE.url}/${lang}/collection/${c.slug}` },
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
        <h1 className="font-display text-lg font-semibold text-ink">{c.title}</h1>
        <Link
          href="/search"
          aria-label="Search"
          className="ml-auto flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-muted transition hover:text-ink"
        >
          <Icon name="search" size={18} />
        </Link>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">{c.description}</p>
      <p className="mt-3 text-xs text-muted">
        {stations.length} stations — curated by our editors
      </p>

      <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {stations.map((s) => (
          <StationRow key={s.id} station={s} queue={stations} />
        ))}
      </div>
    </div>
  );
}
