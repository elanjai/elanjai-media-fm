import { describe, expect, it } from "vitest";
import { markFired, shouldFire, type Alarm } from "./alarm";

const a: Alarm = { slug: "suryan-fm", hhmm: "06:30", firedDay: null };
const at = (h: number, m: number) => new Date(2025, 0, 10, h, m); // Jan 10, local

describe("shouldFire", () => {
  it("fires at the exact target time and inside the 15-minute window", () => {
    expect(shouldFire(a, at(6, 30))).toBe(true);
    expect(shouldFire(a, at(6, 44))).toBe(true);
  });

  it("does not fire before the target or once the window has passed", () => {
    expect(shouldFire(a, at(6, 29))).toBe(false);
    expect(shouldFire(a, at(6, 45))).toBe(false);
    expect(shouldFire(a, at(20, 0))).toBe(false);
  });

  it("does not fire twice on the same day", () => {
    const fired = { ...a, firedDay: "2025-01-10" };
    expect(shouldFire(fired, at(6, 31))).toBe(false);
    expect(markFired(a).firedDay).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("re-arms on a later day once yesterday's firedDay is recorded", () => {
    const armed = { ...a, firedDay: "2025-01-09" };
    expect(shouldFire(armed, at(6, 30))).toBe(true);
  });

  it("rejects malformed targets via the getter guard", () => {
    // hhmm validation lives in getAlarm; shouldFire itself stays strict
    // about the window either way.
    const noon = { ...a, hhmm: "12:00" };
    expect(shouldFire(noon, at(11, 59))).toBe(false);
    expect(shouldFire(noon, at(12, 0))).toBe(true);
  });
});
