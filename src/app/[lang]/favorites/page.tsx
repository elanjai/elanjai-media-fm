import type { Metadata } from "next";
import ClientStationList from "@/components/ClientStationList";
import { getDictionary } from "@/i18n";

export const metadata: Metadata = {
  title: "Your favorites",
  robots: { index: false },
};

export default async function FavoritesPage() {
  const dict = await getDictionary();
  return (
    <div className="py-6">
      <h1 className="font-display text-[27px] font-semibold tracking-tight text-ink">
        {dict.favorites.title}
      </h1>
      <p className="mt-1 text-xs text-muted">Saved on this device only.</p>
      <div className="mt-5">
        <ClientStationList kind="favorites" />
      </div>
    </div>
  );
}
