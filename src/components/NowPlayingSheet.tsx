"use client";

import Link from "@/components/LangLink";
import { useEffect, useRef, useState } from "react";
import type { Campaign } from "@/lib/ads";
import { reportStreamIssue } from "@/lib/report";
import type { PublicStation } from "@/lib/types";
import { fmt } from "@/i18n/locales";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { isBusyStatus, useLibrary, usePlayback, usePlaybackActions, useSleepTimer } from "./AudioProvider";
import AdSlotClient from "./AdSlotClient";
import AlarmCircle from "./AlarmCircle";
import CastButton from "./CastButton";
import EqBars from "./EqBars";
import Icon from "./Icon";
import LiveBadge from "./LiveBadge";
import { useGenreName, useLang, useT } from "./LocaleProvider";
import { shareText } from "./ShareButton";
import StationLogo from "./StationLogo";

const SLEEP_OPTIONS = [15, 30, 45, 60, 90];

/** Session data-use estimate — ticks once a second while audio plays (F-1.8). */
function SessionData({ bitrate, status }: { bitrate: number; status: string }) {
  const t = useT();
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (status !== "playing") return;
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [status]);
  if (!bitrate) return null;
  // kbps → MB: bitrate * 1000 bits/s / 8 / 1e6 ≈ bitrate / 8000 per second
  const mb = (secs * bitrate) / 8000;
  return (
    <p className="mt-1.5 text-center text-[11px] text-muted">
      {fmt(t("nowPlaying.sessionData"), {
        mb: mb < 10 ? mb.toFixed(1) : Math.round(mb),
        rate: Math.round(bitrate * 0.45),
      })}
    </p>
  );
}

