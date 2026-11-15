import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import AudioProvider from "@/components/AudioProvider";
import AppBar from "@/components/AppBar";
import LanguagePickerSheet from "@/components/LanguagePickerSheet";
import PlayerChrome from "@/components/PlayerChrome";
import PrefsProvider from "@/components/PrefsProvider";
import TabBar from "@/components/TabBar";
import { getGenres, getStations } from "@/lib/data";
import { SITE } from "@/lib/site";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Free Indian Radio Online`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — Free Indian Radio Online`,
    description: SITE.description,
    url: SITE.url,
  },
  robots: { index: true, follow: true },
};

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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const genres = getGenres();
  const total = getStations().length;
  const year = await copyrightYear();
  return (
    <html
      lang="en"
      className={`${inter.variable} ${poppins.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full bg-bg pb-44 font-sans text-ink md:pb-32">
        <PrefsProvider>
          <AudioProvider>
            <AppBar />

          <main className="mx-auto w-full max-w-2xl px-4 md:max-w-4xl xl:max-w-6xl">{children}</main>

          <footer className="mx-auto mt-14 w-full max-w-2xl px-4 pb-4 text-[11px] text-muted md:max-w-4xl xl:max-w-6xl">
            <div className="rounded-[18px] border border-border bg-surface px-5 py-4">
              <p className="font-display text-[13px] font-semibold text-ink">{SITE.name}</p>
              <p className="mt-1 leading-relaxed">
                Free online radio — {genres.length} languages, hundreds of live
                stations. Streams belong to their broadcasters.
              </p>
              <nav className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5" aria-label="Footer">
                <Link href="/genres" className="hover:text-ink">All genres</Link>
                <Link href="/recent" className="hover:text-ink">Recently played</Link>
                <Link href="/add-station" className="hover:text-ink">Add your station</Link>
                <Link href="/about" className="hover:text-ink">About</Link>
                <Link href="/contact" className="hover:text-ink">Contact</Link>
                <Link href="/privacy" className="hover:text-ink">Privacy</Link>
                <Link href="/terms" className="hover:text-ink">Terms</Link>
                <Link href="/dmca" className="hover:text-ink">DMCA</Link>
              </nav>
              <p className="mt-3 text-[11px]">© {year} {SITE.name}</p>
            </div>
          </footer>

          <PlayerChrome total={total} />
          <TabBar />
          </AudioProvider>
          <LanguagePickerSheet genres={genres} />
        </PrefsProvider>
      </body>
    </html>
  );
}
