# ORCHESTRATION MISSION: Ulysses Commitment Layer

## Context Load (Read These First)

- `CLAUDE.md` (project rules, auto-loaded)
- `docs/specs/cil-commitment-analyzer.md` (spec for the analyzer just built)
- `lib/cil/analyzers/commitment.ts` (the analyzer, pattern reference)
- `lib/cil/analyzers/finance.ts` (canonical analyzer pattern)
- `lib/cil/types.ts` (ProactiveSignal, SignalDomain types)
- `lib/events/readiness.ts` (override data shape, context hash)
- `app/(chef)/analytics/intelligence/page.tsx` (intelligence hub, where card mounts)
- `lib/intelligence/` (existing intelligence modules for pattern reference)
- `lib/confirm/confirm-policy.ts` (existing friction tiers)

## Session Decisions (Do Not Re-Debate)

- CIL commitment analyzer is BUILT (8th domain, 5 patterns). Do not rebuild or redesign it.
- `commitment` is already added to `SignalDomain` type and wired into `runAllAnalyzers()`.
- Override data lives in `event_readiness_gates` (primary), `event_state_transitions` (secondary), `menu_state_transitions` (tertiary). These are the canonical sources.
- Direction C (override pattern aggregation) was prioritized over Direction B (deadline chains) because backward-scheduling infrastructure already exists in 3 forms. The gap is the self-binding/enforcement layer, not the scheduling.
- Signal patterns use conservative thresholds (3+ overrides, 2+ time-pressure, avg < 0.5 confidence) to avoid alert fatigue. Do not lower these.
- Pattern 6 (override-then-issue correlation) is DEFERRED. Do not build it in this swarm.

## Wave 1 (Parallel - Launch Immediately)

### Agent 1: Commitment Insights Analytics Card

- **Model:** haiku
- **Task:** Create an analytics card component that surfaces commitment/override patterns for the chef. Mount it in the intelligence hub page. The card should show:
  1. Total overrides (last 90 days) with trend vs prior 90 days
  2. Most-overridden gate (with count)
  3. Time-pressure override count (overrides within 48hrs of event)
  4. Average readiness confidence at override time
  5. Menu unlock count (last 30 days)
     The card queries `event_readiness_gates` and `menu_state_transitions` directly (server component pattern). No new tables needed.
- **Read first:** `lib/cil/analyzers/commitment.ts` (data queries to reuse), `app/(chef)/analytics/intelligence/page.tsx` (mount point), any existing analytics card in `components/analytics/` or `components/intelligence/` for layout pattern
- **Done when:** Card renders on `/analytics/intelligence` with real data. `npx tsc --noEmit --skipLibCheck` passes. No new migrations.

### Agent 2: Override Reason Taxonomy + Category Picker

- **Model:** haiku
- **Task:** Build an override reason taxonomy system:
  1. Create `lib/events/override-taxonomy.ts` with categories: `time_constraint`, `client_request`, `ingredient_substitution`, `venue_change`, `simplified_service`, `chef_judgment`, `other`
  2. Add a `classifyOverrideReason(reason: string): OverrideCategory` function that does keyword matching on the free-text reason field
  3. Update the override dialog in `lib/events/readiness.ts` `overrideGate()` to accept an optional `category` parameter alongside `reason`
  4. Add `override_category` column to `event_readiness_gates` table (nullable text, no migration enforcement needed yet, just the migration file)
  5. Backfill function: `classifyExistingOverrides(tenantId)` that reads existing override_reason values and writes categories
- **Read first:** `lib/events/readiness.ts` (overrideGate function), `database/migrations/` (latest timestamp for new migration), `lib/db/schema/schema.ts` (event_readiness_gates definition)
- **Done when:** Taxonomy module exports, classification function works on sample reasons, migration file exists, `tsc` passes. No UI changes in this agent.

### Agent 3: Commitment Signal Consumer in Dashboard

- **Model:** haiku
- **Task:** Wire commitment domain signals into the existing dashboard resolve-next or action-surface cards. The CIL already produces `ProactiveSignal` objects with `domain: 'commitment'`. These signals flow through `runAllAnalyzers()` -> scoring -> signal-actions dispatch. Ensure:
  1. `lib/cil/signal-actions.ts` has a handler for `commitment.*` source patterns (follow existing handler pattern for finance/clients)
  2. Commitment signals with urgency >= 3 create in-app notifications via `createNotification()`
  3. Commitment signals appear in the dashboard intelligence feed if one exists
  4. Add commitment to any signal domain filter/dropdown that shows domain categories
