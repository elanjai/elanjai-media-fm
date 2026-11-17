"use client";

import { useEffect, useRef, useState } from "react";
import { isAdFree } from "@/lib/ads";
import { ADSENSE_CLIENT as CLIENT, ADSENSE_SLOT as SLOT } from "@/lib/adsense";
import { getConsent } from "@/lib/consent";
import { useT } from "./LocaleProvider";

/**
 * Google AdSense manual unit (F-4.3). Renders only when
 * NEXT_PUBLIC_ADSENSE_CLIENT + NEXT_PUBLIC_ADSENSE_SLOT are set, so the
 * code ships dark until the site is AdSense-approved (§6.2 checklist).
 *
 * Privacy: requestNonPersonalizedAds=1 unless the listener explicitly
 * opted into personalized ads in the consent banner (F-4.1). A
 * Google-certified TCF CMP is still required for EEA/UK/CH
 * personalization — until then non-personalized is the safe default.
 * Ad-free supporters (F-4.7) never load the script.
 *
 * Manual units only — Auto ads' anchor/vignette formats would cover
 * the player and tab bar (§6.3 "Never" list).
 */
/** adsbygoogle.js queue — a plain array with an NPA flag set pre-load. */
type AdsbygoogleQueue = unknown[] & { requestNonPersonalizedAds?: number };

declare global {
  interface Window {
    adsbygoogle?: AdsbygoogleQueue;
  }
}

function ensureScript() {
  const q = (window.adsbygoogle = window.adsbygoogle ?? []);
  if (getConsent()?.ads !== true) q.requestNonPersonalizedAds = 1;
  if (document.querySelector('script[data-emfm-adsense="1"]')) return;
  const s = document.createElement("script");
  s.async = true;
  s.crossOrigin = "anonymous";
  s.dataset.emfmAdsense = "1";
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(CLIENT)}`;
  document.head.appendChild(s);
}

export default function AdSenseUnit({
  format = "auto",
  minHeight = 92,
  className = "",
}: {
  /** data-ad-format — "auto" (responsive) or "fluid" (in-feed). */
  format?: "auto" | "fluid" | "rectangle";
  /** Reserved height so the unit never shifts layout (§6.3 rule 3). */
  minHeight?: number;
  className?: string;
}) {
  const t = useT();
  const ref = useRef<HTMLModElement>(null);
  const [adFree, setAdFree] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setAdFree(isAdFree()));
    if (!CLIENT || !SLOT || !ref.current) return;
    ensureScript();
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {
      /* already filled (dev strict-mode remount) */
    }
  }, []);

  if (!CLIENT || !SLOT || adFree) return null;

  return (
    <div
      className={`rounded-[18px] border border-dashed border-border bg-surface p-2 ${className}`}
      role="complementary"
      aria-label={t("sponsored.region")}
      style={{ minHeight }}
    >
      <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wide text-muted">
        {t("sponsored.ad")}
      </p>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={CLIENT}
        data-ad-slot={SLOT}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
