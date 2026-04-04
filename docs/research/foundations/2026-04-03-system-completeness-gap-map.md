# System Completeness Gap Map

Date: 2026-04-03
Status: foundational, builder-facing completeness map
Purpose: record the major missing, incomplete, and false-complete systems verified in the live repo so future builders stop assuming ChefFlow is complete just because the route tree is broad

Tags: `#foundations` `#completeness` `#gap-map` `#false-completion` `#builder-handoff` `#system-truth`

---

## Why This Exists

ChefFlow is no longer in the "missing features because nothing exists" phase.

The harder current risk is false completion:

- a route exists, so builders assume the loop is closed
- a table exists, so builders assume the system is wired
- a metric renders, so operators assume the number is real
- a helper or test exists, so future work assumes the contract is still true

This document exists to stop that.

It does not replace the system audit or the control tower.

It complements them by answering a narrower question:

What core systems still fail the completeness test?

---

## Expectation Model

The expectations in this document are derived from the current repo itself:

1. the route tree under `app/`
2. the domain modules under `lib/`
3. the current schema under `lib/db/schema/schema.ts`
4. the product scope docs that still describe ChefFlow as an operator system
5. repeated internal patterns where the repo already treats a domain as first-class

This is not an external wishlist.

If a domain has:

- a route
- a table
- navigation exposure
- AI/task copy
- or operator-facing copy that implies completion

then the expectation is internal to ChefFlow, not imported from somewhere else.

---

## Completeness Standard

A core system is not complete unless all of these are true:

1. it has a clear entry point
2. it can progress through its lifecycle
3. it has a real completion state
4. failure is observable
5. recovery or repair is possible
6. the data contract matches the actual code that reads and writes it

If any of those are missing, the system is incomplete even if the UI looks finished.

---

## Current Reality

The current repo posture is:

- broad surface area
- many real subsystems
- multiple false-complete lanes
- several duplicate or parallel implementations
- some release and verification contracts that no longer match the runtime

That means the next useful work is not generic exploration.

It is closure:

- route truth
- data-contract truth
- metric truth
- release-contract truth
- repair-loop truth

---

## Gap Matrix

