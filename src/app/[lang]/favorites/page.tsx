import type { Metadata } from "next";
import ClientStationList from "@/components/ClientStationList";
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
      <div className="mt-5">
        <ClientStationList kind="favorites" />
      </div>
    </div>
  );
}
