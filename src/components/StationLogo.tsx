"use client";

import { useState } from "react";
import { fmt } from "@/i18n/locales";
import { useT } from "./LocaleProvider";

/** Station logo — local asset → remote favicon → colored initials fallback. */
export default function StationLogo({
  src,
  fallbackSrc,
  name,
  size = 96,
  className = "",
}: {
  src: string;
  fallbackSrc?: string;
  name: string;
  size?: number;
  className?: string;
}) {
  const urls = [src, fallbackSrc].filter(Boolean) as string[];
  const t = useT();
  const [stage, setStage] = useState(0);
  const url = urls[Math.min(stage, urls.length)];

  if (!url) {
    const initials = name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
    return (
      <div
        className={`@container flex aspect-square items-center justify-center rounded-[28%] bg-gradient-to-br from-brand-2 to-brand font-display font-bold text-accent shadow-md shadow-brand/15 ${className}`}
        aria-hidden
      >
        <span style={{ fontSize: "32cqw", lineHeight: 1 }}>{initials}</span>
      </div>
    );
  }
  // Local catalog logos ship AVIF/WebP variants at 44/96/200px (F-3.7) —
  // <picture> picks the modern format + the density for the rendered size;
  // remote favicons and the PNG fallback stay on the plain <img> path.
  const isLocal = url.startsWith("/logos/");
  const variant = (ext: string) =>
    [44, 96, 200]
      .map((s) => `${url.replace(/\.png$/, `-${s}.${ext}`)} ${s}w`)
      .join(", ");
  const img = (
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary remote favicons can't go through next/image
    <img
      src={url}
      alt={fmt(t("a11y.stationLogo"), { name })}
      width={size}
      height={size}
      loading="lazy"
      className={`rounded-[28%] object-cover bg-surface-2 ${className}`}
      onError={() => setStage((s) => s + 1)}
    />
  );
  return isLocal ? (
    <picture>
      <source type="image/avif" srcSet={variant("avif")} sizes={`${size}px`} />
      <source type="image/webp" srcSet={variant("webp")} sizes={`${size}px`} />
      {img}
    </picture>
  ) : (
    img
  );
}
