"use client";

import { useEffect, useRef, useState } from "react";
import { adBeacon, isAdFree, pickWeighted, type Campaign } from "@/lib/ads";
import Icon from "./Icon";
import { useT } from "./LocaleProvider";

/**
 * Client half of the ad slot (F-4.2): weighted rotation, per-user daily
 * frequency cap (localStorage), ≥50%/1s IntersectionObserver impression,
 * clicks through /go/<id> for CTR. Ad-free supporters (F-4.7) see nothing.
 */
const CAP_KEY = "emfm:adcap";

/** Campaign `label` enum (campaigns.json) → dictionary key for the badge. */
const LABEL_KEYS: Record<string, string> = {
  Sponsored: "sponsored.sponsored",
  Ad: "sponsored.ad",
  "From Elanjai FM": "sponsored.house",
};


function capHit(c: Campaign): boolean {
  if (!c.caps.perUserPerDay) return false;
  try {
    const day = new Date().toISOString().slice(0, 10);
    const all = JSON.parse(localStorage.getItem(CAP_KEY) ?? "{}") as Record<
      string,
      { d: string; n: number }
    >;
    return (all[c.id]?.d === day ? all[c.id].n : 0) >= c.caps.perUserPerDay;
  } catch {
    return false;
  }
}
function bumpCap(id: string) {
  try {
    const day = new Date().toISOString().slice(0, 10);
    const all = JSON.parse(localStorage.getItem(CAP_KEY) ?? "{}") as Record<
      string,
      { d: string; n: number }
    >;
    all[id] = { d: day, n: (all[id]?.d === day ? all[id].n : 0) + 1 };
    localStorage.setItem(CAP_KEY, JSON.stringify(all));
  } catch {
    /* storage denied */
  }
}
function beacon(slot: string, campaign: string, type: "imp" | "clk") {
  adBeacon(slot, campaign, type);
}

export { adBeacon };

export default function AdSlotClient({
  slot,
  campaigns,
  variant = "card",
}: {
  slot: string;
  campaigns: Campaign[];
  variant?: "card" | "compact";
}) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<Campaign | null>(null);
  const [adFree, setAdFree] = useState(false);
  const impSent = useRef(false);

  // Pick once on mount: weighted random minus capped campaigns, falling
  // back to any eligible campaign if everything is capped.
  useEffect(() => {
    queueMicrotask(() => {
      setAdFree(isAdFree());
      // Device targeting (targeting.devices) is client-only by design —
      // the server render is static, so lg (≥1024px) decides "desktop".
      const device = window.matchMedia("(min-width: 1024px)").matches
        ? "desktop"
        : "mobile";
      const eligible = campaigns.filter(
        (c) => !c.targeting.devices || c.targeting.devices.includes(device)
      );
      const open = eligible.filter((c) => !capHit(c));
      setPicked(pickWeighted(open.length ? open : eligible, Math.random()));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot]);

  // Impression: ≥50% visible for ≥1s, once per mount.
  useEffect(() => {
    if (!picked || !ref.current) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !impSent.current) {
            timer = setTimeout(() => {
              if (impSent.current) return;
              impSent.current = true;
              bumpCap(picked.id);
              beacon(slot, picked.id, "imp");
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
  }, [picked, slot]);

  if (adFree || !picked) return null;

  const href = `/go/${picked.id}?s=${encodeURIComponent(slot)}`;
  const external = picked.creative.url?.startsWith("http");
  const click = () => beacon(slot, picked.id, "clk");

  if (variant === "compact") {
    return (
      <div ref={ref} className="rounded-[14px] border border-dashed border-border bg-surface px-4 py-2.5">
        <a
          href={href}
          {...(external ? { target: "_blank", rel: "sponsored noopener" } : {})}
          onClick={click}
          className="flex items-center gap-2.5 text-[13px] no-underline"
        >
          <span className="shrink-0 rounded bg-muted/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
            {t(LABEL_KEYS[picked.label] ?? "sponsored.sponsored")}
          </span>
          <span className="min-w-0 flex-1 truncate font-semibold text-ink">
            {picked.creative.headline}
          </span>
          {picked.creative.cta && (
            <span className="shrink-0 text-xs font-bold text-brand-2 dark:text-accent">
              {picked.creative.cta} →
            </span>
          )}
        </a>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="min-h-[92px] rounded-[18px] border border-dashed border-border bg-surface px-4 py-3.5"
      role="complementary"
      aria-label={t(LABEL_KEYS[picked.label] ?? "sponsored.sponsored")}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-2/10 text-brand-2 dark:text-accent">
          <Icon name="radio" size={17} strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13.5px] font-bold text-ink">
              {picked.creative.headline}
            </p>
            <span className="shrink-0 rounded bg-muted/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
              {t(LABEL_KEYS[picked.label] ?? "sponsored.sponsored")}
            </span>
          </div>
          {picked.creative.body && (
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted">
              {picked.creative.body}
            </p>
          )}
          {picked.creative.cta && (
            <a
              href={href}
              {...(external ? { target: "_blank", rel: "sponsored noopener" } : {})}
              onClick={click}
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand-2 no-underline dark:text-accent"
            >
              {picked.creative.cta} →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* SponsoredStationRow + the pre-roll engine (F-4.4/F-4.5) import adBeacon
   from @/lib/ads directly — kept re-exported here for compatibility. */
