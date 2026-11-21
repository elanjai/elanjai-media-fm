import { Fragment } from "react";
import type { FeaturedStation } from "@/lib/featured";
import type { PublicStation } from "@/lib/types";
import AdSlot from "./AdSlot";
import SponsoredStationRow from "./SponsoredStationRow";
import StationRow from "./StationRow";

/**
 * Station list with in-feed ad slots (F-4.2, placement map §6.3):
 * after row 8, then every 12 rows, capped at 3 ads per page. Ads span
 * the full grid width and never enter the playback queue.
 * Featured listings (F-4.4) sit on top as real rows — playable and
 * part of the queue — with a "Sponsored" label.
 */
const AD_POSITIONS = new Set([7, 19, 31]);

export default function StationRowsWithAds({
  stations,
  language,
  featured = [],
}: {
  stations: PublicStation[];
  language?: string;
  featured?: FeaturedStation[];
}) {
  const queue = [...featured.map((f) => f.station), ...stations];
  return (
    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
      {featured.map((f) => (
        <SponsoredStationRow
          key={`sp-${f.campaign.id}`}
          station={f.station}
          campaignId={f.campaign.id}
          slot="featured-top"
          queue={queue}
        />
      ))}
      {stations.map((s, i) => (
        <Fragment key={s.id}>
          <StationRow station={s} queue={queue} fav />
          {AD_POSITIONS.has(i) && (
            <div className="md:col-span-2">
              <AdSlot id="list-infeed" language={language} />
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}
