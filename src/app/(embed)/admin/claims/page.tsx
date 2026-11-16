import { notFound } from "next/navigation";
import { getClaims } from "@/lib/claims";

export const metadata = { title: "Station claims", robots: { index: false } };

// Reads searchParams (the ?key= gate) — always render on request.
export const instant = false;

/**
 * Broadcaster claim inbox (F-5.3) — same ADMIN_ADS_KEY gate as
 * /admin/ads. Claims arrive via /api/claim; verify against the
 * station's public footprint before acting.
 */
export default async function ClaimsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  const expected = process.env.ADMIN_ADS_KEY;
  if (!expected || key !== expected) notFound();

  const rows = getClaims();

  return (
    <main className="mx-auto max-w-4xl p-6 font-sans text-sm">
      <h1 className="text-xl font-bold">Elanjai FM — station claims</h1>
      <p className="mt-1 text-xs text-neutral-500">
        In-memory inbox; resets on deploy. Verify the evidence before
        editing catalog data.
      </p>

      {!rows.length ? (
        <p className="mt-6 text-neutral-400">No claims yet.</p>
      ) : (
        <table className="mt-4 w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b uppercase text-neutral-500">
              <th className="py-2 pr-4">Received</th>
              <th className="py-2 pr-4">Station</th>
              <th className="py-2 pr-4">Name · role</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Evidence</th>
              <th className="py-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="align-top border-b border-neutral-100">
                <td className="whitespace-nowrap py-2 pr-4">
                  {new Date(c.t).toISOString().replace("T", " ").slice(0, 16)}
                </td>
                <td className="py-2 pr-4 font-medium">{c.slug}</td>
                <td className="py-2 pr-4">
                  {c.name} · {c.role}
                </td>
                <td className="py-2 pr-4">
                  <a href={`mailto:${c.email}`} className="underline">
                    {c.email}
                  </a>
                </td>
                <td className="max-w-[220px] py-2 pr-4">{c.evidence}</td>
                <td className="max-w-[220px] py-2">{c.message || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
