# syntax=docker/dockerfile:1
#
# Multi-stage build for the Next.js 16 app. Produces a minimal production
# image from `.next/standalone` (only traced deps — no npm install needed).
#
#   docker build -t elanjai-media-fm .
#   docker run -p 3000:3000 elanjai-media-fm
#
# Railway injects PORT at runtime; server.js binds $HOSTNAME:$PORT.

FROM node:22-alpine AS base
WORKDIR /app

# --- Dependencies: cached unless package-lock.json changes -------------------
FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,id=s/a5ffb2de-b8d0-4f4d-a4c6-514f4240bff6-/root/.npm,target=/root/.npm \
    npm ci --no-audit --no-fund

# --- Build -------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Public env vars are inlined into the bundle at build time. Railway passes
# service variables as build args for Dockerfile builds.
ARG NEXT_PUBLIC_SITE_URL=https://elanjai-fm.up.railway.app
# NEXT_BUILD_SKIP_CHECKS: lint/typecheck run in the Release workflow before a
# tag exists — Railway only rebuilds tagged commits, so skipping them here is
# safe and keeps build memory low (tsc is the heaviest build step).
# No .next/cache mount: a stale/corrupt Turbopack cache survives rebuilds and
# can crash the compiler silently — a clean build is the safer default.
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_BUILD_SKIP_CHECKS=true

RUN npm run build

# --- Runtime -----------------------------------------------------------------
FROM base AS runner

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# Baked-in provenance for /api/health (Railway also injects
# RAILWAY_GIT_COMMIT_SHA at runtime, which the route uses as fallback).
ARG GIT_SHA
ENV GIT_SHA=${GIT_SHA}

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# server.js + traced node_modules, plus the two dirs standalone omits.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
