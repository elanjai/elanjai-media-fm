import type { Metadata } from "next";
import Link from "@/components/LangLink";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `How ${SITE.name} handles your data — local-first, no accounts, no tracking.`,
};

const EFFECTIVE = "November 15, 2026";

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl py-10 text-sm leading-7 text-ink">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
        Privacy policy
      </h1>
      <p className="mt-2 text-xs text-muted">Effective: {EFFECTIVE}</p>

      <p className="mt-4 text-muted">
        {SITE.name} is built to be used without telling us anything about
        yourself. There are no accounts and no sign-ups. Optional,
        consent-gated first-party statistics and clearly labelled
        advertising help keep the service free — both are described below
        and neither is required to listen.
      </p>

      <h2 className="mt-6 font-bold text-ink">What stays on your device</h2>
      <p className="mt-2 text-muted">
        Favorites, recently played stations, theme, volume, sleep-timer and
        search preferences are stored in your browser&apos;s localStorage on
        your own device. They never leave your device and are not sent to our
        servers. Clearing your browser storage removes them completely.
      </p>

      <h2 className="mt-6 font-bold text-ink">What our servers see</h2>
      <p className="mt-2 text-muted">
        When you press play on a stream that needs it, your request passes
        through our stream proxy, which sees your IP address and browser
        user-agent like any web server does. We use it only to deliver the
        audio and to prevent abuse of the proxy. For most stations your
        browser connects to the broadcaster&apos;s servers directly — those
        requests are governed by the broadcaster&apos;s own policies.
      </p>

      <h2 className="mt-6 font-bold text-ink">Usage statistics (with your consent)</h2>
      <p className="mt-2 text-muted">
        On your first visit we ask whether you allow first-party usage
        statistics. If you accept, we record aggregate counts — which kinds
        of pages are viewed, which features are used, and which stations are
        played — tied to a random per-tab session id, not to you. We do not
        store your name, contacts, precise location or listening history on
        our servers, and we do not build profiles across visits. Declining
        changes nothing about listening. You can reconsider any time in
        Settings.
      </p>

      <h2 className="mt-6 font-bold text-ink">Advertising</h2>
      <p className="mt-2 text-muted">
        {SITE.name} is funded by advertising. Slots marked
        &ldquo;Sponsored&rdquo; or &ldquo;Ad&rdquo; may show our own house
        promotions, direct-sold campaigns, or — later — programmatic
        partners such as Google AdSense. Ad impressions and clicks are
        counted in aggregate only. If personalized advertising is ever
        enabled, it will be off by default and require the separate
        &ldquo;Personalized ads&rdquo; choice in the consent choices,
        consistent with India&apos;s DPDP Act and, for EEA/UK visitors,
        applicable GDPR consent requirements.
      </p>

      <h2 className="mt-6 font-bold text-ink">Cookies</h2>
      <p className="mt-2 text-muted">
        We do not set cookies ourselves. Consent choices and preferences
        live in your browser&apos;s localStorage. Third-party ad partners,
        if enabled in future, may set their own cookies — that will be
        covered here and gated by your consent choices before it happens.
      </p>

      <h2 className="mt-6 font-bold text-ink">Your rights</h2>
      <p className="mt-2 text-muted">
        Because we keep no account or listener profile data, there is nothing
        of yours to export or delete on our side — everything lives in your
        browser. If you believe we hold personal data about you, contact us
        and we will respond within a reasonable time.
      </p>

      <h2 className="mt-6 font-bold text-ink">Contact</h2>
      <p className="mt-2 text-muted">
        Privacy questions:
        <a
          href={`mailto:${SITE.email.general}`}
          className="mx-1 text-brand-2 underline dark:text-accent"
        >
          {SITE.email.general}
        </a>
        — or see our <Link href="/contact" className="underline">contact page</Link>,
        which also lists our Grievance Officer under the IT Rules, 2021.
      </p>
    </div>
  );
}
