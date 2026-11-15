import type { Metadata } from "next";
import { Suspense } from "react";
import SearchClient from "@/components/SearchClient";
import { getFeatured, getGenres, toPublic } from "@/lib/data";

export const metadata: Metadata = {
  title: "Search stations",
  robots: { index: false },
};

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  return (
    <div className="py-5">
      <Suspense fallback={<div className="h-12 rounded-full bg-surface-2" />}>
        <SearchClient
          initialQ={q}
          trending={getFeatured(6).map(toPublic)}
          genres={getGenres()}
        />
      </Suspense>
    </div>
  );
}
