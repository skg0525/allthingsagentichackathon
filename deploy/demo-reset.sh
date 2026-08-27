#!/usr/bin/env bash
#
# Put the app into a clean, recordable state.
#
#   ./deploy/demo-reset.sh           # seeded — instant scan, prove liveness per-property
#   ./deploy/demo-reset.sh --cold    # drop the shipped seed too, everything read live
#   API=https://vastunest-agent-xxx.run.app ./deploy/demo-reset.sh
#
# Close or reload the VastuNest tab before running this. A scan still streaming
# in an open tab will refill the perception cache the moment we clear it, and
# you would walk into the recording believing the analysis is live when it is
# being served from cache.
set -euo pipefail
API="${API:-http://localhost:8080}"
USER="${USER_ID:-demo_buyer_1}"
COLD=false
[ "${1:-}" = "--cold" ] && COLD=true

say() { printf '  · %s\n' "$1"; }

echo "==> target $API"

# --- 0. refuse to run into a moving target ---------------------------------
ACTIVE="$(curl -fsS "$API/api/health" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("activeScans", 0))')"
if [ "$ACTIVE" != "0" ]; then
  echo
  echo "  !! $ACTIVE scan(s) are still streaming."
  echo "  !! Close or reload the VastuNest tab, wait for it to settle, then re-run."
  exit 1
fi

# --- 1. agent state --------------------------------------------------------
say "resetting learned preferences    (so the feedback beat lands fresh)"
curl -fsS -X POST "$API/api/profile/reset?userId=$USER" >/dev/null

say "setting tradition back to Vastu  (so the Feng Shui switch is a surprise)"
curl -fsS -X PATCH "$API/api/profile?userId=$USER" \
  -H 'Content-Type: application/json' -d '{"tradition":"vastu"}' >/dev/null

say "clearing agent briefs + seen list"
curl -fsS -X POST "$API/api/agent/reset?userId=$USER" >/dev/null

# --- 2. the overnight run --------------------------------------------------
# Runs BEFORE the cache clear, because it populates the cache for the two new
# listings and we want that wiped too.
say "running the overnight agent      (so 'While you were away' has content)"
curl -fsS -X POST "$API/api/agent/run?userId=$USER&trigger=schedule" \
  | python3 -c "import json,sys; print('    →', json.load(sys.stdin)['brief']['summary'])"

# --- 3. cache last ---------------------------------------------------------
if [ "$COLD" = true ]; then
  say "clearing perception cache        (COLD — every reading will be live)"
  curl -fsS -X POST "$API/api/cache/clear" >/dev/null
else
  say "keeping the shipped perception seed (scan will be instant)"
  say "  → prove liveness on camera with 'Re-read the plans' on one property"
fi

# An open tab can start a scan a beat after the clear — the activeScans guard
# only catches one already in flight. Settle, then check what actually stuck.
[ "$COLD" = true ] && sleep 4

# --- 4. verify -------------------------------------------------------------
echo
echo "==> verifying"
COLD=$COLD curl -fsS "$API/api/health" | python3 -c "
import json, os, sys
d = json.load(sys.stdin)
cold = os.environ.get('COLD') == 'true'
demo = {f'prop_10{n}' for n in range(1, 9)}
dirty = sorted(demo & set(d['perceptionCache']['ids'])) if cold else []
print(f\"    model    {d['model']}\")
print(f\"    memory   {d['memoryBackend']}\")
print(f\"    revision {d['revision']}\")
print(f\"    cache    {d['perceptionCache']['entries']} entries\")
if dirty:
    print()
    print(f\"    !! {len(dirty)} demo propert{'y' if len(dirty)==1 else 'ies'} re-cached after the clear:\")
    print(f\"    !! {', '.join(dirty)}\")
    print( \"    !!\")
    print( \"    !! An open VastuNest tab started a scan right after the reset.\")
    print( \"    !! Close EVERY VastuNest tab, then run this script again.\")
    sys.exit(1)
print( \"    live     no demo property is cached — the on-camera scan will be real\"
       if cold else
       \"    seeded   scan will be instant; use 'Re-read the plans' to prove liveness\")
"

# The brief must have survived the cache clear; it lives in its own store.
curl -fsS "$API/api/agent/briefs?userId=$USER" | python3 -c "
import json, sys
bs = json.load(sys.stdin)['briefs']
if not bs:
    print('    !! no agent brief — the \"While you were away\" panel will be empty'); sys.exit(1)
print(f\"    brief    {len(bs)} run(s), latest notify={bs[0]['notify']}\")
"

echo
echo "Ready. Open the UI and do NOT click Analyze until you are recording."
