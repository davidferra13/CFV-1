# Typecheck Hardening (2026-03-10)

## What changed

- Moved the release `typecheck` entrypoint to `node scripts/run-typecheck.mjs -p tsconfig.ci.json`.
- Added a dedicated `tsconfig.ci.json` with explicit runtime/build source roots instead of wildcard repo globs and generated Next type trees.
- Removed generated `.next/types` and `.next-dev/types` includes from the base `tsconfig.json`.
- Hardened `scripts/run-typecheck.mjs` so it deletes stale build info when the project config changed and forwards termination signals to the spawned `tsc` process.
- Updated `scripts/launcher/server.mjs` so close-out, health check, and `build/typecheck` all use the same CI-scoped wrapper.
- Added regression coverage in `tests/unit/typecheck-config.test.ts`.

## Why

The previous verification path had three distinct failure modes:

1. Generated Next type paths were entering the base compiler config and causing stale-file races.
2. Alternate launcher paths still bypassed the wrapper and ran raw `tsc`, so behavior depended on which command triggered verification.
3. Timed-out typecheck runs could leave orphaned `tsc` processes behind, which then consumed memory and corrupted later verification attempts.

## Verification

- `node --test --import tsx "tests/unit/typecheck-config.test.ts"` passes.
- `node --check scripts/run-typecheck.mjs` passes.
- `node --check scripts/launcher/server.mjs` passes.
- Controlled supervisor runs no longer leave orphaned `run-typecheck` / `tsc` processes behind after timeout.

## Remaining issue

Even with the CI-scoped config, stale-cache cleanup, and clean process teardown, a supervised `typecheck` run against `tsconfig.ci.json` still did not complete within 10 minutes on this machine. That means the immediate config/caching defects are fixed, but whole-program TypeScript throughput is still a separate repo-level problem.
