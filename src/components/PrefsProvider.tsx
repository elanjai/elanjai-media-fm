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
export type ThemeChoice = "system" | "light" | "dark";
export type TextSize = "small" | "default" | "large";

type Prefs = {
  langs: string[] | null;
  hasChosenLangs: boolean;
  setLangs: (slugs: string[]) => void;
  langPickerOpen: boolean;
  openLangPicker: () => void;
  closeLangPicker: () => void;
  /** Warn before high-bitrate streams; pairs with the OS saveData hint. */
  dataSaver: boolean;
  setDataSaver: (on: boolean) => void;
  /** System/Light/Dark. `resolvedTheme` is the theme actually applied. */
  theme: ThemeChoice;
  resolvedTheme: "light" | "dark";
  setTheme: (t: ThemeChoice) => void;
  /** Whole-UI scale for older listeners — Default / Large / Extra large. */
  textSize: TextSize;
  setTextSize: (s: TextSize) => void;
  /** Giant one-tap interface (F-1.12). */
  simpleMode: boolean;
  setSimpleMode: (on: boolean) => void;
};

const LANGS_KEY = "emfm:langs";
const DATASAVER_KEY = "emfm:datasaver";
const THEME_KEY = "emfm:theme";
const TEXTSIZE_KEY = "emfm:textsize";
const SIMPLE_KEY = "emfm:simple";

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
  const [dataSaver, setDataSaverState] = useState(false);
  const [theme, setThemeState] = useState<ThemeChoice>("system");
  const [systemDark, setSystemDark] = useState(false);
  const [textSize, setTextSizeState] = useState<TextSize>("default");
  const [simpleMode, setSimpleModeState] = useState(false);

  useEffect(() => {
    let stored: string[] | null = null;
    let ds = false;
    let t: ThemeChoice = "system";
    let ts: TextSize = "default";
    let sm = false;
    try {
      const raw = localStorage.getItem(LANGS_KEY);
      if (raw !== null) stored = JSON.parse(raw) as string[];
      ds = localStorage.getItem(DATASAVER_KEY) === "true";
      const traw = localStorage.getItem(THEME_KEY);
      if (traw === "light" || traw === "dark" || traw === "system") t = traw;
      const tsraw = localStorage.getItem(TEXTSIZE_KEY);
      // "xl" is retired — legacy saves land on "large".
      if (tsraw === "small" || tsraw === "large") ts = tsraw;
      else if (tsraw === "xl") ts = "large";
      sm = localStorage.getItem(SIMPLE_KEY) === "true";
    } catch {
      /* private mode */
    }
    const darkNow = window.matchMedia("(prefers-color-scheme: dark)").matches;
    queueMicrotask(() => {
      setLangsState(stored ?? []);
      setHasChosen(stored !== null);
      setDataSaverState(ds);
      setThemeState(t);
      setSystemDark(darkNow);
      setTextSizeState(ts);
      setSimpleModeState(sm);
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

  const setDataSaver = useCallback((on: boolean) => {
    setDataSaverState(on);
    try {
      localStorage.setItem(DATASAVER_KEY, String(on));
    } catch {
      /* private mode */
    }
  }, []);

  const setTheme = useCallback((t: ThemeChoice) => {
    setThemeState(t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {
      /* private mode */
    }
  }, []);

  const setTextSize = useCallback((s: TextSize) => {
    setTextSizeState(s);
    try {
      localStorage.setItem(TEXTSIZE_KEY, s);
    } catch {
      /* private mode */
    }
  }, []);

  const setSimpleMode = useCallback((on: boolean) => {
    setSimpleModeState(on);
    try {
      localStorage.setItem(SIMPLE_KEY, String(on));
    } catch {
      /* private mode */
    }
  }, []);

  const openLangPicker = useCallback(() => setLangPickerOpen(true), []);
  const closeLangPicker = useCallback(() => setLangPickerOpen(false), []);

  // Track the OS dark setting so "system" stays live.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const resolvedTheme: "light" | "dark" =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;

  // Reflect prefs onto <html> (the inline themeInit script does the pre-hydration pass).
  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);
  useEffect(() => {
    document.documentElement.dataset.textsize = textSize;
  }, [textSize]);

  const prefs = useMemo<Prefs>(
    () => ({
      langs,
      hasChosenLangs,
      setLangs,
      langPickerOpen,
      openLangPicker,
      closeLangPicker,
      dataSaver,
      setDataSaver,
      theme,
      resolvedTheme,
      setTheme,
      textSize,
      setTextSize,
      simpleMode,
      setSimpleMode,
    }),
    [
      langs,
      hasChosenLangs,
      setLangs,
      langPickerOpen,
      openLangPicker,
      closeLangPicker,
      dataSaver,
      setDataSaver,
      theme,
      resolvedTheme,
      setTheme,
      textSize,
      setTextSize,
      simpleMode,
      setSimpleMode,
    ]
  );

  return <PrefsCtx.Provider value={prefs}>{children}</PrefsCtx.Provider>;
}
