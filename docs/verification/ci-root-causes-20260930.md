# CFV-1 CI root-cause repair — 2026-09-30

Status: **BLOCKED**. This is a partial, verified repair, not a green release.

## Live source and ownership

- GitHub and `git ls-remote` independently confirmed main at `744db5efb6ed110940f6b438c37a6c4fdad06f7e`; rechecked before publication.
- Original CI: https://github.com/davidferra13/CFV-1/actions/runs/36685407759.
- Isolated branch: `fix/ci-root-causes-20260930`. The older local checkout had unrelated tunnel/deployment edits; none were changed.
- Merge/deployment is held until the existing gates pass. No production or database mutation was performed.

## Repairs

1. Registered the existing public `/find` and `/matches` pages and four existing chef pages (`/business/ops`, `/reference/dietary-conditions`, `/reference/food-safety`, `/series`). Added role-boundary assertions; no wildcard auth bypass or coverage exception.
2. Restored the Node unit harness's framework contract: Next 14 supplies a canary React implementation of `cache`, whereas direct Node resolution loads stable React 18 without it. The test-only preload uses the installed Next implementation only when the export is absent. Tests prove callbacks and errors are not cached across independent calls; production auth code is unchanged. Both test runners still run and propagate failures.
3. Unreferenced the SSE presence cleanup timer. Loading server modules previously kept otherwise finished test processes alive. Cleanup continues while the server is running; a subprocess lifecycle test verifies natural exit without a force-exit flag.
4. Completed service-simulation fixtures with explicit unchecked allergen evidence, matching the required context and production builder. Added unchecked/conflicting/verified assertions. No allergen readiness gate was relaxed.
5. Updated task fixtures for `time_estimate_minutes`, including a nonempty draft round-trip and normalization of valid, empty, and invalid estimates. Production task behavior and existing assertions are retained.
6. Updated Auth.js to `5.0.0-beta.32`, its Drizzle adapter to `1.11.3`, and their core to `0.41.3`; upgraded protobuf 7 to `7.6.6`. OpenTelemetry `0.212.0` pins vulnerable protobuf `8.0.0`, so a narrowly scoped override upgrades that dependency to `8.6.6`. Auth provider discovery and the actual OpenTelemetry log/metric/trace serializers passed smoke checks.

## Verification

Commands used Node **20.20.2**, matching the original CI runner, unless explicitly noted.

| Check                                                                                             | Result                                                                                      |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Focused route, simulation, task, React cache, SSE lifecycle, action layer, and client graph suite | **98 passed, 0 failed, 0 skipped**                                                          |
| Critical tests                                                                                    | **225 passed, 0 failed**                                                                    |
| Visitor alert tests                                                                               | **5 passed**                                                                                |
| Simulation Forge tests                                                                            | **19 passed**                                                                               |
| Simulation Forge release                                                                          | **25 cases, zero violations**                                                               |
| Full unit suite after root repairs                                                                | **3,438 Node tests: 3,306 passed, 132 failed, zero skipped; 60/60 Vitest tests passed**     |
| Original local unit run                                                                           | 3,349 Node tests: 3,205 passed, 144 failed; 60/60 Vitest tests passed                       |
| Production dependency audit                                                                       | **79 reported: 6 low, 51 moderate, 21 high, 1 critical**; original 84 with 5 critical       |
| Autonomous delivery contract                                                                      | Passed                                                                                      |
| Chef nav audit via `node --import tsx scripts/audit-chef-nav.ts`                                  | Passed: 505 discoverable static routes                                                      |
| Wiring audit                                                                                      | 985 routes, 982 wired, zero weak/orphan, 3 skipped                                          |
| File line budget                                                                                  | **171 violations**, plus 2 stale baseline entries; baseline unchanged                       |
| Strict lint                                                                                       | **13 errors, 75 warnings**; no suppressions added                                           |
| Accessibility markup                                                                              | **5 findings**                                                                              |
| Required notification actions                                                                     | Missing emitters: `cert_expiring_90d`, `cert_expiring_30d`, `cert_expiring_7d`              |
| Exact CI typecheck                                                                                | Heap exhaustion locally; 6 GiB diagnostic retry was killed (137). No green typecheck claim. |

The original GitHub unit count was 141 failures. Local counts differ; do not subtract counts across environments and call that a fixed-test count. More test cases now execute because the React import failures no longer abort their files. Remaining failures are still surfaced and fail the command.

## Remaining blockers

The adjacent JSON records every observed failing unit TAP entry by file, all 171 line-budget violations, all strict-lint findings, and the remaining critical dependency advisories.

- **Framework security:** Next `14.2.35` remains critical. Registry inspection finds no newer 14.x patch. The two critical advisory ranges end at `15.5.24`; clearing these requires a verified framework migration. Do not use `npm audit fix --force`, suppress the audit, or label the dependency gate green.
- **Unit contracts:** 132 failures remain across multiple domains. Examples include tests importing missing `lib/post-event/learning-logic`, `lib/post-event/trust-loop-helpers`, and `lib/db/client`; pricing tests expecting legacy nonzero system defaults while production constants intentionally start at zero; database mocks that no longer match their action APIs; request-scope and incremental-cache setup; navigation and feature-gate alignment. These need domain-specific repairs, not deleted tests or restored obsolete business defaults.
- **Previously skipped static gates:** file-size violations, conditional React hooks and other lint errors, nested interactive elements, and notification emitters all block the quality job after route coverage is repaired.
- **Runtime/build:** the native regression firewall was invoked unchanged. The `tsx` CLI nav substep hit a local IPC `EPERM`; its equivalent Node import invocation passed. Typechecking/runtime proof remains a separate requirement. Build and smoke cannot be represented as green while prerequisites fail.

## Scope and integration review

No UI layout, ledger, pricing, event lifecycle, notification emission, or persistence behavior is changed. Existing public/chef pages are classified according to their source route groups. Added role tests prove chef references remain protected. Menu/client intelligence and lifecycle relevance comes from simulation fixtures and route names, not a changed domain implementation. SSE cleanup affects process lifetime only; its broadcast and presence behavior is unchanged. Page rendering and deployment proof remain held with the failing release gate.

Safe changes may be reviewed on the repair branch. Merge and deploy only after the remaining gates have concrete green evidence.
