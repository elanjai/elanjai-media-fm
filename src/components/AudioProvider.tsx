"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PublicStation } from "@/lib/types";

type Status = "idle" | "loading" | "playing" | "paused" | "error";

/**
 * Split contexts so components only re-render for the slices they use:
 *  - PlaybackState:   current/status/error/nowPlaying/volume/muted
 *  - PlaybackActions: stable callbacks (play/toggle/next/…)
 *  - Library:         favorites + recents
 *  - SleepTimer:      sleepRemaining ticks once a second — isolated so the
 *                     whole app doesn't re-render every tick.
 */

type PlaybackState = {
  current: PublicStation | null;
  status: Status;
  error: string | null;
  nowPlaying: string | null;
  volume: number;
  muted: boolean;
};

type PlaybackActions = {
  play: (s: PublicStation) => void;
  toggle: () => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
  peekNext: () => Promise<PublicStation | null>;
  setVolume: (v: number) => void;
  toggleMute: () => void;
};

type Library = {
  /** Slugs of favorited stations. */
  favorites: Set<string>;
  toggleFavorite: (station: PublicStation) => void;
  favoriteStations: PublicStation[];
  recents: PublicStation[];
  clearRecents: () => void;
};

type SleepTimer = {
  sleepRemaining: number | null; // seconds until auto-stop
  setSleepTimer: (minutes: number | null) => void;
};

const PlaybackStateCtx = createContext<PlaybackState | null>(null);
const PlaybackActionsCtx = createContext<PlaybackActions | null>(null);
const LibraryCtx = createContext<Library | null>(null);
const SleepTimerCtx = createContext<SleepTimer | null>(null);

function useCtx<T>(ctx: React.Context<T | null>, name: string): T {
  const v = useContext(ctx);
  if (!v) throw new Error(`${name} outside AudioProvider`);
  return v;
}

export const usePlayback = () => useCtx(PlaybackStateCtx, "usePlayback");
export const usePlaybackActions = () =>
  useCtx(PlaybackActionsCtx, "usePlaybackActions");
export const useLibrary = () => useCtx(LibraryCtx, "useLibrary");
export const useSleepTimer = () => useCtx(SleepTimerCtx, "useSleepTimer");

/**
 * Storage (v2): favorites and recents persist *slugs* — never full station
 * snapshots — so a changed stream URL in the catalog can't strand a saved
 * station. `emfm:snaps` keeps a small slug→station map as a fallback when
 * the catalog isn't loaded yet (or a station was removed).
 *
 * Legacy formats migrated on load:
 *  - emfm:favorites   string[] of station *ids*      → slugs
 *  - emfm:favmap      Record<id, PublicStation>      → folded into snaps
 *  - emfm:recents     PublicStation[]                → {slug, playedAt}[]
 */
const FAV_KEY = "emfm:favorites";
const FAVMAP_KEY = "emfm:favmap"; // legacy
const RECENT_KEY = "emfm:recents";
const SNAPS_KEY = "emfm:snaps";
const VOL_KEY = "emfm:volume";
const MUTE_KEY = "emfm:muted";

type RecentEntry = { slug: string; playedAt: number };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function streamParam(stream: string): string | null {
  try {
    return new URLSearchParams(stream.split("?")[1]).get("u");
  } catch {
    return null;
  }
}

