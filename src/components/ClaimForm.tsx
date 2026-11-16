"use client";

import { useState } from "react";
import Icon from "./Icon";

/** Broadcaster claim form (F-5.3) — posts to /api/claim. */
const FIELD =
  "w-full rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-brand-2 focus:outline-none";

export default function ClaimForm({
  slug,
  stationName,
  fixed,
}: {
  slug: string;
  stationName: string;
  fixed: boolean;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [slugField, setSlugField] = useState(slug);
  const [evidence, setEvidence] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("busy");
    try {
      const r = await fetch("/api/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug: fixed ? slug : slugField,
          name,
          role,
          email,
          evidence,
          message,
        }),
      });
      setState(r.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <div className="mt-6 rounded-2xl border border-brand-2/30 bg-brand-2/5 p-6 text-center">
        <Icon name="check" size={26} className="mx-auto text-brand-2 dark:text-accent" />
        <p className="mt-2 font-display text-sm font-semibold text-ink">
          Claim received
        </p>
        <p className="mx-auto mt-1.5 max-w-md text-xs leading-5 text-muted">
          We&apos;ll verify it against the station&apos;s public footprint and
          reply to your email — usually within a few days.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      {stationName ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-ink">
          Station: {stationName}
        </p>
      ) : (
        <input
          className={FIELD}
          value={slugField}
          onChange={(e) => setSlugField(e.target.value)}
          placeholder="Station page slug (from its URL, e.g. suryan-fm)"
          required
        />
      )}
      <input
        className={FIELD}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        required
        maxLength={120}
      />
      <input
        className={FIELD}
        value={role}
        onChange={(e) => setRole(e.target.value)}
        placeholder="Your role (e.g. Station manager, Digital lead)"
        required
        maxLength={80}
      />
      <input
        className={FIELD}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Work email — ideally on the station's domain"
        required
      />
      <input
        className={FIELD}
        value={evidence}
        onChange={(e) => setEvidence(e.target.value)}
        placeholder="Proof you represent the station (official site, LinkedIn, mail from station domain)"
        required
        maxLength={300}
      />
      <textarea
        className={`${FIELD} min-h-[90px] resize-y`}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="What needs correcting? (optional — new stream URL, logo, description, frequency…)"
        maxLength={1000}
      />
      {state === "error" && (
        <p className="text-xs font-medium text-danger">
          Couldn&apos;t send — check the fields and try again.
        </p>
      )}
      <button
        type="submit"
        disabled={state === "busy"}
        className="w-full rounded-full bg-accent px-6 py-3 text-sm font-bold text-accent-ink shadow-md shadow-brand/20 transition hover:brightness-105 disabled:opacity-60"
      >
        {state === "busy" ? "Sending…" : "Submit claim"}
      </button>
    </form>
  );
}
