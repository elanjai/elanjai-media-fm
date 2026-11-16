import type { Metadata } from "next";
import Link from "@/components/LangLink";
import GenreTile from "@/components/GenreTile";
import { getCategories, getGenres, getStations } from "@/lib/data";

export const metadata: Metadata = {
  title: "All genres & languages",
  description: "Browse live radio stations by language — Tamil, Hindi, Malayalam, Telugu, Kannada, Punjabi, Urdu and more.",
};

export default function GenresPage() {
  const genres = getGenres();
  const categories = getCategories();
  const total = getStations().length;
  return (
    <div className="py-6">
      <h1 className="font-display text-[27px] font-semibold leading-[1.15] tracking-tight text-ink sm:text-3xl">
        Browse by <br className="sm:hidden" />
        language
      </h1>
      <p className="mt-2 text-xs text-muted">
        {genres.length} languages · {total} live stations
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {genres.map((g) => (
          <GenreTile key={g.slug} genre={g} />
        ))}
      </div>

      <h2 className="mt-10 font-display text-[20px] font-semibold tracking-tight text-ink">
        Browse by mood
      </h2>
      <p className="mt-1.5 text-xs text-muted">
        Film songs, devotional, classics and more — across all languages.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/category/${c.slug}`}
            className="rounded-2xl border border-border bg-surface p-4 transition hover:border-brand-2/50"
          >
            <p className="font-display text-[15px] font-semibold text-ink">{c.name}</p>
            <p className="mt-1 text-xs text-muted">{c.count} stations</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
