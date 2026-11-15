import { describe, expect, it } from "vitest";
import { currentSlot, getSchedule, timeInZone } from "./schedule";

const slots = [
  { start: "06:00", "end": "12:00", title: "Morning" },
  { start: "12:00", "end": "22:00", title: "Day" },
  { start: "22:00", "end": "06:00", title: "Night" },
];

describe("currentSlot", () => {
  it("finds the daytime slot", () => {
    expect(currentSlot(slots, 7 * 60)?.slot.title).toBe("Morning");
    expect(currentSlot(slots, 13 * 60)?.slot.title).toBe("Day");
  });
  it("handles slots that wrap midnight", () => {
    expect(currentSlot(slots, 23 * 60)?.slot.title).toBe("Night");
    expect(currentSlot(slots, 2 * 60)?.slot.title).toBe("Night");
    expect(currentSlot(slots, 0)?.slot.title).toBe("Night");
  });
  it("returns null when nothing covers the time", () => {
    expect(
      currentSlot([{ start: "06:00", end: "07:00", title: "x" }], 8 * 60)
    ).toBeNull();
  });
  it("boundary lands in the later slot", () => {
    expect(currentSlot(slots, 12 * 60)?.slot.title).toBe("Day");
  });
});

describe("timeInZone", () => {
  it("formats HH:MM in the given zone", () => {
    const at = new Date("2025-01-15T12:00:00Z");
    expect(timeInZone("Asia/Kolkata", at)).toBe("17:30");
  });
});

describe("getSchedule", () => {
  it("returns a schedule for a covered station and null otherwise", () => {
    expect(getSchedule("vividh-bharti-mumbai")?.slots.length).toBeGreaterThan(0);
    expect(getSchedule("not-a-station")).toBeNull();
  });
});
