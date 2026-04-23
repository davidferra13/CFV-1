# Next System Evolution - 2026-04-21

## Intent

ChefFlow already has broad feature coverage. The next high-leverage work is not more surface-area expansion. It is convergence:

- one authoritative truth model instead of competing status surfaces
- one verifiable release gate instead of mixed test authority
- one shared execution context instead of role-specific fragments
- one durable action spine instead of isolated recommendation engines
- one provenance model for docs and machine artifacts instead of stale guidance

This document defines the next net-new actions to design and implement. These are additive because they do not rebuild existing product features. They tighten the system around truth, integration, and execution.

## What Is Missing Now

### 1. There is no authoritative evidence contract for operational truth

The repo currently carries multiple valid-but-competing truth surfaces for runtime health, especially around OpenClaw and machine state.

Relevant evidence:

- `docs/anthropic-system-audit-2026-04-18.md`
- `docs/anthropic-unasked-questions-2026-04-18.md`
- `docs/anthropic-follow-on-audit-supplement-2026-04-18.md`
- `lib/platform-observability/coverage.ts`

What does not exist:

- one shared schema that distinguishes acquisition health, downstream freshness, last successful propagation, alert severity, and operator impact
- one canonical machine-readable source that downstream UI, audits, and docs all consume

### 2. The release gate does not have a durable authority model

The repo has real audits and inventories, but no first-class taxonomy for which warnings block release, which tests are heuristic, and which failures mean contract drift versus stale assertions.

Relevant evidence:

- `docs/build-state.md`
- `docs/anthropic-follow-on-audit-supplement-2026-04-18.md`
- `tests/unit/surface-completeness.test.ts`
- `lib/interface/surface-completeness.ts`
- `scripts/audit-surface-completeness.ts`

What does not exist:

- a release-gate manifest with severity classes
- a test taxonomy that distinguishes `policy`, `contract`, `heuristic`, `regression`, and `stale-contract`
- a machine-readable verification report that can be trusted without interpretation

### 3. Shared request identity is incomplete across roles

The middleware is aware of chef, client, staff, and partner route families, but the propagated request auth context only supports `chef | client`.

Relevant evidence:

- `middleware.ts`
- `lib/auth/request-auth-context.ts`
- `docs/anthropic-system-audit-2026-04-18.md`

What does not exist:

- one complete request-auth context contract for `chef`, `client`, `staff`, `partner`, and admin-safe downstream reads
- one shared authorization shape that server components, actions, audits, and route guards can consume consistently

### 4. Surface completeness does not prove rendered truth

The repo now inventories routes, SEO, build surfaces, and auth coverage. That is structural truth. It still does not prove that critical routes render the intended experience after hydration and are not trapped in indefinite loading, wrong-shell, or fallback states.

Relevant evidence:

- `lib/interface/surface-completeness.ts`
- `tests/coverage/13-public-seo-guards.spec.ts`
- `app/(public)/page.tsx`

What does not exist:

- a semantic render-integrity audit for critical routes
- a hydration-truth contract that fails on indefinite loading, wrong primary CTA, or missing hero targets
- browser-backed proof integrated into release profiles instead of one-off manual checks

### 5. Intelligence exists, but the execution spine is fragmented

ChefFlow has CIL, queue systems, next-best-action logic, Remy context, and a client work graph. What is still missing is the durable cross-surface action graph that unifies them into one shared "why now" model.

Relevant evidence:

- `project-map/infrastructure/ai.md`
- `lib/client-work-graph/build.ts`
- `lib/clients/next-best-action.ts`
- `lib/ai/remy-context.ts`

What does not exist:

- one canonical action object with source evidence, confidence, owner surface, supersession rules, and expiry
- one integration layer that lets dashboard cards, queue items, client work items, and AI suggestions resolve to the same underlying next action

### 6. Doc and artifact provenance is still under-specified

The repo contains docs, project maps, and generated artifacts, but not a durable labeling system that tells the reader whether a file is design intent, machine-truth, historical snapshot, or stale reference.

Relevant evidence:

- `project-map/infrastructure/auth.md`
- `project-map/infrastructure/realtime.md`
- `docs/anthropic-follow-on-audit-supplement-2026-04-18.md`

What does not exist:

- a provenance label system for docs and generated state
- contradiction checks between runtime truth and documented claims
- a hard distinction between checked-in history and live operational truth

## Next Net-New Actions

## Action 1: Build a Unified Operational Truth Contract

Design and implement a single truth contract for system health and external-data health.

Implementation scope:

- Create a shared status schema with explicit layers:
  - `acquisition`
  - `processing`
  - `freshness`
  - `delivery`
  - `operator_impact`
