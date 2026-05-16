# ChefFlow Human Body Build Extraction

Date: 2026-05-15

Source: current ChefFlow codebase scan plus `docs/specs/chefflow-human-body-master-transcript-2026-05-15.md`.

Purpose: convert the human-body architecture framing into build-ready product and engineering work that can massively improve ChefFlow without starting implementation prematurely.

Routing status: research-to-build extraction. Do not implement until explicitly fired.

Build queue note: the current repo instructions reference `.agents/skills/build-queue/scripts/build-queue.mjs`, but that script and `.agents/build-queue` were not present in this checkout during the scan. Queue-ready drafts are captured here until the queue mechanism is restored or replaced.

## Executive Summary

The body metaphor is not just language. It gives ChefFlow a practical improvement model:

`Sense -> Understand -> Decide -> Act -> Record -> Learn -> Resurface`

Every codebase improvement should strengthen one body function:

- Sense: search, analytics, logs, dashboards, route coverage.
- Decide: event readiness, pricing, FSM, recommendations, risk scoring.
- Move: chef workflows, server actions, UI controls, transitions.
- Protect: auth, tenant scoping, validation, rate limits, admin gates.
- Remember: clients, recipes, menus, events, AARs, notes, CIL, Remy context.
- Repair: audits, reconciliation, tests, cleanup jobs, failure capture.
- Speak: Remy, email, SMS, proposals, notifications, public copy.
- Grow: build queue, docs, migrations, specs, skills, release gates.

The body is already powerful. The top risk is coordination debt: too many routes, server actions, APIs, docs, background jobs, and tenant-scoped queries rely on manual discipline. The build strategy should calm and strengthen the body before adding more visible limbs.

## Evidence Labels

- Codebase verified: observed directly in current files.
- Inference: derived from current architecture and scan results.
- Research fact: from the thread/body transcript.
- Open question: needs user/product decision.

## Existing Implementation Map

| Body System   | Current Implementation                                                                  | Status                                            |
| ------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Brain         | `CONTEXT.md`, `docs/system-architecture.md`, feature inventory, project-map             | Implemented but needs synchronization             |
| Heart         | `lib/events/fsm.ts`, `lib/events/transitions.ts`, inquiry/quote/menu transitions        | Strong, needs lifecycle proof surfaces            |
| Blood         | PostgreSQL, Drizzle, `lib/db/compat.ts`, server actions, APIs                           | Powerful but manually scoped                      |
| Immune system | `middleware.ts`, `lib/auth/route-policy.ts`, role guards, API auth, cron auth           | Strong but huge audit surface                     |
| Muscles       | `app/(chef)`, `lib/events`, `lib/clients`, `lib/menus`, `lib/recipes`, finance, vendors | Broad and overgrown                               |
| Memory        | clients, events, recipes, AARs, CIL, Remy context, docs                                 | Rich but not consistently resurfaced              |
| Reflexes      | `app/api/cron`, `app/api/scheduled`, webhooks, Inngest, sync jobs                       | Broad, needs observability and proof              |
| Senses        | search, dashboards, admin pulse, analytics, logs                                        | Uneven, search needs FTS/pagination               |
| Hormones      | feature flags, settings, `requirePro()`                                                 | Partially implemented; `requirePro()` is no-op    |
| Growth        | docs, specs, skills, release scripts                                                    | Active, but build queue mechanism appears missing |

## Highest Leverage Build Waves

### Wave 0: Growth Organ Repair

Goal: restore the process body so future work can be queued, fired, verified, and closed.

Why first: the repo's own rules depend on a build queue script that appears missing. Without growth control, "massive improvement" turns into scattered edits.

### Wave 1: Immune System Hardening

Goal: generate and enforce route/API/server-action/tenant-scope protection maps.

Why first: cross-tenant leakage or admin/API exposure would be body-level failure.

### Wave 2: Blood Flow Standardization

Goal: make tenant-safe queries easier than unsafe queries.

Why second: the database is the bloodstream; manual scoping repeated everywhere is the largest systemic risk.

### Wave 3: Sense Upgrade

Goal: unify search and admin listing behavior around indexed, paginated, ranked reads.

Why third: the body cannot improve what it cannot see; current search behavior is uneven.

### Wave 4: Reflex Observability

Goal: make scheduled jobs, webhooks, non-blocking side effects, and sync processes visible and diagnosable.

