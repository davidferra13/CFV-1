# Rail Item Lifecycle & Scoring Engine

> Status: SPEC-READY
> Priority: P0 (unblocks both Dashboard Rail and Discovery Rail)
> Date: 2026-05-16
> Source: Over-the-shoulder review (Spotify, Apple Notifications, Linear, Airbnb, Toast)

---

## Problem

Both rail systems (Dashboard + Discovery) lack:

1. A shared item model
2. A scoring/promotion/demotion engine
3. Item lifecycle states (appear, age, resolve, expire)
4. Density caps (unbounded scroll = nothing is urgent)
5. Cross-rail signal flow (Discovery browsing -> Dashboard Opportunity)

Without this, rails accumulate stale cards within days of real use.

---

## Shared RailItem Type

```ts
type RailItemState = 'surfaced' | 'seen' | 'acted' | 'snoozed' | 'resolved' | 'expired' | 'archived'

type RailTier = 'critical' | 'action' | 'awareness' | 'opportunity'

interface RailItem {
  id: string
  tenantId: string
  source: string // which system produced this (lifecycle, CIL, PIE, Remy, discovery)
  tier: RailTier
  state: RailItemState
  score: number // 0-100, determines position within tier
  title: string
  subtitle?: string
  actionUrl?: string
  createdAt: Date
  surfacedAt: Date
  seenAt?: Date
  actedAt?: Date
  resolvedAt?: Date
  expiresAt?: Date // hard TTL; auto-expires if unresolved
  ttlMinutes: number // soft TTL; score decays toward 0 over this window
  promotedFrom?: RailTier // tracks tier movement
  demotedFrom?: RailTier
  metadata: Record<string, unknown>
}
```

---

## Scoring Engine

### Score Calculation

```
finalScore = baseScore * urgencyMultiplier * freshnessDecay * userRelevance
```

| Factor              | Source                                                                               |
| ------------------- | ------------------------------------------------------------------------------------ |
| `baseScore`         | Source system assigns (0-100). Revenue impact, safety, deadline proximity.           |
| `urgencyMultiplier` | Time-based. Approaches 2x as `expiresAt` nears. 1.0 if no expiry.                    |
| `freshnessDecay`    | Linear decay from 1.0 to 0.0 over `ttlMinutes`. Item auto-archives at 0.             |
| `userRelevance`     | 1.0 default. Boosted by user interaction patterns. Penalized by repeated dismissals. |

### Tier Promotion/Demotion Rules

| Condition                       | Action                                             |
| ------------------------------- | -------------------------------------------------- |
| Score rises above tier ceiling  | Promote to higher tier                             |
| Score drops below tier floor    | Demote to lower tier                               |
| `expiresAt` within 2 hours      | Force-promote to Critical                          |
| User snoozes                    | Remove from view, re-surface after snooze duration |
| User acts (clicks action)       | Mark `acted`, keep visible until `resolved`        |
| Source system resolves          | Mark `resolved`, fade out, archive after 5 min     |
| TTL expires with no interaction | Mark `expired`, archive                            |

### Tier Score Thresholds

| Tier        | Score Floor | Score Ceiling |
| ----------- | ----------- | ------------- |
| Critical    | 80          | 100           |
| Action      | 50          | 79            |
| Awareness   | 20          | 49            |
| Opportunity | 0           | 19            |

---

## Visibility Rules

Rule of thumb: **pinned = "if the chef/consumer ignores this, something bad happens or they bounce."** Everything else earns attention by score, not by position.

### Dashboard Rail Visibility

| Tier        | Always Visible          | Behavior                                                                                           | Rationale                                                  |
| ----------- | ----------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Critical    | YES, pinned             | Never scrolls off. Always rendered at top.                                                         | Revenue/safety/time-sensitive. Chef must never miss these. |
| Action      | YES, lane header pinned | Lane header always visible; items scroll horizontally within. Empty state shows "All clear" badge. | Chef needs to know actions exist even when items overflow. |
| Awareness   | NO                      | Scrolls off vertically below the fold.                                                             | Defer-able. Chef looks when they have breathing room.      |
| Opportunity | NO                      | Scrolls off vertically. Collapses entirely on mobile.                                              | Nice-to-know. Lowest urgency.                              |

When Critical is empty (good day), Action becomes the visual anchor. Two tiers always visible = one thing to act on is always in view without overwhelming.

### Discovery Rail Visibility (Public)

| Lane           | Always Visible | Behavior                                  | Rationale                                                                                |
| -------------- | -------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| Taste          | YES, first row | Sticky pill rail at top. Always rendered. | Primary browsing entry. Consumer lands, sees food intent immediately. Bounce prevention. |
| Occasion       | NO             | Scrolls below Taste.                      | Planning-mode users scroll to it; casual browsers don't need it above fold.              |
| ChefFlow Picks | NO             | Scrolls below Occasion.                   | Curation for return visitors; new visitors haven't earned this context yet.              |

**Mobile:** Only Taste stays pinned as sticky horizontal pills. Everything else lives in the scrollable Mobile Projection composite.

---

## Density Caps (Apple Pattern)

