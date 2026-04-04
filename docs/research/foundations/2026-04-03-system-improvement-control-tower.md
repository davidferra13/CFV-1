# System Improvement Control Tower

Date: 2026-04-03
Status: foundational, builder-facing decision surface
Purpose: give future builder and planner work one canonical system-level improvement document that translates the current audit, verification queue, website synthesis, continuity findings, and longer-horizon research into a dependency-aware order of operations

Tags: `#foundations` `#system-improvement` `#planning` `#verification` `#consolidation` `#builder-handoff`

---

## Why This Exists

ChefFlow no longer lacks research. The repo already has:

- system-shape audits
- verification-queue tracking
- website-build synthesis
- continuity and integration-gap analysis
- route and reachability audits
- large future-facing product specs

The remaining risk is not ignorance. The risk is planning drift:

1. treating built-but-unverified work as safe foundation
2. expanding into new feature work before validation and consolidation
3. reopening solved website or shell layers instead of composing with them
4. letting long-horizon platform ideas outrank nearer safety, reliability, and clarity work

This document fixes that.

It is the canonical system-improvement decision surface.

It does **not** replace:

- the system audit
- the website-build cross-reference
- the verification queue
- the platform-intelligence spec
- narrower implementation specs

Instead, it tells the next agent:

- what is already safe foundation
- what is still debt
- what is ready to build
- what needs a narrow spec before code
- what is blocked on real evidence
- what order the work should happen in

---

## Scope Boundary

This document covers system-level improvement prioritization only:

- build posture and builder-start constraints
- verified foundations that should not be restarted
- built-but-unverified implementation debt
- ready-spec work that is actually safe to build next
- critical continuity and propagation gaps
- dead zones and non-functional surfaces
- redundant and overgrown entry points
- orphaned, hidden, and duplicate surfaces
- validation-required assumptions
- long-horizon platform and competitor-parity work

This document does **not** try to absorb every supporting doc into one mega-memo.

Out of scope here unless a follow-up task explicitly requires it:

- runtime implementation details
- migration plans
- Playwright test steps for specific product features
- full website sequencing detail beyond what the website cross-reference already owns
- authenticated competitor observations not yet captured in source docs
- low-level rendering or performance-engineering audits

This file is about system improvement in the product-management sense:

- safer execution order
- less duplicate work
- less stale planning
- clearer boundaries between verified truth and attractive speculation

---

## Current System Posture

These are the current system-level truths that matter before any new build choice.

### 1. The recorded baseline is green, but the checkout is dirty

The repo-wide baseline is currently green for `npm run typecheck:app` and `npm run build -- --no-lint`, but that state is explicitly tied to a dirty checkout. A strict builder still needs to respect that caveat instead of force-cleaning the repo.

Primary references:

- `docs/build-state.md`
- `docs/research/current-builder-start-handoff-2026-04-02.md`

### 2. ChefFlow is structurally broad, not feature-starved

The system audit is explicit: ChefFlow is already structurally complete enough that the main risks are redundancy, clutter, dead zones, unverified work, and assumptions that still need real user validation.

Primary reference:

- `docs/research/phase-shift-system-audit-and-validation.md`

### 3. The website and shell already have real foundations

There is already a canonical website-build cross-reference, there is now a dedicated performance hardening companion handoff for explicitly assigned render-path/loading work, and there are already verified public-proof, discoverability, and shell-clarity foundations. Public and shell work should compose with those layers, not restart them.

Primary references:

- `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md`
- `docs/research/website-performance-hardening-handoff-2026-04-03.md`
- `docs/specs/featured-chef-public-proof-and-booking.md`
- `docs/specs/public-chef-credentials-showcase.md`
- `docs/specs/discover-state-normalization-hardening.md`
- `docs/specs/chef-shell-clarity-and-guided-settings.md`

### 4. Verification debt is still real

Multiple specs are built but not yet verified. That is active product debt, not finished work.

Primary reference:

- `docs/research/built-specs-verification-queue.md`

### 5. Critical continuity gaps still exist

The continuity audit already identified critical breaks in safety propagation, costing truth, profitability feedback, and system escalation. Those are not hypothetical.

Primary reference:

- `docs/research/cross-system-continuity-audit.md`

### 6. Surface sprawl is also a real problem

The route-discoverability and reachability audits show hidden routes, orphaned components, duplicate pairs, and partially severed surfaces. Some of the system is not missing, it is overgrown or disconnected.

Primary references:

- `docs/research/route-discoverability-report.md`
- `docs/research/production-reachability-report.md`

### 7. Platform intelligence is real, but it is not first

The platform-intelligence work is valuable, but its own constraints say the honest first win is email-first, source-aware continuity, not fantasy-level deep integrations everywhere.

Primary references:

- `docs/specs/platform-intelligence-hub.md`
- `docs/research/platform-intelligence-cross-persona-ground-truth-2026-04-02.md`

### 8. Broad surface area is still hiding completeness debt

The new completeness gap map confirms that several core lanes still fail the closure test even though the routes or tables already exist. The highest-confidence current examples are release-contract drift, task/todo contract drift, and false-complete pipeline analytics.