Why fourth: reflexes already exist, but the body needs pain when they fail.

### Wave 5: Memory Resurfacing

Goal: bring client/event/recipe memory into the chef's real decision moments.

Why fifth: this turns stored data into leverage.

### Wave 6: Endocrine/Gating Cleanup

Goal: replace ambiguous tier/flag semantics with explicit feature gate behavior.

Why sixth: gates should regulate, not pretend.

## Queue-Ready Drafts

### 1. Restore The Growth Organ: Build Queue Contract

Raw source: body transcript "Build queue is growth control" and scan finding that queue script is missing.

Goal: restore or replace the build queue mechanism referenced by `AGENTS.md` so ChefFlow can intake, fire, verify, finish-check, and close work consistently.

Scope:

- Locate historical queue implementation if present in history or adjacent folders.
- If absent, scaffold a minimal compatible queue system under `.agents/skills/build-queue/scripts/build-queue.mjs`.
- Support `add`, `fire`, `finish-check`, and item movement between active, in-flight, blocked, done.
- Document expected proof pack fields.

Likely files:

- `.agents/skills/build-queue/scripts/build-queue.mjs`
- `.agents/build-queue/*`
- `docs/specs/build-queue-contract.md`
- `AGENTS.md` only if contract text is stale

Acceptance criteria:

- `node .agents/skills/build-queue/scripts/build-queue.mjs add --help` works.
- A sample item can be added, fired with run ID, finish-checked, and moved to done or blocked.
- Existing AGENTS workflow terms match actual commands.
- No application code touched.

Risks:

- Historical queue format may exist outside current checkout.
- Need avoid overwriting any untracked active queue data.

Verification:

- CLI smoke test for each command.
- Create and complete a disposable sample item.
- Confirm `git status` only shows intended queue-system files.

Priority: P0.

### 2. Generate The Immune Map: Route Protection Matrix

Raw source: body transcript "Auth is immunity" plus codebase scan of 906 pages and 411 API routes.

Goal: generate a machine-readable and human-readable matrix of every page/API route, its surface, actor, auth mode, and data exposure risk.

Scope:

- Traverse `app/` for `page.tsx`, `layout.tsx`, and `route.ts`.
- Cross-reference `lib/auth/route-policy.ts`.
- Classify public, chef, client, staff, partner, vendor, admin, tokenized, API skip-auth, and unknown.
- Flag routes not represented in route-policy arrays.
- Flag public/token/mobile/bare routes requiring manual review.

Likely files:

- `scripts/audit-route-protection-matrix.mjs`
- `docs/audit/route-protection-matrix.md`
- `tests/unit/route-protection-matrix.test.ts`
- `lib/auth/route-policy.ts` only for fixes after review

Acceptance criteria:

- Matrix accounts for every page and API route.
- Unknown/unclassified routes are explicitly listed.
- Admin routes show page/layout guard status.
- API skip-auth routes show self-auth mechanism or missing-auth warning.

Risks:

- Route groups and dynamic paths require careful normalization.
- Some public token routes are delivery mechanisms for client/partner/staff-owned work.

Verification:

- Unit test proves every `app/**/page.tsx` and `app/api/**/route.ts` appears in the matrix.
- Run script and inspect generated markdown.

Priority: P0.

### 3. Harden Blood Flow: Tenant-Safe Query Helpers

Raw source: body transcript "Blood must never leak across tenants."

Goal: introduce tenant-safe data-access primitives that make unscoped tenant queries harder to write and easier to audit.

Scope:

- Design a helper around current compat client and/or Drizzle patterns.
- Provide tenant-scoped wrappers for common tables using `tenant_id` or `chef_id`.
- Add tests for query generation and misuse.
- Convert one narrow low-risk domain as a pilot, not the whole codebase at once.

Likely files:

- `lib/auth/tenant-scope.ts`
- `lib/db/tenant-db.ts`
- `tests/unit/tenant-db.test.ts`
- pilot domain, possibly `lib/vendors/actions.ts` or a small read-only action

Acceptance criteria:

- Helper requires an authenticated user/tenant context.
- Tenant column must be explicit per table.
- Pilot conversion preserves behavior.
- Tests fail if tenant context is missing.

Risks:

- Table naming uses both `tenant_id` and `chef_id`.
- Over-broad conversion could conflict with active dirty work.

Verification:

- Unit tests.
- Focused typecheck for touched files.
- Query audit before/after for pilot domain.

Priority: P0/P1.

### 4. Give The Body Better Eyes: Universal Search Foundation

Raw source: body transcript "Eyes and ears" and existing `docs/search-foundation-audit.md`.

Goal: move universal/core search toward FTS-backed, indexed, paginated, ranked adapters instead of scattered `ILIKE`/client-side filtering.

Scope:

- Define a search adapter interface by entity type.
- Prioritize clients, events, menus, recipes, inquiries, quotes, expenses.
- Use existing FTS migration work where available.
- Escape LIKE patterns where fallback remains.
- Add pagination and result provenance.

Likely files:

- `lib/search/universal-search.ts`
- `lib/search/search-helpers.ts`
- `database/migrations/20260515000004_search_foundation_fts.sql`
- search unit tests
- affected route/page callers

Acceptance criteria:

- Search returns ranked, typed results with source entity and confidence/relevance.
- No raw user query is passed into LIKE patterns without escaping.
- Search calls are paginated or bounded.
- Existing universal search behavior preserved or intentionally improved.

Risks:

- Migration is currently dirty/uncommitted.
- Search touches many domains.

Verification:

- Unit tests for escaping, ranking, per-entity adapters.
- DB contract test for expected FTS indexes.
- Focused route smoke for universal search.

Priority: P1.

### 5. Build The Reflex Pain System: Side-Effect Observability

Raw source: body transcript "A failed reflex should create visible system pain."

Goal: standardize non-blocking side effects so failures are recorded, visible, and actionable.

Scope:

- Inventory non-blocking side effects in transitions, cron, webhooks, notification, sync, Remy hooks.
- Standardize on durable failure recording.
- Add dashboard/admin readout for recent side-effect failures.
- Add retry classification where appropriate.

Likely files:

- `lib/monitoring/non-blocking.ts`
- `lib/events/transitions.ts`
- `app/(admin)/admin/silent-failures/*`
- `app/api/cron/*`
- `app/api/scheduled/*`
- tests around non-blocking failure capture

Acceptance criteria:

- High-value side effects use one helper.
- Failure records include source, operation, tenant, entity, severity, error text, and retryability.
- Admin can see failures by severity and age.
- Event transition still succeeds when non-critical side effect fails.

Risks:

- Too many writes/noise if every tiny side effect records.
- Must avoid storing sensitive payloads in error logs.

Verification:

- Unit test simulated side-effect failure.
- Admin page smoke.
- Event transition test verifies non-blocking behavior.

Priority: P1.

### 6. Regulate Hormones: Real Feature Gate Contract

Raw source: body transcript "`requirePro()` is a weak hormone."

Goal: replace no-op feature gating with explicit, testable semantics across free tier, feature flags, VIP/admin bypass, and paid modules.

Scope:

- Define gate outcomes: allowed, allowed_with_prompt, blocked, admin_bypass, flag_missing.
- Decide whether free tier remains "complete standalone utility" and which features are leverage/automation.
- Update `requirePro()` or replace it with a clearer API.
- Add tests proving sensitive modules cannot rely on fake gates.

Likely files:

- `lib/billing/require-pro.ts`
- `lib/billing/pro-features.ts`
- `components/billing/upgrade-gate.tsx`
- `lib/features/chef-feature-flags.ts`
- tests for billing/tier/gates

Acceptance criteria:

- Gate behavior is explicit and documented.
- Existing no-op behavior is either intentionally preserved with a new name or replaced by real enforcement.
- Server-side gates cannot be bypassed by UI.
- Tests cover chef, VIP/admin, and missing flag cases.

Risks:

- Product decision needed: what exactly should be gated.
- Could break workflows if gates are tightened without migration.

Verification:

- Unit tests for gate matrix.
- Route/action smoke for gated feature.
- Product review of tier semantics.

Priority: P1, but product decision required.

### 7. Build The Inner Ear: Surface Ownership Registry

Raw source: body transcript "Every page should answer where am I, who am I acting as, what trust level am I in."

Goal: turn surface ownership into a generated registry that ties route, role, surface, nav owner, and data trust level together.

Scope:

- Extend `lib/surfaces/runtime-surface-contract.ts` into a route-level map.
- Generate route ownership from app folders and explicit overrides.
- Mark token-delivery routes with owning surface separate from current URL surface.
- Add tests for admin/partner/staff/client boundary drift.

Likely files:

- `lib/surfaces/runtime-surface-contract.ts`
- `lib/surfaces/route-metadata.ts`
- `scripts/build-surface-manifest.mjs`
- `tests/unit/runtime-surface-contract.test.ts`
- `tests/unit/admin-nav-boundary.test.ts`

Acceptance criteria:

- Every major route has current surface and owning surface.
- Tokenized delivery routes are not misclassified as public-owned.
- Staff is treated as restricted chef-surface execution unless explicitly otherwise.
- Partner self-service is separate from chef-side partner management.

Risks:

- Route ownership can become noisy without clear overrides.

Verification:

- Unit tests.
- Generated markdown map.
- Manual review of token/mobile/bare routes.

Priority: P1.

### 8. Upgrade The Doctor's Chart: Admin Diagnosis Surface

Raw source: body transcript "Admin should be diagnosis, not table dump."

Goal: shift admin overview from raw tables to vital signs: health, failures, stale queues, sync status, route/auth risks, search/index health, and tenant-impacting issues.

Scope:

- Define admin vital signs.
- Add cards/sections for recent side-effect failures, cron status, search health, route-protection unknowns, sync status, and stale build/work items.
- Avoid exposing unnecessary PII.

Likely files:

- `app/(admin)/admin/page.tsx`
- `app/(admin)/admin/pulse/*`
- `lib/admin/platform-stats.ts`
- `docs/uptime-history.json`
- `docs/sync-status.json`
- `lib/monitoring/*`

Acceptance criteria:

- Admin homepage answers: healthy, degraded, stuck, needs action.
- Each signal links to a drill-down or remediation route.
- Cross-tenant data is aggregated unless detail is explicitly admin-gated.

Risks:

- Existing admin files are dirty in current workspace.
- Needs careful PII boundaries.

Verification:

- Unit test for stats aggregation.
- Admin route smoke.
- Screenshot proof.

Priority: P2.

### 9. Resurface Memory At Decision Points

Raw source: body transcript "Memory is recall at the right moment."

Goal: surface relevant client/event/recipe/menu memory exactly when chefs quote, plan menus, prep, and follow up.

Scope:

- Pick one decision point first: quote drafting or menu planning.
- Show relevant history: prior events, allergies, favorites, disliked dishes, budget behavior, menu repeats, AAR notes.
- Make memory read-only and attributed.
- Add explicit stale/unknown labels.

Likely files:

- `app/(chef)/quotes/*`
- `app/(chef)/menus/*`
- `lib/clients/*`
- `lib/events/journey-steps.ts`
- `lib/menus/menu-history-actions.ts`
- `lib/ai/remy-context*`

Acceptance criteria:

- Chef sees relevant memory before committing the decision.
- Memory is tenant-scoped.
- AI summaries are labeled as summaries, not canonical truth.
- No new recipe generation or fabricated culinary content.

Risks:

- Could overwhelm UI if not prioritized.
- Needs careful distinction between fact, inference, and AI summary.

Verification:

- Unit tests for memory query scoping.
- Playwright route proof for selected decision point.
- Manual screenshot.

Priority: P2.

### 10. Make The Body Map Real: Generated File-To-Organ Inventory

Raw source: body transcript "A useful future generated inventory could assign each file to body function, organ, tissue type, risk class, proof type."

Goal: create a generated inventory that maps files/routes/modules to body function, domain organ, risk class, and verification proof.

Scope:

- Start with deterministic rules from paths and filenames.
- Classify `app`, `lib`, `components`, `tests`, `database`, `scripts`, `docs`.
- Output markdown and JSON.
- Include unknowns for manual classification.

Likely files:

- `scripts/build-body-map.mjs`
- `docs/audit/chefflow-body-map.md`
- `docs/audit/chefflow-body-map.json`
- tests for classifier rules

Acceptance criteria:

- Every tracked source file is classified or marked unknown.
- Each app route gets surface plus body function.
- Each lib domain gets organ plus risk class.
- Unknown count is visible and can be driven down over time.

Risks:

- Classification can become false confidence if not labeled as heuristic.

Verification:

