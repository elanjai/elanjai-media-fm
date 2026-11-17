"use client";

import Link from "@/components/LangLink";
import { useLocalePath, useT } from "./LocaleProvider";
import { Suspense } from "react";

const LINKS = [
  { href: "/genres", labelKey: "nav.genres" },
  { href: "/search", labelKey: "nav.search" },
  { href: "/favorites", labelKey: "nav.favorites" },
  { href: "/recent", labelKey: "footer.recent" },
];

function Links() {
  const pathname = useLocalePath();
  const t = useT();
  return (
    <>
      {LINKS.map((l) => {
        const active = pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3.5 py-1.5 text-[13px] transition ${
              active
                ? "bg-accent font-semibold text-accent-ink"
                : "font-medium text-muted hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {t(l.labelKey)}
          </Link>
        );
      })}
    </>
  );
}

/** Desktop/tablet nav — replaces the floating tab bar at md+. */
export default function NavLinks() {
  const t = useT();
  return (
    <nav aria-label={t("a11y.mainNav")} className="ml-4 hidden items-center gap-0.5 md:flex">
      <Suspense>
        <Links />
      </Suspense>
    </nav>
  );
}
