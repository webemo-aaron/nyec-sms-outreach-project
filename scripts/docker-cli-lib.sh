#!/usr/bin/env bash

DOCKER_CLI_BIN=""

resolve_docker_cli() {
  local candidate=""
  local candidates=()

  if [[ -n "${DOCKER_CLI:-}" ]]; then
    if [[ "$DOCKER_CLI" != *.exe && -x "$DOCKER_CLI.exe" ]]; then
      candidates+=("$DOCKER_CLI.exe")
    fi
    candidates+=("$DOCKER_CLI")
  fi

  if command -v docker >/dev/null 2>&1; then
    candidates+=("$(command -v docker)")
  fi

  candidates+=("/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe")

  for candidate in "${candidates[@]}"; do
    if [[ "$candidate" == */* && ! -x "$candidate" ]]; then
      continue
    fi

    if "$candidate" --version >/dev/null 2>&1; then
      DOCKER_CLI_BIN="$candidate"
      return 0
    fi
  done

  return 1
}

docker_cli() {
  if [[ -z "$DOCKER_CLI_BIN" ]]; then
    resolve_docker_cli || return 127
  fi

  "$DOCKER_CLI_BIN" "$@"
}

docker_cli_path() {
  if [[ -z "$DOCKER_CLI_BIN" ]]; then
    resolve_docker_cli || return 127
  fi

  printf '%s\n' "$DOCKER_CLI_BIN"
}
