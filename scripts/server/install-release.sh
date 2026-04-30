#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/srv/chefflow}"
SERVICE_NAME="${SERVICE_NAME:-chefflow-prod}"
ENV_FILE="${ENV_FILE:-$APP_ROOT/shared/chefflow-prod.env}"
VALIDATION_PORT="${VALIDATION_PORT:-3399}"
HEALTH_PATH="${HEALTH_PATH:-/api/health/readiness?strict=1}"
STREAM_PATH="${STREAM_PATH:-/api/health}"

PACKAGE_PATH="${1:-}"
if [[ -z "$PACKAGE_PATH" || ! -f "$PACKAGE_PATH" ]]; then
  echo "Usage: install-release.sh /path/to/release.tar.gz" >&2
  exit 2
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing host-managed environment file: $ENV_FILE" >&2
  exit 1
fi

base_name="$(basename "$PACKAGE_PATH")"
release_id="${base_name%.tar.gz}"
release_dir="$APP_ROOT/releases/$release_id"
ready_dir="$APP_ROOT/shared/releases-ready"

if [[ -e "$release_dir" ]]; then
  echo "Release directory already exists: $release_dir" >&2
  exit 1
fi

mkdir -p "$APP_ROOT/releases" "$APP_ROOT/shared" "$ready_dir"
mkdir -p "$release_dir"

tar -xzf "$PACKAGE_PATH" -C "$release_dir"
ln -sfn "$ENV_FILE" "$release_dir/.env.local"

if [[ -f "$release_dir/.chefflow-release.json" ]]; then
  cp "$release_dir/.chefflow-release.json" "$release_dir/release.json"
else
  cat > "$release_dir/release.json" <<JSON
{"releaseId":"$release_id","installedAt":"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"}
JSON
fi

cd "$release_dir"

if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

npm run build

validation_log="$release_dir/validation.log"
(
  export NODE_ENV=production
  export HOST=127.0.0.1
  export PORT="$VALIDATION_PORT"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  node node_modules/next/dist/bin/next start -p "$VALIDATION_PORT" -H 127.0.0.1
) > "$validation_log" 2>&1 &
validation_pid="$!"

cleanup() {
  if kill -0 "$validation_pid" 2>/dev/null; then
    kill "$validation_pid" 2>/dev/null || true
    wait "$validation_pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT

for attempt in {1..40}; do
  if curl -fsS "http://127.0.0.1:$VALIDATION_PORT$HEALTH_PATH" >/dev/null; then
    break
  fi
  if [[ "$attempt" -eq 40 ]]; then
    echo "Temporary release health check failed. See $validation_log" >&2
    exit 1
  fi
  sleep 2
done

curl -fsS --max-time 10 --no-buffer "http://127.0.0.1:$VALIDATION_PORT$STREAM_PATH" >/dev/null

touch "$ready_dir/$release_id"
echo "Installed and validated release $release_id for $SERVICE_NAME."
