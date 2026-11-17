import type { Metadata } from "next";
import Link from "@/components/LangLink";
import Icon from "@/components/Icon";
import { getDiasporaPages, getStationsByGenre } from "@/lib/data";
import {
  dictionaryFor,
  fmt,
  genreName,
  getDictionary,
  hasLocale,
  langAlternates,
} from "@/i18n";
import { SITE } from "@/lib/site";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = await dictionaryFor(hasLocale(lang) ? lang : "en");
  const title = dict.meta.listenTitle;
  const description = dict.meta.listenDesc;
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
  const dict = await getDictionary();
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
          aria-label={dict.common.backHome}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-ink transition hover:border-brand-2/50"
        >
          <Icon name="chevL" size={16} />
        </Link>
        <h1 className="font-display text-lg font-semibold text-ink">
          {dict.listen.title}
        </h1>
      </div>
      <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-muted">
        {dict.listen.intro}
      </p>

      {Array.from(byGenre.entries()).map(([genreLabel, list]) => (
        <section key={genreLabel} className="mt-7">
          <h2 className="font-display text-[15px] font-semibold text-ink">
            {fmt(dict.listen.genreCount, { genre: genreName(dict, list[0].genre, genreLabel), count: getStationsByGenre(list[0].genre).length })}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {list.map((p) => (
              <Link
                key={p.slug}
                href={`/listen/${p.slug}`}
                className="hit flex items-center rounded-full border border-border bg-surface px-3 text-xs font-semibold text-ink transition hover:border-brand-2/50"
              >
                {fmt(dict.listen.chip, { genre: genreName(dict, p.genre, genreLabel), market: p.market.name })}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
