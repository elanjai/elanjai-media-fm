"use client";

import Link from "@/components/LangLink";
import { useEffect, useState } from "react";
import { fmt } from "@/i18n/locales";
import { getStats, topStations } from "@/lib/stats";
import { useCatalog } from "./AudioProvider";
import Icon from "./Icon";
import { useT } from "./LocaleProvider";

/**
 * "Your week in radio" — a small recap card for returning listeners.
 * Renders only after the listener has logged ≥10 minutes in the last 7 days.
 */
export default function WeekCard() {
  const t = useT();
  const { stations } = useCatalog();
  const [recap, setRecap] = useState<{ hours: number; name: string } | null>(null);

  useEffect(() => {
    const s = getStats();
    const days = Object.keys(s.byDay)
      .filter((d) => {
        const diff =
          (Date.now() - new Date(`${d}T00:00:00`).getTime()) / 86400000;
        return diff >= 0 && diff < 7;
      });
    const sec = days.reduce((sum, d) => sum + (s.byDay[d] ?? 0), 0);
    if (sec < 600 || !stations) return;
    const top = topStations(s, 1)[0];
    const name =
      stations.find((x) => x.slug === top?.slug)?.name ?? top?.slug;
    if (name) queueMicrotask(() => setRecap({ hours: sec / 3600, name }));
  }, [stations]);

  if (!recap) return null;
  return (
    <section className="mt-8" aria-label={t("stats.weekTitle")}>
      <Link
        href="/stats"
        className="flex items-center gap-3.5 rounded-[18px] border border-border bg-surface px-4 py-3.5 no-underline transition hover:border-brand-2/50"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-2/10 text-brand-2 dark:text-accent">
          <Icon name="eq" size={20} strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-bold text-ink">
            {t("stats.weekTitle")}
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted">
            {fmt(t("stats.weekLine"), {
              hours:
                recap.hours < 10
                  ? recap.hours.toFixed(1)
                  : Math.round(recap.hours),
              name: recap.name,
            })}
          </span>
        </span>
        <span className="shrink-0 text-xs font-semibold text-brand-2 dark:text-accent">
          {t("stats.weekCta")}
        </span>
      </Link>
    </section>
  );
}
