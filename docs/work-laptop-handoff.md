# Work Laptop Handoff

Use this guide to move the NYeC SMS Outreach Manager to the work laptop and
prove the Node/Vue workflow locally with synthetic data.

## What Was Validated

The current `main` branch was validated locally with Docker Compose on July 9,
2026:

- `./scripts/docker-env-check.sh` reached the Docker daemon.
- `./scripts/docker-cert-diagnostics.sh` pulled `node:20-alpine` and
  `nginx:1.27-alpine`, then completed a no-cache API/UI Compose build.
- `./scripts/docker-operational-validation.sh` passed the Vue tests, built the
  packaged API/UI images, started both services, ran the synthetic workflow,
  checked all UI routes, and reset API state.

The Docker services were stopped after validation with `docker compose down`.

## Clone The Repo

On the work laptop:

```bash
git clone https://github.com/webemo-aaron/nyec-sms-outreach-project.git
cd nyec-sms-outreach-project
git status -sb
```

Expected status:

```text
## main...origin/main
```

## Local Node/Vue Validation

Run the local validation script first:

```bash
./scripts/local-operational-validation.sh
```

This script installs dependencies, runs backend and Vue checks, starts local
services when needed, drives the synthetic MEF/campaign/dispatch/callback
workflow, checks UI routes, reports Twilio test-send status, and resets local
state.

Open these local URLs when the services are running:

```text
API health: http://127.0.0.1:3001/health
UI:         http://127.0.0.1:5173
```

## Docker Validation

Confirm Docker is reachable:

```bash
./scripts/docker-env-check.sh
```

Then run the packaged Docker workflow:

```bash
./scripts/docker-operational-validation.sh
```

Expected result:

- API and UI images build.
- `local-api` starts on `127.0.0.1:3001`.
- `vue-ui` starts on `127.0.0.1:5173`.
- Synthetic MEF import creates 2 valid rows and 1 rejected row.
- Campaign launch and dispatch queue 2 simulated messages.
- Status callback marks a generated SID delivered.
- STOP creates an opt-out and START removes it.
- Dashboard, billing, and audit endpoints return evidence.
- UI routes return `200`.
- Final reset clears API state.

The Docker validation intentionally leaves containers running for inspection.
Stop them when finished:

```bash
docker compose down
```

## Docker Desktop From WSL

If Docker Desktop is installed on Windows but the WSL shell cannot reach Docker,
use Docker Desktop WSL integration for the Ubuntu distro. If that is not
available, point the repo scripts at the Windows Docker CLI:

```bash
export DOCKER_CLI="/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe"
./scripts/docker-env-check.sh
```

Use the `.exe` path. The non-`.exe` wrapper may redirect back to `/usr/bin/docker`.

## Work Proxy Or Certificate Issues

If Docker pull or Docker build fails on the work network:

```bash
./scripts/docker-cert-diagnostics.sh
```

Use the output to choose the next step:

- If `docker pull node:20-alpine` or `docker pull nginx:1.27-alpine` fails,
  fix Docker Desktop or host trust for Docker Hub first.
- If pulls pass but `npm ci` fails with a certificate error, build with the
  work root CA:

```bash
./scripts/docker-build-with-ca.sh /path/to/work-root-ca.pem
```

The Dockerfiles support an optional BuildKit secret named `extra_ca`; no private
certificate is committed to the repo.

## Twilio Test Credentials

Use Twilio test credentials only. Do not put live credentials, real phone
numbers, or member data into this repository.

For the Node API, copy the example file:

```bash
cp local-api/.env.example local-api/.env
```

Then edit `local-api/.env`:

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

For the Vue UI:

```bash
cp vue-ui/.env.example vue-ui/.env
```

Expected UI API base:

```env
VITE_API_BASE_URL=http://localhost:3001/api/nyec
```

## Evidence To Capture Before Work-Laptop Signoff

Capture the output or screenshot for:

- `git status -sb`
- `./scripts/local-operational-validation.sh`
- `./scripts/docker-operational-validation.sh`
- `curl http://127.0.0.1:3001/health`
- UI at `http://127.0.0.1:5173`
- `docker compose ps` while validation containers are running
- `docker compose down` after inspection

## Safety Rules

- Use synthetic CSV rows only.
- Use Twilio test credentials only.
- Do not commit `.env`, `local-api/data/state.json`, screenshots with PHI, or
  real member data.
- Treat explicit `TWILIO_NOT_CONFIGURED` as acceptable pre-handoff evidence when
  test credentials are not present.
- Run `POST /api/nyec/admin/reset` or the validation script reset before handing
  the laptop off.
