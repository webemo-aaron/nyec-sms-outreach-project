# NYeC SMS Outreach Manager

This repository now carries two parallel tracks:

1. The production-oriented IRIS/ObjectScript foundation under `iris/`.
2. The laptop-operational Node/Vue workflow under `local-api/` and `vue-ui/`.

For day-to-day local testing on this branch, use the Node API plus Vue UI.

## Repository Layout

```text
iris/
  Dockerfile
  README.md
  src/cls/
    HSOUTREACH/...      ObjectScript persistent classes, services, REST API
    HSREGISTRY/MEF/...  MEF batch and record classes
    HSAUDIT/...         Audit event class/service
    HSFRAMEWORK/...     Shared response/security utilities
  tests/cls/            %UnitTest starter tests
  module.xml            ZPM-style module descriptor

local-api/
  src/                  Node.js local operational API
  test/                 Node test suite

vue-ui/
  src/                  Vue 3 operational UI

api/openapi.yaml        Operational laptop API contract
coding-agent-prompts.md Current backend/frontend/testing prompts
docs/testing/           Laptop testing checklist and evidence notes
```

## Laptop Operational Runbook

This runbook is the end-to-end local workflow for July 8, 2026. It covers the
operator path the Node/Vue stack is expected to support on a laptop, including
the HTTP callback simulations used during testing.

### Fast validation path

From the repository root, run the canonical local validation script:

```bash
./scripts/local-operational-validation.sh
```

The script installs dependencies, runs API tests, runs the Vue contract test and
production build, starts API/UI services when they are not already running,
drives a synthetic MEF/campaign/dispatch/callback workflow, checks the expected
UI routes, reports the optional Twilio test-send result, and resets local state
at the end.

Use the manual steps below when you need to inspect or repeat one part of the
workflow by hand.

### Docker validation path

After the local workflow is passing, build and run the packaged Docker services:

```bash
./scripts/docker-operational-validation.sh
```

The Docker script builds the API and UI images, starts `local-api` and `vue-ui`
with `docker compose`, runs the same synthetic operational workflow through the
containerized API, checks the containerized UI routes, and resets the Docker API
state. Containers remain running for inspection.

Expected Docker URLs:

```text
API: http://127.0.0.1:3001
UI:  http://127.0.0.1:5173
```

Stop the Docker services when finished:

```bash
docker compose down
```

### Certificate and TLS build failures

If a repo script says Docker is not available, first run:

```bash
./scripts/docker-env-check.sh
```

This reports the Docker CLI path, active Docker context, `DOCKER_HOST`, Docker
socket state, WSL distro list when available, and whether the daemon is
reachable from the current shell.

If Docker Desktop is installed on Windows and you are running these scripts from
WSL without Docker Desktop's WSL integration, point the repo scripts at the
Windows Docker CLI:

```bash
export DOCKER_CLI="/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe"
./scripts/docker-env-check.sh
```

The path without `.exe` is Docker Desktop's WSL wrapper and may redirect back to
`/usr/bin/docker`; use `docker.exe` for Windows Docker from WSL.

If Docker or npm fails with a certificate error on a managed work laptop, run:

```bash
./scripts/docker-cert-diagnostics.sh
```

Use the result to pick the fix:

- If `docker pull node:20-alpine` or `docker pull nginx:1.27-alpine` fails,
  add the work root CA to Docker Desktop or the host Docker trust store first.
- If image pulls pass but the Docker build fails during `npm ci`, build with
  the work root CA injected into the API/UI images:

```bash
./scripts/docker-build-with-ca.sh /path/to/work-root-ca.pem
```

The Dockerfiles support an optional BuildKit secret named `extra_ca`; normal
builds do not need a certificate file. The CA build script does not commit or
copy private `.env` files or member data.

- If Docker builds pass but Twilio or another outbound runtime call fails,
  treat it as runtime network/certificate policy and validate that path
  separately from the image build.

### 1. Install and start the local API

```bash
cd local-api
cp .env.example .env
npm install
npm test
npm run dev
```

Expected API base URL:

```text
http://127.0.0.1:3001/api/nyec
```

Health check:

```bash
curl http://127.0.0.1:3001/health
```

