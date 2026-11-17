import type { Metadata } from "next";
import Icon from "@/components/Icon";
import { dictionaryFor, getDictionary, hasLocale } from "@/i18n";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = await dictionaryFor(hasLocale(lang) ? lang : "en");
  return {
    title: dict.meta.offlineTitle,
    robots: { index: false },
  };
}

/** Offline shell — the service worker serves this when navigation fails. */
export default async function OfflinePage() {
  const dict = await getDictionary();
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center py-24 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-brand text-accent shadow-md">
        <Icon name="wifi" size={30} strokeWidth={1.8} />
      </span>
      <h1 className="mt-5 font-display text-xl font-bold text-ink">
        {dict.offline.title}
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        {dict.offline.body}
      </p>
    </div>
  );
}
