# Codex Spec: Weekly Cycle Retrospective View

> **Status:** ready-to-build
> **Priority:** P2 (data compounds over time)
> **Agent type:** Codex (additive-only, new files only)
> **Estimated scope:** 1 new server action file, 1 new page
> **Depends on:** Nothing (reads existing data, no modifications to existing code)

---

## Problem

After each weekly meal prep cycle, the chef loses all operational data. There is no summary of: what was cooked, for whom, which dishes clients loved vs disliked, revenue earned, containers out vs returned, or waste indicators. Improvement is slow because there is no feedback loop.

## What To Build

A read-only "Week Review" page at `/meal-prep/retro` that shows a retrospective for a given week. Pulls from `served_dish_history`, `meal_prep_weeks`, `recurring_invoices`, and `client_meal_requests` to build a unified weekly summary.

**This spec creates NEW files only. It does NOT modify any existing files.**

---

## Preparation: Read These Files First

Before writing ANY code, read these files to understand the data model:

1. `lib/db/schema/schema.ts` -- search for and read each table definition:
   - `served_dish_history` (line ~13445): has `tenant_id`, `client_id`, `dish_name`, `served_date`, `recipe_id`, `client_reaction` (loved/liked/neutral/disliked), `clients(full_name)` join
   - `meal_prep_weeks` (line ~14677): has `program_id`, `tenant_id`, `rotation_week`, `prepped_at`, `delivered_at`, `containers_sent`, `containers_back`
   - `meal_prep_programs` (line ~16479): has `tenant_id`, `client_id`, `delivery_day`, `status`, `current_rotation_week`
   - `recurring_invoice_history` (line ~16087): has `recurring_invoice_id`, `period_start`, `period_end`, `amount_cents`, `status`
   - `recurring_invoices` (line ~16042): has `tenant_id`, `client_id`, `amount_cents`, `frequency`, `status`
   - `client_meal_requests` (line ~13275): has `tenant_id`, `client_id`, `dish_name`, `request_type`, `status`, `requested_for_week_start`
2. `lib/meal-prep/program-actions.ts` -- see query patterns (compat shim API)
3. `lib/recurring/actions.ts` -- see `getRecurringPlanningBoardSnapshot()` for complex aggregation pattern
4. `app/(chef)/meal-prep/page.tsx` -- see page layout patterns

---

## Exact Changes

### Part 1: New File -- `lib/recurring/weekly-retro-actions.ts`

Create this NEW file:

```typescript
'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { startOfWeek, endOfWeek, format, parseISO, subWeeks } from 'date-fns'

// ============================================
// Types
// ============================================

export interface WeeklyRetroSummary {
  weekStart: string // ISO date
  weekEnd: string // ISO date
  weekLabel: string // e.g. "Apr 14 - Apr 20, 2026"

  // Delivery stats
  totalDeliveries: number
  clientsServed: string[] // unique client names

  // Dish performance
  dishesServed: DishPerformance[]
  totalDishesServed: number
  lovedCount: number
  likedCount: number
  neutralCount: number
  dislikedCount: number

  // Container tracking
  containersSent: number
  containersReturned: number
  containersOutstanding: number

  // Revenue
  invoicedAmountCents: number
  paidAmountCents: number
  overdueAmountCents: number

  // Client requests fulfilled
  requestsFulfilled: number
  requestsDeclined: number
  requestsPending: number

  // Available weeks for navigation
  availableWeeks: { weekStart: string; label: string }[]
}

export interface DishPerformance {
  dishName: string
  timesServed: number
  reactions: {
    loved: number
    liked: number
    neutral: number
    disliked: number
    none: number // served but no reaction recorded
  }
  clientNames: string[]
}

// ============================================
// Main Action
// ============================================

/**
 * Get a weekly retrospective summary for meal prep operations.
 * Defaults to the most recent completed week if no weekStart is provided.
 */
export async function getWeeklyRetrospective(weekStartInput?: string): Promise<WeeklyRetroSummary> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Determine the target week
  const now = new Date()
  const targetDate = weekStartInput ? parseISO(weekStartInput) : subWeeks(now, 1)
  const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 }) // Monday
  const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 }) // Sunday
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd')
  const weekLabel = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`

  // --- Parallel queries ---
  const [dishResult, deliveryResult, invoiceResult, requestResult, weeksResult] = await Promise.all(
    [
      // 1. Served dish history for this week
      db
        .from('served_dish_history')
        .select('dish_name, served_date, client_reaction, client_id, clients(full_name)')
        .eq('tenant_id', tenantId)
        .gte('served_date', weekStartStr)
        .lte('served_date', weekEndStr)
        .order('served_date', { ascending: true }),

      // 2. Meal prep weeks that were delivered this week
      db
        .from('meal_prep_weeks')
        .select(
          'id, program_id, rotation_week, prepped_at, delivered_at, containers_sent, containers_back'
        )
        .eq('tenant_id', tenantId)
        .gte('delivered_at', weekStartStr + 'T00:00:00Z')
        .lte('delivered_at', weekEndStr + 'T23:59:59Z'),

      // 3. Recurring invoice history for this period
      db
        .from('recurring_invoice_history')
        .select('amount_cents, status, recurring_invoice_id, recurring_invoices(tenant_id)')
        .gte('period_start', weekStartStr)
        .lte('period_start', weekEndStr),

      // 4. Client meal requests for this week
      db
        .from('client_meal_requests')
        .select('status')
        .eq('tenant_id', tenantId)
        .gte('requested_for_week_start', weekStartStr)
        .lte('requested_for_week_start', weekEndStr),

      // 5. Get available weeks (weeks that have any delivered meals, last 12 weeks)
      db
        .from('meal_prep_weeks')
        .select('delivered_at')
        .eq('tenant_id', tenantId)
        .not('delivered_at', 'is', null)
        .order('delivered_at', { ascending: false })
        .limit(100),
    ]
  )

  // --- Process dish performance ---
  const dishes = (dishResult.data ?? []) as any[]
  const dishMap = new Map<string, DishPerformance>()
  const servedClientNames = new Set<string>()

  for (const row of dishes) {
    const name = row.dish_name || 'Unknown Dish'
    const clientName = row.clients?.full_name || 'Unknown'
    servedClientNames.add(clientName)

    const existing = dishMap.get(name) ?? {
      dishName: name,
      timesServed: 0,
      reactions: { loved: 0, liked: 0, neutral: 0, disliked: 0, none: 0 },
      clientNames: [],
    }

    existing.timesServed++
    const reaction = row.client_reaction as string | null
    if (reaction && reaction in existing.reactions) {
      existing.reactions[reaction as keyof typeof existing.reactions]++
    } else {
      existing.reactions.none++
    }
    if (!existing.clientNames.includes(clientName)) {
      existing.clientNames.push(clientName)
    }
    dishMap.set(name, existing)
  }

  const dishesServed = Array.from(dishMap.values()).sort((a, b) => b.timesServed - a.timesServed)

  // --- Process container tracking ---
  const deliveries = (deliveryResult.data ?? []) as any[]
  let containersSent = 0
  let containersReturned = 0
  for (const d of deliveries) {
    containersSent += d.containers_sent || 0
    containersReturned += d.containers_back || 0
  }

  // --- Process revenue ---
  // Filter to only this tenant's invoices
  const invoices = ((invoiceResult.data ?? []) as any[]).filter(
    (inv: any) => inv.recurring_invoices?.tenant_id === tenantId
  )
  let invoicedAmountCents = 0
  let paidAmountCents = 0
  let overdueAmountCents = 0
  for (const inv of invoices) {
    const amount = inv.amount_cents || 0
    invoicedAmountCents += amount
    if (inv.status === 'paid') paidAmountCents += amount
    if (inv.status === 'overdue') overdueAmountCents += amount
  }

  // --- Process requests ---
  const requests = (requestResult.data ?? []) as any[]
  let requestsFulfilled = 0
  let requestsDeclined = 0
  let requestsPending = 0
  for (const r of requests) {
    if (r.status === 'fulfilled') requestsFulfilled++
    else if (r.status === 'declined') requestsDeclined++
    else if (['requested', 'reviewed', 'scheduled'].includes(r.status)) requestsPending++
  }

  // --- Build available weeks for navigation ---
  const weekSet = new Set<string>()
  for (const w of (weeksResult.data ?? []) as any[]) {
    if (w.delivered_at) {
      const d =
        typeof w.delivered_at === 'string' ? parseISO(w.delivered_at) : new Date(w.delivered_at)
      const ws = startOfWeek(d, { weekStartsOn: 1 })
      weekSet.add(format(ws, 'yyyy-MM-dd'))
    }
  }
  const availableWeeks = Array.from(weekSet)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, 12)
    .map((ws) => {
      const start = parseISO(ws)
      const end = endOfWeek(start, { weekStartsOn: 1 })
      return {
        weekStart: ws,
        label: `${format(start, 'MMM d')} - ${format(end, 'MMM d')}`,
      }
    })

  // Reaction totals
  let lovedCount = 0,
    likedCount = 0,
    neutralCount = 0,
    dislikedCount = 0
  for (const d of dishesServed) {
    lovedCount += d.reactions.loved
    likedCount += d.reactions.liked
    neutralCount += d.reactions.neutral
    dislikedCount += d.reactions.disliked
  }

  return {
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    weekLabel,
    totalDeliveries: deliveries.length,
    clientsServed: Array.from(servedClientNames),
    dishesServed,
    totalDishesServed: dishes.length,
    lovedCount,
    likedCount,
    neutralCount,
    dislikedCount,
    containersSent,
    containersReturned,
    containersOutstanding: containersSent - containersReturned,
    invoicedAmountCents,
    paidAmountCents,
    overdueAmountCents,
    requestsFulfilled,
    requestsDeclined,
    requestsPending,
    availableWeeks,
  }
}
```

### Part 2: New Page -- `app/(chef)/meal-prep/retro/page.tsx`

Create this NEW page. It needs a **client component** wrapper because the user selects which week to view.

**File: `app/(chef)/meal-prep/retro/page.tsx`**

This page uses `searchParams` to accept an optional `?week=YYYY-MM-DD` parameter.

```
Page structure:

