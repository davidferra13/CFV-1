# Spec: Production Code Reachability and Safe Prune Audit

> **Status:** verified
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)

## Timeline

| Event            | Date             | Agent/Session  | Commit |
| ---------------- | ---------------- | -------------- | ------ |
| Created          | 2026-03-31 23:55 | Codex planner  |        |
| Status: ready    | 2026-03-31 23:55 | Codex planner  |        |
| Reports produced | 2026-04-01       | Claude builder |        |
| Status: verified | 2026-04-01       | Claude builder |        |
| Audit refreshed  | 2026-05-01       | Codex          |        |

---

## Developer Notes

### Raw Signal

The developer has spent a very long time generating and refining code in this repo and believes a meaningful amount of unique code may now be severed, headless, hidden, or otherwise not wired into the actual product anymore.

They do not care about dead assets, screenshots, references, or generic residue in this effort. They care about real code, especially nuanced backend or feature code that may exist but do nothing, or features that should be accessible but are effectively hidden.

They are not sure whether this should be approached as a simple cleanup, a large cross-reference task, or a deeper accessibility audit. They explicitly want the highest-leverage strategy, not a bloated or diminishing-returns exercise.

Before proceeding, they want explicit alignment on current state, goal, assumptions, proof, scope, regression risk, and plan. They want intelligent sequencing. They do not want building. They do not want speculative code work. They want a spec only.

### Developer Intent

- **Core goal:** define a safe, evidence-driven process to identify production code that is truly unwired, hidden, redundant, or inaccessible, without breaking live features.
- **Key constraints:** ignore assets and generic residue; separate verified facts from assumptions; prefer production app/backend code over tooling noise; do not delete or rewrite anything during the first pass; do not build; write the spec only.
- **Motivation:** the developer has spent significant time and money generating code and wants to stop carrying dead weight while also recovering real features that may exist but are not reachable.
- **Success from the developer's perspective:** a future builder can audit the repo in the right order, produce a trustworthy keep/recover/delete register, and avoid both wasted cleanup work and accidental regressions.

---

## What This Does (Plain English)

This spec creates the first safe audit pass for repo code that may no longer be meaningfully connected to the product. It does not delete code. It does not refactor code. It produces evidence: which production files appear unreachable, which routes may exist but be undiscoverable, which backend paths may only be externally callable, which modules are test-only, and which files are likely duplicated or severed. The output is a decision register that future cleanup can trust.

---

## Why It Matters

Without a reachability audit, the team risks two bad outcomes at once: keeping expensive dead code forever, or deleting code that is still live but wired through a non-obvious path. This spec exists to reduce both risks before any cleanup begins.

---

## Full Alignment Check

### What Is Happening Right Now

This repo is currently a large Next.js and TypeScript application with a broad app surface, many route entrypoints, many support libraries, and a dirty working tree. Current build-state documentation reports green `tsc` and green `next build`, but the live worktree contains many unrelated modified and untracked files. The correct immediate task is planning, not code cleanup.

### What Has Already Been Done

A read-only repo inspection has already established a useful analysis boundary:

- `tsconfig.ci.json` defines the primary production-surface audit scope: `app`, `components`, `hooks`, `lib`, `types`, `middleware.ts`, and excludes `tests`, `scripts`, docs, screenshots, and generated folders.
- `tsconfig.scripts.json` separately defines the script/helper surface.
- The app is filesystem-routed under `app/`, so route files such as `page.tsx`, `route.ts`, `layout.tsx`, `error.tsx`, `loading.tsx`, `template.tsx`, and `not-found.tsx` are framework entrypoints even without normal imports.
- A first-pass static import-graph review found strong orphan candidates in production-surface `components`, `lib`, and `hooks`, but that result is not sufficient on its own to authorize deletion.

### Exact Current State

The following are verified current-state signals and should be treated as seed evidence, not final prune proof:

