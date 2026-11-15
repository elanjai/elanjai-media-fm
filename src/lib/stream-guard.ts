import { createHmac, randomBytes } from "crypto";
import { getStations } from "./data";

/**
 * Shared guard for the stream proxy (/api/stream) and the now-playing
 * lookup (/api/now-playing).
 *
 * - Allowed targets are the *exact* stream URLs in the catalog — not whole
 *   origins. Allowing e.g. all of stream.zeno.fm would let anyone relay any
 *   Zeno stream through our server.
 * - URLs the proxy itself emits (rewritten HLS playlists + segments) carry an
 *   HMAC signature with an expiry, verified on the way back in.
 * - In-memory per-IP limits (request window + concurrent streams) so a
 *   single client can't run up the egress bill.
 */

const ALLOWED_STREAMS = new Set(
  getStations().map((s) => {
    try {
      return new URL(s.stream_url).toString();
    } catch {
      return s.stream_url;
    }
  })
);

export function isCatalogStream(target: URL): boolean {
  return ALLOWED_STREAMS.has(target.toString());
}

export function stationStreamUrl(slug: string): string | null {
  for (const s of getStations()) if (s.slug === slug) return s.stream_url;
  return null;
}

// ---------- signed proxy URLs ----------

/**
 * STREAM_URL_SECRET should be set in production so signatures survive
 * restarts and multiple replicas. In dev (or when unset) a random
 * per-process secret is used — signed HLS URLs then break on restart.
 */
const SECRET: Buffer = process.env.STREAM_URL_SECRET
  ? Buffer.from(process.env.STREAM_URL_SECRET, "utf8")
  : randomBytes(32);

/** Signed URLs live long enough to outlive any manifest refresh cycle. */
const SIG_TTL_MS = 4 * 60 * 60 * 1000;

function hmac(expires: number, u: URL): string {
  return createHmac("sha256", SECRET)
    .update(`${expires}:${u.toString()}`)
    .digest("base64url")
    .slice(0, 20);
}

export function signedProxyParams(u: URL): { u: string; s: string; e: number } {
  const e = Date.now() + SIG_TTL_MS;
  return {
    u: Buffer.from(u.toString()).toString("base64url"),
    s: hmac(e, u),
    e,
  };
}

export function verifySignature(u: URL, s: string, e: number): boolean {
  if (!s || !Number.isFinite(e)) return false;
  if (e < Date.now() || e > Date.now() + 2 * SIG_TTL_MS) return false;
  return s === hmac(e, u);
}

// ---------- rate limiting (in-memory, per process) ----------

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** Sliding-window request counter. Returns true while within the limit. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
  }
  return b.count <= limit;
}

/** Track concurrent long-lived connections per key. Returns a release fn. */
export function acquireSlot(key: string, limit: number): (() => void) | null {
  const k = `conc:${key}`;
  const now = Date.now();
  let b = buckets.get(k);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + 24 * 60 * 60 * 1000 };
    buckets.set(k, b);
  }
  if (b.count >= limit) return null;
  b.count += 1;
  let released = false;
  return () => {
    if (!released) {
      released = true;
      b.count = Math.max(0, b.count - 1);
    }
  };
}

/** Best-effort client IP (Railway/CDN set x-forwarded-for). */
export function clientKey(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "local";
}
