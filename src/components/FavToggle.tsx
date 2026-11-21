"use client";

import type { PublicStation } from "@/lib/types";
import { useLibrary } from "./AudioProvider";
import Icon from "./Icon";
import { useT } from "./LocaleProvider";

/**
 * One-tap heart toggle for station cards/rows and the mini player —
 * quiet outline that fills rose when saved. `hit-expand` keeps a 44×44
 * tap zone around the compact visual.
 */
export default function FavToggle({
  station,
  size = 30,
  surface = "unknown",
  className = "",
}: {
  station: PublicStation;
  /** Visual button box; hit-expand keeps the real tap zone ≥ 44px. */
  size?: number;
  /** Analytics surface label ("card", "row", "mini", ...). */
  surface?: string;
  className?: string;
}) {
  const t = useT();
  const { favorites, toggleFavorite } = useLibrary();
  const on = favorites.has(station.slug);
  return (
    <button
      type="button"
      onClick={() => toggleFavorite(station, surface)}
      aria-pressed={on}
      aria-label={on ? t("favorites.remove") : t("favorites.add")}
      title={on ? t("favorites.remove") : t("favorites.add")}
      style={{ width: size, height: size }}
      className={`hit-expand flex shrink-0 items-center justify-center rounded-full transition active:scale-90 ${
        on ? "text-rose" : "text-muted hover:text-rose"
      } ${className}`}
    >
      <Icon name={on ? "heartF" : "heart"} size={Math.round(size * 0.55)} />
    </button>
  );
}
