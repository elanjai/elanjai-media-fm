import type { Metadata } from "next";
import Link from "@/components/LangLink";
import { SITE } from "@/lib/site";
import { dictionaryFor, fmt, getDictionary, hasLocale } from "@/i18n";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = await dictionaryFor(hasLocale(lang) ? lang : "en");
  return {
    title: dict.meta.addStationTitle,
    description: fmt(dict.meta.addStationDesc, { site: SITE.name }),
  };
}

export default async function AddStationPage() {
  const dict = await getDictionary();
  return (
    <div className="mx-auto max-w-2xl py-10">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{dict.footer.addStation}</h1>
      <p className="mt-3 text-muted">
        Run a radio station? Listing is free. Send us the details below and we&apos;ll review
        and add it — usually within a few days. Stations must own the rights to their stream
        or hold a valid broadcast license.
      </p>
      <ul className="mt-6 space-y-3 text-sm text-ink">
        {[
          dict.addStation.item1,
          dict.addStation.item2,
          dict.addStation.item3,
          dict.addStation.item4,
          dict.addStation.item5,
        ].map((item, i) => (
          <li key={item} className="flex gap-3 rounded-xl border border-border bg-surface p-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-ink">
              {i + 1}
            </span>
            {item}
          </li>
        ))}
      </ul>
      <a
        href={`mailto:${SITE.email.stations}?subject=New%20station%20submission`}
        className="mt-6 inline-block rounded-full bg-accent px-6 py-2.5 font-semibold text-accent-ink shadow-md transition hover:brightness-105"
      >
        {dict.addStation.submit}
      </a>
      <p className="mt-4 text-xs text-muted">
        {dict.addStation.footer1}{" "}
        <Link href="/claim" className="underline">
          {dict.claim.title}
        </Link>
        . {dict.addStation.footer2}{" "}
        <Link href="/dmca" className="underline">{dict.footer.dmca} page</Link>.
      </p>
    </div>
  );
}
