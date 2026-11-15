#!/usr/bin/env bash
# Shared Railway GraphQL client. Source this file; do not execute it.
#
# Auth (either works):
#   RAILWAY_PROJECT_TOKEN — project token (Railway project → Settings → Tokens).
#     Narrowest scope; sent via the `Project-Access-Token` header.
#   RAILWAY_API_TOKEN     — workspace or account token
#     (railway.com → Account Settings → Tokens). Sent via `Authorization: Bearer`.
#
# Requires curl + jq (preinstalled on ubuntu-latest runners).
#
# Note: the API returns HTTP 200 with an `errors` array on GraphQL-level
# failures (including "Not Authorized"), so we inspect the payload — not
# just the status code.

RAILWAY_API="${RAILWAY_API:-https://backboard.railway.com/graphql/v2}"

_railway_auth() {
  if [ -n "${RAILWAY_PROJECT_TOKEN:-}" ]; then
    printf 'Project-Access-Token: %s' "$RAILWAY_PROJECT_TOKEN"
  elif [ -n "${RAILWAY_API_TOKEN:-}" ]; then
    printf 'Authorization: Bearer %s' "$RAILWAY_API_TOKEN"
  else
    echo "No Railway token set — provide RAILWAY_PROJECT_TOKEN (project token) or RAILWAY_API_TOKEN (workspace/account token)." >&2
    return 1
  fi
}

railway_gql() {
  # $1 = GraphQL query/mutation, $2 = variables (JSON object string)
  local query="$1" variables="${2:-{\}}" response
  response="$(
    curl -sfS "$RAILWAY_API" \
      -H "$(_railway_auth)" \
      -H "Content-Type: application/json" \
      -d "$(jq -n --arg q "$query" --argjson v "$variables" '{query: $q, variables: $v}')"
  )"
  if jq -e '(.errors // []) | length > 0' <<<"$response" >/dev/null; then
    echo "Railway API error:" >&2
    jq -c '.errors' <<<"$response" >&2
    return 1
  fi
  jq '.data' <<<"$response"
}
