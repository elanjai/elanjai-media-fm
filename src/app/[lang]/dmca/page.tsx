import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { dictionaryFor, getDictionary, hasLocale } from "@/i18n";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = await dictionaryFor(hasLocale(lang) ? lang : "en");
  return {
    title: dict.meta.dmcaTitle,
    robots: { index: false },
  };
}

export default async function DmcaPage() {
  const dict = await getDictionary();
  return (
    <div className="mx-auto max-w-2xl py-10 text-sm leading-7 text-ink">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
        {dict.meta.dmcaTitle}
      </h1>
      <p className="mt-4 text-muted">
        {SITE.name} is a directory. We do not host, re-encode, or restream any audio — playback
        connects your browser to the broadcaster&apos;s own public stream, the same stream they
        publish for their own listeners.
      </p>
      <p className="mt-3 text-muted">
        If you operate a listed station and want it removed or the metadata corrected, email
        <a href={`mailto:${SITE.email.dmca}`} className="mx-1 text-brand-2 underline dark:text-accent">
          {SITE.email.dmca}
        </a>
        from a domain associated with the station, including the station name and its page URL.
        Verified removal requests are processed within 7 days.
      </p>
      <p className="mt-3 text-muted">
        All station names, logos, and streams remain the property of their respective owners.
        Logos are displayed under fair-use nominative principles solely to identify the station.
      </p>
    </div>
  );
}
