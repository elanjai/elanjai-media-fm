/**
 * Consent foundation (F-4.1). One localStorage record gates every
 * non-essential signal we send — first-party analytics plus AdSense
 * personalization (F-4.3: `ads` controls requestNonPersonalizedAds).
 * No consent recorded =
 * nothing sent; essential playback/beacon endpoints (stream reports,
 * trending plays) stay consent-free because they carry no identifiers
 * beyond the per-tab session id.
 */
export type ConsentState = {
  v: 1;
  /** First-party aggregate analytics (pageviews, feature use). */
  analytics: boolean;
  /** Personalized advertising — reserved; AdSense is not live yet. */
  ads: boolean;
  decidedAt: number;
};

const KEY = "emfm:consent";
const EVENT = "emfm:consent-changed";

export function getConsent(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as ConsentState;
    return c.v === 1 ? c : null;
  } catch {
    return null;
  }
}

export function setConsent(analytics: boolean, ads: boolean) {
  const c: ConsentState = { v: 1, analytics, ads, decidedAt: Date.now() };
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
    window.dispatchEvent(new CustomEvent(EVENT, { detail: c }));
  } catch {
    /* storage denied — treat as declined */
  }
}

export function onConsentChange(fn: (c: ConsentState) => void) {
  const h = (e: Event) => fn((e as CustomEvent<ConsentState>).detail);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}

export const analyticsAllowed = () => getConsent()?.analytics === true;
