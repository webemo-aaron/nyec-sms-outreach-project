# NYeC SMS Outreach Manager Starter Project

This repository is a coding-agent-ready starter implementation for the NYeC SMS Outreach Manager MVP.

The first version focuses only on operational SMS outreach:

1. Configure and manage Twilio.
2. Load a NYeC Medicaid Eligibility File (MEF) into IRIS.
3. Define an outreach campaign from a MEF cohort.
4. Define a customer-specific SMS message.
5. Execute a defined number of SMS messages per day starting at 9:00 AM Monday–Friday.
6. Track dispatch status, opt-outs, retries, costs, billing usage, and audit events.
7. Send patients to an external survey/registration system.

The survey system is external and owns registration, authentication, survey completion, and survey analytics.

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

vue-ui/
  package.json
  vite.config.ts
  src/
    App.vue
    router.ts
    api/client.ts
    views/...           Mocked operational UI screens
    styles.css          AGUI light/dark adaptive style system

api/openapi.yaml         REST API contract
implementation-plan.md   Step-by-step engineering plan
coding-agent-prompts.md  Prompts to hand to implementation agents
```

## Quick Start: Node/Vue Local App

The fastest laptop path is the Vue UI plus the included Node.js local API.
The IRIS/ObjectScript files remain in the project as the production backend
foundation, but they are not required for local Node/Vue testing.

```bash
cd local-api
cp .env.example .env
# Edit .env with Twilio test credentials.
npm test
npm run dev
```

In a second terminal:

```bash
cd vue-ui
cp .env.example .env
npm install
npm run dev
```

Open the Vite URL, usually:

```text
http://localhost:5173
```

The Vue app calls:

```text
http://localhost:3001/api/nyec
```

If the API is unavailable, the UI still falls back to deterministic mock data
for review mode, but development builds now log a console warning when that
happens.

### Twilio Test Credentials

Use Twilio test credentials in `local-api/.env`; do not store real credentials
in source files.

```env
PORT=3001
HOST=127.0.0.1
DATA_FILE=./data/state.json
TWILIO_MODE=TEST
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_test_auth_token
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_FROM_NUMBER=
TWILIO_CALLBACK_BASE_URL=http://localhost:3001
```

`TWILIO_MESSAGING_SERVICE_SID` is preferred. If you are not using a messaging
service, leave it blank and set `TWILIO_FROM_NUMBER`.

The local API exposes:

```text
GET  /health
GET  /api/nyec/dashboard
GET  /api/nyec/twilio/config
POST /api/nyec/twilio/test
POST /api/nyec/sms/status
POST /api/nyec/sms/inbound
```

Test-send example:

```bash
curl -i \
  -H 'content-type: application/json' \
  -d '{"to":"+15005550006","body":"NYeC outreach test"}' \
  http://localhost:3001/api/nyec/twilio/test
```

With missing Twilio credentials, the endpoint returns a clear
`TWILIO_NOT_CONFIGURED` JSON error instead of silently pretending to send.

## Quick Start: Frontend Only

```bash
cd vue-ui
npm install
npm run dev
```

By default the UI attempts to call `/api/*`. If the configured API is unavailable, it falls back to deterministic mock data so the UI can be reviewed immediately.

## Quick Start: IRIS Skeleton

The included ObjectScript classes are intended as a clean build foundation. They define persistent classes, REST routes, service contracts, seed data, and starter tests.

A typical IRIS deployment path is:

```bash
# from repository root
docker compose up --build
```

Then compile/import the ObjectScript classes into the `HSOUTREACH` and `HSREGISTRY` namespaces using your preferred IRIS workflow. The Dockerfile includes comments for common import approaches.

## MVP Build Order

1. Compile persistent classes.
2. Implement table-level security and roles.
3. Compile REST API dispatch class.
4. Seed development data.
5. Connect Vue UI to IRIS APIs.
6. Implement MEF file parsing and validation.
7. Implement Twilio provider interface.
8. Implement scheduler and daily batch selection.
9. Add audit and billing usage events.
10. Run simulator and unit tests before live Twilio mode.

## Important Security Defaults

- No UI screen should query base tables directly.
- Every UI action should map to a service method.
- Twilio secrets should be stored by reference, not as plaintext in application tables.
- SMS content should avoid PHI.
- MEF data is versioned by batch and never updated in place.
- Every cost-generating or patient-affecting action writes audit and usage events.

## Status

This is a starter implementation package for coding agents. It is intentionally scaffolded but complete enough to start building and testing the operational workflow.
