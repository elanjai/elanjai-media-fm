import { NextResponse } from "next/server";

/**
 * ads.txt (F-4.3, §6.2 readiness) — declares our single authorized
 * seller when AdSense is configured. Without a publisher id there is
 * nothing to declare: 404, which is the correct ads.txt signal.
 * `f08c47fec0942fa0` is Google's fixed TAG certification-authority id.
 */
export function GET() {
  const pub = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!pub) return new NextResponse("not found", { status: 404 });
  return new NextResponse(`google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
