/**
 * Live listener counts (F-5.4) — slug → {sessionId → last-seen},
 * 5-minute sliding window, in-memory per process (same trade-off as
 * the other stores). A sid that stops beaconing ages out, so counts
 * reflect "listening right now" — not cumulative plays.
 */
const WINDOW_MS = 5 * 60 * 1000;
const MAX_SIDS_PER_STATION = 10_000;

const active = new Map<string, Map<string, number>>();

function prune() {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [slug, sids] of active) {
    for (const [sid, t] of sids) if (t < cutoff) sids.delete(sid);
    if (!sids.size) active.delete(slug);
  }
}

export function recordHeartbeat(slug: string, sid: string) {
  const sids = active.get(slug) ?? new Map<string, number>();
  // Oldest-entry eviction only matters under deliberate flooding.
  if (!sids.has(sid) && sids.size >= MAX_SIDS_PER_STATION) {
    const oldest = [...sids.entries()].sort((a, b) => a[1] - b[1])[0]?.[0];
    if (oldest) sids.delete(oldest);
  }
  sids.set(sid, Date.now());
  active.set(slug, sids);
  prune();
}

export function listenerCount(slug: string): number {
  prune();
  return active.get(slug)?.size ?? 0;
}
