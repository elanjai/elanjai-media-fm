"use client";

import { useEffect, useState } from "react";
import type { PublicStation } from "@/lib/types";
import Icon from "./Icon";

/**
 * F-5.2 export side: a shareable /f?s=… link plus a QR code for
 * device-to-device handoff — no account needed. QR is generated
 * client-side so the link never leaves the device until shared.
 */
export default function ShareFavorites({
  stations,
}: {
  stations: PublicStation[];
}) {
  const [open, setOpen] = useState(false);
  const [svg, setSvg] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !stations.length) return;
    const url = `${window.location.origin}/f?s=${encodeURIComponent(
      stations.map((s) => s.slug).join(",")
    )}`;
    import("qrcode")
      .then((q) => q.toString(url, { type: "svg", margin: 1, width: 180 }))
      .then(setSvg)
      .catch(() => setSvg(""));
  }, [open, stations]);

  const link = () =>
    `${window.location.origin}/f?s=${encodeURIComponent(
      stations.map((s) => s.slug).join(",")
    )}`;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={!stations.length}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface px-4 py-3 text-[13px] font-semibold text-muted transition hover:border-brand-2/40 hover:text-ink disabled:opacity-50"
      >
        <Icon name="share" size={15} strokeWidth={1.8} />
        {open ? "Hide share options" : "Share favorites (link + QR)"}
      </button>

      {open && (
        <div className="mt-3 rounded-2xl border border-border bg-surface p-4 text-center">
          {svg ? (
            <div
              className="mx-auto w-[180px] [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: svg }}
              aria-label="QR code for the share link"
            />
          ) : (
            <div className="mx-auto h-[180px] w-[180px] animate-pulse rounded-xl bg-surface-2" />
          )}
          <p className="mt-2 break-all text-[11px] text-muted">{link()}</p>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link());
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                /* clipboard unavailable */
              }
            }}
            className="mt-3 rounded-full bg-accent px-5 py-2 text-xs font-bold text-accent-ink transition hover:brightness-105"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
      )}
    </div>
  );
}
