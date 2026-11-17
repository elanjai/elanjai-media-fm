"use client";

import { useEffect, useState } from "react";
import { fmt } from "@/i18n/locales";
import { usePlayback } from "./AudioProvider";
import { useT } from "./LocaleProvider";

/**
 * Live listener badge (F-5.4) — polls /api/listeners and renders only
 * above a threshold so low numbers never embarrass a station. Counts
 * the current listener too while this device is playing the station.
 */
const THRESHOLD = 3;

const compact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : `${n}`;

export default function ListenerCount({
  slug,
  className = "",
}: {
  slug: string;
  className?: string;
}) {
  const { current, status } = usePlayback();
  const t = useT();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let stop = false;
    const poll = () =>
      fetch(`/api/listeners?slug=${encodeURIComponent(slug)}`)
        .then((r) => r.json())
        .then((d) => {
          if (!stop) setCount(Number(d.count) || 0);
        })
        .catch(() => {});
    poll();
    const iv = setInterval(poll, 60_000);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, [slug]);

  const total = count + (current?.slug === slug && status === "playing" ? 1 : 0);
  if (total < THRESHOLD) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
      </span>
      {fmt(t("common.listening"), { count: compact(total) })}
    </span>
  );
}