Primary reference:

- `docs/research/foundations/2026-04-03-system-completeness-gap-map.md`

---

## Canonical Inputs

Read these before using this control tower for planning or build selection:

1. `docs/build-state.md`
2. `docs/research/phase-shift-system-audit-and-validation.md`
3. `docs/research/built-specs-verification-queue.md`
4. `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md`
5. `docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md`
6. `docs/research/foundations/2026-04-03-system-completeness-gap-map.md`
7. `docs/research/cross-system-continuity-audit.md`
8. `docs/research/route-discoverability-report.md`
9. `docs/research/production-reachability-report.md`
10. `docs/specs/platform-intelligence-hub.md`
11. `docs/research/competitive-intelligence-gap-closure-builder-handoff-2026-04-02.md`

Use these as supporting inputs when relevant:

- `docs/research/builder-docket-runtime-ownership-map-2026-04-03.md`
- `docs/research/website-performance-hardening-handoff-2026-04-03.md`
- `docs/specs/chef-shell-clarity-and-guided-settings.md`
- `docs/specs/cost-propagation-wiring.md`
- `docs/specs/p1-demo-continuity-and-portal-proof.md`
- `docs/specs/p1-code-reachability-and-safe-prune-audit.md`
- `docs/specs/p1-build-and-release-contract-truth.md`
- `docs/specs/p1-dead-zone-gating-and-surface-honesty.md`
- `docs/specs/p1-analytics-surface-ownership-and-route-truth.md`
- `docs/specs/p1-pipeline-analytics-truth-and-honesty.md`
- `docs/specs/p1-event-scheduling-surface-ownership-and-route-truth.md`
- `docs/specs/p1-finance-root-canonicalization.md`
- `docs/specs/p1-recipe-root-canonicalization-and-route-truth.md`
- `docs/specs/p1-chef-getting-started-surface-consolidation.md`
- `docs/specs/p1-task-and-todo-contract-truth.md`
- `docs/specs/vendor-personalization-layer.md`
- `docs/research/chef-shell-clarity-intent-audit.md`
- `docs/research/code-audit-decision-register.md`
- `docs/research/cross-persona-workflow-patterns-and-breakpoints-2026-04-02.md`
- `docs/research/foundations/2026-04-02-chefflow-current-state-baseline.md`
- `docs/research/foundations/2026-04-02-repo-structure-and-navigation-map.md`
- `docs/research/foundations/2026-04-03-platform-intelligence-evidence-gaps-and-spec-corrections.md`
- `docs/research/foundations/2026-04-03-multi-persona-website-workflow-validation.md`
- `docs/research/foundations/2026-04-03-chef-activation-signal-inventory-and-execution-order.md`

---

## Decision Status Legend

Every workstream row in this document uses one of these statuses:

- `verified-foundation`
  Use this for work that already has a verified or clearly established baseline and should not be restarted casually.
- `built-unverified`
  Use this for implemented work that still needs verification before it is treated as trustworthy.
- `ready-spec`
  Use this for work with a clear implementation spec that is safe to hand to a builder next.
- `research-backed-unspecced`
  Use this for work where the need is real, but a narrow implementation spec still has to be written before code.
- `blocked-on-evidence`
  Use this for work that cannot be promoted until real evidence exists.
- `dead-zone`
  Use this for non-functional or misleading surfaces that should be gated, labeled, or removed from primary exposure.
- `redundant-needs-consolidation`
  Use this for overlapping surfaces where the right next move is merge, simplify, or assign canonical ownership.
- `validation-required`
  Use this for workstreams built on assumptions that still need user or runtime evidence.
- `long-horizon-in-progress`
  Use this for large future-facing efforts that matter, but should not outrank nearer obligations without an explicit reason.

---

## System Improvement Matrix

