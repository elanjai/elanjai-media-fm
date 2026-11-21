import type { Metadata } from "next";
import Link from "@/components/LangLink";
import Icon from "@/components/Icon";
import { getCities } from "@/lib/data";
import { dictionaryFor, fmt, fmtCount, getDictionary, hasLocale } from "@/i18n";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = await dictionaryFor(hasLocale(lang) ? lang : "en");
  return {
    title: dict.meta.cityTitle,
    description: dict.meta.cityDesc,
  };
}

export default async function CitiesPage() {
  const dict = await getDictionary();
  const cities = getCities();
  return (
    <div className="py-6">
      <h1 className="font-display text-[27px] font-semibold leading-[1.15] tracking-tight text-ink sm:text-3xl">
        {dict.city.title}
      </h1>
      <p className="mt-2 text-xs text-muted">
        {fmt(dict.city.subtitle, { count: cities.length })}
      </p>
      <Link
        href="/near-me"
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[13px] font-bold text-accent-ink shadow-sm transition hover:brightness-105"
      >
        <Icon name="signal" size={15} />
        {dict.nav.nearMe}
      </Link>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cities.map((c) => (
          <Link
            key={c.slug}
            href={`/city/${c.slug}`}
            className="rounded-2xl border border-border bg-surface p-4 transition hover:border-brand-2/50"
          >
            <p className="font-display text-[15px] font-semibold text-ink">{c.name}</p>
            <p className="mt-1 text-xs text-muted">
              {fmtCount(dict.common.station, dict.common.stations, c.count)}{c.state ? ` · ${c.state}` : ""}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