### 2. Install and start the Vue UI

In a second terminal:

```bash
cd vue-ui
cp .env.example .env 2>/dev/null || true
npm install
npm run dev
```

Expected UI URL:

```text
http://127.0.0.1:5173
```

The UI calls the local API directly. If the API is down, the UI falls back to
deterministic mock data, which is useful for design review but not for
operational validation.

### 3. Configure Twilio test credentials

Edit `local-api/.env` and supply Twilio test credentials only:

```env
PORT=3001
HOST=127.0.0.1
DATA_FILE=./data/state.json
TWILIO_MODE=TEST
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_test_auth_token
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_FROM_NUMBER=
TWILIO_CALLBACK_BASE_URL=http://127.0.0.1:3001
```

Then open the UI at `/twilio` and confirm:

- `Mode` is `TEST`
- `Callback Base URL` is `http://127.0.0.1:3001`
- `Send Test SMS` succeeds or returns a clear Twilio configuration error

You can also validate the API surface directly:

```bash
curl http://127.0.0.1:3001/api/nyec/twilio/config
```

Test send:

```bash
curl -i \
  -H 'content-type: application/json' \
  -d '{"to":"+15005550006","body":"NYeC outreach local test"}' \
  http://127.0.0.1:3001/api/nyec/twilio/test
```

Twilio's magic test number `+15005550006` is appropriate for local test-mode
verification.

### 4. Import a sample MEF CSV

The operational contract expects MEF import through the API. Keep the sample
payload synthetic; do not use live member data on a laptop.

Sample CSV content:

```csv
MemberID,FirstName,LastName,DOB,Phone,Facility,NpiLocation,SurveyLink
10001,Ana,Test,1986-01-15,+15555550101,NYC Health Center A,1234567890,https://survey.example.test/r/10001
10002,Ben,Test,1979-04-22,+15555550102,NYC Health Center A,1234567890,https://survey.example.test/r/10002
10003,Cam,Test,1990-09-30,+15555550103,NYC Health Center B,1234567891,https://survey.example.test/r/10003
```

Expected import request:

```bash
curl -i \
  -H 'content-type: application/json' \
  -d @- \
  http://127.0.0.1:3001/api/nyec/mef/batches <<'EOF'
{
  "fileName": "sample-mef.csv",
  "mefVersion": "2026-W28-LOCAL",
  "source": "laptop-test",
  "csvText": "MemberID,FirstName,LastName,DOB,Phone,Facility,NpiLocation,SurveyLink\n10001,Ana,Test,1986-01-15,+15555550101,NYC Health Center A,1234567890,https://survey.example.test/r/10001\n10002,Ben,Test,1979-04-22,+15555550102,NYC Health Center A,1234567890,https://survey.example.test/r/10002\n10003,Cam,Test,1990-09-30,+15555550103,NYC Health Center B,1234567891,https://survey.example.test/r/10003\n"
}
EOF
```

Read back the imported batch list:

```bash
curl http://127.0.0.1:3001/api/nyec/mef/batches
```

### 5. Create a campaign

Use the UI at `/campaigns/new` or call the API directly. Replace `1` with the
batch ID returned by the MEF import response.

```bash
curl -i \
  -H 'content-type: application/json' \
  -d '{
    "name":"Laptop Operational Test Campaign",
    "customerName":"NYC Health Partner",
    "facility":"NYC Health Center A",
    "npiLocation":"1234567890",
    "mefBatchId":1,
    "dailyLimit":2,
    "startDate":"2026-07-13",
    "startTime":"09:00",
    "externalSurveyBaseUrl":"https://survey.example.test/register",
    "smsBody":"Hello {{FirstName}}, please complete your questionnaire at {{SurveyLink}}. Reply STOP to opt out."
  }' \
  http://127.0.0.1:3001/api/nyec/campaigns
```

Confirm the campaign exists:

```bash
curl http://127.0.0.1:3001/api/nyec/campaigns
```

### 6. Run a manual dispatch

The laptop workflow expects a manual dispatch endpoint so operators can test a
single batch without waiting for the scheduler. Replace `101` with the campaign
ID returned by the campaign creation response.

