import { describe, expect, it } from "vitest";
import { monthSeconds, topStations, type StatsData } from "./stats";

const base: StatsData = {
  totalSec: 1000,
  sessions: 4,
  byStation: {
    "a-radio": { sec: 600, last: "2025-08-10" },
    "b-radio": { sec: 300, last: "2025-08-11" },
    "c-radio": { sec: 100, last: "2025-07-01" },
  },
  byDay: {
    "2025-08-10": 400,
    "2025-08-11": 200,
    "2025-07-01": 300,
    "2025-07-31": 100,
  },
};

describe("stats aggregation", () => {
  it("sums only the requested local month", () => {
    expect(monthSeconds(base, 2025, 7)).toBe(600); // August (0-based)
    expect(monthSeconds(base, 2025, 6)).toBe(400); // July
    expect(monthSeconds(base, 2025, 8)).toBe(0); // September — none yet
    // A same-prefix day from a different year must not leak in.
    expect(
      monthSeconds({ ...base, byDay: { "2024-08-10": 999 } }, 2025, 7)
    ).toBe(0);
  });

  it("orders top stations by seconds and slices", () => {
    expect(topStations(base).map((t) => t.slug)).toEqual([
      "a-radio",
      "b-radio",
      "c-radio",
    ]);
    expect(topStations(base, 2)).toHaveLength(2);
    expect(topStations(base)[0].sec).toBe(600);
  });
});
