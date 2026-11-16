import { describe, expect, it } from "vitest";
import {
  getFeatured,
  getGenres,
  getStations,
  rankStations,
  searchStations,
  toPublic,
} from "./data";
import type { Station } from "./types";

const base: Station = {
  id: "t1",
  name: "Test FM",
  slug: "test-fm",
  streams: [{ url: "https://example.com/stream", codec: "MP3", bitrate: 128, hls: false }],
  languages: ["tamil"],
  categories: [],
  homepage: "",
  favicon: "",
  country: "India",
  votes: 10,
  tags: [],
  is_active: true,
};

const withStream = (url: string, hls = false): Station => ({
  ...base,
  streams: [{ url, codec: "MP3", bitrate: 128, hls }],
});

describe("isDirectStream / toPublic", () => {
  it("plays https non-HLS streams directly", () => {
    const p = toPublic(base);
    expect(p.direct).toBe(true);
    expect(p.stream).toBe(base.streams[0].url);
    expect(p.hls).toBe(false);
  });

  it("exposes remaining streams as altStreams for failover", () => {
    const s = withStream("https://example.com/a");
    s.streams.push({ url: "http://example.com/b", codec: "AAC", bitrate: 64, hls: false });
    const p = toPublic(s);
    expect(p.altStreams?.[0]).toMatch(/^\/api\/stream\?u=/);
  });

  it("proxies http streams (mixed content)", () => {
    const p = toPublic(withStream("http://example.com/stream"));
    expect(p.direct).toBe(false);
    expect(p.stream).toMatch(/^\/api\/stream\?u=/);
  });

  it("proxies https HLS streams (hls.js needs same-origin XHR)", () => {
    const p = toPublic(withStream("https://example.com/a.m3u8", true));
    expect(p.direct).toBe(false);
    expect(p.hls).toBe(true);
    expect(p.stream).toMatch(/^\/api\/stream\?u=/);
  });

  it("detects HLS URLs with query strings", () => {
    const p = toPublic(
      withStream("https://example.com/live.m3u8?token=x", true)
    );
    expect(p.hls).toBe(true);
    expect(p.direct).toBe(false);
  });
});

describe("catalog helpers", () => {
  it("returns only active stations", () => {
    expect(getStations().every((s) => s.is_active)).toBe(true);
  });

  it("orders genres with priority languages first", () => {
    const order = getGenres().map((g) => g.slug);
    expect(order.indexOf("tamil")).toBeLessThan(order.indexOf("punjabi"));
    expect(order[0]).toBe("tamil");
  });

  it("ranks editorial top_rank before score", () => {
    const a = { ...base, slug: "a", votes: 999999, top_rank: 2 };
    const b = { ...base, id: "t2", slug: "b", votes: 1, top_rank: 1 };
    const ranked = rankStations([a, b]);
    expect(ranked[0].slug).toBe("b");
  });

  it("search matches name, genre, tags and language", () => {
    expect(searchStations("tamil").length).toBeGreaterThan(0);
    expect(searchStations("")).toEqual([]);
    expect(searchStations("zzzz-not-a-station")).toEqual([]);
  });

  it("getFeatured returns ranked active stations", () => {
    const f = getFeatured(5);
    expect(f).toHaveLength(5);
    expect(f.every((s) => s.is_active)).toBe(true);
  });
});
