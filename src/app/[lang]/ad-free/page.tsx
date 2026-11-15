import type { Metadata } from "next";
import AdFreeClient from "@/components/AdFreeClient";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Ad-free supporter plan",
  description: `Remove every display ad and the sponsored audio pre-roll on ${SITE.name} — a small monthly support that keeps the app free for everyone.`,
  alternates: { canonical: `${SITE.url}/en/ad-free` },
};

/**
 * F-4.7: the supporter plan. NEXT_PUBLIC_ADFREE_URL is the payment
 * link (Razorpay page, UPI intent, etc.) — unset means "coming soon"
 * and nothing is sold. NEXT_PUBLIC_ADFREE_CODE is the optional
 * activation code sent to supporters after payment; when unset the
 * page runs in honor mode (early pilot).
 */
export default function AdFreePage() {
  return (
    <div className="mx-auto max-w-2xl py-10">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
        Go ad-free
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        {SITE.name} is free for everyone and always will be — ads are what
        keep it that way. If you&rsquo;d rather not see them, a small monthly
        support removes every ad on this device.
      </p>

      <div className="mt-6 space-y-3">
        {[
          ["No display ads", "Every banner, sponsored row, and featured listing disappears."],
          ["No audio pre-roll", "Streams start instantly — no sponsored messages first."],
          ["Same privacy", "The flag lives on this device. We don't create an account or track you differently."],
        ].map(([t, d]) => (
          <div key={t} className="flex gap-3 rounded-2xl border border-border bg-surface p-4">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-2" />
            <div>
              <p className="font-display text-sm font-semibold text-ink">{t}</p>
              <p className="mt-0.5 text-xs leading-5 text-muted">{d}</p>
            </div>
          </div>
        ))}
      </div>

      <AdFreeClient
        paymentUrl={process.env.NEXT_PUBLIC_ADFREE_URL ?? ""}
        codeRequired={Boolean(process.env.NEXT_PUBLIC_ADFREE_CODE)}
      />

      <p className="mt-6 text-[11px] leading-5 text-muted">
        Applies to this device and browser only — clear your site data and
        you&rsquo;ll need to activate again. Stream availability doesn&rsquo;t
        change: stations that go offline will still show an error either way.
      </p>
    </div>
  );
}
