# Spec: ChefFlow Command Plane

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)

## Timeline

| Event                 | Date                | Agent/Session         | Commit |
| --------------------- | ------------------- | --------------------- | ------ |
| Created               | 2026-04-30 11:40 ET | Codex planner session |        |
| Status: ready         | 2026-04-30 11:40 ET | Codex planner session |        |
| Claimed (in-progress) |                     |                       |        |
| Spike completed       |                     |                       |        |
| Pre-flight passed     |                     |                       |        |
| Build completed       |                     |                       |        |
| Type check passed     |                     |                       |        |
| Build check passed    |                     |                       |        |
| Playwright verified   |                     |                       |        |
| Status: verified      |                     |                       |        |

---

## Developer Notes

### Raw Signal

The developer asked what one thing a top-tier technology executive would say ChefFlow needs if they were looking at the app. The desired outcome was not another isolated feature. The developer wanted the one move that would tie everything together, create ultimate cohesiveness, make the app feel professionally overhauled, and let it compete with polished products from large, well-funded organizations.

After being told ChefFlow already has pieces of this, the developer asked whether it exists today, then asked why it is underperforming if it exists. The key product signal is that the developer does not naturally use or feel the current command surfaces. That means the current implementation has failed as a product habit even though several code pieces exist.

### Developer Intent

- **Core goal:** Turn ChefFlow from a set of powerful modules into one unified operating system that always tells the chef what matters, what changed, what is blocked, what is risky, what is proven, and what to do next.
- **Key constraints:** Do not create another dashboard, another Remy hub, another command palette, or another disconnected action list. Attach to existing dashboard, action-layer, event spine, context panel, queue, and Remy command infrastructure.
- **Motivation:** ChefFlow has enough feature depth, but it still feels less cohesive than it should because intelligence and next actions are split across many surfaces.
- **Success from the developer's perspective:** A user opens ChefFlow and immediately feels the app has a central brain. Every major page feels governed by the same operating state instead of showing page-local cards that compete for attention.

---

## Continuity Preflight

| Question                            | Answer                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Continuity decision                 | attach                                                                                                                                                                                                                                                                                                                                                                              |
| Canonical owner                     | New spec owner: `docs/specs/chefflow-command-plane.md`, implemented by extending `lib/interface/action-layer.ts`, dashboard command surfaces, event operating spine, and platform context panels.                                                                                                                                                                                   |
| Existing related routes             | `/dashboard`, `/events/[id]`, `/clients/[id]`, `/activity`, Remy command flows.                                                                                                                                                                                                                                                                                                     |
| Existing related modules/components | `lib/interface/action-layer.ts`, `app/(chef)/dashboard/page.tsx`, `components/dashboard/action-surface-card.tsx`, `lib/events/operating-spine.ts`, `components/events/event-operating-spine-card.tsx`, `components/platform-shell/context-command-panel.tsx`, `lib/queue/actions.ts`, `lib/workflow/actions.ts`, `lib/decision-queue/actions.ts`, `lib/ai/command-orchestrator.ts`. |
| Recent overlapping commits          | Recent commits include professional readiness, pricing gates, founder authority, and autonomous V1 builder work, but no commit introduces a canonical user-facing command plane.                                                                                                                                                                                                    |
| Dirty or claimed overlapping files  | The continuity scan found no dirty file matches. It found active claims around duplicate prevention and context continuity, but those are agent tooling, not the ChefFlow user command plane.                                                                                                                                                                                       |
| Duplicate or orphan risk            | High if implemented as a new dashboard or Remy-only feature. Mitigation: make `lib/command-plane/*` a pure aggregation contract consumed by existing surfaces.                                                                                                                                                                                                                      |
| Why this is not a duplicate         | Existing pieces answer local questions. This spec defines one app-wide contract that those pieces read from.                                                                                                                                                                                                                                                                        |
| What must not be rebuilt            | Do not rebuild Remy, the command palette, the dashboard, the event detail shell, the client detail shell, or the existing priority queue.                                                                                                                                                                                                                                           |

Continuity scan evidence: `system/agent-reports/context-continuity/20260430T153916Z-chefflow-command-plane-unified-app-wide-operating-state-next-action-blocked-risk.json`.

