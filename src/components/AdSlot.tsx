import { eligibleCampaigns, type Campaign } from "@/lib/ads";
import { todayCached } from "@/lib/data";
import AdSlotClient from "./AdSlotClient";

/**
 * Server-side ad slot (F-4.2): resolves the eligible campaign set once
 * (schedule + slot + language targeting) and hands it to the client
 * island, which does the per-listener weighted pick, frequency cap and
 * viewability beacon. Fixed min-height — the slot never shifts layout.
 */
export default async function AdSlot({
  id,
  language,
  kinds,
  variant = "card",
  className = "",
}: {
  /** Slot id from the placement map, e.g. "home-infeed-1". */
  id: string;
  /** Language slug for targeted campaigns (genre pages etc.). */
  language?: string;
  /** Restrict campaign kinds — e.g. self-ads only in overlays. */
  kinds?: Campaign["kind"][];
  /** "card" = full creative, "compact" = single-line sponsored row. */
  variant?: "card" | "compact";
  className?: string;
}) {
  const today = await todayCached();
  const eligible = eligibleCampaigns(id, { today, language, kinds });
  if (!eligible.length) return null;
  return (
    <div className={className} data-ad-slot={id}>
      <AdSlotClient slot={id} campaigns={eligible} variant={variant} />
    </div>
  );
}
