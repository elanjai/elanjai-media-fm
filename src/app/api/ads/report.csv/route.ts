import { NextRequest, NextResponse } from "next/server";
import { adStats } from "@/lib/adserve";

/**
 * CSV export of the ad counters for advertisers (F-4.2).
 * Gated by ?key=$ADMIN_ADS_KEY — same key as /admin/ads.
 * (GET route handlers are never cached in this Next version — the
 * in-memory counters are always read per request.)
 */
export function GET(request: NextRequest) {
  const key = process.env.ADMIN_ADS_KEY;
  if (!key || request.nextUrl.searchParams.get("key") !== key) {
    return new NextResponse("not found", { status: 404 });
  }
  const rows = adStats(90);
  const csv = [
    "day,campaign,slot,impressions,clicks,ctr_pct",
    ...rows.map(
      (r) =>
        `${r.day},${r.campaign},${r.slot},${r.imp},${r.clk},${
          r.imp ? ((r.clk / r.imp) * 100).toFixed(2) : "0.00"
        }`
    ),
  ].join("\n");
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="elanjai-ads-${rows[0]?.day ?? "empty"}.csv"`,
    },
  });
}
