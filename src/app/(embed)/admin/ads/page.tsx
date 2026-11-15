import { notFound } from "next/navigation";
import { campaigns } from "@/lib/ads";
import { adStats } from "@/lib/adserve";

export const metadata = { title: "Ads report", robots: { index: false } };

// Reads searchParams (the ?key= gate) — always render on request.
export const instant = false;

/**
 * Password-gated ad reporting (F-4.2). Set ADMIN_ADS_KEY in the
 * environment; the page lives at /admin/ads?key=<token>. Aggregate
 * counters only — there is nothing personal to leak.
 */
export default async function AdsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string; days?: string }>;
}) {
  const { key, days } = await searchParams;
  const expected = process.env.ADMIN_ADS_KEY;
  if (!expected || key !== expected) notFound();

  const window = Math.min(Math.max(Number(days) || 30, 1), 90);
  const rows = adStats(window);

  // Roll up per campaign across days/slots for the headline table.
  const byCampaign = new Map<string, { imp: number; clk: number }>();
  for (const r of rows) {
    const agg = byCampaign.get(r.campaign) ?? { imp: 0, clk: 0 };
    agg.imp += r.imp;
    agg.clk += r.clk;
    byCampaign.set(r.campaign, agg);
  }

  return (
    <main className="mx-auto max-w-4xl p-6 font-sans text-sm">
      <h1 className="text-xl font-bold">Elanjai FM — ads report (last {window} days)</h1>
      <p className="mt-1 text-xs text-neutral-500">
        Aggregate counters only; counters reset on deploy.{" "}
        <a href={`/api/ads/report.csv?key=${encodeURIComponent(key ?? "")}`} className="underline">
          Download CSV
        </a>
      </p>

      <h2 className="mt-6 font-semibold">By campaign</h2>
      <table className="mt-2 w-full border-collapse text-left">
        <thead>
          <tr className="border-b text-xs uppercase text-neutral-500">
            <th className="py-2 pr-4">Campaign</th>
            <th className="py-2 pr-4">Kind</th>
            <th className="py-2 pr-4">Advertiser</th>
            <th className="py-2 pr-4 text-right">Impressions</th>
            <th className="py-2 pr-4 text-right">Clicks</th>
            <th className="py-2 text-right">CTR</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => {
            const agg = byCampaign.get(c.id);
            return (
              <tr key={c.id} className="border-b border-neutral-200">
                <td className="py-2 pr-4 font-medium">{c.id}</td>
                <td className="py-2 pr-4">{c.kind}</td>
                <td className="py-2 pr-4">{c.advertiser}</td>
                <td className="py-2 pr-4 text-right">{agg?.imp ?? 0}</td>
                <td className="py-2 pr-4 text-right">{agg?.clk ?? 0}</td>
                <td className="py-2 text-right">
                  {agg?.imp ? ((agg.clk / agg.imp) * 100).toFixed(2) : "0.00"}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h2 className="mt-6 font-semibold">By day · campaign · slot</h2>
      <table className="mt-2 w-full border-collapse text-left text-xs">
        <thead>
          <tr className="border-b uppercase text-neutral-500">
            <th className="py-1.5 pr-4">Day</th>
            <th className="py-1.5 pr-4">Campaign</th>
            <th className="py-1.5 pr-4">Slot</th>
            <th className="py-1.5 pr-4 text-right">Imp</th>
            <th className="py-1.5 text-right">Clk</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.day}-${r.campaign}-${r.slot}`} className="border-b border-neutral-100">
              <td className="py-1.5 pr-4">{r.day}</td>
              <td className="py-1.5 pr-4">{r.campaign}</td>
              <td className="py-1.5 pr-4">{r.slot}</td>
              <td className="py-1.5 pr-4 text-right">{r.imp}</td>
              <td className="py-1.5 text-right">{r.clk}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-neutral-400">
                No ad events recorded yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
