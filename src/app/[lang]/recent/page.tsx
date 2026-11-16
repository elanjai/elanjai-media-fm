import type { Metadata } from "next";
import ClientStationList from "@/components/ClientStationList";
import { getDictionary } from "@/i18n";

export const metadata: Metadata = {
  title: "Recently played",
  robots: { index: false },
};

export default async function RecentPage() {
  const dict = await getDictionary();
  return (
    <div className="py-6">
      <h1 className="font-display text-[27px] font-semibold tracking-tight text-ink">
        {dict.recent.title}
      </h1>
      <p className="mt-1 text-xs text-muted">Last 20 stations · this device only.</p>
      <div className="mt-5">
        <ClientStationList kind="recents" />
      </div>
    </div>
  );
}
