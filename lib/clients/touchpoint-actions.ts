'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  TouchpointRule,
  TouchpointRuleType,
  UpcomingTouchpoint,
} from '@/lib/clients/touchpoint-types'
import { revalidatePath } from 'next/cache'

// ---- Types ------------------------------------------------------------------

// ---- CRUD -------------------------------------------------------------------

export async function getTouchpointRules(): Promise<TouchpointRule[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('client_touchpoint_rules')
    .select('*')
    .eq('chef_id', user.entityId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to load touchpoint rules: ${error.message}`)
  return (data || []) as TouchpointRule[]
}

export async function createTouchpointRule(input: {
  rule_type: TouchpointRuleType
  trigger_value?: string
  action_suggestion?: string
}): Promise<{ success: true }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db.from('client_touchpoint_rules').insert({
    chef_id: user.entityId,
    rule_type: input.rule_type,
    trigger_value: input.trigger_value || null,
    action_suggestion: input.action_suggestion || null,
  })

  if (error) throw new Error(`Failed to create touchpoint rule: ${error.message}`)
  revalidatePath('/clients')
  revalidatePath('/settings')
  return { success: true }
}

export async function updateTouchpointRule(
  id: string,
  input: {
    rule_type?: TouchpointRuleType
    trigger_value?: string | null
    action_suggestion?: string | null
    is_active?: boolean
  }
): Promise<{ success: true }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const updates: Record<string, unknown> = {}
  if (input.rule_type !== undefined) updates.rule_type = input.rule_type
  if (input.trigger_value !== undefined) updates.trigger_value = input.trigger_value
  if (input.action_suggestion !== undefined) updates.action_suggestion = input.action_suggestion
  if (input.is_active !== undefined) updates.is_active = input.is_active

  const { error } = await db
    .from('client_touchpoint_rules')
    .update(updates)
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) throw new Error(`Failed to update touchpoint rule: ${error.message}`)
  revalidatePath('/clients')
  revalidatePath('/settings')
  return { success: true }
}

export async function deleteTouchpointRule(id: string): Promise<{ success: true }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Soft delete: set inactive
  const { error } = await db
    .from('client_touchpoint_rules')
    .update({ is_active: false })
    .eq('id', id)
    .eq('chef_id', user.entityId)

  if (error) throw new Error(`Failed to deactivate touchpoint rule: ${error.message}`)
  revalidatePath('/clients')
  revalidatePath('/settings')
  return { success: true }
}

// ---- Upcoming Touchpoints (rule-based scan) ---------------------------------

export async function getUpcomingTouchpoints(): Promise<UpcomingTouchpoint[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Load active rules
  const { data: rules } = await db
    .from('client_touchpoint_rules')
    .select('*')
    .eq('chef_id', user.entityId)
    .eq('is_active', true)

  if (!rules || rules.length === 0) return []

  // Load all clients for this chef
  const { data: clients } = await db
    .from('clients')
    .select('id, full_name, birthday')
    .eq('tenant_id', user.tenantId!)

  if (!clients || clients.length === 0) return []

  const now = new Date()
  const touchpoints: UpcomingTouchpoint[] = []

  for (const client of clients) {
    const name = client.full_name || 'Client'

    for (const rule of rules as TouchpointRule[]) {
      const match = await evaluateRule(rule, client, name, now, db, user)
      if (match) touchpoints.push(match)
    }
  }

  // Sort by urgency: high first, then medium, then low
  const urgencyOrder = { high: 0, medium: 1, low: 2 }
  touchpoints.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])

  return touchpoints
}

// ---- Rule evaluation (deterministic, no AI) ---------------------------------

async function evaluateRule(
  rule: TouchpointRule,
  client: {
    id: string
    full_name: string | null
    birthday: string | null
  },
  clientName: string,
  now: Date,
  db: any,
  user: { entityId: string; tenantId: string | null }
): Promise<UpcomingTouchpoint | null> {
  switch (rule.rule_type) {
    case 'birthday':
      return evaluateBirthday(rule, client, clientName, now)

    case 'days_since_last_event':
      return await evaluateDaysSinceLastEvent(rule, client, clientName, now, db, user)

    case 'lifetime_spend_milestone':
      return await evaluateLifetimeSpend(rule, client, clientName, db, user)

    case 'streak_milestone':
      return await evaluateStreakMilestone(rule, client, clientName, db, user)

    case 'anniversary':
      return await evaluateAnniversary(rule, client, clientName, now, db, user)

    case 'custom':
      // Custom rules have no automatic evaluation; they serve as manual reminders
      return null

    default:
      return null
  }
}

function evaluateBirthday(
  rule: TouchpointRule,
  client: { birthday: string | null; id: string },
  clientName: string,
  now: Date
): UpcomingTouchpoint | null {
  if (!client.birthday) return null

  const dob = new Date(client.birthday)
  const thisYearBday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate())
  if (thisYearBday < now) {
    thisYearBday.setFullYear(thisYearBday.getFullYear() + 1)
  }

  const daysUntil = Math.ceil((thisYearBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  // Default window: 7 days, or use trigger_value if set
  const windowDays = rule.trigger_value ? parseInt(rule.trigger_value, 10) : 7
  if (isNaN(windowDays) || daysUntil > windowDays) return null

  return {
    client_id: client.id,
    client_name: clientName,
    rule_type: 'birthday',
    reason:
      daysUntil === 0
        ? `${clientName}'s birthday is today!`
        : `${clientName}'s birthday is in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`,
    action_suggestion: rule.action_suggestion,
    urgency: daysUntil <= 2 ? 'high' : daysUntil <= 4 ? 'medium' : 'low',
  }
}

