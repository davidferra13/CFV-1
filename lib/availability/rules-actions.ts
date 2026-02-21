// Chef Scheduling Rules — Server Actions
// Manages per-chef availability rules: blocked days, max events, buffer/lead time.
// Used by event creation (soft warnings), inquiry intake, and public booking.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ── Types ──────────────────────────────────────────────────────────────────────

export type SchedulingRules = {
  id: string
  tenant_id: string
  blocked_days_of_week: number[]   // 0=Sun, 1=Mon … 6=Sat
  max_events_per_week: number | null
  max_events_per_month: number | null
  min_buffer_days: number
  min_lead_days: number
  preferred_days_of_week: number[]
  created_at: string
  updated_at: string
}

export type DateRuleValidation = {
  allowed: boolean
  blockers: string[]   // hard blocks — shown as errors
  warnings: string[]   // soft warnings — shown as caution
}

// ── Schema ─────────────────────────────────────────────────────────────────────

const UpsertRulesSchema = z.object({
  blocked_days_of_week:   z.array(z.number().int().min(0).max(6)).default([]),
  max_events_per_week:    z.number().int().positive().nullable().optional(),
  max_events_per_month:   z.number().int().positive().nullable().optional(),
  min_buffer_days:        z.number().int().min(0).default(0),
  min_lead_days:          z.number().int().min(0).default(0),
  preferred_days_of_week: z.array(z.number().int().min(0).max(6)).default([]),
})

export type UpsertRulesInput = z.infer<typeof UpsertRulesSchema>

// ── Read ───────────────────────────────────────────────────────────────────────

export async function getSchedulingRules(): Promise<SchedulingRules | null> {
  const user = await requireChef()
  const supabase = createServerClient()

  // cast as any — table not in generated types until migration is pushed
  const { data } = await (supabase as any)
    .from('chef_scheduling_rules')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .single()

  return (data as SchedulingRules | null) ?? null
}

// ── Write ──────────────────────────────────────────────────────────────────────

export async function upsertSchedulingRules(
  input: UpsertRulesInput
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const validated = UpsertRulesSchema.parse(input)
  const supabase = createServerClient()

  // cast as any — table not in generated types until migration is pushed
  const { error } = await (supabase as any)
    .from('chef_scheduling_rules')
    .upsert(
      {
        tenant_id:               user.tenantId!,
        blocked_days_of_week:    validated.blocked_days_of_week,
        max_events_per_week:     validated.max_events_per_week ?? null,
        max_events_per_month:    validated.max_events_per_month ?? null,
        min_buffer_days:         validated.min_buffer_days,
        min_lead_days:           validated.min_lead_days,
        preferred_days_of_week:  validated.preferred_days_of_week,
      },
      { onConflict: 'tenant_id' }
    )

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings')
  return { success: true }
}

// ── Validate a date against rules ─────────────────────────────────────────────

/**
 * Check whether a proposed date violates chef's scheduling rules.
 * Returns hard blockers (cannot proceed) and soft warnings (advisory).
 * Called from event creation and inquiry intake.
 *
 * @param date  YYYY-MM-DD
 * @param excludeEventId  Skip this event when counting (edit mode)
 */