The scanner currently matches `remy-ai`, `client-intake`, and `finance` because there is no canonical command-plane surface yet. This spec creates that canonical owner so future work does not get incorrectly attached to Remy alone.

---

## Current State Summary

ChefFlow already has several strong command-plane fragments:

- The dashboard imports the command center section, secondary insights, and return-to-work strip at `app/(chef)/dashboard/page.tsx:15`, `app/(chef)/dashboard/page.tsx:80`, and `app/(chef)/dashboard/page.tsx:126`.
- Dashboard data loading has `safe()` and `safeResult()` wrappers plus degraded notices, so it already has an honest partial-data pattern at `app/(chef)/dashboard/page.tsx:130`, `app/(chef)/dashboard/page.tsx:151`, and `app/(chef)/dashboard/page.tsx:169`.
- Dashboard renders `ReturnToWorkStrip`, `ResolveNextSection`, lifecycle actions, relationship actions, and the secondary command center at `app/(chef)/dashboard/page.tsx:1960`, `app/(chef)/dashboard/page.tsx:2014`, `app/(chef)/dashboard/page.tsx:2026`, `app/(chef)/dashboard/page.tsx:2034`, and `app/(chef)/dashboard/page.tsx:2272`.
- The secondary dashboard area defaults collapsed and is labeled "Business Health, Pricing, and Intelligence", which hides the command-center feeling at `components/dashboard/dashboard-secondary-insights.tsx:15`, `components/dashboard/dashboard-secondary-insights.tsx:17`, and `components/dashboard/dashboard-secondary-insights.tsx:65`.
- The dashboard command center is currently a feature directory over core areas, not an operating-state layer, at `components/dashboard/command-center.tsx:53`, `components/dashboard/command-center.tsx:195`, and `components/dashboard/command-center.tsx:200`.
- `lib/interface/action-layer.ts` already defines the shared `SurfaceActionTask` shape and many resolver functions at `lib/interface/action-layer.ts:19`, `lib/interface/action-layer.ts:414`, `lib/interface/action-layer.ts:671`, `lib/interface/action-layer.ts:707`, `lib/interface/action-layer.ts:1835`, `lib/interface/action-layer.ts:1994`, `lib/interface/action-layer.ts:2084`, and `lib/interface/action-layer.ts:2219`.
- Event detail already has an operating spine contract with `nextAction`, chef progress, and client progress at `lib/events/operating-spine.ts:22`, `lib/events/operating-spine.ts:178`, and `lib/events/operating-spine.ts:425`.
- The event spine card renders the next action, reason, owner, and CTA at `components/events/event-operating-spine-card.tsx:87`, `components/events/event-operating-spine-card.tsx:104`, `components/events/event-operating-spine-card.tsx:105`, `components/events/event-operating-spine-card.tsx:106`, and `components/events/event-operating-spine-card.tsx:108`.
- The shared platform command panel already supports status chips, section state, responsive drawer behavior, and session-only open state at `components/platform-shell/context-panel-types.ts:8`, `components/platform-shell/context-panel-types.ts:25`, `components/platform-shell/context-panel-types.ts:27`, `components/platform-shell/context-command-panel.tsx:11`, `components/platform-shell/context-command-panel.tsx:25`, and `components/platform-shell/context-command-panel.tsx:35`.
- The priority queue already exposes sorted items, a single `nextAction`, and summary metadata at `lib/queue/types.ts:152`, `lib/queue/types.ts:157`, and `lib/queue/types.ts:160`.
- The workflow surface already categorizes blocked, preparable, optional, and fragile work at `lib/workflow/types.ts:181`, `lib/workflow/types.ts:182`, `lib/workflow/types.ts:183`, `lib/workflow/types.ts:184`, and `lib/workflow/types.ts:185`.
- Return-to-work already summarizes recent sessions, activity count, resume items, and notifications at `components/dashboard/return-to-work-strip.tsx:25`, `components/dashboard/return-to-work-strip.tsx:27`, `components/dashboard/return-to-work-strip.tsx:28`, and `components/dashboard/return-to-work-strip.tsx:110`.
- Client next-best-action already ranks real client actions by urgency and returns a shared list at `lib/clients/next-best-action.ts:97`, `lib/clients/next-best-action.ts:342`, and `lib/clients/next-best-action.ts:466`.
- Remy already has a command orchestrator with privacy constraints, approval policy, common instant patterns, and a main `runCommand()` entry point at `lib/ai/command-orchestrator.ts:4`, `lib/ai/command-orchestrator.ts:84`, `lib/ai/command-orchestrator.ts:1802`, and `lib/ai/command-orchestrator.ts:1873`.

