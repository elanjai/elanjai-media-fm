"use client";

import { useEffect, useMemo, useState } from "react";
import { fmt } from "@/i18n/locales";
import type { StationSchedule } from "@/lib/schedule";
import { currentSlot, timeInZone } from "@/lib/schedule";
import Icon from "./Icon";
import { useT } from "./LocaleProvider";

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/**
 * "On now / up next" programme card (F-2.8). Page HTML is statically
 * generated, so the broadcast clock runs client-side in the station's
 * own timezone — correct wherever the listener is.
 */
export default function ScheduleCard({
  stationName,
  schedule,
}: {
  stationName: string;
  schedule: StationSchedule;
}) {
  const t = useT();
  const [nowMin, setNowMin] = useState(() => {
    const hhmm = timeInZone(schedule.timezone, new Date());
    return toMin(hhmm);
  });

  useEffect(() => {
    const tick = () => setNowMin(toMin(timeInZone(schedule.timezone, new Date())));
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [schedule.timezone]);

  const cur = useMemo(
    () => currentSlot(schedule.slots, nowMin),
    [schedule.slots, nowMin]
  );
  const upNext = useMemo(() => {
    if (!cur) return [];
    const out: { slot: (typeof schedule.slots)[number]; when: string }[] = [];
    const n = schedule.slots.length;
    for (let k = 1; k <= Math.min(3, n - 1); k++) {
      const slot = schedule.slots[(cur.index + k) % n];
      out.push({ slot, when: slot.start });
    }
    return out;
  }, [cur, schedule]);

  return (
    <section aria-labelledby="schedule" className="mt-8">
      <div className="flex items-baseline justify-between">
        <h2 id="schedule" className="font-display text-[16.5px] font-semibold text-ink">
          {t("schedule.title")}
        </h2>
        {schedule.approx && (
          <span className="text-[11px] text-muted">{t("schedule.approx")}</span>
        )}
      </div>
      <div className="mt-3 rounded-[18px] border border-border bg-surface px-4 py-3.5">
        <div className="flex items-center gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-2/10 text-brand-2 dark:text-accent">
            <Icon name="radio" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              {t("schedule.onNow")}
            </p>
            <p className="mt-0.5 truncate text-[14px] font-semibold text-ink">
              {cur ? cur.slot.title : fmt(t("schedule.liveOn"), { name: stationName })}
            </p>
          </div>
          <span
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-red-600 dark:text-red-400"
            aria-hidden
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {t("player.live")}
          </span>
        </div>
        {upNext.length > 0 && (
          <ul className="mt-3 space-y-1.5 border-t border-border pt-3">
            {upNext.map((u) => (
              <li
                key={`${u.slot.start}-${u.slot.title}`}
                className="flex items-baseline gap-3 text-[13px]"
              >
                <span className="w-12 shrink-0 font-semibold tabular-nums text-muted">
                  {u.when}
                </span>
                <span className="truncate text-ink">{u.slot.title}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[11px] text-muted">
          {fmt(t("schedule.allTimes"), { tz: schedule.timezone.replace("_", " ") })}
          {schedule.approx ? ` · ${t("schedule.timesApprox")}` : ""}
        </p>
      </div>
    </section>
  );
}
