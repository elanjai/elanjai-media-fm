#!/usr/bin/env bash
# Roll back to the deployment that ran before the current one
# (deploymentRollback). To roll back to a specific release, pass a tag to
# the Rollback workflow instead — it redeploys that commit via deploy.sh.
#
#   rollback.sh
#
# Env: RAILWAY_API_TOKEN, RAILWAY_PROJECT_ID, RAILWAY_SERVICE_ID,
#      RAILWAY_ENVIRONMENT_ID, APP_URL (optional)

set -euo pipefail
cd "$(dirname "$0")"
source ./railway-gql.sh

: "${RAILWAY_PROJECT_ID:?required}" "${RAILWAY_SERVICE_ID:?required}" "${RAILWAY_ENVIRONMENT_ID:?required}"

CURRENT="$(
  railway_gql \
    'query Current($serviceId: String!, $environmentId: String!) {
       serviceInstance(serviceId: $serviceId, environmentId: $environmentId) {
         latestDeployment { id }
       }
     }' \
    "$(jq -n --arg s "$RAILWAY_SERVICE_ID" --arg e "$RAILWAY_ENVIRONMENT_ID" \
       '{serviceId: $s, environmentId: $e}')" \
  | jq -r '.serviceInstance.latestDeployment.id // empty'
)"

TARGET="$(
  railway_gql \
    'query History($input: DeploymentListInput!, $first: Int) {
       deployments(input: $input, first: $first) {
         edges { node { id status createdAt } }
       }
     }' \
    "$(jq -n \
       --arg p "$RAILWAY_PROJECT_ID" \
       --arg s "$RAILWAY_SERVICE_ID" \
       --arg e "$RAILWAY_ENVIRONMENT_ID" \
       '{input: {projectId: $p, serviceId: $s, environmentId: $e, status: {successfulOnly: true}}, first: 20}')" \
  | jq -r --arg cur "$CURRENT" \
      '[.deployments.edges[].node]
       | sort_by(.createdAt) | reverse
       | map(select(.id != $cur))
       | .[0].id // empty'
)"

if [ -z "$TARGET" ]; then
  echo "No previous successful deployment found to roll back to." >&2
  exit 1
fi
echo "Rollback target deployment: $TARGET"

CAN_ROLLBACK="$(
  railway_gql \
    'query CanRollback($id: String!) { deployment(id: $id) { canRollback } }' \
    "$(jq -n --arg id "$TARGET" '{id: $id}')" \
  | jq -r '.deployment.canRollback'
)"
if [ "$CAN_ROLLBACK" != "true" ]; then
  echo "Deployment $TARGET is not eligible for rollback (canRollback=$CAN_ROLLBACK)." >&2
  echo "Re-run the workflow with a tag (e.g. v1.2.0) to redeploy that release instead." >&2
  exit 1
fi

NEW_ID="$(
  railway_gql \
    'mutation Rollback($id: String!) { deploymentRollback(id: $id) { id } }' \
    "$(jq -n --arg id "$TARGET" '{id: $id}')" \
  | jq -r '.deploymentRollback.id // empty'
)"
echo "Rollback initiated (deployment ${NEW_ID:-$TARGET})."

./wait-for-deployment.sh "${NEW_ID:-$TARGET}"
./verify.sh
