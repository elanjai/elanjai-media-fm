import "../globals.css";

/**
 * Root layout for the (embed) route group — bare-bones chrome for the
 * public iframe widget (F-3.5). No app bar, tab bar, providers or locale:
 * embeds render a single self-contained player card.
 */
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
