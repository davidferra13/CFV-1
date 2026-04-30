#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/srv/chefflow}"
SERVICE_NAME="${SERVICE_NAME:-chefflow-prod}"
HEALTH_PATH="${HEALTH_PATH:-/api/health/readiness?strict=1}"
PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-https://app.cheflowhq.com}"
PORT="${PORT:-3300}"

requested_release="${1:-}"
success_log="$APP_ROOT/shared/successful-releases.log"

current_target=""
if [[ -L "$APP_ROOT/current" ]]; then
  current_target="$(readlink -f "$APP_ROOT/current")"
fi

if [[ -n "$requested_release" ]]; then
  rollback_id="$requested_release"
else
  if [[ -f "$success_log" ]]; then
    rollback_id="$(awk '{print $2}' "$success_log" | awk 'NF' | tac | while read -r candidate; do
      candidate_dir="$APP_ROOT/releases/$candidate"
      if [[ -d "$candidate_dir" && "$candidate_dir" != "$current_target" ]]; then
        echo "$candidate"
        break
      fi
    done)"
  else
    rollback_id="$(find "$APP_ROOT/releases" -mindepth 1 -maxdepth 1 -type d -printf "%f\n" | sort | tail -n 2 | head -n 1 || true)"
  fi
fi

if [[ -z "$rollback_id" ]]; then
  echo "No rollback release found." >&2
  exit 1
fi

rollback_dir="$APP_ROOT/releases/$rollback_id"
if [[ ! -d "$rollback_dir" ]]; then
  echo "Rollback release does not exist: $rollback_dir" >&2
  exit 1
fi

ln -sfn "$rollback_dir" "$APP_ROOT/current"
systemctl restart "$SERVICE_NAME"

for attempt in {1..30}; do
  if curl -fsS "http://127.0.0.1:$PORT$HEALTH_PATH" >/dev/null; then
    break
  fi
  if [[ "$attempt" -eq 30 ]]; then
    echo "Loopback readiness failed after rollback." >&2
    exit 1
  fi
  sleep 2
done

if [[ -n "$PUBLIC_BASE_URL" ]]; then
  curl -fsS "$PUBLIC_BASE_URL$HEALTH_PATH" >/dev/null
fi

printf "%s rollback %s\n" "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$rollback_id" >> "$success_log"
echo "Rolled back to release $rollback_id."