Expected request:

```bash
curl -i \
  -H 'content-type: application/json' \
  -d '{"limit":2,"trigger":"manual-runbook","operator":"local-tester"}' \
  http://127.0.0.1:3001/api/nyec/campaigns/101/dispatches
```

After the dispatch call, inspect:

```bash
curl http://127.0.0.1:3001/api/nyec/dispatches
curl http://127.0.0.1:3001/api/nyec/outbound-messages?campaignId=101
```

### 7. Simulate a Twilio status callback

Use the generated `sid` from the dispatch response. The status callback must
target an actual outbound message SID.

```bash
curl -i \
  -H 'content-type: application/json' \
  -d '{
    "MessageSid":"SIM_GENERATED_FROM_DISPATCH",
    "MessageStatus":"delivered",
    "To":"+15555550101",
    "From":"+15005550006",
    "ErrorCode":"",
    "ErrorMessage":"",
    "Price":"0.0079",
    "PriceUnit":"USD"
  }' \
  http://127.0.0.1:3001/api/nyec/sms/status
```

### 8. Simulate STOP and START inbound callbacks

STOP:

```bash
curl -i \
  -H 'content-type: application/json' \
  -d '{
    "MessageSid":"SM_LOCAL_STOP_001",
    "From":"+15555550101",
    "To":"+15005550006",
    "Body":"STOP"
  }' \
  http://127.0.0.1:3001/api/nyec/sms/inbound
```

START:

```bash
curl -i \
  -H 'content-type: application/json' \
  -d '{
    "MessageSid":"SM_LOCAL_START_001",
    "From":"+15555550101",
    "To":"+15005550006",
    "Body":"START"
  }' \
  http://127.0.0.1:3001/api/nyec/sms/inbound
```

Then inspect opt-out state:

```bash
curl http://127.0.0.1:3001/api/nyec/opt-outs
```

After `STOP`, the phone should appear in the active opt-out list. After
`START`, the active opt-out list should no longer include that phone.

### 9. Inspect audit, billing, dispatch, and persistence evidence

Primary evidence endpoints:

```bash
curl http://127.0.0.1:3001/api/nyec/dispatches
curl http://127.0.0.1:3001/api/nyec/audit/events
curl http://127.0.0.1:3001/api/nyec/billing/summary
curl http://127.0.0.1:3001/api/nyec/dashboard
```

Local persistence evidence:

```text
local-api/data/state.json
```

The key checks are:

- dispatch batch exists for the manual run
- outbound message status transitions were recorded
- STOP produced an opt-out event
- START produced a re-subscribe event
- billing summary reflects billable and delivered messages
- audit log includes configuration, dispatch, callback, and opt-out entries

### 10. Reset local data

Preferred API path for operational testing:

```bash
curl -i \
  -H 'content-type: application/json' \
  -d '{}' \
  http://127.0.0.1:3001/api/nyec/admin/reset
```

## API Contract

The operational laptop API contract lives in [api/openapi.yaml](api/openapi.yaml).
It documents both the current local Node routes and the additional endpoints the
Node/Vue workflow expects for full MEF import, manual dispatch, outbound
message, opt-out, audit, billing, and reset testing.

## Validation Checklist

Use [docs/testing/local-operational-checklist.md](docs/testing/local-operational-checklist.md)
when running the laptop workflow. Treat UI-only review and operational API
validation as separate checks.

## Merge to Main

After validating this branch on the work laptop:

```bash
git switch main
git pull origin main
git merge --no-ff operational-testing-workflow
git push origin main
```

Then rerun:

```bash
./scripts/local-operational-validation.sh
./scripts/docker-operational-validation.sh
```

## Important Security Defaults

- Use Twilio test credentials only for local laptop work.
- Do not commit real `.env` files, live phone numbers, or member data.
- SMS bodies should avoid PHI.
- Every cost-generating or patient-affecting action should emit audit evidence.
- Treat `local-api/data/state.json` as local-only testing data.

## Status

This branch is centered on the local operational testing workflow. The owned
docs and API contract describe the target Node/Vue laptop path even where some
endpoint wiring is still being completed in `local-api/` and `vue-ui/`.
