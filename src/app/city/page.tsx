import type { Metadata } from "next";
import Link from "next/link";
import Icon from "@/components/Icon";
import { getCities } from "@/lib/data";

export const metadata: Metadata = {
  title: "Radio by city",
  description: "Listen to live local radio from Indian cities — Chennai, Mumbai, Delhi, Bengaluru, Kolkata and more.",
};

export default function CitiesPage() {
  const cities = getCities();
  return (
    <div className="py-6">
      <h1 className="font-display text-[27px] font-semibold leading-[1.15] tracking-tight text-ink sm:text-3xl">
        Radio by city
      </h1>
      <p className="mt-2 text-xs text-muted">
        {cities.length} cities — local stations, closest first
      </p>
      <Link
        href="/near-me"
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-[13px] font-bold text-accent-ink shadow-sm transition hover:brightness-105"
      >
        <Icon name="signal" size={15} />
        Near me
      </Link>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cities.map((c) => (
          <Link
            key={c.slug}
            href={`/city/${c.slug}`}
            className="rounded-2xl border border-border bg-surface p-4 transition hover:border-brand-2/50"
          >
            <p className="font-display text-[15px] font-semibold text-ink">{c.name}</p>
            <p className="mt-1 text-xs text-muted">
              {c.count} stations{c.state ? ` · ${c.state}` : ""}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
