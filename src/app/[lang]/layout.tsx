import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Devanagari, Noto_Sans_Tamil, Poppins } from "next/font/google";
import { notFound } from "next/navigation";
import "../globals.css";
import { eligibleCampaigns } from "@/lib/ads";
import AudioProvider from "@/components/AudioProvider";
import AppBar from "@/components/AppBar";
import ConsentBanner from "@/components/ConsentBanner";
import InstallPrompt from "@/components/InstallPrompt";
import LanguagePickerSheet from "@/components/LanguagePickerSheet";
import PageViewBeacon from "@/components/PageViewBeacon";
import LangLink from "@/components/LangLink";
import LocaleProvider from "@/components/LocaleProvider";
import PlayerChrome from "@/components/PlayerChrome";
import PrefsProvider from "@/components/PrefsProvider";
import SwRegister from "@/components/SwRegister";
import TabBar from "@/components/TabBar";
import { getGenres, getStations, todayCached } from "@/lib/data";
import {
  LOCALE_META,
  LOCALES,
  dictionaryFor,
  fmt,
  hasLocale,
  langAlternates,
  type Locale,
} from "@/i18n";
import { SITE } from "@/lib/site";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});
// Indic-script faces are only fetched when the rendered text needs them —
// the variables are always registered but the browser downloads per glyph.
const notoTamil = Noto_Sans_Tamil({
  variable: "--font-noto-tamil",
  subsets: ["tamil"],
});
const notoDevanagari = Noto_Sans_Devanagari({
  variable: "--font-noto-dev",
  subsets: ["devanagari"],
});

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const locale: Locale = hasLocale(lang) ? lang : "en";
  const dict = await dictionaryFor(locale);
  const title = fmt(dict.meta.homeTitle, { count: SITE.stationCount });
  const description = fmt(dict.meta.homeDescription, {
    count: SITE.stationCount,
  });
  return {
    metadataBase: new URL(SITE.url),
    title: {
      default: `${SITE.name} — ${title}`,
      template: `%s | ${SITE.name}`,
    },
    description,
    applicationName: SITE.name,
    manifest: "/manifest.webmanifest",
    openGraph: {
      type: "website",
      siteName: SITE.name,
      title: `${SITE.name} — ${title}`,
      description,
      url: `${SITE.url}/${locale}`,
      locale: locale === "ta" ? "ta_IN" : locale === "hi" ? "hi_IN" : "en_IN",
    },
    alternates: {
      canonical: `${SITE.url}/${locale}`,
      ...langAlternates(""),
    },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfcf6" },
    { media: "(prefers-color-scheme: dark)", color: "#07130c" },
  ],
};

// Set data-theme + data-textsize before first paint to avoid a flash of
// the wrong theme or a late layout shift from the size zoom.
const themeInit = `(function(){try{var t=localStorage.getItem("emfm:theme")||"system";var d=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";var s=localStorage.getItem("emfm:textsize")||"default";document.documentElement.dataset.textsize=s}catch(e){}})()`;

// Copyright year — computed once at build (Cache Components forbids an
// uncached new Date() during prerender) and refreshed on every deploy.
async function copyrightYear() {
  "use cache";
  return new Date().getFullYear();
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const dict = await dictionaryFor(lang);
  const meta = LOCALE_META[lang];
  const genres = getGenres();
  const total = getStations().length;
  const year = await copyrightYear();
  return (
    <html
      lang={lang}
      dir={meta.dir}
      className={`${inter.variable} ${poppins.variable} ${notoTamil.variable} ${notoDevanagari.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full bg-bg pb-44 font-sans text-ink md:pb-32">
        <LocaleProvider lang={lang} dict={dict}>
          <PrefsProvider>
            <AudioProvider>
              <AppBar />

              <main className="mx-auto w-full max-w-2xl px-4 md:max-w-4xl xl:max-w-6xl">{children}</main>

              <footer className="mx-auto mt-14 w-full max-w-2xl px-4 pb-4 text-[11px] text-muted md:max-w-4xl xl:max-w-6xl">
                <div className="rounded-[18px] border border-border bg-surface px-5 py-4">
                  <p className="font-display text-[13px] font-semibold text-ink">{SITE.name}</p>
                  <p className="mt-1 leading-relaxed">
                    {fmt(dict.footer.tagline, { count: genres.length })}
                  </p>
                  <nav className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Footer">
                    <LangLink href="/genres" className="hover:text-ink">{dict.footer.allGenres}</LangLink>
                    <LangLink href="/city" className="hover:text-ink">{dict.footer.cities}</LangLink>
                    <LangLink href="/network" className="hover:text-ink">{dict.footer.networks}</LangLink>
                    <LangLink href="/listen" className="hover:text-ink">{dict.footer.abroad}</LangLink>
                    <LangLink href="/recent" className="hover:text-ink">{dict.footer.recent}</LangLink>
                    <LangLink href="/add-station" className="hover:text-ink">{dict.footer.addStation}</LangLink>
                    <LangLink href="/about" className="hover:text-ink">{dict.footer.about}</LangLink>
                    <LangLink href="/contact" className="hover:text-ink">{dict.footer.contact}</LangLink>
                    <LangLink href="/privacy" className="hover:text-ink">{dict.footer.privacy}</LangLink>
                    <LangLink href="/terms" className="hover:text-ink">{dict.footer.terms}</LangLink>
                    <LangLink href="/dmca" className="hover:text-ink">{dict.footer.dmca}</LangLink>
                  </nav>
                  <p className="mt-3 text-[11px]">© {year} {SITE.name}</p>
                </div>
              </footer>

              <PlayerChrome
                total={total}
                npAds={eligibleCampaigns("np-sponsored", { today: await todayCached() })}
              />
              <InstallPrompt />
              <TabBar />
            </AudioProvider>
            <LanguagePickerSheet genres={genres} />
            <ConsentBanner />
            <PageViewBeacon />
          </PrefsProvider>
        </LocaleProvider>
        <SwRegister />
      </body>
    </html>
  );
}
