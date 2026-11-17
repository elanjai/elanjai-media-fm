"use client";

import Link from "@/components/LangLink";
import { useLocalePath, useT } from "./LocaleProvider";
import Icon from "./Icon";
import type { IconName } from "@/lib/icon-paths";

const items: { href: string; labelKey: string; icon: IconName }[] = [
  { href: "/", labelKey: "nav.home", icon: "home" },
  { href: "/genres", labelKey: "nav.genres", icon: "grid" },
  { href: "/search", labelKey: "nav.search", icon: "search" },
  { href: "/favorites", labelKey: "nav.favorites", icon: "heart" },
];

/** Floating pill tab bar — active tab takes the accent pill (design "tab bar"). Mobile only; md+ uses AppBar nav links. */
export default function TabBar() {
  const pathname = useLocalePath();
  const t = useT();
  // Simple mode replaces navigation with one giant player surface.
  if (pathname === "/simple") return null;
  return (
    <nav
      aria-label={t("a11y.mainNav")}
      className="fixed inset-x-4 bottom-[max(0.875rem,env(safe-area-inset-bottom))] z-40 md:hidden"
    >
      <div className="mx-auto flex h-16 max-w-[370px] items-stretch rounded-full border border-border bg-surface px-2 shadow-xl shadow-brand/10">
        {items.map((it) => {
          const active =
            it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
          return (
            <Link
              key={it.href}
              href={it.href === "/" ? "/" : it.href}
              aria-current={active ? "page" : undefined}
              className="flex flex-1 flex-col items-center justify-center gap-1"
            >
              <span
                className={`flex h-[30px] w-14 items-center justify-center rounded-full transition-colors ${
                  active ? "bg-accent text-accent-ink" : "text-muted"
                }`}
              >
                <Icon name={it.icon} size={20} strokeWidth={active ? 2 : 1.8} />
              </span>
              <span
                className={`text-[11px] leading-none ${
                  active ? "font-semibold text-brand-2 dark:text-accent" : "font-medium text-muted"
                }`}
              >
                {t(it.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
