export type Station = {
  id: string;
  name: string;
  slug: string;
  stream_url: string;
  homepage: string;
  favicon: string;
  genre: string;
  language: string;
  country: string;
  codec: string;
  bitrate: number;
  votes: number;
  tags: string[];
  /** Editorial top-20 position within the genre (1 = genre flagship). */
  top_rank?: number;
  is_active: boolean;
};

export type Genre = {
  slug: string;
  name: string;
  count: number;
};

export type PublicStation = Pick<
  Station,
  | "id"
  | "name"
  | "slug"
  | "genre"
  | "language"
  | "country"
  | "codec"
  | "bitrate"
  | "favicon"
  | "votes"
> & { stream: string; hls: boolean; playedAt?: number; faviconAlt?: string };
