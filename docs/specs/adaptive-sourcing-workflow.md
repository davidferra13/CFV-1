# Adaptive Sourcing Workflow

> Spec for Codex execution. Closes 3 gaps identified in the "Talia Green" supply-volatile chef stress test.

## Problem

Farm-to-table chefs source from local farms, weekly markets, and small producers. Ingredient availability changes constantly. ChefFlow has no workflow for:

1. **Logging sourcing events** (farm X ran out of arugula)
2. **Proposing substitutions through the Dinner Circle** (arugula -> watercress, client sees it)
3. **Tracking price tolerance** (cost drifted 12%, within 15% threshold, absorb silently)

The Dinner Circle `adaptive` config already has `availabilityItems` with per-ingredient status (`confirmed | flexible | pending | substitution_pending | unavailable`) but no server actions to manage them, no sourcing event log, and no substitution proposal flow.

## Solution

Extend the existing Dinner Circle adaptive config with sourcing workflow actions and a chef-side UI panel. No new database tables. All data stored in the existing `circle_config` JSONB column on `event_share_settings`.

---

## Deliverables (4 files)

### FILE 1: Modify `lib/dinner-circles/types.ts`

Add these 3 new types BEFORE the `DinnerCircleConfig` type definition (before line 152):

```ts
export type DinnerCircleSourcingEvent = {
  id: string
  ingredient: string
  previousStatus: DinnerCircleIngredientStatus
  newStatus: DinnerCircleIngredientStatus
  reason: string
  sourceName?: string
  loggedAt: string
}

export type DinnerCircleSubstitutionProposal = {
  id: string
  originalIngredient: string
  proposedSubstitute: string
  reason: string
  costDeltaCents: number | null
  status: 'proposed' | 'acknowledged' | 'flagged'
  proposedAt: string
  respondedAt?: string
  clientNote?: string
}

export type DinnerCirclePriceTolerance = {
  flexibilityPercent: number
  lastSnapshotCents: number | null
  currentEstimateCents: number | null
  driftPercent: number | null
  withinTolerance: boolean
}
```

Then extend the `adaptive` section inside `DinnerCircleConfig` (around line 196-204). Add these 3 optional fields to the existing `adaptive?` object:

```ts
adaptive?: {
  // ... existing fields stay unchanged ...
  availabilityItems: DinnerCircleAvailabilityItem[]
  clientExpectationNote: string
  changeWindowNote: string
  pricingAdjustmentPolicy: string
  substitutionValidationNotes: string
  finalValidationLocked: boolean
  finalValidationNotes: string
  // NEW fields:
  sourcingLog?: DinnerCircleSourcingEvent[]
  substitutionProposals?: DinnerCircleSubstitutionProposal[]
  priceFlexibilityPercent?: number
}
```

**DO NOT** change any existing types. Only add the 3 new type definitions and 3 new optional fields.

---

### FILE 2: Create `lib/dinner-circles/sourcing-actions.ts`

New file. Server actions for the adaptive sourcing workflow.

**Pattern to follow:** Copy the style of `lib/dinner-circles/actions.ts` (same imports, same auth pattern, same `upsertCircleConfig` helper reuse).

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getDinnerCircleConfig, normalizeDinnerCircleConfig } from './event-circle'
import type {
  DinnerCircleAvailabilityItem,
  DinnerCircleConfig,
  DinnerCircleIngredientStatus,
  DinnerCircleSourcingEvent,
  DinnerCircleSubstitutionProposal,
} from './types'
```

**Helper (copy from actions.ts):**

```ts
async function assertEventOwner(db: any, eventId: string, tenantId: string) {
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()
  if (!event) throw new Error('Event not found')
}

