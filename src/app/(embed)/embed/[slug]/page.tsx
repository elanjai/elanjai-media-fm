import { notFound } from "next/navigation";
import EmbedPlayer from "@/components/EmbedPlayer";
import { getStationBySlug, getStations, getCity } from "@/lib/data";
import { SITE } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  // Cache Components requires ≥1 result — prerender every catalog slug so
  // embed iframes load instantly.
  return getStations().map((s) => ({ slug: s.slug }));
}

/**
 * Public embeddable player — /embed/<slug> (F-3.5).
 * Plays the broadcaster's own stream URL directly (the app's /api/stream
 * proxy refuses cross-site requests anyway, and direct keeps our bandwidth
 * near zero). http-only and CORS-blocked streams degrade to a "Listen on
 * Elanjai FM" fallback inside the card.
 */
export default async function EmbedPage({ params }: Props) {
  const { slug } = await params;
  const s = getStationBySlug(slug);
  if (!s) notFound();

  // Prefer an https non-HLS stream for the embed; fall back to whatever the
  // catalog has — the client handles hls.js or the fallback state.
  const direct = s.streams.find((v) => v.url.startsWith("https") && !v.hls);
  const primary = direct ?? s.streams[0];
  const city = s.city ? getCity(s.city)?.name : null;
  const label = [
    s.languages[0] ? s.languages[0][0].toUpperCase() + s.languages[0].slice(1) : "India",
    city,
    s.frequency_mhz ? `${s.frequency_mhz} FM` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <EmbedPlayer
      name={s.name}
      sub={label}
      logo={s.favicon}
      // Unprefixed on purpose: the proxy redirects the click to the
      // visitor's own locale.
      stationUrl={`${SITE.url}/station/${s.slug}`}
      streamUrl={primary?.url ?? ""}
      hls={primary?.hls ?? false}
    />
  );
}
