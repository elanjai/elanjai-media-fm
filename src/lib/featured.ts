/**
 * Featured station resolution (F-4.4) — sponsored_station campaigns
 * resolved to real catalog stations. Server-only: this module pulls the
 * catalog, so it must never be imported from a client component
 * (ads.ts stays client-light deliberately).
 */
import { eligibleCampaigns, type Campaign } from "./ads";
import { getStation, toPublic } from "./data";
import type { PublicStation } from "./types";

export type FeaturedStation = {
  campaign: Campaign;
  station: PublicStation;
};

export function featuredStations(opts: {
  slot: string;
  today: string;
  language?: string;
  category?: string;
}): FeaturedStation[] {
  return eligibleCampaigns(opts.slot, {
    today: opts.today,
    language: opts.language,
    kinds: ["sponsored_station"],
  })
    .filter(
      (c) =>
        !opts.category ||
        !c.targeting.categories?.length ||
        c.targeting.categories.includes(opts.category)
    )
    .map((campaign) => {
      const slug = campaign.creative.stationSlug;
      const s = slug ? getStation(slug) : undefined;
      return s ? { campaign, station: toPublic(s) } : null;
    })
    .filter((x): x is FeaturedStation => x !== null);
}
