# ORCHESTRATION MISSION: Lifecycle UI Wiring + Quality Verification

## Context Load (Read These First)

- `CLAUDE.md` (auto-loaded)
- `docs/UNIFIED-BUILD-QUEUE.md` (queue contract, items LIFECYCLE #34-40)
- `docs/product-blueprint.md` (V1 scope)
- `docs/specs/universal-interface-philosophy.md` (UI mandates)

## Session Decisions (Do Not Re-Debate)

- Swarm 1+2 performance optimization DONE (loading skeletons, metadata, cache dedup, CSS cleanup, provider consolidation). All committed and pushed.
- Architecture deepening items (#1-5) are ALREADY COMPLETE. Dashboard is 114 lines with 44 section files. Client barrel is 58 lines. Action-layer.ts no longer exists. Update queue to DONE.
- Server action splitting (all 6 mega files) was done in prior sessions. Confirmed by agents.
- Client component splitting was done in prior sessions (all under 400 lines). Confirmed by line counts.
- All 5 "mega client components" from the optimization swarm are already under 400 lines. No splitting needed.

## Wave 1 (Parallel - Launch Immediately)

### Agent 1: Reschedule + Cancel UI Wiring

- **Model:** opus
- **Task:** Wire the reschedule and cancel server actions into the event detail page. Components exist but may not be mounted or may lack event detail page integration.
  1. Read `lib/events/reschedule-actions.ts`, `lib/events/reschedule-history-actions.ts`, `lib/events/cancel-actions.ts`, `lib/events/cancellation-actions.ts`
  2. Read existing UI: `components/events/reschedule-event-modal.tsx`, `components/events/cancel-event-modal.tsx`, `components/events/cancellation-dialog.tsx`, `components/events/cancellation-policy-display.tsx`
  3. Read the event detail page: `app/(chef)/events/[id]/page.tsx` and any `_sections/` or `_components/` siblings
  4. Wire: Add Reschedule and Cancel buttons to event detail header or action bar. Wire to existing modals. Ensure FSM state guards (only show when event is in valid state for reschedule/cancel). Show reschedule history if any exists.
  5. Wire cancellation fee display from `lib/events/fee-schedule-actions.ts` into the cancel modal so chef sees the fee before confirming.
- **Read first:** All files listed above.
- **Done when:** Reschedule and Cancel buttons appear on event detail. Clicking opens respective modal. Fee schedule shown in cancel modal. Reschedule history visible. FSM state guards enforced. `npx tsc --noEmit --skipLibCheck` passes.

### Agent 2: Contract Clause Builder UI

- **Model:** opus
- **Task:** Wire the contract clause system into the contract creation flow.
  1. Read `lib/contracts/clause-actions.ts`, `lib/contracts/default-clauses.ts`
  2. Read the contracts pages: `app/(chef)/contracts/new/page.tsx`, `app/(chef)/contracts/page.tsx`
  3. Find existing contract creation components (search `components/contracts/`)
  4. Build: A clause picker/editor that lets chefs select from default clauses, add custom clauses, reorder, and toggle clauses on/off when creating or editing a contract
  5. Wire countersign flow if not already wired (the server action exists)
- **Read first:** `lib/contracts/clause-actions.ts`, `lib/contracts/default-clauses.ts`, all contract page files
- **Done when:** Contract creation includes clause selection UI. Default clauses are pre-populated. Chef can add/remove/reorder clauses. Countersign flow is accessible. `npx tsc --noEmit --skipLibCheck` passes.

### Agent 3: Dietary Outreach + Beverage Discovery UI

- **Model:** opus
- **Task:** Wire dietary outreach and beverage discovery into event detail.
  1. Read `lib/events/dietary-conflict-actions.ts`, `lib/events/dietary-context-actions.ts`, `lib/events/client-dietary-reminder-actions.ts`, `lib/events/beverage-discovery-actions.ts`
  2. Read event detail page and its sections/components
  3. Build/wire:
     a. Dietary outreach section on event detail: shows per-guest allergy status, link to send outreach email, link to token-based public form for guests to submit dietary info
     b. Beverage discovery section on event detail: captures beverage expectations and service type for the event
  4. Both should fit naturally into the event detail tab structure or as cards in the overview
- **Read first:** All dietary and beverage action files, event detail page structure
- **Done when:** Event detail shows dietary outreach section with guest allergy status and outreach actions. Beverage discovery section captures beverage preferences. `npx tsc --noEmit --skipLibCheck` passes.

### Agent 4: Leftover Tracking + Departure UI

- **Model:** sonnet
- **Task:** Wire leftover tracking into event closeout flow.
  1. Read `lib/events/leftover-actions.ts`
  2. Read closeout page: `app/(chef)/events/[id]/close-out/page.tsx`
  3. Read existing closeout components
  4. Build/wire: A leftover tracking section in the closeout flow. Shows default leftover categories (8 items). Chef can mark what was left over, add labels (guest name, take-home instructions), and note disposal method.
  5. Departure checklist should already exist as a category on the closeout checklist. Verify it renders.
- **Read first:** `lib/events/leftover-actions.ts`, closeout page and components
- **Done when:** Closeout page includes leftover tracking section. Default items render. Chef can add/edit/label leftovers. `npx tsc --noEmit --skipLibCheck` passes.

### Agent 5: Build Queue Reconciliation

- **Model:** haiku
- **Task:** Update `docs/UNIFIED-BUILD-QUEUE.md` to reflect current reality. Several items are marked SPEC-READY but are already DONE:
  1. Read the full queue file
  2. Verify and update these ARCHITECTURE DEEPENING items to DONE:
     - #1 Client Barrel Interface Curation: `lib/clients/index.ts` is 58 lines (DONE)
     - #2 Action-Layer Domain Repatriation: `lib/interface/action-layer.ts` does not exist (DONE)
     - #3 Client Mutation Pipeline: check current state
     - #4 Dashboard God Page Decomposition: page is 114 lines with 44 section files (DONE)
     - #5 Event Detail God Page Decomposition: check current state
  3. Verify server action splitting items if any are in queue
  4. Verify client component line counts (all under 400)
  5. Update statuses with evidence (line counts, file existence)
  6. Do NOT change any other items. Only mark DONE what is provably complete.
- **Read first:** `docs/UNIFIED-BUILD-QUEUE.md`
- **Done when:** Queue reflects reality. No false SPEC-READY items on completed work.

## Wave 2 (After Wave 1 Verified)

### Agent 6: Cross-Feature Integration Test

- **Model:** opus
- **Task:** Verify all Wave 1 UI wiring works end-to-end. Use Playwright or manual browser testing:
  1. Start dev server on localhost:3100 (or verify running)
  2. Sign in with agent credentials (`.auth/agent.json`)
  3. Navigate to an event detail page. Verify:
     - Reschedule button visible and opens modal
     - Cancel button visible, shows fee schedule, opens confirmation
     - Dietary outreach section renders with guest allergy info
     - Beverage discovery section renders
  4. Navigate to contract creation. Verify:
     - Clause picker/editor appears
     - Default clauses pre-populated
     - Can add/remove clauses
  5. Navigate to event closeout. Verify:
     - Leftover tracking section renders
     - Can mark and label leftovers
  6. Screenshot evidence for each verification
- **Read first:** Wave 1 agent outputs. `.auth/agent.json` for credentials.
- **Done when:** All 6 feature surfaces verified working in browser. Screenshots saved. Any bugs found are fixed (not just reported).

## Wave 3 (After Wave 2 Verified)

### Agent 7: Full Health Check + Commit

- **Model:** opus
- **Task:** Full project verification and commit:
  1. `npx tsc --noEmit --skipLibCheck` passes
  2. `npx next build --no-lint` succeeds
  3. `npm run test:affected` passes
  4. Commit all work with descriptive message
  5. Push to GitHub
  6. Update `docs/session-log.md` with summary
- **Read first:** Git status, recent commits
- **Done when:** Clean build, tests pass, committed and pushed.

## Verification Protocol

- Each agent runs `npx tsc --noEmit --skipLibCheck` on completion
- Orchestrator does NOT build. Orchestrator dispatches, monitors, verifies.
- After each wave: type check must pass across entire project
- After final wave: browser verification of all new UI surfaces
- Anti-Loop: 3 strikes on same error = stop, report, let developer decide

## Orchestrator Rules

1. You are the COORDINATOR. You do not write implementation code.
2. Dispatch agents via the Agent tool with appropriate model tier.
3. After dispatching a wave, wait for all agents to complete.
4. Verify each agent's output (type check, screenshot, behavioral test).
5. Only proceed to next wave after current wave is fully verified.
6. If an agent fails: diagnose, give it one retry with better context, then flag.
7. At completion: commit all work with message `feat: lifecycle UI wiring - reschedule, cancel, clauses, dietary, beverage, leftovers`, push.

## Expected Outcome

| Surface                   | Before              | After                                  |
| ------------------------- | ------------------- | -------------------------------------- |
| Reschedule/Cancel buttons | Server actions only | Buttons on event detail, modals wired  |
| Contract clauses          | Server actions only | Clause picker in contract creation     |
| Dietary outreach          | Server actions only | Section on event detail, outreach flow |
| Beverage discovery        | Server actions only | Section on event detail                |
| Leftover tracking         | Server actions only | Section in event closeout              |
| Build queue accuracy      | Stale SPEC-READY    | Reflects actual completion state       |
