# Spec: Chef Operating Loop And External Memory

> **Status:** draft
> **Priority:** P1
> **Depends on:** `docs/specs/contextual-wiring-mise-en-place.md`, `docs/superpowers/specs/2026-05-04-the-current-unified-feed-design.md`, `docs/superpowers/specs/2026-05-14-universal-rail-chef-catalog.md`
> **Estimated complexity:** large (9+ files)

## Timeline

| Event   | Date             | Agent/Session           | Commit |
| ------- | ---------------- | ----------------------- | ------ |
| Created | 2026-05-15 12:49 | Codex research-to-build |        |

---

## Developer Notes

### Raw Signal

The research describes the body, memory, relationships, and an organized life as coordinated systems. The key product language is that life works through loops, handoffs, signals, support networks, records, and automatic background systems. A highly organized person is not relying on memory. They have built an external operating system where the calendar remembers time, tasks remember obligations, notes remember context, contacts remember people, routines remember maintenance, and every active or waiting thing has a visible place.

Important phrases to preserve:

- "Support is the human version of infrastructure."
- "Know what happened, what matters, what changed, what is uncertain, and what needs attention."
- "The highest form is: I know what I know, I know why I believe it, I know what I don't know, and I have a system that keeps updating the truth without requiring constant manual attention."
- "Everything important must have a place. Everything active must have a next action. Everything waiting must have a follow-up. Everything finished must be archived."
- "The most organized human is not the person doing the most. It is the person with the least unnecessary friction between intention and action."

### Developer Intent

- **Core goal:** Make ChefFlow behave like an external memory and operating loop for a chef's business, reducing the gap between intention and action.
- **Key constraints:** Do not create another disconnected dashboard. Reuse Current, CIL, action center, client profile, and rail infrastructure where possible. Label uncertainty instead of presenting weak inference as fact.
- **Motivation:** ChefFlow already has many capable surfaces, but the product needs stronger continuity: capture, clarify, act, save progress, review, and resume.
- **Success from the developer's perspective:** A chef can open ChefFlow and immediately know what is active, what is waiting, what changed, what is uncertain, what needs proof, and what the next useful handoff is.

---

## What This Does (Plain English)

ChefFlow gets a coherent operating loop across dashboard, clients, events, menus, recipes, and tasks. The system captures signals, labels their source and confidence, turns them into next actions or waiting states, preserves context for resuming work, and gives the chef a clear handoff after important actions.

---

## Why It Matters

The current product already has action feeds, CIL signals, client profiles, rail specs, and contextual wiring specs. This spec aligns those systems around one promise: reduce operational friction by making memory, waiting, proof, and next steps visible.

---

## Files to Create

| File                                                 | Purpose                                                                                          |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `lib/operating-loop/types.ts`                        | Shared vocabulary for loop state, evidence labels, waiting states, and resume context.           |
| `lib/operating-loop/source-map.ts`                   | Maps Current, CIL, action center, client profile, and rail sources into operating-loop concepts. |
| `components/operating-loop/operating-loop-badge.tsx` | Small UI badge for active, waiting, blocked, stale, done, inferred, and confirmed states.        |
| `components/operating-loop/resume-context-card.tsx`  | Shows last action, source, next action, waiting reason, and proof links.                         |
| `components/operating-loop/next-handoff-bar.tsx`     | Reusable next-step bar for create/complete/edit flows.                                           |

## Files to Modify

