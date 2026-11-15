"use client";

import { useRef, useState } from "react";

/**
 * Self-contained iframe player for /embed/<slug> (F-3.5).
 * Streams come straight from the broadcaster — never through /api/stream —
 * so embedded listens cost us no bandwidth. Streams the browser can't play
 * (http mixed-content, CORS-blocked HLS) collapse to the fallback state.
 */
type Status = "idle" | "loading" | "playing" | "error";

export default function EmbedPlayer({
  name,
  sub,
  logo,
  stationUrl,
  streamUrl,
  hls,
}: {
  name: string;
  sub: string;
  logo: string;
  stationUrl: string;
  streamUrl: string;
  hls: boolean;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);

  const teardown = () => {
    hlsRef.current?.destroy();
    hlsRef.current = null;
    audioRef.current?.pause();
  };

  const play = async () => {
    if (status === "playing") {
      teardown();
      setStatus("idle");
      return;
    }
    setStatus("loading");
    try {
      let audio = audioRef.current;
      if (!audio) {
        audio = new Audio();
        audio.preload = "none";
        audio.addEventListener("playing", () => setStatus("playing"));
        audio.addEventListener("error", () => {
          teardown();
          setStatus("error");
        });
        audioRef.current = audio;
      }
      const needsHls = hls && !audio.canPlayType("application/vnd.apple.mpegurl");
      if (needsHls) {
        const { default: Hls } = await import("hls.js");
        if (!Hls.isSupported()) throw new Error("no hls");
        const h = new Hls({ maxBufferLength: 20 });
        hlsRef.current = h;
        h.on(Hls.Events.ERROR, (_e, d) => {
          if (d.fatal) {
            teardown();
            setStatus("error");
          }
        });
        h.loadSource(streamUrl);
        h.attachMedia(audio);
      } else if (audio.src !== streamUrl) {
        audio.src = streamUrl;
      }
      await audio.play();
      setStatus("playing");
    } catch {
      teardown();
      setStatus("error");
    }
  };

  if (status === "error") {
    return (
      <a
        href={stationUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-full w-full items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 text-ink no-underline"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold">{name}</span>
          <span className="block truncate text-xs text-muted">
            Stream opens on Elanjai FM
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-[#07130c]">
          Play ↗
        </span>
      </a>
    );
  }

  return (
    <div className="flex h-full w-full items-center gap-3 rounded-2xl border border-border bg-surface px-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo}
        alt=""
        width={44}
        height={44}
        className="h-11 w-11 shrink-0 rounded-xl object-cover"
        onError={(e) => (e.currentTarget.style.display = "none")}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {status === "playing" && (
            <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-[#e03131]" />
          )}
          <span className="truncate text-sm font-bold text-ink">{name}</span>
        </div>
        <a
          href={stationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-xs text-muted no-underline hover:text-ink"
        >
          {sub} · Powered by Elanjai FM
        </a>
      </div>
      <button
        type="button"
        onClick={play}
        disabled={status === "loading"}
        aria-label={status === "playing" ? "Pause" : "Play"}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-brand-ink transition hover:brightness-110 disabled:opacity-60"
      >
        {status === "loading" ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-ink/30 border-t-brand-ink" />
        ) : status === "playing" ? (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
            <path d="M7.9 4.5h1.2a1.4 1.4 0 0 1 1.4 1.4v12.2a1.4 1.4 0 0 1-1.4 1.4H7.9a1.4 1.4 0 0 1-1.4-1.4V5.9a1.4 1.4 0 0 1 1.4-1.4zM14.9 4.5h1.2a1.4 1.4 0 0 1 1.4 1.4v12.2a1.4 1.4 0 0 1-1.4 1.4h-1.2a1.4 1.4 0 0 1-1.4-1.4V5.9a1.4 1.4 0 0 1 1.4-1.4z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
            <path d="M5.74 5.51v13c0 .9 1 1.5 1.8 1l10.2-6.5c.7-.4.7-1.6 0-2L7.54 4.51c-.8-.5-1.8 0-1.8 1z" />
          </svg>
        )}
      </button>
    </div>
  );
}
