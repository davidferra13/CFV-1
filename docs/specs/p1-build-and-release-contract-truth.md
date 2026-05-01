# Spec: Build and Release Contract Truth

> **Status:** built-build-proof-blocked
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** medium-large (8-12 files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                 | Date                 | Agent/Session   | Commit |
| --------------------- | -------------------- | --------------- | ------ |
| Created               | 2026-04-03 23:40 EDT | Planner (Codex) |        |
| Status: ready         | 2026-04-03 23:40 EDT | Planner (Codex) |        |
| Claimed (in-progress) | 2026-04-30 22:01 EDT | Codex builder   | this commit |
| Spike completed       | 2026-04-30 22:01 EDT | Codex builder   | this commit |
| Pre-flight passed     | 2026-04-30 22:01 EDT | Codex builder   | this commit |
| Implementation completed | 2026-04-30 22:01 EDT | Codex builder | this commit |
| Type check passed     | 2026-04-30 22:01 EDT | Codex builder   | this commit |
| Build check blocked   | 2026-04-30 22:01 EDT | Codex builder   | this commit |
| Playwright not needed | 2026-04-30 22:01 EDT | Codex builder   | this commit |
| Status: built-build-proof-blocked | 2026-04-30 22:01 EDT | Codex builder | this commit |

Build check blocker: `npm run build -- --no-lint` timed out after 15 minutes in this worktree and left `.next/BUILD_ID` missing. Targeted unit tests, `npm run test:unit:web-beta`, `npm run typecheck:web-beta`, `npm run lint:web-beta`, the build-surface audit, and heap-expanded `npx tsc --noEmit --skipLibCheck` passed.

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

- Operate as a senior systems architect and product engineer inside this repository.
- Build a precise, reality-based understanding of this folder and everything within it.
- Ground truth vs claims: identify what the system actually does right now and where it diverges.
- Do not rely on documentation alone - verify against actual code, structure, and behavior.
- SUPABASE IS FORBIDDEN!
- Proceed with the most intelligent decisions on my behalf, in the correct order.
- Bring everything to a clear, structured, and complete state so the builder agent has full context and can execute cleanly, in order.

### Developer Intent

- **Core goal:** repair the repo's build and release truth so health checks, release-profile tests, and build-surface assumptions match the actual current runtime instead of stale legacy contracts.
- **Key constraints:** do not invent missing beta surfaces just to satisfy old tests, do not preserve forbidden legacy assumptions, and do not widen this into a generic infrastructure rewrite.
- **Motivation:** a builder cannot execute cleanly if the repo's own verification stack lies about what exists or what environment contract the app really uses.
- **Success from the developer's perspective:** targeted release checks are trustworthy again, public health/readiness tests assert the real env contract, and no release-profile test depends on missing routes or missing overlay directories.

---

## What This Does (Plain English)

This spec makes the repo's own build and release checks tell the truth. After it is built, `/api/health` and `/api/health/readiness` tests will match the real env contract, the web-beta verification lane will stop depending on routes or overlay files that do not exist, and the remaining release-profile checks will describe the current product rather than an earlier beta architecture.

---

## Why It Matters

The current repo already has a release-verification lane, but parts of that lane are stale enough to fail for the wrong reasons. That makes future builders trust the wrong signals and wastes time on dead contracts instead of real regressions.

---

## Current State (What Already Exists)

### Verified current runtime contract

- `/api/health` and `/api/health/readiness` both currently require `DATABASE_URL` at the route layer.
- `lib/health/public-health.ts` still uses `NEXT_PUBLIC_DB_URL` and `DB_SERVICE_ROLE_KEY` for background-job readiness, even though `createAdminClient()` now goes through the direct PostgreSQL compatibility client.
- `next.config.js` still places `serverActions` at the top level, which Next 14.2.35 warns is unrecognized during build.
- `app/api/build-version/route.ts` and `app/api/sentinel/health/route.ts` both still read `.next/BUILD_ID` as the canonical deployed-build signal.

### Verified stale verification surfaces

- `tests/unit/api.health-route.test.ts` still expects `NEXT_PUBLIC_DB_URL` and `NEXT_PUBLIC_DB_ANON_KEY`.
- `tests/unit/api.readiness-route.test.ts` still expects the same legacy env keys plus `DB_SERVICE_ROLE_KEY`.
- `tests/unit/launch-surface-guards.test.ts` reads `app/(public)/pricing/page.tsx`, which does not exist.
- `tests/unit/web-beta-build-surface.test.ts` reads `build-surfaces/web-beta/...`, but that overlay directory does not exist in the repo.
- `scripts/build-surface-manifest.mjs` still declares the missing `build-surfaces/web-beta/app` overlay directory.

### Verified failure evidence

- Running `node --test --import tsx tests/unit/api.health-route.test.ts tests/unit/launch-surface-guards.test.ts tests/unit/web-beta-build-surface.test.ts` on 2026-04-03 failed 4 of 7 tests:
  - `/api/health` expected `ok` but returned `degraded`
  - missing env assertions expected old keys instead of `DATABASE_URL`
  - launch-surface guard expected missing `app/(public)/pricing/page.tsx`
  - web-beta build-surface guard expected missing overlay files
- Running `npm.cmd run build -- --no-lint` on 2026-04-03 exited `0` and emitted the normal route manifest, but `.next/BUILD_ID` was still absent immediately afterward and the top-level production dist did not retain the usual `server` / `static` artifact layout.

---

## Files to Create

None.

---

## Files to Modify

| File                                                                       | What to Change                                                                                                                                                                        |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/health/public-health.ts`                                              | Align background-job readiness env checks with the current direct-PostgreSQL admin client contract instead of stale legacy public DB env keys.                                        |
| `app/api/health/route.ts`                                                  | Keep the route contract explicit and update comments if needed so the route-level env requirement matches the health helper semantics.                                                |
| `app/api/health/readiness/route.ts`                                        | Keep readiness explicit and ensure its comments / route contract stay consistent with the helper changes.                                                                             |
| `lib/system/health-sweep.ts`                                               | Replace stale legacy DB env requirements in the service registry with the current canonical server-side contract.                                                                     |
| `tests/unit/api.health-route.test.ts`                                      | Rewrite expectations to the actual route contract and current health payload semantics.                                                                                               |
| `tests/unit/api.readiness-route.test.ts`                                   | Rewrite expectations so readiness truthfully covers route env checks plus degraded background-job behavior under the current contract.                                                |
| `tests/unit/launch-surface-guards.test.ts`                                 | Point the launch-surface assertions at real public marketing / launch surfaces that exist today.                                                                                      |
| `tests/unit/web-beta-build-surface.test.ts`                                | Stop asserting against missing overlay files. Either validate the active release-surface contract another way or remove the dead check if the overlay architecture is no longer real. |
| `scripts/build-surface-manifest.mjs`                                       | Remove or correct stale overlay assumptions so the manifest only describes real build surfaces.                                                                                       |
| `scripts/verify-release.mjs`                                               | Keep the `web-beta` release lane aligned with the updated manifest/test contract.                                                                                                     |
| `package.json`                                                             | Update any stale `lint:web-beta`, `test:unit:web-beta`, or related script file lists that still point at missing routes.                                                              |
| `next.config.js`                                                           | Move the `serverActions.bodySizeLimit` configuration to the correct Next 14 location so builds stop emitting the unrecognized-key warning.                                            |
| `app/api/build-version/route.ts`                                           | Keep the build-version endpoint aligned with whatever the canonical persisted build artifact becomes after the release contract is repaired.                                          |
| `app/api/sentinel/health/route.ts`                                         | Keep the sentinel health build-id reporting aligned with the repaired production artifact contract instead of assuming `.next/BUILD_ID` always exists.                                |
| `docs/research/foundations/2026-04-03-system-improvement-control-tower.md` | Reference this spec as the release-contract truth lane.                                                                                                                               |

---

## Database Changes

None.

### New Tables

```sql
-- None
```

### New Columns on Existing Tables

```sql
-- None
```

### Migration Notes

- No migration is part of this slice.
- Do not add new configuration tables or release-profile tables just to patch over stale tests.

---

## Data Model

This is a contract-truth slice, not a persistence slice.

### Canonical health contract

- `/api/health`
  - route-level required env: `DATABASE_URL`
  - no background-job check
- `/api/health/readiness`
  - route-level required env: `DATABASE_URL`
  - background-job readiness comes from the cron monitor using the current admin DB client path

### Canonical release-truth rules

- No unit test may depend on a route file that does not exist.
- No build-surface test may depend on an overlay directory that does not exist.
- No release-profile manifest may claim a concrete overlay path unless the directory is present and maintained.
- No release verification test may assert a legacy env contract when the runtime no longer uses it.

---

## Server Actions

None.

This slice changes route helpers, tests, and build/release scripts, not user-facing mutations.

---

## UI / Component Spec

There is no user-facing UI change requirement here beyond truthful health/readiness responses.

### States

- **Loading:** not applicable.
- **Empty:** not applicable.
- **Error:** tests and scripts should fail only for current-contract reasons, not for missing files from dead architecture.
- **Populated:** health/readiness responses and release verification reflect the actual current runtime.

### Interactions

- `npm run test:unit:web-beta` should become a truthful signal again.
- `npm run verify:release:web-beta` should either validate a real maintained release surface or fail for current runtime reasons, not for stale missing files.
- `npm run build -- --no-lint` should stop warning about the misplaced `serverActions` key.

---

## Edge Cases and Error Handling

| Scenario                                                  | Correct Behavior                                                                                                 |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` is missing                                 | `/api/health?strict=1` and `/api/health/readiness?strict=1` degrade for the current canonical env contract.      |
| Background-job query fails                                | Readiness reports degraded background jobs without pretending route env is missing if `DATABASE_URL` is present. |
| A legacy `web-beta` overlay path is intentionally retired | Remove the stale manifest/test assumptions rather than recreating fake overlay files.                            |
| A public launch surface moved                             | Update the launch-surface test to the current canonical route instead of pinning to a deleted route.             |
| The release lane still needs a beta-specific distinction  | Keep the distinction in scripts/config, but only with paths and surfaces that actually exist.                    |

---

## Verification Steps

1. Run `node --test --import tsx tests/unit/api.health-route.test.ts tests/unit/api.readiness-route.test.ts tests/unit/launch-surface-guards.test.ts tests/unit/web-beta-build-surface.test.ts`.
2. Verify: all targeted tests pass against the current runtime contract.
3. Run `npm run test:unit:web-beta`.
4. Verify: the web-beta unit profile passes without referencing missing public routes or missing overlay files.
5. Run `npm run build -- --no-lint`.
6. Verify: build still exits `0`, no longer warns that `serverActions` is an unrecognized key, and the canonical post-build artifacts persist truthfully.
7. Verify specifically: `.next/BUILD_ID` exists after the build and any endpoints that expose build identity no longer fall back to `unknown` under the repaired contract.
8. Run `npm run verify:release:web-beta` if the local environment is available for that lane.
9. Verify: any failure now points to a current runtime problem, not a dead file path, stale env expectation, or missing build artifact that the repo claims should exist.

---

## Out of Scope

- Rebuilding the entire hosted beta architecture.
- Reintroducing or fabricating missing marketing pages just to satisfy old tests.
- Rewriting all health tooling across the entire repo.
- Broad DB/client refactors unrelated to health/release truth.

---

## Notes for Builder Agent

- Treat stale release checks as dead contract, not as proof that the old architecture must come back.
- Keep the `web-beta` lane only if you can point to real current files and a real current build path.
- Preserve the distinction between route-level env health and deeper degraded readiness.
- Search for other nearby stale file-path assumptions before closing the slice; do not widen into a full grep-and-rewrite of every legacy env name in the repo.
