import { NextRequest, NextResponse } from "next/server";
import { clientKey, rateLimit } from "@/lib/stream-guard";
import { recordEvent } from "@/lib/events";

/**
 * Analytics beacon (F-4.1) — consenting clients POST {e, ...dims, sid}.
 * Only `e` + a small allowlist of dimension keys are recorded; the sid
 * is used for nothing (de-dupe happens client-side), so we simply drop it.
 */
const DIMS = new Set(["p", "l", "c", "s", "t"]);

export async function POST(request: NextRequest) {
  if (!rateLimit(`ev:${clientKey(request)}`, 240, 60_000)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const e = typeof body.e === "string" ? body.e : "";
  // Ad events carry campaign+slot; other events carry path/lang dims.
  const key = DIMS
    ? [...DIMS]
        .map((d) => (typeof body[d] === "string" ? `${d}=${body[d]}` : null))
        .filter(Boolean)
        .join(";")
    : "";
  recordEvent(e, key || "-");
  return NextResponse.json({ ok: true });
}