| Workstream                                                | Current repo truth                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Primary evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Status                          | Next action                                                                                                                                                                                                                            | Should a builder code now?                                         | Dependencies / prerequisites                                                                                                                                                                            | No-touch boundary                                                                                                                                         | Unverified / blocked note                                                                                                                                               |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build posture and builder-start constraints               | Repo-wide baseline is green, but explicitly tied to a dirty checkout. Builders must distinguish between a broken baseline and an intentionally preserved dirty checkout authorized for the current lane.                                                                                                                                                                                                                                                                                                                      | `docs/build-state.md`, `docs/research/current-builder-start-handoff-2026-04-02.md`                                                                                                                                                                                                                                                                                                                                                                                    | `verified-foundation`           | Treat this as context for every new build and spec decision. Use preserved-dirty-checkout mode only when both the build-state file and active handoff explicitly authorize it.                                                         | `no`                                                               | Read `docs/build-state.md` and the builder-start handoff first.                                                                                                                                         | Do not force-clean the repo just to satisfy a pre-flight heuristic, and do not generalize one lane's dirty-baseline allowance into a repo-wide exemption. | The exact dirty-worktree contents will continue changing over time.                                                                                                     |
| Public website trust and discovery baseline               | Website thread already has a canonical cross-reference plus verified and ready public specs, and that cross-reference now routes website-to-operator continuity through the source-to-close truth map and the demo-proof packet when the task is proof/showcase continuity.                                                                                                                                                                                                                                                   | `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md`                                                                                                                                                                                                                                                                                                                                                                             | `verified-foundation`           | Route all website/public-surface work through the website cross-reference first.                                                                                                                                                       | `yes`, but only through the existing spec order                    | Public-proof, discover, and intake baselines must be preserved first; continuity/showcase work also reads the source-to-close truth map and the demo-continuity spec.                                   | Do not restart public proof, public profile credibility, or discover-state hardening from scratch.                                                        | Broader site-level freshness is still blocked on approved evidence.                                                                                                     |
| Public intake and source-to-close routing truth           | The product already has multiple materially different intake lanes with different downstream record-creation, automation, and trust behavior.                                                                                                                                                                                                                                                                                                                                                                                 | `docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md`                                                                                                                                                                                                                                                                                                                                                                                            | `verified-foundation`           | Route any intake, routing, website-funnel, or trust-loop change through the source-to-close truth map first.                                                                                                                           | `yes`, but only after reading the truth map                        | Must preserve the distinction between open booking fan-out, single-chef planning inquiry, embed intake, staged Wix ingestion, kiosk capture, and instant checkout.                                      | Do not flatten all capture into one fake "website lead" model.                                                                                            | Some downstream analytics and trust-loop consolidation remain incomplete and are called out explicitly in the truth map.                                                |
| Demo continuity and public-to-portal proof                | The demo environment is real and already rich on the chef side, but the authenticated demo client story is structurally weaker because the demo client account is separate from the richer seeded hero clients. Current cross-persona research says the immediate leverage is a believable connected flow, not more disconnected feature breadth.                                                                                                                                                                             | `docs/specs/p1-demo-continuity-and-portal-proof.md`, `docs/research/cross-persona-workflow-patterns-and-breakpoints-2026-04-02.md`, `docs/research/foundations/2026-04-03-multi-persona-website-workflow-validation.md`, `docs/research/foundations/2026-04-03-platform-intelligence-evidence-gaps-and-spec-corrections.md`                                                                                                                                           | `ready-spec`                    | Build the demo continuity spec after nearer verification, hardening, and trust slices are cleared, or when the developer explicitly redirects the builder into demo-proof work.                                                        | `yes`, but not ahead of nearer hardening work                      | Preserve the current public/client/chef boundary model, reuse the real data model, and read the source-to-close truth map before touching public-proof or intake-adjacent surfaces.                     | Do not widen the public token portal into a new auth model, and do not fake proof with hardcoded demo-only UI.                                            | This spec intentionally focuses on continuity and proof. Broader portal redesign, messaging seeding, and guest-network depth remain later follow-up work.               |
| Built-but-unverified implementation debt                  | Active built work still needs Playwright or manual verification before it becomes trustworthy baseline.                                                                                                                                                                                                                                                                                                                                                                                                                       | `docs/research/built-specs-verification-queue.md`                                                                                                                                                                                                                                                                                                                                                                                                                     | `built-unverified`              | Burn down the verification queue before broad new feature expansion.                                                                                                                                                                   | `yes`, for verification work                                       | Respect current build-state caveats and queue order.                                                                                                                                                    | Do not reclassify queue items as "done" before verification.                                                                                              | Queue membership changes as more specs are verified.                                                                                                                    |
| Production resilience and observability hardening         | The production-hardening triage now has two narrow ready specs instead of one vague backlog item: automated encrypted database backups plus request-correlation / observability wiring. These are concrete reliability foundations, not speculative platform work.                                                                                                                                                                                                                                                            | `docs/specs/p1-automated-database-backup-system.md`, `docs/specs/p1-request-correlation-and-observability-wiring.md`, `docs/research/infrastructure-audit.md`                                                                                                                                                                                                                                                                                                         | `ready-spec`                    | Build `docs/specs/p1-automated-database-backup-system.md` first, then `docs/specs/p1-request-correlation-and-observability-wiring.md`.                                                                                                 | `yes`                                                              | Preserve the current cron, logging, and alerting patterns. Keep solutions dependency-light and Windows-compatible.                                                                                      | Do not widen this into paid backup infrastructure, broad telemetry vendor selection, or a generic platform rewrite.                                       | The prod-start watchdog hardening currently in the dirty worktree is adjacent local ops work, not a reason to delay these narrow queued specs.                          |
| Build and release contract truth                          | The canonical build baseline may still be green, but targeted release-contract tests are stale: `/api/health` tests still assert old env names, the launch-surface guard points to a missing public pricing route, and the `web-beta` build-surface contract still points at a missing overlay directory. A fresh canonical build on 2026-04-03 also exited `0` while still leaving no `.next/BUILD_ID`, so artifact-persistence truth is part of this lane too.                                                              | `docs/research/foundations/2026-04-03-system-completeness-gap-map.md`, `docs/specs/p1-build-and-release-contract-truth.md`, `app/api/health/route.ts`, `app/api/health/readiness/route.ts`, `app/api/build-version/route.ts`, `app/api/sentinel/health/route.ts`, `lib/health/public-health.ts`, `tests/unit/api.health-route.test.ts`, `tests/unit/launch-surface-guards.test.ts`, `tests/unit/web-beta-build-surface.test.ts`, `scripts/build-surface-manifest.mjs` | `ready-spec`                    | Build `docs/specs/p1-build-and-release-contract-truth.md` after the two production-hardening specs.                                                                                                                                    | `yes`                                                              | Preserve the current canonical build command and current public health/readiness routes, but remove stale assertions that no longer match the runtime and repair the canonical build-artifact contract. | Do not recreate missing beta surfaces or preserve dead overlay architecture just to satisfy a stale test.                                                 | The targeted stale tests already fail on the current checkout, and the post-build `.next/BUILD_ID` artifact is currently missing even after a successful build command. |
| Inquiry safety and dietary continuity                     | Public trust gap and inquiry-to-event safety continuity are real, and a ready spec already exists.                                                                                                                                                                                                                                                                                                                                                                                                                            | `docs/specs/p1-allergy-and-dietary-trust-alignment.md`, `docs/research/cross-system-continuity-audit.md`                                                                                                                                                                                                                                                                                                                                                              | `ready-spec`                    | Build the dietary-trust slice first when touching public trust or intake continuity.                                                                                                                                                   | `yes`                                                              | Preserve the verified public proof and intake baseline first.                                                                                                                                           | Do not invent a separate public-only safety model.                                                                                                        | Some rollout details remain product choices, but the core direction is already clear.                                                                                   |
| Costing truth, vendor propagation, and profitability loop | The highest-impact continuity gaps already have ready companion specs: `cost-propagation-wiring.md` covers C2, C3, M1, and H1, while `vendor-personalization-layer.md` covers H3 and M3. The remaining planned-vs-actual event financial summary gap is a narrower follow-up, not a reason to reopen broad continuity planning.                                                                                                                                                                                               | `docs/specs/cost-propagation-wiring.md`, `docs/specs/vendor-personalization-layer.md`, `docs/research/cross-system-continuity-audit.md`                                                                                                                                                                                                                                                                                                                               | `ready-spec`                    | Build `cost-propagation-wiring.md` first, then the vendor-layer cost-participation changes. Open a separate narrow follow-up spec only if the planned-vs-actual event financial summary gap still matters after those slices land.     | `yes`                                                              | Preserve `resolvePrice()` as the single source of truth and keep vendor participation aligned with the vendor spec's cost-propagation addendum.                                                         | Do not write another broad continuity memo or patch around price logic piecemeal outside the existing ready specs.                                        | `event_financial_summary` still does not fully unify planned menu cost and actual spend; treat that as a later follow-up if it remains a real operator gap.             |
| Dead zones and non-functional surfaces                    | The dead-zone class is now narrowed and specced: `/safety/claims/new` is the deceptive fake-save surface, `/finance/bank-feed` and `/finance/cash-flow` are overpromoted or degraded finance routes, and `/customers` is explicitly _not_ the same problem because it is an honest placeholder.                                                                                                                                                                                                                               | `docs/specs/p1-dead-zone-gating-and-surface-honesty.md`, `docs/research/chef-os-sanity-check.md`, `docs/research/route-discoverability-report.md`, `docs/research/phase-shift-system-audit-and-validation.md`                                                                                                                                                                                                                                                         | `ready-spec`                    | Build `docs/specs/p1-dead-zone-gating-and-surface-honesty.md`.                                                                                                                                                                         | `yes`                                                              | Recheck route exposure and keep the distinction between deceptive dead zones, degraded routes, and honest placeholders.                                                                                 | Do not widen this into a full finance rebuild, insurance-claims implementation, or fake customer-story patch.                                             | Bank-feed truth still varies by account state, and cash-flow likely needs a later repair pass after promotion is corrected.                                             |
| Operational task/todo contract truth                      | A real structured `/tasks` system exists, and a smaller `chef_todos` reminder system also exists, but several quick-action and AI surfaces still blur them by pointing to nonexistent `/todos`, selecting nonexistent `chef_todos` fields, or querying a nonexistent `todos` table.                                                                                                                                                                                                                                           | `docs/research/foundations/2026-04-03-system-completeness-gap-map.md`, `docs/specs/p1-task-and-todo-contract-truth.md`, `app/(chef)/tasks/page.tsx`, `lib/tasks/actions.ts`, `components/dashboard/quick-create-strip.tsx`, `lib/ai/agent-actions/operations-actions.ts`, `lib/ai/agent-actions/briefing-actions.ts`, `lib/ai/remy-context.ts`, `lib/ai/remy-intelligence-actions.ts`                                                                                 | `ready-spec`                    | Build `docs/specs/p1-task-and-todo-contract-truth.md` after the nearer hardening and continuity slices.                                                                                                                                | `yes`                                                              | Preserve the existing lightweight reminder widget where it is intentional, but make structured task language and AI task flows route through the actual task system.                                    | Do not collapse reminders and structured tasks into one fake universal table without preserving their different jobs.                                     | The repo currently has both systems; the gap is contract drift, not total absence.                                                                                      |
| Pipeline analytics truth and honesty                      | `/analytics` already exposes a real pipeline tab, but several of its metrics still use stale deferred-zero logic even though the needed schema fields already exist, and the page currently falls back to believable zero objects when a fetch fails.                                                                                                                                                                                                                                                                         | `docs/research/foundations/2026-04-03-system-completeness-gap-map.md`, `docs/specs/p1-pipeline-analytics-truth-and-honesty.md`, `docs/specs/p1-analytics-surface-ownership-and-route-truth.md`, `app/(chef)/analytics/page.tsx`, `components/analytics/analytics-hub-client.tsx`, `lib/analytics/pipeline-analytics.ts`, `lib/db/schema/schema.ts`                                                                                                                    | `ready-spec`                    | Build `docs/specs/p1-pipeline-analytics-truth-and-honesty.md` after the analytics surface-ownership slice when the assigned lane is false-complete pipeline reporting.                                                                 | `yes`                                                              | Read the analytics route-ownership spec first because both slices touch the same surface.                                                                                                               | Do not keep rendering silent zeros as business truth just because the tab already exists.                                                                 | Some lead-time sub-metrics may remain partially unavailable, but the page must label that honestly instead of pretending the number is zero.                            |
| Redundant entry points and system sprawl                  | Some consolidation is already specced. The shell and intrusive setup layer already have specs, finance root overlap has a narrow canonicalization slice, the dashboard/analytics overlap has a route-ownership plus link-truth slice, the recipe-root overlap has a route-truth plus compatibility-alias slice, and the event-and-scheduling overlap now has an ownership plus naming-truth slice. New overlap work should now be opened only when a distinct domain still shows unresolved route or surface ownership drift. | `docs/specs/chef-shell-clarity-and-guided-settings.md`, `docs/specs/p1-chef-getting-started-surface-consolidation.md`, `docs/specs/p1-finance-root-canonicalization.md`, `docs/specs/p1-analytics-surface-ownership-and-route-truth.md`, `docs/specs/p1-recipe-root-canonicalization-and-route-truth.md`, `docs/specs/p1-event-scheduling-surface-ownership-and-route-truth.md`, `docs/research/phase-shift-system-audit-and-validation.md`                           | `redundant-needs-consolidation` | Use existing narrow consolidation specs where they already apply, and write new domain-specific consolidation specs only when a remaining overlap lane is proven by current repo evidence.                                             | `yes`, but only for the already-specced slices                     | Must preserve route reachability, legacy compatibility where required, and shared navigation integrity while consolidating.                                                                             | Do not merge by deleting routes blindly or by collapsing unlike jobs into one generic hub.                                                                | Major audited overlap lanes now have dedicated slices, but future audits can still reveal narrower ownership drift inside other domains.                                |
| Insurance surface ownership and route truth               | Protection settings already use `chef_insurance_policies`, but a deferred compliance implementation still targets `insurance_policies`, and an orphaned dashboard widget points to `/compliance/insurance`, which does not exist.                                                                                                                                                                                                                                                                                             | `docs/research/foundations/2026-04-03-system-completeness-gap-map.md`, `app/(chef)/settings/protection/page.tsx`, `app/(chef)/settings/protection/insurance/page.tsx`, `lib/protection/insurance-actions.ts`, `lib/compliance/insurance-actions.ts`, `components/dashboard/insurance-alerts-widget.tsx`, `components/dashboard/insurance-health-card.tsx`                                                                                                             | `research-backed-unspecced`     | Write a narrow insurance ownership spec before code.                                                                                                                                                                                   | `no`, not until a narrow spec exists                               | Preserve the live protection-settings lane and do not delete the real insurance UI while deciding ownership.                                                                                            | Do not revive the deferred compliance path or fake a `/compliance/insurance` route without proving it belongs.                                            | The current gap is ownership drift, not a blank domain.                                                                                                                 |
| Admin control-plane activation                            | Silent-failure, feature-flag, and audit pages exist, and the schema also defines the needed tables, but the pages still normalize missing-table states as if the admin control plane might legitimately not be installed.                                                                                                                                                                                                                                                                                                     | `docs/research/foundations/2026-04-03-system-completeness-gap-map.md`, `app/(admin)/admin/silent-failures/page.tsx`, `app/(admin)/admin/flags/page.tsx`, `app/(admin)/admin/audit/page.tsx`, `lib/monitoring/non-blocking.ts`, `lib/admin/flag-actions.ts`, `lib/admin/audit.ts`, `lib/db/schema/schema.ts`                                                                                                                                                           | `research-backed-unspecced`     | Write a narrow admin activation spec once migration/runtime ownership is confirmed.                                                                                                                                                    | `no`, not until a narrow spec exists                               | Must separate missing migration/application state from ordinary empty data.                                                                                                                             | Do not treat optional admin tables as permanent product truth if the UI is meant to be a real operator control surface.                                   | This likely depends on environment and migration posture, not just local code edits.                                                                                    |
| Closed-loop side-effect recovery                          | Core booking, payment, lifecycle, and cron flows already log many non-blocking failures, but they still lack a true replay/repair loop once the primary record has been committed.                                                                                                                                                                                                                                                                                                                                            | `docs/research/foundations/2026-04-03-system-completeness-gap-map.md`, `app/api/book/route.ts`, `lib/events/transitions.ts`, `app/api/webhooks/stripe/route.ts`, `app/api/scheduled/lifecycle/route.ts`, `lib/monitoring/non-blocking.ts`, `lib/db/schema/schema.ts`                                                                                                                                                                                                  | `research-backed-unspecced`     | Write a narrow outbox / repair-loop spec before code.                                                                                                                                                                                  | `no`, not until a narrow spec exists                               | Preserve the current non-blocking failure capture work and use it as the starting point for repair, not as the final state.                                                                             | Do not widen this into a platform rewrite or claim that logging a failure is the same thing as making the workflow recoverable.                           | The structural need is real, but the right repair boundary still needs a dedicated spec.                                                                                |
| Auth hardening for privileged mutations                   | Role checks and route gating are real, but no MFA, TOTP, or step-up layer was found for high-blast-radius chef/admin operations.                                                                                                                                                                                                                                                                                                                                                                                              | `docs/research/foundations/2026-04-03-system-completeness-gap-map.md`, `app/auth`, `middleware.ts`, `lib/auth/auth-config.ts`, `lib/auth/admin.ts`, `lib/auth/get-user.ts`                                                                                                                                                                                                                                                                                            | `research-backed-unspecced`     | Write a narrow auth-hardening spec once the nearer contract-truth and repair lanes are under control.                                                                                                                                  | `no`, not until a narrow spec exists                               | Must preserve current Auth.js flow and role model while adding stronger gates only where they matter.                                                                                                   | Do not bolt on MFA everywhere without deciding which actions actually require step-up.                                                                    | The risk is real, but the exact UX/policy boundary still needs an explicit spec.                                                                                        |
| Hidden, orphaned, and duplicate surfaces                  | The initial audit and first-pass decision register already exist. The remaining work is to consume them deliberately, not to recreate them from scratch.                                                                                                                                                                                                                                                                                                                                                                      | `docs/specs/p1-code-reachability-and-safe-prune-audit.md`, `docs/research/code-audit-decision-register.md`, `docs/research/route-discoverability-report.md`, `docs/research/production-reachability-report.md`                                                                                                                                                                                                                                                        | `validation-required`           | Use the existing audit outputs and decision register as the baseline. Open narrow recover/prune follow-ups only after confirming product intent for each candidate cluster.                                                            | `no`, unless a candidate-specific follow-up is explicitly assigned | Must compare route discoverability, import reachability, external entrypoints, and actual product intent together.                                                                                      | Do not delete a file just because imports are missing, and do not rerun the entire audit before checking the current register.                            | Some items are still test-only, tool-only, string-referenced, or intentionally parked and need a deliberate decision.                                                   |
| Chef shell calmness and guided hierarchy                  | The chef shell already has a verified simplification foundation, but builders can still regress it into a generic control-panel reskin or re-expand directory logic.                                                                                                                                                                                                                                                                                                                                                          | `docs/specs/chef-shell-clarity-and-guided-settings.md`, `docs/research/chef-shell-clarity-intent-audit.md`                                                                                                                                                                                                                                                                                                                                                            | `verified-foundation`           | Treat shell clarity as baseline. If a stronger visual language or example-state layer is wanted, open a companion spec instead of restarting shell architecture.                                                                       | `yes`, but only for explicit follow-up slices                      | Reuse the verified shell and navigation foundations first.                                                                                                                                              | Do not reintroduce encyclopedia-style shortcut density or misleading AI polish.                                                                           | Example-driven starter states and stronger visual-language work remain separate asks.                                                                                   |
| Assumption debt and user validation                       | The repo still carries assumptions about chef behavior, client behavior, and system usage that are not yet validated.                                                                                                                                                                                                                                                                                                                                                                                                         | `docs/research/phase-shift-system-audit-and-validation.md`                                                                                                                                                                                                                                                                                                                                                                                                            | `validation-required`           | Prioritize surveys, runtime evidence checks, and direct validation before broad new bets.                                                                                                                                              | `no`                                                               | Use the existing survey and validation workstreams as the next evidence layer.                                                                                                                          | Do not convert assumptions into product truth.                                                                                                            | This remains open until real user or runtime evidence closes it.                                                                                                        |
| Platform intelligence and source-aware capture            | A real long-horizon plan exists, but its own constraints say phase one is email-first, source-aware continuity. The canonical correction packet also locks what has been proven, what is still only inferred, and what evidence is still missing before broader integration claims should expand.                                                                                                                                                                                                                             | `docs/specs/platform-intelligence-hub.md`, `docs/research/platform-intelligence-cross-persona-ground-truth-2026-04-02.md`, `docs/research/foundations/2026-04-03-platform-intelligence-evidence-gaps-and-spec-corrections.md`                                                                                                                                                                                                                                         | `long-horizon-in-progress`      | Only advance specific platform-intelligence phases when explicitly assigned and after nearer validation or reliability work is respected. Read the correction packet before writing or sequencing any new platform-intelligence slice. | `no`, unless a specific phase is assigned                          | Must keep the honest capture-layer constraints intact and preserve the gap between research-backed truths and still-unverified live evidence.                                                           | Do not market or design around imaginary deep integrations.                                                                                               | Parser quality, authenticated platform details, and long-tail support behavior are still evolving.                                                                      |
| Competitor authenticated and support gap closure          | Public competitor research is strong, but deeper operator-level and support-behavior evidence is still gated.                                                                                                                                                                                                                                                                                                                                                                                                                 | `docs/research/competitive-intelligence-gap-closure-builder-handoff-2026-04-02.md`                                                                                                                                                                                                                                                                                                                                                                                    | `blocked-on-evidence`           | Resume only with legitimate logged-in research, support-validation logging, and explicit evidence tagging.                                                                                                                             | `no`                                                               | Must follow `Observed`, `Documented`, `Inferred` discipline.                                                                                                                                            | Do not treat marketing or help-center claims as equivalent to observed runtime behavior.                                                                  | Authenticated interiors and support behavior remain intentionally unverified until tested.                                                                              |

