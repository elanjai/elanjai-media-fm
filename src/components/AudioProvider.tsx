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
import { adBeacon, isAdFree, pickWeighted, type Campaign } from "@/lib/ads";
import { track } from "@/lib/analytics";
import { reportStreamIssue, sessionId } from "@/lib/report";
import type { PublicStation } from "@/lib/types";
import { usePrefs } from "./PrefsProvider";

/**
 * Playback state machine:
 *   idle → connecting → playing ⇄ buffering → reconnecting(n) → error
 * `paused` is the only user-driven hold; `error` means retries are exhausted.
 */
type Status =
  | "idle"
  | "connecting"
  | "playing"
  | "buffering"
  | "reconnecting"
  | "paused"
  | "error";

/** True for the states a spinner should show in transport buttons. */
export const isBusyStatus = (s: Status) =>
  s === "connecting" || s === "buffering" || s === "reconnecting";

/** Reconnect backoff schedule (F-1.1) — 1 s, 3 s, 8 s. */
const RETRY_DELAYS_MS = [1000, 3000, 8000];
const CONNECT_TIMEOUT_MS = 12_000;
const STALL_TIMEOUT_MS = 8_000;

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
  /** Reconnect attempt in progress (0 = first try / not retrying). */
  retryAttempt: number;
  /** High-bitrate play held back by data saver until confirmed (F-1.8). */
  pendingPlay: { station: PublicStation; queue?: PublicStation[] } | null;
  /** A sponsored audio clip is playing before the stream starts (F-4.5). */
  preroll: boolean;
};

type PlaybackActions = {
  /** Start a station; `queue` is the list the user launched from and drives next/prev. */
  play: (s: PublicStation, queue?: PublicStation[]) => void;
  toggle: () => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
  peekNext: () => Promise<PublicStation | null>;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  /** Confirm / dismiss a data-saver-held play request. */
  confirmPendingPlay: () => void;
  dismissPendingPlay: () => void;
  /** The shared <audio> element — needed by Remote Playback / AirPlay (F-1.10). */
  getAudioEl: () => HTMLAudioElement | null;
};

type Library = {
  /** Slugs of favorited stations. */
  favorites: Set<string>;
  toggleFavorite: (station: PublicStation) => void;
  /** Merge stations into favorites — never removes (setup links, /simple). */
  addFavorites: (stations: PublicStation[]) => void;
  favoriteStations: PublicStation[];
  recents: PublicStation[];
  clearRecents: () => void;
};

type SleepTimer = {
  sleepRemaining: number | null; // seconds until auto-stop
  setSleepTimer: (minutes: number | null) => void;
};

type Catalog = {
  /** Full active-station list; null until the first /api/stations fetch lands. */
  stations: PublicStation[] | null;
};

const PlaybackStateCtx = createContext<PlaybackState | null>(null);
const PlaybackActionsCtx = createContext<PlaybackActions | null>(null);
const LibraryCtx = createContext<Library | null>(null);
const SleepTimerCtx = createContext<SleepTimer | null>(null);
const CatalogCtx = createContext<Catalog | null>(null);

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
export const useCatalog = () => useCtx(CatalogCtx, "useCatalog");

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

/**
 * Audio pre-roll pilot (F-4.5, §6.1 rule 1 — audio is sacred): a single
 * ≤15 s sponsored clip before the *first* stream of a session, max once
 * per 45 min, never on station switches, never for ad-free supporters
 * or data-saver users. Armed only when NEXT_PUBLIC_PREROLL_ENABLED=1
 * AND an audio_preroll campaign is active — ships dark otherwise.
 */
const PREROLL_ENABLED = process.env.NEXT_PUBLIC_PREROLL_ENABLED === "1";
const PREROLL_KEY = "emfm:preroll:last";
const PREROLL_COOLDOWN_MS = 45 * 60_000;
const PREROLL_MAX_MS = 16_000; // 15 s creative + 1 s slack — never block the stream

