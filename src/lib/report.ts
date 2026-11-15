/**
 * Failure-report beacon (F-1.6). Fire-and-forget — never blocks playback
 * and never throws. sendBeacon keeps it alive through page unload.
 */

const SID_KEY = "emfm:sid";
let sid: string | null = null;

/** One anonymous id per tab session — used only to de-dupe reports. */
function sessionId(): string {
  if (sid) return sid;
  try {
    sid = sessionStorage.getItem(SID_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(SID_KEY, sid);
    }
  } catch {
    sid = `r${Math.random().toString(36).slice(2, 12)}`;
  }
  return sid;
}

function networkType(): string {
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string };
  };
  return nav.connection?.effectiveType ?? "unknown";
}

export function reportStreamIssue(opts: {
  slug: string;
  reason: string;
  ttfa?: number | null;
}) {
  if (typeof navigator === "undefined" || !opts.slug) return;
  const payload = JSON.stringify({
    slug: opts.slug,
    reason: opts.reason,
    ttfa: opts.ttfa ?? null,
    net: networkType(),
    sid: sessionId(),
  });
  try {
    const blob = new Blob([payload], { type: "application/json" });
    const sent = navigator.sendBeacon?.("/api/report", blob) ?? false;
    if (!sent) {
      fetch("/api/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    /* reporting is best-effort */
  }
}
