import type { Metadata } from "next";
import ClientStationList from "@/components/ClientStationList";
import Link from "@/components/LangLink";
import { dictionaryFor, getDictionary, hasLocale } from "@/i18n";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = await dictionaryFor(hasLocale(lang) ? lang : "en");
  return {
    title: dict.favorites.title,
    robots: { index: false },
  };
}

export default async function FavoritesPage() {
  const dict = await getDictionary();
  return (
    <div className="py-6">
      <h1 className="font-display text-[27px] font-semibold tracking-tight text-ink">
        {dict.favorites.title}
      </h1>
      <p className="mt-1 text-xs text-muted">{dict.favorites.deviceOnly}</p>
      <Link
        href="/simple"
        className="mt-4 flex items-center justify-between rounded-[18px] border border-brand-2/30 bg-brand-2/5 px-4 py-3 no-underline transition hover:border-brand-2/60 dark:border-accent/30 dark:bg-accent/10"
      >
        <span className="text-[13px] font-semibold text-brand-2 dark:text-accent">
          {dict.simple.promo}
        </span>
        <span className="shrink-0 text-xs font-bold text-brand-2 dark:text-accent">
          {dict.simple.promoCta}
        </span>
      </Link>
      <div className="mt-5">
        <ClientStationList kind="favorites" />
      </div>
    </div>
  );
}
