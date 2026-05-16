# ORCHESTRATION MISSION: Rail Intensification Build

## Context Load (Read These First)

- `CLAUDE.md` (auto-loaded)
- `docs/specs/rail-item-lifecycle-and-scoring-engine.md` (canonical spec)
- `lib/discovery/rail-tier-assigner.ts` (scoring migration already landed)
- `lib/discovery/universal-rail-scoring.ts` (multiplicative scoring engine)
- `lib/discovery/resolvers/chef/dormant-client-resolver.ts` (resolver pattern example)
- `lib/intelligence/client-risk.ts` (intelligence analyzer pattern)
- `lib/intelligence/churn-prevention-triggers.ts`
- `lib/intelligence/price-anomaly.ts`
- `lib/intelligence/proactive-alerts.ts`
- `lib/intelligence/seasonal-demand.ts`
- `lib/discovery/god-mode-dispatcher.ts` (resolver registry)
- `components/rail/rail-tier-group.tsx` (UI component for density caps)
- `docs/intensify/rail.md` (intensification log)

## Session Decisions (Do Not Re-Debate)

- Rail has 2 systems: Dashboard Rail (chef, 4 tiers) and Discovery Rail (public, 3 lanes)
- Tier thresholds are 80/50/20 (ALREADY APPLIED in rail-tier-assigner.ts)
- Scoring engine is multiplicative via computeUniversalRailScore (ALREADY MIGRATED)
- Visibility rules: Critical + Action lane header = always pinned. Awareness + Opportunity scroll off vertically.
- Density caps: Critical=3, Action=8, Awareness=12, Opportunity=6. Overflow = "+N more" badge.
- Time-of-day: 5-9am boost 1.2x, 9-5pm normal, 5-10pm dampen 0.7x, 10pm-5am Critical only.
- Intelligence resolvers follow existing pattern (see dormant-client-resolver.ts). Returns GodModeResolvedItem[].
- CIL cross-rail signal flow is PREMATURE (skip until CIL scanner confirmed active).
- Discovery-to-Dashboard flow is PREMATURE (needs consumer traffic).

## Wave 1 (Parallel - Launch Immediately)

### Agent 1: Intelligence Resolvers (3 analyzers -> rail)

- **Model:** sonnet
- **Task:** Create 3 new rail resolvers that wrap existing intelligence analyzers:
  1. `lib/discovery/resolvers/chef/client-risk-resolver.ts` - wraps `lib/intelligence/client-risk.ts`. Map `riskScore` (0-100) to item score. riskLevel high = Action tier, critical = Critical tier. Label: "Client at risk: {name}". Destination: client detail page.
  2. `lib/discovery/resolvers/chef/churn-resolver.ts` - wraps `lib/intelligence/churn-prevention-triggers.ts`. Each trigger becomes an Awareness/Action item depending on urgency. Label: "Churn signal: {trigger description}".
  3. `lib/discovery/resolvers/chef/price-anomaly-resolver.ts` - wraps `lib/intelligence/price-anomaly.ts`. Price spikes = Action ("Price spike: salmon +22%"). Price drops = Opportunity ("Price drop: salmon -12%"). Destination: ingredient or PIE page.
- **Read first:** `lib/discovery/resolvers/chef/dormant-client-resolver.ts` (pattern), `lib/discovery/god-mode-types.ts` (GodModeResolvedItem shape), `lib/intelligence/client-risk.ts`, `lib/intelligence/churn-prevention-triggers.ts`, `lib/intelligence/price-anomaly.ts`
- **Done when:** All 3 resolvers export async functions matching `(ctx: GodModeResolverContext) => Promise<GodModeResolvedItem[]>`. Register them in `god-mode-dispatcher.ts`. `tsc --noEmit --skipLibCheck` passes.

### Agent 2: Density Caps in UI

- **Model:** haiku
- **Task:** Add density cap enforcement to the rail UI layer:
  1. In `components/rail/rail-tier-group.tsx` (or wherever TierRow renders items): limit rendered items per tier to max visible (Critical=3, Action=8, Awareness=12, Opportunity=6).
  2. When items exceed cap, render an overflow indicator as the last visible card: "+{N} more" with expand/collapse toggle.
  3. Critical tier: overflow badge is expandable (onClick reveals hidden items). Other tiers: last card = "+N" text, clicking expands inline.
- **Read first:** `components/rail/rail-tier-group.tsx`, `components/rail/rail-item-row.tsx`, `components/rail/rail-full.tsx`, `docs/specs/rail-item-lifecycle-and-scoring-engine.md` (Density Caps section)
- **Done when:** Each tier respects its cap. Overflow renders "+N more". Expand/collapse works. `tsc --noEmit --skipLibCheck` passes.

### Agent 3: Time-of-Day Scoring Multiplier

- **Model:** haiku
- **Task:** Add time-of-day awareness to `scoreGodModeItem()` in `lib/discovery/rail-tier-assigner.ts`:
  1. After `computeUniversalRailScore` returns `breakdown.final`, apply time-phase multiplier:
     - 5am-9am: if tier would be Critical/Action, multiply by 1.2 (cap at 100)
     - 9am-5pm: no adjustment
     - 5pm-10pm: if tier would be Awareness/Opportunity, multiply by 0.7
     - 10pm-5am: if tier would NOT be Critical, multiply by 0.0 (suppressed)
  2. Use the `now` parameter already passed to `scoreGodModeItem`. Determine hour from it.
  3. The multiplier applies AFTER scoring, BEFORE tier assignment in `mapGodModeTierToUnified`.
