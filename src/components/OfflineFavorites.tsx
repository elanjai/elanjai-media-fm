"use client";

import { useEffect, useState } from "react";
import type { PublicStation } from "@/lib/types";
import StationLogo from "./StationLogo";
import { useT } from "./LocaleProvider";

type Saved = Pick<PublicStation, "slug" | "name" | "favicon" | "faviconAlt">;

/**
 * Offline dial — favorites + recents are stored locally, so even with no
 * connection the listener can see their stations (streams resume online).
 */
export default function OfflineFavorites() {
  const t = useT();
  const [list, setList] = useState<Saved[]>([]);

  useEffect(() => {
    try {
      const snaps = JSON.parse(
        localStorage.getItem("emfm:snaps") ?? "{}"
      ) as Record<string, Saved>;
      const favSlugs = JSON.parse(
        localStorage.getItem("emfm:favorites") ?? "[]"
      ) as string[];
      const recents = JSON.parse(
        localStorage.getItem("emfm:recents") ?? "[]"
      ) as (Saved | { slug: string })[];
      const seen = new Set<string>();
      const out: Saved[] = [];
      const push = (s?: Saved | null) => {
        if (s?.slug && s.name && !seen.has(s.slug)) {
          seen.add(s.slug);
          out.push(s);
        }
      };
      for (const slug of favSlugs) push(snaps[slug]);
      for (const r of recents) push("name" in r ? r : snaps[r.slug]);
      queueMicrotask(() => setList(out.slice(0, 20)));
    } catch {
      /* corrupt storage — show nothing */
    }
  }, []);

  if (!list.length) return null;
  return (
    <section className="mt-8 w-full max-w-md" aria-label={t("offline.favoritesTitle")}>
      <h2 className="text-center font-display text-[15px] font-semibold text-ink">
        {t("offline.favoritesTitle")}
      </h2>
      <p className="mt-1 text-center text-xs text-muted">
        {t("offline.favoritesHint")}
      </p>
      <ul className="mt-4 grid grid-cols-4 gap-3">
        {list.map((s) => (
          <li key={s.slug} className="flex min-w-0 flex-col items-center gap-1.5">
            <StationLogo
              src={s.favicon}
              fallbackSrc={s.faviconAlt}
              name={s.name}
              size={52}
              className="h-[52px] w-[52px] opacity-80 grayscale-[30%]"
            />
            <span className="w-full truncate text-center text-[10.5px] font-medium text-muted">
              {s.name}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
