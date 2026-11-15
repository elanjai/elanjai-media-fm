import { NextRequest, NextResponse } from "next/server";
import { getCities } from "@/lib/data";
import { SITE } from "@/lib/site";

/**
 * "Near me" — coarse server-side IP geolocation, no permission prompt.
 * Reads the geo headers edge/CDN layers already set (Cloudflare,
 * Vercel, App Engine); matches the header city to a catalog city and
 * redirects there. Anything unresolvable lands on the city index.
 */
export function GET(request: NextRequest) {
  const h = request.headers;
  const raw =
    h.get("cf-ipcity") ||
    h.get("x-vercel-ip-city") ||
    h.get("x-appengine-city") ||
    "";
  const guess = decodeURIComponent(raw).trim().toLowerCase();

  let slug: string | null = null;
  if (guess) {
    for (const c of getCities()) {
      if (
        c.slug === guess ||
        c.name.toLowerCase() === guess ||
        c.name.toLowerCase().startsWith(guess)
      ) {
        slug = c.slug;
        break;
      }
    }
  }
  return NextResponse.redirect(`${SITE.url}${slug ? `/city/${slug}` : "/city"}`);
}
