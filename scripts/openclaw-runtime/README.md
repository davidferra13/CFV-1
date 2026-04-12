# OpenClaw Runtime Ops

These scripts are the Codex operator entrypoints for the live OpenClaw Pi runtime.

## Audit

Run a live health pass against the Pi:

```bash
node scripts/openclaw-runtime/audit.mjs
node scripts/openclaw-runtime/audit.mjs --json
```

What it checks:

- `openclaw-sync-api` and `openclaw-receipt-processor` service state
- local Pi health endpoints on `8081` and `8082`
- SQLite runtime counts and catalog progress
- stale source freshness
- recent `database is locked`, cross-match delete-guard, and aggregator schema errors

Environment overrides:

- `OPENCLAW_SSH_HOST` defaults to `pi`
- `OPENCLAW_REMOTE_DIR` defaults to `/home/davidferra/openclaw-prices`

## Deploy Hotfix Bundle

Push the April 9, 2026 runtime hotfix files to the Pi, with remote backups first:

```bash
node scripts/openclaw-runtime/deploy-hotfix-2026-04-09.mjs
node scripts/openclaw-runtime/deploy-hotfix-2026-04-09.mjs --smoke
```

`--smoke` also runs the patched `growth-tracker.py` and `aggregator.mjs` once on the Pi after deployment.