The product gap is not absence of intelligence. The gap is that these pieces are not one canonical operating contract with consistent placement, language, and priority rules.

---

## What This Does (Plain English)

This builds one canonical ChefFlow Command Plane: a deterministic operating-state contract that pulls together next action, blocked work, risk, proof, recent changes, and page-specific context. Dashboard, event detail, client detail, finance, menus, activity, and Remy all read from the same contract so the app feels governed by one brain instead of many separate cards.

---

## Why It Matters

ChefFlow already has depth. The professional gap is cohesion, hierarchy, and trust. A command plane makes the existing system feel overhauled without inventing new business workflows.

---

## Files to Create

| File                                                  | Purpose                                                                                                                                               |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/command-plane/types.ts`                          | Canonical type contract for app-wide and entity-level operating state.                                                                                |
| `lib/command-plane/score.ts`                          | Pure priority scoring and tie-break rules across domains.                                                                                             |
| `lib/command-plane/sources.ts`                        | Source adapters that normalize queue, workflow, event spine, client next-best-action, continuity, finance, and menu readiness into one candidate set. |
| `lib/command-plane/get-command-plane.ts`              | Server aggregation entry point. Authenticated, tenant-scoped, read-only.                                                                              |
| `components/command-plane/command-plane-card.tsx`     | Main persistent UI card for dashboard and high-priority page placement.                                                                               |
| `components/command-plane/command-plane-panel.tsx`    | Section renderer used inside `ContextCommandPanel`.                                                                                                   |
| `components/command-plane/command-plane-mini-bar.tsx` | Compact page-level strip for surfaces where the full card would be too heavy.                                                                         |
| `tests/unit/command-plane-score.test.ts`              | Pure scoring tests for priority ordering and no fake clear states.                                                                                    |
| `tests/unit/command-plane-contract.test.ts`           | Contract tests for required fields, evidence, source labels, and error states.                                                                        |
| `tests/system-integrity/command-plane.spec.ts`        | Playwright coverage for dashboard, event detail, client detail, and Remy query path.                                                                  |

---

## Files to Modify

| File                                                    | What to Change                                                                                                                                                           |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `system/canonical-surfaces.json`                        | Add `chef-command-plane` canonical surface so future work attaches here instead of Remy-only or dashboard-only.                                                          |
| `app/(chef)/dashboard/page.tsx`                         | Replace scattered above-fold command cards with one `CommandPlaneCard` backed by the canonical command plane. Keep existing widgets below it as supporting detail.       |
| `components/dashboard/action-surface-card.tsx`          | Reuse or adapt styling for command-plane primary action. Do not fork a second visual language.                                                                           |
| `components/dashboard/dashboard-secondary-insights.tsx` | Stop hiding command-plane-critical surfaces in the collapsed secondary area. Secondary insights can remain, but the command plane must live above the fold.              |
| `components/dashboard/command-center.tsx`               | Rename or reposition as "Core Areas" feature directory. It must not be the main command plane.                                                                           |
| `lib/interface/action-layer.ts`                         | Keep existing resolvers, but expose them through command-plane source adapters. Do not duplicate resolver logic.                                                         |
| `lib/events/operating-spine.ts`                         | Add a mapper from `EventOperatingSpine` to command-plane entity state. Keep the existing event spine contract intact.                                                    |
| `components/events/event-operating-spine-card.tsx`      | Render the command-plane entity section or mini bar alongside the existing event spine without duplicating next-action language.                                         |
| `components/platform-shell/context-command-panel.tsx`   | Support an optional command-plane section for entity pages using existing section/state types.                                                                           |
| `components/platform-shell/context-panel-types.ts`      | Add optional evidence, source count, and action severity fields only if needed by the command-plane panel.                                                               |
| `app/(chef)/events/[id]/page.tsx`                       | Feed event-level command-plane state into the event context panel.                                                                                                       |
| `app/(chef)/clients/[id]/page.tsx`                      | Feed client-level command-plane state into the client context panel.                                                                                                     |
| `lib/ai/command-task-descriptions.ts`                   | Add a read-only Remy task for "what should I do next" against the command plane if the current task catalog does not already provide an equivalent command-plane answer. |
| `lib/ai/command-intent-parser.ts`                       | Route "what should I do next", "what is blocked", and "what needs attention" to the command-plane read task.                                                             |
| `lib/ai/command-orchestrator.ts`                        | Execute the read-only command-plane task. It must not mutate data or bypass approval policy.                                                                             |
| `docs/app-complete-audit.md`                            | Update dashboard, event, client, platform shell, and Remy sections after implementation.                                                                                 |
| `project-map/chef-os/dashboard.md`                      | Update if this file exists. Otherwise update the closest chef OS project-map file.                                                                                       |

---

## Database Changes

None.

The first version must be read-only and additive at the application layer. It should compute from existing data sources. No tables, migrations, generated database type edits, or `drizzle-kit push`.

---

## Data Model

The command plane is a computed contract, not stored state.

```ts
type CommandPlane = {
  generatedAt: string
  scope: CommandPlaneScope
  primary: CommandPlaneAction | null
  blocked: CommandPlaneBlocker[]
  risks: CommandPlaneRisk[]
  proof: CommandPlaneEvidence[]
  changes: CommandPlaneChange[]
  sections: CommandPlaneSection[]
  health: CommandPlaneHealth
}
```

Required rules:

- `primary` is the single most important action. If data sources fail, do not say "all clear".
- `blocked` lists real blockers only. Do not include generic advice.
- `risks` must include severity, domain, evidence, and destination.
- `proof` must cite source module, source label, entity id when safe, timestamp if available, and freshness.
- `changes` come from existing activity and continuity sources.
- `health` must distinguish `ok`, `partial`, `degraded`, and `unavailable`.

Candidate source kinds:

```ts
type CommandPlaneSourceKind =
  | 'priority_queue'
  | 'decision_queue'
  | 'work_surface'
  | 'event_spine'
  | 'client_next_best_action'
  | 'return_to_work'
  | 'finance'
  | 'menu'
  | 'inventory'
  | 'remy_alert'