async function upsertCircleConfig(
  db: any,
  eventId: string,
  tenantId: string,
  config: DinnerCircleConfig
) {
  const { data: existing } = await db
    .from('event_share_settings')
    .select('id')
    .eq('event_id', eventId)
    .maybeSingle()

  if (existing) {
    const { error } = await db
      .from('event_share_settings')
      .update({ circle_config: config, updated_at: new Date().toISOString() })
      .eq('event_id', eventId)
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await db.from('event_share_settings').insert({
    event_id: eventId,
    tenant_id: tenantId,
    circle_config: config,
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(error.message)
}
```

**Exported functions (implement all 5):**

#### `logSourcingEvent`

```ts
export async function logSourcingEvent(
  eventId: string,
  input: {
    ingredient: string
    newStatus: DinnerCircleIngredientStatus
    reason: string
    sourceName?: string
  }
): Promise<{ success: true }>
```

Logic:

1. `requireChef()` for auth, get `tenantId`
2. `assertEventOwner(db, eventId, tenantId)`
3. `getDinnerCircleConfig(eventId)` to get current config
4. Find existing item in `config.adaptive.availabilityItems` matching `input.ingredient` (case-insensitive)
5. Record the previous status (or `'pending'` if item not found)
6. Update or create the availability item with the new status
7. Append a `DinnerCircleSourcingEvent` to `config.adaptive.sourcingLog` array (generate `id` with `crypto.randomUUID()`, set `loggedAt` to `new Date().toISOString()`, cap array at 100 entries)
8. If `newStatus` is `'unavailable'` or `'substitution_pending'`, fire a circle notification:
   ```ts
   try {
     const { circleFirstNotify } = await import('@/lib/hub/circle-first-notify')
     await circleFirstNotify({
       eventId,
       inquiryId: null,
       notificationType: 'menu_shared',
       body: `Sourcing update: ${input.ingredient} is now ${input.newStatus.replace(/_/g, ' ')}. ${input.reason}`,
       metadata: { ingredient: input.ingredient, status: input.newStatus },
       actionUrl: `/my-events/${eventId}`,
       actionLabel: 'View Event',
     })
   } catch (err) {
     console.error('[non-blocking] Circle notification failed', err)
   }
   ```
9. Save config via `upsertCircleConfig`
10. `revalidatePath(`/events/${eventId}`)`
11. Return `{ success: true }`

#### `proposeSubstitution`

```ts
export async function proposeSubstitution(
  eventId: string,
  input: {
    originalIngredient: string
    proposedSubstitute: string
    reason: string
  }
): Promise<{ success: true }>
```

Logic:

1. Auth + owner check
2. Get current config
3. Look up cost data for both ingredients from `ingredients` table (`last_price_cents` where `name ILIKE input.originalIngredient` and `name ILIKE input.proposedSubstitute`, scoped to tenant). Compute `costDeltaCents = substituteCost - originalCost` (null if either is missing).
4. Create a `DinnerCircleSubstitutionProposal` with `status: 'proposed'`, `id: crypto.randomUUID()`, `proposedAt: new Date().toISOString()`
5. Append to `config.adaptive.substitutionProposals` (cap at 50)
6. Update the matching availability item: set `status: 'substitution_pending'`, `substitution: input.proposedSubstitute`
7. Fire circle notification (non-blocking, same pattern as above):
   ```
   body: `Substitution proposed: ${input.originalIngredient} -> ${input.proposedSubstitute}. ${input.reason}`
   ```
8. Save config, revalidate, return `{ success: true }`

#### `respondToSubstitution`

```ts
export async function respondToSubstitution(
  eventId: string,
  proposalId: string,
  response: 'acknowledged' | 'flagged',
  clientNote?: string
): Promise<{ success: true }>
```

Logic:

1. Auth (use `requireAuth()` from `@/lib/auth/get-user` since clients can respond too)
2. Get current config
3. Find proposal in `config.adaptive.substitutionProposals` by `proposalId`
4. If not found, throw `new Error('Proposal not found')`
5. Update proposal: `status = response`, `respondedAt = new Date().toISOString()`, `clientNote`
6. If `response === 'acknowledged'`: update the matching availability item status to `'confirmed'`
7. If `response === 'flagged'`: update the matching availability item status to `'flexible'`
8. Save config, revalidate, return `{ success: true }`

#### `getAdaptiveSourcingStatus`

```ts
export async function getAdaptiveSourcingStatus(eventId: string): Promise<{
  availabilityItems: DinnerCircleAvailabilityItem[]
  sourcingLog: DinnerCircleSourcingEvent[]
  substitutionProposals: DinnerCircleSubstitutionProposal[]
  priceFlexibilityPercent: number
}>
```

Logic:

1. Auth + owner check
2. Get current config
3. Return the adaptive fields with defaults:
   - `availabilityItems: config.adaptive?.availabilityItems ?? []`
   - `sourcingLog: config.adaptive?.sourcingLog ?? []`
   - `substitutionProposals: config.adaptive?.substitutionProposals ?? []`
   - `priceFlexibilityPercent: config.adaptive?.priceFlexibilityPercent ?? 15`

#### `updatePriceFlexibility`

```ts
export async function updatePriceFlexibility(
  eventId: string,
  percent: number
): Promise<{ success: true }>
```

Logic:

1. Auth + owner check
2. Clamp `percent` to 0-50 range
3. Get current config, set `config.adaptive.priceFlexibilityPercent = percent`
4. Save config, revalidate, return `{ success: true }`

---

### FILE 3: Create `components/events/adaptive-sourcing-panel.tsx`

New client component. A card showing ingredient availability status with controls.

```
'use client'
```

**Props:**

```ts
type AdaptiveSourcingPanelProps = {
  eventId: string
}
```

**Behavior:**

1. On mount, call `getAdaptiveSourcingStatus(eventId)` to load data
2. Show a Card with header "Ingredient Sourcing"
3. If `availabilityItems` is empty, show a muted message: "No ingredients tracked yet. Attach a menu with recipes to populate."
4. If items exist, render a table/list:

| Ingredient        | Source     | Status                    | Action                                           |
| ----------------- | ---------- | ------------------------- | ------------------------------------------------ |
| Arugula           | Happy Farm | `confirmed` (green badge) | dropdown: confirmed/flexible/pending/unavailable |
| Heirloom Tomatoes | -          | `pending` (yellow badge)  | dropdown                                         |

5. Status badge colors:
   - `confirmed` = green (`bg-green-100 text-green-800`)
   - `flexible` = blue (`bg-blue-100 text-blue-800`)
   - `pending` = yellow (`bg-yellow-100 text-yellow-800`)
   - `substitution_pending` = orange (`bg-orange-100 text-orange-800`)
   - `unavailable` = red (`bg-red-100 text-red-800`)

6. When chef changes status via dropdown, call `logSourcingEvent` with a reason prompt (simple `window.prompt('Reason for change:')` or inline input)

7. When status is changed to `unavailable`, show a small inline form below the row:
   - "Propose Substitute" input + submit button
   - On submit, call `proposeSubstitution`

8. Below the table, show "Substitution Proposals" section if any exist:
   - Each proposal: "Arugula -> Watercress" with status badge and cost delta
   - Pending proposals show `(awaiting client)` label

9. Below proposals, show "Sourcing Log" as a compact timeline (last 10 entries):
   - "{ingredient}: {previousStatus} -> {newStatus} - {reason} ({relative time})"

10. At the bottom, show "Price Flexibility" slider or number input:
    - Label: "Acceptable price drift: +/- {percent}%"
    - Default: 15%
    - On change, call `updatePriceFlexibility`

**UI imports to use:**

- `import { Card } from '@/components/ui/card'`
- `import { Button } from '@/components/ui/button'`
- `import { Badge } from '@/components/ui/badge'`
- Badge variants: `default`, `success`, `warning`, `error`, `info` (these are the ONLY valid variants)

**State management:** Use `useState` for local state, `useTransition` for server action calls with loading states. Wrap action calls in `startTransition` with `try/catch` (mandatory per CLAUDE.md zero hallucination rule).

**DO NOT:**

- Import from `@/components/ui/select` or `@/components/ui/dropdown-menu` unless you verify they exist first. If unsure, use a native `<select>` element.
- Use `toast` unless you verify the import path. If unsure, use `console.error` for errors.
- Add any `@ts-nocheck` directives
- Import anything from files you haven't verified exist

---

### FILE 4: Modify `app/(chef)/events/[id]/_components/event-detail-ops-tab.tsx`

Two changes only:

**Change 1:** Add import at the top (after line 13, near the other component imports):

```ts
import { AdaptiveSourcingPanel } from '@/components/events/adaptive-sourcing-panel'
```

**Change 2:** Add the panel rendering. Insert BEFORE the Shopping Substitutions section (before line 205). The exact insertion point is after the Chef Collaboration section and Temperature panels, before Shopping Substitutions:

```tsx
{
  /* Adaptive Sourcing - ingredient availability tracking */
}
{
  event.status !== 'cancelled' && eventMenus && <AdaptiveSourcingPanel eventId={event.id} />
}
```

**DO NOT** change any other part of this file. Do not modify props, do not remove existing components, do not reorder anything.

---

## What NOT To Do

- **DO NOT** create any database migrations
- **DO NOT** modify `lib/dinner-circles/event-circle.ts` (the normalizer will handle new fields gracefully since they are optional)
- **DO NOT** modify `lib/dinner-circles/actions.ts`
- **DO NOT** modify `lib/hub/circle-first-notify.ts`
- **DO NOT** modify any event page files other than the ops tab
- **DO NOT** modify the public event page
- **DO NOT** add `@ts-nocheck` to any file
- **DO NOT** use em dashes anywhere (use commas, semicolons, or separate sentences)
- **DO NOT** reference "OpenClaw" in any user-facing strings
- **DO NOT** modify the event FSM, financial calculations, or menu lifecycle
- **DO NOT** add any new npm dependencies

## Test Criteria

1. `npx tsc --noEmit --skipLibCheck` passes
2. The new types compile without errors
3. The server actions import and export correctly
4. The UI component renders without crashing
5. No em dashes in any created/modified file

## Commit

When done, commit with message: `feat(circles): adaptive sourcing workflow for supply-volatile chefs`
