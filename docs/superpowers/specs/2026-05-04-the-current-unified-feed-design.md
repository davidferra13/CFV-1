# The Current: Unified Operational Feed

## Problem

ChefFlow has 6 independent "what to do next" systems, all answering the same question without coordination:

| System              | What It Produces                 | Where It Shows               |
| ------------------- | -------------------------------- | ---------------------------- |
| Priority Queue      | Scored QueueItems (0-1000)       | ResolveNextCard + queue list |
| Decision Queue      | Ranked DecisionQueueItems        | Decision queue section       |
| Action Layer        | 20+ SurfaceActionTask types      | 16 action surface cards      |
| Client Pulse        | PulseItems per client            | Pulse summary section        |
| Next Best Action    | NextBestAction per client        | Relationship action cards    |
| Completion Contract | CompletionResult with nextAction | Completion summary widget    |

Additionally, CIL computes 6 insight patterns hourly but only feeds them to Remy's prompt, never to the chef directly.

The dashboard is ~2000 lines with 30+ widgets. For a chef (especially one with ADHD), this creates decision paralysis instead of clarity.

## Solution

One unified ranking layer (`lib/current/`) that:

1. Pulls candidates from all 6 systems + CIL
2. Normalizes them into a single `CurrentUnit` type
3. Applies one priority function
4. Returns a single ordered list

One feed component (`components/current/`) that replaces the widget sprawl with a focused "top N" view.

## Architecture

```
Priority Queue ──┐
Decision Queue ──┤
Action Layer ────┤
Client Pulse ────┼──► Collectors ──► CurrentUnit[] ──► Ranker ──► Suppressor ──► Ordered Feed
Next Best Action─┤
Completion ──────┤
CIL Insights ────┘
```

### CurrentUnit Type

```typescript
type CurrentCategory = 'money' | 'prep' | 'communication' | 'completion' | 'growth' | 'optimization'

type CurrentUrgency = 'critical' | 'high' | 'normal' | 'low'

interface CurrentUnit {
  id: string // source:entityType:entityId
  category: CurrentCategory
  urgency: CurrentUrgency
  title: string
  description: string
  href: string
  actions: CurrentAction[] // 1-3 actions, first is primary
  score: number // 0-1000 after ranking
  source: string // which system produced this
  entityId: string // for dedup
  entityType: string // for dedup
  contextLines: string[] // supporting info
  estimatedMinutes: number | null // effort signal
  dueAt: Date | null // deadline signal
  revenueCents: number | null // revenue signal
  createdAt: Date
}

interface CurrentAction {
  label: string
  href: string
  inline: boolean // V1: always false (navigate only)
}
```

### Collectors

Seven collector functions, each adapting one source system:

| Collector                   | Input Function         | Maps To                                    |
| --------------------------- | ---------------------- | ------------------------------------------ |
| `collectFromPriorityQueue`  | `getPriorityQueue()`   | QueueItem -> CurrentUnit                   |
| `collectFromDecisionQueue`  | `getDecisionQueue()`   | DecisionQueueItem -> CurrentUnit           |
| `collectFromActionLayer`    | (resolve\* functions)  | SurfaceActionTask -> CurrentUnit           |
| `collectFromClientPulse`    | `getClientPulse()`     | PulseItem -> CurrentUnit                   |
| `collectFromNextBestAction` | `getNextBestActions()` | NextBestAction -> CurrentUnit              |
| `collectFromCompletion`     | `evaluateCompletion()` | CompletionResult.nextAction -> CurrentUnit |
| `collectFromCIL`            | `getCILInsights()`     | CILInsight -> CurrentUnit                  |

Category mapping:

- Priority Queue domain -> category: inquiry/message -> communication, quote/financial -> money, event -> prep, culinary -> completion, post_event -> completion, client -> communication, network -> growth
- Client Pulse: always communication
- Next Best Action: booking_blocker/follow_up_quote -> money, reply_inquiry -> communication, re_engage/reach_out -> growth, others -> communication
- Completion: always completion
- CIL insights: opportunity -> growth, gap/drift -> optimization, anomaly -> communication, milestone -> optimization

Urgency normalization:

- Client Pulse: critical -> critical, overdue -> high, due -> normal, ok -> low
- CIL severity: high -> normal, medium -> low, low -> low (CIL is never urgent)

### Deduplication

Same entity can appear in multiple systems (e.g., an unanswered inquiry shows up in Priority Queue, Client Pulse, AND Decision Queue). Dedup by `entityType:entityId`, keeping the highest-scored version.

### Ranking Function

Five weighted signals, scored 0-1000:

