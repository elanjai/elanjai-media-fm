import type { MetadataRoute } from "next";
import { getCategories, getCities, getGenres, getNetworks, getStations } from "@/lib/data";
import { SITE } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE.url, lastModified: now, changeFrequency: "daily", priority: 1 },
    ...getGenres().map((g) => ({
      url: `${SITE.url}/genre/${g.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...getCategories().map((c) => ({
      url: `${SITE.url}/category/${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...getCities().map((c) => ({
      url: `${SITE.url}/city/${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...getNetworks().map((n) => ({
      url: `${SITE.url}/network/${n.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...getStations().map((s) => ({
      url: `${SITE.url}/station/${s.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
