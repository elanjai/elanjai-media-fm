"use client";

import { useEffect, useState } from "react";
import { isAdFree, setAdFree } from "@/lib/ads";
import Icon from "./Icon";

/**
 * Supporter-plan UI (F-4.7). States:
 *  - already active → status + "turn off"
 *  - paymentUrl set → pay link, then code entry or honor activation
 *  - nothing set → "coming soon" waitlist copy
 */
const CODE = process.env.NEXT_PUBLIC_ADFREE_CODE ?? "";

export default function AdFreeClient({
  paymentUrl,
  codeRequired,
}: {
  paymentUrl: string;
  codeRequired: boolean;
}) {
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const [code, setCode] = useState("");
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setActive(isAdFree());
      setReady(true);
    });
  }, []);

  if (!ready) return null;

  if (active) {
    return (
      <div className="mt-8 rounded-2xl border border-brand-2/30 bg-brand-2/5 p-5 text-center">
        <p className="flex items-center justify-center gap-2 font-display text-sm font-semibold text-ink">
          <Icon name="heart" size={16} className="text-brand-2 dark:text-accent" />
          Ad-free is on — thank you for the support
        </p>
        <p className="mt-1.5 text-xs text-muted">
          Every ad surface on this device is already switched off.
        </p>
        <button
          type="button"
          onClick={() => {
            setAdFree(false);
            setActive(false);
          }}
          className="mt-4 rounded-full border border-border px-5 py-2 text-xs font-semibold text-muted transition hover:border-danger/50 hover:text-danger"
        >
          Turn off ad-free
        </button>
      </div>
    );
  }

  const activate = () => {
    if (codeRequired && code.trim() !== CODE) {
      setWrong(true);
      return;
    }
    setAdFree(true);
    setActive(true);
  };

  return (
    <div className="mt-8 rounded-2xl border border-border bg-surface p-5">
      {paymentUrl ? (
        <>
          <p className="font-display text-sm font-semibold text-ink">
            1 · Support the app
          </p>
          <a
            href={paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold text-accent-ink shadow-md shadow-brand/20 transition hover:brightness-105"
          >
            Pay securely →
          </a>
          <p className="mt-4 font-display text-sm font-semibold text-ink">
            2 · Activate on this device
          </p>
        </>
      ) : (
        <p className="font-display text-sm font-semibold text-ink">
          Activate on this device
        </p>
      )}

      {codeRequired ? (
        <>
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setWrong(false);
            }}
            placeholder="Enter the code from your payment"
            className="mt-3 w-full rounded-full border border-border bg-surface-2 px-4 py-2.5 text-sm text-ink placeholder:text-muted/70 focus:border-brand-2 focus:outline-none"
          />
          {wrong && (
            <p className="mt-1.5 text-xs font-medium text-danger">
              That code doesn&rsquo;t match — check the message from your payment.
            </p>
          )}
        </>
      ) : (
        <p className="mt-2 text-xs leading-5 text-muted">
          Early pilot — activation is honor-based for now. If you&rsquo;ve
          supported us {paymentUrl ? "via the link above " : "recently"},
          switch it on below.
        </p>
      )}

      <button
        type="button"
        onClick={activate}
        className="mt-3 w-full rounded-full bg-brand px-6 py-3 text-sm font-bold text-brand-ink transition hover:brightness-110"
      >
        Activate ad-free
      </button>
    </div>
  );
}
