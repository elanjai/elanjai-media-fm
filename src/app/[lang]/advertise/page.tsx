import type { Metadata } from "next";
import Link from "@/components/LangLink";
import { getGenres, getStations } from "@/lib/data";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Advertise with us",
  description: `Reach Indian radio listeners — featured station listings, language- and city-targeted placements, and sponsored audio on ${SITE.name}.`,
  alternates: { canonical: `${SITE.url}/en/advertise` },
};

const PRODUCTS: { name: string; label: string; desc: string }[] = [
  {
    name: "Featured station",
    label: "Sponsored",
    desc: "For broadcasters — especially online-only stations. Your station sits at the top of its language and category pages and in a home rail, playable like any other row. Monthly flat fee.",
  },
  {
    name: "Regional & language placements",
    label: "Sponsored",
    desc: "Banners targeted by language or city — a natural fit for jewellers, textiles, colleges, and festival promotions. Flat CPM or monthly placement.",
  },
  {
    name: "Sponsored audio pre-roll",
    label: "Sponsored",
    desc: "A single ≤15-second message before a listener's first stream of the session — never during a stream, never more than once every 45 minutes. Pilot stage.",
  },
];

const PRINCIPLES: string[] = [
  "Every placement is labeled — “Sponsored” or “Ad” — never disguised as editorial content.",
  "Audio is never interrupted mid-stream; the only audio format is a frequency-capped pre-roll at session start.",
  "Ads never sit next to playback controls, inside the mini player, or on legal/empty-state pages.",
  "No third-party trackers follow listeners around the web — first-party aggregate reporting only.",
];

export default function AdvertisePage() {
  const stations = getStations().length;
  const languages = getGenres().length;
  const mailto = `mailto:${SITE.email.ads}?subject=${encodeURIComponent(
    "Advertising on Elanjai FM"
  )}`;

  return (
    <div className="mx-auto max-w-2xl py-10">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
        Advertise with us
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        {SITE.name} is a free Indian radio directory — {stations}+ live
        stations across {languages} languages, built mobile-first for
        listeners in India and the diaspora. Advertising keeps the app
        free. We run a small number of clearly-labeled placements instead
        of wall-to-wall units.
      </p>

      {/* Audience — honest numbers only */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          [`${stations}+`, "live stations"],
          [`${languages}`, "languages"],
          ["20+", "diaspora markets"],
        ].map(([n, l]) => (
          <div
            key={l}
            className="rounded-2xl border border-border bg-surface p-4 text-center"
          >
            <p className="font-display text-xl font-extrabold text-ink">{n}</p>
            <p className="mt-0.5 text-[11px] text-muted">{l}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-8 font-display text-base font-semibold text-ink">
        What you can book
      </h2>
      <div className="mt-3 space-y-3">
        {PRODUCTS.map((p) => (
          <div
            key={p.name}
            className="rounded-2xl border border-border bg-surface p-4"
          >
            <p className="flex items-center gap-2 font-display text-sm font-semibold text-ink">
              {p.name}
              <span className="rounded bg-muted/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
                {p.label}
              </span>
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">{p.desc}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-8 font-display text-base font-semibold text-ink">
        Our advertising rules
      </h2>
      <ul className="mt-3 space-y-2">
        {PRINCIPLES.map((p) => (
          <li
            key={p}
            className="flex gap-2.5 rounded-2xl border border-border bg-surface px-4 py-3 text-xs leading-5 text-muted"
          >
            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-2" />
            {p}
          </li>
        ))}
      </ul>

      {/* CTA — mail-first media kit until a self-serve flow exists */}
      <div className="mt-8 rounded-2xl border border-brand-2/30 bg-brand-2/5 p-5 text-center">
        <p className="font-display text-sm font-semibold text-ink">
          Introductory pilot pricing
        </p>
        <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-muted">
          We&rsquo;re early — founding advertisers get preferred rates and a
          say in which placements we build next. Tell us who you&rsquo;d like
          to reach and we&rsquo;ll send the current rate card and a one-page
          media kit.
        </p>
        <a
          href={mailto}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold text-accent-ink shadow-md shadow-brand/20 transition hover:brightness-105"
        >
          {SITE.email.ads}
        </a>
        <p className="mt-3 text-[11px] text-muted">
          Broadcaster looking for a free listing instead?{" "}
          <Link
            href="/add-station"
            className="font-semibold text-brand-2 underline-offset-2 hover:underline dark:text-accent"
          >
            Add your station
          </Link>
        </p>
      </div>
    </div>
  );
}