- **Read first:** `lib/cil/signal-actions.ts` (dispatch handlers), `lib/cil/scoring.ts` (signal flow), `components/dashboard/action-surface-card.tsx`, `components/dashboard/resolve-next-card.tsx`
- **Done when:** Commitment signals dispatch to notifications. `tsc` passes. No new tables.

## Wave 2 (After Wave 1 Verified)

### Agent 4: Override Dialog UX Enhancement

- **Model:** haiku
- **Task:** Improve the override experience to make commitment-breaking feel intentional (not casual):
  1. Find or create the UI component where chefs confirm readiness gate overrides
  2. Add the category picker from Agent 2's taxonomy (dropdown of 7 categories before the free-text reason)
  3. Show a "commitment context" line: "You've overridden {gate} {N} times in the last 90 days" (query event_readiness_gates, count by gate for tenant)
  4. If this is a time-pressure override (event < 3 days away), show a yellow warning banner: "This override is under time pressure. Consider whether preparation can still be completed."
  5. Keep the dialog simple. No blocking, no cooldown timers. Just information + awareness.
- **Read first:** Agent 2's output (override-taxonomy.ts), `lib/events/readiness.ts`, any existing override UI components (grep for `overrideGate` imports), `lib/confirm/confirm-policy.ts` (friction tier reference)
- **Done when:** Override dialog shows category picker + historical count + time-pressure warning. `tsc` passes.

### Agent 5: Monthly Commitment Review Signal

- **Model:** haiku
- **Task:** Add a monthly commitment review signal to the commitment CIL analyzer. On the 1st of each month (or when analyzer runs and it's been 30+ days since last monthly signal):
  1. Aggregate all overrides from the prior month
  2. Compare override count to the month before (trend)
  3. Produce a `ProactiveSignal` with domain `commitment`, source `commitment.monthlyReview`:
     - Title: "Monthly commitment review: {month}"
     - Detail: "{N} overrides ({trend}% vs prior month). Most overridden: {gate}. {time_pressure_count} under time pressure."
     - Urgency: 2 (informational)
     - Action: navigate to /analytics/intelligence
  4. Use a simple "last monthly signal" check: query for existing signal with source `commitment.monthlyReview` created in the last 25 days. Skip if found. (Signal dedup handles the rest.)
- **Read first:** `lib/cil/analyzers/commitment.ts` (add to existing analyzer), `lib/cil/signal-dedup.ts` (dedup pattern)
- **Done when:** Monthly review signal generates correctly. Added as 6th sub-function in commitment.ts. `tsc` passes.

## Verification Protocol

- Each agent runs `npx tsc --noEmit --skipLibCheck` before reporting done
- Orchestrator does NOT build. Orchestrator dispatches, monitors, verifies.
- After Wave 1: verify all 3 agents' outputs compile together (no conflicts on shared files)
- After Wave 2: full type check + verify commitment signals appear in CIL scan output
- Anti-Loop: 3 strikes on same error = stop, report, let developer decide

## Orchestrator Rules

1. You are the COORDINATOR. You do not write implementation code.
2. Dispatch agents via the Agent tool with appropriate model tier.
3. After dispatching a wave, wait for all agents to complete.
4. Verify each agent's output (type check, screenshot if UI, behavioral test if logic).
5. Only proceed to next wave after current wave is fully verified.
6. If an agent fails: diagnose, give it one retry with better context, then flag.
7. At completion: commit all work, update build queue status, push.
8. Log build times to `docs/build-times.log`.

## What Is NOT In This Swarm

- Pre-Commitment Profile Settings (Direction A) - needs product spec first
- Prep Deadline Ulysses Enforcement (Direction B friction layer) - needs friction design
- Override-Then-Issue Correlation (Pattern 6) - deferred, needs event debrief maturity
- Graduated Friction Engine (Direction D) - needs framework design
- Client Commitment Scoring (Direction E) - needs product decision
