/**
 * Self-ad engine (F-4.2) — file-based campaigns per roadmap §6.4.
 *
 * Server components gather the eligible set for a slot (schedule + slot
 * + language targeting); the client island then does the weighted pick,
 * per-user frequency cap, and impression/click beacons. That keeps the
 * pick per-listener (rotation + caps work) while pages stay static.
 */
import campaignsJson from "../../data/campaigns.json";

export type Campaign = {
  id: string;
  advertiser: string;
  kind: "house" | "banner" | "sponsored_station" | "audio_preroll";
  label: "Sponsored" | "Ad" | "From Elanjai FM";
  creative: {
    image?: string;
    alt?: string;
    headline: string;
    body?: string;
    cta?: string;
    url?: string;
    stationSlug?: string;
    audioUrl?: string;
  };
  targeting: {
    slots: string[];
    languages?: string[];
    categories?: string[];
    countries?: string[];
    devices?: ("mobile" | "desktop")[];
  };
  schedule: { start: string; end: string; dayparts?: [number, number][] };
  weight: number;
  caps: { perUserPerDay?: number; totalImpressions?: number };
  status: "draft" | "active" | "paused" | "ended";
};

export const campaigns = campaignsJson as Campaign[];

/** Campaigns eligible for a slot right now. `today` = "YYYY-MM-DD". */
export function eligibleCampaigns(
  slot: string,
  opts: { today: string; language?: string; kinds?: Campaign["kind"][] }
): Campaign[] {
  const t = opts.today;
  return campaigns.filter((c) => {
    if (c.status !== "active") return false;
    if (opts.kinds && !opts.kinds.includes(c.kind)) return false;
    if (!c.targeting.slots.includes(slot)) return false;
    if (c.schedule.start && c.schedule.start > t) return false;
    if (c.schedule.end && c.schedule.end < t) return false;
    if (
      opts.language &&
      c.targeting.languages &&
      !c.targeting.languages.includes(opts.language)
    )
      return false;
    return true;
  });
}

/**
 * Weighted pick from an eligible set. `rand` is [0,1) — injected so the
 * selection is testable and callers choose their entropy.
 */
export function pickWeighted(eligible: Campaign[], rand: number): Campaign | null {
  if (!eligible.length) return null;
  const total = eligible.reduce((s, c) => s + Math.max(0, c.weight), 0);
  if (total <= 0) return eligible[0];
  let r = rand * total;
  for (const c of eligible) {
    r -= Math.max(0, c.weight);
    if (r < 0) return c;
  }
  return eligible[eligible.length - 1];
}
