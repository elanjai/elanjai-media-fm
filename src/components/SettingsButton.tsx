"use client";

import { useRouter } from "next/navigation";
import { useLang } from "./LocaleProvider";
import { useState } from "react";
import { useLibrary } from "./AudioProvider";
import Icon from "./Icon";
import { usePrefs, type TextSize, type ThemeChoice } from "./PrefsProvider";

const THEME_OPTS: { v: ThemeChoice; label: string }[] = [
  { v: "system", label: "System" },
  { v: "light", label: "Light" },
  { v: "dark", label: "Dark" },
];

const SIZE_OPTS: { v: TextSize; label: string }[] = [
  { v: "default", label: "Default" },
  { v: "large", label: "Large" },
  { v: "xl", label: "Extra large" },
];

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
        ? langs.join(", ")
        : "All languages";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Settings"
        title="Settings"
        className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-muted transition hover:text-ink"
      >
        <Icon name="settings" size={17} strokeWidth={1.7} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Settings"
        >
          <div
            className="fade-in absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <div className="sheet-in absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[26px] bg-bg pb-[max(1.5rem,env(safe-area-inset-bottom))] md:inset-x-1/2 md:bottom-6 md:w-[min(92vw,30rem)] md:-translate-x-1/2 md:rounded-[26px] md:border md:border-border md:shadow-2xl">
            <div className="mx-auto w-full max-w-md px-5 pt-4">
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border md:hidden" />
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-ink">Settings</h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close settings"
                  className="hit-expand -mr-2 flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:text-ink"
                >
                  <Icon name="x" size={17} strokeWidth={2} />
                </button>
              </div>

              <div className="mt-5 space-y-5">
                <SegRow
                  label="Theme"
                  options={THEME_OPTS}
                  value={theme}
                  onChange={setTheme}
                />
                <SegRow
                  label="Text size"
                  options={SIZE_OPTS}
                  value={textSize}
                  onChange={setTextSize}
                />

                <div>
                  <p className="text-[13px] font-semibold text-ink">Languages</p>
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
                        Languages shown first on Home and Search
                      </span>
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold text-brand-2 dark:text-accent">
                      Change
                    </span>
                  </button>
                </div>

                <Toggle
                  label="Data saver"
                  hint="Ask before playing streams over 128 kbps and prefer lighter streams"
                  on={dataSaver}
                  onChange={setDataSaver}
                />
                <Toggle
                  label="Simple mode"
                  hint="A giant one-tap screen for seniors — opens the simple player"
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
                    {cleared ? "Cleared" : "Clear history"}
                  </button>
                  <button
                    type="button"
                    onClick={exportFavorites}
                    disabled={!favoriteStations.length}
                    className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-3 text-[13px] font-semibold text-ink transition hover:border-brand-2/40 disabled:opacity-50"
                  >
                    <Icon name="download" size={15} strokeWidth={1.8} />
                    Export favorites
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
                    ? "Setup link copied"
                    : "Copy a setup link for a senior's device"}
                </button>

                <p className="pb-1 text-center text-[11px] text-muted">
                  Everything is stored only on this device.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
