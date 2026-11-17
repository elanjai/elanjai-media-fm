import type { Metadata } from "next";
import Link from "@/components/LangLink";
import GenreTile from "@/components/GenreTile";
import { getCategories, getGenres, getStations } from "@/lib/data";
import { dictionaryFor, fmt, getDictionary, hasLocale } from "@/i18n";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = await dictionaryFor(hasLocale(lang) ? lang : "en");
  return {
    title: dict.meta.genresTitle,
    description: dict.meta.genresDesc,
  };
}

export default async function GenresPage() {
  const dict = await getDictionary();
  const genres = getGenres();
  const categories = getCategories();
  const total = getStations().length;
  return (
    <div className="py-6">
      <h1 className="font-display text-[27px] font-semibold leading-[1.15] tracking-tight text-ink sm:text-3xl">
        {dict.genres.titleA} <br className="sm:hidden" />
        {dict.genres.titleB}
      </h1>
      <p className="mt-2 text-xs text-muted">
        {fmt(dict.genres.stats, { langCount: genres.length, stationCount: total })}
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {genres.map((g) => (
          <GenreTile key={g.slug} genre={g} />
        ))}
      </div>

      <h2 className="mt-10 font-display text-[20px] font-semibold tracking-tight text-ink">
        {dict.genres.moodTitle}
      </h2>
      <p className="mt-1.5 text-xs text-muted">
        {dict.genres.moodHint}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/category/${c.slug}`}
            className="rounded-2xl border border-border bg-surface p-4 transition hover:border-brand-2/50"
          >
            <p className="font-display text-[15px] font-semibold text-ink">{c.name}</p>
            <p className="mt-1 text-xs text-muted">{fmt(dict.common.stations, { count: c.count })}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
