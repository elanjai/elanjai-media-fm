import schedulesJson from "../../data/schedules.json";

/**
 * Programme schedules (F-2.8). Broadcast-clock slots in the station's own
 * timezone ("HH:MM"); `end` earlier than `start` means the slot spans
 * midnight. `approx` marks generic dayparts vs verified programme grids —
 * the UI labels them "typical broadcast day" instead of a firm schedule.
 */
export type ScheduleSlot = { start: string; end: string; title: string };
export type StationSchedule = {
  timezone: string;
  approx?: boolean;
  slots: ScheduleSlot[];
};

const schedules = schedulesJson as unknown as Record<string, StationSchedule>;

export const getSchedule = (slug: string): StationSchedule | null =>
  schedules[slug] ?? null;

/** "HH:MM" in the schedule's timezone at the given instant. */
export function timeInZone(tz: string, at: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("hour")}:${get("minute")}`;
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Slot covering `nowMin` (minutes since midnight, schedule tz). */
export function currentSlot(
  slots: ScheduleSlot[],
  nowMin: number
): { slot: ScheduleSlot; index: number } | null {
  for (let i = 0; i < slots.length; i++) {
    const s = toMin(slots[i].start);
    const e = toMin(slots[i].end);
    if (e > s ? nowMin >= s && nowMin < e : nowMin >= s || nowMin < e) {
      return { slot: slots[i], index: i };
    }
  }
  return null;
}
