"use client";

import { useState } from "react";
import { reportStreamIssue } from "@/lib/report";
import Icon from "./Icon";

/** "Report a problem" action on the station page (F-2.7). */
export default function ReportButton({ slug }: { slug: string }) {
  const [sent, setSent] = useState(false);
  return (
    <button
      type="button"
      disabled={sent}
      onClick={() => {
        reportStreamIssue({ slug, reason: "manual" });
        setSent(true);
      }}
      className="hit flex items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-muted transition hover:border-brand-2/50 hover:text-ink disabled:opacity-60"
    >
      <Icon name="signal" size={14} />
      {sent ? "Reported — thanks" : "Report a problem"}
    </button>
  );
}
