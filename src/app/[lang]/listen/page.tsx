import type { Metadata } from "next";
import Link from "@/components/LangLink";
import Icon from "@/components/Icon";
import { getDiasporaPages, getStationsByGenre } from "@/lib/data";
import { langAlternates } from "@/i18n";
import { SITE } from "@/lib/site";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const title = "Indian radio abroad — listen from anywhere";
  const description =
    "Missing home? Live Indian radio stations for the diaspora — Tamil, Malayalam, Hindi, Punjabi, Telugu, Urdu and more, free in the USA, UK, UAE, Canada, Singapore, Australia and beyond.";
  return {
    title,
    description,
    alternates: { canonical: `${SITE.url}/${lang}/listen`, ...langAlternates("/listen") },
    openGraph: { title, description },
  };
}

/** Index of every diaspora landing page (F-3.6). */
export default async function ListenIndexPage({ params }: Props) {
  await params;
  const pages = getDiasporaPages();

  // Group by language for a scannable directory.
  const byGenre = new Map<string, typeof pages>();
  for (const p of pages) {
    const list = byGenre.get(p.genreName) ?? [];
    list.push(p);
    byGenre.set(p.genreName, list);
  }

  return (
    <div className="py-5">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          aria-label="Back home"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-ink transition hover:border-brand-2/50"
        >
          <Icon name="chevL" size={16} />
        </Link>
        <h1 className="font-display text-lg font-semibold text-ink">
          Indian radio abroad
        </h1>
      </div>
      <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-muted">
        Missing home? Every station below streams free, works on any phone or
        laptop, and needs no sign-up. Pick your language and where you live —
        the page lists only stations on air right now.
      </p>

      {Array.from(byGenre.entries()).map(([genreName, list]) => (
        <section key={genreName} className="mt-7">
          <h2 className="font-display text-[15px] font-semibold text-ink">
            {genreName} · {getStationsByGenre(list[0].genre).length} stations
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {list.map((p) => (
              <Link
                key={p.slug}
                href={`/listen/${p.slug}`}
                className="hit flex items-center rounded-full border border-border bg-surface px-3 text-xs font-semibold text-ink transition hover:border-brand-2/50"
              >
                {genreName} radio in {p.market.name}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
