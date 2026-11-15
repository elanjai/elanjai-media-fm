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
 *  - frame-ancestors 'none' on everything except /embed/* — that route is
 *    the public iframe widget (F-3.5) and is deliberately frameable.
 */
const CSP_BASE = [
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
];

const CSP = [...CSP_BASE, "frame-ancestors 'none'"].join("; ");
const CSP_EMBED = [...CSP_BASE, "frame-ancestors *"].join("; ");

const COMMON_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=15552000" },
];

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  ...COMMON_HEADERS,
  { key: "X-Frame-Options", value: "DENY" },
];

/** /embed/* — frameable by anyone (that is the point of the widget). */
const EMBED_HEADERS = [
  { key: "Content-Security-Policy", value: CSP_EMBED },
  ...COMMON_HEADERS,
];

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  headers() {
    return [
      { source: "/embed/:path*", headers: EMBED_HEADERS },
      { source: "/((?!embed).*)", headers: SECURITY_HEADERS },
    ];
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
