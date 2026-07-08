#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT_DIR/scripts/docker-cli-lib.sh"

log() {
  printf '\n==> %s\n' "$1"
}

run_optional() {
  local label="$1"
  shift
  log "$label"
  "$@" || true
}

log "Docker CLI"
if ! resolve_docker_cli; then
  printf 'A usable Docker CLI was not found for this shell.\n' >&2
  printf 'Set DOCKER_CLI to the Docker executable path, or enable Docker Desktop WSL integration for this distro.\n' >&2
  printf 'For Windows Docker Desktop from WSL, try:\n' >&2
  printf '  export DOCKER_CLI="/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe"\n' >&2
  exit 1
fi
docker_cli_path
docker_cli --version || true

run_optional "Docker context" docker_cli context ls
run_optional "Current Docker context" docker_cli context show

if [[ -n "${DOCKER_HOST:-}" ]]; then
  log "DOCKER_HOST"
  printf '%s\n' "$DOCKER_HOST"
else
  log "DOCKER_HOST"
  printf 'unset\n'
fi

if [[ -e /var/run/docker.sock ]]; then
  run_optional "Docker socket" ls -l /var/run/docker.sock
fi

if command -v wsl.exe >/dev/null 2>&1; then
  log "WSL distros"
  if command -v iconv >/dev/null 2>&1; then
    wsl.exe -l -v 2>/dev/null | iconv -f UTF-16LE -t UTF-8 || true
  else
    wsl.exe -l -v || true
  fi
fi

log "Docker daemon"
if docker_cli info; then
  printf '\nDocker daemon is reachable from this shell.\n'
  exit 0
fi

cat >&2 <<'EOF'

Docker CLI exists, but the daemon is not reachable from this shell.

Common fixes:
- If you are intentionally using Windows Docker from WSL, point these scripts at
  Docker Desktop's Windows CLI:
    export DOCKER_CLI="/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe"
- If you are in WSL, enable Docker Desktop integration for this exact distro,
  then close and reopen the WSL terminal.
- If the wrong Docker context is active, try:
    docker context use desktop-linux
- If DOCKER_HOST is set to a stale socket or TCP endpoint, unset it and retry:
    unset DOCKER_HOST
- If Docker Desktop was just started, wait until it reports "Engine running"
  before rerunning the repo scripts.
EOF
exit 1