| File                                                    | What to Change                                                                                        |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `lib/current/types.ts`                                  | Add optional evidence/confidence/waiting metadata if not already sufficient.                          |
| `lib/current/collect.ts`                                | Preserve source context and uncertainty when collecting units.                                        |
| `lib/current/rank.ts`                                   | Consider explicit waiting, stale, blocked, and resume states in ranking.                              |
| `lib/action-center/types.ts`                            | Align status vocabulary with operating-loop states where possible.                                    |
| `lib/action-center/feed.ts`                             | Include waiting/follow-up context in normalized action items.                                         |
| `lib/cil/types.ts`                                      | Ensure proactive signals expose confidence, source, and evidence enough for UI labeling.              |
| `app/(chef)/dashboard/page.tsx`                         | Mount the first operating-loop surface or wire into existing dashboard sections.                      |
| `app/(chef)/dashboard/_sections/chef-operator-rail.tsx` | Display state and confidence labels where rail items are built from priority queue data.              |
| `app/(chef)/clients/[id]/page.tsx`                      | Add resume/context cards around client profile completion, communication, and next action areas.      |
| `app/(chef)/menus/[id]/page.tsx`                        | Mount next handoff after menu actions where the existing contextual-wiring spec calls for it.         |
| `app/(chef)/recipes/[id]/recipe-detail-client.tsx`      | Mount next handoff after recipe edits/capture where the existing contextual-wiring spec calls for it. |
| `docs/specs/contextual-wiring-mise-en-place.md`         | Cross-link this spec as the product doctrine behind next-step and wiring work.                        |

## Database Changes

None for the first slice. Start by deriving state from existing tasks, notifications, reminders, CIL signals, client profile fields, event/menu/recipe data, and activity logs.

Potential later migration, only if derived state proves insufficient:

- `operating_loop_events`: durable activity/resume trail per tenant.
- `operating_loop_dismissals`: durable dismissal/snooze/proof state if current source systems cannot preserve it.

## Data Model

Use these conceptual fields across adapters:

| Field           | Meaning                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| `loopState`     | `active`, `waiting`, `blocked`, `stale`, `done`, `dismissed`, `snoozed`, `uncertain`                  |
| `sourceKind`    | `task`, `notification`, `reminder`, `cil_signal`, `client_profile`, `rail`, `event`, `menu`, `recipe` |
| `evidenceLabel` | `confirmed`, `inferred`, `computed`, `user_entered`, `unknown`                                        |
| `confidence`    | 0-1 confidence score when source supports it.                                                         |
| `nextAction`    | The concrete next move, not a vague instruction.                                                      |
| `waitingOn`     | Person, system, time, decision, payment, reply, import, or vendor dependency.                         |
| `resumeContext` | Last saved action, timestamp, source route, and the next step needed to continue.                     |

## Server Actions

No new server actions for the first slice unless existing action APIs cannot support state changes.

| Action                         | Auth                                      | Input                          | Output        | Side Effects                               |
| ------------------------------ | ----------------------------------------- | ------------------------------ | ------------- | ------------------------------------------ |
| Existing `getCurrentFeed()`    | Existing auth in `lib/current/actions.ts` | None                           | Current feed  | Reads collected work units.                |
| Existing CIL signal actions    | `requireChef()`                           | Signal ID/action               | Success/error | Dismisses or acts on CIL signal.           |
| Existing action center routing | Existing caller auth                      | Notification/reminder/task IDs | Success/error | Creates linked task, clears related items. |

If new server actions are introduced, each chef-side action must call `requireChef()` before data access and every DB read/write must be tenant-scoped.

## UI / Component Spec

### Page Layout

The first visible surface should appear in the chef dashboard, using existing dashboard density rather than a marketing-style hero.

Recommended first module:

- Header: "Operating loop"
- Compact state counts: Active, Waiting, Blocked, Stale.
- Top 3 items needing action.
- Top 3 waiting items with follow-up dates.
- Top 3 resume cards for recently interrupted work.
- Each item shows source, confidence/evidence label, next action, and route.

### States

- **Loading:** use existing dashboard skeleton patterns.
- **Empty:** "No active operating-loop items" with a small quick-capture action, not fake zeros.
- **Error:** show an error state that preserves dashboard load and links to logs where available.
- **Populated:** show mixed source items with clear source and state labels.

### Interactions

