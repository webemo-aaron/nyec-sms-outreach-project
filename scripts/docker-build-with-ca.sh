#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERT_PATH="${1:-}"
export DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-1}"
export MSYS_NO_PATHCONV="${MSYS_NO_PATHCONV:-1}"

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

if ! docker version >/dev/null 2>&1; then
  printf 'Docker is not reachable. Start Docker Desktop or the Docker daemon, then retry.\n' >&2
  exit 1
fi

docker_build_with_ca() {
  local image="$1"
  local context="$2"
  shift 2

  if docker buildx version >/dev/null 2>&1; then
    docker buildx build --load \
      --secret id=extra_ca,src="$ABS_CERT" \
      "$@" \
      -t "$image" \
      "$context"
    return
  fi

  docker build \
    --secret id=extra_ca,src="$ABS_CERT" \
    "$@" \
    -t "$image" \
    "$context"
}

printf 'Building local-api with extra CA: %s\n' "$ABS_CERT"
if ! docker_build_with_ca nyec_sms_outreach_project-local-api:latest ./local-api; then
  cat >&2 <<'EOF'

API image build failed.

If the error mentions Docker Hub, registry-1.docker.io, auth.docker.io, DNS, or x509
while pulling node:20-alpine, fix Docker Desktop or host trust first:
  ./scripts/docker-cert-diagnostics.sh

If the error mentions npm, UNABLE_TO_GET_ISSUER_CERT_LOCALLY, or unable to verify
the first certificate, confirm the CA file is the work root CA in PEM format.
EOF
  exit 1
fi

printf 'Building vue-ui with extra CA: %s\n' "$ABS_CERT"
if ! docker_build_with_ca nyec_sms_outreach_project-vue-ui:latest ./vue-ui \
  --build-arg VITE_API_BASE_URL="${VITE_API_BASE_URL:-http://localhost:3001/api/nyec}"; then
  cat >&2 <<'EOF'

UI image build failed.

If the error mentions Docker Hub, registry-1.docker.io, auth.docker.io, DNS, or x509
while pulling node:20-alpine or nginx:1.27-alpine, fix Docker Desktop or host trust first:
  ./scripts/docker-cert-diagnostics.sh

If the error mentions npm, UNABLE_TO_GET_ISSUER_CERT_LOCALLY, or unable to verify
the first certificate, confirm the CA file is the work root CA in PEM format.
EOF
  exit 1
fi

cat <<'EOF'

Builds completed with the supplied CA.
Start the packaged services with:
  docker compose up -d local-api vue-ui

Then validate with:
  ./scripts/docker-operational-validation.sh
EOF
