import { NextRequest, NextResponse } from "next/server";
import { getStations, rankStations, toPublic } from "@/lib/data";
import { playCounts } from "@/lib/trending";
import type { Station } from "@/lib/types";

/**
 * Real trending (F-2.6): rolling 24h/7d play counts blended with the
 * editorial top_rank. Stations nobody has played yet keep the editorial
 * ranking as the tail, so the list is always full.
 *
 *   score = 24h plays ×3 + 7d plays + top_rank bonus (21 − rank, ~flagship +20)
 *
 * GET /api/trending?lang=tamil&n=12 → ordered PublicStation list.
 */
export function GET(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get("lang");
  const n = Math.min(
    Math.max(Number(request.nextUrl.searchParams.get("n")) || 12, 1),
    50
  );
  const counts = playCounts();
  const all = getStations();
  const pool = lang ? all.filter((s) => s.languages.includes(lang)) : all;

  const score = (s: Station) => {
    const c = counts.get(s.slug);
    const editorial = s.top_rank ? Math.max(0, 21 - s.top_rank) : 0;
    return (c?.d1 ?? 0) * 3 + (c?.d7 ?? 0) + editorial;
  };

  const played = pool
    .filter((s) => counts.has(s.slug))
    .sort((a, b) => score(b) - score(a));
  const unplayed = rankStations(pool.filter((s) => !counts.has(s.slug)));

  const ordered = [...played, ...unplayed].slice(0, n);
  return NextResponse.json(
    { stations: ordered.map(toPublic) },
    { headers: { "cache-control": "public, max-age=60" } }
  );
}
