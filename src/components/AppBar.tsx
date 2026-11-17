import Link from "@/components/LangLink";
import { Suspense } from "react";
import { getDictionary } from "@/i18n";
import BrandLogo from "./BrandLogo";
import Icon from "./Icon";
import LocaleSwitcher from "./LocaleSwitcher";
import NavLinks from "./NavLinks";
import SearchInput from "./SearchInput";
import SettingsButton from "./SettingsButton";
import ThemeToggle from "./ThemeToggle";

/** Slim app bar — brand mark + desktop nav + search + theme + favorites. */
export default async function AppBar() {
  const dict = await getDictionary();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-[54px] max-w-2xl items-center gap-2.5 px-4 md:max-w-4xl xl:max-w-6xl">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Elanjai FM — home">
          <BrandLogo size={32} />
          <span className="leading-none">
            <span className="block font-display text-[15px] font-semibold tracking-tight text-ink">
              Elanjai FM
            </span>
            <span className="mt-0.5 block truncate text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
              {dict.hero.kicker}
            </span>
          </span>
        </Link>

        <NavLinks />

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden w-52 lg:block xl:w-64">
            <Suspense fallback={<div className="h-9 rounded-full bg-surface-2" />}>
              <SearchInput />
            </Suspense>
          </div>
          <LocaleSwitcher />
          <ThemeToggle />
          <SettingsButton />
          <Link
            href="/favorites"
            aria-label={dict.nav.favorites}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-muted transition hover:text-rose md:hidden"
          >
            <Icon name="heart" size={17} strokeWidth={1.8} />
          </Link>
        </div>
      </div>
    </header>
  );
}
