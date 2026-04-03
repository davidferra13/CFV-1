# Build State

Last known state of the app. Updated after every successful type check and build.

**Rules:**

- Update this after every successful `tsc` + `next build`.
- If you break the build and can't fix it, update this to `broken` with details.
- Builders must read this before starting. Do not build on a broken foundation.

---

## Current State

| Check                        | Status | Last Verified | Commit    | Agent           |
| ---------------------------- | ------ | ------------- | --------- | --------------- |
| `npm run typecheck:app`      | green  | 2026-04-03    | 86ddad72c | Claude Opus 4.6 |
| `npm run build -- --no-lint` | green  | 2026-04-03    | 86ddad72c | Claude Opus 4.6 |

**Last green build:** 86ddad72c (2026-04-03) - allergy spec build + research docs committed
**Last commit on main:** 86ddad72c - docs(research): add UX pattern research and interface philosophy rules

**Current blocker:** no repo-wide `tsc` or build blocker is currently active in this checkout. On 2026-04-03, the canonical wrappers were hardened so `npm run build -- --no-lint` clears stale `.next` output before building and `npm run typecheck:app` / `npm run typecheck:next` retry once after resetting stale incremental state. The current survey launch path is still blocked first on deployed host reachability: at 2026-04-03 04:39 EDT, both `https://beta.cheflowhq.com/api/health/readiness?strict=1` and `https://app.cheflowhq.com/api/health/readiness?strict=1` returned Cloudflare `530` / `1033` before any app-level survey verification could run. After deployment reachability is restored, the survey lane is still blocked on actual deployed verification and then phase-3 hardening.

**Known non-blocking build noise:** `npm run build -- --no-lint` still emits existing `DYNAMIC_SERVER_USAGE` warnings from unrelated routes during static generation, and Next 14.2.35 still warns that `serverActions` is an unrecognized key in `next.config.js`. The build exits `0`. Treat those warnings as follow-up runtime/config cleanup, not as a blocker for the current baseline.

**Canonical build command:** use `npm run build -- --no-lint`, not raw `npx next build --no-lint`.

**Pre-flight caveat:** this verified state is for the current dirty checkout, not a clean commit. Builder pre-flight must use preserved-dirty-checkout mode only when both this file and the latest builder-start handoff explicitly authorize it. That authorization currently exists for the active website handoff and for explicitly assigned OpenClaw runtime work routed through `docs/research/current-openclaw-builder-start-handoff-2026-04-03.md`; do not treat it as a general clean-worktree exemption for unrelated work.

**Current builder-start handoff:** `docs/research/current-builder-start-handoff-2026-04-02.md`

**System-level sequencing parent:** `docs/research/foundations/2026-04-03-system-improvement-control-tower.md`

**Historical recovery handoff:** `docs/research/current-build-recovery-handoff-2026-04-02.md`

## History

_Newest first. Keep the last 10 entries._

| Date       | tsc    | build | Commit                         | Agent   | Notes                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------- | ------ | ----- | ------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-04-03 | green  | green | dirty worktree from `f45fec2c` | Codex   | Landed the website performance hardening pass and build-tooling resilience fixes. Re-ran `npm run typecheck:app`, `npm run typecheck:next`, `node --test --import tsx tests/unit/typecheck-config.test.ts`, and `npm run build -- --no-lint`; all pass on the default `.next` path. Build still emits existing `DYNAMIC_SERVER_USAGE` warnings plus Next's `serverActions` config warning. |
| 2026-04-03 | green  | green | dirty worktree from `f45fec2c` | Codex   | Re-ran `npm run typecheck:app` and `npm run build -- --no-lint` before the active survey deploy-verification lane. Local pre-flight passed again, but deployed verification was blocked externally because both beta and production readiness endpoints returned Cloudflare `530` / `1033` before app-level checks.                                                                        |
| 2026-04-03 | green  | green | dirty worktree from `f45fec2c` | Codex   | Revalidated the post-event trust-loop slice after interruption recovery. `npm run typecheck:app`, `node --test --import tsx tests/unit/post-event-trust-loop.test.ts`, and `npm run build -- --no-lint` all pass. The owner event-detail lookup fix, unified wrap-tab trust panel, and `/surveys` trust-loop linkback/public-review state were re-verified on the live app.                |
| 2026-04-02 | green  | green | dirty worktree from `f45fec2c` | Codex   | Re-ran `npm run typecheck:app` and `npm run build -- --no-lint` after fixing `createClientFromLead` so the public chef inquiry flow no longer fails on empty-array client inserts. Re-verified the featured-chef trust funnel end to end, including successful public inquiry submission creating the linked client, inquiry, and draft event.                                             |
| 2026-04-02 | green  | green | dirty worktree from `f45fec2c` | Codex   | Freshly re-ran `npm run typecheck:app`, `npm run build -- --no-lint`, and `node --test --import tsx "tests/unit/beta-survey-utils.test.ts"` while tightening the survey builder handoff. The survey slice remains locally stable; next work is deployed verification, not more repo-local implementation.                                                                                  |
| 2026-04-02 | green  | green | dirty worktree from `f45fec2c` | Codex   | Freshly re-ran `npm run typecheck:app` and `npm run build -- --no-lint` after interruption recovery. Build still exits `0` while emitting `DYNAMIC_SERVER_USAGE` follow-up warnings, so the baseline is green but not runtime-clean.                                                                                                                                                       |
| 2026-04-02 | green  | green | dirty worktree from `f45fec2c` | Codex   | Revalidated the repo-wide baseline while finishing the survey passive-surfacing slice. `npm run typecheck:app` and `npm run build -- --no-lint` both pass again. Build-safe caching was added for active/public survey-definition reads to avoid DB-client exhaustion during static generation.                                                                                            |
| 2026-04-02 | broken | green | dirty worktree from `f45fec2c` | Codex   | `npm run typecheck:app` fails on malformed generated TypeScript in `lib/db/migrations/schema.ts`; `npm run build -- --no-lint` still completes. Public survey and Turnstile hardening were locally re-verified in the same pass.                                                                                                                                                           |
| 2026-04-02 | green  | green | 4743f418                       | Builder | UX polish: stagger-grid CSS, EmptyState upgrades on 5 pages                                                                                                                                                                                                                                                                                                                                |
| 2026-04-02 | green  | green | 5fc4c097                       | General | Debranding, build fix (contacts-actions), calendar fix (waitlist query)                                                                                                                                                                                                                                                                                                                    |
