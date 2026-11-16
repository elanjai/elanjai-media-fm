import stationsJson from "../../data/stations.json";
import genresJson from "../../data/genres.json";
import categoriesJson from "../../data/categories.json";
import citiesJson from "../../data/cities.json";
import networksJson from "../../data/networks.json";
import collectionsJson from "../../data/collections.json";
import diasporaJson from "../../data/diaspora.json";
import localLogosJson from "../../data/local-logos.json";
import { SITE } from "./site";
import type {
  Category,
  City,
  Genre,
  Network,
  PublicStation,
  Station,
} from "./types";

const stations = stationsJson as Station[];
const genres = genresJson as Genre[];
const localLogos = localLogosJson as Record<string, string>;

export type Collection = {
  slug: string;
  title: string;
  description: string;
  /** Inclusive ISO dates the rail should appear between ("", "" = always). */
  start: string;
  end: string;
  station_slugs: string[];
};
const collections = collectionsJson as Collection[];

/**
 * Streams only go through our same-origin /api/stream proxy when they have
 * to (the `private-stream` trick radio directories use):
 *  - http:// media is blocked on https:// pages (mixed content)
 *  - hls.js fetches via XHR, so oddball hosts without CORS headers fail
 * An <audio> element doesn't need CORS, so https:// non-HLS streams (the
 * majority of the catalog) play directly from the broadcaster — which keeps
 * our bandwidth bill near zero per listener-hour.
 */
export function playableUrl(streamUrl: string): string {
  return `/api/stream?u=${Buffer.from(streamUrl).toString("base64url")}`;
}

export function isDirectStream(streamUrl: string): boolean {
  return (
    streamUrl.startsWith("https:") && !/\.m3u8?($|\?)/i.test(streamUrl)
  );
}

const title = (s: string) =>
  s
    .split(/[-_\s]+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");

export function toPublic(s: Station): PublicStation {
  const local = localLogos[s.slug];
  const primary = s.streams[0];
  const alts = s.streams.slice(1).map((v) => v.url);
  const direct = primary ? isDirectStream(primary.url) : false;
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    genre: s.languages[0] ?? "india",
    language: s.languages.map(title).join(", "),
    country: s.country,
    codec: primary?.codec ?? "",
    bitrate: primary?.bitrate ?? 0,
    favicon: local ?? s.favicon,
    faviconAlt: local ? s.favicon : undefined,
    votes: s.votes,
    stream: primary ? (direct ? primary.url : playableUrl(primary.url)) : "",
    altStreams: alts.length
      ? alts.map((u) => (isDirectStream(u) ? u : playableUrl(u)))
      : undefined,
    hls: primary?.hls ?? false,
    direct,
    categories: s.categories.length ? s.categories : undefined,
    network: s.network,
    city: s.city,
    frequencyMhz: s.frequency_mhz,
    nameNative: s.name_native,
    aliases: s.aliases,
  };
}

/** Canonical language ordering — priority languages first, rest alphabetical. */
const GENRE_ORDER = [
  "tamil",
  "hindi",
  "telugu",
  "malayalam",
  "kannada",
  "punjabi",
  "urdu",
  "india",
];

export const getStations = () => stations.filter((s) => s.is_active);
export const getGenres = () => {
  const live = new Map<string, number>();
  for (const s of getStations())
    for (const l of s.languages) live.set(l, (live.get(l) ?? 0) + 1);
  return genres
    .map((g) => ({ ...g, count: live.get(g.slug) ?? 0 }))
    .sort((a, b) => {
      const ia = GENRE_ORDER.indexOf(a.slug);
      const ib = GENRE_ORDER.indexOf(b.slug);
      if (ia !== -1 || ib !== -1)
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return a.name.localeCompare(b.name);
    });
};
export const getGenre = (slug: string) =>
  getGenres().find((g) => g.slug === slug) ?? null;

export const getStationBySlug = (slug: string) =>
  getStations().find((s) => s.slug === slug) ?? null;

/**
 * Ranking = popularity × quality × reliability:
 *  - popularity: listener votes
 *  - quality:    stream bitrate, capped at 192k → up to +37.5%
 *  - reliability: https transport +5%, known codec & bitrate +5%
 */
