import type { Metadata } from "next";
import { getGenres, getStations } from "@/lib/data";
import { SITE } from "@/lib/site";
import { dictionaryFor, fmt, getDictionary, hasLocale } from "@/i18n";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = await dictionaryFor(hasLocale(lang) ? lang : "en");
  return {
    title: dict.meta.aboutTitle,
    description: fmt(dict.meta.aboutDesc, { site: SITE.name }),
  };
}

export default async function AboutPage() {
  const dict = await getDictionary();
  return (
    <div className="mx-auto max-w-2xl py-10 text-sm leading-7">
      <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
        {fmt(dict.about.title, { site: SITE.name })}
      </h1>
      <p className="mt-4 text-muted">
        {fmt(dict.about.intro, {
          site: SITE.name,
          stations: getStations().length,
          languages: getGenres().length,
        })}
      </p>
      <h2 className="mt-6 font-bold text-ink">{dict.about.howTitle}</h2>
      <p className="mt-2 text-muted">
        Radio broadcasters publish live audio streams (Shoutcast, Icecast, HLS) so listeners can
        tune in. We catalog those public endpoints, add search, genres and a player, and your
        browser connects to the broadcaster&apos;s stream through our lightweight proxy — we
        never re-host or modify the audio.
      </p>
      <h2 className="mt-6 font-bold text-ink">{dict.about.freeTitle}</h2>
      <p className="mt-2 text-muted">
        Because the audio comes from the broadcasters&apos; own servers, running the directory is
        cheap. No accounts, no paywall. Broadcasters keep full control of their streams and can
        request removal anytime via our DMCA page.
      </p>
    </div>
  );
}
