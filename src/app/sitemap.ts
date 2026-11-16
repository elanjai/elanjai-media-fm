import type { MetadataRoute } from "next";
import { getCategories, getCities, getDiasporaPages, getGenres, getNetworks, getStations } from "@/lib/data";
import { DEFAULT_LOCALE, LOCALES } from "@/i18n/locales";
import { SITE } from "@/lib/site";

/** hreflang map for a locale-relative path — included on every entry. */
const alts = (path: string) => ({
  languages: Object.fromEntries([
    ...LOCALES.map((l) => [l, `${SITE.url}/${l}${path}`]),
    ["x-default", `${SITE.url}/${DEFAULT_LOCALE}${path}`],
  ]),
});

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  const paths: { path: string; freq: "daily" | "weekly"; prio: number }[] = [
    { path: "", freq: "daily", prio: 1 },
    ...getGenres().map((g) => ({ path: `/genre/${g.slug}`, freq: "weekly" as const, prio: 0.8 })),
    ...getCategories().map((c) => ({ path: `/category/${c.slug}`, freq: "weekly" as const, prio: 0.7 })),
    ...getCities().map((c) => ({ path: `/city/${c.slug}`, freq: "weekly" as const, prio: 0.7 })),
    ...getNetworks().map((n) => ({ path: `/network/${n.slug}`, freq: "weekly" as const, prio: 0.6 })),
    { path: "/listen", freq: "weekly" as const, prio: 0.7 },
    ...getDiasporaPages().map((p) => ({ path: `/listen/${p.slug}`, freq: "weekly" as const, prio: 0.7 })),
    ...getStations().map((s) => ({ path: `/station/${s.slug}`, freq: "weekly" as const, prio: 0.6 })),
  ];

  // One sitemap row per locale URL, each carrying the full hreflang set.
  for (const { path, freq, prio } of paths) {
    for (const l of LOCALES) {
      entries.push({
        url: `${SITE.url}/${l}${path}`,
        lastModified: now,
        changeFrequency: freq,
        priority: prio,
        alternates: alts(path),
      });
    }
  }
  return entries;
}
