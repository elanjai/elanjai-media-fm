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
 *  - The Google ad allowlist (script/frame) is compiled in only when
 *    NEXT_PUBLIC_ADSENSE_CLIENT is set at build time (F-4.3); until then
 *    the policy stays minimal.
 */
const ADSENSE = Boolean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT);

const AD_SCRIPT = ADSENSE
  ? " https://pagead2.googlesyndication.com https://*.googlesyndication.com https://adservice.google.com https://adservice.google.co.in https://partner.googleadservices.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://fundingchoicesmessages.google.com https://securepubads.g.doubleclick.net"
  : "";
const AD_FRAME = ADSENSE
  ? " https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://securepubads.g.doubleclick.net https://*.googlesyndication.com https://fundingchoicesmessages.google.com"
  : "";

// React dev mode uses eval() for debugging features — allow it only
// outside production so the shipped policy stays tight.
const DEV_EVAL = process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'";

const CSP_BASE = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${DEV_EVAL}${AD_SCRIPT}`,
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
  `frame-src 'self'${AD_FRAME}`,
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
