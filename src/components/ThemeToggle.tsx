"use client";

import Icon from "./Icon";
import { usePrefs } from "./PrefsProvider";

/** Quick light/dark flip — the System option lives in Settings. */
export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = usePrefs();
  const dark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-muted transition hover:text-ink"
    >
      {dark ? (
        <Icon name="sun" size={17} strokeWidth={1.8} />
      ) : (
        <Icon name="moon" size={17} strokeWidth={1.8} />
      )}
    </button>
  );
}
