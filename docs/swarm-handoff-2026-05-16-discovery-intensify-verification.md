# ORCHESTRATION MISSION: Discovery Intensification Verification + Rail Item Lifecycle Engine

Generated: 2026-05-16 by /swarm-handoff after /intensify discovery session.

## Context Load (Read These First)

- `CLAUDE.md` (project rules, auto-loaded)
- `docs/specs/rail-item-lifecycle-and-scoring-engine.md` (P0 spec, Wave 2 target)
- `docs/intensify/discovery.md` (intensify findings and what was built)
- `docs/UNIFIED-BUILD-QUEUE.md` (queue state, discovery intensification section all DONE)
- `lib/discovery/god-mode-dispatcher.ts` (3 new resolvers: cil-signals, intelligence-signals, scheduled-messages)
- `lib/discovery/god-mode-types.ts` (GodModeResolvedItem, GodModeResolverContext, RailTier)
- `lib/discovery/rail-tier-assigner.ts` (unified 4-tier: critical/action/awareness/opportunity)
- `lib/discovery/universal-rail-actions.ts` (new getTieredRail() server action)

## Session Decisions (Do Not Re-Debate)

- Discovery intensification: 6 moves built (CIL resolver, intelligence resolver, scheduled-message resolver, getTieredRail action, dynamic autocomplete). All type-check clean.
- Scoring consolidation: discovery-rail-scoring (consumer) stays separate from god-mode-assembly (chef). They serve different audiences. The tier-assigner merges them for dashboard.
- Staff/partner/admin resolvers: SKIP (premature, no users of those roles yet)
- Social rail contracts, shortlists, recovery, compare: SKIP (types-only, no runtime)
- Remy reverse-wire: SKIP (needs architectural decision on what discovery does with chat context)
- Pre-existing tsc errors in chef-nav.tsx (usageRanking prop) are unrelated to this work

## Wave 0: Verification of Discovery Intensification (Parallel)

### Agent 1: Verify CIL + Intelligence Resolvers on Dashboard

- **Model:** opus
- **Task:** Sign in as agent (`.auth/agent.json`), navigate to chef dashboard at `http://localhost:3100/chef/dashboard`. Screenshot the rail. Check browser console for errors from `cil-signal-resolver`, `intelligence-resolver`, or `scheduled-message-resolver`. The resolvers should either return items (if data exists) or return empty arrays silently (no crashes). Verify the tiered rail renders with critical/action/awareness/opportunity sections.
- **Read first:** `lib/discovery/resolvers/chef/cil-signal-resolver.ts`, `lib/discovery/resolvers/chef/intelligence-resolver.ts`, `lib/discovery/resolvers/chef/scheduled-message-resolver.ts`
- **Done when:** Dashboard loads without console errors from new resolvers. Screenshot proves rail renders. If data exists, items from CIL/intelligence/scheduled-messages appear in correct tiers.

### Agent 2: Verify Dynamic Autocomplete

- **Model:** haiku
- **Task:** Sign in, navigate to homepage `http://localhost:3100`. Click the search bar. Type "ita" and verify autocomplete suggestions include Italian (from dynamic sources, not just hardcoded). Type "meal" and verify "Meal prep" appears. Check console for errors from search-autocomplete.ts. Screenshot suggestions.
- **Read first:** `lib/discovery/search-autocomplete.ts`
- **Done when:** Autocomplete shows results from dynamic sources. No console errors. Screenshot proves suggestions render.

### Agent 3: Verify getTieredRail Server Action

- **Model:** haiku
- **Task:** Write a minimal integration test that imports `getTieredRail` from `lib/discovery/universal-rail-actions` and calls it (requires auth context). Verify it returns a `TieredRailResult` with `critical`, `action`, `awareness`, `opportunity` arrays and `totalItems` number. Place test in `tests/unit/tiered-rail-action.test.ts`.
- **Read first:** `lib/discovery/universal-rail-actions.ts` (getTieredRail function), `lib/discovery/rail-tier-assigner.ts` (assembleTieredRail, TieredRailResult)
- **Done when:** Test file exists and documents the expected contract. Type-checks clean.

## Wave 1: Rail Item Lifecycle Engine (Sequential, Complex)

### Agent 4: Shared Types + Scoring Engine

- **Model:** opus
- **Task:** Implement steps 1-2 from the spec:
  1. Create `lib/rail/types.ts` with `RailItem`, `RailTier` ('critical'|'action'|'awareness'|'opportunity'), `RailItemState` ('surfaced'|'seen'|'acted'|'snoozed'|'resolved'|'expired'|'archived'), scoring interfaces, density cap constants, tier score thresholds, time-of-day windows.
  2. Create `lib/rail/scoring.ts` with pure scoring functions: `calculateScore(baseScore, urgencyMultiplier, freshnessDecay, userRelevance)`, tier assignment by score thresholds (80-100=critical, 50-79=action, 20-49=awareness, 0-19=opportunity), promotion/demotion rules, time-of-day dampening, freshness decay over TTL.
     NOTE: The existing `lib/discovery/god-mode-types.ts` has `RailTier = 'p0'|'p1'|'p2'|'p3'|'p4'` and `lib/discovery/rail-tier-assigner.ts` has `UnifiedTier = 'critical'|'action'|'awareness'|'opportunity'`. The new `lib/rail/types.ts` should use the string tier names (critical/action/awareness/opportunity) as canonical. Add a mapping function from old p0-p4 to new tiers for backward compatibility.
