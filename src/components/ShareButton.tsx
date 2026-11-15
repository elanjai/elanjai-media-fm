"use client";

import { useState } from "react";
import Icon from "./Icon";

/** Share copy — station name + site, per F-3.4. */
export function shareText(name: string): string {
  return `Listening to ${name} on Elanjai FM`;
}

/**
 * WhatsApp-first share (F-3.4): a wa.me deep link that works on every
 * device — no permissions, opens the WhatsApp app where most of our
 * audience lives — plus the native share sheet / clipboard as fallback.
 * `url` is the canonical (locale-aware) station URL built server-side.
 */
export default function ShareButton({
  url,
  name,
}: {
  url: string;
  name: string;
}) {
  const [shared, setShared] = useState(false);
  const wa = `https://wa.me/?text=${encodeURIComponent(`${shareText(name)}\n${url}`)}`;

  return (
    <div className="flex items-center gap-2">
      <a
        href={wa}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on WhatsApp"
        title="Share on WhatsApp"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[#25d366]/15 text-[#1da851] transition hover:bg-[#25d366]/25"
      >
        <Icon name="whatsapp" size={19} />
      </a>
      <button
        type="button"
        onClick={async () => {
          try {
            if (navigator.share)
              await navigator.share({ title: name, text: shareText(name), url });
            else {
              await navigator.clipboard.writeText(url);
              setShared(true);
              setTimeout(() => setShared(false), 1500);
            }
          } catch {
            /* user dismissed share sheet */
          }
        }}
        aria-label="Share station"
        title={shared ? "Link copied!" : "Share station"}
        className={`flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface transition ${
          shared ? "text-brand-2 dark:text-accent" : "text-muted hover:text-ink"
        }`}
      >
        <Icon name={shared ? "check" : "share"} size={18} strokeWidth={1.8} />
      </button>
    </div>
  );
}
