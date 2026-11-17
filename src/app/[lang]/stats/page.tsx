import type { Metadata } from "next";
import StatsView from "@/components/StatsView";
import { SITE } from "@/lib/site";
import { dictionaryFor, fmt, getDictionary, hasLocale } from "@/i18n";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = await dictionaryFor(hasLocale(lang) ? lang : "en");
  return {
    title: dict.meta.statsTitle,
    description: fmt(dict.meta.statsDesc, { site: SITE.name }),
    alternates: { canonical: `${SITE.url}/en/stats` },
  };
}

/**
 * F-5.7 — local-first listening stats. Everything is localStorage:
 * no beacons, no account, so the page is honest about describing
 * "this device" rather than "you".
 */
export default async function StatsPage() {
  const dict = await getDictionary();
  return (
    <div className="mx-auto max-w-2xl py-10">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
        {dict.stats.title}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        {dict.stats.intro}
      </p>
      <StatsView />
    </div>
  );
}
