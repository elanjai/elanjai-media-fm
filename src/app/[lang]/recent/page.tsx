import type { Metadata } from "next";
import ClientStationList from "@/components/ClientStationList";
import { dictionaryFor, fmt, getDictionary, hasLocale } from "@/i18n";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = await dictionaryFor(hasLocale(lang) ? lang : "en");
  return {
    title: dict.recent.title,
    robots: { index: false },
  };
}

export default async function RecentPage() {
  const dict = await getDictionary();
  return (
    <div className="py-6">
      <h1 className="font-display text-[27px] font-semibold tracking-tight text-ink">
        {dict.recent.title}
      </h1>
      <p className="mt-1 text-xs text-muted">
        {fmt(dict.recent.deviceOnly, { count: 20 })}
      </p>
      <div className="mt-5">
        <ClientStationList kind="recents" />
      </div>
    </div>
  );
}
