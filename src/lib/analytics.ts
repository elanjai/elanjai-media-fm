/**
 * First-party analytics beacon (F-4.1). Aggregate counters only —
 * no user id, no fingerprint, no cross-session tracking. Fires only
 * after the listener has opted in via the consent banner; the per-tab
 * session id exists solely to de-dupe counts.
 */
import { analyticsAllowed } from "./consent";
import { sessionId } from "./report";

export type EventName =
  | "pageview"
  | "play"
  | "share"
  | "install"
  | "search"
  | "ad_impression"
  | "ad_click"
  | "report";

export function track(name: EventName, data: Record<string, string> = {}) {
  if (typeof navigator === "undefined" || !analyticsAllowed()) return;
  const payload = JSON.stringify({ e: name, ...data, sid: sessionId() });
  try {
    const blob = new Blob([payload], { type: "application/json" });
    const sent = navigator.sendBeacon?.("/api/event", blob) ?? false;
    if (!sent) {
      fetch("/api/event", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* best-effort */
  }
}