const prerollDue = () => {
  try {
    return Date.now() - Number(localStorage.getItem(PREROLL_KEY) ?? 0) > PREROLL_COOLDOWN_MS;
  } catch {
    return false;
  }
};
const prerollMark = () => {
  try {
    localStorage.setItem(PREROLL_KEY, String(Date.now()));
  } catch {
    /* storage denied */
  }
};

type RecentEntry = { slug: string; playedAt: number };

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}


export default function AudioProvider({
  children,
  prerollCampaigns = [],
}: {
  children: React.ReactNode;
  /** Eligible audio_preroll campaigns from the server (F-4.5). */
  prerollCampaigns?: Campaign[];
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prerollAudioRef = useRef<HTMLAudioElement | null>(null);
  const prerollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prerollActiveRef = useRef(false);
  const prerollCampaignsRef = useRef(prerollCampaigns);
  useEffect(() => {
    prerollCampaignsRef.current = prerollCampaigns;
  }, [prerollCampaigns]);
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
  const [preroll, setPreroll] = useState(false);
  /** Legacy station id → slug, recovered from stored snapshots. */
  const [idMap, setIdMap] = useState<Record<string, string>>({});

  // ---------- resilient playback engine ----------
  // Extra refs for the state machine:
  const currentRef = useRef<PublicStation | null>(null);
  /** Sources for the active station: primary + failovers (schema v2). */
  const streamIdxRef = useRef(0);
  const attemptRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** True while the user wants audio — distinguishes a user pause from a drop. */
  const wantPlayRef = useRef(false);
  /** Was audio live when the network dropped? Drives online auto-resume. */
  const wasLiveRef = useRef(false);
  /** TTFA (time to first audio) measurement for health reporting. */
  const ttfaStartRef = useRef(0);
  const lastTtfaRef = useRef<number | null>(null);

  const [retryAttempt, setRetryAttempt] = useState(0);
  const [pendingPlay, setPendingPlay] = useState<{
    station: PublicStation;
    queue?: PublicStation[];
  } | null>(null);
  /** Stations the user already approved this session while saving data. */
  const saverOkRef = useRef<Set<string>>(new Set());
  const { dataSaver } = usePrefs();
  /** Volume captured before the sleep-timer fade, restored on play/stop. */
  const fadeBaseRef = useRef<number | null>(null);

  const restoreFade = useCallback(() => {
    const audio = audioRef.current;
    if (audio && fadeBaseRef.current !== null) {
      audio.volume = fadeBaseRef.current;
      fadeBaseRef.current = null;
    }
  }, []);

  const destroyHls = useCallback(() => {
    hlsRef.current?.destroy();
    hlsRef.current = null;
  }, []);

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  const clearRetry = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const clearStall = useCallback(() => {
    if (stallTimerRef.current) {
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
  }, []);

  const clearTimers = useCallback(() => {
    clearWatchdog();
    clearRetry();
    clearStall();
  }, [clearWatchdog, clearRetry, clearStall]);

  /** All candidate stream URLs for a station (primary, then failovers). */
  const sourcesOf = (s: PublicStation) => [s.stream, ...(s.altStreams ?? [])];

  /** Mirror of `status` for use inside stable callbacks/one-shot listeners. */
  const statusRef = useRef<Status>("idle");
  const setStatusTracked = useCallback(
    (s: Status | ((prev: Status) => Status)) => {
      setStatus((prev) => {
        const v = typeof s === "function" ? (s as (p: Status) => Status)(prev) : s;
        statusRef.current = v;
        return v;
      });
    },
    []
  );

  // Indirection so the once-registered listeners and mutually recursive
  // engine functions can reach the latest logic without stale closures.
  const playRef = useRef<(s: PublicStation) => void>(() => {});
  const scheduleRetryRef = useRef<(reason: string) => void>(() => {});
  /** The list playback was launched from — next/prev follow it (F-1.2). */
  const queueRef = useRef<PublicStation[] | null>(null);

  /** Attach + play the current candidate source. Arms the connect watchdog. */
  const attemptConnect = useCallback(async () => {
    const audio = audioRef.current;
    const s = currentRef.current;
    if (!audio || !s) return;
    destroyHls();
    audio.pause();
    audio.removeAttribute("src");
    const sources = sourcesOf(s);
    const url = sources[streamIdxRef.current % sources.length];

    clearWatchdog();
    watchdogRef.current = setTimeout(() => {
      watchdogRef.current = null;
      const st = statusRef.current;
      if (st === "connecting" || st === "reconnecting") {
        scheduleRetryRef.current("connect timeout");
      }
    }, CONNECT_TIMEOUT_MS);

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
          scheduleRetryRef.current("fatal hls error");
        });
        hls.attachMedia(audio);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(url));
      } else {
        setStatusTracked("error");
        setError("HLS not supported in this browser");
        return;
      }
    } else {
      audio.src = url;
      audio.load();
    }

    try {
      await audio.play();
    } catch (err) {
      // AbortError fires when a newer attempt/station replaces this src.
      if ((err as DOMException)?.name !== "AbortError") {
        scheduleRetryRef.current("play() rejected");
      }
    }
  }, [destroyHls, clearWatchdog, setStatusTracked]);

  /**
   * A dropped stream isn't an error until backoff is exhausted.
   * Each retry fails over to the next candidate source (altStreams), then
   * waits 1 s → 3 s → 8 s. Only then do we surface `error`.
   */
  const scheduleRetry = useCallback(
    (reason: string) => {
      if (!wantPlayRef.current || !currentRef.current) return;
      const st = statusRef.current;
      if (st === "error" || st === "idle") return;
      const attempt = attemptRef.current;
      if (attempt >= RETRY_DELAYS_MS.length) {
        clearTimers();
        setStatusTracked("error");
        const s = currentRef.current;
        if (s) {
          reportStreamIssue({
            slug: s.slug,
            reason,
            ttfa: lastTtfaRef.current,
          });
        }
        setError(
          reason === "connect timeout"
            ? "Station is offline or took too long to connect"
            : "Stream unavailable right now"
        );
        return;
      }
      streamIdxRef.current += 1;
      attemptRef.current = attempt + 1;
      setRetryAttempt(attempt + 1);
      setStatusTracked("reconnecting");
      clearRetry();
      retryTimerRef.current = setTimeout(() => {
        retryTimerRef.current = null;
        if (wantPlayRef.current) {
          setStatusTracked("connecting");
          attemptConnect();
        }
      }, RETRY_DELAYS_MS[attempt]);
    },
    [attemptConnect, clearRetry, clearTimers, setStatusTracked]
  );
  useEffect(() => {
    scheduleRetryRef.current = scheduleRetry;
  }, [scheduleRetry]);

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
      clearTimers();
      attemptRef.current = 0;
      setRetryAttempt(0);
      if (ttfaStartRef.current) {
        lastTtfaRef.current = performance.now() - ttfaStartRef.current;
      }
      setStatusTracked("playing");
    };
    // A pause while wantPlay is still true is an unexpected drop — retry.
    const onPause = () => {
      if (wantPlayRef.current) {
        scheduleRetry("stream paused");
      } else {
        setStatusTracked("paused");
      }
    };
    // Brief stalls are normal; only surface "buffering" after a moment, and
    // treat a long stall the same as a dropped connection.
    const onStall = () => {
      if (!wantPlayRef.current) return;
      setStatusTracked((st) => (st === "playing" ? "buffering" : st));
      if (!stallTimerRef.current) {
        stallTimerRef.current = setTimeout(() => {
          stallTimerRef.current = null;
          scheduleRetry("stream stalled");
        }, STALL_TIMEOUT_MS);
      }
    };
    const onEnded = () => scheduleRetry("stream ended");
    const onError = () => scheduleRetry("media error");
    const onOffline = () => {
      wasLiveRef.current = wantPlayRef.current;
      setError("You're offline — will reconnect when the network returns");
      setStatusTracked("error");
    };
    const onOnline = () => {
      if (wasLiveRef.current && currentRef.current) {
        playRef.current(currentRef.current);
      }
      wasLiveRef.current = false;
    };
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("waiting", onStall);
    audio.addEventListener("stalled", onStall);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("waiting", onStall);
      audio.removeEventListener("stalled", onStall);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      audio.pause();
      hlsRef.current?.destroy();
      if (watchdogRef.current) clearTimeout(watchdogRef.current);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (stallTimerRef.current) clearTimeout(stallTimerRef.current);
    };
    // mount-once: registers element + window listeners for the provider's
    // lifetime; all callbacks it uses are stable useCallbacks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * End an in-flight pre-roll: tear down its dedicated <audio> element
   * (kept separate so the clip can never trip the stream retry engine),
   * then — when `resume` — continue into the station connect path.
   */
  const endPreroll = useCallback(
    (resume: boolean) => {
      if (prerollTimerRef.current) {
        clearTimeout(prerollTimerRef.current);
        prerollTimerRef.current = null;
      }
      const ad = prerollAudioRef.current;
      if (ad) {
        ad.pause();
        ad.removeAttribute("src");
        prerollAudioRef.current = null;
      }
      prerollActiveRef.current = false;
      setPreroll(false);
      if (resume && wantPlayRef.current && currentRef.current) attemptConnect();
    },
    [attemptConnect]
  );

  /** The actual play path — retry/online-resume calls go here directly. */
  const startPlay = useCallback(
    (s: PublicStation, queue?: PublicStation[]) => {
      const sessionStart = !currentRef.current;
      wantPlayRef.current = true;
      restoreFade();
      queueRef.current = queue?.length ? queue : null;
      attemptRef.current = 0;
      setRetryAttempt(0);
      streamIdxRef.current = 0;
      clearTimers();
      currentRef.current = s;
      setCurrent(s);
      setStatusTracked("connecting");
      setError(null);
      setNowPlaying(null);
      ttfaStartRef.current = performance.now();

      // F-4.5 pre-roll: session starts only, ≤15 s, 45-min cooldown —
      // the station shows as "connecting" while the clip plays.
      if (
        sessionStart &&
        PREROLL_ENABLED &&
        !dataSaver &&
        prerollDue() &&
        !isAdFree()
      ) {
        const c = pickWeighted(
          prerollCampaignsRef.current.filter((x) => x.creative.audioUrl),
          Math.random()
        );
        if (c?.creative.audioUrl) {
          prerollMark();
          adBeacon("preroll", c.id, "imp");
          prerollActiveRef.current = true;
          setPreroll(true);
          const ad = new Audio();
          ad.preload = "auto";
          ad.volume = audioRef.current?.volume ?? 0.9;
          ad.muted = audioRef.current?.muted ?? false;
          prerollAudioRef.current = ad;
          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            endPreroll(true);
          };
          ad.addEventListener("ended", finish, { once: true });
          ad.addEventListener("error", finish, { once: true });
          // Hard cap: a stalled ad must never hold the stream hostage.
          prerollTimerRef.current = setTimeout(finish, PREROLL_MAX_MS);
          ad.src = c.creative.audioUrl;
          ad.play().catch(finish);
          return; // station connect continues from endPreroll(true)
        }
      }

      attemptConnect();

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
    },
    [attemptConnect, clearTimers, dataSaver, endPreroll, restoreFade, setStatusTracked]
  );

  /**
   * Data-saver gate (F-1.8): before starting a >128 kbps stream while the
   * user opted in (or the OS reports saveData), hold the request behind a
   * one-tap confirmation — once per station per session.
   */
  const osSaveData = () =>
    (
      navigator as Navigator & {
        connection?: { saveData?: boolean };
      }
    ).connection?.saveData === true;

  const play = useCallback(
    (s: PublicStation, queue?: PublicStation[]) => {
      if (
        s.bitrate > 128 &&
        (dataSaver || osSaveData()) &&
        !saverOkRef.current.has(s.slug)
      ) {
        setPendingPlay({ station: s, queue });
        return;
      }
      setPendingPlay(null);
      startPlay(s, queue);
    },
    [dataSaver, startPlay]
  );
  useEffect(() => {
    playRef.current = play;
  }, [play]);

  const confirmPendingPlay = useCallback(() => {
    if (!pendingPlay) return;
    saverOkRef.current.add(pendingPlay.station.slug);
    setPendingPlay(null);
    startPlay(pendingPlay.station, pendingPlay.queue);
  }, [pendingPlay, startPlay]);

  const dismissPendingPlay = useCallback(() => setPendingPlay(null), []);

  const getAudioEl = useCallback(() => audioRef.current, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    const s = currentRef.current;
    if (!audio || !s) return;
    // Pre-roll in flight → pause/resume the ad clip, not the (unloaded) stream.
    const ad = prerollAudioRef.current;
    if (ad) {
      if (ad.paused) {
        ad.play().catch(() => endPreroll(true));
        setStatusTracked("connecting");
      } else {
        ad.pause();
        setStatusTracked("paused");
      }
      return;
    }
    // After an error the old source is dead — go through play() again so the
    // stream URL (or a fresh hls.js instance) is re-established instead of
    // calling play() on a broken src. Makes "tap to retry" actually retry.
    if (status === "error") {
      play(s);
      return;
    }
    if (isBusyStatus(status) || status === "playing") {
      wantPlayRef.current = false;
      clearTimers();
      audio.pause();
      setStatusTracked("paused");
      return;
    }
    wantPlayRef.current = true;
    audio.play().catch(() => play(s));
  }, [status, play, clearTimers, endPreroll, setStatusTracked]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    wantPlayRef.current = false;
    endPreroll(false);
    clearTimers();
    restoreFade();
    destroyHls();
    audio?.pause();
    audio?.removeAttribute("src");
    currentRef.current = null;
    setCurrent(null);
    setStatusTracked("idle");
    setNowPlaying(null);
    setRetryAttempt(0);
    setSleepAt(null);
    setSleepRemaining(null);
  }, [clearTimers, destroyHls, endPreroll, restoreFade, setStatusTracked]);

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

  /**
   * The effective queue: the list playback launched from, or — when none was
   * supplied — the current station's language ranked by popularity/quality.
   */
  const effectiveQueue = useCallback(async () => {
    if (queueRef.current?.length) return queueRef.current;
    const cur = currentRef.current;
    const list = await ensureCatalog();
    if (!cur) return list;
    return list
      .filter((s) => s.genre === cur.genre)
      .sort((a, b) => b.votes - a.votes || b.bitrate - a.bitrate);
  }, [ensureCatalog]);

  const step = useCallback(
    async (dir: 1 | -1) => {
      const cur = currentRef.current;
      const list = await effectiveQueue();
      if (!list.length || !cur) return;
      const i = list.findIndex((s) => s.id === cur.id);
      const n = (i + dir + list.length) % list.length;
      play(list[n], list);
    },
    [effectiveQueue, play]
  );

  const next = useCallback(() => step(1), [step]);
  const prev = useCallback(() => step(-1), [step]);

  /** The station `next` would play, without switching to it. */
  const peekNext = useCallback(async () => {
    const cur = currentRef.current;
    const list = await effectiveQueue();
    if (!list.length || !cur) return null;
    const i = list.findIndex((s) => s.id === cur.id);
    return list[(i + 1) % list.length] ?? null;
  }, [effectiveQueue]);

  const clearRecents = useCallback(() => {
    setRecentEntries([]);
    localStorage.removeItem(RECENT_KEY);
  }, []);

  // ---------- sleep timer ----------
  const setSleepTimer = useCallback(
    (minutes: number | null) => {
      if (minutes === null) {
        restoreFade();
        setSleepAt(null);
        setSleepRemaining(null);
      } else {
        setSleepAt(Date.now() + minutes * 60_000);
      }
    },
    [restoreFade]
  );

  useEffect(() => {
    if (!sleepAt) return;
    const tick = () => {
      const left = Math.max(0, Math.round((sleepAt - Date.now()) / 1000));
      setSleepRemaining(left);
      const audio = audioRef.current;
      // Fade the last 30 s out so sleep doesn't end with a hard cut.
      if (audio && left <= 30 && left > 0 && statusRef.current === "playing") {
        fadeBaseRef.current ??= audio.volume;
        audio.volume = Math.max(0, fadeBaseRef.current * (left / 30));
      }
      if (left <= 0) {
        // Pause rather than stop: the mini player stays visible so the
        // listener can resume tomorrow with one tap (F-1.9).
        wantPlayRef.current = false;
        audio?.pause();
        restoreFade();
        setStatusTracked("paused");
        setSleepAt(null);
        setSleepRemaining(null);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sleepAt, restoreFade, setStatusTracked]);

  // ---------- now playing (ICY StreamTitle) ----------
  useEffect(() => {
    if (status !== "playing" || !current) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch(
          `/api/now-playing?slug=${encodeURIComponent(current.slug)}`
        );
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

  // ---------- play beacon (F-2.6) ----------
  // One play per station per ~30min session gap — pause/resume doesn't
  // recount, and retry/auto-resume of the same station stays deduped.
  const beaconedRef = useRef<{ slug: string; at: number } | null>(null);
  useEffect(() => {
    if (status !== "playing" || !current) return;
    const last = beaconedRef.current;
    if (last && last.slug === current.slug && Date.now() - last.at < 30 * 60 * 1000)
      return;
    beaconedRef.current = { slug: current.slug, at: Date.now() };
    track("play", { s: current.genre });
    const payload = JSON.stringify({ slug: current.slug, sid: sessionId() });
    try {
      const blob = new Blob([payload], { type: "application/json" });
      const sent = navigator.sendBeacon?.("/api/play", blob) ?? false;
      if (!sent) {
        fetch("/api/play", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      /* analytics is best-effort */
    }
  }, [status, current]);

  // ---------- listener heartbeat (F-5.4) ----------
  // Every 60 s while a stream is actually playing; the server keeps the
  // sid inside a 5-min window, so pauses/stops stop counting naturally.
  useEffect(() => {
    if (status !== "playing" || !current) return;
    const slug = current.slug;
    const beat = () => {
      const payload = JSON.stringify({ slug, sid: sessionId() });
      try {
        const blob = new Blob([payload], { type: "application/json" });
        const sent = navigator.sendBeacon?.("/api/listeners", blob) ?? false;
        if (!sent) {
          fetch("/api/listeners", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: payload,
            keepalive: true,
          }).catch(() => {});
        }
      } catch {
        /* best-effort */
      }
    };
    beat(); // count "still playing" immediately, not a minute in
    const iv = setInterval(beat, 60_000);
    return () => clearInterval(iv);
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

  const addFavorites = useCallback((stations: PublicStation[]) => {
    if (!stations.length) return;
    setFavRefs((prev) => {
      const fresh = stations.map((s) => s.slug).filter((sl) => !prev.includes(sl));
      const next = [...fresh, ...prev];
      localStorage.setItem(FAV_KEY, JSON.stringify(next));
      return next;
    });
    setSnaps((m) => {
      const mm = { ...m };
      for (const s of stations) mm[s.slug] = s;
      localStorage.setItem(SNAPS_KEY, JSON.stringify(mm));
      return mm;
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
    if (!("mediaSession" in navigator)) return;
    if (!current) {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = "none";
      return;
    }
    const artType = /\.jpe?g($|\?)/i.test(current.favicon)
      ? "image/jpeg"
      : /\.webp($|\?)/i.test(current.favicon)
        ? "image/webp"
        : "image/png";
    const art = current.favicon
      ? [96, 256, 512].map((s) => ({
          src: current.favicon,
          sizes: `${s}x${s}`,
          type: artType,
        }))
      : [];
    navigator.mediaSession.metadata = new MediaMetadata({
      title: nowPlaying || current.name,
      artist: nowPlaying ? current.name : "Elanjai Media FM",
      album: `${current.language} · ${current.country}`,
      artwork: art,
    });
    navigator.mediaSession.playbackState =
      status === "playing" || status === "buffering"
        ? "playing"
        : status === "idle"
          ? "none"
          : "paused";
    // Separate handlers — a lock-screen Play should resume, not toggle.
    navigator.mediaSession.setActionHandler("play", () => toggle());
    navigator.mediaSession.setActionHandler("pause", () => {
      if (status === "playing" || isBusyStatus(status)) toggle();
    });
    navigator.mediaSession.setActionHandler("stop", () => stop());
    navigator.mediaSession.setActionHandler("nexttrack", () => next());
    navigator.mediaSession.setActionHandler("previoustrack", () => prev());
    return () => {
      navigator.mediaSession.playbackState = "none";
    };
  }, [current, nowPlaying, status, toggle, stop, next, prev]);

  // ---------- keyboard shortcuts ----------
  // Scoped so we don't fight the browser or the user's focus:
  //  - modifier combos (Ctrl+M etc.) belong to the browser — never handled
  //  - typing in a field/editable area is untouched
  //  - Space toggles only when no interactive element has focus (otherwise
  //    the focused button both activates AND toggles playback)
  //  - Arrow volume keys only inside the player ([data-player-scope]) so
  //    they never hijack page scroll
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (!el || el.tagName === "INPUT" || el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" || el.isContentEditable) return;
      const interactive = el.closest(
        "button, a, input, select, textarea, [role='button'], [role='slider'], [role='switch'], [role='link'], summary"
      );
      const inPlayer = !!el.closest("[data-player-scope]");
      if (e.code === "Space") {
        if (interactive) return;
        e.preventDefault();
        toggle();
      } else if (e.key === "m" || e.key === "M") {
        toggleMute();
      } else if (e.key === "n" || e.key === "N") {
        next();
      } else if (e.key === "p" || e.key === "P") {
        prev();
      } else if (inPlayer && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        setVolume(volume + (e.key === "ArrowUp" ? 0.1 : -0.1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, toggleMute, next, prev, setVolume, volume]);

  // ---------- context values ----------

  const playbackState = useMemo<PlaybackState>(
    () => ({
      current,
      status,
      error,
      nowPlaying,
      volume,
      muted,
      retryAttempt,
      pendingPlay,
      preroll,
    }),
    [current, status, error, nowPlaying, volume, muted, retryAttempt, pendingPlay, preroll]
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
      confirmPendingPlay,
      dismissPendingPlay,
      getAudioEl,
    }),
    [
      play,
      toggle,
      stop,
      next,
      prev,
      peekNext,
      setVolume,
      toggleMute,
      confirmPendingPlay,
      dismissPendingPlay,
      getAudioEl,
    ]
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
        .map((e): PublicStation | null => {
          const s =
            bySlug.get(resolveSlug(e.slug)) ?? snaps[resolveSlug(e.slug)];
          return s ? { ...s, playedAt: e.playedAt } : null;
        })
        .filter((x): x is PublicStation => x !== null),
    [recentEntries, resolveSlug, bySlug, snaps]
  );

  const library = useMemo<Library>(
    () => ({
      favorites,
      toggleFavorite,
      addFavorites,
      favoriteStations,
      recents,
      clearRecents,
    }),
    [
      favorites,
      toggleFavorite,
      addFavorites,
      favoriteStations,
      recents,
      clearRecents,
    ]
  );

  const sleep = useMemo<SleepTimer>(
    () => ({ sleepRemaining, setSleepTimer }),
    [sleepRemaining, setSleepTimer]
  );

  const catalogValue = useMemo<Catalog>(() => ({ stations: catalog }), [catalog]);

  return (
    <PlaybackStateCtx.Provider value={playbackState}>
      <PlaybackActionsCtx.Provider value={playbackActions}>
        <LibraryCtx.Provider value={library}>
          <SleepTimerCtx.Provider value={sleep}>
            <CatalogCtx.Provider value={catalogValue}>
              {children}
            </CatalogCtx.Provider>
          </SleepTimerCtx.Provider>
        </LibraryCtx.Provider>
      </PlaybackActionsCtx.Provider>
    </PlaybackStateCtx.Provider>
  );
}