function SleepCircle() {
  const { sleepRemaining, setSleepTimer } = useSleepTimer();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [customMin, setCustomMin] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const active = sleepRemaining !== null;
  const mm = active ? Math.floor(sleepRemaining / 60) : 0;
  const ss = active ? String(sleepRemaining % 60).padStart(2, "0") : "00";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("nowPlaying.sleepTimer")}
        aria-expanded={open}
        title={active ? fmt(t("nowPlaying.sleepingIn"), { time: `${mm}:${ss}` }) : t("nowPlaying.sleepTimer")}
        className={`relative flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface transition ${
          active ? "text-brand-2 dark:text-accent" : "text-muted hover:text-ink"
        }`}
      >
        <Icon name="moon" size={20} strokeWidth={1.8} />
        {active && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-ink">
            {mm}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute bottom-12 left-1/2 z-10 w-44 -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
          <p className="border-b border-border px-3 py-2 text-xs font-semibold text-muted">
            {t("nowPlaying.sleepTimer")} {active && <span className="text-brand-2 dark:text-accent">· {fmt(t("nowPlaying.timeLeft"), { time: `${mm}:${ss}` })}</span>}
          </p>
          {SLEEP_OPTIONS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setSleepTimer(m);
                setOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-ink transition hover:bg-surface-2"
            >
              {fmt(t("nowPlaying.minutes"), { count: m })}
            </button>
          ))}
          <form
            className="flex items-center gap-2 border-t border-border px-3 py-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = Number(customMin);
              if (v >= 1 && v <= 480) {
                setSleepTimer(v);
                setOpen(false);
              }
            }}
          >
            <input
              type="number"
              min={1}
              max={480}
              value={customMin}
              onChange={(e) => setCustomMin(e.target.value)}
              placeholder={t("nowPlaying.customMinutes")}
              aria-label={t("nowPlaying.customMinutes")}
              className="w-20 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand-2"
            />
            <button
              type="submit"
              className="text-sm font-semibold text-brand-2 disabled:text-muted dark:text-accent"
              disabled={!customMin}
            >
              {t("action.set")}
            </button>
          </form>
          {active && (
            <button
              type="button"
              onClick={() => {
                setSleepTimer(null);
                setOpen(false);
              }}
              className="block w-full border-t border-border px-3 py-2 text-left text-sm font-medium text-danger transition hover:bg-surface-2"
            >
              {t("nowPlaying.cancelTimer")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Full-screen bottom sheet — artwork, transport, actions, volume, up next. */
export default function NowPlayingSheet({
  total,
  npAds = [],
  onClose,
}: {
  total: number;
  /** Eligible self-ad campaigns for the sponsored card (F-4.2). */
  npAds?: Campaign[];
  onClose: () => void;
}) {
  const { current, status, error, nowPlaying, volume, muted } = usePlayback();
  const { toggle, stop, next, prev, setVolume, toggleMute, peekNext } =
    usePlaybackActions();
  const { favorites, toggleFavorite } = useLibrary();
  const lang = useLang();
  const t = useT();
  const gn = useGenreName();
  const [upNext, setUpNext] = useState<PublicStation | null>(null);
  const [shared, setShared] = useState(false);
  /** Slug the user already reported — resets automatically on station change. */
  const [reportedSlug, setReportedSlug] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  useFocusTrap(sheetRef);

  useEffect(() => {
    let live = true;
    peekNext().then((s) => {
      if (live) setUpNext(s);
    });
    return () => {
      live = false;
    };
  }, [peekNext, current?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!current) return null;
  const playing = status === "playing";
  const isFav = favorites.has(current.slug);
  const vol = muted ? 0 : volume;
  const reported = reportedSlug === current.slug;

  const url = `${location.origin}/${lang}/station/${current.slug}`;
  const wa = `https://wa.me/?text=${encodeURIComponent(`${shareText(t("share.listeningTo"), current.name)}\n${url}`)}`;

  const share = async () => {
    try {
      if (navigator.share)
        await navigator.share({
          title: current.name,
          text: shareText(t("share.listeningTo"), current.name),
          url,
        });
      else {
        await navigator.clipboard.writeText(url);
        setShared(true);
        setTimeout(() => setShared(false), 1500);
      }
    } catch {
      /* user dismissed share sheet */
    }
  };

  return (
    <div ref={sheetRef} className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={t("player.nowPlaying")} data-player-scope>
      <button
        type="button"
        aria-label={t("a11y.close")}
        onClick={onClose}
        className="fade-in absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
      />
      <div className="sheet-in absolute inset-x-0 bottom-0 max-h-[94dvh] overflow-y-auto rounded-t-[26px] bg-bg pb-[max(1.5rem,env(safe-area-inset-bottom))] md:inset-x-1/2 md:bottom-6 md:max-h-[calc(100dvh-3rem)] md:w-[min(92vw,34rem)] md:-translate-x-1/2 md:rounded-[26px] md:border md:border-border md:shadow-2xl">
        <div className="mx-auto w-full max-w-md px-4 pt-3">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-border md:hidden" />
          <div className="relative flex items-center">
            <button
              type="button"
              onClick={onClose}
              aria-label={t("a11y.collapsePlayer")}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-muted transition hover:text-ink"
            >
              <Icon name="chevD" size={16} />
            </button>
            <p className="absolute inset-x-0 text-center text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              {t("player.nowPlaying")}
            </p>
            <button
              type="button"
              onClick={() => {
                stop();
                onClose();
              }}
              aria-label={t("a11y.stopPlayback")}
              title={t("action.stop")}
              className="ml-auto flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-muted transition hover:text-danger"
            >
              <Icon name="stop" size={15} />
            </button>
          </div>

          <div className="mt-5 flex justify-center">
            <StationLogo
              src={current.favicon}
              fallbackSrc={current.faviconAlt}
              name={current.name}
              size={280}
              className="h-auto w-full max-w-[280px] rounded-[30px] shadow-2xl shadow-brand/30"
            />
          </div>

          <div className="mt-4 flex justify-center">
            <LiveBadge count={total} />
          </div>
          <h2 className="mt-3 truncate text-center font-display text-2xl font-semibold text-ink">
            {current.name}
          </h2>
          <p className="mt-1 text-center text-[13px] capitalize text-muted">
            {current.languages?.map((l) => gn(l)).join(", ") ?? current.language} · {current.bitrate ? `${current.bitrate} kbps ` : ""}
            {current.codec || "MP3"}
          </p>
          <SessionData
            key={current.slug}
            bitrate={current.bitrate}
            status={status}
          />
          {nowPlaying && (
            <a
              href={`https://www.youtube.com/results?search_query=${encodeURIComponent(nowPlaying)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 block text-center text-[11px] font-medium text-brand-2 underline-offset-2 hover:underline dark:text-accent"
            >
              {t("nowPlaying.findSong")} ↗
            </a>
          )}

          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3">
            <Icon name="eq" size={22} className="shrink-0 text-brand-2 dark:text-accent" />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-ink">
                {status === "error"
                  ? error ? t(error) : t("errors.streamUnavailable")
                  : status === "reconnecting"
                    ? t("player.reconnecting")
                    : status === "connecting"
                      ? t("player.connecting")
                      : status === "buffering"
                        ? t("player.buffering")
                        : playing
                          ? (nowPlaying ?? t("player.live"))
                          : t("player.paused")}
              </p>
              <p className="mt-0.5 text-[11px] text-muted">
                {status === "error" ? (
                  <>
                    {t("nowPlaying.tapToRetry")} ·{" "}
                    <button
                      type="button"
                      onClick={() => {
                        reportStreamIssue({
                          slug: current.slug,
                          reason: "user report",
                          ttfa: null,
                        });
                        setReportedSlug(current.slug);
                      }}
                      disabled={reported}
                      className="font-semibold text-brand-2 underline-offset-2 hover:underline disabled:text-muted disabled:no-underline dark:text-accent"
                    >
                      {reported ? t("report.thanks") : t("action.notWorking")}
                    </button>
                  </>
                ) : (
                  t("nowPlaying.viaIcy")
                )}
              </p>
            </div>
            {playing && !nowPlaying && <EqBars className="ml-auto" />}
          </div>
          {status === "error" && upNext && (
            <button
              type="button"
              onClick={next}
              className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-brand-2/30 bg-brand-2/5 px-3.5 py-2.5 text-left transition hover:border-brand-2/60 dark:border-accent/30 dark:bg-accent/10"
            >
              <StationLogo src={upNext.favicon} fallbackSrc={upNext.faviconAlt} name={upNext.name} size={32} className="h-8 w-8 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-semibold text-brand-2 dark:text-accent">
                  {t("nowPlaying.trySimilar")}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted">
                  {upNext.name}
                </span>
              </span>
              <Icon name="chevR" size={16} className="shrink-0 text-muted" />
            </button>
          )}
          {status === "error" && !upNext && (
            <button
              type="button"
              onClick={next}
              className="mt-3 w-full rounded-2xl border border-brand-2/30 bg-brand-2/5 px-3.5 py-2.5 text-center text-[12px] font-semibold text-brand-2 transition hover:border-brand-2/60 dark:border-accent/30 dark:bg-accent/10 dark:text-accent"
            >
              {t("nowPlaying.trySimilar")}
            </button>
          )}

          {/* Transport */}
          <div className="mt-5 flex items-center justify-center gap-9">
            <button
              type="button"
              onClick={prev}
              aria-label={t("a11y.prevStation")}
              className="flex h-11 w-11 items-center justify-center rounded-full text-ink transition hover:text-brand-2 dark:hover:text-accent"
            >
              <Icon name="prev" size={34} />
            </button>
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? t("action.pause") : t("action.play")}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-ink shadow-lg shadow-brand/30 transition hover:brightness-105 active:scale-95"
            >
              {isBusyStatus(status) ? (
                <span className="block h-7 w-7 animate-spin rounded-full border-2 border-accent-ink/30 border-t-accent-ink" />
              ) : (
                <Icon name={playing ? "pause" : "play"} size={26} />
              )}
            </button>
            <button
              type="button"
              onClick={next}
              aria-label={t("a11y.nextStation")}
              className="flex h-11 w-11 items-center justify-center rounded-full text-ink transition hover:text-brand-2 dark:hover:text-accent"
            >
              <Icon name="next" size={34} />
            </button>
          </div>

          {/* Secondary actions — icon + visible label so nothing needs recall */}
          <div className="mt-6 flex items-start justify-center gap-2">
            <span className="flex w-12 flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => toggleFavorite(current)}
                aria-pressed={isFav}
                aria-label={isFav ? t("favorites.remove") : t("favorites.add")}
                className={`flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface transition ${
                  isFav ? "text-rose" : "text-muted hover:text-rose"
                }`}
              >
                <Icon name={isFav ? "heartF" : "heart"} size={20} strokeWidth={1.8} />
              </button>
              <span className="text-[10px] font-medium text-muted">{t("nowPlaying.lblFav")}</span>
            </span>
            <span className="flex w-12 flex-col items-center gap-1">
              <SleepCircle />
              <span className="text-[10px] font-medium text-muted">{t("nowPlaying.lblSleep")}</span>
            </span>
            <span className="flex w-12 flex-col items-center gap-1">
              <AlarmCircle slug={current.slug} />
              <span className="text-[10px] font-medium text-muted">{t("nowPlaying.lblAlarm")}</span>
            </span>
            <span className="flex w-12 flex-col items-center gap-1">
              <CastButton />
              <span className="text-[10px] font-medium text-muted">{t("nowPlaying.lblCast")}</span>
            </span>
            <span className="flex w-12 flex-col items-center gap-1">
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("share.whatsapp")}
                title={t("share.whatsapp")}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[#25d366]/15 text-[#1da851] transition hover:bg-[#25d366]/25"
              >
                <Icon name="whatsapp" size={18} />
              </a>
              <span className="text-[10px] font-medium text-muted">WhatsApp</span>
            </span>
            <span className="flex w-12 flex-col items-center gap-1">
              <button
                type="button"
                onClick={share}
                aria-label={t("share.station")}
                title={shared ? t("share.linkCopied") : t("share.station")}
                className={`flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface transition ${
                  shared ? "text-brand-2 dark:text-accent" : "text-muted hover:text-ink"
                }`}
              >
                <Icon name={shared ? "check" : "share"} size={18} strokeWidth={1.8} />
              </button>
              <span className="text-[10px] font-medium text-muted">{t("nowPlaying.lblShare")}</span>
            </span>
            <span className="flex w-12 flex-col items-center gap-1">
              <button
                type="button"
                onClick={toggleMute}
                aria-label={muted ? t("player.unmute") : t("player.mute")}
                className={`flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface transition ${
                  muted ? "text-brand-2 dark:text-accent" : "text-muted hover:text-ink"
                }`}
              >
                <Icon name={muted ? "volOff" : "vol"} size={18} strokeWidth={1.8} />
              </button>
              <span className="text-[10px] font-medium text-muted">{t("nowPlaying.lblMute")}</span>
            </span>
          </div>

          {/* Volume */}
          <div className="mt-6 flex items-center gap-3.5">
            <Icon name="vol" size={18} className="shrink-0 text-muted" strokeWidth={1.8} />
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={vol}
              onChange={(e) => setVolume(Number(e.target.value))}
              aria-label={t("player.volume")}
              aria-valuetext={`${Math.round(vol * 100)}%`}
              className="vol w-full"
              style={{ "--fill": `${vol * 100}%` } as React.CSSProperties}
            />
            <Icon name="vol" size={18} className="shrink-0 text-ink" strokeWidth={1.8} />
          </div>

          {/* Up next */}
          {upNext && (
            <>
              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                {t("player.upNext")}
              </p>
              <button
                type="button"
                onClick={next}
                className="mt-2 flex w-full items-center gap-3 rounded-[14px] border border-border bg-surface px-2.5 py-2 text-left transition hover:border-brand-2/50"
              >
                <StationLogo src={upNext.favicon} fallbackSrc={upNext.faviconAlt} name={upNext.name} size={32} className="h-8 w-8 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink">
                    {upNext.name}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] capitalize text-muted">
                    {gn(upNext.genre)} {upNext.bitrate ? `· ${upNext.bitrate}k` : ""}
                  </span>
                </span>
                <Icon name="chevR" size={18} className="text-muted" />
              </button>
            </>
          )}

          {/* Sponsored card — self-ads only inside overlays (§6.3) */}
          {npAds.length > 0 && (
            <div className="mt-4">
              <AdSlotClient slot="np-sponsored" campaigns={npAds} variant="compact" />
            </div>
          )}
          <p className="mt-5 text-center text-[11px] text-muted">
            <Link href={`/station/${current.slug}`} onClick={onClose} className="font-medium text-brand-2 underline-offset-2 hover:underline dark:text-accent">
              {t("station.openPage")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
