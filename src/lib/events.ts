/**
 * Server-side analytics store (F-4.1) — in-memory aggregate counters,
 * same per-process trade-off as trending/report. Keys are
 * (day, event, dimension) triples; dimension cardinality is capped so a
 * flood of junk values can't grow memory unboundedly.
 */
export type EventRow = { day: string; event: string; key: string; count: number };

const rows = new Map<string, number>();
const MAX_ROWS = 20_000;
const MAX_KEY_LEN = 80;

const day = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);

export function recordEvent(event: string, key: string, n = 1) {
  if (!/^[a-z_]{2,32}$/.test(event)) return false;
  const k = `${day()}\t${event}\t${key.slice(0, MAX_KEY_LEN)}`;
  rows.set(k, (rows.get(k) ?? 0) + n);
  // FIFO-evict the oldest third when the map gets silly — aggregate
  // counters tolerate it, memory doesn't.
  if (rows.size > MAX_ROWS) {
    let drop = Math.floor(MAX_ROWS / 3);
    for (const rk of rows.keys()) {
      rows.delete(rk);
      if (--drop <= 0) break;
    }
  }
  return true;
}

/** Rows as {day,event,key,count}, newest days first. */
export function eventStats(days = 30): EventRow[] {
  const cutoff = day(Date.now() - days * 86400_000);
  const out: EventRow[] = [];
  for (const [k, count] of rows) {
    const [d, event, key] = k.split("\t");
    if (d >= cutoff) out.push({ day: d, event, key, count });
  }
  return out.sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : a.event.localeCompare(b.event)));
}
