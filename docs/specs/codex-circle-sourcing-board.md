---
title: Circle Sourcing Board
status: ready
agent: codex
scope: medium
risk: low
---

# Circle Sourcing Board

## Purpose

Add a "Sourcing" tab to the chef-side circle detail page (`/circles/[id]`). This tab shows all ingredients needed across the circle's linked events, their lifecycle status (needed, partially sourced, fully sourced), and preferred vendor. Data comes from the existing `event_ingredient_lifecycle` SQL view.

This is the command center for provenance-driven chefs: one place to see every ingredient across every dinner in the circle.

## Background

### Existing Infrastructure (DO NOT recreate)

- **`event_ingredient_lifecycle` SQL VIEW** (migration `20260417000002`): Already computes recipe_qty, buy_qty, purchased_qty, used_qty, computed_leftover_qty per ingredient per event. This is the data source.
- **`ingredients` table**: Has `preferred_vendor` TEXT column for each ingredient.
- **`circle-detail-actions.ts`**: Server actions for the circle detail page. Uses `'use server'` directive. Uses `createServerClient({ admin: true })` with the compat layer (`.from().select().eq()` pattern).
- **`circle-detail-client.tsx`**: Client component with 4 tabs: overview, members, events, messages. Uses `type Tab` union and `tabs` array.

### Data Flow

```
hub_group_events (linked events)
  -> event_ingredient_lifecycle VIEW (ingredient quantities per event)
  -> ingredients table (preferred_vendor)
  -> CircleSourcingBoard component (renders table)
```

## Files to Create

### 1. `components/circles/circle-sourcing-board.tsx`

Create this directory and file. Write this exact content:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { getCircleSourcingData, type CircleSourcingItem } from '@/lib/hub/circle-detail-actions'

interface SourcingBoardProps {
  circleId: string
}