const rankScore = (s: Station) => {
  const primary = s.streams[0];
  const quality = Math.min(primary?.bitrate ?? 0, 192) / 512;
  const https = primary?.url.startsWith("https") ? 0.05 : 0;
  const known = primary && primary.codec !== "UNKNOWN" && primary.bitrate > 0 ? 0.05 : 0;
  return s.votes * (1 + quality + https + known);
};

export const rankStations = (list: Station[]) =>
  [...list].sort(
    (a, b) =>
      (a.top_rank ?? Number.MAX_SAFE_INTEGER) -
        (b.top_rank ?? Number.MAX_SAFE_INTEGER) ||
      rankScore(b) - rankScore(a)
  );

export const getStationsByGenre = (genre: string) =>
  rankStations(getStations().filter((s) => s.languages.includes(genre)));

export const getFeatured = (n = 18) => rankStations(getStations()).slice(0, n);

// ---------- categories / cities / networks / collections (F-2.3..F-2.5) ----------

type CategoryMeta = { slug: string; name: string; description: string; icon?: string };
type CityMeta = { slug: string; name: string; state: string };
type NetworkMeta = { slug: string; name: string };

const categoryMeta = categoriesJson as CategoryMeta[];
const cityMeta = citiesJson as CityMeta[];
const networkMeta = networksJson as NetworkMeta[];