- Build-state documentation says the last recorded `tsc --noEmit --skipLibCheck` and `next build --no-lint` were green in `docs/build-state.md`.
- The production analysis boundary is explicitly narrower than the full repo because `tsconfig.ci.json` excludes `tests`, `scripts`, docs, and scratch directories.
- There is at least one clear duplicate/overlap signal in validation hooks: `hooks/use-field-validation.ts` and `lib/validation/use-field-validation.ts`.
- Representative production-surface files with no inbound references in the first-pass static graph include `components/ai/remy-public-widget.tsx`, `components/admin/admin-sidebar.tsx`, `components/activity/client-activity-timeline.tsx`, and `lib/ai/menu-suggestions.ts`.
- Some modules are referenced only by tests, not by production paths, such as `lib/events/fsm.ts` and selected auth/pricing helpers.

### True Goal of This Conversation

The true goal is to define the correct method for proving which code matters and which code does not. The goal is not to produce a giant dead-code list with false confidence. The goal is not to delete files quickly. The goal is to create a trustworthy audit sequence that future cleanup can follow.

### What Done Means, End-to-End

For this spec, "done" means:

- a builder can produce a production reachability report
- a builder can produce a route discoverability report
- a builder can produce a keep/recover/delete/uncertain decision register
- every candidate is backed by explicit evidence and classification
- no app code is deleted, moved, or refactored during this audit phase

If those conditions are not met, this audit is not done.

---

## Verified vs Unverified

### Verified

- The repo is a Next.js app-router codebase with filesystem entrypoints under `app/`.
- The production analysis boundary can be defined from `tsconfig.ci.json`.
- The repo contains many production-surface files with no obvious inbound imports in a first-pass static scan.
- Some files are duplicated in purpose or overlap in behavior.
- Some files appear to be test-only.

### Unverified

- Whether every production-surface orphan candidate is truly safe to delete.
- Whether every route with no visible link is actually inaccessible to users.
- Whether every API route with no internal caller is dead; some may be webhook, cron, OAuth callback, or external integration entrypoints.
- Whether some features are wired via string-based registries, dynamic imports, config maps, or database-driven activation.
- Whether some dead-seeming modules are intentionally retained as near-future scaffolding.

---

## Assumptions That Must Be Exposed

- Static import reachability is a starting signal, not a final verdict.
- Production code matters more than scripts, screenshots, logs, docs, and assets for this audit.
- Files under `app/` that match Next entrypoint conventions are live until proven otherwise.
- Hidden or inaccessible features are as important as dead code because the developer explicitly suspects code may exist but not be reachable.
- A safe audit should separate recovery candidates from prune candidates instead of treating them as the same problem.

---

## Scope and Non-Goals

### In Scope

- Production-surface code under `app`, `components`, `lib`, and `hooks`
- Route discoverability for user-facing `page.tsx` surfaces
- Backend/API discoverability risk for `route.ts` entrypoints
- Duplicate or overlapping implementations where one appears unused
- Test-only and script-only classification when it helps avoid false positives

### Out of Scope

- Images, screenshots, public assets, generated outputs, docs noise, and backup folders
- Build optimization
- Bundle-size work
- Refactoring for style or architecture
- Deleting code in this audit phase
- Rewriting features while investigating them

---

## Regression Guardrails

- Do not delete or move any production file during this audit phase.
- Do not modify app routes, middleware, auth, integrations, database code, or feature wiring.
- Do not rely on a clean git worktree because the repo is already dirty; this phase must tolerate that.
- Do not classify any `app/**/page.tsx`, `app/**/route.ts`, `app/**/layout.tsx`, `app/**/loading.tsx`, `app/**/error.tsx`, `app/**/template.tsx`, or `app/**/not-found.tsx` file as dead based only on imports.
- Do not mark external entrypoints as dead until webhook, OAuth callback, cron, scheduler, and externally documented URLs are reviewed.

---

## Plan and Order of Execution

### Phase 1: Production Orphan Audit

Inventory production-surface files in `components`, `lib`, and `hooks`, then find files with no inbound references from `app`, `components`, `lib`, `hooks`, `scripts`, and `tests`.

Why first:

- This is the highest-confidence signal.
- It directly addresses the developer's concern about severed code.
- It does not depend on runtime observation to become useful.

### Phase 2: Route Discoverability Audit

