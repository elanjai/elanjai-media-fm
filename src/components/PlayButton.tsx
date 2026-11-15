"use client";

import { isBusyStatus, usePlayback, usePlaybackActions } from "./AudioProvider";
import Icon from "./Icon";
import type { PublicStation } from "@/lib/types";

export default function PlayButton({
  station,
  queue,
  size = 44,
  className = "",
}: {
  station: PublicStation;
  /** List this play was launched from — becomes the next/prev queue. */
  queue?: PublicStation[];
  size?: number;
  className?: string;
}) {
  const { current, status } = usePlayback();
  const { play, toggle } = usePlaybackActions();
  const isCurrent = current?.id === station.id;
  const playing = isCurrent && status === "playing";
  const loading = isCurrent && isBusyStatus(status);

  return (
    <button
      type="button"
      aria-label={playing ? `Pause ${station.name}` : `Play ${station.name}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isCurrent) toggle();
        else play(station, queue);
      }}
      className={`flex items-center justify-center rounded-full bg-accent text-accent-ink shadow-md shadow-brand/25 transition hover:scale-105 hover:brightness-105 active:scale-95 ${size < 44 ? "hit-expand " : ""}${className}`}
      style={{ width: size, height: size }}
    >
      {loading ? (
        <span
          className="block animate-spin rounded-full border-2 border-accent-ink/30 border-t-accent-ink"
          style={{ width: size * 0.45, height: size * 0.45 }}
        />
      ) : (
        <Icon name={playing ? "pause" : "play"} size={size * 0.45} />
      )}
    </button>
  );
}
