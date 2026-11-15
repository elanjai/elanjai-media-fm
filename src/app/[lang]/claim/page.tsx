import type { Metadata } from "next";
import ClaimForm from "@/components/ClaimForm";
import { getStationBySlug, toPublic } from "@/lib/data";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Claim your station",
  description: `Broadcaster portal — claim your station's listing on ${SITE.name} to correct details, supply a better logo, and see listener stats.`,
  robots: { index: false },
};

/**
 * F-5.3 — the intake step of the broadcaster portal. Claims land in
 * the admin inbox for verification; a claimed station later gains
 * metadata editing + listener stats.
 */
export default async function ClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const { slug } = await searchParams;
  const station = slug ? getStationBySlug(slug) : undefined;
  const pub = station ? toPublic(station) : null;

  return (
    <div className="mx-auto max-w-2xl py-10">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
        Claim your station
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        Work for {pub ? pub.name : "a station listed on Elanjai FM"}? Claim
        the listing to correct details, supply a better logo or stream,
        and get listener stats. Claims are verified by hand before
        anything changes.
      </p>
      <ClaimForm
        slug={pub?.slug ?? slug ?? ""}
        stationName={pub?.name ?? ""}
        fixed={Boolean(pub)}
      />
    </div>
  );
}
