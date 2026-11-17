import type { Metadata } from "next";
import { Suspense } from "react";
import SimpleClient from "@/components/SimpleClient";
import { dictionaryFor, hasLocale } from "@/i18n";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = await dictionaryFor(hasLocale(lang) ? lang : "en");
  return {
    title: dict.meta.simpleTitle,
    description: dict.meta.simpleDesc,
    robots: { index: false },
  };
}

export default function SimplePage() {
  return (
    <Suspense>
      <SimpleClient />
    </Suspense>
  );
}
