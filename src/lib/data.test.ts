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
  stream_url: "https://example.com/stream",
  homepage: "",
  favicon: "",
  genre: "tamil",
  language: "tamil",
  country: "India",
  codec: "MP3",
  bitrate: 128,
  votes: 10,
  tags: [],
  is_active: true,
};

describe("isDirectStream / toPublic", () => {
  it("plays https non-HLS streams directly", () => {
    const p = toPublic(base);
    expect(p.direct).toBe(true);
    expect(p.stream).toBe(base.stream_url);
    expect(p.hls).toBe(false);
  });

  it("proxies http streams (mixed content)", () => {
    const p = toPublic({ ...base, stream_url: "http://example.com/stream" });
    expect(p.direct).toBe(false);
    expect(p.stream).toMatch(/^\/api\/stream\?u=/);
  });

  it("proxies https HLS streams (hls.js needs same-origin XHR)", () => {
    const p = toPublic({ ...base, stream_url: "https://example.com/a.m3u8" });
    expect(p.direct).toBe(false);
    expect(p.hls).toBe(true);
    expect(p.stream).toMatch(/^\/api\/stream\?u=/);
  });

  it("detects HLS URLs with query strings", () => {
    const p = toPublic({
      ...base,
      stream_url: "https://example.com/live.m3u8?token=x",
    });
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
