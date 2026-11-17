"use client";

import type { PublicStation } from "@/lib/types";
import { usePlayback } from "./AudioProvider";
import EqBars from "./EqBars";
import Icon from "./Icon";
import { useT } from "./LocaleProvider";

/** "Now playing · via ICY metadata" card on the station page. */
export default function NowPlayingCard({ station }: { station: PublicStation }) {
  const { current, status, nowPlaying } = usePlayback();
  const t = useT();
  const isCurrent = current?.id === station.id;
  const playing = isCurrent && status === "playing";

  return (
    <div className="flex items-center gap-3.5 rounded-[18px] border border-border bg-surface px-4 py-3.5">
      <Icon name="eq" size={24} className="shrink-0 text-brand-2 dark:text-accent" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          {t("player.nowPlaying")}
        </p>
        <p className="mt-0.5 truncate text-[13px] font-semibold text-ink">
          {isCurrent
            ? status === "error"
              ? t("errors.streamUnavailableRetry")
              : status === "connecting" || status === "reconnecting"
                ? t("player.connecting")
                : status === "buffering"
                  ? t("player.buffering")
                  : playing
                  ? (nowPlaying ?? t("player.live"))
                  : t("player.paused")
            : t("nowPlaying.tapToHear")}
        </p>
      </div>
      {playing && <EqBars />}
    </div>
  );
}
