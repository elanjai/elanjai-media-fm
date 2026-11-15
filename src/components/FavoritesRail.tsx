"use client";

import Link from "next/link";
import { useAudio } from "./AudioProvider";
import StationCard from "./StationCard";

/** Home-page favorites rail — renders only once the user has ≥1 saved station. */
export default function FavoritesRail() {
  const { favoriteStations } = useAudio();
  if (!favoriteStations.length) return null;

  return (
    <section aria-labelledby="favorites" className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2
          id="favorites"
          className="font-display text-[16.5px] font-semibold text-ink"
        >
          Favorites
        </h2>
        <Link
          href="/favorites"
          className="text-[11.5px] font-semibold text-brand-2 dark:text-accent"
        >
          See all →
        </Link>
      </div>
      <div className="rail -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {favoriteStations.map((s) => (
          <div key={s.id} className="w-[130px] shrink-0">
            <StationCard station={s} />
          </div>
        ))}
      </div>
    </section>
  );
}
