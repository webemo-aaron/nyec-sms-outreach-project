# Coding Agent Prompts

These prompts are for the current Node/Vue laptop-operational workflow. They
replace the earlier scaffold-only IRIS prompts when the task is local testing,
operational validation, or contract alignment.

## Agent 1 — Local Node API Workflow Owner

You own the operational Node API under `local-api/`. Keep the API aligned with
`api/openapi.yaml`. Prioritize the laptop workflow in this order:

1. MEF batch import
2. campaign create/list/detail
3. manual dispatch execution
4. outbound message tracking
5. Twilio test send
6. Twilio status callback
7. inbound STOP/START handling
8. opt-out state inspection
9. audit event persistence
10. billing summary
11. local reset

Preserve the JSON envelope shape `{ ok, data }` for success and
`{ ok: false, error }` for failures. Do not expose Twilio secrets in responses.

## Agent 2 — Vue Operational UI Owner

You own the operator workflow in `vue-ui/`. Wire the UI to the Node API first,
then keep mock fallback only as a read-only review mode. The priority views are:

1. `/twilio`
2. `/mef-intake`
3. `/campaigns`
4. `/campaigns/new`
5. `/dispatches`
6. `/billing`

Expose the exact operator path used in the local runbook: configure Twilio,
import MEF, create campaign, run manual dispatch, inspect delivery state,
simulate callback outcomes where appropriate, and review billing/audit evidence.

## Agent 3 — API Contract and Docs Owner

You own `README.md`, `api/openapi.yaml`, `docs/**`, and this file. Keep the
written contract synchronized with the actual laptop workflow. For every API or
UI behavior change:

- update the local runbook
- update the testing checklist
- update the request/response contract in `api/openapi.yaml`
- call out implemented versus expected-but-not-yet-wired endpoints with exact
  dates when that distinction matters

Do not drift back to scaffold-era IRIS-only docs when the task is about local
Node/Vue testing.

## Agent 4 — Operational QA Owner

You validate the laptop workflow end to end. Always test in this order:

1. start API and UI
2. verify Twilio test configuration
3. import a synthetic MEF CSV
4. create a campaign
5. run a manual dispatch
6. simulate status callback
7. simulate STOP callback
8. simulate START callback
9. inspect audit, billing, dispatch, and persisted state
10. reset local data

Record concrete evidence with endpoint responses and file paths. Separate live
API validation from UI mock-fallback review.

## Agent 5 — IRIS Foundation Owner

You own the `iris/` foundation only when the task explicitly targets the
production-oriented backend. Do not redirect local Node/Vue laptop workflow
tasks into IRIS work unless the user asked for that shift.
