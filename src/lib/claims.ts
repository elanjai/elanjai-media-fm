/**
 * Broadcaster claim requests (F-5.3) — in-memory inbox, same
 * per-process trade-off as the report/trending/ad stores (single
 * Railway instance; resets on deploy). A real portal — verified
 * claims, metadata editing, listener stats — needs accounts + a
 * database; this inbox is the intake step of that funnel.
 */
export type StationClaim = {
  id: string;
  slug: string;
  name: string;
  role: string;
  email: string;
  evidence: string;
  message: string;
  t: number;
};

const claims: StationClaim[] = [];
const MAX_CLAIMS = 500;

export function addClaim(c: Omit<StationClaim, "id" | "t">) {
  claims.push({
    ...c,
    id: `clm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    t: Date.now(),
  });
  if (claims.length > MAX_CLAIMS) claims.splice(0, claims.length - MAX_CLAIMS);
}

export function getClaims(): StationClaim[] {
  return [...claims].sort((a, b) => b.t - a.t);
}