- Clicking a next action navigates to the canonical surface or performs an existing quick action.
- Waiting items can be snoozed only if the source supports snooze or a durable persistence layer exists.
- Inferred items must expose why the system believes the item matters.
- Quick capture should create or route to an existing note/task capture flow before a new system is created.

---

## Build Candidates

### Candidate 1: Operating Loop Vocabulary And Adapters

- **Goal:** Create shared vocabulary and adapter mapping without changing UI behavior.
- **Scope:** `lib/operating-loop/*`, small type additions only where needed.
- **Acceptance criteria:**
  - Current units, CIL signals, and action-center items can be mapped to `loopState`, `sourceKind`, `evidenceLabel`, and `nextAction`.
  - No DB migration required.
  - Unit tests cover mapping for notification, reminder, task, CIL signal, and client profile completeness.
- **Verification:** focused tests for adapter mapping and TypeScript check.

### Candidate 2: Dashboard Operating Loop Panel

- **Goal:** Give chefs one compact panel showing active, waiting, blocked, stale, and resume-worthy items.
- **Scope:** dashboard section only, read-only except existing actions.
- **Acceptance criteria:**
  - Dashboard shows real derived items from Current/action center/CIL sources.
  - Every item shows source and state.
  - Inferred/computed items show an evidence label.
  - Empty state does not show fake counts.
- **Verification:** dashboard route loads, console clean, screenshot proof, tenant-scoped data only.

### Candidate 3: Next Handoff Bar

- **Goal:** After meaningful actions, show the next concrete handoff.
- **Scope:** reusable component plus 2-3 initial mounts from `contextual-wiring-mise-en-place.md`.
- **Acceptance criteria:**
  - After menu creation/detail work: suggest attach to event, save as template, generate shopping list where applicable.
  - After recipe creation/detail work: suggest add to menu, cost recipe, add dietary flags, add step photos.
  - Suggestions are contextual links, not static generic buttons.
- **Verification:** route checks for menu and recipe detail pages, screenshot proof, no auth regression.

### Candidate 4: Client External Memory Refinement

- **Goal:** Make client profiles feel like complete relationship memory, not just record storage.
- **Scope:** client detail and client list/profile completeness surfaces.
- **Acceptance criteria:**
  - Missing profile fields are grouped by consequence: contactability, culinary risk, service context, relationship depth.
  - Client detail shows resume context: last interaction, next action, waiting reason, profile gaps.
  - No private client data is exposed outside chef tenant scope.
- **Verification:** client detail route check, profile completeness unit coverage, tenant-scoped server action review.

---

## Edge Cases and Error Handling

| Scenario                          | Correct Behavior                                                                       |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| Source systems disagree           | Show source labels and prefer confirmed user-entered/task state over inferred signals. |
| Item has no next action           | Show it as context, not an action item.                                                |
| CIL unavailable                   | Dashboard still renders Current/action-center items.                                   |
| Client has sparse data            | Show profile gaps by consequence, not a shame-heavy completion score alone.            |
| User dismisses an inferred signal | Do not recreate it immediately unless the underlying source materially changes.        |
| Staff/shared surfaces involved    | Respect role-specific privacy rules from rail specs.                                   |

---

## Verification Steps

1. Run `pnpm typecheck` or the repo's current focused TypeScript command.
2. Run focused tests for `lib/current`, `lib/action-center`, and any new `lib/operating-loop` mapping.
3. Sign in as a chef.
4. Navigate to `/dashboard`.
5. Verify the operating-loop panel renders real items or a truthful empty state.
6. Verify source, state, confidence/evidence labels, and next actions are visible.
7. Navigate to `/clients/[id]`, `/menus/[id]`, and `/recipes/[id]` for mounted surfaces.
8. Check browser console and server logs.
9. Capture screenshot proof for each changed route.

---

## Out of Scope

