# Local Operational Testing Checklist

Use this checklist when validating the Node/Vue laptop workflow on this
repository branch.

## Preconditions

- [ ] `local-api/.env` contains Twilio test credentials, not live credentials
- [ ] No real member data is present in local CSV payloads or `local-api/data/state.json`

## Canonical Validation

- [ ] From the repository root, run `./scripts/local-operational-validation.sh`
- [ ] Confirm the script runs API tests, Vue contract tests, Vue production build, synthetic HTTP workflow, UI route checks, optional Twilio test-send check, and final reset
- [ ] If the optional Twilio test-send reports a credential or network error, record it as an environment-dependent follow-up rather than a local workflow failure
- [ ] Run `./scripts/docker-operational-validation.sh`
- [ ] Confirm Docker validation builds packaged API/UI images, starts Compose services, runs the synthetic HTTP workflow, checks UI routes, and resets Docker API state
- [ ] Stop Docker services after inspection with `docker compose down`

Use the manual sections below when investigating a failed script step or when
collecting detailed evidence.

## Docker Runtime

- [ ] If a script says Docker is unavailable, run `./scripts/docker-env-check.sh`
- [ ] If using Windows Docker Desktop from WSL without WSL integration, run `export DOCKER_CLI="/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe"` before repo Docker scripts
- [ ] If Docker build reports a certificate error, run `./scripts/docker-cert-diagnostics.sh`
- [ ] If Docker pulls pass but npm/build TLS fails, run `./scripts/docker-build-with-ca.sh /path/to/work-root-ca.pem`
- [ ] If Docker pull itself fails with `x509` or `certificate signed by unknown authority`, fix Docker Desktop or host trust before retrying the repo scripts
- [ ] Confirm Docker build logs show npm `9.8.1` is installed before `npm ci` in Node-based image stages
- [ ] Confirm `docker compose build local-api vue-ui` completes
- [ ] Confirm `docker compose up -d local-api vue-ui` starts both services
- [ ] Confirm `curl http://127.0.0.1:3001/health` returns `ok`
- [ ] Confirm `curl http://127.0.0.1:5173/health` returns `ok`
- [ ] Open `http://127.0.0.1:5173`
- [ ] Confirm API state persists in Docker volume `nyec_sms_outreach_project_local_api_data`

## Startup

- [ ] Start API: `cd local-api && npm test && npm run dev`
- [ ] Confirm health: `curl http://127.0.0.1:3001/health`
- [ ] Start UI: `cd vue-ui && npm run dev`
- [ ] Open `http://127.0.0.1:5173`
- [ ] Confirm UI is reading the live API rather than mock fallback

## Twilio Test Configuration

- [ ] Open `/twilio`
- [ ] Confirm mode is `TEST`
- [ ] Confirm callback base URL is `http://127.0.0.1:3001`
- [ ] Run `Send Test SMS` or `POST /api/nyec/twilio/test`
- [ ] Capture either the queued SID or the explicit `TWILIO_NOT_CONFIGURED` error

## Sample MEF Import

Use a synthetic CSV payload like this:

```csv
MemberID,FirstName,LastName,DOB,Phone,Facility,NpiLocation,SurveyLink
10001,Ana,Test,1986-01-15,+15555550101,NYC Health Center A,1234567890,https://survey.example.test/r/10001
10002,Ben,Test,1979-04-22,+15555550102,NYC Health Center A,1234567890,https://survey.example.test/r/10002
10003,Cam,Test,1990-09-30,+15555550103,NYC Health Center B,1234567891,https://survey.example.test/r/10003
```

- [ ] Submit `POST /api/nyec/mef/batches`
- [ ] Confirm the JSON payload uses `csvText`, not `csv`
- [ ] Confirm `GET /api/nyec/mef/batches` shows the imported batch
- [ ] Record the MEF batch ID used for campaign creation

## Campaign Creation

- [ ] Create a campaign from `/campaigns/new` or `POST /api/nyec/campaigns`
- [ ] Use the MEF batch ID returned by the import response
- [ ] Confirm campaign appears in `GET /api/nyec/campaigns`
- [ ] Verify daily limit, MEF batch, facility, and SMS body values

## Manual Dispatch

- [ ] Trigger `POST /api/nyec/campaigns/{id}/dispatches`
- [ ] Use the campaign ID returned by the campaign creation response
- [ ] Confirm `GET /api/nyec/dispatches` shows a new dispatch batch
- [ ] Confirm `GET /api/nyec/outbound-messages?campaignId={id}` shows queued or sent messages

## Callback Simulation

- [ ] POST delivered status payload to `/api/nyec/sms/status` using a generated message SID from the dispatch response
- [ ] POST `STOP` inbound payload to `/api/nyec/sms/inbound`
- [ ] Confirm `GET /api/nyec/opt-outs` includes the stopped phone
- [ ] POST `START` inbound payload to `/api/nyec/sms/inbound`
- [ ] Confirm `GET /api/nyec/opt-outs` no longer includes the re-subscribed phone

## Evidence Review

- [ ] Capture `GET /api/nyec/dashboard`
- [ ] Capture `GET /api/nyec/dispatches`
- [ ] Capture `GET /api/nyec/audit/events`
- [ ] Capture `GET /api/nyec/billing/summary`
- [ ] Inspect `local-api/data/state.json`

## Reset

- [ ] Run `POST /api/nyec/admin/reset` with an empty JSON body: `{}`
- [ ] Confirm campaigns, MEF batches, dispatches, outbound messages, and active opt-outs are cleared

## Exit Criteria

- [ ] API health is green
- [ ] Twilio config is validated in test mode
- [ ] MEF import, campaign creation, and manual dispatch are exercised
- [ ] Delivery callback and STOP/START callback simulations are exercised
- [ ] Audit, billing, dispatch, and persistence evidence are captured
- [ ] Local data reset path is confirmed
