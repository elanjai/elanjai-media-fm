#!/usr/bin/env bash
# Poll a Railway deployment until it reaches a terminal status.
#
#   wait-for-deployment.sh <deployment-id>
#
# Env: DEPLOY_TIMEOUT_MINUTES (default 20)

set -euo pipefail
cd "$(dirname "$0")"
source ./railway-gql.sh

ID="${1:?usage: wait-for-deployment.sh <deployment-id>}"
TIMEOUT_MINUTES="${DEPLOY_TIMEOUT_MINUTES:-20}"
deadline=$((SECONDS + TIMEOUT_MINUTES * 60))

echo "Waiting for deployment $ID (timeout ${TIMEOUT_MINUTES}m)..."
while [ "$SECONDS" -lt "$deadline" ]; do
  status="$(
    railway_gql \
      'query Status($id: String!) { deployment(id: $id) { status } }' \
      "$(jq -n --arg id "$ID" '{id: $id}')" \
    | jq -r '.deployment.status // "UNKNOWN"'
  )"
  echo "  status: $status"
  case "$status" in
    SUCCESS)
      echo "Deployment succeeded."
      exit 0
      ;;
    FAILED | CRASHED | REMOVED | SKIPPED)
      echo "Deployment ended in $status." >&2
      exit 1
      ;;
  esac
  sleep 15
done

echo "Timed out waiting for deployment $ID." >&2
exit 1