Inventory all user-facing routes from `app/**/page.tsx` and compare them against current navigation, `href` usage, `router.push`, `Link`, redirect logic, and documented flows.

Why second:

- The developer explicitly suspects that real features may exist but be inaccessible.
- Hidden routes are not dead code and must be separated from prune candidates.

### Phase 3: External Entrypoint Audit

Review `app/**/route.ts` endpoints, especially auth, webhook, scheduled, sync, and integration routes, for external consumers and non-import-based activation paths.

Why third:

- API routes have the highest false-positive risk in a static import audit.
- This phase prevents accidental classification of externally used backend code as dead.

### Phase 4: Duplicate and Overlap Audit

Review clusters where two or more files solve the same problem and one appears unused, such as duplicated hooks, old/new action implementations, or parallel component versions.

Why fourth:

- Overlap is easier to judge after basic reachability and route status are already known.
- This phase reduces bloat without requiring broad speculative rewrites.

### Phase 5: Decision Register

Write the final ledger of `keep`, `recover`, `test-only`, `tool-only`, `duplicate`, `uncertain`, and `prune-candidate`.

Why last:

- Classification should happen only after evidence is complete.
- This prevents a noisy first-pass orphan list from becoming a fake cleanup plan.

---

## Files to Create

| File                                          | Purpose                                                                                         |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `docs/reports/code-reachability-audit.md`     | Production orphan inventory with evidence, exclusions, and confidence levels                    |
| `docs/reports/route-discoverability-audit.md` | Inventory of `page.tsx` routes, how they are reached today, and hidden-route findings           |
| `docs/reports/prune-candidate-register.md`    | Final keep/recover/delete/uncertain ledger with explicit proof requirements per file or cluster |

---

## Files to Modify

| File                                                      | What to Change                                           |
| --------------------------------------------------------- | -------------------------------------------------------- |
| `docs/specs/p1-code-reachability-and-safe-prune-audit.md` | Update status and timeline as the audit phase progresses |

No product code should be modified in the initial implementation of this spec.

---

## Database Changes

None.

---

## Data Model

This is a report-driven audit, not a database feature. The audit should still use a consistent logical model:

- **Code Unit:** one file under `components`, `lib`, `hooks`, or a route file under `app`
- **Entrypoint Type:** `framework-entry`, `user-route`, `api-route`, `component`, `library`, `hook`
- **Reference Evidence:** the exact caller, route, config, test, script, or external pattern that proves usage
- **Candidate State:** `keep`, `recover`, `duplicate`, `test-only`, `tool-only`, `uncertain`, `prune-candidate`
- **Confidence:** `high`, `medium`, `low`
- **Reason:** one short explanation that says why the classification was chosen

The decision register must store decisions at the file or cluster level, not as vague summaries.

---

## Server Actions

None. This spec is audit-and-report only.

---

## UI / Component Spec

No product UI should be added or changed. The outputs are markdown reports only.

### Report Layout

`docs/reports/code-reachability-audit.md` must include:

- audit boundary
- exclusion rules
- top orphan clusters by directory
- evidence table
- seed findings
- unresolved ambiguities

`docs/reports/route-discoverability-audit.md` must include:

- every user-facing route
- how the route is currently reached
- whether the route is linked in nav, linked in-page, redirect-only, token-only, or effectively hidden
- hidden but valid feature candidates

`docs/reports/prune-candidate-register.md` must include one row per file or cluster with:

- path
- category
- current classification
- proof
- risk
- next action

### 2026-05-01 Refresh

The audit was refreshed in:

- `docs/reports/code-reachability-audit.md`
- `docs/reports/route-discoverability-audit.md`
- `docs/reports/prune-candidate-register.md`

Important correction: the old seed finding that `lib/events/fsm.ts` is test-only is stale. Current proof shows production imports from the event transition route, `lib/events/transitions.ts`, and `lib/events/readiness.ts`, plus unit coverage.

### States

- **Complete evidence:** classification can enter the decision register.
- **Partial evidence:** classification must remain `uncertain`.
- **Conflicting evidence:** classification must stay out of `prune-candidate`.

### Interactions