export async function validateDateAgainstRules(
  date: string,
  excludeEventId?: string
): Promise<DateRuleValidation> {
  const user = await requireChef()
  const supabase = createServerClient()
  const tenantId = user.tenantId!

  const blockers: string[] = []
  const warnings: string[] = []

  // Fetch rules (may not exist yet) — cast as any until migration is pushed
  const { data: rules } = await (supabase as any)
    .from('chef_scheduling_rules')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  if (!rules) {
    // No rules configured — all dates allowed
    return { allowed: true, blockers: [], warnings: [] }
  }

  const r = rules as SchedulingRules

  // 1. Day-of-week block
  const proposed = new Date(date + 'T12:00:00Z') // noon UTC to avoid DST shifts
  const dow = proposed.getUTCDay() // 0=Sun … 6=Sat
  const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  if (r.blocked_days_of_week.includes(dow)) {
    blockers.push(`${DOW_NAMES[dow]}s are blocked in your availability rules`)
  }

  // 2. Min lead days
  if (r.min_lead_days > 0) {
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    const proposedMidnight = new Date(date + 'T00:00:00Z')
    const daysAhead = Math.floor(
      (proposedMidnight.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (daysAhead < r.min_lead_days) {
      blockers.push(
        `This date requires at least ${r.min_lead_days} day${r.min_lead_days === 1 ? '' : 's'} advance notice (${daysAhead} day${daysAhead === 1 ? '' : 's'} away)`
      )
    }
  }

  // 3. Min buffer days — find nearest event before or after
  if (r.min_buffer_days > 0) {
    const bufferBefore = new Date(proposed)
    bufferBefore.setUTCDate(proposed.getUTCDate() - r.min_buffer_days)
    const bufferAfter = new Date(proposed)
    bufferAfter.setUTCDate(proposed.getUTCDate() + r.min_buffer_days)

    let query = supabase
      .from('events')
      .select('event_date, occasion')
      .eq('tenant_id', tenantId)
      .not('status', 'in', '("cancelled")')
      .gte('event_date', bufferBefore.toISOString().slice(0, 10))
      .lte('event_date', bufferAfter.toISOString().slice(0, 10) + 'T23:59:59Z')
      .neq('event_date', date) // exclude same-day (handled by conflict check)

    if (excludeEventId) {
      query = query.neq('id', excludeEventId)
    }

    const { data: nearbyEvents } = await query

    if (nearbyEvents && nearbyEvents.length > 0) {
      const nearest = nearbyEvents[0]
      warnings.push(
        `Only ${r.min_buffer_days} day${r.min_buffer_days === 1 ? '' : 's'} buffer required between events — nearby event: "${nearest.occasion || 'Untitled'}" on ${nearest.event_date.slice(0, 10)}`
      )
    }
  }

  // 4. Max events per week
  if (r.max_events_per_week) {
    // Find week bounds (Mon–Sun) containing this date
    const d = new Date(date + 'T12:00:00Z')
    const dayOfWeek = d.getUTCDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const weekStart = new Date(d)
    weekStart.setUTCDate(d.getUTCDate() + mondayOffset)
    const weekEnd = new Date(weekStart)
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6)

    let weekQuery = supabase
      .from('events')
      .select('id', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .not('status', 'in', '("cancelled")')
      .gte('event_date', weekStart.toISOString().slice(0, 10))
      .lte('event_date', weekEnd.toISOString().slice(0, 10) + 'T23:59:59Z')

    if (excludeEventId) {
      weekQuery = weekQuery.neq('id', excludeEventId)
    }

    const { count: weekCount } = await weekQuery

    if ((weekCount ?? 0) >= r.max_events_per_week) {
      warnings.push(
        `You have ${weekCount} event${weekCount === 1 ? '' : 's'} this week — your limit is ${r.max_events_per_week}`
      )
    }
  }

  // 5. Max events per month
  if (r.max_events_per_month) {
    const [year, month] = date.split('-').map(Number)
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    let monthQuery = supabase
      .from('events')
      .select('id', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .not('status', 'in', '("cancelled")')
      .gte('event_date', monthStart)
      .lte('event_date', monthEnd + 'T23:59:59Z')

    if (excludeEventId) {
      monthQuery = monthQuery.neq('id', excludeEventId)
    }

    const { count: monthCount } = await monthQuery

    if ((monthCount ?? 0) >= r.max_events_per_month) {
      warnings.push(
        `You have ${monthCount} event${monthCount === 1 ? '' : 's'} this month — your limit is ${r.max_events_per_month}`
      )
    }
  }

  // 6. Preferred days advisory
  if (
    r.preferred_days_of_week.length > 0 &&
    !r.preferred_days_of_week.includes(dow) &&
    blockers.length === 0
  ) {
    const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const preferredNames = r.preferred_days_of_week.map((d) => DOW_NAMES[d]).join(', ')
    warnings.push(`${DOW_NAMES[dow]} is not one of your preferred days (${preferredNames})`)
  }

  return {
    allowed: blockers.length === 0,
    blockers,
    warnings,
  }
}
