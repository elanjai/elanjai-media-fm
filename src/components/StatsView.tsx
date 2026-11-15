"use client";

import { useEffect, useState } from "react";
import {
  getStats,
  monthSeconds,
  resetStats,
  topStations,
  type StatsData,
} from "@/lib/stats";
import { useCatalog } from "./AudioProvider";
import StationLogo from "./StationLogo";
import LangLink from "@/components/LangLink";

function fmtTime(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** F-5.7 — renders localStorage stats; local-only, never beaconed. */
export default function StatsView() {
  const { stations } = useCatalog();
  const [stats, setStats] = useState<StatsData | null>(null);

  useEffect(() => {
    const load = () => setStats(getStats());
    queueMicrotask(load);
    const onStorage = (e: StorageEvent) => {
      if (e.key === "emfm:stats") load();
    };
    window.addEventListener("storage", onStorage);
    // Same-tab writes don't fire "storage" — refresh on focus instead.
    window.addEventListener("focus", load);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", load);
    };
  }, []);

  if (!stats) return null;
  const now = new Date();
  const month = monthSeconds(stats, now.getFullYear(), now.getMonth());
  const monthName = now.toLocaleString(undefined, { month: "long" });
  const top = topStations(stats, 5);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const pad = (n: number) => String(n).padStart(2, "0");
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return { key, sec: stats.byDay[key] ?? 0, label: d.toLocaleString(undefined, { weekday: "short" }) };
  });
  const maxDay = Math.max(...week.map((d) => d.sec), 1);
  const nameOf = (slug: string) =>
    stations?.find((s) => s.slug === slug)?.name ?? slug;

  if (stats.totalSec === 0)
    return (
      <p className="mt-6 rounded-2xl border border-dashed border-border bg-surface p-5 text-sm text-muted">
        Nothing here yet — press play and your listening time will start
        counting up on this page.
      </p>
    );

  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-3 gap-3">
        {[
          ["All time", fmtTime(stats.totalSec)],
          [monthName, fmtTime(month)],
          ["Sessions", String(stats.sessions)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-border bg-surface p-4 text-center"
          >
            <p className="font-display text-lg font-extrabold text-ink">{value}</p>
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
              {label}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Last 7 days
        </p>
        <div className="mt-3 flex items-end justify-between gap-2">
          {week.map((d) => (
            <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full max-w-8 rounded-t-md bg-brand-2/80 dark:bg-accent/80"
                style={{ height: `${Math.max(4, Math.round((d.sec / maxDay) * 64))}px` }}
                title={`${d.label}: ${fmtTime(d.sec)}`}
              />
              <span className="text-[10px] text-muted">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {top.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Top stations
          </p>
          <ul className="mt-2 divide-y divide-border">
            {top.map((t) => {
              const st = stations?.find((s) => s.slug === t.slug);
              return (
                <li key={t.slug}>
                  <LangLink
                    href={`/station/${t.slug}`}
                    className="flex items-center gap-3 py-2.5 transition hover:opacity-80"
                  >
                    <StationLogo
                      src={st?.favicon ?? ""}
                      name={st?.name ?? t.slug}
                      size={36}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                      {nameOf(t.slug)}
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-muted">
                      {fmtTime(t.sec)}
                    </span>
                  </LangLink>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          resetStats();
          setStats(getStats());
        }}
        className="text-xs font-medium text-muted underline underline-offset-2 transition hover:text-danger"
      >
        Reset all stats on this device
      </button>
    </div>
  );
}
