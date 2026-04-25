# Codex Spec: Service Day Close-Out

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** Migration `20260425000015_restaurant_ops_engine.sql` must be applied
> **Estimated complexity:** medium (5 files)

## What You Are Building

A daily service log where restaurant operators can plan, run, and close out each day of service. The chef creates a "service day" in the morning (expected covers, which menus are active), then closes it at night (actual covers, revenue, food cost, notes on what went well and what went wrong). A list page shows all service days with summary stats. A detail page shows the single day with a close-out form.

This builds on existing DB tables. You are NOT creating any database tables or migrations. The tables already exist: `service_days`, `service_menus`, and the `service_day_summary` view.

---

## Files to Create

| File                                             | Purpose                          |
| ------------------------------------------------ | -------------------------------- |
| `lib/service-days/actions.ts`                    | Server actions (CRUD)            |
| `app/(chef)/stations/service-log/page.tsx`       | List page: all service days      |
| `app/(chef)/stations/service-log/new/page.tsx`   | Create new service day form      |
| `app/(chef)/stations/service-log/[id]/page.tsx`  | Detail + close-out page          |
| `components/stations/service-day-close-form.tsx` | Client component: close-out form |

## Files to Modify

| File                           | What to Change                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(chef)/stations/page.tsx` | Add "Service Log" link to the quick links section (line ~36-60). Copy the exact pattern of the existing links (Daily Ops, Ops Log, Waste Log, Order Sheet). Add: `<Link href="/stations/service-log" className="inline-flex items-center gap-2 rounded-lg bg-stone-800 border border-stone-700 px-3 py-1.5 text-sm text-stone-300 hover:bg-stone-700 hover:text-stone-100 transition-colors">Service Log</Link>` |

**DO NOT modify any other existing files.**

---

## Server Actions (`lib/service-days/actions.ts`)

```typescript
'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// ── Types ────────────────────────────────────────────────────────────────

export type ServiceDay = {
  id: string
  chef_id: string
  service_date: string
  shift_label: string
  status: string
  expected_covers: number | null
  actual_covers: number | null
  notes: string | null
  opened_at: string | null
  closed_at: string | null
  total_revenue_cents: number | null
  total_food_cost_cents: number | null
  total_labor_cost_cents: number | null
  total_waste_cents: number | null
  items_sold: number | null
  items_86d: number | null
  created_at: string
  updated_at: string
}

export type ServiceDaySummary = {
  service_day_id: string
  chef_id: string
  service_date: string
  shift_label: string
  status: string
  expected_covers: number | null
  actual_covers: number | null
  revenue_cents: number | null
  food_cost_cents: number | null
  labor_cost_cents: number | null
  items_sold: number | null
  unique_items_sold: number | null
  total_waste_qty: number | null
  total_waste_cents: number | null
  total_prep_items: number | null
  completed_prep_items: number | null
}

// ── List service days (summary view) ─────────────────────────────────────

export async function listServiceDays(): Promise<ServiceDaySummary[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.tenantId!

  const { data, error } = await db
    .from('service_day_summary')
    .select('*')
    .eq('chef_id', chefId)
    .order('service_date', { ascending: false })
    .limit(90)

  if (error) {
    console.error('[service-days] list error', error)
    return []
  }
  return data ?? []
}

// ── Get single service day ──────────────────────────────────────────────

export async function getServiceDay(id: string): Promise<ServiceDay | null> {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.tenantId!

  const { data, error } = await db
    .from('service_days')
    .select('*')
    .eq('id', id)
    .eq('chef_id', chefId)
    .single()

  if (error) {
    console.error('[service-days] get error', error)
    return null
  }
  return data
}

// ── Create service day ──────────────────────────────────────────────────

