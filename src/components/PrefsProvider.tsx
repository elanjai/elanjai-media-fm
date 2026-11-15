"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * Listener preferences — stored in localStorage, kept out of AudioProvider so
 * changing a preference doesn't re-render playback consumers.
 *
 *  - langs:      genre slugs chosen in the language picker (empty = answered
 *                but skipped; null until hydration)
 *  - hasChosen:  false only on a true first run — drives the auto-open picker
 */
type Prefs = {
  langs: string[] | null;
  hasChosenLangs: boolean;
  setLangs: (slugs: string[]) => void;
  langPickerOpen: boolean;
  openLangPicker: () => void;
  closeLangPicker: () => void;
};

const LANGS_KEY = "emfm:langs";

const PrefsCtx = createContext<Prefs | null>(null);

export function usePrefs(): Prefs {
  const v = useContext(PrefsCtx);
  if (!v) throw new Error("usePrefs outside PrefsProvider");
  return v;
}

export default function PrefsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [langs, setLangsState] = useState<string[] | null>(null);
  const [hasChosenLangs, setHasChosen] = useState(true); // assume returning user until hydrated
  const [langPickerOpen, setLangPickerOpen] = useState(false);

  useEffect(() => {
    let stored: string[] | null = null;
    try {
      const raw = localStorage.getItem(LANGS_KEY);
      if (raw !== null) stored = JSON.parse(raw) as string[];
    } catch {
      /* private mode */
    }
    queueMicrotask(() => {
      setLangsState(stored ?? []);
      setHasChosen(stored !== null);
      // First run — invite the listener to pick languages once.
      if (stored === null) setLangPickerOpen(true);
    });
  }, []);

  const setLangs = useCallback((slugs: string[]) => {
    setLangsState(slugs);
    setHasChosen(true);
    try {
      localStorage.setItem(LANGS_KEY, JSON.stringify(slugs));
    } catch {
      /* private mode */
    }
  }, []);

  const openLangPicker = useCallback(() => setLangPickerOpen(true), []);
  const closeLangPicker = useCallback(() => setLangPickerOpen(false), []);

  const prefs = useMemo<Prefs>(
    () => ({
      langs,
      hasChosenLangs,
      setLangs,
      langPickerOpen,
      openLangPicker,
      closeLangPicker,
    }),
    [langs, hasChosenLangs, setLangs, langPickerOpen, openLangPicker, closeLangPicker]
  );

  return <PrefsCtx.Provider value={prefs}>{children}</PrefsCtx.Provider>;
}
