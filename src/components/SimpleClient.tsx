"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import {
  isBusyStatus,
  useCatalog,
  useLibrary,
  usePlayback,
  usePlaybackActions,
} from "./AudioProvider";
import EqBars from "./EqBars";
import Icon from "./Icon";
import { usePrefs } from "./PrefsProvider";
import StationLogo from "./StationLogo";

/**
 * Simple mode (F-1.12) — a giant one-tap surface for older listeners.
 * A caregiver opens `/simple?favs=slug1,slug2` on the senior's device once;
 * the link seeds those favorites, switches simple mode on, and the page
 * becomes a bookmarkable "radio with big buttons".
 */
export default function SimpleClient() {
  const params = useSearchParams();
  const router = useRouter();
  const { stations } = useCatalog();
  const { favoriteStations, addFavorites } = useLibrary();
  const { current, status } = usePlayback();
  const { play, toggle, stop } = usePlaybackActions();
  const { langs, setSimpleMode } = usePrefs();
  const seededRef = useRef(false);

  // One-time setup-link import: ?favs=slug1,slug2 → merge into favorites.
  const favParam = params.get("favs");
  useEffect(() => {
    if (seededRef.current || !stations?.length) return;
    seededRef.current = true;
    if (favParam) {
      const wanted = new Set(favParam.split(",").filter(Boolean));
      addFavorites(stations.filter((s) => wanted.has(s.slug)));
    }
    setSimpleMode(true);
  }, [stations, favParam, addFavorites, setSimpleMode]);

  // The grid: favorites if any, else the top stations in preferred languages.
  const grid = useMemo(() => {
    if (favoriteStations.length) return favoriteStations;
    const all = stations ?? [];
    const pref = langs?.length
      ? all.filter((s) => langs.includes(s.genre))
      : all;
    const pool = pref.length ? pref : all;
    return [...pool].sort((a, b) => b.votes - a.votes).slice(0, 12);
  }, [favoriteStations, stations, langs]);

  const playing = status === "playing";
  const busy = isBusyStatus(status);

  const exit = () => {
    setSimpleMode(false);
    router.push("/");
  };

  return (
    <div className="pt-4 pb-44">
      <div className="flex items-center justify-between">
        <p className="font-display text-xl font-semibold text-ink">My Radio</p>
        <button
          type="button"
          onClick={exit}
          className="rounded-full border border-border bg-surface px-4 py-2 text-[13px] font-semibold text-muted transition hover:text-ink"
        >
          Exit simple mode
        </button>
      </div>
      <p className="mt-1 text-[13px] text-muted">
        Tap a station to listen. Tap the big button to stop.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {grid.map((s) => {
          const isCurrent = current?.id === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => (isCurrent ? toggle() : play(s, grid))}
              aria-pressed={isCurrent}
              className={`flex flex-col items-center gap-2.5 rounded-[22px] border-2 p-4 transition active:scale-[0.97] ${
                isCurrent
                  ? "border-brand-2 bg-brand-2/10 dark:border-accent dark:bg-accent/10"
                  : "border-border bg-surface hover:border-brand-2/40"
              }`}
            >
              <StationLogo
                src={`/logos/${s.slug}.webp`}
                fallbackSrc={s.favicon}
                name={s.name}
                className="w-full max-w-[120px]"
              />
              <span className="w-full">
                <span className="block truncate text-center text-[15px] font-semibold text-ink">
                  {s.name}
                </span>
                {isCurrent && (
                  <span className="mt-1 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-brand-2 dark:text-accent">
                    {playing && <EqBars />}
                    {busy ? "Connecting…" : playing ? "Playing" : "Paused"}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Giant transport bar */}
      {current && (
        <div className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40">
          <div className="mx-auto flex max-w-md items-center gap-4 rounded-[26px] border border-border bg-surface p-4 shadow-2xl shadow-brand/15">
            <StationLogo
              src={`/logos/${current.slug}.webp`}
              fallbackSrc={current.favicon}
              name={current.name}
              className="h-14 w-14 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-bold text-ink">{current.name}</p>
              <p className="text-[13px] font-medium text-muted">
                {busy ? "Connecting…" : playing ? "Playing now" : "Paused"}
              </p>
            </div>
            <button
              type="button"
              onClick={playing ? stop : toggle}
              aria-label={playing ? "Stop" : "Play"}
              className={`flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full shadow-lg transition active:scale-95 ${
                playing
                  ? "bg-rose text-white"
                  : "bg-accent text-accent-ink"
              }`}
            >
              <Icon
                name={playing ? "stop" : "play"}
                size={32}
                className={playing ? "" : "translate-x-0.5"}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
