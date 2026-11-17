import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import {
  dictionaryFor,
  fmt,
  getDictionary,
  hasLocale,
  type Dictionary,
} from "@/i18n";

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  const dict = await dictionaryFor(hasLocale(lang) ? lang : "en");
  return {
    title: dict.meta.contactTitle,
    description: fmt(dict.meta.contactDesc, { site: SITE.name }),
  };
}

const ROWS: {
  title: keyof Dictionary["contact"];
  body: keyof Dictionary["contact"];
  email: string;
}[] = [
  {
    title: "row1Title",
    body: "row1Body",
    email: SITE.email.general,
  },
  {
    title: "row2Title",
    body: "row2Body",
    email: SITE.email.stations,
  },
  {
    title: "row3Title",
    body: "row3Body",
    email: SITE.email.dmca,
  },
];

export default async function ContactPage() {
  const dict = await getDictionary();
  return (
    <div className="mx-auto max-w-2xl py-10">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
        {dict.contact.title}
      </h1>
      <p className="mt-3 text-sm text-muted">
        {dict.contact.intro}
      </p>

      <div className="mt-6 space-y-3">
        {ROWS.map((r) => (
          <div
            key={r.title}
            className="rounded-2xl border border-border bg-surface p-4"
          >
            <p className="font-display text-sm font-semibold text-ink">
              {dict.contact[r.title]}
            </p>
            <p className="mt-1 text-xs text-muted">{dict.contact[r.body]}</p>
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
          {dict.contact.grievanceTitle}
        </h2>
        <p className="mt-2 text-xs leading-6 text-accent-ink/80">
          As required under the Information Technology (Intermediary
          Guidelines and Digital Media Ethics Code) Rules, 2021, complaints
          about content on {SITE.name} may be addressed to our Grievance
          Officer:
        </p>
        <p className="mt-3 text-xs font-semibold text-accent-ink">
          {fmt(dict.contact.grievanceName, { site: SITE.name })}
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