export const getCategories = (): Category[] => {
  const live = new Map<string, number>();
  for (const s of getStations())
    for (const c of s.categories) live.set(c, (live.get(c) ?? 0) + 1);
  return categoryMeta
    .map((c) => ({ ...c, count: live.get(c.slug) ?? 0 }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
};
export const getCategory = (slug: string) =>
  categoryMeta.find((c) => c.slug === slug) ?? null;
export const getStationsByCategory = (slug: string) =>
  rankStations(getStations().filter((s) => s.categories.includes(slug)));

export const getCities = (): City[] => {
  const live = new Map<string, { name: string; state: string; count: number }>();
  for (const s of getStations()) {
    if (!s.city) continue;
    const meta = cityMeta.find((c) => c.slug === s.city);
    const cur = live.get(s.city) ?? {
      name: meta?.name ?? title(s.city),
      state: meta?.state ?? s.state ?? "",
      count: 0,
    };
    cur.count += 1;
    live.set(s.city, cur);
  }
  return [...live.entries()]
    .map(([slug, v]) => ({ slug, ...v }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
};
export const getCity = (slug: string) => {
  const meta = cityMeta.find((c) => c.slug === slug);
  const st = getStations().find((s) => s.city === slug);
  if (!meta && !st) return null;
  return {
    slug,
    name: meta?.name ?? title(slug),
    state: meta?.state ?? st?.state ?? "",
  };
};
export const getStationsByCity = (slug: string) =>
  rankStations(getStations().filter((s) => s.city === slug));

export const getNetworks = (): Network[] => {
  const live = new Map<string, number>();
  for (const s of getStations())
    if (s.network) live.set(s.network, (live.get(s.network) ?? 0) + 1);
  return networkMeta
    .map((n) => ({ ...n, count: live.get(n.slug) ?? 0 }))
    .filter((n) => n.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
};
export const getNetwork = (slug: string) =>
  networkMeta.find((n) => n.slug === slug) ?? null;
export const getStationsByNetwork = (slug: string) =>
  rankStations(getStations().filter((s) => s.network === slug));

/**
 * Today's date ("YYYY-MM-DD"), cached for the route's revalidate window —
 * Cache Components rejects an uncached new Date() during prerender.
 */
export async function todayCached() {
  "use cache";
  return new Date().toISOString().slice(0, 10);
}

/**
 * Editorial collections currently inside their start/end window.
 * Windows are MM-DD strings and may wrap the year ("12-15"→"01-15"
 * means Dec 15 → Jan 15). Pass `today` ("YYYY-MM-DD") explicitly in
 * prerendered routes — uncached `new Date()` breaks Cache Components.
 */
export const getCollections = (today?: string): Collection[] => {
  const t = today ?? new Date().toISOString().slice(0, 10);
  const mmdd = t.slice(5);
  return collections
    .filter((c) => {
      if (!c.start || !c.end) return true;
      return c.start <= c.end
        ? c.start <= mmdd && mmdd <= c.end
        : mmdd >= c.start || mmdd <= c.end;
    })
    .map((c) => ({
      ...c,
      station_slugs: c.station_slugs.filter((sl) =>
        getStations().some((s) => s.slug === sl)
      ),
    }))
    .filter((c) => c.station_slugs.length >= 3);
};
export const getCollectionStations = (c: Collection) =>
  rankStations(
    c.station_slugs
      .map((sl) => getStationBySlug(sl))
      .filter((s): s is Station => s !== null)
  );

/** Related stations — same network or city first, then same language (F-2.7). */
export const getRelated = (station: Station, n = 8) => {
  const same = rankStations(
    getStations().filter(
      (s) =>
        s.slug !== station.slug &&
        ((station.network && s.network === station.network) ||
          (station.city && s.city === station.city))
    )
  );
  const rest = getStationsByGenre(station.languages[0]).filter(
    (s) => s.slug !== station.slug && !same.includes(s)
  );
  return [...same, ...rest].slice(0, n);
};

/**
 * Unique per-station copy (F-2.7). Prefers a real catalog `description`;
 * otherwise composes one from the station's own facts so no two pages
 * share the same boilerplate paragraph.
 */
export const describeStation = (s: Station) => {
  if (s.description) return s.description;
  const lang = s.languages.map((l) => l[0].toUpperCase() + l.slice(1)).join(" and ");
  const where = [s.city, s.state].filter(Boolean).join(", ") || s.country || "India";
  const facts = [
    `${s.name} is a ${lang} radio station broadcasting from ${where}`,
    s.network ? ` on the ${s.network} network` : "",
    s.frequency_mhz ? `, heard locally on ${s.frequency_mhz} FM` : "",
    `.`,
  ].join("");
  const kind =
    s.categories.length > 0
      ? ` Its programming focuses on ${s.categories.slice(0, 3).join(", ")}.`
      : "";
  const streams =
    s.streams.length > 1
      ? ` ${s.streams.length} stream qualities are available — the player picks the best one your connection can handle.`
      : "";
  return `${facts}${kind} Listen live and free on ${SITE.name} — no sign-up needed.${streams}`;
};

// ---------- diaspora landing pages (F-3.6) ----------

type DiasporaMarket = {
  slug: string;
  name: string;
  short: string;
  tz: string;
  community: string;
};
export type DiasporaPage = {
  slug: string;
  genre: string;
  genreName: string;
  market: DiasporaMarket;
};

const diasporaData = diasporaJson as {
  markets: DiasporaMarket[];
  pages: { genre: string; name: string; markets: string[] }[];
};

/** Only expose combos whose language actually has stations to show. */
export const getDiasporaPages = (): DiasporaPage[] => {
  const marketBySlug = new Map(diasporaData.markets.map((m) => [m.slug, m]));
  const out: DiasporaPage[] = [];
  for (const p of diasporaData.pages) {
    if (!getStations().some((s) => s.languages.includes(p.genre))) continue;
    for (const ms of p.markets) {
      const market = marketBySlug.get(ms);
      if (!market) continue;
      out.push({
        slug: `${p.genre}-radio-in-${ms}`,
        genre: p.genre,
        genreName: p.name,
        market,
      });
    }
  }
  return out;
};
export const getDiasporaPage = (slug: string) =>
  getDiasporaPages().find((p) => p.slug === slug) ?? null;

/** Long-tail SEO copy — distinct intro + body per market/language pair. */
export const describeDiaspora = (p: DiasporaPage, count: number) => {
  const g = p.genreName;
  const m = p.market;
  const intro = `${g} radio online in ${m.name} — ${count} live ${g} stations streaming free on ${SITE.name}.`;
  const community = `Made for ${m.community} — pick a station, press play, and home is in the room.`;
  const tz = `${m.tz}, so the shows your family is hearing right now are the ones you'll hear too.`;
  return `${intro} ${community} ${tz} Works on any phone or laptop, no app or sign-up — favourites and Continue Listening make it feel like the dial back home.`;
};

export function searchStations(q: string): Station[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return rankStations(getStations()).filter(
    (s) =>
      s.name.toLowerCase().includes(needle) ||
      (s.name_native ?? "").includes(q.trim()) ||
      s.languages.some((l) => l.includes(needle)) ||
      s.categories.some((c) => c.includes(needle)) ||
      (s.aliases ?? []).some((a) => a.toLowerCase().includes(needle)) ||
      (s.city ?? "").includes(needle) ||
      (s.network ?? "").includes(needle) ||
      String(s.frequency_mhz ?? "").startsWith(needle) ||
      s.tags.some((t) => t.toLowerCase().includes(needle))
  );
}
