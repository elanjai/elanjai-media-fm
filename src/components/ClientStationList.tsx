"use client";

import { useEffect, useState } from "react";
import { fmt } from "@/i18n/locales";
import { useLibrary } from "./AudioProvider";
import Icon from "./Icon";
import { useT } from "./LocaleProvider";
import StationRow from "./StationRow";

/** Renders stations stored client-side (favorites map / recents). */
export default function ClientStationList({ kind }: { kind: "favorites" | "recents" }) {
  const { favoriteStations, recents, clearRecents } = useLibrary();
  const t = useT();
  const list = kind === "favorites" ? favoriteStations : recents;
  // Relative-time base — captured once after mount, not during render.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    queueMicrotask(() => setNow(Date.now()));
  }, []);

  const relTime = (at?: number): string | null => {
    if (!at || !now) return null;
    const m = Math.floor((now - at) / 60000);
    if (m < 1) return t("recent.now");
    if (m < 60) return fmt(t("recent.minsAgo"), { count: m });
    const h = Math.floor(m / 60);
    if (h < 24) return fmt(t("recent.hoursAgo"), { count: h });
    const d = Math.floor(h / 24);
    return d <= 1 ? t("recent.yesterday") : fmt(t("recent.daysAgo"), { count: d });
  };

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-[22px] border border-dashed border-border bg-surface px-6 py-12 text-center">
        <Icon
          name={kind === "favorites" ? "heart" : "clock"}
          size={34}
          strokeWidth={1.6}
          className="text-muted"
        />
        <p className="mt-4 font-display text-sm font-semibold text-ink">
          {t(kind === "favorites" ? "favorites.emptyTitle" : "recent.emptyTitle")}
        </p>
        <p className="mt-1.5 text-xs text-muted">
          {t(kind === "favorites" ? "favorites.emptyHint" : "recent.emptyHint")}
        </p>
      </div>
    );
  }
  return (
    <div>
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
        {list.map((s) => (
          <StationRow
            key={s.id}
            station={s}
            queue={list}
            trailing={
              kind === "recents" && relTime(s.playedAt) ? (
                <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted">
                  <Icon name="clock" size={13} strokeWidth={1.8} />
                  {relTime(s.playedAt)}
                </span>
              ) : kind === "favorites" ? (
                <Icon name="heartF" size={18} className="shrink-0 text-rose" />
              ) : undefined
            }
          />
        ))}
      </div>
      {kind === "favorites" ? (
        <div className="mt-4 flex items-center gap-3 rounded-[18px] bg-accent-soft px-4 py-3.5">
          <Icon name="heart" size={20} className="shrink-0 text-accent-soft-ink" />
          <div>
            <p className="text-[12px] font-medium text-accent-soft-ink">
              {t("favorites.empty")}
            </p>
            <p className="mt-0.5 text-[11px] text-accent-soft-ink/70">
              {t("favorites.deviceNote")}
            </p>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            if (window.confirm(t("recent.clearConfirm"))) clearRecents();
          }}
          className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-[14px] bg-surface-2 py-3 text-[13px] font-semibold text-muted transition hover:text-ink"
        >
          <Icon name="x" size={15} /> {t("recent.clear")}
        </button>
      )}
    </div>
  );
}
