import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact & grievance",
  description: `Contact ${SITE.name} — support, station submissions, takedowns, and the Grievance Officer under the IT Rules, 2021.`,
};

const ROWS: { title: string; body: string; email: string }[] = [
  {
    title: "General & support",
    body: "Questions, feedback, bug reports, or a station that isn't playing.",
    email: SITE.email.general,
  },
  {
    title: "Station submissions & corrections",
    body: "Get your station listed, update its details, or supply a better stream/logo.",
    email: SITE.email.stations,
  },
  {
    title: "Copyright & takedown",
    body: "Removal requests from broadcasters or rights holders — see the DMCA page for what's needed.",
    email: SITE.email.dmca,
  },
];

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl py-10">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
        Contact us
      </h1>
      <p className="mt-3 text-sm text-muted">
        We read every message. Pick the mailbox that fits — it helps us reply
        faster.
      </p>

      <div className="mt-6 space-y-3">
        {ROWS.map((r) => (
          <div
            key={r.title}
            className="rounded-2xl border border-border bg-surface p-4"
          >
            <p className="font-display text-sm font-semibold text-ink">
              {r.title}
            </p>
            <p className="mt-1 text-xs text-muted">{r.body}</p>
            <a
              href={`mailto:${r.email}`}
              className="mt-2 inline-block text-xs font-semibold text-brand-2 underline-offset-2 hover:underline dark:text-accent"
            >
              {r.email}
            </a>
          </div>
        ))}
      </div>

      {/* Grievance Officer — IT (Intermediary Guidelines and Digital Media
          Ethics Code) Rules, 2021 disclosure */}
      <section className="mt-8 rounded-2xl border border-border bg-accent-soft p-5">
        <h2 className="font-display text-base font-semibold text-accent-ink">
          Grievance Officer
        </h2>
        <p className="mt-2 text-xs leading-6 text-accent-ink/80">
          As required under the Information Technology (Intermediary
          Guidelines and Digital Media Ethics Code) Rules, 2021, complaints
          about content on {SITE.name} may be addressed to our Grievance
          Officer:
        </p>
        <p className="mt-3 text-xs font-semibold text-accent-ink">
          Grievance Officer, {SITE.name}
        </p>
        <a
          href={`mailto:${SITE.email.grievance}?subject=Grievance`}
          className="mt-1 inline-block text-xs font-semibold text-brand-2 underline-offset-2 hover:underline"
        >
          {SITE.email.grievance}
        </a>
        <p className="mt-3 text-xs leading-6 text-accent-ink/80">
          Complaints are acknowledged within 24 hours and resolved within 15
          days. Please include the station name or page URL your complaint is
          about.
        </p>
      </section>
    </div>
  );
}
