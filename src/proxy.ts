import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Locale router (F-3.1, "proxy" = middleware in this Next version):
 * every UI page lives under /[lang]; paths without a locale prefix get
 * redirected to the best Accept-Language match.
 *
 * API routes, /near-me, /embed, static assets and metadata files skip
 * the matcher entirely — only navigable page paths are prefixed.
 */
const LOCALES = ["en", "ta", "hi"];
const DEFAULT_LOCALE = "en";

function detectLocale(request: NextRequest): string {
  const header = request.headers.get("accept-language") ?? "";
  for (const part of header.split(",")) {
    const base = part.split(";")[0].trim().toLowerCase().split("-")[0];
    if ((LOCALES as string[]).includes(base)) return base;
  }
  return DEFAULT_LOCALE;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasLocale = LOCALES.some(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  );
  if (hasLocale) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/${detectLocale(request)}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // UI pages only: skip _next, api, assets, metadata files, /near-me,
    // /embed, /go ad redirects, /admin reports, and file-extension paths.
    "/((?!api|_next|_vercel|near-me|embed|go|admin|.*\\..*).*)",
  ],
};
