"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GENRE_TO_SPEECH_LOCALE } from "@/lib/languages";
import Icon from "./Icon";
import { usePrefs } from "./PrefsProvider";

export const RECENT_SEARCHES_KEY = "emfm:searches";

function remember(q: string) {
  try {
    const prev = JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) ?? "[]") as string[];
    const next = [q, ...prev.filter((x) => x !== q)].slice(0, 6);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function speechCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as
    | (new () => SpeechRecognitionLike)
    | null;
}

/**
 * Pill search field — surface-2 fill, accent focus ring (design "search field").
 * Controlled mode (`value`/`onValueChange`) drives instant search on /search;
 * uncontrolled mode (AppBar) keeps the submit-and-navigate behavior.
 */
export default function SearchInput({
  autoFocus = false,
  value,
  onValueChange,
  onSearchSubmit,
  withMic = false,
}: {
  autoFocus?: boolean;
  value?: string;
  onValueChange?: (q: string) => void;
  /** Fires instead of navigating when the form is submitted. */
  onSearchSubmit?: (q: string) => void;
  /** Show the voice-search mic when the Web Speech API is available. */
  withMic?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const controlled = value !== undefined;
  const [inner, setInner] = useState(params.get("q") ?? "");
  const q = controlled ? value : inner;
  const setQ = controlled ? (onValueChange ?? (() => {})) : setInner;
  const { langs } = usePrefs();
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const [micAvailable, setMicAvailable] = useState(false);

  useEffect(() => {
    // Post-mount so SSR and first client render agree (no button → button).
    queueMicrotask(() => setMicAvailable(withMic && speechCtor() !== null));
    return () => recRef.current?.stop();
  }, [withMic]);

  const startVoice = () => {
    const Ctor = speechCtor();
    if (!Ctor || listening) return;
    const rec = new Ctor();
    recRef.current = rec;
    rec.lang =
      (langs?.length && GENRE_TO_SPEECH_LOCALE[langs[0]]) || "en-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const text = e.results?.[0]?.[0]?.transcript ?? "";
      if (text) setQ(text);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  };

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const term = q.trim();
        if (term) remember(term);
        if (onSearchSubmit) onSearchSubmit(term);
        else router.push(term ? `/search?q=${encodeURIComponent(term)}` : "/search");
      }}
      className="relative w-full"
    >
      <Icon
        name="search"
        size={20}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search stations, languages…"
        aria-label="Search stations"
        autoFocus={autoFocus}
        className="w-full rounded-full border border-transparent bg-surface-2 py-3 pl-11 pr-20 text-sm text-ink placeholder-muted outline-none transition focus:border-brand-2 focus:bg-surface dark:focus:border-accent [&::-webkit-search-cancel-button]:hidden"
      />
      {micAvailable && (
        <button
          type="button"
          onClick={startVoice}
          aria-label={listening ? "Listening…" : "Voice search"}
          aria-pressed={listening}
          title="Voice search"
          className={`hit-expand absolute right-10 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full transition hover:bg-surface ${
            listening ? "animate-pulse text-danger" : "text-muted hover:text-ink"
          }`}
        >
          <Icon name="mic" size={16} />
        </button>
      )}
      {q && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            if (!controlled) router.push("/search");
          }}
          aria-label="Clear search"
          className="hit-expand absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted transition hover:bg-surface hover:text-ink"
        >
          <Icon name="x" size={15} />
        </button>
      )}
    </form>
  );
}
