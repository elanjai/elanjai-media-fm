import { NATIVE_NAMES } from "./languages";
import type { PublicStation } from "./types";

/**
 * Client-side search (F-1.7): results as you type over the ~370-station
 * catalog, tolerant of how people actually spell station names.
 *
 * Scoring ladder:
 *  1. exact substring / prefix on the station name        → strongest
 *  2. all query tokens found across name/tags/language    → strong
 *  3. frequency query ("93.5") matching digits in the name → strong
 *  4. trigram Jaccard similarity ≥ 0.35 on the name        → typo fallback
 * Alias rewrites ("suriyan"→"suryan") run before scoring.
 */

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9. ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Common transliteration spellings → the spelling used in the catalog. */
const ALIASES: Record<string, string> = {
  suriyan: "suryan",
  sooriyan: "suryan",
  suryanfm: "suryan",
  mirchy: "mirchi",
  meerchi: "mirchi",
  bigfm: "big fm",
  redfm: "red fm",
  clubfm: "club fm",
  radiocity: "radio city",
  airrainbow: "air rainbow",
};

function trigrams(s: string): Set<string> {
  const t = ` ${s} `;
  const out = new Set<string>();
  for (let i = 0; i + 3 <= t.length; i++) out.add(t.slice(i, i + 3));
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/** True when the query carries non-ASCII script (native dictation, typed names). */
const hasNativeScript = (s: string) => /[^\x00-\x7f]/.test(s);

type Entry = {
  s: PublicStation;
  name: string;
  hay: string; // name + tags + genre + language + country, normalized
  /** Native-script haystack — name_native + aliases, lowercased but NOT Latin-normalized. */
  hayNative: string;
  tri: Set<string>;
};

let cache: { key: PublicStation[]; entries: Entry[] } | null = null;

function entriesOf(stations: PublicStation[]): Entry[] {
  if (cache?.key === stations) return cache.entries;
  const entries = stations.map((s) => {
    const name = norm(s.name);
    const hay = norm(
      [s.name, s.genre, s.language, s.country, s.codec].join(" ")
    );
    const hayNative = [
      s.nameNative ?? "",
      ...(s.aliases ?? []),
      // Genre + language native labels — "தமிழ்" / "हिन्दी" queries hit every
      // station of that language even without per-station native names.
      NATIVE_NAMES[s.genre] ?? "",
      ...(s.languages ?? []).map((l) => NATIVE_NAMES[l] ?? ""),
    ]
      .join(" ")
      .toLowerCase();
    return { s, name, hay, hayNative, tri: trigrams(name) };
  });
  cache = { key: stations, entries };
  return entries;
}

/** Expand a raw query into normalized tokens, applying alias rewrites. */
function expandQuery(q: string): string {
  let n = norm(q);
  for (const [from, to] of Object.entries(ALIASES)) {
    if (n === from) return to;
    if (n.includes(from)) n = n.replaceAll(from, to);
  }
  return n;
}

const FREQ_RE = /^\d{1,3}(?:\.\d{1,2})?$/;

export function searchLocal(
  stations: PublicStation[],
  query: string
): PublicStation[] {
  const raw = query.trim();
  const entries = entriesOf(stations);
  // Native-script query (e.g. Tamil dictation "சூரியன்") — the Latin
  // normalizer would reduce it to nothing, so match raw against the
  // native haystack (name_native + aliases) before the Latin path.
  if (hasNativeScript(raw)) {
    const q = raw.toLowerCase();
    const hits = entries.filter(
      (e) =>
        e.hayNative.includes(q) ||
        (e.s.nameNative ?? "").toLowerCase().includes(q)
    );
    if (hits.length) return hits.map((h) => h.s);
  }
  const needle = expandQuery(query);
  if (!needle) return [];
  const tokens = needle.split(" ");
  const isFreq = FREQ_RE.test(needle);
  const needleTri = trigrams(needle);

  const scored: { s: PublicStation; score: number }[] = [];
  for (const e of entriesOf(stations)) {
    let score = 0;
    if (e.name === needle) score = 120;
    else if (e.name.startsWith(needle)) score = 100;
    else if (e.name.includes(needle)) score = 85;
    else if (isFreq && e.name.includes(needle)) score = 80;
    else if (tokens.every((t) => e.hay.includes(t))) score = 60;
    else {
      const sim = jaccard(needleTri, e.tri);
      if (sim >= 0.35) score = Math.round(sim * 60);
    }
    // A frequency also appears inside names like "Radio Mirchi 98.3".
    if (isFreq && e.name.includes(needle)) score = Math.max(score, 80);
    if (score > 0) scored.push({ s: e.s, score });
  }
  return scored
    .sort(
      (a, b) => b.score - a.score || b.s.votes - a.s.votes || b.s.bitrate - a.s.bitrate
    )
    .map((x) => x.s);
}
