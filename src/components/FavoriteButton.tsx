"use client";

import { useLibrary } from "./AudioProvider";
import Icon from "./Icon";
import { useT } from "./LocaleProvider";
import type { PublicStation } from "@/lib/types";

/** Bordered-circle favorite toggle (design action button). */
export default function FavoriteButton({
  station,
  size = 44,
  className = "",
}: {
  station: PublicStation;
  size?: number;
  className?: string;
}) {
  const t = useT();
  const { favorites, toggleFavorite } = useLibrary();
  const on = favorites.has(station.slug);
  return (
    <button
      type="button"
      onClick={() => toggleFavorite(station)}
      aria-pressed={on}
      aria-label={on ? t("favorites.remove") : t("favorites.add")}
      title={on ? t("favorites.remove") : t("favorites.add")}
      className={`flex items-center justify-center rounded-full border transition hover:border-rose/60 ${
        on
          ? "border-rose/40 bg-rose/10 text-rose"
          : "border-border bg-surface text-muted hover:text-rose"
      } ${className}`}
      style={{ width: size, height: size }}
    >
      <Icon name={on ? "heartF" : "heart"} size={size * 0.48} />
    </button>
  );
}
