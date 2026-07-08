#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$ROOT_DIR/local-api"
UI_DIR="$ROOT_DIR/vue-ui"
API_BASE="${API_BASE:-http://127.0.0.1:3001}"
UI_BASE="${UI_BASE:-http://127.0.0.1:5173}"

API_PID=""
UI_PID=""

cleanup() {
  if [[ -n "$API_PID" ]] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
  fi
  if [[ -n "$UI_PID" ]] && kill -0 "$UI_PID" 2>/dev/null; then
    kill "$UI_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

log() {
  printf '\n==> %s\n' "$1"
}

api() {
  local method="$1"
  local path="$2"
  local body="${3:-}"

  if [[ -n "$body" ]]; then
    curl -fsS -H 'content-type: application/json' -d "$body" "$API_BASE$path"
  elif [[ "$method" == "GET" ]]; then
    curl -fsS "$API_BASE$path"
  else
    curl -fsS -H 'content-type: application/json' -d '{}' "$API_BASE$path"
  fi
}

wait_for_url() {
  local url="$1"
  local label="$2"
  for _ in $(seq 1 40); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.25
  done
  printf 'Timed out waiting for %s at %s\n' "$label" "$url" >&2
  return 1
}

log "Install and test local API"
(
  cd "$API_DIR"
  [[ -f .env ]] || cp .env.example .env
  npm install
  npm test
)

log "Test and build Vue UI"
(
  cd "$UI_DIR"
  [[ -f .env ]] || cp .env.example .env
  npm install
  node --test src/api/contracts.test.mjs
  npm run build
)

if curl -fsS "$API_BASE/health" >/dev/null 2>&1; then
  log "Using existing API at $API_BASE"
else
  log "Starting API at $API_BASE"
  (
    cd "$API_DIR"
    npm run start
  ) &
  API_PID="$!"
fi
wait_for_url "$API_BASE/health" "API"

if curl -fsS "$UI_BASE" >/dev/null 2>&1; then
  log "Using existing UI at $UI_BASE"
else
  log "Starting UI at $UI_BASE"
  (
    cd "$UI_DIR"
    npm run dev -- --host 127.0.0.1
  ) &
  UI_PID="$!"
fi
wait_for_url "$UI_BASE" "UI"

log "Reset local API state"
api POST /api/nyec/admin/reset >/dev/null

log "Run synthetic MEF, campaign, dispatch, callback, and opt-out workflow"
BATCH_JSON="$(api POST /api/nyec/mef/batches '{
  "fileName": "local-validation.csv",
  "csvText": "MemberID,FirstName,LastName,Phone,Facility,NpiLocation\n10001,Ana,Test,+15555550101,NYC Health Center A,1234567890\n10002,Ben,Test,+15555550102,NYC Health Center A,1234567890\n10003,NoPhone,Test,,NYC Health Center A,1234567890"
}')"
BATCH_ID="$(node -e "const r=JSON.parse(process.argv[1]); if(!r.ok) throw new Error(JSON.stringify(r)); console.log(r.data.id)" "$BATCH_JSON")"

CAMPAIGN_JSON="$(api POST /api/nyec/campaigns "{
  \"name\": \"Local Validation Campaign\",
  \"facility\": \"NYC Health Center A\",
  \"npiLocation\": \"1234567890\",
  \"mefBatchId\": $BATCH_ID,
  \"dailyLimit\": 2,
  \"smsBody\": \"Hello {{firstName}}, complete your local validation questionnaire. Reply STOP to opt out.\"
}")"
CAMPAIGN_ID="$(node -e "const r=JSON.parse(process.argv[1]); if(!r.ok) throw new Error(JSON.stringify(r)); console.log(r.data.id)" "$CAMPAIGN_JSON")"

LAUNCH_JSON="$(api POST "/api/nyec/campaigns/$CAMPAIGN_ID/launch")"
DISPATCH_JSON="$(api POST "/api/nyec/campaigns/$CAMPAIGN_ID/dispatches")"
MESSAGE_SID="$(node -e "const r=JSON.parse(process.argv[1]); if(!r.ok) throw new Error(JSON.stringify(r)); console.log(r.data.messages[0].sid)" "$DISPATCH_JSON")"

STATUS_JSON="$(api POST /api/nyec/sms/status "{\"MessageSid\":\"$MESSAGE_SID\",\"MessageStatus\":\"delivered\"}")"
STOP_JSON="$(api POST /api/nyec/sms/inbound '{"From":"+15555550101","Body":"STOP"}')"
OPTOUTS_AFTER_STOP="$(api GET /api/nyec/opt-outs)"
START_JSON="$(api POST /api/nyec/sms/inbound '{"From":"+15555550101","Body":"START"}')"
OPTOUTS_AFTER_START="$(api GET /api/nyec/opt-outs)"
DASHBOARD_JSON="$(api GET /api/nyec/dashboard)"
BILLING_JSON="$(api GET /api/nyec/billing/summary)"
AUDIT_JSON="$(api GET /api/nyec/audit/events)"

