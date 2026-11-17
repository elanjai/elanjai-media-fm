"use client";

import { useEffect, useRef, useState } from "react";
import { LOCALE_META, LOCALES } from "@/i18n/locales";
import Icon from "./Icon";
import { useLang, useSwitchLocale, useT } from "./LocaleProvider";

/**
 * UI-language menu (F-3.1) — globe button in the AppBar opening a small
 * popover of the app locales in their native scripts. Switching navigates
 * to the same page under /{locale} and persists the choice via cookie.
 * Hidden on the narrowest viewports — Settings covers those.
 */
export default function LocaleSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const lang = useLang();
  const t = useT();
  const switchLocale = useSwitchLocale();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative hidden min-[420px]:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("settings.appLanguage")}
        aria-expanded={open}
        aria-haspopup="menu"
        title={t("settings.appLanguage")}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-muted transition hover:text-ink"
      >
        <Icon name="globe" size={17} strokeWidth={1.7} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t("settings.appLanguage")}
          className="fade-in absolute right-0 top-[calc(100%+10px)] z-50 w-44 rounded-2xl border border-border bg-surface p-1.5 shadow-xl shadow-brand/10"
        >
          {LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              role="menuitemradio"
              aria-checked={l === lang}
              onClick={() => {
                setOpen(false);
                switchLocale(l);
              }}
              className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:bg-surface-2 ${
                l === lang ? "font-semibold text-ink" : "text-muted"
              }`}
            >
              <span className="flex-1 text-[14px]">{LOCALE_META[l].native}</span>
              <span className="text-[11px] text-muted">{LOCALE_META[l].name}</span>
              {l === lang && (
                <Icon
                  name="check"
                  size={14}
                  strokeWidth={2.4}
                  className="text-brand-2 dark:text-accent"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