- Add adapters for current status producers instead of replacing them wholesale.
- Publish one machine-readable source for current truth.
- Make existing status surfaces render named layers from that source instead of synthesizing their own health language.

Why this is high leverage:

- Collapses competing truths into one debuggable model.
- Makes monitoring, UI, and audits speak the same language.
- Reduces false "healthy" or false "failed" interpretations.

Validation required:

- One failing upstream step and one successful downstream step must appear distinctly, not collapse into a single yes/no badge.
- The same incident must produce consistent layer states in API output, UI status, and audit/report output.

## Action 2: Add a Release-Gate Authority Layer

Design and implement a verification taxonomy that turns the current audit collection into a trusted release authority.

Implementation scope:

- Define severity classes for warnings: `ignore`, `track`, `block`.
- Define test classes: `policy`, `contract`, `heuristic`, `regression`, `stale_contract`.
- Add a release manifest that maps commands, allowed warnings, and blocking categories.
- Extend the existing surface completeness/reporting pipeline instead of creating a parallel checker.

Why this is high leverage:

- Makes "green" mean something precise.
- Reduces time lost interpreting noisy failures.
- Lets builders know whether to fix product code, update stale tests, or downgrade heuristics.

Validation required:

- A release run must emit a machine-readable report that names blockers and advisories separately.
- Known stale or heuristic checks must not silently masquerade as hard contract failures.

## Action 3: Unify Request Identity Across All Roles

Extend the current request-auth context from partial role coverage to a complete shared contract.

Implementation scope:

- Expand the propagated request context to cover `staff` and `partner`.
- Define a safe admin-aware downstream read model without trusting spoofable client input.
- Refactor downstream auth helpers to consume the shared request context where appropriate, while preserving DB-backed authority where required.
- Add coverage for route-family alignment and spoof-header rejection for every supported role.

Why this is high leverage:

- Removes duplicated auth truth paths.
- Improves consistency between middleware, layouts, server actions, and route guards.
- Tightens cross-surface cohesion without changing product behavior.

Validation required:

- Middleware and downstream helpers must agree on role, entity, and tenant for all supported roles.
- Spoofed headers must fail closed on public and skip-auth routes.

## Action 4: Add Render-Integrity Contracts For Critical Routes

Create a semantic browser-backed audit that proves important routes render the intended experience after hydration.

Implementation scope:

- Define render contracts for a small critical set first:
  - `/`
  - `/book`
  - `/chefs`
  - one chef route
  - one client route
  - one admin route
- Assert semantic outcomes, not fragile pixel snapshots:
  - primary heading present
  - primary CTA present
  - route not stuck in indefinite loading
  - no wrong-shell takeover
  - key fallback and empty states honest
- Link the render contract into release profiles and the system contract graph.

Why this is high leverage:

- Closes the gap between structural correctness and user-visible correctness.
- Prevents "SEO passes, hydration fails" regressions.
- Turns real browser truth into a first-class release input.

Validation required:

- Critical routes must pass at minimum desktop and mobile breakpoints.
- Indefinite loaders and wrong-shell renders must fail the audit automatically.

## Action 5: Build the Cross-Surface Action Graph

Design and implement the missing action spine that unifies CIL, queue systems, next-best-action logic, and client work graphs.

Implementation scope:

- Define one canonical action record with:
  - `source`
  - `evidence`
  - `confidence`
  - `owner_surface`
  - `urgency`
  - `expires_at`
  - `supersedes`
  - `resolved_by`
- Start with adapters over existing action producers rather than inventing new recommendation engines.
- Use the action graph as the shared input for dashboard next-action cards, queue prioritization, and AI suggestion context.

Why this is high leverage:

- Converts intelligence from observation-only into coordinated execution.
- Removes duplicate recommendation logic across surfaces.
- Gives the system a durable "what should happen next, and why?" layer.

Validation required:

- The same underlying business state must generate one canonical next action, reused across at least three existing consumers.
- Action supersession must prevent duplicate or contradictory recommendations.

## Action 6: Add Provenance Labels For Docs And Machine Artifacts

Implement a provenance contract so every operational document or generated artifact declares what kind of truth it represents.

Implementation scope:

- Define labels such as:
  - `design-spec`
  - `historical-record`
  - `machine-generated`
  - `runtime-truth`
  - `snapshot-only`
  - `stale-candidate`
- Add a lightweight parser/audit that flags contradictions between runtime-truth files, project-map docs, and verified contract outputs.
- Update only the highest-signal docs/artifacts first.

Why this is high leverage:

- Reduces wasted time on stale guidance.
- Makes audits and builder prompts safer.
- Separates source-of-truth files from contextual history.

