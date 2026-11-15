import type { NextConfig } from "next";

const skipChecks = process.env.NEXT_BUILD_SKIP_CHECKS === "true";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
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
