# Local Operational Testing Checklist

Use this checklist when validating the Node/Vue laptop workflow on this
repository branch.

## Preconditions

- [ ] Work only in owned files for this task: `README.md`, `api/openapi.yaml`, `docs/**`, `coding-agent-prompts.md`
- [ ] Do not modify `local-api/**`
- [ ] Do not modify `vue-ui/**`
- [ ] `local-api/.env` contains Twilio test credentials, not live credentials
- [ ] `local-api` dependencies installed with `npm install`
- [ ] `vue-ui` dependencies installed with `npm install`

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
- [ ] Confirm `GET /api/nyec/mef/batches` shows the imported batch
- [ ] Record the MEF batch ID used for campaign creation

## Campaign Creation

- [ ] Create a campaign from `/campaigns/new` or `POST /api/nyec/campaigns`
- [ ] Confirm campaign appears in `GET /api/nyec/campaigns`
- [ ] Verify daily limit, MEF batch, facility, and SMS body values

## Manual Dispatch

- [ ] Trigger `POST /api/nyec/campaigns/{id}/dispatches`
- [ ] Confirm `GET /api/nyec/dispatches` shows a new dispatch batch
- [ ] Confirm `GET /api/nyec/outbound-messages?campaignId={id}` shows queued or sent messages

## Callback Simulation

- [ ] POST delivered status payload to `/api/nyec/sms/status`
- [ ] POST `STOP` inbound payload to `/api/nyec/sms/inbound`
- [ ] POST `START` inbound payload to `/api/nyec/sms/inbound`
- [ ] Confirm `GET /api/nyec/opt-outs` reflects stop/start state

## Evidence Review

- [ ] Capture `GET /api/nyec/dashboard`
- [ ] Capture `GET /api/nyec/dispatches`
- [ ] Capture `GET /api/nyec/audit/events`
- [ ] Capture `GET /api/nyec/billing/summary`
- [ ] Inspect `local-api/data/state.json`

## Reset

- [ ] Prefer `POST /api/nyec/admin/reset`
- [ ] If reset is not implemented, stop the API, delete `local-api/data/state.json`, restart the API, and confirm the state is cleared

## Exit Criteria

- [ ] API health is green
- [ ] Twilio config is validated in test mode
- [ ] MEF import, campaign creation, and manual dispatch are exercised
- [ ] Delivery callback and STOP/START callback simulations are exercised
- [ ] Audit, billing, dispatch, and persistence evidence are captured
- [ ] Local data reset path is confirmed
