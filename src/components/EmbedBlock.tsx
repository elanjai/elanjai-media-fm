"use client";

import { useState } from "react";
import Icon from "./Icon";
import { useT } from "./LocaleProvider";

/** Copyable iframe snippet for the /embed/<slug> widget (F-3.5). */
export default function EmbedBlock({ embedUrl }: { embedUrl: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const snippet = `<iframe src="${embedUrl}" width="340" height="84" style="border:0;border-radius:16px" loading="lazy" title="${t("embed.iframeTitle")}"></iframe>`;
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-[14px] border border-border bg-surface px-4 py-3 pr-14 text-xs leading-relaxed text-muted">
        {snippet}
      </pre>
      <button
        type="button"
        aria-label={copied ? t("embed.copied") : t("embed.copy")}
        title={copied ? t("embed.copied") : t("embed.copy")}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(snippet);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* clipboard denied */
          }
        }}
        className="hit absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full text-muted transition hover:text-ink"
      >
        <Icon name={copied ? "check" : "plus"} size={15} strokeWidth={1.8} />
      </button>
    </div>
  );
}
