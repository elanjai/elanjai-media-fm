"use client";

import Link from "@/components/LangLink";
import { useLibrary } from "./AudioProvider";
import { useGenreName, useT } from "./LocaleProvider";
import StationCard from "./StationCard";

/** Home-page recents rail — renders once the listener has played ≥1 station. */
export default function RecentsRail() {
  const t = useT();
  const gn = useGenreName();
  const { recents } = useLibrary();
  if (!recents.length) return null;

  const queue = recents.slice(0, 10);
  return (
    <section aria-labelledby="recents" className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 id="recents" className="font-display text-[16.5px] font-semibold text-ink">
          {t("recent.title")}
        </h2>
        <Link
          href="/recent"
          className="text-xs font-semibold text-brand-2 dark:text-accent"
        >
          {t("home.seeAll")}
        </Link>
      </div>
      <div className="rail -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {queue.map((s) => (
          <div key={s.id} className="w-[130px] shrink-0">
            <StationCard station={s} queue={queue} genreLabel={gn(s.genre)} />
          </div>
        ))}
      </div>
    </section>
  );
}
