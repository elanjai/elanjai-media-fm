import type { Metadata } from "next";
import Icon from "@/components/Icon";
import { getDictionary } from "@/i18n";

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false },
};

/** Offline shell — the service worker serves this when navigation fails. */
export default async function OfflinePage() {
  const dict = await getDictionary();
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center py-24 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-brand text-accent shadow-md">
        <Icon name="wifi" size={30} strokeWidth={1.8} />
      </span>
      <h1 className="mt-5 font-display text-xl font-bold text-ink">
        You&apos;re offline
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        No internet connection right now. Your {dict.favorites.title.toLowerCase()} and recent
        stations are saved on this device — they&apos;ll be back as soon as
        you&apos;re online.
      </p>
    </div>
  );
}
