#!/usr/bin/env bash
#
# Delete everything deploy.sh created, so spend goes to zero.
#
#   ./deploy/teardown.sh YOUR_PROJECT_ID
#
# The rules say the app need not be live at judging time. Once the demo video is
# recorded, there is no reason to leave anything running.
set -euo pipefail
PROJECT="${1:?usage: ./deploy/teardown.sh PROJECT_ID}"
REGION="${REGION:-us-central1}"

gcloud config set project "$PROJECT"

echo "This deletes both Cloud Run services and the scheduler job in $PROJECT."
read -rp "Type the project id again to confirm: " CONFIRM
[ "$CONFIRM" = "$PROJECT" ] || { echo "Mismatch — nothing deleted."; exit 1; }

gcloud scheduler jobs delete vastunest-overnight --location "$REGION" --quiet 2>/dev/null || true
gcloud run services delete vastunest-ui --region "$REGION" --quiet 2>/dev/null || true
gcloud run services delete vastunest-agent --region "$REGION" --quiet 2>/dev/null || true

echo
echo "Cloud Run services and the scheduler are gone."
echo "Left alone on purpose (they cost nothing and hold your data):"
echo "  · Firestore database"
echo "  · Secret Manager secret 'gemini-api-key'"