The builder reads the repo, runs searches, writes the reports, and stops. No code deletion, no rewiring, no silent cleanup.

---

## Evidence Rules

A file may become a `prune-candidate` only if all of the following are true:

- it is not a Next framework entrypoint
- it has no inbound references across `app`, `components`, `lib`, `hooks`, `scripts`, and `tests`
- it has no dynamic-import, registry, config-map, or string-based activation evidence
- it is not an external entrypoint such as webhook, OAuth callback, cron, scheduled route, or public token route
- it is not retained solely as the only readable implementation of a live feature that is currently hidden

A file must be classified as `recover` instead of `prune-candidate` if:

- the feature exists as a route or component surface but appears unreachable from normal user flows
- the code is real product code but discoverability is missing
- the developer would likely want the feature exposed rather than deleted

A file must be classified as `duplicate` if:

- another current implementation covers the same responsibility
- one version appears canonical and the other appears severed
- safe deletion still requires a follow-on cleanup spec

---

## Edge Cases and Error Handling

| Scenario                                          | Correct Behavior                                           |
| ------------------------------------------------- | ---------------------------------------------------------- |
| `app/**/page.tsx` has no imports pointing to it   | Treat it as a framework entrypoint, not dead code          |
| API route has no internal callers                 | Treat as externally callable until proven otherwise        |
| File is referenced only by tests                  | Classify as `test-only`, not `prune-candidate`             |
| File is referenced only by scripts                | Classify as `tool-only`, not production dead code          |
| Duplicate implementations exist                   | Classify as `duplicate`; do not pick a winner casually     |
| String-based route or registry usage is suspected | Classify as `uncertain` until searched explicitly          |
| Dynamic import exists                             | Do not mark dead from static imports alone                 |
| Dirty worktree obscures provenance                | Keep audit docs-only; do not attempt opportunistic cleanup |
| Generated or mirrored type files appear unused    | Ignore unless they are hand-maintained production logic    |

---

## Verification Steps

1. Read `docs/build-state.md`, `docs/session-log.md`, and this spec.
2. Confirm the production boundary from `tsconfig.ci.json`.
3. Inventory production files under `app`, `components`, `lib`, and `hooks`.
4. Exclude Next framework entrypoint conventions from ordinary dead-code classification.
5. Search for inbound references for candidate files across `app`, `components`, `lib`, `hooks`, `scripts`, and `tests`.
6. Build a route inventory from `app/**/page.tsx` and compare it against `Link`, `href`, `router.push`, redirect, and token-flow usage.
7. Review `app/**/route.ts` files for external-entrypoint patterns before classifying anything as dead.
8. Identify duplicate clusters and classify them separately from ordinary orphans.
9. Write `docs/reports/code-reachability-audit.md`.
10. Write `docs/reports/route-discoverability-audit.md`.
11. Write `docs/reports/prune-candidate-register.md`.
12. Stop. Do not delete files. Do not move files. Do not refactor app code.

---

## Seed Findings to Reproduce

These findings are starting points, not final truth. A builder must reproduce them before relying on them.

- `hooks/use-field-validation.ts` appears unused while `lib/validation/use-field-validation.ts` appears to be a richer parallel implementation.
- `components/ai/remy-public-widget.tsx` appears production-surface orphaned.
- `components/admin/admin-sidebar.tsx` appears production-surface orphaned.
- `components/activity/client-activity-timeline.tsx` appears production-surface orphaned.
- `lib/ai/menu-suggestions.ts` appears production-surface orphaned.
- `lib/events/fsm.ts` appears test-only rather than production-reachable.

These are valuable because they represent different classes of risk: duplicate, component orphan, backend orphan, and test-only.

---

## Builder Stop Conditions

Stop and report instead of improvising if:

- the route audit shows a large hidden-feature surface that should be recovered before any pruning discussion
- external-entrypoint review reveals that the repo relies heavily on non-import wiring
- duplicate clusters cannot be safely classified without product decisions
- the audit starts expanding into broad refactoring or product redesign

This spec is successful only if it narrows decisions. It fails if it turns into open-ended repo archaeology.