---

## Recommended Execution Order

This is the correct system-level order for future work unless a narrower assignment explicitly overrides it.

### Phase 0: Start from current truth

Do first:

1. read `docs/build-state.md`
2. read this control tower
3. if the task is about missing systems, false-complete surfaces, or builder-ready closure work, read `docs/research/foundations/2026-04-03-system-completeness-gap-map.md`
4. open the narrower source doc for the assigned workstream
5. confirm whether the task is verification, consolidation, cleanup, spec-writing, or build execution
6. if the task spans ChefFlow website work, OpenClaw runtime work, or Raspberry Pi host work, classify it with `docs/research/builder-docket-runtime-ownership-map-2026-04-03.md` before choosing a spec or execution path

### Phase 1: Preserve verified foundations

Treat these as baseline, not debate:

- current build-state caveats
- website cross-reference foundations
- public proof and discover hardening foundations
- verified shell and navigation hierarchy work

Why first:

- this prevents solved layers from being reopened
- it keeps future work grounded in what is already true

### Phase 2: Burn down built-but-unverified debt

Prioritize verification of already-built work before broadening feature surface area.

Why here:

- implemented but unverified code is still risk
- future planning is distorted when half-finished work is treated as settled

### Phase 3: Build the next production-hardening foundations

Build in this order:

