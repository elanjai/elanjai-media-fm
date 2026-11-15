import { NextRequest, NextResponse } from "next/server";
import { getStationBySlug } from "@/lib/data";
import { listenerCount, recordHeartbeat } from "@/lib/listeners";
import { clientKey, rateLimit } from "@/lib/stream-guard";

/**
 * Listener heartbeat (F-5.4): a playing client POSTs {slug, sid} every
 * ~60s; GET ?slug= returns the current live count. Counts carry no
 * identity — just session ids inside a 5-minute window.
 */
export async function POST(request: NextRequest) {
  if (!rateLimit(`listeners:${clientKey(request)}`, 12, 60_000)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const slug = typeof body.slug === "string" ? body.slug : "";
  if (!getStationBySlug(slug)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const sid =
    typeof body.sid === "string" && body.sid.length <= 64
      ? body.sid
      : "anonymous";
  recordHeartbeat(slug, sid);
  return NextResponse.json({ ok: true });
}

export function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug") ?? "";
  return NextResponse.json(
    { count: getStationBySlug(slug) ? listenerCount(slug) : 0 },
    { headers: { "cache-control": "no-store" } }
  );
}