```

---

## Server Actions

Use a normal server module unless a server action export is needed. If using a `'use server'` file, only async functions may be exported.

| Action                          | Auth            | Input                                                                                        | Output                   | Side Effects                 |
| ------------------------------- | --------------- | -------------------------------------------------------------------------------------------- | ------------------------ | ---------------------------- | -------------------------------------------------- | ---------------- |
| `getCommandPlane(input)`        | `requireChef()` | `{ scope: 'dashboard' }` or `{ scope: 'event', eventId }` or `{ scope: 'client', clientId }` | `CommandPlaneLoadResult` | None. Read-only.             |
| `getCommandPlaneForRemy(input)` | `requireChef()` | `{ question: 'next'                                                                          | 'blocked'                | 'risk', entityId?: string }` | Compact command-plane summary for Remy task result | None. Read-only. |

`CommandPlaneLoadResult` must be:

```ts
type CommandPlaneLoadResult =
  | { status: 'ok'; data: CommandPlane }
  | { status: 'partial'; data: CommandPlane; warnings: string[] }
  | { status: 'unavailable'; error: string }
```

Every source adapter must catch its own failure, return an unavailable source result, and let the aggregate show a partial state. A failed source cannot become zero items.

---

## UI / Component Spec

### Page Layout

Dashboard:

1. Greeting remains.
2. `CommandPlaneCard` becomes the first substantive surface after the header.
3. The card shows:
   - top status line: `Operating state`, timestamp, health chip
   - primary action with one CTA
   - blocked count
   - risk count
   - proof count
   - recent change summary
4. Existing `DecisionQueue`, lifecycle actions, relationship actions, and return-to-work content move into source-backed sections below the primary card or into the command-plane detail panel.
5. `Core Areas` remains available as navigation, but no longer pretends to be the command center.

Event detail:

1. Keep `EventOperatingSpineCard`.
2. Add command-plane context inside the existing event command panel.
3. If the event spine and command plane choose different primary actions, the command plane must show why the app-wide action outranks the event-local action.

Client detail:

1. Keep existing client command panel.
2. Add command-plane sections for relationship next action, unpaid balance risk, upcoming event readiness, recent client changes, and proof.

Remy:

1. "What should I do next?" returns the command-plane primary action.
2. "What is blocked?" returns the command-plane blockers.
3. "What needs attention?" returns risks and primary action.
4. Remy must label this as computed from ChefFlow data, not generated advice.

### States

- **Loading:** Skeleton card with fixed height. Do not shift the dashboard layout.
- **Empty:** Only valid when all sources succeed and no action, blocker, risk, or change exists. Copy: "No urgent operating work is waiting."
- **Partial:** Show primary action if available, plus a warning chip listing unavailable source labels.
- **Error:** Show "Command Plane unavailable" with source labels. Do not show "all clear".
- **Populated:** Show one primary action, blockers, risks, proof, and recent changes from real sources.

### Interactions

- Primary CTA navigates to the source route. No empty `onClick`.
- Detail expand shows all source candidates and why the winner won.
- Source chips link to source routes when safe.
- Remy responses include destination links but do not execute mutations.
- No optimistic update is needed in V1 because this slice is read-only.

---

## Edge Cases and Error Handling

| Scenario                                     | Correct Behavior                                                                                                       |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Priority queue fails                         | Command plane becomes `partial`; do not show "all clear".                                                              |
| Work surface fails                           | Keep other actions, but show "planning work unavailable".                                                              |
| Event spine primary differs from app primary | Show both with explanation and one app-level priority winner.                                                          |
| Client has no events                         | Relationship and setup actions can still appear; event readiness section is empty with a clear label.                  |
| New chef has no data                         | Show activation/setup action from onboarding or profile state if present. Otherwise show a true empty operating state. |
| Remy offline                                 | UI command plane still works. Remy command task reports AI unavailable only for Remy, not for the command plane.       |
| Source returns stale timestamp               | Lower freshness and show stale proof. Do not hide the source.                                                          |
| Source includes sensitive client details     | Server strips unsafe details before returning to public or cross-role surfaces. V1 command plane is chef-only.         |

---

## Verification Steps

1. Run unit tests for `command-plane-score` and `command-plane-contract`.
2. Run typecheck: `npx tsc --noEmit --skipLibCheck`.
3. Start or use an approved existing development server only with developer permission.
4. Sign in with the agent account.
5. Navigate to `/dashboard`.
6. Verify the command plane is above the fold and shows one primary action or an honest unavailable state.
7. Navigate to an active `/events/[id]`.
8. Verify event command plane section appears and does not duplicate contradictory next-action language.
9. Navigate to `/clients/[id]`.
10. Verify client command plane section appears with relationship, payment, event, or honest empty state.
11. Ask Remy: "What should I do next?"
12. Verify Remy returns the command-plane primary action with source wording and does not invent a task.
13. Simulate one source adapter failure in unit tests and verify the aggregate returns `partial`, not empty success.
14. Screenshot dashboard, event detail, client detail, and Remy response.

---

## Out of Scope

- No new database tables.
- No migrations.
- No command palette redesign.
- No new dashboard route.
- No new Remy hub.
- No public or client-facing command plane in V1.
- No autonomous mutations.
- No AI-generated recipes or culinary suggestions.
- No financial balance storage. Ledger and existing financial summaries remain the source of truth.
- No replacement of existing event spine, priority queue, decision queue, or client next-best-action systems.

---

## Notes for Builder Agent

Implementation order:

1. Add `lib/command-plane/types.ts` and pure scoring tests.
2. Add source adapter shapes and map the existing priority queue, work surface, event spine, return-to-work, and client next-best-action into candidates.
3. Build the dashboard command-plane aggregation first.
4. Render `CommandPlaneCard` on dashboard above the fold.
5. Add event entity mapper and panel section.
6. Add client entity mapper and panel section.
7. Add Remy read-only task wiring.
8. Update docs and project map.
9. Run unit tests, typecheck, and UI verification.

Design constraints:

- Use existing `ActionSurfaceCard` visual language unless it clearly cannot express blockers, risk, proof, and changes.
- Keep cards compact. This is an operating surface, not a marketing hero.
- Use icons from the existing icon system.
- Every number shown must come from a source adapter.
- Every "clear" state must prove all required sources loaded.
- The command plane should be fast enough for dashboard render. Slow sources must be deferred or cached, never block the entire page.

---

## Spec Validation

1. **What exists today that this touches?** Dashboard command and degraded data patterns exist in `app/(chef)/dashboard/page.tsx:130`, `app/(chef)/dashboard/page.tsx:151`, `app/(chef)/dashboard/page.tsx:169`, `app/(chef)/dashboard/page.tsx:1960`, `app/(chef)/dashboard/page.tsx:2014`, `app/(chef)/dashboard/page.tsx:2026`, `app/(chef)/dashboard/page.tsx:2034`, and `app/(chef)/dashboard/page.tsx:2272`. Event spine exists in `lib/events/operating-spine.ts:22` and `components/events/event-operating-spine-card.tsx:87`. Context panels exist in `components/platform-shell/context-command-panel.tsx:11`.
2. **What exactly changes?** Add a read-only `lib/command-plane/*` aggregation contract, new command-plane UI components, dashboard placement, entity panel integration, Remy read task, tests, docs, and canonical surface registry entry.
3. **What assumptions are being made?** Verified: dashboard has multiple command fragments, event spine exists, context panels exist, queue and workflow contracts exist. Unverified: exact client detail layout space on every viewport, to be resolved during builder spike.
4. **Where will this most likely break?** Priority conflicts across sources, partial-source handling that accidentally looks clear, and dashboard visual hierarchy competing with existing cards.
5. **What is underspecified?** Final pixel-level design is intentionally left to builder within the existing design system. Data contract and behavior are specified.
6. **What dependencies or prerequisites exist?** None beyond existing app data sources. No DB changes.
7. **What existing logic could this conflict with?** Dashboard secondary insights, event operating spine, Remy command routing, and action-layer resolvers.
8. **What existing work could this duplicate or fragment?** It could duplicate Remy, command palette, dashboard, or event spine if implemented incorrectly. The spec requires adapters and reuse instead.
9. **What is the end-to-end data flow?** Page requests command plane -> `requireChef()` gates access -> source adapters read existing tenant-scoped modules -> scoring picks one primary action -> UI renders action, blockers, risks, proof, changes -> CTA navigates to existing route. Remy request -> command parser maps question to read task -> orchestrator calls command plane -> response summarizes source-backed result.
10. **What is the correct implementation order?** Types and scoring first, adapters second, dashboard third, event and client panels fourth, Remy last, then tests and docs.
11. **What are the exact success criteria?** User sees one primary operating action above the fold, no fake clear state on partial failure, event and client pages show same contract, Remy answers "what should I do next" from command-plane data, and tests cover scoring plus partial failure.
12. **What are the non-negotiable constraints?** Chef auth, tenant scoping, no fake data, no mutations, no AI recipe generation, no financial stored balances, no public exposure.
13. **What should not be touched?** `types/database.ts`, migrations, ledger append/compute, event transition FSM, existing public routes, command palette redesign.
14. **Is this the simplest complete version?** Yes. It is computed, read-only, and reuses existing sources instead of adding storage or new workflows.
15. **If implemented exactly as written, what would still be wrong?** The first version will improve cohesion but will not eliminate all duplicate page-level language. A follow-up polish pass may be needed after screenshots reveal where old cards should be retired.

## Final Check

This spec is production-ready for a builder spike and implementation. The only uncertainty is final responsive layout detail on client and event pages, which is acceptable because the spec pins the contract, data flow, source ownership, and failure behavior.
