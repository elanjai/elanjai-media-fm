import { NextRequest, NextResponse } from "next/server";
import { getStationBySlug } from "@/lib/data";
import { clientKey, rateLimit } from "@/lib/stream-guard";

/**
 * "Report a problem" + automatic failure beacons (F-1.6).
 *
 * Reports are kept in process memory (Railway runs a single Node process,
 * so this is adequate for flagging): a station is flagged once ≥3 distinct
 * sessions report within a rolling 1-hour window — which is also the signal
 * the nightly catalog health check can consume via GET.
 */

type Report = { t: number; sid: string; reason: string; ttfa: number | null };
const reports = new Map<string, Report[]>();

const WINDOW_MS = 60 * 60 * 1000;
const FLAG_THRESHOLD = 3;
const MAX_ENTRIES = 500;

function prune() {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [slug, list] of reports) {
    const kept = list.filter((r) => r.t >= cutoff);
    if (kept.length) reports.set(slug, kept);
    else reports.delete(slug);
  }
}

function distinctSessions(list: Report[]) {
  return new Set(list.map((r) => r.sid)).size;
}

export async function POST(request: NextRequest) {
  if (!rateLimit(`report:${clientKey(request)}`, 30, 60_000)) {
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
  const report: Report = {
    t: Date.now(),
    sid,
    reason:
      typeof body.reason === "string" ? body.reason.slice(0, 80) : "unknown",
    ttfa: typeof body.ttfa === "number" ? body.ttfa : null,
  };

  const list = reports.get(slug) ?? [];
  list.push(report);
  if (list.length > MAX_ENTRIES) list.splice(0, list.length - MAX_ENTRIES);
  reports.set(slug, list);
  prune();

  return NextResponse.json({
    ok: true,
    flagged: distinctSessions(list) >= FLAG_THRESHOLD,
  });
}

/** Station slugs currently over the failure threshold. */
export function GET() {
  prune();
  const stations = [...reports.entries()]
    .map(([slug, list]) => ({
      slug,
      reports: list.length,
      sessions: distinctSessions(list),
      flagged: distinctSessions(list) >= FLAG_THRESHOLD,
    }))
    .sort((a, b) => b.reports - a.reports);
  return NextResponse.json({ stations });
}