export async function createServiceDay(input: {
  service_date: string
  shift_label: string
  expected_covers: number | null
  notes: string | null
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.tenantId!

  const { data, error } = await db
    .from('service_days')
    .insert({
      chef_id: chefId,
      service_date: input.service_date,
      shift_label: input.shift_label || 'dinner',
      expected_covers: input.expected_covers,
      notes: input.notes,
      status: 'planning',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[service-days] create error', error)
    return { success: false, error: error.message || 'Failed to create service day' }
  }

  revalidatePath('/stations/service-log')
  return { success: true, id: data.id }
}

// ── Open service day ────────────────────────────────────────────────────

export async function openServiceDay(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.tenantId!

  const { error } = await db
    .from('service_days')
    .update({
      status: 'active',
      opened_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('chef_id', chefId)

  if (error) {
    console.error('[service-days] open error', error)
    return { success: false, error: error.message || 'Failed to open service day' }
  }

  revalidatePath('/stations/service-log')
  revalidatePath(`/stations/service-log/${id}`)
  return { success: true }
}

// ── Close service day ───────────────────────────────────────────────────

export async function closeServiceDay(
  id: string,
  input: {
    actual_covers: number | null
    total_revenue_cents: number | null
    total_food_cost_cents: number | null
    total_labor_cost_cents: number | null
    total_waste_cents: number | null
    notes: string | null
  }
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const chefId = user.tenantId!

  const { error } = await db
    .from('service_days')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      actual_covers: input.actual_covers,
      total_revenue_cents: input.total_revenue_cents,
      total_food_cost_cents: input.total_food_cost_cents,
      total_labor_cost_cents: input.total_labor_cost_cents,
      total_waste_cents: input.total_waste_cents,
      notes: input.notes,
    })
    .eq('id', id)
    .eq('chef_id', chefId)

  if (error) {
    console.error('[service-days] close error', error)
    return { success: false, error: error.message || 'Failed to close service day' }
  }

  revalidatePath('/stations/service-log')
  revalidatePath(`/stations/service-log/${id}`)
  return { success: true }
}
```

---

## Page: List (`app/(chef)/stations/service-log/page.tsx`)

Server component. Pattern: copy `app/(chef)/stations/page.tsx` structure.

```tsx
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { listServiceDays } from '@/lib/service-days/actions'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Service Log' }

function formatCents(cents: number | null): string {
  if (cents == null) return '-'
  return '$' + (cents / 100).toFixed(2)
}

function statusBadgeVariant(status: string) {
  switch (status) {
    case 'closed':
      return 'default' as const
    case 'active':
      return 'success' as const
    case 'prep':
      return 'warning' as const
    default:
      return 'info' as const
  }
}

export default async function ServiceLogPage() {
  await requireChef()
  const days = await listServiceDays()

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Service Log</h1>
          <p className="mt-1 text-sm text-stone-500">
            Daily service records. Plan, run, and close out each day.
          </p>
        </div>
        <Link
          href="/stations/service-log/new"
          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 transition-colors"
        >
          New Service Day
        </Link>
      </div>

      {days.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-stone-500">
            No service days yet. Create your first one to start tracking daily operations.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {days.map((day) => (
            <Link key={day.service_day_id} href={`/stations/service-log/${day.service_day_id}`}>
              <Card className="hover:border-stone-600 transition-colors cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-stone-100">
                          {new Date(day.service_date + 'T00:00:00').toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                        <p className="text-xs text-stone-500 capitalize">{day.shift_label}</p>
                      </div>
                      <Badge variant={statusBadgeVariant(day.status)}>{day.status}</Badge>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-stone-400">
                      <div className="text-right">
                        <p className="text-stone-500 text-xs">Covers</p>
                        <p>{day.actual_covers ?? day.expected_covers ?? '-'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-stone-500 text-xs">Revenue</p>
                        <p>{formatCents(day.revenue_cents)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-stone-500 text-xs">Food Cost</p>
                        <p>{formatCents(day.food_cost_cents)}</p>
                      </div>
                      {day.total_prep_items != null && day.total_prep_items > 0 && (
                        <div className="text-right">
                          <p className="text-stone-500 text-xs">Prep</p>
                          <p>
                            {day.completed_prep_items}/{day.total_prep_items}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

---

## Page: Create (`app/(chef)/stations/service-log/new/page.tsx`)

Client component with form. Redirects to list after creation.

Fields:

- **Service Date** (date input, default: today)
- **Shift Label** (select: breakfast, lunch, dinner, brunch. Default: dinner)
- **Expected Covers** (number input, optional)
- **Notes** (textarea, optional)

On submit: call `createServiceDay()`, on success `router.push('/stations/service-log')`.
On error: show error in a red text div.

Use `'use client'` directive. Import `useRouter` from `next/navigation`. Import `useState`, `useTransition`.

Wrap in same layout as list page: `<div className="max-w-2xl mx-auto px-4 py-8 space-y-6">`.

---

## Page: Detail + Close-Out (`app/(chef)/stations/service-log/[id]/page.tsx`)

Server component that fetches the service day and renders:

1. Header: date, shift label, status badge
2. Info grid: expected covers, actual covers (if closed), opened/closed times
3. Financial summary (if closed): revenue, food cost, labor cost, waste, items sold
4. If status is NOT 'closed': render `<ServiceDayCloseForm id={day.id} />` client component
5. If status IS 'closed': render read-only summary with all the close-out data
6. Notes section

---

## Client Component: Close-Out Form (`components/stations/service-day-close-form.tsx`)

`'use client'` component. Props: `{ id: string }`.

Fields:

- **Actual Covers** (number)
- **Total Revenue** (number input in dollars, convert to cents before submit: `Math.round(value * 100)`)
- **Food Cost** (number input in dollars, convert to cents)
- **Labor Cost** (number input in dollars, convert to cents)
- **Waste Cost** (number input in dollars, convert to cents)
- **Notes** (textarea: what went well, what went wrong, issues)

Submit button: "Close Out Day"

On submit: call `closeServiceDay(id, { ... })`. On success: `router.refresh()`. On error: show error text.

Use `useTransition` for the submit. Show "Closing..." on the button during transition.

---

## Styling Rules

- Use the existing ChefFlow dark theme: `bg-stone-900`, `text-stone-100`, `border-stone-700`
- Cards: use `<Card>` and `<CardContent>` from `@/components/ui/card`
- Badges: use `<Badge>` with variants: `default`, `success`, `warning`, `info`
- Buttons: use native `<button>` with Tailwind classes matching existing patterns:
  - Primary: `bg-amber-600 text-white hover:bg-amber-500`
  - Secondary: `bg-stone-700 text-stone-300 hover:bg-stone-600`
- Form inputs: `bg-stone-800 border border-stone-700 text-stone-100 rounded-lg px-3 py-2`
- Labels: `text-sm font-medium text-stone-300`

---

## DO NOT Rules

1. DO NOT create any database migrations or modify any SQL
2. DO NOT modify any files other than those listed in "Files to Modify"
3. DO NOT import from `drizzle-orm` or use the Drizzle query builder. Use the compat API: `createServerClient()` then `db.from('table').select().eq().order()`
4. DO NOT add nav items to `components/navigation/nav-config.tsx`
5. DO NOT add `@ts-nocheck` to any file
6. DO NOT use em dashes anywhere (use commas, colons, or semicolons instead)
7. DO NOT create test files
8. All monetary amounts are in cents internally. Display as dollars (divide by 100).
9. Always call `requireChef()` at the top of every server action and every server component page.
10. Always derive `chef_id`/`tenantId` from the session (`user.tenantId!`), never from request input.

---

## Verification

After building, confirm:

1. `npx tsc --noEmit --skipLibCheck` passes
2. Navigate to `/stations` and confirm "Service Log" link appears
3. Navigate to `/stations/service-log` and confirm empty state renders
4. Click "New Service Day", fill form, submit. Confirm redirect to list.
5. Click into the new service day detail page. Confirm close-out form renders.
6. Fill close-out form and submit. Confirm status changes to "closed" and summary shows.
