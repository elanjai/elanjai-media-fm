import { NextRequest, NextResponse } from "next/server";
import { addClaim } from "@/lib/claims";
import { getStationBySlug } from "@/lib/data";
import { clientKey, rateLimit } from "@/lib/stream-guard";

/**
 * Broadcaster claim intake (F-5.3). Validates the station + the basic
 * evidence a reviewer needs; storage is the in-memory inbox surfaced
 * at /admin/claims. Strictly rate-limited — it accepts free text.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clip = (v: unknown, n: number) =>
  typeof v === "string" ? v.trim().slice(0, n) : "";

export async function POST(request: NextRequest) {
  if (!rateLimit(`claim:${clientKey(request)}`, 5, 60_000)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const slug = clip(body.slug, 80);
  const name = clip(body.name, 120);
  const role = clip(body.role, 80);
  const email = clip(body.email, 160).toLowerCase();
  const evidence = clip(body.evidence, 300);
  const message = clip(body.message, 1000);

  if (!getStationBySlug(slug) || !name || !role || !EMAIL_RE.test(email) || !evidence) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  addClaim({ slug, name, role, email, evidence, message });
  return NextResponse.json({ ok: true });
}