- `docs/specs/p1-automated-database-backup-system.md`
- `docs/specs/p1-request-correlation-and-observability-wiring.md`
- `docs/specs/p1-build-and-release-contract-truth.md`

Why here:

- they reduce catastrophic data-loss and incident-debugging risk
- they restore truthful builder and release verification alongside the narrower reliability foundations
- they are already narrowed into builder-ready specs
- they improve the reliability of every later lane instead of adding new surface area

### Phase 4: Build the next ready safety and trust slice

Current best next buildable slice:

- `docs/specs/p1-allergy-and-dietary-trust-alignment.md`

Why here:

- it closes a real public trust and continuity gap
- it is already specced
- it aligns with the continuity audit

### Phase 5: Build the ready continuity fixes before touching deeper system intelligence

Build in this order:

- `docs/specs/cost-propagation-wiring.md`
- `docs/specs/vendor-personalization-layer.md`

Only write a new narrow follow-up spec here if a remaining continuity gap still survives those two slices, such as the planned-vs-actual event financial summary gap.

Why here:

- these are high-impact system truths
- the repo already has ready specs for the main break points
- they should not remain buried under future-facing platform work

### Phase 6: Build the ready dead-zone honesty pass and close the highest-confidence false-completion lanes

Then:

- build `docs/specs/p1-dead-zone-gating-and-surface-honesty.md`
- build `docs/specs/p1-task-and-todo-contract-truth.md` when the assigned lane is task/reminder closure
- use `docs/specs/p1-analytics-surface-ownership-and-route-truth.md` where the assigned problem is the dashboard, briefing, analytics, insights, guest-analytics, and intelligence overlap lane
- after that route-ownership slice, build `docs/specs/p1-pipeline-analytics-truth-and-honesty.md` when the assigned lane is false-complete pipeline reporting
- if the assigned goal is buyer-facing proof or demo readiness after the active validation lane closes, build `docs/specs/p1-demo-continuity-and-portal-proof.md`
- use `docs/specs/p1-chef-getting-started-surface-consolidation.md` where the assigned problem is the intrusive setup layer
- use `docs/specs/p1-finance-root-canonicalization.md` where the assigned problem is `/finance` versus `/financials`
- use `docs/specs/p1-recipe-root-canonicalization-and-route-truth.md` where the assigned problem is `/culinary/recipes` versus `/recipes`
- use `docs/specs/p1-event-scheduling-surface-ownership-and-route-truth.md` where the assigned problem is `/events`, `/calendar`, `/schedule`, `/production`, and `/events/[id]/schedule` ownership drift
- write new consolidation specs only for overlap domains that still do not have a narrow implementation slice

