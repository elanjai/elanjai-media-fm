import type { Metadata } from "next";
import { Suspense } from "react";
import SearchClient from "@/components/SearchClient";
import { eligibleCampaigns } from "@/lib/ads";
import { getFeatured, getGenres, toPublic, todayCached } from "@/lib/data";
import { dictionaryFor, hasLocale } from "@/i18n";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = await dictionaryFor(hasLocale(lang) ? lang : "en");
  return {
    title: dict.search.title,
    robots: { index: false },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  return (
    <div className="py-5">
      <Suspense fallback={<div className="h-12 rounded-full bg-surface-2" />}>
        <SearchClient
          initialQ={q}
          trending={getFeatured(6).map(toPublic)}
          genres={getGenres()}
          adCampaigns={eligibleCampaigns("search-infeed", { today: await todayCached() })}
        />
      </Suspense>
    </div>
  );
}
