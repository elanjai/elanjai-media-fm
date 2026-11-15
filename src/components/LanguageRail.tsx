"use client";

import Link from "@/components/LangLink";
import { useMemo } from "react";
import type { Genre } from "@/lib/types";
import { genreStyle } from "@/lib/genre-style";
import { orderByLangs } from "@/lib/languages";
import { usePrefs } from "./PrefsProvider";

/**
 * Language chip rail — renders in server order while prefs are unknown
 * (langs is null through SSR + first client render), then re-sorts so the
 * listener's chosen languages lead.
 */
export default function LanguageRail({ genres }: { genres: Genre[] }) {
  const { langs } = usePrefs();
  const ordered = useMemo(
    () => (langs?.length ? orderByLangs(genres, langs) : genres),
    [genres, langs]
  );

  return (
    <div className="rail -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
      {ordered.map((g) => {
        const st = genreStyle(g.slug);
        return (
          <Link
            key={g.slug}
            href={`/genre/${g.slug}`}
            className="flex shrink-0 items-center gap-2 rounded-full py-2 pl-2.5 pr-4 transition hover:brightness-95"
            style={{ backgroundColor: st.bg }}
          >
            <span
              className="flex h-[22px] w-[22px] items-center justify-center rounded-full font-display text-[11px] font-bold text-white"
              style={{ backgroundColor: st.fg }}
            >
              {st.short[0]}
            </span>
            <span className="text-[13px] font-semibold" style={{ color: st.fg }}>
              {g.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
