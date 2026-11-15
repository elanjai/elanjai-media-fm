"use client";

/**
 * Root-level error boundary. Replaces the whole document when the root
 * layout itself throws — so it can't rely on globals.css, providers, or
 * fonts; everything here is inline and dependency-free.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          background: "#fcfcf6",
          color: "#10241a",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
          textAlign: "center",
          padding: "0 20px",
        }}
      >
        <p
          aria-hidden
          style={{
            margin: 0,
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "#0b3d2e",
            color: "#fde047",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            fontWeight: 800,
          }}
        >
          FM
        </p>
        <h1 style={{ fontSize: 20, margin: 0 }}>Something went wrong</h1>
        <p style={{ fontSize: 14, color: "#5f7268", margin: 0, maxWidth: 340 }}>
          Elanjai FM hit an unexpected problem. Please try again.
          {error?.digest ? (
            <span style={{ display: "block", marginTop: 4, fontSize: 12 }}>
              Ref: {error.digest}
            </span>
          ) : null}
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: 8,
            border: 0,
            borderRadius: 999,
            background: "#fde047",
            color: "#2a2300",
            fontSize: 14,
            fontWeight: 600,
            padding: "10px 24px",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
