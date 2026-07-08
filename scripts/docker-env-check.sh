#!/usr/bin/env bash
set -euo pipefail

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
if ! command -v docker >/dev/null 2>&1; then
  printf 'docker was not found on PATH for this shell.\n' >&2
  printf 'Open the same shell you use for the repo and verify Docker Desktop WSL integration for this distro.\n' >&2
  exit 1
fi
command -v docker
docker --version || true

run_optional "Docker context" docker context ls
run_optional "Current Docker context" docker context show

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
if docker info; then
  printf '\nDocker daemon is reachable from this shell.\n'
  exit 0
fi

cat >&2 <<'EOF'

Docker CLI exists, but the daemon is not reachable from this shell.

Common fixes:
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
