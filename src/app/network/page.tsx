import type { Metadata } from "next";
import Link from "next/link";
import { getNetworks } from "@/lib/data";

export const metadata: Metadata = {
  title: "Radio by network",
  description: "Listen to every stream from India's big radio networks — All India Radio, Radio Mirchi, Red FM, Big FM and more.",
};

export default function NetworksPage() {
  const networks = getNetworks();
  return (
    <div className="py-6">
      <h1 className="font-display text-[27px] font-semibold leading-[1.15] tracking-tight text-ink sm:text-3xl">
        Radio by network
      </h1>
      <p className="mt-2 text-xs text-muted">
        {networks.length} broadcaster networks
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {networks.map((n) => (
          <Link
            key={n.slug}
            href={`/network/${n.slug}`}
            className="rounded-2xl border border-border bg-surface p-4 transition hover:border-brand-2/50"
          >
            <p className="font-display text-[15px] font-semibold text-ink">{n.name}</p>
            <p className="mt-1 text-xs text-muted">{n.count} streams</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
