import { NextRequest, NextResponse } from "next/server";
import { campaigns } from "@/lib/ads";
import { recordAdEvent } from "@/lib/adserve";

/**
 * Click-through redirect (F-4.2): /go/<campaign>?s=<slot> counts the
 * click then 302s to the creative URL — internal paths stay internal,
 * external advertiser links leave with rel="sponsored noopener" from
 * the slot markup.
 */
export function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return params.then(({ id }) => {
    const c = campaigns.find((x) => x.id === id);
    const url = c?.creative.url;
    if (!c || !url) return internalRedirect("/");
    const slot = request.nextUrl.searchParams.get("s")?.slice(0, 40) ?? "unknown";
    recordAdEvent(c.id, `go:${slot}`, "clk");
    // Only http(s) external URLs or same-site paths — never open redirects
    // ("//host" stays excluded: it is scheme-relative, not same-site).
    // Same-site paths go out as a relative Location: request.url resolves
    // to the container bind address (0.0.0.0:$PORT) behind Railway's proxy,
    // so new URL(path, request.url) would 302 listeners to a dead host.
    if (url.startsWith("/") && !url.startsWith("//")) return internalRedirect(url);
    return /^https?:/i.test(url)
      ? NextResponse.redirect(new URL(url), 302)
      : internalRedirect("/");
  });
}

function internalRedirect(path: string) {
  return new NextResponse(null, {
    status: 302,
    headers: { Location: path },
  });
}
