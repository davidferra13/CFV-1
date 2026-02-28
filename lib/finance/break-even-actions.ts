'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export type BreakEvenResult = {
  events_per_month: number
  revenue_needed_cents: number
}

export async function getFixedExpenses(): Promise<number> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase: any = createServerClient()

  // Sum expenses tagged as recurring/fixed in the current or last month
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data, error } = await supabase
    .from('expenses')
    .select('amount_cents, recurrence')
    .eq('tenant_id', tenantId)
    .gte('date', thirtyDaysAgo.toISOString().split('T')[0])

  if (error) {
    // expenses table may not exist yet — return 0 gracefully
    console.warn('[break-even] Could not fetch expenses:', error.message)
    return 0
  }

  let total = 0
  for (const expense of data || []) {
    const recurrence: string = expense.recurrence ?? ''
    const isFixed = recurrence === 'monthly' || recurrence === 'recurring' || recurrence === 'fixed'
    if (isFixed) {
      total += expense.amount_cents ?? 0
    }
  }

  return total
}

export async function computeBreakEven(input: {
  fixed_monthly_cents: number
  variable_cost_per_event_cents: number
  avg_revenue_per_event_cents: number
}): Promise<BreakEvenResult> {
  const { fixed_monthly_cents, variable_cost_per_event_cents, avg_revenue_per_event_cents } = input

  const contributionMarginCents = avg_revenue_per_event_cents - variable_cost_per_event_cents

  if (contributionMarginCents <= 0) {
    // Cannot break even — variable cost exceeds revenue per event
    return { events_per_month: Infinity, revenue_needed_cents: 0 }
  }

  const events_per_month = fixed_monthly_cents / contributionMarginCents
  const revenue_needed_cents = Math.ceil(events_per_month) * avg_revenue_per_event_cents

  return {
    events_per_month: Math.round(events_per_month * 10) / 10,
    revenue_needed_cents,
  }
}
