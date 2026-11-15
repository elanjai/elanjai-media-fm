#!/usr/bin/env bash
# Deploy an exact commit to Railway, wait for it, verify the live app.
#
#   deploy.sh <commit-sha>
#
# Env: RAILWAY_API_TOKEN, RAILWAY_SERVICE_ID, RAILWAY_ENVIRONMENT_ID,
#      APP_URL (optional — enables live verification)

set -euo pipefail
cd "$(dirname "$0")"
source ./railway-gql.sh

SHA="${1:?usage: deploy.sh <commit-sha>}"

DEPLOYMENT_ID="$(
  railway_gql \
    'mutation Deploy($serviceId: String!, $environmentId: String!, $commitSha: String!) {
       serviceInstanceDeployV2(serviceId: $serviceId, environmentId: $environmentId, commitSha: $commitSha)
     }' \
    "$(jq -n \
       --arg s "${RAILWAY_SERVICE_ID:?RAILWAY_SERVICE_ID is required}" \
       --arg e "${RAILWAY_ENVIRONMENT_ID:?RAILWAY_ENVIRONMENT_ID is required}" \
       --arg c "$SHA" \
       '{serviceId: $s, environmentId: $e, commitSha: $c}')" \
  | jq -r '.serviceInstanceDeployV2 // empty'
)"

if [ -z "$DEPLOYMENT_ID" ]; then
  echo "Railway did not return a deployment id." >&2
  exit 1
fi
echo "Deployment queued: $DEPLOYMENT_ID (commit ${SHA:0:8})"

./wait-for-deployment.sh "$DEPLOYMENT_ID"
./verify.sh "$SHA"