- No broad redesign of dashboard navigation.
- No replacement of Current, CIL, action center, or rail systems.
- No new database tables in the first slice.
- No AI-generated life coaching copy.
- No claims of full transparency into a person or client.
- No cross-tenant or staff exposure of private notes, addresses, payment data, or household details.

---

## Notes for Builder Agent

- Start from existing systems:
  - `lib/current/types.ts`
  - `lib/current/collect.ts`
  - `lib/action-center/types.ts`
  - `lib/action-center/feed.ts`
  - `lib/cil/types.ts`
  - `lib/clients/completeness.ts`
  - `app/(chef)/dashboard/_sections/chef-operator-rail.tsx`
- Treat `docs/specs/contextual-wiring-mise-en-place.md` as the first execution companion spec. This spec supplies the product doctrine: active work needs a next action, waiting work needs a follow-up, finished work needs proof, and uncertain work needs a label.
- Follow auth invariants: chef routes require `requireChef()` or existing protected route coverage, admin surfaces require `requireAdmin()`, and all tenant data must be tenant-scoped.

## Queue-Ready Drafts

### Queue Draft 1: Operating Loop Vocabulary And Adapters

- **Raw request / source:** Research on human systems, memory, support infrastructure, and the organized human.
- **Goal:** Add a shared operating-loop vocabulary and source adapters so Current, action center, CIL, and client profile signals can be displayed consistently.
- **Scope:** `lib/operating-loop/*`, mapping tests, minimal type additions.
- **Acceptance criteria:** Adapters map at least tasks, reminders, notifications, CIL signals, and client profile completeness into shared state/evidence/next-action fields.
- **Risks:** Over-abstracting existing systems; changing Current behavior unintentionally.
- **Dependencies:** Existing `lib/current`, `lib/action-center`, `lib/cil`, `lib/clients/completeness`.
- **Verification:** focused unit tests and typecheck.
- **Proof required:** test output plus examples of mapped source objects.

### Queue Draft 2: Dashboard Operating Loop Panel

- **Raw request / source:** "Everything active must have a next action. Everything waiting must have a follow-up."
- **Goal:** Show a compact dashboard panel for active, waiting, blocked, stale, and resume-worthy work.
- **Scope:** Dashboard section and read-only derivation from existing sources.
- **Acceptance criteria:** Real source items render with state, source, evidence label, and route; empty state is truthful.
- **Risks:** Duplicate with existing rail/current feed if not deduped.
- **Dependencies:** Queue Draft 1.
- **Verification:** route check, console check, screenshot proof.
- **Proof required:** dashboard screenshot and verification log.

### Queue Draft 3: First Next Handoff Bar Mounts

- **Raw request / source:** Research loop: capture -> clarify -> act -> save progress -> review -> resume.
- **Goal:** Add contextual next-step handoffs after menu and recipe work.
- **Scope:** Reusable `NextHandoffBar` plus initial mounts on menu and recipe detail surfaces.
- **Acceptance criteria:** Menu and recipe pages show contextual, actionable next steps and no generic filler.
- **Risks:** Needs careful route/link selection to avoid dead actions.
- **Dependencies:** `docs/specs/contextual-wiring-mise-en-place.md`.
- **Verification:** menu and recipe route screenshots, link checks, console clean.
- **Proof required:** screenshots and route/action evidence.

### Queue Draft 4: Client External Memory Refinement

- **Raw request / source:** Research on complete contacts, support networks, memory, and relationship infrastructure.
- **Goal:** Make client detail/profile completeness surface consequences, last context, next action, and waiting state.
- **Scope:** client detail, profile completeness, client list badges if already supported by data.
- **Acceptance criteria:** Client surfaces show contactability, culinary risk, service context, and relationship depth gaps; no private data leaks.
- **Risks:** Client detail page is already dense; UI must stay scannable.
- **Dependencies:** Existing client profile/completeness modules.
- **Verification:** client route screenshots, tenant-scoping review, focused unit tests.
- **Proof required:** screenshot and auth/tenant-scope evidence.
