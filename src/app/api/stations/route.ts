import { NextRequest, NextResponse } from "next/server";
import { getStations, getStationsByGenre, searchStations, toPublic } from "@/lib/data";

/**
 * Catalog API (F-3.7) — the payload only changes on deploy, so responses
 * are CDN/browser-cacheable: browsers revalidate after a minute, shared
 * caches hold the deploy's catalog for a day and serve stale while
 * revalidating for a week. The client's instant-search warm fetch stops
 * hitting origin on every navigation.
 */
const CATALOG_CACHE =
  "public, max-age=60, s-maxage=86400, stale-while-revalidate=604800";

export function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  const genre = request.nextUrl.searchParams.get("genre");

  const stations = q ? searchStations(q) : genre ? getStationsByGenre(genre) : getStations();
  return NextResponse.json(
    {
      count: stations.length,
      stations: stations.map(toPublic),
    },
    { headers: { "Cache-Control": CATALOG_CACHE } }
  );
}
