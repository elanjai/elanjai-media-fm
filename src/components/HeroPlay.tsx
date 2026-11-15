"use client";

import { useMemo } from "react";
import type { PublicStation } from "@/lib/types";
import { useLibrary } from "./AudioProvider";
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
  const { recents } = useLibrary();
  const { langs } = usePrefs();

  const { station, queue, label } = useMemo(() => {
    if (recents.length) {
      return {
        station: recents[0],
        queue: recents,
        label: "Continue listening",
      };
    }
    if (langs?.length) {
      const hit = flagships.find((f) => f.slug === langs[0]);
      if (hit) {
        return {
          station: hit.station,
          queue: [hit.station],
          label: "Start with",
        };
      }
    }
    return { station: fallback, queue: [fallback], label: "Start with" };
  }, [recents, langs, flagships, fallback]);

  return (
    <div className="relative mt-4 flex items-center gap-3">
      <PlayButton station={station} queue={queue} size={52} />
      <span className="text-xs font-medium text-brand-ink/70">
        {label} {station.name}
      </span>
    </div>
  );
}