- **Read first:** `lib/discovery/rail-tier-assigner.ts` (current scoreGodModeItem + mapGodModeTierToUnified flow)
- **Done when:** Time multiplier applied. Items scored differently at 7am vs 11pm. `tsc --noEmit --skipLibCheck` passes. Existing rail tests still pass.

## Wave 2 (After Wave 1 Verified)

### Agent 4: Rail Item State Migration + Tracker

- **Model:** sonnet
- **Task:** Implement the lifecycle state persistence layer:
  1. Create migration `database/migrations/XXXX_rail_item_state.sql` with the schema from spec (rail_item_state table: id, tenant_id, user_id, item_key, state, snoozed_until, seen_at, acted_at, resolved_at, created_at, UNIQUE constraint).
  2. Create `lib/rail/state.ts` with functions: `markSeen(tenantId, userId, itemKey)`, `markActed(tenantId, userId, itemKey)`, `markSnoozed(tenantId, userId, itemKey, until: Date)`, `markResolved(tenantId, userId, itemKey)`, `getItemState(tenantId, userId, itemKey)`, `getExpiredItems(tenantId, userId)`.
  3. Create `lib/rail/types.ts` exporting `RailItemState` type ('surfaced' | 'seen' | 'acted' | 'snoozed' | 'resolved' | 'expired' | 'archived').
  4. Wire `markSeen` into the TierRow component (intersection observer + 2s dwell timer).
  5. Wire `markActed` into rail item click handler.
- **Read first:** `lib/db/schema/rail-state.ts` (existing schema for dismiss/snooze/pin), `docs/specs/rail-item-lifecycle-and-scoring-engine.md` (Storage + Item Lifecycle sections), `database/migrations/` (for timestamp format)
- **Done when:** Migration file exists. State functions work. Seen/Acted tracking wired into UI. `tsc --noEmit --skipLibCheck` passes. DO NOT run the migration (requires approval).

### Agent 5: Wire Impressions -> Fatigue Penalty

- **Model:** haiku
- **Task:** Connect the existing rail impressions DB data into the scoring path:
  1. In `lib/discovery/rail-tier-assigner.ts`, after `loadRailUserState`, extract impression counts per item.
  2. Pass `impressionCount` to `scoreGodModeItem` (currently hardcoded as 0).
  3. Update `scoreGodModeItem` to accept optional `impressionCount` parameter and pass it through to `computeUniversalRailScore`.
  4. Increment impression count when item renders (use the state tracker from Agent 4, or existing `rail-state.ts` if it already tracks impressions).
- **Read first:** `lib/db/schema/rail-state.ts` (impressions table), `lib/discovery/universal-rail-state.ts` (loadRailUserState), `lib/discovery/rail-tier-assigner.ts`
- **Done when:** Items seen repeatedly get fatigue penalty (lower score). `tsc --noEmit --skipLibCheck` passes.

## Wave 3 (After Wave 2 Verified)

### Agent 6: Snooze UI + Resolve Wiring

- **Model:** sonnet
- **Task:** Add snooze and resolve interactions to rail items:
  1. Add snooze button/action to `components/rail/rail-item-row.tsx`. Options: 1h, 4h, tomorrow, next week.
  2. On snooze: call `markSnoozed` from `lib/rail/state.ts`. Item disappears immediately.
  3. In `assembleTieredRail`: filter out items where state = 'snoozed' AND `snoozed_until > now`.
  4. Re-surface snoozed items when `snoozed_until` passes (they return to 'surfaced' state).
  5. When source system resolves an entity (e.g., invoice paid, message answered): call `markResolved`. Item fades out with 5-min grace period.
- **Read first:** `lib/rail/state.ts` (from Wave 2), `components/rail/rail-item-row.tsx`, `lib/discovery/rail-tier-assigner.ts` (assembleTieredRail filtering)
- **Done when:** Snooze works end-to-end. Resolved items fade. `tsc --noEmit --skipLibCheck` passes.

## Verification Protocol

- Each agent runs `npx tsc --noEmit --skipLibCheck` before reporting done
- After Wave 1: verify all 3 intelligence resolvers appear in dispatcher, density caps visible in UI, time scoring applies
- After Wave 2: verify migration SQL is valid, state functions have correct types, impressions reduce score
- After Wave 3: verify snooze hides item, re-surfaces after timer, resolve fades item
- Anti-Loop: 3 strikes on same error = stop, report, let developer decide

## Orchestrator Rules

1. You are the COORDINATOR. You do not write implementation code.
2. Dispatch agents via the Agent tool with appropriate model tier.
3. After dispatching a wave, wait for all agents to complete.
4. Verify each agent's output (type check at minimum).
5. Only proceed to next wave after current wave is fully verified.
6. If an agent fails: diagnose, give it one retry with better context, then flag.
7. At completion: update `docs/intensify/rail.md` with acted-on moves, update queue item #8 status to PARTIAL.
