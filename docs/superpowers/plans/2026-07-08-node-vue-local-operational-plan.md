# Node/Vue Local Operational Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the project operational on this laptop using Vue for the UI and Node.js for the local API, with Twilio test credentials supplied by environment variables.

**Architecture:** Keep the existing Vue UI as the client. Add a lightweight Node HTTP API under `local-api/` that implements the current `/api/nyec/*` contract, stores local state in JSON, and sends Twilio test SMS requests only when configured. Keep IRIS files as reference artifacts and do not require IRIS for laptop testing.

**Tech Stack:** Vue 3, Vite, Node.js built-in `http`, `node:test`, and Twilio REST API over HTTPS.

## Global Constraints

- Do not commit or print Twilio secret values.
- Use `.env` for local credentials and `.env.example` for documented variable names.
- The UI must be able to run against the Node API without relying on silent mock fallback.
- The API must return clear JSON errors for missing Twilio credentials.
- Use Node built-ins for the API to avoid dependency install friction.

---

### Task 1: Node API Core

**Files:**
- Create: `local-api/package.json`
- Create: `local-api/src/server.js`
- Create: `local-api/src/config.js`
- Create: `local-api/src/store.js`
- Test: `local-api/test/api.test.js`

**Interfaces:**
- Produces: `createServer(options)`, `createApp(options)`, `loadConfig(env)`, `createStore(options)`.

- [x] Write failing API tests for `/health`, `/api/nyec/dashboard`, and Twilio missing credential errors.
- [x] Run tests and verify they fail before implementation.
- [x] Implement minimal Node HTTP routing, JSON helpers, CORS, and local store.
- [x] Run tests and verify they pass.

### Task 2: Twilio Test-Send Provider

**Files:**
- Create: `local-api/src/twilio.js`
- Modify: `local-api/src/server.js`
- Test: `local-api/test/twilio.test.js`

**Interfaces:**
- Produces: `createTwilioClient(config, transport)` and `sendTestSms(payload)`.

- [x] Write failing tests for Twilio request shape using injected transport.
- [x] Run tests and verify they fail before implementation.
- [x] Implement Twilio Basic Auth request construction and safe response handling.
- [x] Run tests and verify they pass.

### Task 3: Vue/Node Local Run Wiring

**Files:**
- Modify: `vue-ui/.env.example`
- Modify: `vue-ui/src/api/client.ts`
- Modify: `docker-compose.yml`
- Modify: `README.md`
- Create: `local-api/.env.example`

**Interfaces:**
- Consumes: Node API on `http://localhost:3001/api/nyec`.

- [x] Document env variables and local run commands.
- [x] Make UI fallback warnings visible in development console while preserving mock fallback for review mode.
- [x] Add compose service for Node API.
- [x] Run frontend build and local API tests.

### Self-Review

- Spec coverage: Node API, Twilio env configuration, UI wiring, docs, and tests are covered.
- Placeholder scan: no placeholders.
- Type consistency: route and helper names are defined before use.