export function CircleSourcingBoard({ circleId }: SourcingBoardProps) {
  const [data, setData] = useState<CircleSourcingItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCircleSourcingData(circleId)
      .then((result) => {
        setData(result)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [circleId])

  if (loading) {
    return (
      <div className="rounded-xl border border-stone-700 bg-stone-800/50 p-8 text-center text-sm text-stone-400">
        Loading sourcing data...
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-stone-700 bg-stone-800/50 p-8 text-center text-sm text-stone-400">
        No ingredients found. Link events with menus to see sourcing data.
      </div>
    )
  }

  const byEvent = data.reduce<Record<string, { title: string; items: CircleSourcingItem[] }>>(
    (acc, item) => {
      if (!acc[item.event_id]) {
        acc[item.event_id] = { title: item.event_title, items: [] }
      }
      acc[item.event_id].items.push(item)
      return acc
    },
    {}
  )

  const totalIngredients = data.length
  const sourcedCount = data.filter(
    (d) => Number(d.purchased_qty) >= Number(d.buy_qty) && Number(d.buy_qty) > 0
  ).length

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex items-center gap-4 rounded-xl border border-stone-700 bg-stone-800/50 p-4">
        <div>
          <div className="text-2xl font-bold text-stone-100">
            {sourcedCount}/{totalIngredients}
          </div>
          <div className="text-xs text-stone-400">Ingredients Sourced</div>
        </div>
        <div className="h-8 w-px bg-stone-700" />
        <div className="flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-stone-700">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{
                width: `${totalIngredients > 0 ? (sourcedCount / totalIngredients) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Per-event tables */}
      {Object.entries(byEvent).map(([eventId, group]) => (
        <div key={eventId} className="rounded-xl border border-stone-700 bg-stone-800/50 p-4">
          <h3 className="mb-3 text-sm font-semibold text-stone-200">{group.title}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700 text-left text-xs text-stone-400">
                  <th className="pb-2 pr-4">Ingredient</th>
                  <th className="pb-2 pr-4">Need</th>
                  <th className="pb-2 pr-4">Purchased</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Vendor</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item) => {
                  const buyQty = Number(item.buy_qty)
                  const purchasedQty = Number(item.purchased_qty)
                  const status =
                    buyQty > 0 && purchasedQty >= buyQty
                      ? 'sourced'
                      : purchasedQty > 0
                        ? 'partial'
                        : 'needed'
                  return (
                    <tr key={item.ingredient_id} className="border-b border-stone-800">
                      <td className="py-2 pr-4 font-medium text-stone-200">
                        {item.ingredient_name}
                      </td>
                      <td className="py-2 pr-4 text-stone-300">
                        {buyQty.toFixed(1)} {item.unit}
                      </td>
                      <td className="py-2 pr-4 text-stone-300">
                        {purchasedQty.toFixed(1)} {item.unit}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            status === 'sourced'
                              ? 'bg-emerald-900/50 text-emerald-300'
                              : status === 'partial'
                                ? 'bg-amber-900/50 text-amber-300'
                                : 'bg-red-900/50 text-red-300'
                          }`}
                        >
                          {status === 'sourced'
                            ? 'Sourced'
                            : status === 'partial'
                              ? 'Partial'
                              : 'Needed'}
                        </span>
                      </td>
                      <td className="py-2 text-stone-400">{item.preferred_vendor || '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
```

## Files to Modify

### 2. `lib/hub/circle-detail-actions.ts`

This file starts with `'use server'` and already exports `CircleDetail`, `getCircleDetail`, `addClientToCircle`, etc.

**ADD** the following interface and function to the END of the file (after all existing exports). Do not change any existing code.

```typescript
// ─── SOURCING DATA ────────────────────────────────────────────

export interface CircleSourcingItem {
  event_id: string
  event_title: string
  ingredient_id: string
  ingredient_name: string
  unit: string
  recipe_qty: string
  buy_qty: string
  purchased_qty: string
  used_qty: string
  computed_leftover_qty: string
  preferred_vendor: string | null
}

/**
 * Get ingredient lifecycle data across all events linked to a circle.
 * Uses the event_ingredient_lifecycle SQL view.
 */
export async function getCircleSourcingData(circleId: string): Promise<CircleSourcingItem[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient({ admin: true })

  // 1. Get linked event IDs for this circle
  const { data: eventLinks } = await db
    .from('hub_group_events')
    .select('event_id')
    .eq('group_id', circleId)

  const eventIds = (eventLinks ?? []).map((e: any) => e.event_id)
  if (eventIds.length === 0) return []

  // 2. Get event titles (verify tenant ownership)
  const { data: events } = await db
    .from('events')
    .select('id, title')
    .in('id', eventIds)
    .eq('tenant_id', tenantId)

  const titleMap: Record<string, string> = {}
  for (const e of events ?? []) {
    titleMap[e.id] = e.title
  }

  // Filter to only tenant-owned events
  const ownedEventIds = Object.keys(titleMap)
  if (ownedEventIds.length === 0) return []

  // 3. Get lifecycle data from the view
  const { data: lifecycle } = await db
    .from('event_ingredient_lifecycle')
    .select('*')
    .in('event_id', ownedEventIds)

  if (!lifecycle || lifecycle.length === 0) return []

  // 4. Get preferred vendors from ingredients table
  const ingredientIds = [...new Set((lifecycle as any[]).map((l: any) => l.ingredient_id))]
  let vendorMap: Record<string, string | null> = {}

  if (ingredientIds.length > 0) {
    const { data: ingredients } = await db
      .from('ingredients')
      .select('id, preferred_vendor')
      .in('id', ingredientIds)

    for (const ing of ingredients ?? []) {
      vendorMap[ing.id] = ing.preferred_vendor ?? null
    }
  }

  // 5. Combine into result
  return (lifecycle as any[]).map((l: any) => ({
    event_id: l.event_id,
    event_title: titleMap[l.event_id] ?? 'Unknown Event',
    ingredient_id: l.ingredient_id,
    ingredient_name: l.ingredient_name,
    unit: l.unit,
    recipe_qty: l.recipe_qty,
    buy_qty: l.buy_qty,
    purchased_qty: l.purchased_qty,
    used_qty: l.used_qty,
    computed_leftover_qty: l.computed_leftover_qty,
    preferred_vendor: vendorMap[l.ingredient_id] ?? null,
  }))
}
```

### 3. `app/(chef)/circles/[id]/circle-detail-client.tsx`

Make these FOUR precise edits. Each edit has a unique "before" string and an "after" string.

**Edit A: Add import** (near top of file, after existing imports)

Find this exact line:

```
import type { CircleDetail } from '@/lib/hub/circle-detail-actions'
```

Replace with:

```
import type { CircleDetail } from '@/lib/hub/circle-detail-actions'
import { CircleSourcingBoard } from '@/components/circles/circle-sourcing-board'
```

**Edit B: Expand Tab type**

Find this exact line:

```
type Tab = 'overview' | 'members' | 'events' | 'messages'
```

Replace with:

```
type Tab = 'overview' | 'members' | 'events' | 'sourcing' | 'messages'
```

**Edit C: Add tab button to tabs array**

Find these exact two lines:

```
    { key: 'events', label: 'Events', count: circle.events.length },
    { key: 'messages', label: 'Messages', count: circle.message_count },
```

Replace with:

```
    { key: 'events', label: 'Events', count: circle.events.length },
    { key: 'sourcing', label: 'Sourcing' },
    { key: 'messages', label: 'Messages', count: circle.message_count },
```

**Edit D: Add tab content rendering**

Find these exact two lines:

```
      {tab === 'events' && <EventsTab circle={circle} />}
      {tab === 'messages' && <MessagesTab circle={circle} />}
```

Replace with:

```
      {tab === 'events' && <EventsTab circle={circle} />}
      {tab === 'sourcing' && <CircleSourcingBoard circleId={circle.id} />}
      {tab === 'messages' && <MessagesTab circle={circle} />}
```

## DO NOT

- Do NOT modify any files not listed above (no page.tsx, no layout, no other actions files)
- Do NOT modify `types/database.ts`
- Do NOT create new database tables or migrations
- Do NOT add any new npm dependencies
- Do NOT modify existing functions in `circle-detail-actions.ts` (only append new code)
- Do NOT change the existing tab behavior or styling
- Do NOT add loading spinners, skeletons, or animations beyond what is specified
- Do NOT use `useTransition` or `startTransition` (this is read-only data, not a mutation)
- Do NOT add error toasts (silent failure to empty state is fine for read-only data)

## Verification

1. `npx tsc --noEmit --skipLibCheck` must pass
2. The import paths must resolve:
   - `@/lib/hub/circle-detail-actions` (existing file)
   - `@/components/circles/circle-sourcing-board` (new file)
3. The `CircleSourcingBoard` component must accept `circleId: string` prop
4. The `getCircleSourcingData` function must be exported from circle-detail-actions.ts

## Commit

```
feat(circles): add Sourcing tab to circle detail page

Shows ingredient lifecycle data across linked events with
sourcing status (needed/partial/sourced) and preferred vendor.
Uses existing event_ingredient_lifecycle SQL view.
```
