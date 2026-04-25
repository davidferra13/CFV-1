# Event Ops Hub - Build Spec

## What This Is

A single per-event page at `/events/[id]/ops` that chains Menu -> Shopping List -> Prep Timeline into one read-only view. No schema changes. No mutations. Composition of existing server actions.

## Why

ChefFlow has all three operational systems built independently:

- Shopping list generation (`lib/culinary/shopping-list-actions.ts`)
- Prep timeline computation (`lib/prep-timeline/compute-timeline.ts`)
- Vendor sourcing (`lib/vendors/sourcing-actions.ts`)

But a chef must visit 3 different pages to see them. For a chef managing 6+ events, this creates cognitive overhead. The ops hub puts all operational data for one event on one page.

## What to Build

### File 1: `lib/events/ops-hub-actions.ts`

A `'use server'` file that fetches all operational data for a single event.

```typescript
'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export interface OpsHubData {
  event: {
    id: string
    occasion: string | null
    event_date: string
    serve_time: string | null
    guest_count: number
    status: string
    client_name: string | null
    location_address: string | null
  }
  menu: {
    id: string
    name: string
    dishes: { id: string; name: string; course_number: number; recipe_id: string | null }[]
  } | null
  shopping: {
    items: ShoppingListItem[]
    totalEstimatedCostCents: number
  }
  prep: {
    days: PrepDay[]
    totalPrepMinutes: number
  } | null
}

export async function getEventOpsHub(eventId: string): Promise<OpsHubData | null> {
  // ... implementation below
}
```

#### Implementation Rules

1. **Auth + tenant scoping**: Use `requireChef()` to get user. Query event with `WHERE id = $eventId AND tenant_id = $tenantId`. Return `null` if not found.

2. **Event data**: Fetch the event row. Join with clients table to get `client_name` (use `full_name` from clients table, joined on `events.client_id = clients.id`).

3. **Menu data**: Query `menus` where `event_id = $eventId AND tenant_id = $tenantId`. Take the first one (an event typically has one menu). If found, query `dishes` where `menu_id = menu.id` ordered by `course_number`. For each dish, include `recipe_id` if a recipe is linked.

4. **Shopping list**: Call the existing `generateShoppingList()` from `lib/culinary/shopping-list-actions.ts`. Pass the event date as both `startDate` and `endDate`, and `eventIds: [eventId]`. Extract `items` and `totalEstimatedCostCents` from the result.
   - IMPORTANT: `generateShoppingList` already handles auth internally. But it may throw if the event has no menu or no recipes. Wrap in try/catch and return `{ items: [], totalEstimatedCostCents: 0 }` on failure.

5. **Prep timeline**: The prep timeline requires recipe data. Use the existing `computePrepTimeline()` from `lib/prep-timeline/compute-timeline.ts`. This is a PURE FUNCTION that takes recipe/component data and a service date/time. You need to:
   - Fetch recipes linked to the menu's dishes (via `dishes.recipe_id` or via `components.recipe_id`)
   - Fetch components for each dish from the `components` table
   - For each component with a `recipe_id`, fetch the recipe's `peak_hours_min`, `peak_hours_max`, `safety_hours_max`, `storage_method`, `freezable`, `frozen_extends_hours`, `prep_time_minutes`, `active_minutes`, `passive_minutes` from the recipe or use defaults
   - Call `computePrepTimeline()` with the assembled data and event's serve date/time
   - If the event has no menu or no recipes, set `prep` to `null`
   - NOTE: Read the actual function signature of `computePrepTimeline` before implementing. The types are in `lib/prep-timeline/compute-timeline.ts`. Match exactly what it expects.

### File 2: `app/(chef)/events/[id]/ops/page.tsx`

A server component page.

```typescript
import { notFound } from 'next/navigation'
import { getEventOpsHub } from '@/lib/events/ops-hub-actions'
import { OpsHubView } from './ops-hub-view'

export default async function EventOpsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await getEventOpsHub(id)
  if (!data) notFound()
  return <OpsHubView data={data} />
}
```

### File 3: `app/(chef)/events/[id]/ops/ops-hub-view.tsx`

A `'use client'` component that renders three sections vertically.

#### UI Layout

```
[Header: Event name + date + guest count + status badge]

[Section 1: Menu Overview]
  - List of dishes grouped by course number
  - Each dish shows name, linked recipe indicator
  - If no menu: "No menu linked to this event yet" with link to /menus

[Section 2: Shopping List]
  - Table: Ingredient | Qty Needed | On Hand | To Buy | Est. Cost | Allergen Flags
  - Footer: total estimated cost
  - If empty: "Add recipes to your menu to generate a shopping list"

[Section 3: Prep Timeline]
  - List of prep days, each showing:
    - Date label (e.g. "Wednesday, Apr 22 - 3 days before")
    - Items to prep that day with prep time and symbols
  - If null: "Link recipes with prep data to generate a timeline"
```

#### UI Rules

1. Use existing components where possible:
   - `EventStatusBadge` from `@/components/events/event-status-badge` for status
   - Standard Tailwind card patterns (rounded-lg border bg-white p-6 shadow-sm)
   - Table with `<table className="w-full text-sm">` pattern

2. Format money as dollars: `(cents / 100).toFixed(2)` prefixed with `$`

3. Format dates using `date-fns` `format()` function (already a project dependency)

4. Allergen flags: render as small red badges next to ingredient names

5. Prep symbols: render as small emoji or text indicators:
   - `freezable` -> snowflake icon or text
   - `day_of` -> "Day-of" badge
   - `safety_warning` -> yellow warning indicator
   - `allergen` -> red allergen badge

6. Each section is collapsible (use a simple `useState` toggle with chevron). All start expanded.

7. Do NOT add navigation or tabs. This is a single scrollable page.

## DO NOT

- Do NOT create any database tables or migrations
- Do NOT modify any existing server actions or pages
- Do NOT modify the event detail page (`app/(chef)/events/[id]/page.tsx`)
- Do NOT add mutations or write operations (this is read-only)
- Do NOT use AI/Ollama/LLM
- Do NOT add `@ts-nocheck`
- Do NOT use em dashes in any text
- Do NOT touch auth, FSM, or financial logic
- Do NOT modify `computePrepTimeline` or `generateShoppingList` - call them as-is

## How to Verify

1. `npx tsc --noEmit --skipLibCheck` must pass
2. `npx next build --no-lint` must pass
3. Navigate to `/events/{any-event-id}/ops` - page should render without errors
4. If the event has no menu, sections 2 and 3 show empty states
5. If the event has a menu with recipes, all three sections populate

## Key Files to READ (do not modify)

- `lib/culinary/shopping-list-actions.ts` - `generateShoppingList()` function signature and `ShoppingListItem` type
- `lib/prep-timeline/compute-timeline.ts` - `computePrepTimeline()` function signature and input types
- `lib/vendors/sourcing-actions.ts` - `VendorCallCandidate` type (for reference, not used in v1)
- `app/(chef)/events/[id]/page.tsx` - reference for how event pages work (auth, data fetching pattern)
- `components/events/event-status-badge.tsx` - reuse for status display
- `lib/db/server.ts` - `createServerClient()` for DB access
- `lib/auth/get-user.ts` - `requireChef()` for auth
