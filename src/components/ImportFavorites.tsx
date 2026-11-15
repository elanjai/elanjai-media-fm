"use client";

import { useState } from "react";
import Link from "@/components/LangLink";
import type { PublicStation } from "@/lib/types";
import { useLibrary } from "./AudioProvider";
import StationLogo from "./StationLogo";

/** Import preview + confirm for the /f shared-favorites link (F-5.2). */
export default function ImportFavorites({
  stations,
}: {
  stations: PublicStation[];
}) {
  const { addFavorites } = useLibrary();
  const [done, setDone] = useState(false);

  return (
    <>
      <ul className="mt-4 space-y-2">
        {stations.map((s) => (
          <li
            key={s.id}
            className="flex items-center gap-3 rounded-[16px] border border-border bg-surface px-3 py-2.5"
          >
            <StationLogo
              src={s.favicon}
              fallbackSrc={s.faviconAlt}
              name={s.name}
              size={40}
              className="h-10 w-10 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{s.name}</p>
              <p className="truncate text-xs capitalize text-muted">{s.genre}</p>
            </div>
          </li>
        ))}
      </ul>

      {done ? (
        <div className="mt-5 rounded-2xl border border-brand-2/30 bg-brand-2/5 p-5 text-center">
          <p className="font-display text-sm font-semibold text-ink">
            Added to your favorites
          </p>
          <Link
            href="/favorites"
            className="mt-3 inline-flex items-center gap-1 rounded-full bg-accent px-5 py-2.5 text-sm font-bold text-accent-ink transition hover:brightness-105"
          >
            Open favorites →
          </Link>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            addFavorites(stations);
            setDone(true);
          }}
          className="mt-5 w-full rounded-full bg-accent px-6 py-3.5 text-sm font-bold text-accent-ink shadow-md shadow-brand/20 transition hover:brightness-105"
        >
          Add {stations.length} station{stations.length === 1 ? "" : "s"} to my favorites
        </button>
      )}
    </>
  );
}
