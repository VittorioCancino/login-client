#!/usr/bin/env bash

set -Eeuo pipefail

fail() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

log_step() {
  printf '\n==> %s\n' "$1"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

loaded_env_files=()

load_env_files() {
  local found=0
  local env_file

  for env_file in ../.env .env .env.local; do
    if [[ -f "$env_file" ]]; then
      loaded_env_files+=("$env_file")
      set -a
      # shellcheck disable=SC1090
      source "$env_file"
      set +a
      found=1
    fi
  done

  ((found)) || fail 'Missing env file. Copy .env.example to .env.local or .env, or create ../.env before running this script.'
}

format_env_files() {
  local IFS=', '
  printf '%s' "${loaded_env_files[*]}"
}

require_env() {
  local missing=0
  local key

  for key in "$@"; do
    if [[ -z "${!key:-}" ]]; then
      printf 'Missing required environment variable: %s\n' "$key" >&2
      missing=1
    fi
  done

  ((missing == 0)) || fail 'Missing required login-server configuration.'
}

main() {
  require_command bun

  load_env_files
  log_step "Using env files: $(format_env_files)"

  export PORT="${PORT:-3002}"

  require_env \
    HYDRA_ADMIN_URL \
    HYDRA_PUBLIC_URL \
    LOGIN_SERVER_CLIENT_ID \
    LOGIN_SERVER_CLIENT_SECRET \
    RESOURCE_SERVER_URL \
    RESOURCE_SERVER_LOGIN_PATH \
    RESOURCE_SERVER_AUDIENCE \
    RESOURCE_SERVER_LOGIN_SCOPE

  log_step 'Installing dependencies'
  bun install

  log_step 'Running lint'
  bun run lint

  log_step 'Building application'
  bun run build

  log_step 'Starting development server'
  printf 'Login server: http://127.0.0.1:%s\n' "$PORT"
  bun run dev
}

main "$@"
