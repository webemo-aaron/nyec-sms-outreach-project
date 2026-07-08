#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/docker-cli-lib.sh"
export DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-1}"

log() {
  printf '\n==> %s\n' "$1"
}

run_step() {
  local name="$1"
  shift
  log "$name"
  if "$@"; then
    printf 'PASS: %s\n' "$name"
    return 0
  fi
  printf 'FAIL: %s\n' "$name" >&2
  return 1
}

cd "$ROOT_DIR"

FAILURES=0

run_step "Docker can pull node:20-alpine" docker_cli pull node:20-alpine || FAILURES=$((FAILURES + 1))
run_step "Docker can pull nginx:1.27-alpine" docker_cli pull nginx:1.27-alpine || FAILURES=$((FAILURES + 1))

log "Docker can build API/UI without cache"
if docker_cli compose build --no-cache local-api vue-ui; then
  printf 'PASS: Docker compose no-cache build\n'
else
  printf 'FAIL: Docker compose no-cache build\n' >&2
  FAILURES=$((FAILURES + 1))
fi

cat <<'EOF'

Certificate triage:
- If docker pull failed, fix Docker Desktop or host trust for Docker Hub first.
- If docker pulls passed but docker compose build failed during npm ci, build with:
  ./scripts/docker-build-with-ca.sh /path/to/work-root-ca.pem
- If Docker build passed but Twilio/runtime calls fail, validate outbound runtime trust and network policy separately.
EOF

if [[ "$FAILURES" -gt 0 ]]; then
  exit 1
fi

printf '\nCertificate diagnostics completed without detected Docker/TLS failures.\n'
