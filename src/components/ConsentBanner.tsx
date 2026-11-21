"use client";

import { useEffect, useState } from "react";
import { getConsent, setConsent } from "@/lib/consent";
import { useT } from "./LocaleProvider";
import { usePrefs } from "./PrefsProvider";
import Icon from "./Icon";

/**
 * First-visit consent card (F-4.1). Asks once, remembers forever, and the
 * granular choice is honoured by every beacon we send. Renders only when
 * no decision exists — SSR keeps it out of the first paint entirely.
 */
export default function ConsentBanner() {
  const t = useT();
  const [open, setOpen] = useState(false);
  // Read post-mount so SSR and the first client render agree — a
  // localStorage read in the initializer is a hydration mismatch.
  useEffect(() => {
    queueMicrotask(() => setOpen(!getConsent()));
  }, []);
  const [detail, setDetail] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [ads, setAds] = useState(false);
  // The first-run language picker is a bottom sheet at z-50 — showing this
  // z-70 banner on top of it covers the picker's Done/Skip on phones.
  const { langPickerOpen } = usePrefs();

  if (!open || langPickerOpen) return null;

  const decide = (a: boolean, d: boolean) => {
    setConsent(a, d);
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-label={t("consent.title")}
      className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-w-2xl p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <div className="rounded-[20px] border border-border bg-surface p-4 shadow-2xl shadow-black/20">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-2/10 text-brand-2 dark:text-accent">
            <Icon name="check" size={17} strokeWidth={2} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-bold text-ink">{t("consent.title")}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {t("consent.body")}
            </p>
            {detail && (
              <div className="mt-3 space-y-2 rounded-xl border border-border bg-surface-2 p-3">
                <label className="flex items-center justify-between gap-3 text-[13px] font-semibold text-ink">
                  {t("consent.analytics")}
                  <input
                    type="checkbox"
                    checked={analytics}
                    onChange={(e) => setAnalytics(e.target.checked)}
                    className="h-4.5 w-4.5 accent-[#1da851]"
                  />
                </label>
                <p className="text-[11px] leading-relaxed text-muted">
                  {t("consent.analyticsHint")}
                </p>
                <label className="flex items-center justify-between gap-3 text-[13px] font-semibold text-ink">
                  {t("consent.ads")}
                  <input
                    type="checkbox"
                    checked={ads}
                    onChange={(e) => setAds(e.target.checked)}
                    className="h-4.5 w-4.5 accent-[#1da851]"
                  />
                </label>
                <p className="text-[11px] leading-relaxed text-muted">
                  {t("consent.adsHint")}
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => decide(true, ads)}
            className="h-10 rounded-full bg-brand px-4 text-[13px] font-bold text-brand-ink transition hover:brightness-110"
          >
            {t("consent.accept")}
          </button>
          <button
            type="button"
            onClick={() => (detail ? decide(analytics, ads) : setDetail(true))}
            className="h-10 rounded-full border border-border bg-surface px-4 text-[13px] font-semibold text-ink transition hover:border-brand-2/50"
          >
            {detail ? t("consent.save") : t("consent.manage")}
          </button>
          <button
            type="button"
            onClick={() => decide(false, false)}
            className="h-10 px-2 text-xs font-semibold text-muted transition hover:text-ink"
          >
            {t("consent.reject")}
          </button>
        </div>
      </div>
    </div>
  );
}
