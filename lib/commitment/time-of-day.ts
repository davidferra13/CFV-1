import { createServerClient } from '@/lib/db/server'
import type { Commitment, FrictionTier } from '@/lib/commitment/types'

// -- Types --------------------------------------------------------------------

export type TimeAction =
  | 'client_response'
  | 'quote_change'
  | 'event_accept'
  | 'business_communication'
  | 'custom'

export interface TimeRestriction {
  commitment: Commitment
  action: TimeAction
  description: string
  restrictedUntil: Date | null
  frictionBoost: number
}

export interface TimeViolation {
  id: string
  tenantId: string
  action: TimeAction
  ruleType: string
  timestamp: Date
  wasOverridden: boolean
  description: string
}

export interface ActiveTimeRule {
  ruleType: string
  action: TimeAction
  description: string
  isCurrentlyRestricted: boolean
  nextRestrictionStart: Date | null
  nextRestrictionEnd: Date | null
}

// -- Helpers ------------------------------------------------------------------

function mapCommitmentRow(row: any): Commitment {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    domain: row.domain,
    source: row.source,
    rule: typeof row.rule === 'string' ? JSON.parse(row.rule) : row.rule,
    status: row.status,
    frictionLevel: row.friction_level,
    overrideCount: row.override_count ?? 0,
    lastOverrideAt: row.last_override_at ? new Date(row.last_override_at) : null,
    currentStreak: row.current_streak ?? 0,
    longestStreak: row.longest_streak ?? 0,
    futureSelfletter: row.future_self_letter ?? null,
    seasonalProfile: row.seasonal_profile ?? null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

function getHour(timestamp: Date): number {
  return timestamp.getHours()
}

function getDayOfWeek(timestamp: Date): number {
  return timestamp.getDay()
}

// -- Core Functions -----------------------------------------------------------

/**
 * Check if an action at a given timestamp violates time-of-day restrictions.
 * Returns restrictions that apply, each with a +1 friction tier boost.
 */
export async function checkTimeRestriction(
  tenantId: string,
  action: TimeAction,
  timestamp?: Date
): Promise<TimeRestriction[]> {
  const client = createServerClient()
  const now = timestamp ?? new Date()
  const hour = getHour(now)
  const restrictions: TimeRestriction[] = []

  const { data: rows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  if (!rows || rows.length === 0) return restrictions

  for (const row of rows) {
    const commitment = mapCommitmentRow(row)
    const rule = commitment.rule as Record<string, any>

    if (rule.type === 'time_of_day_no_responses_after' && action === 'client_response') {
      if (hour >= (rule.hour ?? 21)) {
        const nextMorning = new Date(now)
        nextMorning.setDate(nextMorning.getDate() + 1)
        nextMorning.setHours(7, 0, 0, 0)
        restrictions.push({
          commitment,
          action,
          description: `Client responses restricted after ${rule.hour}:00`,
          restrictedUntil: nextMorning,
          frictionBoost: 1,
        })
      }
    }

    if (rule.type === 'time_of_day_no_quotes_after' && action === 'quote_change') {
      if (hour >= (rule.hour ?? 18)) {
        const nextMorning = new Date(now)
        nextMorning.setDate(nextMorning.getDate() + 1)
        nextMorning.setHours(8, 0, 0, 0)
        restrictions.push({
          commitment,
          action,
          description: `Quote changes restricted after ${rule.hour}:00`,
          restrictedUntil: nextMorning,
          frictionBoost: 1,
        })
      }
    }

    if (rule.type === 'time_of_day_no_accepts_between' && action === 'event_accept') {
      const startHour = rule.startHour ?? 22
      const endHour = rule.endHour ?? 7
      const inRestricted =
        startHour > endHour
          ? hour >= startHour || hour < endHour
          : hour >= startHour && hour < endHour
      if (inRestricted) {
        const resumeAt = new Date(now)
        if (hour >= startHour) {
          resumeAt.setDate(resumeAt.getDate() + 1)
        }
        resumeAt.setHours(endHour, 0, 0, 0)
        restrictions.push({
          commitment,
          action,
          description: `Event accepts restricted between ${startHour}:00 and ${endHour}:00`,
          restrictedUntil: resumeAt,
          frictionBoost: 1,
        })
      }
    }

    if (rule.type === 'protected_time_lock' && action === 'business_communication') {
      const blockIds = rule.blockIds ?? []
      if (blockIds.length > 0) {
        const dayOfWeek = getDayOfWeek(now)
        if (blockIds.includes(String(dayOfWeek)) || blockIds.includes(dayOfWeek.toString())) {
          restrictions.push({
            commitment,
            action,
            description: 'Business communications restricted on protected day',
            restrictedUntil: null,
            frictionBoost: 1,
          })
        }
      }
    }
  }

  return restrictions
}

/**
 * Get all active time-of-day rules with current restriction status.
 */
export async function getActiveTimeRules(tenantId: string): Promise<ActiveTimeRule[]> {
  const client = createServerClient()
  const now = new Date()
  const hour = getHour(now)

  const { data: rows } = await client
    .from('commitments' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  if (!rows || rows.length === 0) return []

  const timeRuleTypes = [
    'time_of_day_no_responses_after',
    'time_of_day_no_quotes_after',
    'time_of_day_no_accepts_between',
    'protected_time_lock',
  ]

  const rules: ActiveTimeRule[] = []

  for (const row of rows) {
    const commitment = mapCommitmentRow(row)
    const rule = commitment.rule as Record<string, any>

    if (!timeRuleTypes.includes(rule.type)) continue

    let action: TimeAction = 'custom'
    let isCurrentlyRestricted = false
    let nextRestrictionStart: Date | null = null
    let nextRestrictionEnd: Date | null = null
    let description = ''

    if (rule.type === 'time_of_day_no_responses_after') {
      action = 'client_response'
      isCurrentlyRestricted = hour >= (rule.hour ?? 21)
      description = `No client responses after ${rule.hour ?? 21}:00`
      if (!isCurrentlyRestricted) {
        nextRestrictionStart = new Date(now)
        nextRestrictionStart.setHours(rule.hour ?? 21, 0, 0, 0)
      }
      nextRestrictionEnd = new Date(now)
      if (isCurrentlyRestricted) nextRestrictionEnd.setDate(nextRestrictionEnd.getDate() + 1)
      nextRestrictionEnd.setHours(7, 0, 0, 0)
    } else if (rule.type === 'time_of_day_no_quotes_after') {
      action = 'quote_change'
      isCurrentlyRestricted = hour >= (rule.hour ?? 18)
      description = `No quote changes after ${rule.hour ?? 18}:00`
      if (!isCurrentlyRestricted) {
        nextRestrictionStart = new Date(now)
        nextRestrictionStart.setHours(rule.hour ?? 18, 0, 0, 0)
      }
      nextRestrictionEnd = new Date(now)
      if (isCurrentlyRestricted) nextRestrictionEnd.setDate(nextRestrictionEnd.getDate() + 1)
      nextRestrictionEnd.setHours(8, 0, 0, 0)
    } else if (rule.type === 'time_of_day_no_accepts_between') {
      action = 'event_accept'
      const startHour = rule.startHour ?? 22
      const endHour = rule.endHour ?? 7
      isCurrentlyRestricted =
        startHour > endHour
          ? hour >= startHour || hour < endHour
          : hour >= startHour && hour < endHour
      description = `No event accepts between ${startHour}:00 and ${endHour}:00`
    } else if (rule.type === 'protected_time_lock') {
      action = 'business_communication'
      const dayOfWeek = getDayOfWeek(now)
      const blockIds = rule.blockIds ?? []
      isCurrentlyRestricted = blockIds.includes(String(dayOfWeek))
      description = 'Protected day: no business communications'
    }

    rules.push({
      ruleType: rule.type,
      action,
      description,
      isCurrentlyRestricted,
      nextRestrictionStart,
      nextRestrictionEnd,
    })
  }

  return rules
}

/**
 * Get history of time restriction violations (overrides during restricted hours).
 */
export async function getTimeViolationHistory(
  tenantId: string,
  limit?: number
): Promise<TimeViolation[]> {
  const client = createServerClient()

  const { data: commitmentRows } = await client
    .from('commitments' as any)
    .select('id, rule')
    .eq('tenant_id', tenantId)

  const timeRuleTypes = [
    'time_of_day_no_responses_after',
    'time_of_day_no_quotes_after',
    'time_of_day_no_accepts_between',
    'protected_time_lock',
  ]

  const timeCommitmentIds = (commitmentRows ?? [])
    .filter((r: any) => {
      const rule = typeof r.rule === 'string' ? JSON.parse(r.rule) : r.rule
      return timeRuleTypes.includes(rule.type)
    })
    .map((r: any) => r.id)

  if (timeCommitmentIds.length === 0) return []

  const { data: overrideRows } = await client
    .from('commitment_overrides' as any)
    .select('*')
    .in('commitment_id', timeCommitmentIds)
    .order('created_at', { ascending: false })
    .limit(limit ?? 50)

  const ruleTypeMap = new Map<string, string>()
  for (const r of commitmentRows ?? []) {
    const rule = typeof r.rule === 'string' ? JSON.parse(r.rule) : r.rule
    ruleTypeMap.set(r.id, rule.type)
  }

  const actionMap: Record<string, TimeAction> = {
    time_of_day_no_responses_after: 'client_response',
    time_of_day_no_quotes_after: 'quote_change',
    time_of_day_no_accepts_between: 'event_accept',
    protected_time_lock: 'business_communication',
  }

  return (overrideRows ?? []).map((row: any) => {
    const ruleType = ruleTypeMap.get(row.commitment_id) ?? 'unknown'
    return {
      id: row.id,
      tenantId: row.tenant_id,
      action: actionMap[ruleType] ?? 'custom',
      ruleType,
      timestamp: new Date(row.created_at),
      wasOverridden: true,
      description: row.reason ?? 'Time restriction overridden',
    }
  })
}
