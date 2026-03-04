# ChefFlow Deployment Defect Tracker (P0-P3)

Last updated: 2026-03-03
Owner: Platform Readiness

## Severity Definition

- `P0` - Launch blocker. Must be fixed before deployment.
- `P1` - High-risk. Must be fixed before deployment in core paths.
- `P2` - Important, should be fixed before scale.
- `P3` - Low-risk polish/follow-up.

## Status Definition

- `open` - Identified, not fixed yet.
- `in_progress` - Active fix work.
- `blocked` - Cannot proceed until dependency is resolved.
- `done` - Fixed and verified.
- `accepted_risk` - Explicitly allowed for launch with follow-up.

## Active Defects

| Done | ID     | Sev | Status | Area                      | Owner    | Evidence                           | Issue                                                                                                  | Next action                                                                                      |
| ---- | ------ | --- | ------ | ------------------------- | -------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| [ ]  | DF-001 | P1  | open   | DB schema alignment       | Backend  | smoke/build server logs 2026-03-03 | Missing DB objects referenced at runtime (for example `beta_survey_definitions`, `event_prep_blocks`). | Align migrations with connected DB, verify tables/views/functions exist, rerun smoke + coverage. |
| [ ]  | DF-002 | P1  | open   | Data model relationships  | Backend  | smoke logs 2026-03-03              | Ambiguous embed relationship between `chefs` and `chef_preferences` (`PGRST201`).                      | Make relationship explicit in queries or adjust schema constraints, then rerun affected flows.   |
| [ ]  | DF-003 | P2  | open   | Push notifications        | Platform | build logs 2026-03-03              | VAPID key not configured warning in API route.                                                         | Set production VAPID env vars and verify `/api/push/vapid-public-key`.                           |
| [ ]  | DF-004 | P2  | open   | API robustness            | Backend  | smoke logs 2026-03-03              | `Unexpected end of JSON input` in breadcrumbs endpoint on malformed/empty payloads.                    | Harden request parsing + validation and return safe 4xx.                                         |
| [ ]  | DF-005 | P3  | open   | Build/runtime diagnostics | Platform | build logs 2026-03-03              | High volume `DYNAMIC_SERVER_USAGE` warnings; some may be expected but untriaged.                       | Triage each warning into expected vs defect and document disposition.                            |

## Verified Fixes In This Pass

| Done | ID         | Sev | Status | Area                     | Evidence                                                       | Resolution                                                                                              |
| ---- | ---------- | --- | ------ | ------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [x]  | DF-FIX-001 | P1  | done   | Type safety              | `npx tsc --noEmit --skipLibCheck` (pass, 2026-03-03)           | Removed `@ts-nocheck` blocker in beta survey actions and resolved TS compile failures.                  |
| [x]  | DF-FIX-002 | P1  | done   | E2E infrastructure       | `npx playwright test --project=smoke` (11/11 pass, 2026-03-03) | Fixed Playwright setup/config issues causing smoke instability and startup hangs.                       |
| [x]  | DF-FIX-003 | P1  | done   | Auth testing reliability | smoke logs + pass run 2026-03-03                               | Added guarded E2E-only auth rate-limit bypass (`DISABLE_AUTH_RATE_LIMIT_FOR_E2E`) for `@chefflow.test`. |

## Execution Queue (Current)

1. Run `npm run test:coverage` and log every failure as `DF-###`.
2. Run `npm run test:interactions` and log every failure as `DF-###`.
3. Convert failures into prioritized fix batches: `P0/P1` first.
4. Re-run failing projects only, then full gate rerun.
