"use client";

import { useMemo } from "react";
import type { PublicStation } from "@/lib/types";
import { fmt } from "@/i18n/locales";
import { useLibrary } from "./AudioProvider";
import { useT } from "./LocaleProvider";
import { usePrefs } from "./PrefsProvider";
import PlayButton from "./PlayButton";

/**
 * Personal hero prompt (F-1.4):
 *  - returning listener → "Continue listening" on their last station
 *  - new listener who picked languages → flagship of their first language
 *  - everyone else → the server's featured pick
 * Renders the fallback until library/prefs hydrate (no mismatch).
 */
export default function HeroPlay({
  fallback,
  flagships,
}: {
  fallback: PublicStation;
  /** genre slug → flagship station, for the language-picker landing. */
  flagships: { slug: string; station: PublicStation }[];
}) {
  const t = useT();
  const { recents } = useLibrary();
  const { langs } = usePrefs();

  const { station, queue, labelKey } = useMemo(() => {
    if (recents.length) {
      return {
        station: recents[0],
        queue: recents,
        labelKey: "hero.continueName",
      };
    }
    if (langs?.length) {
      const hit = flagships.find((f) => f.slug === langs[0]);
      if (hit) {
        return {
          station: hit.station,
          queue: [hit.station],
          labelKey: "hero.startWithName",
        };
      }
    }
    return { station: fallback, queue: [fallback], labelKey: "hero.startWithName" };
  }, [recents, langs, flagships, fallback]);

  return (
    <div className="relative mt-4 flex items-center gap-3">
      <PlayButton station={station} queue={queue} size={52} />
      <span className="text-xs font-medium text-brand-ink/70">
        {fmt(t(labelKey), { name: station.name })}
      </span>
    </div>
  );
}
