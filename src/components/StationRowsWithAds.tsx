import { Fragment } from "react";
import type { PublicStation } from "@/lib/types";
import AdSlot from "./AdSlot";
import StationRow from "./StationRow";

/**
 * Station list with in-feed ad slots (F-4.2, placement map §6.3):
 * after row 8, then every 12 rows, capped at 3 ads per page. Ads span
 * the full grid width and never enter the playback queue.
 */
const AD_POSITIONS = new Set([7, 19, 31]);

export default function StationRowsWithAds({
  stations,
  language,
}: {
  stations: PublicStation[];
  language?: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
      {stations.map((s, i) => (
        <Fragment key={s.id}>
          <StationRow station={s} queue={stations} />
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
