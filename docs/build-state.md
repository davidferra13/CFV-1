# Build State

Last known state of the app. Updated after every successful type check and build.

**Rules:**

- Update this after every successful `tsc` + `next build`.
- If you break the build and can't fix it, update this to `broken` with details.
- Builders must read this before starting. Do not build on a broken foundation.

---

## Current State

| Check                                  | Status | Last Verified | Commit    | Agent           |
| -------------------------------------- | ------ | ------------- | --------- | --------------- |
| `npx tsc --noEmit --skipLibCheck`      | green  | 2026-04-05    | 9a13220e7 | Claude Opus 4.6 |
| `npx next build --no-lint` (16GB heap) | green  | 2026-04-05    | 3fea99c9d | Claude Opus 4.6 |

**Last green build:** 3fea99c9d (2026-04-05) - Normalized cents fix verified; sync quarantine 22->4
**Last commit on main:** 9a13220e7

**Current blocker:** none. Both typecheck and build pass. BUILD_ID artifact confirmed present after build. OOM fix: build requires `NODE_OPTIONS="--max-old-space-size=16384"` (8GB heap now insufficient; 16GB needed as codebase grew).

**Known non-blocking build noise:** `npm run build -- --no-lint` still emits existing `DYNAMIC_SERVER_USAGE` warnings from unrelated routes during static generation, and Next 14.2.35 still warns that `serverActions` is an unrecognized key in `next.config.js`. The build exits `0`. Treat those warnings as follow-up runtime/config cleanup, not as a blocker for the current baseline.

**Canonical build command:** use `npm run build -- --no-lint`; on Windows PowerShell, prefer `npm.cmd run build -- --no-lint` so warning output from `next build` is not misreported by the `npm.ps1` wrapper. Do not use raw `npx next build --no-lint`.

**Pre-flight caveat:** this file describes the last known green baseline, not every newer uncommitted change on top of it. Builder pre-flight must use preserved-dirty-checkout mode only when both this file and the latest builder-start handoff explicitly authorize it. That handoff now also lists the current dirty snapshot that sits ahead of this baseline; capture `git status --short` again before coding and do not treat the older green state as proof that the current dirty checkout is fully re-verified.

**Current builder-start handoff:** `docs/research/current-builder-start-handoff-2026-04-02.md`

**System-level sequencing parent:** `docs/research/foundations/2026-04-03-system-improvement-control-tower.md`

**Historical recovery handoff:** `docs/research/current-build-recovery-handoff-2026-04-02.md`

## History

_Newest first. Keep the last 10 entries._

| Date       | tsc    | build | Commit                         | Agent           | Notes                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | ------ | ----- | ------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-04-05 | green  | green | 2d7a17773                      | Claude Opus 4.6 | Dark theme remediation across 7 admin pages, Zero Hallucination fixes (silent zeros -> error states), visual polish (sparklines, animated counters, status glow).                                                                                                                                                                                                                          |
| 2026-04-05 | green  | green | 6633c8266                      | Claude Opus 4.6 | OpenClaw visibility gap closure: admin health dashboard, analytics integration, isFounder gate fix. Playwright-verified both pages.                                                                                                                                                                                                                                                        |
| 2026-04-05 | green  | green | f90796b5e                      | Claude Opus 4.6 | OpenClaw price validator cap $1000->$500, name normalizer bracket stripping, 24 outliers purged, sync verified (118 matched, 0 outliers). Build requires 16GB heap now.                                                                                                                                                                                                                    |
| 2026-04-03 | green  | green | dirty worktree from `f45fec2c` | Codex           | Landed the website performance hardening pass and build-tooling resilience fixes. Re-ran `npm run typecheck:app`, `npm run typecheck:next`, `node --test --import tsx tests/unit/typecheck-config.test.ts`, and `npm run build -- --no-lint`; all pass on the default `.next` path. Build still emits existing `DYNAMIC_SERVER_USAGE` warnings plus Next's `serverActions` config warning. |
| 2026-04-03 | green  | green | dirty worktree from `f45fec2c` | Codex           | Re-ran `npm run typecheck:app` and `npm run build -- --no-lint` before the active survey deploy-verification lane. Local pre-flight passed again, but deployed verification was blocked externally because both beta and production readiness endpoints returned Cloudflare `530` / `1033` before app-level checks.                                                                        |
| 2026-04-03 | green  | green | dirty worktree from `f45fec2c` | Codex           | Revalidated the post-event trust-loop slice after interruption recovery. `npm run typecheck:app`, `node --test --import tsx tests/unit/post-event-trust-loop.test.ts`, and `npm run build -- --no-lint` all pass. The owner event-detail lookup fix, unified wrap-tab trust panel, and `/surveys` trust-loop linkback/public-review state were re-verified on the live app.                |
| 2026-04-02 | green  | green | dirty worktree from `f45fec2c` | Codex           | Re-ran `npm run typecheck:app` and `npm run build -- --no-lint` after fixing `createClientFromLead` so the public chef inquiry flow no longer fails on empty-array client inserts. Re-verified the featured-chef trust funnel end to end, including successful public inquiry submission creating the linked client, inquiry, and draft event.                                             |
| 2026-04-02 | green  | green | dirty worktree from `f45fec2c` | Codex           | Freshly re-ran `npm run typecheck:app`, `npm run build -- --no-lint`, and `node --test --import tsx "tests/unit/beta-survey-utils.test.ts"` while tightening the survey builder handoff. The survey slice remains locally stable; next work is deployed verification, not more repo-local implementation.                                                                                  |
| 2026-04-02 | green  | green | dirty worktree from `f45fec2c` | Codex           | Freshly re-ran `npm run typecheck:app` and `npm run build -- --no-lint` after interruption recovery. Build still exits `0` while emitting `DYNAMIC_SERVER_USAGE` follow-up warnings, so the baseline is green but not runtime-clean.                                                                                                                                                       |
| 2026-04-02 | green  | green | dirty worktree from `f45fec2c` | Codex           | Revalidated the repo-wide baseline while finishing the survey passive-surfacing slice. `npm run typecheck:app` and `npm run build -- --no-lint` both pass again. Build-safe caching was added for active/public survey-definition reads to avoid DB-client exhaustion during static generation.                                                                                            |
| 2026-04-02 | broken | green | dirty worktree from `f45fec2c` | Codex           | `npm run typecheck:app` fails on malformed generated TypeScript in `lib/db/migrations/schema.ts`; `npm run build -- --no-lint` still completes. Public survey and Turnstile hardening were locally re-verified in the same pass.                                                                                                                                                           |
| 2026-04-02 | green  | green | 4743f418                       | Builder         | UX polish: stagger-grid CSS, EmptyState upgrades on 5 pages                                                                                                                                                                                                                                                                                                                                |
| 2026-04-02 | green  | green | 5fc4c097                       | General         | Debranding, build fix (contacts-actions), calendar fix (waitlist query)                                                                                                                                                                                                                                                                                                                    |
