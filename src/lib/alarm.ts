/**
 * Wake-up alarm (F-5.5) — localStorage-persisted {slug, hhmm, firedDay}.
 * Pure time math lives here so it's unit-testable; the watcher lives in
 * AlarmWatcher. Honest scope: pure-PWA apps can't fire alarms in the
 * background — this works while the app/tab is open, and the UI says so.
 */
export type Alarm = {
  slug: string;
  /** "HH:MM" 24h. */
  hhmm: string;
  /** ISO day ("YYYY-MM-DD") the alarm last fired — at most once a day. */
  firedDay: string | null;
};

const KEY = "emfm:alarm";

export function getAlarm(): Alarm | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const a = JSON.parse(raw) as Alarm;
    return a?.slug && /^\d{2}:\d{2}$/.test(a.hhmm) ? a : null;
  } catch {
    return null;
  }
}

export const ALARM_EVENT = "emfm:alarm-changed";

export function setAlarm(a: Alarm | null) {
  try {
    if (a) localStorage.setItem(KEY, JSON.stringify(a));
    else localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent(ALARM_EVENT));
  } catch {
    /* storage denied */
  }
}

/** Local calendar day ("YYYY-MM-DD") — must match getHours/getMinutes math. */
function localDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** True when the clock has reached hh:mm today and it hasn't fired yet. */
export function shouldFire(a: Alarm, now: Date): boolean {
  const [h, m] = a.hhmm.split(":").map(Number);
  if (a.firedDay === localDay(now)) return false;
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const target = h * 60 + m;
  // Fire only inside a 15-min window after the target — an alarm that
  // fires hours late because the tab reopened is worse than none.
  return minutesNow >= target && minutesNow < target + 15;
}

export const markFired = (a: Alarm): Alarm => ({
  ...a,
  firedDay: localDay(new Date()),
});
