#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/docker-cli-lib.sh"
API_BASE="${API_BASE:-http://127.0.0.1:3001}"
UI_BASE="${UI_BASE:-http://127.0.0.1:5173}"
export DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-1}"

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
  for _ in $(seq 1 80); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.5
  done
  printf 'Timed out waiting for %s at %s\n' "$label" "$url" >&2
  return 1
}

cd "$ROOT_DIR"

log "Build packaged Docker services"
docker_cli compose build local-api vue-ui

log "Start packaged Docker services"
docker_cli compose up -d local-api vue-ui
wait_for_url "$API_BASE/health" "Docker API"
wait_for_url "$UI_BASE/health" "Docker UI"

log "Reset Docker API state"
api POST /api/nyec/admin/reset >/dev/null

log "Run Docker synthetic operational workflow"
BATCH_JSON="$(api POST /api/nyec/mef/batches '{
  "fileName": "docker-validation.csv",
  "csvText": "MemberID,FirstName,LastName,Phone,Facility,NpiLocation\n20001,Dora,Docker,+15555550201,NYC Health Center Docker,1234567890\n20002,Eli,Docker,+15555550202,NYC Health Center Docker,1234567890\n20003,NoPhone,Docker,,NYC Health Center Docker,1234567890"
}')"
BATCH_ID="$(node -e "const r=JSON.parse(process.argv[1]); if(!r.ok) throw new Error(JSON.stringify(r)); console.log(r.data.id)" "$BATCH_JSON")"

CAMPAIGN_JSON="$(api POST /api/nyec/campaigns "{
  \"name\": \"Docker Validation Campaign\",
  \"facility\": \"NYC Health Center Docker\",
  \"npiLocation\": \"1234567890\",
  \"mefBatchId\": $BATCH_ID,
  \"dailyLimit\": 2,
  \"smsBody\": \"Hello {{firstName}}, complete your Docker validation questionnaire. Reply STOP to opt out.\"
}")"
CAMPAIGN_ID="$(node -e "const r=JSON.parse(process.argv[1]); if(!r.ok) throw new Error(JSON.stringify(r)); console.log(r.data.id)" "$CAMPAIGN_JSON")"

LAUNCH_JSON="$(api POST "/api/nyec/campaigns/$CAMPAIGN_ID/launch")"
DISPATCH_JSON="$(api POST "/api/nyec/campaigns/$CAMPAIGN_ID/dispatches")"
MESSAGE_SID="$(node -e "const r=JSON.parse(process.argv[1]); if(!r.ok) throw new Error(JSON.stringify(r)); console.log(r.data.messages[0].sid)" "$DISPATCH_JSON")"

STATUS_JSON="$(api POST /api/nyec/sms/status "{\"MessageSid\":\"$MESSAGE_SID\",\"MessageStatus\":\"delivered\"}")"
STOP_JSON="$(api POST /api/nyec/sms/inbound '{"From":"+15555550201","Body":"STOP"}')"
OPTOUTS_AFTER_STOP="$(api GET /api/nyec/opt-outs)"
START_JSON="$(api POST /api/nyec/sms/inbound '{"From":"+15555550201","Body":"START"}')"
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
assert(optStop.ok && optStop.data.some((entry) => entry.phone === '+15555550201'), 'Active opt-out list did not include STOP phone')
assert(start.ok && start.data.action === 'OPT_OUT_REMOVED' && start.data.optedOut === false, 'START did not remove the opt-out')
assert(optStart.ok && !optStart.data.some((entry) => entry.phone === '+15555550201'), 'Active opt-out list still included START phone')
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

log "Check Docker UI routes"
for route in / /command-center /dashboard /twilio /mef /mef-intake /campaigns /dispatches /admin /billing; do
  status="$(curl -fsS -o /dev/null -w '%{http_code}' "$UI_BASE$route")"
  if [[ "$status" != "200" ]]; then
    printf 'Expected %s%s to return 200, got %s\n' "$UI_BASE" "$route" "$status" >&2
    exit 1
  fi
  printf '%s %s\n' "$route" "$status"
done

log "Final Docker API reset"
RESET_JSON="$(api POST /api/nyec/admin/reset)"
node - <<'NODE' "$RESET_JSON"
const response = JSON.parse(process.argv[2])
if (!response.ok) throw new Error(JSON.stringify(response))
const data = response.data
if (data.campaigns !== 0 || data.mefBatches !== 0 || data.dispatches !== 0 || data.outboundMessages !== 0 || data.optOuts !== 0) {
  throw new Error(`Reset did not clear state: ${JSON.stringify(data)}`)
}
console.log('Docker API state reset confirmed')
NODE

log "Docker operational validation complete"
printf 'Containers are still running for inspection. Stop them with: docker compose down\n'
