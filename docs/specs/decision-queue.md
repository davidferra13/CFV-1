# Decision Queue - Build Spec

## What This Is

A single ranked list of "do this now" decisions, composing three existing systems into one server action + one dashboard widget. Read-only. No schema changes. No mutations.

## Why

ChefFlow has three independent systems that answer "what needs attention":

- **Work Surface** (`lib/workflow/preparable-actions.ts`) - event-scoped work items (blocked/preparable/optional)
- **Next Best Actions** (`lib/clients/next-best-action.ts`) - client-scoped actions (booking blockers, health, interactions)
- **Proactive Alerts** (`lib/intelligence/proactive-alerts.ts`) - cross-cutting alerts (overdue payments, stale inquiries, upcoming events)

Each renders as a separate dashboard widget. A chef with 6 active dinners sees 3 widgets with overlapping information but no single "here are your top 5 decisions" list. This is the gap.

## What to Build

### File 1: `lib/decision-queue/actions.ts`

A `'use server'` file that composes the three existing systems into one ranked list.

```typescript
'use server'

import { getPreparableActions } from '@/lib/workflow/actions'
import { getNextBestActions } from '@/lib/clients/next-best-action'
import { getProactiveAlerts } from '@/lib/intelligence/proactive-alerts'

export interface DecisionQueueItem {
  id: string
  rank: number
  title: string
  description: string
  href: string | null
  urgency: 'critical' | 'high' | 'normal' | 'low'
  source: 'work_surface' | 'next_best_action' | 'proactive_alert'
  context: string // e.g. "Event: Birthday Dinner" or "Client: Jane Smith"
  category: string // e.g. "menu", "payment", "inquiry", "prep"
}

export interface DecisionQueueResult {
  items: DecisionQueueItem[]
  totalCount: number
  criticalCount: number
}

export async function getDecisionQueue(): Promise<DecisionQueueResult> {
  // ... implementation below
}
```

#### Implementation Rules

1. Call all three sources in parallel with `Promise.allSettled` (not `Promise.all` - if one fails, the others still work).

2. **Map Work Surface items** (`WorkItem[]` from `getPreparableActions()`):
   - `urgency`: `fragile` -> `critical`, `normal` -> `high`, `low` -> `normal`
   - `category`: derive from `stage` field (e.g. `menu_development` -> `menu`, `grocery_list` -> `procurement`, `financial_commitment` -> `payment`)
   - `context`: `"Event: ${item.eventOccasion}"` or `"Event: ${item.clientName}"` if no occasion
   - `href`: build from event ID: `/events/${item.eventId}`
   - Only include items where `category === 'blocked'` or `category === 'preparable'` (skip `optional_early`)
   - `id`: use the WorkItem's existing `id` field

3. **Map Next Best Actions** (`NextBestAction[]` from `getNextBestActions()`):
   - `urgency`: map directly from `NextBestAction.urgency` (`critical` -> `critical`, `high` -> `high`, `normal` -> `normal`, `low` -> `low`)
   - `category`: derive from `actionType` field (e.g. `respond_inquiry` -> `inquiry`, `send_proposal` -> `proposal`, `collect_payment` -> `payment`, etc. - use the first word as fallback)
   - `context`: `"Client: ${action.clientName}"`
   - `href`: use `action.href`
   - `id`: `nba:${action.clientId}:${action.actionType}`

4. **Map Proactive Alerts** (`ProactiveAlert[]` from `getProactiveAlerts()`):
   - `urgency`: `critical` -> `critical`, `warning` -> `high`, `opportunity` -> `normal`, `info` -> `low`
   - `category`: use `alert.category`
   - `context`: use `alert.title`
   - `href`: use `alert.link`
   - `id`: use `alert.id`

5. **Deduplication**: If a Work Surface item and a Next Best Action reference the same event ID (extract from href), keep only the higher-urgency one. Use the `id` field to deduplicate.

6. **Sorting**: Sort by urgency (critical first, then high, normal, low). Within same urgency, sort by source priority: `proactive_alert` > `work_surface` > `next_best_action`. Assign `rank` (1-based) after sorting.

7. **Limit**: Return at most 15 items. Set `totalCount` to the pre-limit count.

### File 2: `components/dashboard/decision-queue-widget.tsx`

A client component that renders the decision queue as a compact list.

```typescript
'use client'

import type { DecisionQueueResult } from '@/lib/decision-queue/actions'

interface DecisionQueueWidgetProps {
  data: DecisionQueueResult
}
```

#### UI Rules

1. Render as a vertical list inside a card with header "Decide Now" and a count badge showing `criticalCount` if > 0.

2. Each item is a row with:
   - Left: colored urgency dot (red=critical, amber=high, blue=normal, gray=low)
   - Title (bold, truncated to 1 line)
   - Context (muted text, small)
   - Right: if `href` is not null, a `<Link>` arrow icon to navigate

3. If `items.length === 0`, show "All clear. Nothing needs a decision right now." in muted text.

4. Max 7 items visible by default. If more than 7, show a "Show all ({totalCount})" toggle that expands the list.

5. Use existing UI components:
   - Card wrapper: use the pattern from other dashboard widgets (look at `components/dashboard/widget-cards/list-card.tsx` for reference)
   - Use `Link` from `next/link` for navigation
   - Use Tailwind classes consistent with the rest of the dashboard
   - Use `ArrowRight` or `ChevronRight` from `@/components/ui/icons` for the nav arrow

### File 3: Integration into Dashboard

In `app/(chef)/dashboard/page.tsx`, add the `DecisionQueueWidget` to the dashboard.

**IMPORTANT: Make the SMALLEST possible change to the dashboard page.**

1. Import `getDecisionQueue` from `@/lib/decision-queue/actions`
2. Import `DecisionQueueWidget` from `@/components/dashboard/decision-queue-widget`
3. Add the data fetch to the existing parallel data fetching (find where other data is fetched with `Promise.all` or sequential awaits)
4. Render `<DecisionQueueWidget data={decisionQueueData} />` ABOVE the existing `ResolveNextCard` (which is currently the top-priority single action). The Decision Queue is the ranked list; ResolveNextCard remains the single "do this one thing" card.
5. Wrap in `<Suspense>` with `<WidgetCardSkeleton />` fallback, matching the pattern of other widgets.

## DO NOT

- Do NOT create any database tables or migrations
- Do NOT modify `lib/workflow/preparable-actions.ts`, `lib/clients/next-best-action.ts`, or `lib/intelligence/proactive-alerts.ts` - these are inputs, not outputs
- Do NOT add any mutations or write operations
- Do NOT remove or replace existing dashboard widgets - this is ADDITIVE
- Do NOT use AI/Ollama/LLM for anything
- Do NOT add `@ts-nocheck` to any file
- Do NOT use em dashes in any text (use commas, semicolons, or colons instead)

## How to Verify

1. `npx tsc --noEmit --skipLibCheck` must pass
2. `npx next build --no-lint` must pass
3. The dashboard should render the new widget without errors
4. If all three source systems return empty, the widget shows the "All clear" state

## Key Files to READ (do not modify)

- `lib/workflow/types.ts` - WorkItem, WorkCategory, WorkUrgency types
- `lib/workflow/actions.ts` - getPreparableActions() signature
- `lib/clients/next-best-action.ts` - getNextBestActions() signature and NextBestAction type
- `lib/intelligence/proactive-alerts.ts` - getProactiveAlerts() signature and ProactiveAlert type
- `components/dashboard/widget-cards/list-card.tsx` - UI pattern reference
- `app/(chef)/dashboard/page.tsx` - where to integrate (read first, understand layout)
