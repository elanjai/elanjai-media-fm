"use client";

import Link from "@/components/LangLink";
import Icon from "@/components/Icon";
import { useT } from "@/components/LocaleProvider";
import { fmt } from "@/i18n/locales";

/** Route-level error boundary — keeps app chrome, offers retry + home. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <Icon name="radio" size={40} strokeWidth={1.6} className="text-muted" />
      <h1 className="mt-4 font-display text-xl font-bold text-ink">
        {t("errors.title")}
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted">
        {t("errors.body")}
        {error?.digest ? (
          <span className="mt-1 block text-xs text-muted/70">
            {fmt(t("errors.ref"), { digest: error.digest })}
          </span>
        ) : null}
      </p>
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-accent-ink shadow-md transition hover:brightness-105"
        >
          {t("errors.retry")}
        </button>
        <Link
          href="/"
          className="rounded-full border border-border bg-surface px-6 py-2.5 text-sm font-semibold text-ink transition hover:border-brand-2/50"
        >
          {t("home.allStations")}
        </Link>
      </div>
    </div>
  );
}