```
finalScore = (deadlineScore * 0.35) + (revenueScore * 0.25) + (effortScore * 0.20) + (momentumScore * 0.10) + (freshnessScore * 0.10)
```

**deadlineScore (0-1000, weight 0.35):**

- No due date: 200 (neutral)
- Due in >7 days: 300
- Due in 3-7 days: 500
- Due in 1-3 days: 700
- Due in <24 hours: 900
- Overdue: 1000

**revenueScore (0-1000, weight 0.25):**

- No revenue tied: 200
- <$100: 300
- $100-$500: 500
- $500-$2000: 700
- > $2000: 900

**effortScore (0-1000, weight 0.20):**

- Unknown effort: 500
- <2 min: 900 (quick wins surface)
- 2-10 min: 700
- 10-30 min: 400
- > 30 min: 200

**momentumScore (0-1000, weight 0.10):**

- V1: always 500 (no behavioral tracking yet)

**freshnessScore (0-1000, weight 0.10):**

- Created <1 hour ago: 900
- Created 1-24 hours ago: 700
- Created 1-3 days ago: 500
- Created 3-7 days ago: 300
- Created >7 days ago: 100

### Suppression Rules

Applied after ranking, before output:

1. **Entity cooldown**: same entityId can't appear twice in output
2. **Category interleave**: max 2 consecutive units from same category
3. **Source diversity**: max 3 units from same source system in top 10
4. **Dismissed cooldown**: units dismissed by chef don't reappear for 24 hours (requires a small `current_dismissals` table or localStorage)

### Growth Mode

When fewer than 3 units exceed score threshold of 300:

- CIL insights get a +200 score boost
- Optimization-category units get a +150 boost
- Growth-category units get a +100 boost

This ensures the feed is never empty. When nothing is urgent, it shifts to improvement opportunities.

## Dashboard Integration

### V1 Approach: Additive, Not Destructive

The Current appears as a new section at the top of the dashboard, ABOVE the existing widgets. Existing widgets remain but are collapsed into a "Details" accordion below.

This is safer than removing widgets because:

- We can validate The Current works before removing anything
- Chef can still access the detailed views
- No risk of hiding data the chef relies on

### Feed Component

```
┌─────────────────────────────────────────┐
│  The Current              "3 items"     │
├─────────────────────────────────────────┤
│ ★ Reply to Sarah's inquiry             │
│   Waiting 2 days, 6-guest dinner       │
│   [Reply Now]                           │
├─────────────────────────────────────────┤
│ ○ Finalize Saturday menu               │
│   Missing dessert course, event in 3d  │
│   [Open Menu]                           │
├─────────────────────────────────────────┤
│ ○ Collect balance from Martinez event   │
│   $450 outstanding, 12 days            │
│   [Record Payment]                      │
├─────────────────────────────────────────┤
│          Show more (7 items)            │
└─────────────────────────────────────────┘
```

Top 3 visible. Expandable to full list. Each unit shows: title, description/context, primary action button.

## File Structure

```
lib/current/
  types.ts              -- CurrentUnit, CurrentAction, CurrentCategory types
  collect.ts            -- collectAll() orchestrator
  collectors/
    priority-queue.ts   -- adapt QueueItem -> CurrentUnit
    decision-queue.ts   -- adapt DecisionQueueItem -> CurrentUnit
    action-layer.ts     -- adapt SurfaceActionTask -> CurrentUnit
    client-pulse.ts     -- adapt PulseItem -> CurrentUnit
    next-best-action.ts -- adapt NextBestAction -> CurrentUnit
    completion.ts       -- adapt CompletionResult -> CurrentUnit
    cil.ts              -- adapt CILInsight -> CurrentUnit
  rank.ts               -- priority function
  suppress.ts           -- dedup, interleave, cooldown
  actions.ts            -- 'use server' entry point: getCurrentFeed()
components/current/
  current-feed.tsx      -- server component, calls getCurrentFeed()
  current-unit-card.tsx -- renders one CurrentUnit
```

## What This Does NOT Include (V2+)

- Inline actions (V1 navigates only)
- Behavioral state inference (busy/idle/pre-event/overwhelmed)
- Momentum alignment scoring (V1 uses neutral 500)
- Adaptation layer (learning from patterns)
- Dismiss persistence (V1 uses session-only state)
- Full-screen feed mode
- CIL insight click-through detail views

## Success Criteria

- Feed renders top 3 items on dashboard
- Items come from all active source systems
- Ranking feels correct (deadlines first, quick wins interleaved, no noise)
- No duplicate entities in feed
- Growth mode activates when nothing urgent
- Existing dashboard widgets still accessible below