Title: "Week Review" with subtitle showing the week range (e.g. "Apr 14 - Apr 20, 2026")

Week selector: dropdown or row of buttons showing availableWeeks. Clicking a week navigates to ?week=YYYY-MM-DD

If no data for this week: "No meal prep activity recorded for this week"

Otherwise, 4 sections:

Section 1: Summary Cards (grid, 2-4 columns)
  - "Deliveries": totalDeliveries count
  - "Clients Served": clientsServed.length
  - "Dishes Served": totalDishesServed
  - "Containers Out": containersOutstanding (containersSent - containersReturned)

Section 2: Revenue (if any invoice data)
  - "Invoiced": format invoicedAmountCents as dollars
  - "Collected": format paidAmountCents as dollars
  - "Overdue": format overdueAmountCents as dollars (red if > 0)

Section 3: Dish Performance Table
  Columns: Dish Name | Times Served | Loved | Liked | Neutral | Disliked | Clients
  Sorted by timesServed descending
  Use colored dots or small badges for reaction counts
  "Clients" column shows comma-separated client names

Section 4: Client Requests
  - "Fulfilled": requestsFulfilled
  - "Declined": requestsDeclined
  - "Pending": requestsPending
```

**Implementation notes:**

- This can be a server component that reads `searchParams.week` directly
- Import `getWeeklyRetrospective` from `@/lib/recurring/weekly-retro-actions`
- `export const metadata = { title: 'Week Review | ChefFlow' }`
- Format cents to dollars: `(cents / 100).toFixed(2)`
- Use Tailwind for styling
- Handle all empty states gracefully

---

## DO NOT TOUCH

- Any existing files (this spec only creates NEW files)
- Database schema or migrations
- Existing meal prep pages, recurring actions, or planning functions
- Navigation config (do not add nav items)
- Any test files

---

## Anti-Regression Rules

1. This spec creates NEW files only. Do NOT modify any existing file.
2. Do NOT add this page to any navigation menu or sidebar.
3. Do NOT create new shared components. Inline everything in the page.
4. All queries are read-only (SELECT only). No inserts, updates, or deletes.
5. Use `requireChef()` for auth. Use `user.tenantId!` for tenant scoping.
6. Handle empty states (no deliveries, no invoices, no reactions). Never crash on missing data.
7. Financial amounts are in cents. Display as dollars with 2 decimal places.
8. The `recurring_invoice_history` table does NOT have `tenant_id` directly. Filter via the joined `recurring_invoices.tenant_id`. If the join fails or returns no data, show $0 instead of crashing.

---

## Verification

After completing all changes:

1. `npx tsc --noEmit --skipLibCheck` must exit 0
2. The page should render at `/meal-prep/retro` when the app is running
3. With no data, the page shows empty states (not errors)
4. The `?week=YYYY-MM-DD` parameter should switch which week is displayed
5. The server action returns valid data matching the TypeScript types