Why here:

- system trust degrades when broken and duplicate surfaces stay live
- the current completeness gaps are no longer hypothetical; several are already narrowed into builder-ready specs
- the demo-continuity packet is the correct proof-first branch when the goal is a believable showcase rather than another broad architecture lane
- already-specced consolidation work should land before anyone invents a broader rewrite
- consolidation should follow verification and core continuity, not precede them blindly

### Phase 7: Use the existing reachability audit and decision register before deleting or recovering hidden surfaces

Use:

- `docs/specs/p1-code-reachability-and-safe-prune-audit.md`
- `docs/research/code-audit-decision-register.md`

Update the register or open candidate-specific follow-up specs before deleting, recovering, or merging anything.

Why here:

- import absence is not the same thing as safe deletion
- the audit baseline already exists, so the right next move is deliberate follow-up, not re-running first-pass discovery blindly
- this is where code pruning becomes deliberate instead of destructive

### Phase 8: Close assumption debt with real evidence

Use:

- surveys and other explicit evidence-gathering lanes
- runtime evidence checks
- direct validation against live usage when possible

Why here:

- the anti-clutter rule explicitly says not to expand features without validated gaps

### Phase 9: Continue broader website and public-growth work through its own cross-reference

If the task is public-surface work, return to:

- `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md`

