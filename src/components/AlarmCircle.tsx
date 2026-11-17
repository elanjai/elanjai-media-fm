"use client";

import { useEffect, useRef, useState } from "react";
import { ALARM_EVENT, getAlarm, localDay, setAlarm, type Alarm } from "@/lib/alarm";
import { fmt } from "@/i18n/locales";
import Icon from "./Icon";
import { useT } from "./LocaleProvider";

/**
 * Wake-up alarm button (F-5.5) — arms "play this station at HH:MM".
 * Honest scope: fires only while the app is open (a PWA can't wake in
 * the background); the popover says so next to the control.
 */
export default function AlarmCircle({ slug }: { slug: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [alarm, setAlarmState] = useState<Alarm | null>(null);
  const [time, setTime] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = () => {
      const a = getAlarm();
      setAlarmState(a);
      setTime(a?.slug === slug ? a.hhmm : "");
    };
    queueMicrotask(load);
    window.addEventListener(ALARM_EVENT, load);
    return () => window.removeEventListener(ALARM_EVENT, load);
  }, [slug]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const armedHere = alarm?.slug === slug;
  const armedElsewhere = alarm !== null && alarm.slug !== slug;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t("alarm.title")}
        aria-expanded={open}
        title={armedHere ? fmt(t("alarm.setFor"), { time: alarm.hhmm }) : t("alarm.title")}
        className={`relative flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface transition ${
          armedHere ? "text-brand-2 dark:text-accent" : "text-muted hover:text-ink"
        }`}
      >
        <Icon name="clock" size={20} strokeWidth={1.8} />
        {armedHere && (
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-surface" />
        )}
      </button>
      {open && (
        <div className="absolute bottom-12 left-1/2 z-10 w-52 -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
          <p className="border-b border-border px-3 py-2 text-xs font-semibold text-muted">
            {armedHere
              ? fmt(t("alarm.wakeAt"), { time: alarm.hhmm })
              : t("alarm.wakeWith")}
          </p>
          <form
            className="flex items-center gap-2 px-3 py-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!/^\d{2}:\d{2}$/.test(time)) return;
              // A time already passed today means tomorrow — standard
              // alarm-app roll-forward. Otherwise it would fire ~now.
              const [h, m] = time.split(":").map(Number);
              const now = new Date();
              const passed = now.getHours() * 60 + now.getMinutes() > h * 60 + m;
              setAlarm({
                slug,
                hhmm: time,
                firedDay: passed ? localDay(now) : null,
              });
              setOpen(false);
            }}
          >
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              aria-label={t("alarm.timeLabel")}
              className="w-24 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-sm text-ink outline-none focus:border-brand-2"
            />
            <button
              type="submit"
              disabled={!/^\d{2}:\d{2}$/.test(time)}
              className="text-sm font-semibold text-brand-2 disabled:text-muted dark:text-accent"
            >
              {t("alarm.set")}
            </button>
          </form>
          {armedHere && (
            <button
              type="button"
              onClick={() => {
                setAlarm(null);
                setOpen(false);
              }}
              className="block w-full border-t border-border px-3 py-2 text-left text-sm font-medium text-danger transition hover:bg-surface-2"
            >
              {t("alarm.cancel")}
            </button>
          )}
          <p className="border-t border-border px-3 py-2 text-[11px] leading-4 text-muted">
            {t("alarm.scopeNote")}
            {armedElsewhere && (
              <> {fmt(t("alarm.armedElsewhere"), { time: alarm.hhmm })}</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
