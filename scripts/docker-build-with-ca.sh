#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERT_PATH="${1:-}"
export DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-1}"

if [[ -z "$CERT_PATH" ]]; then
  printf 'Usage: %s /path/to/work-root-ca.pem\n' "$0" >&2
  exit 2
fi

if [[ ! -f "$CERT_PATH" ]]; then
  printf 'Certificate file not found: %s\n' "$CERT_PATH" >&2
  exit 2
fi

ABS_CERT="$(cd "$(dirname "$CERT_PATH")" && pwd)/$(basename "$CERT_PATH")"

cd "$ROOT_DIR"

printf 'Building local-api with extra CA: %s\n' "$ABS_CERT"
docker build \
  --secret id=extra_ca,src="$ABS_CERT" \
  -t nyec_sms_outreach_project-local-api:latest \
  ./local-api

printf 'Building vue-ui with extra CA: %s\n' "$ABS_CERT"
docker build \
  --secret id=extra_ca,src="$ABS_CERT" \
  --build-arg VITE_API_BASE_URL="${VITE_API_BASE_URL:-http://localhost:3001/api/nyec}" \
  -t nyec_sms_outreach_project-vue-ui:latest \
  ./vue-ui

cat <<'EOF'

Builds completed with the supplied CA.
Start the packaged services with:
  docker compose up -d local-api vue-ui

Then validate with:
  ./scripts/docker-operational-validation.sh
EOF
