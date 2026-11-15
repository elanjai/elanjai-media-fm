"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicStation } from "@/lib/types";
import { adBeacon, isAdFree } from "@/lib/ads";
import StationRow from "./StationRow";

/**
 * Featured-listing row (F-4.4): a real StationRow — playable, in-queue —
 * carrying a "Sponsored" label and the same ≥50%/1s impression beacon
 * as ad slots, so broadcaster reports stay honest. Ad-free supporters
 * (F-4.7) don't see it.
 */


export default function SponsoredStationRow({
  station,
  campaignId,
  slot,
  queue,
}: {
  station: PublicStation;
  campaignId: string;
  slot: string;
  queue?: PublicStation[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [adFree, setAdFree] = useState(false);
  const sent = useRef(false);

  useEffect(() => {
    queueMicrotask(() => setAdFree(isAdFree()));
    if (!ref.current) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !sent.current) {
            timer = setTimeout(() => {
              if (sent.current) return;
              sent.current = true;
              adBeacon(slot, campaignId, "imp");
            }, 1000);
          } else if (timer) {
            clearTimeout(timer);
            timer = null;
          }
        }
      },
      { threshold: 0.5 }
    );
    io.observe(ref.current);
    return () => {
      io.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [campaignId, slot]);

  if (adFree) return null;

  return (
    <div ref={ref} onClickCapture={() => adBeacon(slot, campaignId, "clk")}>
      <StationRow
        station={station}
        queue={queue}
        trailing={
          <span className="mr-1 shrink-0 rounded bg-muted/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
            Sponsored
          </span>
        }
      />
    </div>
  );
}