async function evaluateDaysSinceLastEvent(
  rule: TouchpointRule,
  client: { id: string },
  clientName: string,
  now: Date,
  db: any,
  user: { tenantId: string | null }
): Promise<UpcomingTouchpoint | null> {
  const threshold = rule.trigger_value ? parseInt(rule.trigger_value, 10) : 90
  if (isNaN(threshold)) return null

  const { data: recentEvents } = await db
    .from('events')
    .select('event_date')
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', client.id)
    .order('event_date', { ascending: false })
    .limit(1)

  if (!recentEvents || recentEvents.length === 0) return null

  const lastEventDate = new Date(recentEvents[0].event_date)
  const daysSince = Math.floor((now.getTime() - lastEventDate.getTime()) / (1000 * 60 * 60 * 24))

  if (daysSince < threshold) return null

  return {
    client_id: client.id,
    client_name: clientName,
    rule_type: 'days_since_last_event',
    reason: `${clientName} has not booked in ${daysSince} days (threshold: ${threshold})`,
    action_suggestion: rule.action_suggestion,
    urgency: daysSince >= threshold * 1.5 ? 'high' : 'medium',
  }
}

async function evaluateLifetimeSpend(
  rule: TouchpointRule,
  client: { id: string },
  clientName: string,
  db: any,
  user: { tenantId: string | null }
): Promise<UpcomingTouchpoint | null> {
  // trigger_value is the milestone in dollars (e.g., "5000" for $5,000)
  const milestoneDollars = rule.trigger_value ? parseInt(rule.trigger_value, 10) : 5000
  if (isNaN(milestoneDollars)) return null
  const milestoneCents = milestoneDollars * 100

  // Sum payments from ledger_entries for this client's events
  const { data: events } = await db
    .from('events')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', client.id)

  if (!events || events.length === 0) return null

  const eventIds = events.map((e: { id: string }) => e.id)

  const { data: ledgerEntries } = await db
    .from('ledger_entries')
    .select('amount_cents')
    .eq('tenant_id', user.tenantId!)
    .in('event_id', eventIds)
    .eq('type', 'payment')

  if (!ledgerEntries || ledgerEntries.length === 0) return null

  const totalCents = ledgerEntries.reduce(
    (sum: number, e: { amount_cents: number }) => sum + e.amount_cents,
    0
  )

  if (totalCents < milestoneCents) return null

  // Check that they have not already been past this milestone for a while
  // (only trigger if they crossed the threshold recently, within 2x)
  if (totalCents > milestoneCents * 2) return null

  return {
    client_id: client.id,
    client_name: clientName,
    rule_type: 'lifetime_spend_milestone',
    reason: `${clientName} has reached $${milestoneDollars.toLocaleString()} in lifetime spend ($${(totalCents / 100).toLocaleString()})`,
    action_suggestion: rule.action_suggestion,
    urgency: 'medium',
  }
}

async function evaluateStreakMilestone(
  rule: TouchpointRule,
  client: { id: string },
  clientName: string,
  db: any,
  user: { tenantId: string | null }
): Promise<UpcomingTouchpoint | null> {
  // trigger_value is the event count milestone (e.g., "10")
  const milestone = rule.trigger_value ? parseInt(rule.trigger_value, 10) : 10
  if (isNaN(milestone)) return null

  const { count } = await db
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', client.id)

  if (!count || count < milestone) return null
  // Only show if they are at or just past the milestone (within 2 extra events)
  if (count > milestone + 2) return null

  return {
    client_id: client.id,
    client_name: clientName,
    rule_type: 'streak_milestone',
    reason: `${clientName} has reached ${count} events (milestone: ${milestone})`,
    action_suggestion: rule.action_suggestion,
    urgency: count === milestone ? 'high' : 'medium',
  }
}

async function evaluateAnniversary(
  rule: TouchpointRule,
  client: { id: string },
  clientName: string,
  now: Date,
  db: any,
  user: { tenantId: string | null }
): Promise<UpcomingTouchpoint | null> {
  // Anniversary of the client's first event
  const { data: firstEvents } = await db
    .from('events')
    .select('event_date')
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', client.id)
    .order('event_date', { ascending: true })
    .limit(1)

  if (!firstEvents || firstEvents.length === 0) return null

  const firstDate = new Date(firstEvents[0].event_date)
  const anniversaryThisYear = new Date(now.getFullYear(), firstDate.getMonth(), firstDate.getDate())
  if (anniversaryThisYear < now) {
    anniversaryThisYear.setFullYear(anniversaryThisYear.getFullYear() + 1)
  }

  const daysUntil = Math.ceil(
    (anniversaryThisYear.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )
  const windowDays = rule.trigger_value ? parseInt(rule.trigger_value, 10) : 7
  if (isNaN(windowDays) || daysUntil > windowDays) return null

  const yearsAs = now.getFullYear() - firstDate.getFullYear()

  return {
    client_id: client.id,
    client_name: clientName,
    rule_type: 'anniversary',
    reason:
      daysUntil === 0
        ? `Today is your ${yearsAs}-year anniversary with ${clientName}!`
        : `${yearsAs}-year anniversary with ${clientName} in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`,
    action_suggestion: rule.action_suggestion,
    urgency: daysUntil <= 2 ? 'high' : daysUntil <= 4 ? 'medium' : 'low',
  }
}
