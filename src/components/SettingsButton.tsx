"use client";

import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useLang, useSwitchLocale, useT } from "./LocaleProvider";
import { LOCALE_META, LOCALES } from "@/i18n/locales";
import { NATIVE_NAMES } from "@/lib/languages";
import { useEffect, useRef, useState } from "react";
import { useLibrary } from "./AudioProvider";
import { useFocusTrap } from "@/lib/useFocusTrap";
import Icon from "./Icon";
import { usePrefs, type TextSize, type ThemeChoice } from "./PrefsProvider";
import ShareFavorites from "./ShareFavorites";

const THEME_OPTS: { v: ThemeChoice; labelKey: string }[] = [
  { v: "system", labelKey: "settings.themeSystem" },
  { v: "light", labelKey: "settings.themeLight" },
  { v: "dark", labelKey: "settings.themeDark" },
];

const SIZE_OPTS: { v: TextSize; labelKey: string }[] = [
  { v: "small", labelKey: "settings.sizeSmall" },
  { v: "default", labelKey: "settings.sizeDefault" },
  { v: "large", labelKey: "settings.sizeLarge" },
];

const LOCALE_OPTS = LOCALES.map((l) => ({ v: l, label: LOCALE_META[l].native }));

function SegRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { v: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="text-[13px] font-semibold text-ink">{label}</p>
      <div className="mt-2 flex rounded-xl border border-border bg-surface-2 p-1">
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            aria-pressed={value === o.v}
            onClick={() => onChange(o.v)}
            className={`flex-1 rounded-lg px-2 py-2 text-[13px] font-semibold transition ${
              value === o.v
                ? "bg-surface text-ink shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({
  label,
  hint,
  on,
  onChange,
}: {
  label: string;
  hint: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3 text-left transition hover:border-brand-2/40"
    >
      <span>
        <span className="block text-[13px] font-semibold text-ink">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-muted">{hint}</span>
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          on ? "bg-brand-2 dark:bg-accent" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform dark:bg-accent-ink ${
            on ? "translate-x-[22px]" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

/** Gear button + settings sheet (F-1.11): theme, text size, languages,
 *  data saver, simple mode, history, and favorites export. */
export default function SettingsButton() {
  const [open, setOpen] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const router = useRouter();
  const lang = useLang();
  const switchLocale = useSwitchLocale();
  const t = useT();
  const {
    langs,
    openLangPicker,
    dataSaver,
    setDataSaver,
    theme,
    setTheme,
    textSize,
    setTextSize,
    simpleMode,
    setSimpleMode,
  } = usePrefs();
  const { favoriteStations, clearRecents } = useLibrary();
  const sheetRef = useRef<HTMLDivElement>(null);
  useFocusTrap(sheetRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const exportFavorites = () => {
    const payload = favoriteStations.map((s) => ({
      slug: s.slug,
      name: s.name,
      language: s.language,
      genre: s.genre,
    }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "elanjai-fm-favorites.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearHistory = () => {
    clearRecents();
    try {
      localStorage.removeItem("emfm:searches");
    } catch {
      /* private mode */
    }
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
  };

  // Setup link for F-1.12: open this on the senior's device once — it seeds
  // these favorites and drops into the giant one-tap screen.
  const copySetupLink = async () => {
    const slugs = favoriteStations.map((s) => s.slug).join(",");
    const url = `${window.location.origin}/simple?favs=${encodeURIComponent(slugs)}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const langSummary =
    langs === null
      ? "…"
      : langs.length
        ? langs.map((l) => NATIVE_NAMES[l] ?? l).join(", ")
        : t("settings.allLanguages");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("settings.title")}
        title={t("settings.title")}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-muted transition hover:text-ink"
      >
        <Icon name="settings" size={17} strokeWidth={1.7} />
      </button>

      {open &&
        createPortal(
        <div
          ref={sheetRef}
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label={t("settings.title")}
        >
          <div
            className="fade-in absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <div className="sheet-in absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[26px] bg-bg pb-[max(1.5rem,env(safe-area-inset-bottom))] md:inset-x-1/2 md:bottom-6 md:w-[min(92vw,30rem)] md:-translate-x-1/2 md:rounded-[26px] md:border md:border-border md:shadow-2xl">
            <div className="mx-auto w-full max-w-md px-5 pt-4">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border md:hidden" />
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-ink">{t("settings.title")}</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t("a11y.closeSettings")}
                  className="hit-expand -mr-2 flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:text-ink"
                >
                  <Icon name="x" size={17} strokeWidth={2} />
                </button>
              </div>

              <div className="mt-5 space-y-5">
                <SegRow
                  label={t("settings.appLanguage")}
                  options={LOCALE_OPTS}
                  value={lang}
                  onChange={switchLocale}
                />
                <SegRow
                  label={t("settings.theme")}
                  options={THEME_OPTS.map((o) => ({ v: o.v, label: t(o.labelKey) }))}
                  value={theme}
                  onChange={setTheme}
                />
                <SegRow
                  label={t("settings.textSize")}
                  options={SIZE_OPTS.map((o) => ({ v: o.v, label: t(o.labelKey) }))}
                  value={textSize}
                  onChange={setTextSize}
                />

                <div>
                  <p className="text-[13px] font-semibold text-ink">{t("settings.languages")}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      openLangPicker();
                    }}
                    className="mt-2 flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left transition hover:border-brand-2/40"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-ink">
                        {langSummary}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted">
                        {t("settings.languagesHint")}
                      </span>
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold text-brand-2 dark:text-accent">
                      {t("action.change")}
                    </span>
                  </button>
                </div>

                <Toggle
                  label={t("settings.dataSaver")}
                  hint={t("settings.dataSaverHint")}
                  on={dataSaver}
                  onChange={setDataSaver}
                />
                <Toggle
                  label={t("settings.simpleMode")}
                  hint={t("settings.simpleModeHint")}
                  on={simpleMode}
                  onChange={(v) => {
                    setSimpleMode(v);
                    if (v) {
                      setOpen(false);
                      router.push(`/${lang}/simple`);
                    }
                  }}
                />

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={clearHistory}
                    className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-3 text-[13px] font-semibold text-ink transition hover:border-brand-2/40"
                  >
                    <Icon name="trash" size={15} strokeWidth={1.8} />
                    {cleared ? t("settings.cleared") : t("settings.clearHistory")}
                  </button>
                  <button
                    type="button"
                    onClick={exportFavorites}
                    disabled={!favoriteStations.length}
                    className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-3 text-[13px] font-semibold text-ink transition hover:border-brand-2/40 disabled:opacity-50"
                  >
                    <Icon name="download" size={15} strokeWidth={1.8} />
                    {t("settings.exportFavorites")}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={copySetupLink}
                  disabled={!favoriteStations.length}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface px-4 py-3 text-[13px] font-semibold text-muted transition hover:border-brand-2/40 hover:text-ink disabled:opacity-50"
                >
                  <Icon name="share" size={15} strokeWidth={1.8} />
                  {linkCopied
                    ? t("settings.setupLinkCopied")
                    : t("settings.setupLink")}
                </button>

                <ShareFavorites stations={favoriteStations} />

                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push(`/${lang}/stats`);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-[13px] font-semibold text-muted transition hover:border-brand-2/40 hover:text-ink"
                >
                  <Icon name="clock" size={15} strokeWidth={1.8} />
                  {t("settings.myStats")}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push(`/${lang}/ad-free`);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-[13px] font-semibold text-muted transition hover:border-brand-2/40 hover:text-ink"
                >
                  <Icon name="heart" size={15} strokeWidth={1.8} />
                  {t("settings.goAdFree")}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem("emfm:consent");
                    location.reload();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-[13px] font-semibold text-muted transition hover:border-brand-2/40 hover:text-ink"
                >
                  <Icon name="settings" size={15} strokeWidth={1.8} />
                  {t("settings.privacyChoices")}
                </button>

                <p className="pb-1 text-center text-[11px] text-muted">
                  {t("settings.localOnly")}
                </p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
