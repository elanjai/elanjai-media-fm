"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { useT } from "./LocaleProvider";

type FavEvent = CustomEvent<{ kind: "add" | "remove" | "first" }>;

/**
 * Listens for "emfm:fav" events dispatched by toggleFavorite and shows a
 * short confirmation pill above the mini player. One instance app-wide,
 * mounted inside AudioProvider.
 */
export default function FavToast() {
  const t = useT();
  const [toast, setToast] = useState<{ kind: string; n: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const onEvent = (e: Event) => {
      const kind = (e as FavEvent).detail?.kind ?? "add";
      setToast({ kind, n: Date.now() });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setToast(null), 1800);
    };
    window.addEventListener("emfm:fav", onEvent);
    return () => {
      window.removeEventListener("emfm:fav", onEvent);
      clearTimeout(timer.current);
    };
  }, []);

  if (!toast) return null;
  const text =
    toast.kind === "remove"
      ? t("favorites.toastRemove")
      : toast.kind === "first"
        ? t("favorites.toastFirst")
        : t("favorites.toastAdd");
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[10rem] z-[60] flex justify-center px-4 md:bottom-24"
    >
      <div
        key={toast.n}
        className="fade-in flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-bg shadow-lg"
      >
        <Icon
          name={toast.kind === "remove" ? "heart" : "heartF"}
          size={14}
          className={toast.kind === "remove" ? "" : "text-rose"}
        />
        {text}
      </div>
    </div>
  );
}
