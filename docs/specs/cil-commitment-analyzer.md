# CIL Commitment Analyzer Spec

## Purpose

8th CIL domain analyzer. Detects patterns in how the chef overrides their own commitments: readiness gates, menu locks, pricing floors, communication cadences. Surfaces signals like "you override dietary constraint checks before weekend events" or "you skip readiness gates 3x more for repeat clients."

## Data Sources

### Primary: `event_readiness_gates`

```sql
-- Override rows have status = 'overridden'
SELECT
  gate,                    -- which commitment was broken (prep_timeline, dietary_constraints, etc.)
  override_reason,         -- chef's stated reason
  overridden_by,           -- user ID
  resolved_at,             -- when override happened
  metadata->>'contextHash' -- snapshot hash at override time
  metadata->>'targetStatus' -- what transition they were trying to reach
  metadata->>'confidence'   -- readiness confidence at override time
  metadata->>'proofStatus'  -- original gate status before override
FROM event_readiness_gates
WHERE tenant_id = $1 AND status = 'overridden'
```

### Secondary: `event_state_transitions`

```sql
-- Transitions with readiness warnings = soft gates bypassed
SELECT
  from_status, to_status,
  metadata->'readiness_warnings' as warnings,  -- array of soft gates bypassed
  metadata->'service_readiness_snapshot' as snapshot,
  transitioned_at,
  event_id
FROM event_state_transitions
WHERE tenant_id = $1
  AND metadata->'readiness_warnings' IS NOT NULL
  AND jsonb_array_length(metadata->'readiness_warnings') > 0
```

### Tertiary: `menu_state_transitions`

```sql
-- Menu unlocks (locked -> draft) = breaking menu finalization commitment
SELECT event_id, from_status, to_status, reason, transitioned_at
FROM menu_state_transitions
WHERE tenant_id = $1
  AND from_status = 'locked' AND to_status = 'draft'
```

## Signal Patterns to Detect

### 1. Frequent Gate Override (any gate)

- **Trigger:** 3+ overrides of the same gate type in rolling 90 days
- **Signal:** "You've overridden {gate_label} {count} times in the last 90 days. Most common reason: '{top_reason}'."
- **Urgency:** 3
- **Action:** Navigate to analytics/commitment (future), or dismiss
- **Why it matters:** Repeated overrides of the same gate suggest the gate is miscalibrated OR the chef has a blind spot

### 2. Time-Pressure Override Clustering

- **Trigger:** 2+ overrides where event_date minus override_date < 3 days
- **Signal:** "You tend to override readiness gates in the last 48 hours before events. {count} overrides were under time pressure."
- **Urgency:** 4
- **Action:** Navigate to calendar, suggest earlier prep deadlines
- **Why it matters:** Time-pressure overrides are the classic Ulysses failure mode

### 3. Client-Correlated Overrides

- **Trigger:** 3+ overrides on events for the same client
- **Signal:** "Events for {client_name} have {count} readiness overrides. This client's events may need different preparation standards."
- **Urgency:** 2
- **Action:** Navigate to client profile
- **Why it matters:** Some clients drive more chaotic event planning. Chef should be aware.

### 4. Confidence Erosion

- **Trigger:** Average readiness confidence at override time is below 0.5 across 3+ events
- **Signal:** "Your average readiness confidence when overriding gates is {avg}%. Events with low-confidence overrides have higher risk."
- **Urgency:** 3
- **Action:** Dismiss or navigate to readiness settings
- **Why it matters:** Overriding when confidence is low = highest risk

### 5. Menu Unlock Pattern

- **Trigger:** 2+ menu unlocks in 30 days
- **Signal:** "You've unlocked finalized menus {count} times this month. Consider finalizing later or using draft sharing."
- **Urgency:** 2
- **Action:** Dismiss
- **Why it matters:** Repeated unlock = premature locking. Adjust workflow.

### 6. Override-Then-Issue Correlation

- **Trigger:** Event had readiness override AND (completed with issues OR had post-event notes mentioning problems)
- **Signal:** "Events where you overrode readiness gates had {rate}% more post-event issues than events without overrides."
- **Urgency:** 4
- **Action:** Navigate to event replay / analytics
- **Why it matters:** This is the payoff signal. Shows the chef that overrides have real consequences.

## Type Changes

```typescript
// lib/cil/types.ts
export type SignalDomain =
  | 'finance'
  | 'clients'
  | 'calendar'
  | 'inventory'
  | 'reputation'
  | 'pipeline'
  | 'cannabis'
  | 'commitment' // NEW
```

## File: `lib/cil/analyzers/commitment.ts`

### Signature

```typescript
export async function analyzeCommitment(tenantId: string): Promise<ProactiveSignal[]>
```

### Pattern

Follow `finance.ts` exactly:

- Top-level try/catch returning `[]` on failure
- Helper functions per detection pattern
- `createServerClient()` for DB access
- `generateId()` for signal IDs
- All signals use `domain: 'commitment'`

### Sub-functions

```
analyzeGateOverrideFrequency(client, tenantId, signals, now)
analyzeTimePressureOverrides(client, tenantId, signals, now)
analyzeClientCorrelatedOverrides(client, tenantId, signals, now)
analyzeConfidenceErosion(client, tenantId, signals, now)
analyzeMenuUnlockPattern(client, tenantId, signals, now)
```

Pattern 6 (override-then-issue correlation) deferred to Phase 2. Needs event debrief data that may not exist yet.

## Orchestrator Change

```typescript
// lib/cil/analyzers/index.ts - add to Promise.allSettled array:
import('./commitment').then((m) => m.analyzeCommitment(tenantId)),
```

## NOT in Scope

- UI surface for commitment analytics (future Direction A work)
- Pre-commitment profile settings (future)
- Dynamic friction adjustment based on patterns (future Direction D)
- Remy integration for commitment coaching (future)

## Done-When

1. `analyzeCommitment()` runs without errors in the CIL scan cycle
2. Produces valid `ProactiveSignal[]` matching the 5 patterns above
3. Signals appear in existing intelligence surfaces that consume CIL signals
4. `commitment` domain added to `SignalDomain` type
5. Orchestrator wired up
6. No type errors (`tsc --noEmit`)
