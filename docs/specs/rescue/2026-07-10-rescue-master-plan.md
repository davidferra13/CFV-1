# ChefFlow Rescue: Master Fix Plan

> **For agentic workers:** This is the dispatch index, not a task plan. Execute the four workstream plans below task-by-task using superpowers:subagent-driven-development or superpowers:executing-plans. Never execute this file directly.

**Goal:** Implement the rescue blueprint (docs/discovery/2026-07-10-chefflow-rescue-blueprint.md) end to end: security P0s, tiered navigation, homepage contract, core-workflow completion, module hardening.

**Architecture:** Four workstream plans, each self-contained with bite-sized TDD tasks, dispatched in waves that respect the cross-workstream dependency graph below. Nothing is deleted; every URL keeps resolving; every wave ends green on the closeout gate.

**Source blueprint:** docs/discovery/2026-07-10-chefflow-rescue-blueprint.md (sections 9, 10, 12 are the requirements ledger).

## The four workstream plans

| #   | Plan file                                                                                  | Tasks | Scope                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WS1 | [2026-07-10-rescue-ws1-security.md](2026-07-10-rescue-ws1-security.md)                     | 12    | Security P0s (requirePro no-op, gate registry consumers, tier resolution), route-policy fixes, e2e/demo hardening, correctness bugs                                                                        |
| WS2 | [2026-07-10-rescue-ws2-phase-a-reorganize.md](2026-07-10-rescue-ws2-phase-a-reorganize.md) | 15    | Phase A: workspace settlement, contract amendment, wiring-audit retool, module vocabulary, tier renderer, nav tagging and defect sweep, alias map and shells, Today homepage, module gallery, day-of sheet |
| WS3 | [2026-07-10-rescue-ws3-phase-b-core.md](2026-07-10-rescue-ws3-phase-b-core.md)             | 16    | Phase B: core journey e2e, recipe capture consolidation and persistence, inbox alias onboarding, costing to free floor, day-of door, leads fold, prep index, hub tier pass, @ts-nocheck sweep              |
| WS4 | [2026-07-10-rescue-ws4-phase-c-modules.md](2026-07-10-rescue-ws4-phase-c-modules.md)       | 17    | Phase C: OpenClaw containment, per-tenant cron and notification guards, lib/circles fold, receipt unification spec, schedule read view, Labs flags, Tier 4 docs, status-route conversion                   |

## Global constraints (apply to every task in every plan)

- Never delete work. Contain, alias, redirect, flag. Every existing URL resolves after every commit.
- Hands off the Studio work: app/(chef)/studio/, app/api/studio/, components/studio/, lib/studio/, its spec and migration. The wiring-audit allowlist covers /studio/preview.
- Line anchors in all plans were read from the dirty working tree; after WS2 Task 0 settles it, re-locate by quoted code, never by stale line number.
- Verification canon: npx tsc --noEmit --skipLibCheck, npm run regression:firewall, npm run test:unit, targeted Playwright on http://localhost:3100. Note: npm run test:affected does NOT exist despite CLAUDE.md citing it; plans substitute real commands. CLAUDE.md correction is queued below.
- Migrations additive only, timestamps strictly above the highest existing.
- No em dashes in any authored copy; nothing may read as machine-written.

## Execution order

**Wave 0 (owner present, blocks nearly everything):**

1. Answer the decision gates below (five minutes of owner time).
2. WS2 Task 0: settle the ~69 dirty working-tree files via /untangle. Transitively unblocks ~15 tasks across all four plans (route-policy, nav components, dashboard sections, three cron routes are all dirty).

**Wave 1 (parallel after Wave 0):**

- WS1 T1-T4: the enforcement spine (tier resolution, slug map, requirePro wiring, UpgradeGate). Everything tier-related in WS2 depends on this landing first; without it the tier system is client-side decoration.
- WS1 T5-T6: route-policy additions and prefix-shadowing fix.
- WS2 T1 (contract amendment) and T2 (tier-aware wiring-audit retool). T2 must land before any nav retagging or the closeout gate reddens on new WEAK routes.

**Wave 2 (Phase A body):**

- WS2 T3 (module vocabulary, the single slug registrar) then T5-T14 in plan order: renderer, tagging, defect sweep, alias map, homepage, gallery, day-of sheet.
- WS1 T7-T12 ride along (tripwire, demo guard, god-mode banner, enum fix, push URL, closeout). WS1 T3's Playwright probe must run before T7's gated env flip.