- Script smoke.
- Unit tests for representative paths.
- Generated unknowns list reviewed.

Priority: P2/P3.

## Items Needing Product Decisions Before Queueing

### Feature Gate Semantics

Open questions:

- Which features are truly free, pro, admin-only, beta-flagged, or VIP/admin bypass?
- Should upgrade prompts ever block, or only appear after successful free action?
- Is `requirePro()` meant to enforce billing now, or should it be renamed to avoid false security/business assumptions?

### Memory Resurfacing Target Surface

Open questions:

- First decision point: quote drafting, menu planning, event prep, client follow-up, or dashboard?
- Should memory appear as a Remy panel, inline facts, alerts, or a compact "known context" drawer?
- Which facts are highest trust: explicit client preferences, event history, AAR notes, chef notes, Remy summaries?

### Admin Diagnosis Dashboard Scope

Open questions:

- Is the admin audience founder/operator only, or future support staff?
- Which admin vital signs matter most day one?
- Should tenant-specific drill-downs be allowed from the pulse page?

## Already Built Vs Missing

| Capability                  | Status                                 | Notes                                             |
| --------------------------- | -------------------------------------- | ------------------------------------------------- |
| Event FSM                   | Already implemented                    | Strong pure logic plus transition server action   |
| Append-only ledger          | Already implemented                    | Strong financial truth model                      |
| Route policy                | Implemented but needs refinement       | Needs generated completeness matrix               |
| Admin guards                | Implemented but needs continuous audit | Admin paths must keep page/action guards          |
| Tenant scoping              | Partially implemented                  | Manual, repeated, hard to audit                   |
| Universal search            | Partially implemented                  | Needs FTS/pagination/ranking consistency          |
| Side-effect failure capture | Partially implemented                  | Needs standardization and admin visibility        |
| Feature gating              | Partially implemented                  | `requirePro()` currently no-op beyond chef auth   |
| Build queue                 | Blocked by missing architecture        | Referenced by instructions, not found in checkout |
| Body map inventory          | Not implemented                        | New proposed generated audit artifact             |

## Recommended Sequence

1. Restore build queue/growth organ or create a minimal compatible queue replacement.
2. Generate route/API protection matrix before touching route/auth behavior.
3. Build tenant-safe query helper and pilot in one narrow domain.
4. Standardize search helpers and apply to universal search first.
5. Standardize side-effect failure recording and expose admin diagnosis.
6. Decide feature gate semantics, then fix `requirePro()` contract.
7. Pick one memory resurfacing decision point and build it end to end.
8. Generate body-map inventory to keep this metaphor operational.

## Parallelization Guidance

Can parallelize:

- Route protection matrix and body-map inventory, if scripts write different files.
- Search foundation and admin diagnosis, if admin work does not touch search files.
- Feature gate spec and memory surfacing spec, because product decisions differ.

Do not parallelize:

- Tenant helper conversion across many domains at once.
- Route policy edits with admin route refactors.
- Search migration changes with active dirty search files unless isolated in a worktree.
- Admin dashboard edits while other agents are editing `lib/admin/platform-stats.ts` or `app/(admin)/admin/*`.

## Proof Requirements For Any Fired Build

Every fired item needs:

- Acceptance evidence mapped to its criteria.
- Auth/tenant proof if touching protected data.
- Runtime proof for affected route or API.
- Test output or focused verification command.
- Screenshot/manual route check for UI work.
- Notes on partial work and blocked follow-ups.
- Finish-check once the build queue mechanism exists.

## Follow-Up Research Tasks

1. Investigate historical build queue implementation.
   - Unblocks: Growth Organ Repair.
   - Enough evidence: historical path, format, commands, or confirmation it is gone.

2. Audit current tenant helper candidates.
   - Unblocks: Tenant-Safe Query Helpers.
   - Enough evidence: list of common query patterns and top low-risk pilot domain.

3. Review active dirty search/admin/auth changes before firing related work.
   - Unblocks: Search and Admin waves.
   - Enough evidence: ownership of current dirty files and whether to isolate in worktree.

4. Decide product gating doctrine.
   - Unblocks: Feature Gate Contract.
   - Enough evidence: free/pro/admin/beta matrix.

5. Choose first memory resurfacing workflow.
   - Unblocks: Memory Decision Point build.
   - Enough evidence: one target route and top five facts to surface.
