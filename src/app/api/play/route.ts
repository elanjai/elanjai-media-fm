import { NextRequest, NextResponse } from "next/server";
import { getStationBySlug } from "@/lib/data";
import { clientKey, rateLimit } from "@/lib/stream-guard";
import { recordPlay } from "@/lib/trending";

/**
 * Play beacon (F-2.6) — one POST per station that actually starts
 * playing. Feeds the rolling counts behind /api/trending.
 */
export async function POST(request: NextRequest) {
  if (!rateLimit(`play:${clientKey(request)}`, 60, 60_000)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const slug = typeof body.slug === "string" ? body.slug : "";
  if (!slug || !getStationBySlug(slug)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const sid =
    typeof body.sid === "string" && body.sid.length <= 64
      ? body.sid
      : "anonymous";
  recordPlay(slug, sid);
  return NextResponse.json({ ok: true });
}