| Domain                     | What exists now                                                                                                                                                                                       | Missing / incomplete truth                                                                                                                                                                                                   | Why this is expected to exist                                                                                                                                | Primary evidence                                                                                                                                                                                                                                                                                                                            | Impact                                                                                                                                 | Recommended next move                                                                                                                                 | Readiness                   |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| Build and release contract | Public health and readiness routes exist, a `web-beta` release profile exists, targeted unit tests exist, and release scripts treat this lane as active.                                              | The contract is stale: `/api/health` tests still expect old env names, launch-surface guards point to missing public routes, and the `web-beta` build-surface test expects an overlay directory that does not exist.         | The repo already treats build and release verification as first-class through `package.json`, `scripts/verify-release.mjs`, and public health endpoints.     | `app/api/health/route.ts`, `app/api/health/readiness/route.ts`, `lib/health/public-health.ts`, `tests/unit/api.health-route.test.ts`, `tests/unit/api.readiness-route.test.ts`, `tests/unit/launch-surface-guards.test.ts`, `tests/unit/web-beta-build-surface.test.ts`, `scripts/build-surface-manifest.mjs`, `scripts/verify-release.mjs` | Builders inherit false greens, release checks fail for stale reasons, and dead profile assumptions keep resurfacing.                   | Build the narrow release-contract spec that aligns health env checks, launch-surface tests, and release-profile expectations with the actual runtime. | `ready-spec`                |
| Tasks vs todos             | A real structured task system exists on `/tasks`, while `chef_todos` still exists as a lighter reminder system used by dashboard and automations.                                                     | Several AI and quick-action surfaces mix the two systems: one route points to nonexistent `/todos`, some AI code reads nonexistent columns on `chef_todos`, and one intelligence helper queries a nonexistent `todos` table. | The repo already treats tasks as a core operator workflow and reminders as a separate lightweight concept. That distinction has to stay explicit in code.    | `app/(chef)/tasks/page.tsx`, `lib/tasks/actions.ts`, `components/dashboard/quick-create-strip.tsx`, `lib/todos/actions.ts`, `lib/ai/agent-actions/operations-actions.ts`, `lib/ai/agent-actions/briefing-actions.ts`, `lib/ai/remy-context.ts`, `lib/ai/remy-intelligence-actions.ts`                                                       | Broken navigation, wrong AI context, and invisible data bugs in morning-briefing / task-assistant flows.                               | Build the narrow task/todo contract spec that assigns canonical ownership and removes cross-system field drift.                                       | `ready-spec`                |
| Pipeline analytics         | The Analytics Hub exposes a pipeline tab with ghost rate, lead time, decline reasons, negotiation, response time, and funnel reporting.                                                               | Multiple pipeline metrics are still hard-coded as deferred zero or empty values even though the needed schema fields already exist. The current page also falls back to silent zeros when fetches fail.                      | Analytics is already a visible operator surface, and the current schema includes the columns the code still claims are missing.                              | `app/(chef)/analytics/page.tsx`, `components/analytics/analytics-hub-client.tsx`, `lib/analytics/pipeline-analytics.ts`, `lib/db/schema/schema.ts`                                                                                                                                                                                          | Operators get false business truth instead of either real numbers or honest degraded-state messaging.                                  | After route ownership lands, build the narrow pipeline analytics truth spec.                                                                          | `ready-spec`                |
| Insurance ownership        | Live protection settings use `chef_insurance_policies`, while a deferred compliance implementation still targets `insurance_policies`. A dashboard widget also points to a route that does not exist. | There is no single canonical insurance owner. One codepath is live, one is deferred, and at least one widget is orphaned.                                                                                                    | Insurance is already treated as an operator protection domain with settings, dashboard, reminders, and safety/claims adjacency.                              | `app/(chef)/settings/protection/page.tsx`, `app/(chef)/settings/protection/insurance/page.tsx`, `lib/protection/insurance-actions.ts`, `lib/compliance/insurance-actions.ts`, `components/dashboard/insurance-alerts-widget.tsx`, `components/dashboard/insurance-health-card.tsx`                                                          | Duplicate ownership, dead links, and future builder confusion about which table/module is real.                                        | Write a narrow insurance ownership and route-truth spec before code.                                                                                  | `research-backed-unspecced` |
| Admin ops activation       | Admin surfaces for silent failures, feature flags, and audit all exist, and the schema also contains the corresponding tables.                                                                        | The routes still treat missing tables as a normal runtime state, which means admin control and observability are environment-dependent instead of guaranteed.                                                                | If a page exists specifically to inspect failures or roll out flags, the supporting data layer must be treated as required, not optional.                    | `app/(admin)/admin/silent-failures/page.tsx`, `app/(admin)/admin/flags/page.tsx`, `app/(admin)/admin/audit/page.tsx`, `lib/monitoring/non-blocking.ts`, `lib/admin/flag-actions.ts`, `lib/admin/audit.ts`, `lib/db/schema/schema.ts`                                                                                                        | Admin ops becomes "maybe available" instead of a reliable control plane, and incidents are harder to reason about across environments. | Write a narrow admin activation spec once migration/runtime ownership is confirmed.                                                                   | `research-backed-unspecced` |
| Side-effect recovery       | Booking, lifecycle transitions, Stripe webhooks, and cron flows all exist and many already log non-blocking failures.                                                                                 | The system still lacks a true repair loop: core writes succeed while downstream email, calendar, webhook, and notification side effects can fail without a closed replay path.                                               | The repo already knows these are non-blocking side effects and has started recording failures, which implies the missing next step is repair, not discovery. | `app/api/book/route.ts`, `lib/events/transitions.ts`, `app/api/webhooks/stripe/route.ts`, `app/api/scheduled/lifecycle/route.ts`, `lib/monitoring/non-blocking.ts`, `lib/db/schema/schema.ts`                                                                                                                                               | Partial success accumulates silently and operators cannot reliably repair the broken downstream state from one canonical place.        | Keep this in the control tower as a larger follow-up; write a narrow outbox / repair spec before code.                                                | `research-backed-unspecced` |
| Auth hardening             | Auth.js, role checks, and route gating are real.                                                                                                                                                      | No MFA, TOTP, or step-up layer was found for chef/admin actions with financial or operational blast radius.                                                                                                                  | ChefFlow already treats auth and permissions as critical; higher-privilege mutation surfaces justify a stronger auth layer.                                  | `app/auth`, `lib/auth/auth-config.ts`, `middleware.ts`, `lib/auth/admin.ts`, `lib/auth/get-user.ts`                                                                                                                                                                                                                                         | A single compromised session still has broad reach across money, client data, and operations.                                          | Write a narrow auth-hardening spec after the current truth/repair lanes are clearer.                                                                  | `research-backed-unspecced` |

---

## Canonical Next Specs Opened From This Gap Map

These are the builder-ready slices opened directly from the verified gaps above:

1. `docs/specs/p1-build-and-release-contract-truth.md`
2. `docs/specs/p1-task-and-todo-contract-truth.md`
3. `docs/specs/p1-pipeline-analytics-truth-and-honesty.md`

These do not replace the existing trust, continuity, or dead-zone specs.

They close missing truth lanes that the earlier queue did not yet isolate cleanly.

---

## What This Document Does Not Claim

- It does not claim the whole product is broken.
- It does not claim every incomplete domain should be coded immediately.
- It does not claim every `research-backed-unspecced` row is ready for a builder.
- It does not replace the control tower's role in queue order.

It does claim that the listed gaps are real, verified from the current repo, and important enough that future agents should stop assuming those lanes are already closed.

---

## Maintenance Rule

Update this document in the same pass whenever any of these change materially:

- `docs/research/foundations/2026-04-03-system-improvement-control-tower.md`
- `docs/research/current-builder-start-handoff-2026-04-02.md`
- `app/api/health/route.ts`
- `app/api/health/readiness/route.ts`
- `lib/health/public-health.ts`
- `app/(chef)/tasks/page.tsx`
- `lib/tasks/actions.ts`
- `lib/todos/actions.ts`
- `lib/analytics/pipeline-analytics.ts`
- `lib/protection/insurance-actions.ts`
- `lib/compliance/insurance-actions.ts`
- `lib/monitoring/non-blocking.ts`

If any of those move and this file does not, the completeness map is stale.

---

## Completion Condition

This gap map is doing its job when a future builder can answer these questions without re-auditing the whole repo:

1. Which core systems still fail the completeness standard?
2. Which of those are already narrowed into build-ready specs?
3. Which still need a narrow spec before code?
4. Which surfaces look more complete than they really are?
5. Which missing loops are about repair, not discovery?

If those answers are clear, future work starts from truth instead of from surface area.
