import type { Metadata } from "next";
import Link from "@/components/LangLink";
import { SITE } from "@/lib/site";
import { dictionaryFor, fmt, getDictionary, hasLocale } from "@/i18n";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = await dictionaryFor(hasLocale(lang) ? lang : "en");
  return {
    title: dict.meta.termsTitle,
    description: fmt(dict.meta.termsDesc, { site: SITE.name }),
  };
}

export default async function TermsPage() {
  const dict = await getDictionary();
  return (
    <div className="mx-auto max-w-2xl py-10 text-sm leading-7 text-ink">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
        {dict.terms.title}
      </h1>

      <h2 className="mt-6 font-bold text-ink">{dict.terms.h2Service}</h2>
      <p className="mt-2 text-muted">
        {SITE.name} is a free directory that catalogs publicly available
        internet radio streams so you can find and play them in one place.
        Station names, logos, schedules and audio remain the property of
        their respective broadcasters.
      </p>

      <h2 className="mt-6 font-bold text-ink">{dict.terms.h2Use}</h2>
      <p className="mt-2 text-muted">
        Listen for personal, non-commercial enjoyment. Do not scrape the
        catalog at scale, abuse or automate the stream proxy, embed our proxy
        endpoints as your own site&apos;s stream source, or misrepresent the
        service as the broadcaster of any station.
      </p>

      <h2 className="mt-6 font-bold text-ink">{dict.terms.h2Warranty}</h2>
      <p className="mt-2 text-muted">
        Streams are operated by third-party broadcasters and may move,
        change, or go offline without notice. The service is provided
        &quot;as is&quot; without warranties of any kind; we don&apos;t
        guarantee availability of any station or metadata.
      </p>

      <h2 className="mt-6 font-bold text-ink">{dict.terms.h2Broadcasters}</h2>
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

      <h2 className="mt-6 font-bold text-ink">{dict.terms.h2Changes}</h2>
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
