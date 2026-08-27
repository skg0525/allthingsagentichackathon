#!/usr/bin/env bash
#
# One-shot deploy of VastuNest to Google Cloud.
#
#   ./deploy/deploy.sh YOUR_PROJECT_ID
#
# Creates: Firestore, a Secret Manager secret for the Gemini key, two Cloud Run
# services (both min-instances=0 so idle cost is zero), and the Cloud Scheduler
# job that drives the autonomous overnight agent.
set -euo pipefail

PROJECT="${1:?usage: ./deploy/deploy.sh PROJECT_ID}"
REGION="${REGION:-us-central1}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> project=$PROJECT region=$REGION"
gcloud config set project "$PROJECT"

echo "==> enabling APIs"
gcloud services enable \
  run.googleapis.com \
  firestore.googleapis.com \
  cloudscheduler.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com

echo "==> Firestore"
if gcloud firestore databases describe --database='(default)' >/dev/null 2>&1; then
  echo "    already exists"
else
  echo "    creating (this is what makes /api/health say 'firestore' not 'local store')"
  gcloud firestore databases create --location=nam5 \
    || echo "    !! FAILED — the agent will fall back to local JSON storage."
fi

# The Cloud Run runtime service account needs to actually read and write it.
RUNTIME_SA="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')-compute@developer.gserviceaccount.com"
echo "==> granting Firestore access to $RUNTIME_SA"
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member "serviceAccount:$RUNTIME_SA" \
  --role roles/datastore.user --condition=None >/dev/null 2>&1 \
  || echo "    !! could not grant roles/datastore.user — grant it by hand"

if ! gcloud secrets describe gemini-api-key >/dev/null 2>&1; then
  echo "==> storing the Gemini key in Secret Manager"
  read -rsp "Paste your GEMINI_API_KEY: " KEY; echo
  printf '%s' "$KEY" | gcloud secrets create gemini-api-key --data-file=-
else
  echo "==> secret gemini-api-key already exists"
fi

echo "==> deploying the agent backend"
gcloud run deploy vastunest-agent \
  --source "$ROOT/backend" \
  --region "$REGION" \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances "${MAX_INSTANCES:-2}" \
  --concurrency 20 \
  --memory 1Gi \
  --cpu 1 \
  --timeout 600 \
  --set-secrets "GEMINI_API_KEY=gemini-api-key:latest" \
  --set-env-vars "GOOGLE_CLOUD_PROJECT=$PROJECT,DAILY_MODEL_CALL_BUDGET=${DAILY_MODEL_CALL_BUDGET:-400}"

API_URL="$(gcloud run services describe vastunest-agent --region "$REGION" --format='value(status.url)')"
# Cloud Run now serves two hostnames per service. Use whichever the API reports
# as canonical so the UI and the scheduler both point at the same one.
echo "==> agent is at $API_URL"

echo "==> deploying the UI"
gcloud run deploy vastunest-ui \
  --source "$ROOT/frontend" \
  --region "$REGION" \
  --allow-unauthenticated \
  --min-instances 0 \
  --max-instances 2 \
  --memory 512Mi \
  --set-env-vars "API_BASE=$API_URL"

UI_URL="$(gcloud run services describe vastunest-ui --region "$REGION" --format='value(status.url)')"

# Lock CORS to the deployed UI now that we know its hostname.
gcloud run services update vastunest-agent --region "$REGION" \
  --update-env-vars "CORS_ORIGIN=$UI_URL"

echo "==> Cloud Scheduler: the autonomous overnight run"
SA="vastunest-scheduler@${PROJECT}.iam.gserviceaccount.com"
gcloud iam service-accounts create vastunest-scheduler \
  --display-name "VastuNest scheduler" 2>/dev/null || true
gcloud run services add-iam-policy-binding vastunest-agent \
  --region "$REGION" --member "serviceAccount:$SA" --role roles/run.invoker >/dev/null

gcloud scheduler jobs delete vastunest-overnight --location "$REGION" --quiet 2>/dev/null || true
gcloud scheduler jobs create http vastunest-overnight \
  --location "$REGION" \
  --schedule "0 6 * * *" \
  --time-zone "America/New_York" \
  --uri "$API_URL/api/agent/run?userId=demo_buyer_1&trigger=schedule" \
  --http-method POST \
  --oidc-service-account-email "$SA" \
  --attempt-deadline 540s

cat <<EOF

────────────────────────────────────────────────────────────
  UI        $UI_URL
  Agent     $API_URL
  Health    $API_URL/api/health
  Scheduler vastunest-overnight — 06:00 America/New_York daily

  Spend controls now live:
    max-instances 2         hard ceiling on concurrent containers
    min-instances 0         nothing runs, nothing bills, when idle
    ${DAILY_MODEL_CALL_BUDGET:-400} model calls/day  per instance, enforced in-process
    per-IP throttles        12 scans/min, 6 uploads/min, 4 agent runs/5min

  Trigger the autonomous run by hand:
    gcloud scheduler jobs run vastunest-overnight --location $REGION

  Tear it all down when you are done recording:
    ./deploy/teardown.sh $PROJECT
────────────────────────────────────────────────────────────
EOF
