import type { Metadata } from "next";
import Link from "@/components/LangLink";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of use",
  description: `Terms of use for ${SITE.name} — a free directory of public Indian radio streams.`,
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl py-10 text-sm leading-7 text-ink">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
        Terms of use
      </h1>

      <h2 className="mt-6 font-bold text-ink">The service</h2>
      <p className="mt-2 text-muted">
        {SITE.name} is a free directory that catalogs publicly available
        internet radio streams so you can find and play them in one place.
        Station names, logos, schedules and audio remain the property of
        their respective broadcasters.
      </p>

      <h2 className="mt-6 font-bold text-ink">Acceptable use</h2>
      <p className="mt-2 text-muted">
        Listen for personal, non-commercial enjoyment. Do not scrape the
        catalog at scale, abuse or automate the stream proxy, embed our proxy
        endpoints as your own site&apos;s stream source, or misrepresent the
        service as the broadcaster of any station.
      </p>

      <h2 className="mt-6 font-bold text-ink">No warranty</h2>
      <p className="mt-2 text-muted">
        Streams are operated by third-party broadcasters and may move,
        change, or go offline without notice. The service is provided
        &quot;as is&quot; without warranties of any kind; we don&apos;t
        guarantee availability of any station or metadata.
      </p>

      <h2 className="mt-6 font-bold text-ink">Broadcasters</h2>
      <p className="mt-2 text-muted">
        If you operate a listed station, you may request listing changes or
        removal at any time — see our{" "}
        <Link href="/dmca" className="text-brand-2 underline dark:text-accent">
          DMCA page
        </Link>{" "}
        or email{" "}
        <a
          href={`mailto:${SITE.email.stations}`}
          className="text-brand-2 underline dark:text-accent"
        >
          {SITE.email.stations}
        </a>
        . Listing does not imply endorsement by or affiliation with any
        broadcaster.
      </p>

      <h2 className="mt-6 font-bold text-ink">Changes</h2>
      <p className="mt-2 text-muted">
        We may update these terms as the service evolves; the current version
        is always on this page. Questions:
        <a
          href={`mailto:${SITE.email.general}`}
          className="mx-1 text-brand-2 underline dark:text-accent"
        >
          {SITE.email.general}
        </a>
        .
      </p>
    </div>
  );
}