Why here:

- the website thread already has its own ordered execution map
- this control tower is the system-level parent, not a replacement

### Phase 10: Advance long-horizon platform intelligence and deeper competitor parity only when explicitly justified

Use:

- `docs/specs/platform-intelligence-hub.md`
- `docs/research/competitive-intelligence-gap-closure-builder-handoff-2026-04-02.md`

Why last:

- these are valuable, but they should not leapfrog nearer truth, safety, and consolidation work without an explicit reason

---

## What The Builder Must Not Do By Accident

- Do not force-clean the worktree just to satisfy a pre-flight pattern.
- Do not treat built-but-unverified work as trustworthy baseline.
- Do not restart the website proof stack or chef-shell simplification layers from scratch.
- Do not ignore existing ready continuity specs and reopen spec-writing for the same break points.
- Do not confuse system-level sequencing with hard code dependencies when a narrower spec already has no true prerequisite.
- Do not patch continuity gaps ad hoc outside the established pricing and vendor specs.
- Do not preserve stale release checks or missing build-surface assumptions just because they used to be part of a beta lane.
- Do not leave dead zones looking functional.
- Do not render silent fallback zeros as business truth on a visible analytics surface.
- Do not rerun the full reachability audit before checking the existing audit spec and decision register.
- Do not delete hidden or orphaned surfaces based on import counts alone.
- Do not promote assumptions, marketing claims, or help-center copy into product truth.
- Do not let deep platform or competitor work outrank nearer safety, verification, and clarity tasks by default.

