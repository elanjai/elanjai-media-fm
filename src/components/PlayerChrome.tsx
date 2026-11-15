"use client";

import { useState } from "react";
import { isBusyStatus, usePlayback, usePlaybackActions } from "./AudioProvider";
import EqBars from "./EqBars";
import Icon from "./Icon";
import NowPlayingSheet from "./NowPlayingSheet";
import StationLogo from "./StationLogo";

/** Floating mini player docked above the tab bar; expands into the Now Playing sheet. */
export default function PlayerChrome({ total }: { total: number }) {
  const { current, status, error, nowPlaying, retryAttempt } = usePlayback();
  const { toggle, next, play } = usePlaybackActions();
  const [open, setOpen] = useState(false);
  if (!current) return open ? <NowPlayingSheet total={total} onClose={() => setOpen(false)} /> : null;

  const playing = status === "playing";

  return (
    <>
      <div
        data-player-scope
        className="fixed inset-x-4 bottom-[calc(5.375rem+max(0.875rem,env(safe-area-inset-bottom)))] z-40 md:inset-x-auto md:bottom-6 md:right-6 md:w-[370px]"
      >
        <div className="mx-auto flex h-[68px] max-w-[370px] items-center gap-1 rounded-[22px] border border-border bg-surface px-2 shadow-xl shadow-brand/10">
          {/* Expand — single button owning logo + meta; no nested links */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Now playing: ${current.name} — expand player`}
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
                  error ?? "Stream unavailable — retry"
                ) : status === "reconnecting" ? (
                  `Reconnecting… (${retryAttempt}/3)`
                ) : status === "connecting" ? (
                  "Connecting…"
                ) : status === "buffering" ? (
                  "Buffering…"
                ) : playing ? (
                  <>
                    <EqBars />
                    <span className="truncate">{nowPlaying ?? "Live"}</span>
                  </>
                ) : (
                  "Paused"
                )}
              </span>
            </span>
            <Icon name="chevD" size={14} className="shrink-0 -rotate-180 text-muted" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next station"
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
            aria-label={playing ? "Pause" : "Play"}
            className="mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink shadow-md shadow-brand/25 transition hover:brightness-105 active:scale-95"
          >
            {isBusyStatus(status) ? (
              <span className="block h-[18px] w-[18px] animate-spin rounded-full border-2 border-accent-ink/30 border-t-accent-ink" />
            ) : (
              <Icon name={playing ? "pause" : "play"} size={18} />
            )}
          </button>
        </div>
        {isBusyStatus(status) && (
          <div className="mx-auto mt-1 h-0.5 max-w-[340px] overflow-hidden rounded-full bg-surface-2">
            <div className="h-full w-1/3 animate-pulse bg-accent" />
          </div>
        )}
      </div>
      {open && <NowPlayingSheet total={total} onClose={() => setOpen(false)} />}
    </>
  );
}
