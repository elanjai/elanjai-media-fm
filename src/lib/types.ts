/** One playable variant of a station's stream. Ordered best-first. */
export type StreamVariant = {
  url: string;
  codec: string;
  bitrate: number;
  hls: boolean;
};

/**
 * Catalog schema v2 (F-2.1). `languages` and `categories` hold the same
 * slugs used by /genre and /category routes (e.g. "tamil", "film") — genre
 * URLs stay stable. `languages[0]` is the primary language shown in the UI.
 * Migrated by scripts/migrate_schema_v2.py; scrapers emit this shape.
 */
export type Station = {
  id: string;
  slug: string;
  name: string;
  name_native?: string;
  aliases?: string[];
  streams: StreamVariant[];
  languages: string[];
  categories: string[];
  network?: string;
  city?: string;
  state?: string;
  country: string;
  frequency_mhz?: number;
  homepage?: string;
  description?: string;
  favicon: string;
  tags: string[];
  votes: number;
  top_rank?: number;
  is_active: boolean;
  last_checked_at?: string;
  health_score?: number;
};

export type Genre = {
  slug: string;
  name: string;
  count: number;
};

export type Category = {
  slug: string;
  name: string;
  description: string;
  icon?: string;
  count: number;
};

export type City = {
  slug: string;
  name: string;
  state: string;
  count: number;
};

export type Network = {
  slug: string;
  name: string;
  count: number;
};

export type PublicStation = Pick<
  Station,
  "id" | "name" | "slug" | "country" | "favicon" | "votes"
> & {
  /** Primary language slug — used for genre links and queue fallback. */
  genre: string;
  /** Human-readable language list for display ("Tamil, English"). */
  language: string;
  codec: string;
  bitrate: number;
  /** URL handed to the player — upstream for direct streams, proxy URL otherwise. */
  stream: string;
  /** Fallback stream URLs tried in order on reconnect (from streams[1..]). */
  altStreams?: string[];
  hls: boolean;
  /** True when the browser plays the broadcaster's https URL directly (no proxy). */
  direct: boolean;
  categories?: string[];
  network?: string;
  city?: string;
  frequencyMhz?: number;
  nameNative?: string;
  aliases?: string[];
  playedAt?: number;
  faviconAlt?: string;
};