**Wave 3 (Phase B):**

- WS3 in plan order. T1 (core journey e2e) first; it is the flagship deliverable and may trigger T1B (conversion-fix contingency) if quote acceptance does not carry price and status onto the event.
- WS3 T13 blocks on WS2 T3 (Payroll and Tax slugs). Gated tasks (T4, T6, T8, T11, T12) run as their gates are approved.

**Wave 4 (Phase C):**

- WS4 in plan order. T5 (tenant module guards) hard-blocks on WS2 T13 (gallery backfill). T13B-T13E (status-route waves) are queued and can trail indefinitely without blocking anything.

**Every wave closes with:** npm run regression:firewall green, affected Playwright probes green, docs/test-coverage-blueprint.md updated, conventional commit per task, push at session end.

## Decision gates (owner answers; recommended defaults in parentheses)

| Gate | Question                                                                                                   | Blocks                 | Default                                                      |
| ---- | ---------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------ |
| G0   | Approve commit grouping of the dirty tree; Studio disposition per .planning/HANDOFF.json                   | ~15 tasks program-wide | group and commit, Studio stays with the other tool           |
| G1   | Day-of door: which of the 8 cockpits wins                                                                  | WS3 T12 (L effort)     | none; owner must name it                                     |
| G2   | Recipe costing to the free floor (reverses April 2026 two-tier call)                                       | WS3 T6                 | yes                                                          |
| G3   | Action bar five slots                                                                                      | WS2 T7                 | Today, Inbox, Tonight, Capture, Calendar                     |
| G4   | /tables mobile tab behind labs_experiments                                                                 | WS2 T8                 | yes                                                          |
| G5   | Shell conversions per cluster (recipes, funnel, time, plus WS2 clusters a-c)                               | WS2 T10, WS3 T4/T8/T11 | approve all                                                  |
| G6   | Existing-account module seeding set                                                                        | WS2 T13                | presence-mapped (circles data seeds dinner-circles ON, etc.) |
| G7   | Flip E2E_ALLOW_TEST_AUTH to false in .env and .env.local, restart production                               | WS1 T7 final substep   | flip after WS1 T3 probe passes                               |
| G8   | lib/circles fold into lib/hub (architecture review)                                                        | WS4 T8                 | proceed as written                                           |
| G9   | Queued long-tail: schedule read view (WS4 T10), status-route waves (WS4 T13B-E), receipt unification build | WS4 tail               | approve when Waves 1-3 are green                             |

## Dispatch guidance

- [CODEX-SAFE] tasks (roughly half): single-concern, spec-following; dispatch via codex exec, one task per invocation, referencing the plan file and task number.
- [OPUS-ONLY] tasks: security spine (WS1 T1-T4, T6-T8), journey e2e (WS3 T1), day-of door (WS3 T12), hub tier pass (WS3 T13), events status cluster (WS4 T13C). Dispatch to Claude builder agents.
- Serial builds, parallel planning already done. Include "Run /wire-audit before marking done" in every dispatch prompt.
- Builders update docs/UNIFIED-BUILD-QUEUE.md status tags (IN-FLIGHT, PARTIAL, DONE) as they claim and finish tasks.

## Known risks the plans already mitigate

1. Enforcement flips on for real: ~200 requirePro call sites across 86 files start denying free-tier chefs; /settings/payment-methods currently sits behind the integrations gate despite being a floor job (recorded tension; re-tier lands in WS2). Existing Playwright suites touching gated surfaces may go red; fix tiering, not tests.
2. The WS1 T7 tripwire makes the next production restart hard-fail until G7 is approved. Sequence: probe, flip, restart, verify.
3. Slug vocabulary drift between workstreams: WS2 T3 is the single registrar; WS4 verifies and never inserts; guards fail open on unknown slugs.
4. Dirty-tree anchor drift: every plan mandates re-locating by quoted code after settlement.
5. Tier semantics: chefs.subscription_status today means voluntary support billing; resolveChefTier is the single seam if plan billing later separates from support billing.

## Follow-ups discovered during planning (queued, not in any wave)

- CLAUDE.md cites npm run test:affected, which does not exist; correct the doc or add the script.
- lib/billing/tier.ts was deleted while its unit test survived; WS1 T1 restores the seam.
- docs/UNIFIED-BUILD-QUEUE.md summary counts are stale (349 claimed vs 427 DONE tags); reconcile during a queue grooming pass.
