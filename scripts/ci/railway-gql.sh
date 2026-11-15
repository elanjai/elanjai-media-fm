#!/usr/bin/env bash
# Shared Railway GraphQL client. Source this file; do not execute it.
#
# Requires:
#   RAILWAY_API_TOKEN  — Railway workspace or account token (Bearer auth)
#   curl, jq           — preinstalled on ubuntu-latest runners
#
# Note: the API returns HTTP 200 with an `errors` array on GraphQL-level
# failures, so we always inspect the payload — not just the status code.

RAILWAY_API="${RAILWAY_API:-https://backboard.railway.com/graphql/v2}"

railway_gql() {
  # $1 = GraphQL query/mutation, $2 = variables (JSON object string)
  local query="$1" variables="${2:-{\}}" response
  response="$(
    curl -sfS "$RAILWAY_API" \
      -H "Authorization: Bearer ${RAILWAY_API_TOKEN:?RAILWAY_API_TOKEN is required}" \
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