| Tier        | Max Visible | Overflow                            |
| ----------- | ----------- | ----------------------------------- |
| Critical    | 3           | "+N more" badge, expandable         |
| Action      | 8           | Horizontal scroll, last card = "+N" |
| Awareness   | 12          | Horizontal scroll, truncated        |
| Opportunity | 6           | Horizontal scroll, truncated        |

Overflow items still exist and score; they surface when higher-priority items resolve.

---

## Item Lifecycle

```
[source emits] -> surfaced -> seen -> acted -> resolved -> archived
                     |          |        |
                     |          |        +-> expired (TTL hit)
                     |          +-> snoozed -> (re-surfaces)
                     +-> expired (never seen, TTL hit) -> archived
```

### State Transitions

| From             | To       | Trigger                                  |
| ---------------- | -------- | ---------------------------------------- |
| surfaced         | seen     | Rail renders in viewport + 2s dwell      |
| seen             | acted    | User clicks/taps action                  |
| seen             | snoozed  | User explicitly snoozes                  |
| snoozed          | surfaced | Snooze timer expires                     |
| acted            | resolved | Source system confirms completion        |
| any              | expired  | `expiresAt` reached OR score decays to 0 |
| expired/resolved | archived | 5 min grace period passes                |

---

## Time Awareness

The scoring engine adjusts behavior by time of day:

| Window   | Behavior                                                     |
| -------- | ------------------------------------------------------------ |
| 5am-9am  | Boost Critical/Action scores 1.2x. Chef is planning the day. |
| 9am-5pm  | Normal scoring. Active work hours.                           |
| 5pm-10pm | Dampen Awareness/Opportunity 0.7x. Chef is cooking/serving.  |
| 10pm-5am | Only Critical surfaces. Everything else suppressed.          |

---

## Cross-Rail Signal Flow

Discovery Rail browsing generates Opportunity items for the Dashboard Rail:

| Discovery Signal                                        | Dashboard Opportunity Item                 |
| ------------------------------------------------------- | ------------------------------------------ |
| Consumer searches "Italian private chef [chef's area]"  | "Someone nearby searched for Italian chef" |
| Consumer saves chef profile                             | "New profile save from [city]"             |
| Consumer starts planning brief matching chef's services | "Planning brief matches your availability" |

These flow through CIL (Continuous Intelligence Layer) as signals, scored low (10-19) so they land in Opportunity tier.

---

## Source Integration Points

| Source System        | Item Types                                        | Default Tier    |
| -------------------- | ------------------------------------------------- | --------------- |
| Event FSM            | Overdue actions, upcoming deadlines               | Critical/Action |
| Client Communication | Unanswered messages, follow-up due                | Action          |
| Finance/Invoices     | Overdue payments, pending deposits                | Critical/Action |
| CIL signals          | Price drops, birthdays, patterns                  | Opportunity     |
| PIE                  | Market price movements                            | Opportunity     |
| Remy                 | Auto-handled notifications, drafts pending review | Awareness       |
| Onboarding           | Incomplete setup steps                            | Awareness       |
| Discovery            | Consumer browsing signals                         | Opportunity     |
| Staff/Scheduling     | Conflicts, availability gaps                      | Action          |

---

## Storage

No new tables. Rail items are **computed views** over existing state:

- Event deadlines: derived from `events` + `event_transitions`
- Payments: derived from `ledger_entries` + `invoices`
- Messages: derived from `messages` + `communication_logs`
- CIL signals: derived from CIL SQLite per-tenant store
- Discovery: derived from analytics events

A lightweight `rail_item_state` table tracks user interaction (seen/snoozed/dismissed) per item per user:

```sql
CREATE TABLE rail_item_state (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  item_key TEXT NOT NULL,        -- composite: source:entity_type:entity_id
  state TEXT NOT NULL DEFAULT 'surfaced',
  snoozed_until TIMESTAMPTZ,
  seen_at TIMESTAMPTZ,
  acted_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, user_id, item_key)
);
```

---

## Implementation Sequence

1. **Shared types** - `lib/rail/types.ts` (RailItem, RailTier, RailItemState, scoring interfaces)
2. **Scoring engine** - `lib/rail/scoring.ts` (pure functions, no DB)
3. **Source adapters** - `lib/rail/sources/*.ts` (one per source system, returns RailItem[])
4. **Aggregator** - `lib/rail/aggregator.ts` (collects from all sources, scores, sorts, caps)
5. **State tracker** - `lib/rail/state.ts` (reads/writes rail_item_state table)
6. **Migration** - `database/migrations/XXXX_rail_item_state.sql`
7. **Dashboard consumer** - wire aggregator into dashboard rail components
8. **Discovery consumer** - wire scoring into discovery rail ranking

---

## Success Criteria

- [ ] No rail tier ever shows more than its density cap
- [ ] Items auto-expire and disappear without manual cleanup
- [ ] Snooze works: item vanishes, re-appears after duration
- [ ] Time-of-day dampening measurably reduces noise at night
- [ ] Score decay prevents week-old items from persisting
- [ ] Cross-rail signals flow from Discovery to Dashboard Opportunity
- [ ] Both Dashboard Rail and Discovery Rail consume the same RailItem type
