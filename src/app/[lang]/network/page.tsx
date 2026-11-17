import type { Metadata } from "next";
import Link from "@/components/LangLink";
import { getNetworks } from "@/lib/data";
import { dictionaryFor, fmt, getDictionary, hasLocale } from "@/i18n";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = await dictionaryFor(hasLocale(lang) ? lang : "en");
  return {
    title: dict.meta.networkTitle,
    description: dict.meta.networkDesc,
  };
}

export default async function NetworksPage() {
  const dict = await getDictionary();
  const networks = getNetworks();
  return (
    <div className="py-6">
      <h1 className="font-display text-[27px] font-semibold leading-[1.15] tracking-tight text-ink sm:text-3xl">
        {dict.network.title}
      </h1>
      <p className="mt-2 text-xs text-muted">
        {fmt(dict.network.subtitle, { count: networks.length })}
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {networks.map((n) => (
          <Link
            key={n.slug}
            href={`/network/${n.slug}`}
            className="rounded-2xl border border-border bg-surface p-4 transition hover:border-brand-2/50"
          >
            <p className="font-display text-[15px] font-semibold text-ink">{n.name}</p>
            <p className="mt-1 text-xs text-muted">{fmt(dict.network.streams, { count: n.count })}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
