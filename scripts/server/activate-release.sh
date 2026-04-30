#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/srv/chefflow}"
SERVICE_NAME="${SERVICE_NAME:-chefflow-prod}"
HEALTH_PATH="${HEALTH_PATH:-/api/health/readiness?strict=1}"
PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-https://app.cheflowhq.com}"
PORT="${PORT:-3300}"

release_id="${1:-}"
ready_dir="$APP_ROOT/shared/releases-ready"
success_log="$APP_ROOT/shared/successful-releases.log"

if [[ -z "$release_id" ]]; then
  release_id="$(find "$ready_dir" -maxdepth 1 -type f -printf "%f\n" 2>/dev/null | sort | tail -n 1 || true)"
fi

if [[ -z "$release_id" ]]; then
  echo "No validated release is ready for activation." >&2
  exit 1
fi

release_dir="$APP_ROOT/releases/$release_id"
if [[ ! -d "$release_dir" ]]; then
  echo "Release directory does not exist: $release_dir" >&2
  exit 1
fi

previous=""
if [[ -L "$APP_ROOT/current" ]]; then
  previous="$(readlink -f "$APP_ROOT/current")"
fi

ln -sfn "$release_dir" "$APP_ROOT/current"
systemctl restart "$SERVICE_NAME"

rollback_previous() {
  if [[ -n "$previous" && -d "$previous" ]]; then
    ln -sfn "$previous" "$APP_ROOT/current"
    systemctl restart "$SERVICE_NAME" || true
  fi
}

for attempt in {1..30}; do
  if curl -fsS "http://127.0.0.1:$PORT$HEALTH_PATH" >/dev/null; then
    break
  fi
  if [[ "$attempt" -eq 30 ]]; then
    echo "Loopback readiness failed after activation. Rolling back." >&2
    rollback_previous
    exit 1
  fi
  sleep 2
done

if [[ -n "$PUBLIC_BASE_URL" ]]; then
  if ! curl -fsS "$PUBLIC_BASE_URL$HEALTH_PATH" >/dev/null; then
    echo "Public readiness failed after activation. Rolling back." >&2
    rollback_previous
    exit 1
  fi
fi

printf "%s %s\n" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$release_id" >> "$success_log"
echo "Activated release $release_id."
