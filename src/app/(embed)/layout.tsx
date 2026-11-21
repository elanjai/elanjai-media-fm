import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import "../globals.css";

/**
 * Root layout for the (embed) route group — bare-bones chrome for the
 * public iframe widget (F-3.5). No app bar, tab bar, providers or locale:
 * embeds render a single self-contained player card.
 */
export const metadata: Metadata = {
  // The app-root opengraph-image.png resolves against this; without it the
  // whole (embed) tree falls back to localhost in production. String form —
  // URL instances don't survive cacheComponents metadata serialization.
  metadataBase: SITE.url,
};
export default function EmbedRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ background: "transparent" }}>
      <body style={{ margin: 0, background: "transparent" }}>{children}</body>
    </html>
  );
}
