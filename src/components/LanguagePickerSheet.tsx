"use client";

import { useMemo, useRef, useState, type TouchEvent } from "react";
import type { Genre } from "@/lib/types";
import { NATIVE_NAMES, langsFromNavigator } from "@/lib/languages";
import { fmt } from "@/i18n/locales";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useCatalog, usePlaybackActions } from "./AudioProvider";
import Icon from "./Icon";
import { useT } from "./LocaleProvider";
import { usePrefs } from "./PrefsProvider";

/**
 * First-run language picker — one sheet, multi-select native-script chips,
 * skippable. Pre-selects from the browser's accepted languages. The choice
 * reorders home sections, Trending and the hero (and can be edited later
 * from Settings).
 */
export default function LanguagePickerSheet({ genres }: { genres: Genre[] }) {
  const t = useT();
  const { langs, hasChosenLangs, setLangs, langPickerOpen, closeLangPicker } =
    usePrefs();
  const { stations } = useCatalog();
  const { play } = usePlaybackActions();
  const sheetRef = useRef<HTMLDivElement>(null);
  useFocusTrap(sheetRef, langPickerOpen);
  // Chips the user tapped this session; null = untouched, so the derived
  // pre-selection (saved choice, else browser languages) shows instead.
  const [override, setOverride] = useState<string[] | null>(null);
  // Pull-to-dismiss: translate follows the finger while dragged, releases
  // past ~72px close the sheet. Only armed when the sheet is scrolled to top.
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef<{ y: number; ok: boolean } | null>(null);

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
    setDragY(0);
    closeLangPicker();
  };

  // Backdrop tap / swipe-down / Esc — dismiss without committing pending picks.
  const dismiss = () => {
    setOverride(null);
    setDragY(0);
    closeLangPicker();
  };

  const onSheetTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    dragStart.current = {
      y: e.touches[0].clientY,
      ok: e.currentTarget.scrollTop <= 0,
    };
  };
  const onSheetTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    if (!dragStart.current?.ok) return;
    const dy = e.touches[0].clientY - dragStart.current.y;
    setDragY(dy > 0 ? Math.min(dy, 160) : 0);
  };
  const onSheetTouchEnd = () => {
    const ok = dragStart.current?.ok;
    dragStart.current = null;
    if (ok && dragY > 72) dismiss();
    else setDragY(0);
  };

  const playNow = () => {
    if (!stations?.length) return;
    const slug = picked[0];
    const first =
      stations.find((s) => s.languages?.includes(slug)) ?? stations[0];
    finish(picked);
    play(first, stations);
  };

  return (
    <div
      ref={sheetRef}
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label={t("prefs.chooseLabel")}
      onKeyDown={(e) => {
        if (e.key === "Escape") dismiss();
      }}
    >
      <div
        aria-hidden="true"
        onClick={dismiss}
        className="fade-in absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
      />
      <div
        onTouchStart={onSheetTouchStart}
        onTouchMove={onSheetTouchMove}
        onTouchEnd={onSheetTouchEnd}
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragY ? undefined : "transform 0.2s ease-out",
        }}
        className="sheet-in absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-[26px] bg-bg pb-[max(1.5rem,env(safe-area-inset-bottom))] md:inset-x-1/2 md:bottom-6 md:w-[min(92vw,30rem)] md:-translate-x-1/2 md:rounded-[26px] md:border md:border-border md:shadow-2xl"
      >
        <div className="mx-auto w-full max-w-md px-5 pt-4">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border md:hidden" />
          <h2 className="font-display text-lg font-semibold text-ink">
            {t("prefs.chooseTitle")}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {t("prefs.chooseHint")}
          </p>

          {/* Done pinned above the chip wall — pick, tap, no scrolling. The
              count updates live, so it doubles as the selection indicator. */}
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => finish(picked)}
              className="flex-1 rounded-full bg-accent py-2 text-[13px] font-bold text-accent-ink shadow-md shadow-brand/20 transition hover:brightness-105 active:scale-[0.98]"
            >
              {picked.length
                ? fmt(t("prefs.doneCount"), { count: picked.length })
                : t("prefs.done")}
            </button>
            <button
              type="button"
              onClick={() =>
                hasChosenLangs ? setOverride([]) : finish([])
              }
              className="rounded-full border border-border bg-surface px-3.5 py-2 text-[13px] font-semibold text-muted transition hover:text-ink"
            >
              {hasChosenLangs ? t("prefs.clear") : t("prefs.skip")}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {available.map((g) => {
              const on = picked.includes(g.slug);
              return (
                <button
                  key={g.slug}
                  type="button"
                  onClick={() => toggle(g.slug)}
                  aria-pressed={on}
                  className={`hit-expand flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition active:scale-95 ${
                    on
                      ? "border-brand-2 bg-brand-2 text-brand-ink dark:border-accent dark:bg-accent dark:text-accent-ink"
                      : "border-border bg-surface text-ink hover:border-brand-2/50"
                  }`}
                >
                  <span className="flex flex-col items-center leading-tight">
                    <span>{NATIVE_NAMES[g.slug] ?? g.name}</span>
                    <span
                      className={`text-[10px] font-medium ${on ? "opacity-75" : "text-muted"}`}
                    >
                      {g.name}
                    </span>
                  </span>
                  {/* Fixed check slot — chip size never changes with selection. */}
                  <span className="flex w-3 shrink-0 items-center">
                    {on && <Icon name="check" size={13} strokeWidth={2.4} />}
                  </span>
                </button>
              );
            })}
          </div>

          {stations && stations.length > 0 && (
            <button
              type="button"
              onClick={playNow}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-brand-2/30 bg-brand-2/5 py-2.5 text-[13px] font-semibold text-brand-2 transition hover:border-brand-2/60 dark:border-accent/30 dark:bg-accent/10 dark:text-accent"
            >
              <Icon name="play" size={14} />
              {t("prefs.playNow")}
              <span className="font-normal opacity-75">· {t("prefs.playNowHint")}</span>
            </button>
          )}
          <p className="mt-2.5 pb-1 text-center text-[11px] text-muted">
            {t("prefs.privacyNote")}
          </p>
        </div>
      </div>
    </div>
  );
}
