/**
 * Play-count store for real trending (F-2.6). In-memory per process —
 * same trade-off as the report store: good enough on a single-instance
 * deployment, replaced by analytics storage later (F-7).
 *
 * A "play" is { slug, at, sid }. The client beacons once when a station
 * actually reaches `playing` — pause/resume doesn't recount, and the
 * same session can't re-count a station within SESSION_GAP_MS.
 */

type Play = { at: number; sid: string };

const plays = new Map<string, Play[]>();
const WINDOW_7D = 7 * 24 * 60 * 60 * 1000;
const SESSION_GAP_MS = 30 * 60 * 1000;
const MAX_PER_STATION = 400;

function prune() {
  const cutoff = Date.now() - WINDOW_7D;
  for (const [slug, list] of plays) {
    const kept = list.filter((p) => p.at >= cutoff);
    if (kept.length) plays.set(slug, kept);
    else plays.delete(slug);
  }
}

export function recordPlay(slug: string, sid: string): boolean {
  const now = Date.now();
  const list = plays.get(slug) ?? [];
  // same listener re-beaconing quickly = one play, not a spam vector
  if (sid !== "anonymous" && list.some((p) => p.sid === sid && now - p.at < SESSION_GAP_MS)) {
    return false;
  }
  list.push({ at: now, sid });
  if (list.length > MAX_PER_STATION) list.splice(0, list.length - MAX_PER_STATION);
  plays.set(slug, list);
  prune();
  return true;
}

/** Rolling play counts per slug: {d1: last-24h, d7: last-7d}. */
export function playCounts(): Map<string, { d1: number; d7: number }> {
  prune();
  const now = Date.now();
  const day = now - 24 * 60 * 60 * 1000;
  const out = new Map<string, { d1: number; d7: number }>();
  for (const [slug, list] of plays) {
    let d1 = 0;
    for (const p of list) if (p.at >= day) d1++;
    out.set(slug, { d1, d7: list.length });
  }
  return out;
}