- **Read first:** `docs/specs/rail-item-lifecycle-and-scoring-engine.md`, `lib/discovery/god-mode-types.ts`, `lib/discovery/rail-tier-assigner.ts`, `lib/discovery/god-mode-assembly.ts`
- **Done when:** Both files exist, export correct types, tsc passes. Scoring functions are pure (no DB, no side effects). Density caps match spec (3/8/12/6).

### Agent 5: State Tracker + Migration

- **Model:** opus
- **Task:** Implement steps 5-6 from the spec:
  1. Create migration `database/migrations/XXXX_rail_item_state.sql` with the `rail_item_state` table (check existing migrations for highest timestamp, pick strictly higher). Table: id TEXT PK, tenant_id TEXT NOT NULL, user_id TEXT NOT NULL, item_key TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'surfaced', snoozed_until TIMESTAMPTZ, seen_at TIMESTAMPTZ, acted_at TIMESTAMPTZ, resolved_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(tenant_id, user_id, item_key).
  2. Create `lib/rail/state.ts` with functions: `getItemState(tenantId, userId, itemKey)`, `markSeen(tenantId, userId, itemKey)`, `markActed(...)`, `snoozeItem(tenantId, userId, itemKey, duration)`, `resolveItem(...)`, `expireItem(...)`. All use the DB table. Include a `cleanupExpired()` function that archives items resolved/expired more than 5 minutes ago.
     NOTE: Do NOT run the migration. Just create the SQL file. User will review and approve.
- **Read first:** `docs/specs/rail-item-lifecycle-and-scoring-engine.md`, existing `database/migrations/` for timestamp format
- **Done when:** Migration SQL file exists with correct timestamp. `lib/rail/state.ts` exports all state transition functions. tsc passes.

## Wave 2: Source Adapters + Aggregator (After Wave 1 Verified)

### Agent 6: Source Adapters

- **Model:** opus
- **Task:** Implement step 3 from the spec. Create source adapters that produce `RailItem[]`:
  1. `lib/rail/sources/cil.ts` - adapts CIL ProactiveSignals (reuse logic from `lib/discovery/resolvers/chef/cil-signal-resolver.ts` but output RailItem instead of GodModeResolvedItem)
  2. `lib/rail/sources/intelligence.ts` - adapts intelligence signals (reuse logic from `lib/discovery/resolvers/chef/intelligence-resolver.ts`)
  3. `lib/rail/sources/communication.ts` - adapts scheduled messages (reuse logic from `lib/discovery/resolvers/chef/scheduled-message-resolver.ts`)
  4. `lib/rail/sources/events.ts` - adapts event deadlines from events + event_transitions tables
  5. `lib/rail/sources/finance.ts` - adapts overdue payments from ledger_entries + invoices
     Each adapter: async function returning RailItem[]. Wrapped in try/catch returning [] on failure. Uses tenant context.
- **Read first:** `lib/rail/types.ts` (from Wave 1), `lib/discovery/resolvers/chef/cil-signal-resolver.ts`, `lib/discovery/resolvers/chef/intelligence-resolver.ts`, `lib/discovery/resolvers/chef/scheduled-message-resolver.ts`, `docs/specs/rail-item-lifecycle-and-scoring-engine.md` (Source Integration Points table)
- **Done when:** All 5 adapter files exist, export async functions returning RailItem[], tsc passes.

### Agent 7: Aggregator

- **Model:** opus
- **Task:** Implement step 4 from the spec:
  1. Create `lib/rail/aggregator.ts` that collects from all source adapters (parallel via Promise.allSettled), scores each item via the scoring engine, applies density caps per tier, sorts within tiers by score descending, and returns the complete tiered result.
  2. Export `aggregateRailItems(tenantId, userId): Promise<AggregatedRailResult>` where the result contains items grouped by tier, total counts, and assembly timestamp.
  3. Apply time-of-day dampening from the scoring engine.
  4. Filter out dismissed/snoozed items using the state tracker from Wave 1.
- **Read first:** `lib/rail/types.ts` (from Wave 1), `lib/rail/scoring.ts` (from Wave 1), `lib/rail/state.ts` (from Wave 1), `lib/rail/sources/*.ts` (from Agent 6)
- **Done when:** Aggregator collects from all sources, scores, caps, returns structured result. tsc passes.

## Verification Protocol

- Each agent runs type check: `npx tsc --noEmit --skipLibCheck`
- Pre-existing errors in `components/navigation/chef-nav.tsx` (usageRanking) are KNOWN and IGNORED
- After Wave 0: Playwright screenshots of dashboard rail + homepage autocomplete
- After Wave 1: Type check for lib/rail/ types + scoring + state
- After Wave 2: Full aggregator integration test
- Anti-Loop: 3 strikes on same error = stop, report, let developer decide

## Orchestrator Rules

1. You are the COORDINATOR. You do not write implementation code.
2. Dispatch agents via the Agent tool with appropriate model tier.
3. After dispatching a wave, wait for all agents to complete.
4. Verify each agent's output (type check, screenshot, behavioral test).
5. Only proceed to next wave after current wave is fully verified.
6. If an agent fails: diagnose, give it one retry with better context, then flag.
7. At completion: commit all work, update build queue status, push.
8. The Rail Item Lifecycle Engine is the P0 blocker. Once it ships, re-run `/intensify discovery` to find new wiring opportunities created by the lifecycle state system.
