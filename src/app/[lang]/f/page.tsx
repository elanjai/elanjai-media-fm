import type { Metadata } from "next";
import Link from "@/components/LangLink";
import ImportFavorites from "@/components/ImportFavorites";
import { getStationBySlug, toPublic } from "@/lib/data";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Shared favorites",
  description: `Import a shared favorite-station list into ${SITE.name}.`,
  robots: { index: false },
};

/**
 * F-5.2 — account-free favorites transfer. A share link carries slugs
 * in ?s=slug1,slug2; this page previews what resolves against the
 * current catalog and imports on confirmation. Bare /f links get a
 * locale prefix from the proxy before landing here.
 */
export default async function SharedFavoritesPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s } = await searchParams;
  const slugs = (s ?? "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 50);
  const found = slugs
    .map((slug) => getStationBySlug(slug))
    .filter((x): x is NonNullable<typeof x> => Boolean(x))
    .map(toPublic);
  const missing = slugs.length - found.length;

  return (
    <div className="mx-auto max-w-lg py-10">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
        Shared favorites
      </h1>
      {found.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface p-6 text-center">
          <p className="text-sm text-muted">
            This link doesn&rsquo;t match any stations — it may be old, or
            those stations have left the directory.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm font-semibold text-brand-2 underline-offset-2 hover:underline dark:text-accent"
          >
            Browse all stations →
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm text-muted">
            Someone shared {found.length} station
            {found.length === 1 ? "" : "s"} with you
            {missing > 0 ? ` (${missing} no longer in the directory)` : ""}.
          </p>
          <ImportFavorites stations={found} />
        </>
      )}
    </div>
  );
}
