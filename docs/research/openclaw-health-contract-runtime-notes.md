# OpenClaw Health Contract Runtime Notes

Created: 2026-04-24

## Implemented Sources

- `docs/sync-status.json` feeds `daemon_or_wrapper`, `capture_or_pull`, and `normalization`.
- `ingredient_price_history` feeds `price_history_write` for ChefFlow-side OpenClaw price writes.
- `openclaw.store_products` feeds `chefflow_mirror_read` for local mirror readability.
- `ingredients.last_price_source` feeds `chef_costing_consumption` for costing consumption of OpenClaw-sourced ingredient prices.
- `scripts/auto-sync-openclaw.mjs` supplies the current code-owned cadence policy: 24 hour full sync, 2 hour delta sync, and 48 hour price freshness window.

## Still Unknown

- `scheduled_task_or_host` is intentionally `unknown`. This slice does not query Windows Task Scheduler or Pi service state.
- Pi-side process supervision, systemd task status, and host-level daemon liveness remain out of scope unless a safe repo-local helper is added later.
- Missing `docs/sync-status.json` is treated as unknown. A corrupt or unreadable status file fails closed.

## Expected Contradictions

- Fresh `ingredient_price_history` writes can coexist with a failed or unknown wrapper.
- Fresh price history can coexist with failed capture or normalization steps if downstream data was written by a partial prior run.
- Fresh mirror rows can coexist with stale ChefFlow price history writes.

These contradictions are preserved in the contract instead of being collapsed into a single freshness-only verdict.

## Difference From Old Freshness Checks

Older checks could infer useful health from fresh downstream price rows, mirror freshness, or runtime stats. The new contract keeps each stage separate and reduces overall health by severity:

`failed > partial > stale > unknown > success`.

That means fresh price writes can make `price_history_write` successful, but they cannot force `overall` to success while wrapper, host, capture, or normalization truth is failed or unknown.

The legacy `/api/openclaw/status` and `/api/sentinel/sync-status` responses now preserve their older fields while adding the canonical OpenClaw health contract.

## Out Of Scope

- Rewriting OpenClaw capture.
- Changing Pi scheduled tasks or Windows Task Scheduler configuration.
- Adding public OpenClaw branding.
- Removing existing health/status routes.
- Treating a single freshness timestamp as proof of full pipeline health.
