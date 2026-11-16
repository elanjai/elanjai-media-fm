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
    if (!c || !url) return NextResponse.redirect(new URL("/", request.url));
    const slot = request.nextUrl.searchParams.get("s")?.slice(0, 40) ?? "unknown";
    recordAdEvent(c.id, `go:${slot}`, "clk");
    // Only http(s) external URLs or same-site paths — never open redirects.
    const safe = url.startsWith("/")
      ? new URL(url, request.url)
      : /^https?:/i.test(url)
        ? new URL(url)
        : new URL("/", request.url);
    return NextResponse.redirect(safe, 302);
  });
}