node - <<'NODE' "$BATCH_JSON" "$CAMPAIGN_JSON" "$LAUNCH_JSON" "$DISPATCH_JSON" "$STATUS_JSON" "$STOP_JSON" "$OPTOUTS_AFTER_STOP" "$START_JSON" "$OPTOUTS_AFTER_START" "$DASHBOARD_JSON" "$BILLING_JSON" "$AUDIT_JSON"
const [batch, campaign, launch, dispatch, status, stop, optStop, start, optStart, dashboard, billing, audit] = process.argv.slice(2).map(JSON.parse)
function assert(condition, message) {
  if (!condition) throw new Error(message)
}
assert(batch.ok && batch.data.validRows === 2 && batch.data.rejectedRows === 1, 'MEF import did not produce 2 valid rows and 1 rejected row')
assert(campaign.ok && campaign.data.id, 'Campaign was not created')
assert(launch.ok && launch.data.status === 'RUNNING', 'Campaign did not launch')
assert(dispatch.ok && dispatch.data.queued === 2 && dispatch.data.messages.length === 2, 'Dispatch did not queue 2 messages')
assert(status.ok && status.data.status === 'delivered', 'Status callback did not mark the generated SID delivered')
assert(stop.ok && stop.data.action === 'OPT_OUT_CREATED' && stop.data.optedOut === true, 'STOP did not create an active opt-out')
assert(optStop.ok && optStop.data.some((entry) => entry.phone === '+15555550101'), 'Active opt-out list did not include STOP phone')
assert(start.ok && start.data.action === 'OPT_OUT_REMOVED' && start.data.optedOut === false, 'START did not remove the opt-out')
assert(optStart.ok && !optStart.data.some((entry) => entry.phone === '+15555550101'), 'Active opt-out list still included START phone')
assert(dashboard.ok && dashboard.data.messagesSentToday >= 2, 'Dashboard did not reflect sent messages')
assert(billing.ok && billing.data.billableMessages >= 2, 'Billing did not reflect dispatch messages')
assert(audit.ok && audit.data.length >= 1, 'Audit events were not recorded')
console.log(JSON.stringify({
  batch: { id: batch.data.id, validRows: batch.data.validRows, rejectedRows: batch.data.rejectedRows },
  campaign: { id: campaign.data.id, status: launch.data.status },
  dispatch: { id: dispatch.data.id, queued: dispatch.data.queued, simulated: dispatch.data.simulated, firstSid: dispatch.data.messages[0].sid },
  callback: { sid: status.data.sid, status: status.data.status },
  optOuts: { afterStop: optStop.data.length, afterStart: optStart.data.length },
  dashboard: { messagesSentToday: dashboard.data.messagesSentToday, activeCampaigns: dashboard.data.activeCampaigns },
  billing: { billableMessages: billing.data.billableMessages, entries: billing.data.entries.length },
  auditEvents: audit.data.length
}, null, 2))
NODE

log "Check UI routes"
for route in / /command-center /dashboard /twilio /mef /mef-intake /campaigns /dispatches /admin /billing; do
  status="$(curl -fsS -o /dev/null -w '%{http_code}' "$UI_BASE$route")"
  if [[ "$status" != "200" ]]; then
    printf 'Expected %s%s to return 200, got %s\n' "$UI_BASE" "$route" "$status" >&2
    exit 1
  fi
  printf '%s %s\n' "$route" "$status"
done

log "Optional Twilio test-send check"
set +e
TWILIO_RESPONSE="$(curl -sS -m 20 -H 'content-type: application/json' -d '{"to":"+15005550006","body":"NYeC local validation test"}' "$API_BASE/api/nyec/twilio/test" 2>&1)"
TWILIO_EXIT=$?
set -e
if [[ "$TWILIO_EXIT" -eq 0 ]]; then
  node - <<'NODE' "$TWILIO_RESPONSE"
const response = JSON.parse(process.argv[2])
if (response.ok) {
  console.log(`Twilio test-send accepted: ${response.data.sid ?? response.data.status}`)
} else {
  const code = response.error?.code ?? 'UNKNOWN_ERROR'
  const message = response.error?.message ?? JSON.stringify(response)
  console.log(`Twilio test-send non-blocking result: ${code} - ${message}`)
}
NODE
else
  printf 'Twilio test-send non-blocking transport result: %s\n' "$TWILIO_RESPONSE"
fi

log "Final reset"
RESET_JSON="$(api POST /api/nyec/admin/reset)"
node - <<'NODE' "$RESET_JSON"
const response = JSON.parse(process.argv[2])
if (!response.ok) throw new Error(JSON.stringify(response))
const data = response.data
if (data.campaigns !== 0 || data.mefBatches !== 0 || data.dispatches !== 0 || data.outboundMessages !== 0 || data.optOuts !== 0) {
  throw new Error(`Reset did not clear state: ${JSON.stringify(data)}`)
}
console.log('Local API state reset confirmed')
NODE

log "Local operational validation complete"
