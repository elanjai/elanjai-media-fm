/**
 * Ad serving counters (F-4.2) — in-memory {day,campaign,slot} → imp/clk,
 * same per-process trade-off as the other stores. Aggregate only: no sid,
 * no user identity — a hit counter, which is also why ad beacons don't
 * sit behind the analytics consent gate.
 */
export type AdCounter = {
  day: string;
  campaign: string;
  slot: string;
  imp: number;
  clk: number;
};

const counters = new Map<string, AdCounter>();
const MAX_KEYS = 10_000;

const today = () => new Date().toISOString().slice(0, 10);

export function recordAdEvent(campaign: string, slot: string, type: "imp" | "clk") {
  const day = today();
  const k = `${day}\t${campaign}\t${slot}`;
  let row = counters.get(k);
  if (!row) {
    if (counters.size >= MAX_KEYS) {
      // Evict oldest day-group when unbounded garbage arrives.
      const oldest = [...counters.keys()].sort()[0].split("\t")[0];
      for (const ck of [...counters.keys()])
        if (ck.startsWith(oldest)) counters.delete(ck);
    }
    row = { day, campaign, slot, imp: 0, clk: 0 };
    counters.set(k, row);
  }
  if (type === "imp") row.imp++;
  else row.clk++;
}

/** Last `days` of counters, newest first, for the /admin/ads report. */
export function adStats(days = 30): AdCounter[] {
  const cutoff = today();
  const minDay = new Date(Date.parse(cutoff) - days * 86400_000)
    .toISOString()
    .slice(0, 10);
  return [...counters.values()]
    .filter((r) => r.day >= minDay)
    .sort((a, b) =>
      a.day < b.day ? 1 : a.day > b.day ? -1 : a.campaign.localeCompare(b.campaign)
    );
}