---

## Maintenance Rule

This document must be updated in the same pass whenever any of these change materially:

- `docs/build-state.md`
- `docs/research/built-specs-verification-queue.md`
- `docs/research/builder-docket-runtime-ownership-map-2026-04-03.md`
- `docs/research/phase-shift-system-audit-and-validation.md`
- `docs/research/foundations/2026-04-03-system-completeness-gap-map.md`
- `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md`
- `docs/research/cross-system-continuity-audit.md`
- `docs/specs/p1-build-and-release-contract-truth.md`
- `docs/specs/cost-propagation-wiring.md`
- `docs/specs/p1-code-reachability-and-safe-prune-audit.md`
- `docs/specs/p1-dead-zone-gating-and-surface-honesty.md`
- `docs/specs/p1-demo-continuity-and-portal-proof.md`
- `docs/specs/p1-analytics-surface-ownership-and-route-truth.md`
- `docs/specs/p1-pipeline-analytics-truth-and-honesty.md`
- `docs/specs/p1-event-scheduling-surface-ownership-and-route-truth.md`
- `docs/specs/p1-finance-root-canonicalization.md`
- `docs/specs/p1-recipe-root-canonicalization-and-route-truth.md`
- `docs/specs/p1-chef-getting-started-surface-consolidation.md`
- `docs/specs/p1-task-and-todo-contract-truth.md`
- `docs/specs/vendor-personalization-layer.md`
- `docs/research/cross-persona-workflow-patterns-and-breakpoints-2026-04-02.md`
- `docs/research/foundations/2026-04-03-multi-persona-website-workflow-validation.md`
- `docs/research/code-audit-decision-register.md`
- `docs/specs/platform-intelligence-hub.md`
- `docs/research/competitive-intelligence-gap-closure-builder-handoff-2026-04-02.md`

If the source evidence changes and this control tower is not updated, the synthesis is stale.

---

## Completion Condition

This control tower is doing its job when a future builder or planner can answer these questions without re-synthesizing the repo from scratch:

1. What is already safe foundation?
2. What is still debt?
3. What is actually buildable next?
4. What still needs a narrow spec before code?
5. What is blocked on validation or evidence?
6. What must not be restarted, faked, or expanded out of order?

If those answers are clear, the next agent can move cleanly and in sequence.
