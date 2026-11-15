import type { NextConfig } from "next";

const skipChecks = process.env.NEXT_BUILD_SKIP_CHECKS === "true";

/**
 * Baseline hardening headers on every response.
 *
 * CSP notes:
 *  - script-src needs 'unsafe-inline' for the theme-init inline script and
 *    Next's inline RSC payload; revisit with nonces if a stricter policy is
 *    ever wanted.
 *  - media-src allows direct broadcaster streams (https:/http:) plus blob:
 *    for hls.js MediaSource playback.
 *  - connect-src covers our same-origin APIs plus direct streams/metadata
 *    endpoints.
 *  - frame-ancestors 'none' — nothing should embed this app today (the
 *    planned broadcaster widget will revisit this).
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https: http:",
  "font-src 'self' data:",
  "connect-src 'self' https: http:",
  "media-src 'self' blob: https: http:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=15552000" },
];

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  typescript: {
    ignoreBuildErrors: skipChecks,
  },
  experimental: skipChecks ? { cpus: 4 } : {},
  allowedDevOrigins: ["192.168.1.5", "192.168.1.*"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
