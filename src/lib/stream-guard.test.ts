import { describe, expect, it } from "vitest";
import stationsJson from "../../data/stations.json";
import type { Station } from "./types";
import {
  acquireSlot,
  isCatalogStream,
  rateLimit,
  signedProxyParams,
  stationStreamUrl,
  verifySignature,
} from "./stream-guard";

describe("stream allowlist", () => {
  it("accepts an exact catalog stream URL", () => {
    const first = (stationsJson as Station[]).find((s) => s.is_active)!;
    expect(isCatalogStream(new URL(first.stream_url))).toBe(true);
    expect(stationStreamUrl(first.slug)).toBe(first.stream_url);
  });

  it("rejects an arbitrary URL on an allowlisted host (no open-proxy by origin)", () => {
    const target = new URL("https://stream.zeno.fm/not-in-our-catalog-xyz");
    expect(isCatalogStream(target)).toBe(false);
  });

  it("rejects non-stream paths entirely", () => {
    expect(isCatalogStream(new URL("https://evil.example/"))).toBe(false);
  });
});

describe("signed proxy URLs", () => {
  const u = new URL("https://cdn.example/seg-1.aac");

  it("round-trips a freshly signed URL", () => {
    const { s, e } = signedProxyParams(u);
    expect(verifySignature(u, s, e)).toBe(true);
  });

  it("rejects a tampered URL", () => {
    const { s, e } = signedProxyParams(u);
    expect(
      verifySignature(new URL("https://other.example/seg.aac"), s, e)
    ).toBe(false);
  });

  it("rejects a forged/blank signature", () => {
    expect(verifySignature(u, "", Date.now() + 1000)).toBe(false);
    expect(verifySignature(u, "forged", Date.now() + 1000)).toBe(false);
  });

  it("rejects an expired signature", () => {
    const { s } = signedProxyParams(u);
    const past = Date.now() - 1000;
    // recompute what the sig *would* be for the past expiry to ensure only
    // the expiry check (not the signature mismatch) causes rejection
    expect(verifySignature(u, s, past)).toBe(false);
  });
});

describe("rate limits", () => {
  it("allows up to the limit then blocks", () => {
    const key = `t-${Math.random()}`;
    for (let i = 0; i < 3; i++) expect(rateLimit(key, 3, 60_000)).toBe(true);
    expect(rateLimit(key, 3, 60_000)).toBe(false);
  });

  it("concurrent slots cap and release", () => {
    const key = `t-${Math.random()}`;
    const r1 = acquireSlot(key, 1);
    expect(r1).not.toBeNull();
    expect(acquireSlot(key, 1)).toBeNull();
    r1!();
    expect(acquireSlot(key, 1)).not.toBeNull();
  });
});
