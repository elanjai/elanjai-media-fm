import type { Metadata } from "next";
import StatsView from "@/components/StatsView";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Your listening stats",
  description: `Listening time, sessions, and top stations on ${SITE.name} — counted on this device only, never sent anywhere.`,
  alternates: { canonical: `${SITE.url}/en/stats` },
};

/**
 * F-5.7 — local-first listening stats. Everything is localStorage:
 * no beacons, no account, so the page is honest about describing
 * "this device" rather than "you".
 */
export default function StatsPage() {
  return (
    <div className="mx-auto max-w-2xl py-10">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
        Your listening stats
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        How long you listen and which stations you keep coming back to —
        counted only while a stream is playing, stored only on this
        device, and never sent to our servers. Clearing browser data
        resets it.
      </p>
      <StatsView />
    </div>
  );
}
