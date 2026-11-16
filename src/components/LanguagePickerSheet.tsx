"use client";

import { useMemo, useState } from "react";
import type { Genre } from "@/lib/types";
import { NATIVE_NAMES, langsFromNavigator } from "@/lib/languages";
import Icon from "./Icon";
import { usePrefs } from "./PrefsProvider";

/**
 * First-run language picker — one sheet, multi-select native-script chips,
 * skippable. Pre-selects from the browser's accepted languages. The choice
 * reorders home sections, Trending and the hero (and can be edited later
 * from Settings).
 */
export default function LanguagePickerSheet({ genres }: { genres: Genre[] }) {
  const { langs, hasChosenLangs, setLangs, langPickerOpen, closeLangPicker } =
    usePrefs();
  // Chips the user tapped this session; null = untouched, so the derived
  // pre-selection (saved choice, else browser languages) shows instead.
  const [override, setOverride] = useState<string[] | null>(null);

  const suggested = useMemo(
    () =>
      langs?.length
        ? langs
        : typeof navigator === "undefined"
          ? []
          : langsFromNavigator(navigator),
    [langs]
  );
  const picked = override ?? suggested;

  const available = useMemo(
    () => genres.filter((g) => g.count > 0),
    [genres]
  );

  if (!langPickerOpen) return null;

  const toggle = (slug: string) =>
    setOverride(
      picked.includes(slug)
        ? picked.filter((x) => x !== slug)
        : [...picked, slug]
    );

  const finish = (slugs: string[]) => {
    setLangs(slugs);
    setOverride(null);
    closeLangPicker();
  };

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Choose your languages"
    >
      <div className="fade-in absolute inset-0 bg-ink/40 backdrop-blur-[2px]" />
      <div className="sheet-in absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[26px] bg-bg pb-[max(1.5rem,env(safe-area-inset-bottom))] md:inset-x-1/2 md:bottom-6 md:w-[min(92vw,30rem)] md:-translate-x-1/2 md:rounded-[26px] md:border md:border-border md:shadow-2xl">
        <div className="mx-auto w-full max-w-md px-5 pt-4">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border md:hidden" />
          <h2 className="font-display text-xl font-semibold text-ink">
            Which languages do you listen to?
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
            We&apos;ll put those stations first — you can change this anytime
            in Settings.
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            {available.map((g) => {
              const on = picked.includes(g.slug);
              return (
                <button
                  key={g.slug}
                  type="button"
                  onClick={() => toggle(g.slug)}
                  aria-pressed={on}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-[15px] font-semibold transition active:scale-95 ${
                    on
                      ? "border-brand-2 bg-brand-2 text-brand-ink dark:border-accent dark:bg-accent dark:text-accent-ink"
                      : "border-border bg-surface text-ink hover:border-brand-2/50"
                  }`}
                >
                  <span>{NATIVE_NAMES[g.slug] ?? g.name}</span>
                  <span className={`text-[11px] font-medium ${on ? "opacity-75" : "text-muted"}`}>
                    {g.name}
                  </span>
                  {on && <Icon name="check" size={14} strokeWidth={2.4} />}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => finish(picked)}
              className="flex-1 rounded-full bg-accent py-3 text-sm font-bold text-accent-ink shadow-md shadow-brand/20 transition hover:brightness-105 active:scale-[0.98]"
            >
              {picked.length ? `Done · ${picked.length} selected` : "Done"}
            </button>
            <button
              type="button"
              onClick={() => finish([])}
              className="rounded-full border border-border bg-surface px-5 py-3 text-sm font-semibold text-muted transition hover:text-ink"
            >
              {hasChosenLangs ? "Clear" : "Skip"}
            </button>
          </div>
          <p className="mt-3 pb-1 text-center text-[11px] text-muted">
            Your pick stays on this device — no sign-up.
          </p>
        </div>
      </div>
    </div>
  );
}
