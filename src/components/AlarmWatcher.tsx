"use client";

import { useEffect } from "react";
import { getAlarm, markFired, setAlarm, shouldFire } from "@/lib/alarm";
import { useCatalog, usePlaybackActions } from "./AudioProvider";

/**
 * F-5.5 — checks the stored alarm every 15 s while the app is open and
 * starts the station when it's due. Deliberately app-open-only: a PWA
 * can't schedule background wakeups, and the sheet copy says so.
 */
export default function AlarmWatcher() {
  const { play } = usePlaybackActions();
  const { stations } = useCatalog();

  useEffect(() => {
    const tick = () => {
      const a = getAlarm();
      if (!a || !shouldFire(a, new Date())) return;
      setAlarm(markFired(a)); // mark before playing — a failed stream must not refire
      const s = stations?.find((x) => x.slug === a.slug);
      if (s) play(s);
      else {
        // Catalog not loaded yet — fetch once, then play if still wanted.
        fetch("/api/stations")
          .then((r) => r.json())
          .then((d) => {
            const hit = (d.stations ?? []).find(
              (x: { slug: string }) => x.slug === a.slug
            );
            if (hit) play(hit);
          })
          .catch(() => {});
      }
    };
    tick();
    const iv = setInterval(tick, 15_000);
    return () => clearInterval(iv);
  }, [play, stations]);

  return null;
}
