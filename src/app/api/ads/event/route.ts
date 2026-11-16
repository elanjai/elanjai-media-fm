import { NextRequest, NextResponse } from "next/server";
import { campaigns } from "@/lib/ads";
import { recordAdEvent } from "@/lib/adserve";
import { clientKey, rateLimit } from "@/lib/stream-guard";

/** Impression/click beacon (F-4.2) — aggregate counters only. */
const IDS = new Set(campaigns.map((c) => c.id));

export async function POST(request: NextRequest) {
  if (!rateLimit(`ad:${clientKey(request)}`, 120, 60_000)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const c = typeof body.c === "string" ? body.c : "";
  const s = typeof body.s === "string" ? body.s.slice(0, 40) : "";
  const t = body.t === "clk" ? "clk" : "imp";
  if (!IDS.has(c) || !s) return NextResponse.json({ ok: false }, { status: 400 });
  recordAdEvent(c, s, t);
  return NextResponse.json({ ok: true });
}
