import { describe, expect, it } from "vitest";
import { campaigns, eligibleCampaigns, pickWeighted, type Campaign } from "./ads";

const TODAY = "2026-06-15";

const c = (over: Partial<Campaign>): Campaign => ({
  id: "t",
  advertiser: "A",
  kind: "banner",
  label: "Sponsored",
  creative: { headline: "h" },
  targeting: { slots: ["list-infeed"] },
  schedule: { start: "2026-01-01", end: "2026-12-31" },
  weight: 1,
  caps: {},
  status: "active",
  ...over,
});

describe("eligibleCampaigns (against data/campaigns.json)", () => {
  it("every slot used by the app has at least one active campaign", () => {
    for (const slot of [
      "home-infeed-1",
      "home-infeed-2",
      "list-infeed",
      "search-infeed",
      "station-rect",
      "np-sponsored",
      "rail-desktop",
    ]) {
      expect(eligibleCampaigns(slot, { today: TODAY }).length, slot).toBeGreaterThan(0);
    }
  });

  it("draft campaigns never surface (feat-example-tamil)", () => {
    const all = [
      ...eligibleCampaigns("featured-top", { today: TODAY, language: "tamil" }),
      ...eligibleCampaigns("featured-rail", { today: TODAY }),
    ];
    expect(all.some((x) => x.id === "feat-example-tamil")).toBe(false);
  });

  it("language targeting filters mismatched campaigns", () => {
    const tamil = eligibleCampaigns("list-infeed", { today: TODAY, language: "tamil" });
    expect(tamil.every((x) => !x.targeting.languages || x.targeting.languages.includes("tamil"))).toBe(true);
  });

  it("all campaigns carry a required label and sane dates", () => {
    for (const x of campaigns) {
      expect(["Sponsored", "Ad", "From Elanjai FM"]).toContain(x.label);
      expect(x.schedule.start <= x.schedule.end, x.id).toBe(true);
    }
  });
});

describe("pickWeighted", () => {
  const a = c({ id: "a", weight: 1 });
  const b = c({ id: "b", weight: 3 });

  it("returns null on empty input", () => {
    expect(pickWeighted([], 0.5)).toBeNull();
  });

  it("respects weights across the rand spectrum", () => {
    expect(pickWeighted([a, b], 0.1)?.id).toBe("a");
    expect(pickWeighted([a, b], 0.5)?.id).toBe("b");
    expect(pickWeighted([a, b], 0.99)?.id).toBe("b");
  });

  it("falls back to the first campaign when all weights are 0", () => {
    expect(pickWeighted([c({ weight: 0 }), c({ id: "z", weight: 0 })], 0.7)?.id).toBe("t");
  });
});
