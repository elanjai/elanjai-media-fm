import { describe, expect, it } from "vitest";
import { searchLocal } from "./search";
import type { PublicStation } from "./types";

const st = (name: string, genre = "tamil", votes = 10): PublicStation => ({
  id: name,
  name,
  slug: name.toLowerCase().replace(/\s+/g, "-"),
  genre,
  language: genre,
  country: "India",
  codec: "MP3",
  bitrate: 128,
  favicon: "",
  votes,
  stream: "https://x",
  hls: false,
  direct: true,
});

const catalog = [
  st("Suryan FM", "tamil", 900),
  st("Radio Mirchi 98.3", "tamil", 800),
  st("Hello FM 106.4", "tamil", 500),
  st("Big FM 92.7", "hindi", 700),
  st("AIR Raagam", "india", 100),
];

describe("searchLocal", () => {
  it("finds stations by exact/substring name", () => {
    expect(searchLocal(catalog, "suryan")[0]?.name).toBe("Suryan FM");
    expect(searchLocal(catalog, "raagam")[0]?.name).toBe("AIR Raagam");
  });

  it("expands common transliteration aliases", () => {
    expect(searchLocal(catalog, "suriyan")[0]?.name).toBe("Suryan FM");
    expect(searchLocal(catalog, "mirchy")[0]?.name).toBe("Radio Mirchi 98.3");
  });

  it("matches frequencies inside names", () => {
    const r = searchLocal(catalog, "98.3");
    expect(r[0]?.name).toBe("Radio Mirchi 98.3");
    expect(searchLocal(catalog, "106.4")[0]?.name).toBe("Hello FM 106.4");
  });

  it("tolerates small typos via trigram similarity", () => {
    expect(searchLocal(catalog, "surayn fm")[0]?.name).toBe("Suryan FM");
    expect(searchLocal(catalog, "helo fm")[0]?.name).toBe("Hello FM 106.4");
  });

  it("matches language/genre terms", () => {
    const r = searchLocal(catalog, "hindi");
    expect(r.every((s) => s.genre === "hindi")).toBe(true);
  });

  it("returns [] for empty and nonsense queries", () => {
    expect(searchLocal(catalog, "")).toEqual([]);
    expect(searchLocal(catalog, "   ")).toEqual([]);
    expect(searchLocal(catalog, "zzzzqqq")).toEqual([]);
  });

  it("matches native-script queries against language names", () => {
    // Tamil dictation "தமிழ்" should hit every Tamil station, not dead-end.
    const r = searchLocal(catalog, "தமிழ்");
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((s) => s.genre === "tamil")).toBe(true);
    const h = searchLocal(catalog, "हिन्दी");
    expect(h.every((s) => s.genre === "hindi")).toBe(true);
  });

  it("matches native-script queries against station native names", () => {
    const nativeCatalog = [
      { ...st("Suryan FM", "tamil", 900), nameNative: "சூரியன் எஃப்.எம்" },
      st("Hello FM 106.4", "tamil", 500),
    ];
    const r = searchLocal(nativeCatalog, "சூரியன்");
    expect(r[0]?.name).toBe("Suryan FM");
  });
});
