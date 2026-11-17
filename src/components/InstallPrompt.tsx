"use client";

import { useEffect, useRef, useState } from "react";
import { usePlayback } from "./AudioProvider";
import Icon from "./Icon";
import { useT } from "./LocaleProvider";

/**
 * PWA install prompt (F-3.2): shown only after engagement — the second
 * session OR the third station played — never on a first visit. The
 * beforeinstallprompt event is captured once; dismissal is remembered
 * for 30 days. iOS Safari (no BIP event) stays quiet.
 */

type BipEvent = Event & { prompt: () => Promise<void> };

const SESSION_KEY = "emfm:pwa-sessions";
const SEEN_KEY = "emfm:pwa-session-seen";
const PLAYS_KEY = "emfm:pwa-plays";
const DISMISS_KEY = "emfm:pwa-dismissed";
const DISMISS_DAYS = 30;

const num = (k: string) => {
  try {
    return Number(localStorage.getItem(k) ?? 0) || 0;
  } catch {
    return 0;
  }
};
const set = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode */
  }
};

export default function InstallPrompt() {
  const { status, current } = usePlayback();
  const t = useT();
  const [deferred, setDeferred] = useState<BipEvent | null>(null);
  const [engaged, setEngaged] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const countedRef = useRef<Set<string>>(new Set());

  // Gate reads live at event/microtask time (Date.now/localStorage are
  // impure for render): second session OR third distinct station played,
  // and not dismissed within the last DISMISS_DAYS.
  const checkEngaged = () => {
    if (typeof window === "undefined") return false;
    const dismissedAt = num(DISMISS_KEY);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86400_000)
      return false;
    const plays = (JSON.parse(localStorage.getItem(PLAYS_KEY) ?? "[]") as string[])
      .length;
    return num(SESSION_KEY) >= 2 || plays >= 3;
  };
  const refresh = () => queueMicrotask(() => setEngaged(checkEngaged()));

  // Count one session per browser session.
  useEffect(() => {
    if (!sessionStorage.getItem(SEEN_KEY)) {
      sessionStorage.setItem(SEEN_KEY, "1");
      set(SESSION_KEY, String(num(SESSION_KEY) + 1));
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Count distinct stations played (ever) — "third play" gate.
  useEffect(() => {
    if (status !== "playing" || !current) return;
    if (countedRef.current.has(current.slug)) return;
    countedRef.current.add(current.slug);
    const seen = new Set(
      (() => {
        try {
          return JSON.parse(localStorage.getItem(PLAYS_KEY) ?? "[]") as string[];
        } catch {
          return [];
        }
      })()
    );
    if (!seen.has(current.slug)) {
      seen.add(current.slug);
      set(PLAYS_KEY, JSON.stringify([...seen].slice(-50)));
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, current]);

  // Capture the install offer once.
  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BipEvent);
      refresh();
    };
    window.addEventListener("beforeinstallprompt", onBip);
    const onInstalled = () => setDeferred(null);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!deferred || dismissed || !engaged) return null;

  return (
    <div
      role="dialog"
      aria-label={t("pwa.installTitle")}
      className="fixed inset-x-4 bottom-[calc(9rem+max(0.875rem,env(safe-area-inset-bottom)))] z-40 mx-auto max-w-sm rounded-[18px] border border-border bg-surface p-4 shadow-xl md:inset-x-auto md:bottom-24 md:right-6"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-accent">
          <Icon name="download" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-ink">
            {t("pwa.installTitle")}
          </p>
          <p className="mt-0.5 text-xs text-muted">{t("pwa.installHint")}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            set(DISMISS_KEY, String(Date.now()));
            setDismissed(true);
          }}
          aria-label={t("a11y.dismiss")}
          className="hit-expand -mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
        >
          <Icon name="x" size={15} />
        </button>
      </div>
      <button
        type="button"
        onClick={async () => {
          await deferred.prompt();
          setDeferred(null);
        }}
        className="mt-3 w-full rounded-full bg-accent py-2.5 text-[13px] font-semibold text-accent-ink transition hover:brightness-105"
      >
        {t("pwa.installCta")}
      </button>
    </div>
  );
}