export default function AudioProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<{ destroy: () => void } | null>(null);
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const catalogRef = useRef<PublicStation[] | null>(null);
  const catalogPromiseRef = useRef<Promise<PublicStation[]> | null>(null);
  const [current, setCurrent] = useState<PublicStation | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(0.9);
  const [muted, setMuted] = useState(false);
  const [sleepAt, setSleepAt] = useState<number | null>(null);
  const [sleepRemaining, setSleepRemaining] = useState<number | null>(null);
  /** Stored refs — slugs in v2, possibly legacy ids until the catalog migrates them. */
  const [favRefs, setFavRefs] = useState<string[]>([]);
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([]);
  const [snaps, setSnaps] = useState<Record<string, PublicStation>>({});
  const [catalog, setCatalog] = useState<PublicStation[] | null>(null);
  /** Legacy station id → slug, recovered from stored snapshots. */
  const [idMap, setIdMap] = useState<Record<string, string>>({});

  const destroyHls = () => {
    hlsRef.current?.destroy();
    hlsRef.current = null;
  };

  const clearWatchdog = () => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  };

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "none";
    audioRef.current = audio;
    // Hydrate persisted state without blocking first paint
    queueMicrotask(() => {
      const snapsFromLegacy: Record<string, PublicStation> = {
        ...read<Record<string, PublicStation>>(SNAPS_KEY, {}),
      };
      const ids: Record<string, string> = {};
      // Legacy favmap/recents carried full station objects — keep them as
      // slug-keyed snapshots so saved stations still render pre-catalog.
      for (const s of Object.values(
        read<Record<string, PublicStation>>(FAVMAP_KEY, {})
      )) {
        if (s?.slug) {
          snapsFromLegacy[s.slug] ??= s;
          if (s.id) ids[s.id] = s.slug;
        }
      }
      const rawRecents = read<unknown[]>(RECENT_KEY, []);
      const entries: RecentEntry[] = [];
      for (const r of rawRecents) {
        const o = r as Partial<PublicStation> & Partial<RecentEntry>;
        if (o && typeof o.slug === "string") {
          entries.push({ slug: o.slug, playedAt: o.playedAt ?? Date.now() });
          // Legacy recents stored the whole station — seed snaps from it.
          if (o.stream) snapsFromLegacy[o.slug] ??= o as PublicStation;
          if (o.id) ids[o.id] = o.slug;
        }
      }
      setIdMap(ids);
      setSnaps(snapsFromLegacy);
      setFavRefs(read<string[]>(FAV_KEY, []));
      setRecentEntries(entries.slice(0, 20));
      const v = read<number>(VOL_KEY, 0.9);
      setVolumeState(v);
      audio.volume = v;
      const m = read<boolean>(MUTE_KEY, false);
      setMuted(m);
      audio.muted = m;
    });
    audio.volume = read<number>(VOL_KEY, 0.9);
    audio.muted = read<boolean>(MUTE_KEY, false);

    const onPlaying = () => {
      clearWatchdog();
      setStatus("playing");
    };
    const onPause = () => setStatus("paused");
    const onWaiting = () => setStatus("loading");
    const onError = () => {
      setStatus("error");
      setError("Stream unavailable right now");
    };
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("error", onError);
      audio.pause();
      hlsRef.current?.destroy();
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
    };
  }, []);

  const play = useCallback(async (s: PublicStation) => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrent(s);
    setStatus("loading");
    setError(null);
    setNowPlaying(null);
    destroyHls();
    clearWatchdog();
    audio.pause();
    audio.removeAttribute("src");

    // If we never reach "playing", the stream is dead or unreachable.
    watchdogRef.current = setTimeout(() => {
      setStatus((st) => {
        if (st === "loading") {
          setError("Station is offline or took too long to connect");
          return "error";
        }
        return st;
      });
    }, 12000);

    if (s.hls && !audio.canPlayType("application/vnd.apple.mpegurl")) {
      const { default: Hls } = await import("hls.js");
      if (Hls.isSupported()) {
        const hls = new Hls({ maxBufferLength: 20, manifestLoadingMaxRetry: 2 });
        hlsRef.current = hls;
        hls.on(Hls.Events.ERROR, (_e, d) => {
          if (!d.fatal) return;
          if (d.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
            return;
          }
          setStatus("error");
          setError("Stream unavailable right now");
        });
        hls.attachMedia(audio);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(s.stream));
      } else {
        setStatus("error");
        setError("HLS not supported in this browser");
        return;
      }
    } else {
      audio.src = s.stream;
    }

    try {
      await audio.play();
    } catch (err) {
      // AbortError fires when a newer station replaces this src — ignore it.
      if ((err as DOMException)?.name !== "AbortError") {
        setStatus("error");
        setError("Playback was blocked or the stream is offline");
      }
      return;
    }

    setRecentEntries((prev) => {
      const next = [
        { slug: s.slug, playedAt: Date.now() },
        ...prev.filter((r) => r.slug !== s.slug),
      ].slice(0, 20);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
    setSnaps((prev) => {
      const next = { ...prev, [s.slug]: s };
      localStorage.setItem(SNAPS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (status === "playing") audio.pause();
    else audio.play().catch(() => setStatus("error"));
  }, [current, status]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    destroyHls();
    clearWatchdog();
    audio?.pause();
    audio?.removeAttribute("src");
    setCurrent(null);
    setStatus("idle");
    setNowPlaying(null);
    setSleepAt(null);
    setSleepRemaining(null);
  }, []);

  // ---------- catalog for next/prev (fetched lazily on first use) ----------
  const ensureCatalog = useCallback(async () => {
    if (catalogRef.current) return catalogRef.current;
    catalogPromiseRef.current ??= fetch("/api/stations")
      .then((r) => r.json())
      .then((d) => {
        catalogRef.current = d.stations as PublicStation[];
        setCatalog(catalogRef.current);
        return catalogRef.current;
      })
      .catch(() => [] as PublicStation[]);
    return catalogPromiseRef.current;
  }, []);

  // Warm the catalog once on mount: next/prev needs it anyway, and legacy
  // favorite *ids* can only be migrated to slugs against it.
  useEffect(() => {
    ensureCatalog();
  }, [ensureCatalog]);

  // Catalog lookup maps + legacy ref → slug resolution.
  const bySlug = useMemo(() => {
    const m = new Map<string, PublicStation>();
    for (const s of catalog ?? []) m.set(s.slug, s);
    return m;
  }, [catalog]);
  const byId = useMemo(() => {
    const m = new Map<string, PublicStation>();
    for (const s of catalog ?? []) m.set(s.id, s);
    return m;
  }, [catalog]);

  const resolveSlug = useCallback(
    (ref: string) =>
      bySlug.get(ref)?.slug ?? byId.get(ref)?.slug ?? idMap[ref] ?? ref,
    [bySlug, byId, idMap]
  );

  // Once the catalog is in, rewrite any legacy id refs to slugs and persist.
  const migratedRef = useRef(false);
  useEffect(() => {
    if (!catalog?.length || migratedRef.current) return;
    migratedRef.current = true;
    setFavRefs((refs) => {
      const slugs = [...new Set(refs.map(resolveSlug))];
      if (slugs.join() !== refs.join()) {
        localStorage.setItem(FAV_KEY, JSON.stringify(slugs));
      }
      return slugs;
    });
    setRecentEntries((entries) => {
      const next = entries
        .map((e) => ({ ...e, slug: resolveSlug(e.slug) }))
        .filter(
          (e, i, arr) => arr.findIndex((x) => x.slug === e.slug) === i
        );
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
    localStorage.removeItem(FAVMAP_KEY);
  }, [catalog, resolveSlug]);

  const step = useCallback(
    async (dir: 1 | -1) => {
      const list = await ensureCatalog();
      if (!list.length || !current) return;
      const i = list.findIndex((s) => s.id === current.id);
      const n = (i + dir + list.length) % list.length;
      play(list[n]);
    },
    [ensureCatalog, current, play]
  );

  const next = useCallback(() => step(1), [step]);
  const prev = useCallback(() => step(-1), [step]);

  /** The station `next` would play, without switching to it. */
  const peekNext = useCallback(async () => {
    const list = await ensureCatalog();
    if (!list.length || !current) return null;
    const i = list.findIndex((s) => s.id === current.id);
    return list[(i + 1) % list.length] ?? null;
  }, [ensureCatalog, current]);

  const clearRecents = useCallback(() => {
    setRecentEntries([]);
    localStorage.removeItem(RECENT_KEY);
  }, []);

  // ---------- sleep timer ----------
  const setSleepTimer = useCallback((minutes: number | null) => {
    if (minutes === null) {
      setSleepAt(null);
      setSleepRemaining(null);
    } else {
      setSleepAt(Date.now() + minutes * 60_000);
    }
  }, []);

  useEffect(() => {
    if (!sleepAt) return;
    const tick = () => {
      const left = Math.max(0, Math.round((sleepAt - Date.now()) / 1000));
      setSleepRemaining(left);
      if (left <= 0) stop();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sleepAt, stop]);

  // ---------- now playing (ICY StreamTitle) ----------
  useEffect(() => {
    if (status !== "playing" || !current) return;
    const u = streamParam(current.stream);
    if (!u) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch(`/api/now-playing?u=${u}`);
        const d = await r.json();
        if (!cancelled && d.title) setNowPlaying(d.title);
      } catch {
        /* station may not expose ICY metadata */
      }
    };
    poll();
    const id = setInterval(poll, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [status, current]);

  const toggleFavorite = useCallback((station: PublicStation) => {
    const slug = station.slug;
    setFavRefs((prev) => {
      const on = !prev.includes(slug);
      const next = on ? [slug, ...prev] : prev.filter((x) => x !== slug);
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
      setSnaps((m) => {
        const mm = { ...m };
        if (on) mm[slug] = station;
        else delete mm[slug];
        localStorage.setItem(SNAPS_KEY, JSON.stringify(mm));
        return mm;
      });
      return next;
    });
  }, []);

  // ---------- volume / mute ----------
  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    const audio = audioRef.current;
    if (audio) {
      audio.volume = clamped;
      if (clamped > 0 && audio.muted) {
        audio.muted = false;
        setMuted(false);
        localStorage.setItem(MUTE_KEY, "false");
      }
    }
    setVolumeState(clamped);
    localStorage.setItem(VOL_KEY, JSON.stringify(clamped));
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const m = !audio.muted;
    audio.muted = m;
    setMuted(m);
    localStorage.setItem(MUTE_KEY, JSON.stringify(m));
  }, []);

  // ---------- media session ----------
  useEffect(() => {
    if (!("mediaSession" in navigator) || !current) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: nowPlaying || current.name,
      artist: nowPlaying ? current.name : "Elanjai Media FM",
      album: `${current.language} · ${current.country}`,
    });
    navigator.mediaSession.setActionHandler("play", () => toggle());
    navigator.mediaSession.setActionHandler("pause", () => toggle());
    navigator.mediaSession.setActionHandler("stop", () => stop());
    navigator.mediaSession.setActionHandler("nexttrack", () => next());
    navigator.mediaSession.setActionHandler("previoustrack", () => prev());
  }, [current, nowPlaying, toggle, stop, next, prev]);

  // ---------- keyboard shortcuts ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el?.tagName === "INPUT" || el?.tagName === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        toggle();
      } else if (e.key === "m" || e.key === "M") {
        toggleMute();
      } else if (e.key === "n" || e.key === "N") {
        next();
      } else if (e.key === "p" || e.key === "P") {
        prev();
      } else if (e.key === "ArrowUp") {
        setVolume(volume + 0.1);
      } else if (e.key === "ArrowDown") {
        setVolume(volume - 0.1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, toggleMute, next, prev, setVolume, volume]);

  // ---------- context values ----------

  const playbackState = useMemo<PlaybackState>(
    () => ({ current, status, error, nowPlaying, volume, muted }),
    [current, status, error, nowPlaying, volume, muted]
  );

  const playbackActions = useMemo<PlaybackActions>(
    () => ({
      play,
      toggle,
      stop,
      next,
      prev,
      peekNext,
      setVolume,
      toggleMute,
    }),
    [play, toggle, stop, next, prev, peekNext, setVolume, toggleMute]
  );

  /** Resolved favorites — catalog version preferred, snapshot fallback. */
  const favorites = useMemo(
    () => new Set(favRefs.map(resolveSlug)),
    [favRefs, resolveSlug]
  );
  const favoriteStations = useMemo(
    () =>
      favRefs
        .map((ref) => bySlug.get(resolveSlug(ref)) ?? snaps[resolveSlug(ref)])
        .filter((x): x is PublicStation => Boolean(x)),
    [favRefs, resolveSlug, bySlug, snaps]
  );
  const recents = useMemo(
    () =>
      recentEntries
        .map((e) => {
          const s = bySlug.get(resolveSlug(e.slug)) ?? snaps[resolveSlug(e.slug)];
          return s ? { ...s, playedAt: e.playedAt } : null;
        })
        .filter((x): x is PublicStation => Boolean(x)),
    [recentEntries, resolveSlug, bySlug, snaps]
  );

  const library = useMemo<Library>(
    () => ({
      favorites,
      toggleFavorite,
      favoriteStations,
      recents,
      clearRecents,
    }),
    [favorites, toggleFavorite, favoriteStations, recents, clearRecents]
  );

  const sleep = useMemo<SleepTimer>(
    () => ({ sleepRemaining, setSleepTimer }),
    [sleepRemaining, setSleepTimer]
  );

  return (
    <PlaybackStateCtx.Provider value={playbackState}>
      <PlaybackActionsCtx.Provider value={playbackActions}>
        <LibraryCtx.Provider value={library}>
          <SleepTimerCtx.Provider value={sleep}>
            {children}
          </SleepTimerCtx.Provider>
        </LibraryCtx.Provider>
      </PlaybackActionsCtx.Provider>
    </PlaybackStateCtx.Provider>
  );
}
