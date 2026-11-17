"use client";

import { useLocalePath, useT } from "./LocaleProvider";
import { fmt } from "@/i18n/locales";
import { useState } from "react";
import type { Campaign } from "@/lib/ads";
import { isBusyStatus, usePlayback, usePlaybackActions } from "./AudioProvider";
import EqBars from "./EqBars";
import Icon from "./Icon";
import NowPlayingSheet from "./NowPlayingSheet";
import StationLogo from "./StationLogo";

/** Floating mini player docked above the tab bar; expands into the Now Playing sheet. */
export default function PlayerChrome({
  total,
  npAds = [],
}: {
  total: number;
  /** Eligible self-ad campaigns for the sheet's sponsored card (F-4.2). */
  npAds?: Campaign[];
}) {
  const { current, status, error, nowPlaying, retryAttempt, pendingPlay, preroll } =
    usePlayback();
  const { toggle, next, play, confirmPendingPlay, dismissPendingPlay } =
    usePlaybackActions();
  const [open, setOpen] = useState(false);
  const pathname = useLocalePath();
  const t = useT();
  // /simple has its own giant controls — the mini player would overlap them.
  if (pathname === "/simple") return null;
  if (!current && !pendingPlay)
    return open ? (
      <NowPlayingSheet total={total} npAds={npAds} onClose={() => setOpen(false)} />
    ) : null;

  const playing = status === "playing";

  return (
    <>
      <div
        data-player-scope
        className="fixed inset-x-4 bottom-[calc(5.375rem+max(0.875rem,env(safe-area-inset-bottom)))] z-40 md:inset-x-auto md:bottom-6 md:right-6 md:w-[370px]"
      >
        {/* Data-saver hold — confirm before starting a heavy stream */}
        {pendingPlay && (
          <div className="mx-auto mb-2 flex max-w-[370px] items-center gap-3 rounded-[18px] border border-border bg-surface px-3.5 py-3 shadow-xl shadow-brand/10">
            <Icon name="battery" size={20} className="shrink-0 text-brand-2 dark:text-accent" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-ink">
                {pendingPlay.station.name}
              </p>
              <p className="text-[11px] text-muted">
                {fmt(t("nowPlaying.dataSaverHold"), { rate: Math.round(pendingPlay.station.bitrate * 0.45) })}
              </p>
            </div>
            <button
              type="button"
              onClick={confirmPendingPlay}
              className="shrink-0 rounded-full bg-accent px-3.5 py-2 text-xs font-bold text-accent-ink transition hover:brightness-105"
            >
              {t("action.play")}
            </button>
            <button
              type="button"
              onClick={dismissPendingPlay}
              aria-label={t("action.cancel")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:text-ink"
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        )}
        {current && (
        <div className="mx-auto flex h-[68px] max-w-[370px] items-center gap-1 rounded-[22px] border border-border bg-surface px-2 shadow-xl shadow-brand/10">
          {/* Expand — single button owning logo + meta; no nested links */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={fmt(t("nowPlaying.expandPlayer"), { name: current.name })}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-1 py-1.5 text-left"
          >
            <StationLogo src={current.favicon} fallbackSrc={current.faviconAlt} name={current.name} size={44} className="h-11 w-11 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">
                {current.name}
              </span>
              <span
                className={`mt-0.5 flex items-center gap-1.5 truncate text-xs ${
                  status === "error" ? "text-danger" : "text-muted"
                }`}
              >
                {status === "error" ? (
                  error ? t(error) : t("errors.streamUnavailableRetry")
                ) : preroll ? (
                  t("nowPlaying.preroll")
                ) : status === "reconnecting" ? (
                  fmt(t("nowPlaying.reconnectingN"), { attempt: retryAttempt, max: 3 })
                ) : status === "connecting" ? (
                  t("player.connecting")
                ) : status === "buffering" ? (
                  t("player.buffering")
                ) : playing ? (
                  <>
                    <EqBars />
                    <span className="truncate">{nowPlaying ?? t("player.live")}</span>
                  </>
                ) : (
                  t("player.paused")
                )}
              </span>
            </span>
            <Icon name="chevD" size={14} className="shrink-0 -rotate-180 text-muted" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label={t("a11y.nextStation")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition hover:text-ink"
          >
            <Icon name="next" size={22} />
          </button>
          <button
            type="button"
            onClick={() => {
              if (status === "idle") play(current);
              else toggle();
            }}
            aria-label={playing ? t("action.pause") : t("action.play")}
            className="mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink shadow-md shadow-brand/25 transition hover:brightness-105 active:scale-95"
          >
            {isBusyStatus(status) ? (
              <span className="block h-[18px] w-[18px] animate-spin rounded-full border-2 border-accent-ink/30 border-t-accent-ink" />
            ) : (
              <Icon name={playing ? "pause" : "play"} size={18} />
            )}
          </button>
        </div>
        )}
        {isBusyStatus(status) && (
          <div className="mx-auto mt-1 h-0.5 max-w-[340px] overflow-hidden rounded-full bg-surface-2">
            <div className="h-full w-1/3 animate-pulse bg-accent" />
          </div>
        )}
      </div>
      {open && (
        <NowPlayingSheet total={total} npAds={npAds} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
