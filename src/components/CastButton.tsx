"use client";

import { useEffect, useState } from "react";
import { usePlayback, usePlaybackActions } from "./AudioProvider";
import Icon from "./Icon";

type RemoteCapableAudio = HTMLAudioElement & {
  remote?: { prompt: () => Promise<void> };
  webkitShowPlaybackTargetPicker?: () => void;
};

/**
 * Cast / AirPlay button (F-1.10) — Chrome shows the Remote Playback picker,
 * Safari shows the AirPlay target picker. Hidden where neither exists.
 * Proxied srcs resolve to absolute same-origin URLs that cast devices can
 * reach; direct streams hand the broadcaster's URL to the device.
 */
export default function CastButton() {
  const { current } = usePlayback();
  const { getAudioEl } = usePlaybackActions();
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const audio = getAudioEl() as RemoteCapableAudio | null;
      setSupported(
        !!audio && (!!audio.remote || !!audio.webkitShowPlaybackTargetPicker)
      );
    });
  }, [getAudioEl, current]);

  if (!supported || !current) return null;

  const open = () => {
    const audio = getAudioEl() as RemoteCapableAudio | null;
    if (!audio) return;
    if (audio.webkitShowPlaybackTargetPicker) {
      audio.webkitShowPlaybackTargetPicker();
    } else {
      audio.remote?.prompt().catch(() => {
        /* user dismissed the picker */
      });
    }
  };

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Cast to a device"
      title="Cast"
      className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-muted transition hover:text-ink"
    >
      <Icon name="cast" size={19} strokeWidth={1.8} />
    </button>
  );
}