Validation required:

- A contradiction between a runtime contract and a file labeled `runtime-truth` must fail the provenance audit.
- Historical docs must never be mistaken for current operational truth.

## Recommended Execution Order

1. `Action 1` Unified Operational Truth Contract
2. `Action 2` Release-Gate Authority Layer
3. `Action 4` Render-Integrity Contracts
4. `Action 3` Unified Request Identity
5. `Action 5` Cross-Surface Action Graph
6. `Action 6` Provenance Labels

This order is intentional:

- first make truth authoritative
- then make verification authoritative
- then prove rendered user reality
- then unify request identity
- then unify intelligence into execution
- then harden documentation and artifact trust

## Fresh-Context Agent Prompt

Use the prompt below for the next agent run.

```text
You are entering ChefFlow with zero prior state. Assume nothing. Reconstruct the system from first principles before making any change.

Your mission is to move the system toward a production-grade, fully integrated state by implementing the highest-leverage missing integration work. Do not add parallel systems. Do not rebuild existing features. Do not restate prior plans. Extend the current architecture.

Operating rules:

1. Full system awareness before action
   - Read the current architecture, build, and completion truth first.
   - Start with:
     - docs/system-architecture.md
     - docs/definition-of-done.md
     - docs/build-state.md
     - docs/architecture/current-state.md
     - docs/anthropic-system-audit-2026-04-18.md
     - docs/anthropic-follow-on-audit-supplement-2026-04-18.md
     - project-map/infrastructure/ai.md
     - middleware.ts
     - lib/auth/request-auth-context.ts
     - lib/interface/surface-completeness.ts
     - docs/next-system-evolution-2026-04-21.md
   - Inspect the current dirty working tree before editing. Do not assume the last green baseline still applies.

2. Strict non-duplication
   - Before designing anything, inventory what already exists in code.
   - Reuse existing contracts, audits, route inventories, and UI surfaces where possible.
   - If a capability already exists partially, extend it. Do not create a second version with a new name.
   - If you find an existing implementation that makes your planned work redundant, stop and pivot to integration or validation.

3. Bias toward integration over expansion
   - Prioritize connective tissue over new product surfaces.
   - Favor shared schemas, adapters, inventories, and contract enforcement over new pages, new dashboards, or new AI panels.
   - Use existing release profiles, audit scripts, auth helpers, and route graphs as the base layer.

4. Explicit validation of every decision
   - For each implementation choice, state:
     - what existing system it integrates with
     - what duplicate path it avoids
     - what proof will verify it
   - Do not trust green output without understanding what it proves.
   - Distinguish contract failures from heuristic warnings.
   - Validate with the smallest authoritative command set that proves the change, then run broader checks if the slice touches cross-system contracts.

5. Forward progress only
   - Pick one highest-leverage action from docs/next-system-evolution-2026-04-21.md that is both missing and integration-heavy.
   - Preferred order:
     1. Unified Operational Truth Contract
     2. Release-Gate Authority Layer
     3. Render-Integrity Contracts
     4. Unified Request Identity
     5. Cross-Surface Action Graph
     6. Provenance Labels
   - Complete one meaningful slice end-to-end rather than sketching six partial starts.

Execution workflow:

1. Reconstruct reality
   - Read the required files.
   - Inspect the relevant implementation paths for the chosen action.
   - Produce a short evidence-backed gap statement:
     - what exists
     - what is missing
     - why this slice is the highest leverage now

2. Design before edit
   - Define the minimum integrated design.
   - Name the exact files and contracts you will extend.
   - Name the files you intentionally will not create because they would duplicate existing logic.

3. Implement surgically
   - Make only the changes required for the chosen slice.
   - Preserve existing behavior unless the change is intentionally correcting a contradiction or integrity gap.
   - Add concise comments only where the contract would otherwise be unclear.

4. Validate decisively
   - Run targeted tests first.
   - Run any contract audit or release-profile checks relevant to the slice.
   - If the slice affects rendered behavior, run browser-backed verification.
   - If validation cannot be completed, say exactly what remains unverified and why.

5. Close with production-grade handoff
   - Summarize:
     - what was added
     - what existing system it now integrates with
     - what proof passed
     - what the next highest-leverage follow-up is
   - Do not claim completeness if proof is partial.

Non-negotiables:

- No rebuilding existing logic under new names.
- No shipping unvalidated truth surfaces.
- No vague "cleanup" without a contract.
- No new feature shells that are not wired to real data and real ownership.
- No silent assumptions about auth, status, or operational health.

Definition of success:

You leave the repo with one more authoritative layer than it had before: more coherent, less duplicated, more verifiable, and closer to a complete production system.
```
