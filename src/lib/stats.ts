/**
 * Local listening stats (F-5.7) — localStorage-only, so they describe
 * this device, not the account. Recorded by AudioProvider while a
 * stream is actually playing (buffering/reconnecting don't count).
 * Independent of analytics consent: it never leaves the device.
 */
export type StatsData = {
  totalSec: number;
  sessions: number;
  /** slug → aggregate seconds + last-played ISO date */
  byStation: Record<string, { sec: number; last: string }>;
  /** local day "YYYY-MM-DD" → seconds */
  byDay: Record<string, number>;
};

const KEY = "emfm:stats";

const EMPTY: StatsData = { totalSec: 0, sessions: 0, byStation: {}, byDay: {} };

export function localDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function getStats(): StatsData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const s = JSON.parse(raw) as StatsData;
    return s && typeof s.totalSec === "number" ? { ...EMPTY, ...s } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function save(s: StatsData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage denied */
  }
}

export function recordSeconds(slug: string, sec: number, now = new Date()) {
  if (!slug || sec <= 0) return;
  const s = getStats();
  const day = localDay(now);
  const e = s.byStation[slug] ?? { sec: 0, last: day };
  save({
    ...s,
    totalSec: s.totalSec + sec,
    byStation: { ...s.byStation, [slug]: { sec: e.sec + sec, last: day } },
    byDay: { ...s.byDay, [day]: (s.byDay[day] ?? 0) + sec },
  });
}

export function recordSession() {
  const s = getStats();
  save({ ...s, sessions: s.sessions + 1 });
}

export function resetStats() {
  save(EMPTY);
}

/** Seconds listened in the given local year/month (month is 0-based). */
export function monthSeconds(s: StatsData, year: number, month: number): number {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  return Object.entries(s.byDay).reduce(
    (sum, [day, sec]) => (day.startsWith(prefix) ? sum + sec : sum),
    0
  );
}

/** Top n slugs by accumulated seconds, most-listened first. */
export function topStations(s: StatsData, n = 5): { slug: string; sec: number }[] {
  return Object.entries(s.byStation)
    .map(([slug, e]) => ({ slug, sec: e.sec }))
    .sort((a, b) => b.sec - a.sec)
    .slice(0, n);
}
