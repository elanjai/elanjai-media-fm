#!/usr/bin/env bash
# Post-deploy verification: hit /api/health on the live site and report the
# version/commit actually serving traffic.
#
#   verify.sh [expected-commit-sha]
#
# Env: APP_URL — public base URL of the service (optional; skips if unset)

set -euo pipefail

EXPECTED_SHA="${1:-}"

if [ -z "${APP_URL:-}" ]; then
  echo "APP_URL not set — skipping live health verification."
  exit 0
fi

# Tolerate a value pasted without the scheme.
[[ "$APP_URL" != http://* && "$APP_URL" != https://* ]] && APP_URL="https://$APP_URL"

url="${APP_URL%/}/api/health"
echo "Verifying $url ..."
body="$(curl -sfS --retry 6 --retry-all-errors --retry-delay 5 \
  --connect-timeout 10 --max-time 30 "$url")" || {
  echo "Health check failed — $url did not respond." >&2
  exit 1
}

echo "$body" | jq .
[ "$(jq -r '.status' <<<"$body")" = "ok" ] || {
  echo "Unhealthy response from $url" >&2
  exit 1
}

version="$(jq -r '.version' <<<"$body")"
commit="$(jq -r '.commit' <<<"$body")"
echo "Live version: v$version (commit: $commit)"

if [ -n "$EXPECTED_SHA" ] && [ "$commit" != "unknown" ] && [[ "$EXPECTED_SHA" != "$commit"* ]]; then
  echo "::warning::Expected commit $EXPECTED_SHA but the app reports $commit" >&2
fi
