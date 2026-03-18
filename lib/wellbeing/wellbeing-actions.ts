'use server'

// Wellbeing Signal Fetcher
// Gathers observable data from existing tables to compute burnout risk.
// No private AI - all computation is local, pure arithmetic.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import {
  computeBurnoutLevel,
  BURNOUT_SUGGESTIONS,
  type BurnoutLevel,
  type BurnoutSignals,
} from '@/lib/wellbeing/burnout-score'

export type WellbeingResult = {
  signals: BurnoutSignals
  level: BurnoutLevel
  suggestion: string
}

/**
 * Fetch observable work signals from the database and compute burnout level.
 * All data stays local - no external AI calls.
 */
export async function getWellbeingSignals(): Promise<WellbeingResult> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase: any = createServerClient()

  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const ninetyDaysAgo = new Date(now)
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  // ── events this week ──────────────────────────────────────────────────────
  const { count: weekCount } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('event_date', sevenDaysAgo.toISOString())
    .not('status', 'in', '("cancelled","draft")')

  // ── events this month ─────────────────────────────────────────────────────
  const { count: monthCount } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('event_date', thirtyDaysAgo.toISOString())
    .not('status', 'in', '("cancelled","draft")')

  // ── days since last day off ───────────────────────────────────────────────
  // Approximate: find the most recent event date, then compute how long ago it was.
  // If the last event was today, daysSinceLastDayOff = 0 (not a day off yet).
  // If no events ever, treat as plenty of rest (0).
  const { data: recentEvent } = await supabase
    .from('events')
    .select('event_date')
    .eq('tenant_id', tenantId)
    .not('status', 'in', '("cancelled","draft")')
    .order('event_date', { ascending: false })
    .limit(1)
    .single()

  let daysSinceLastDayOff = 0
  if (recentEvent) {
    const lastEventDate = new Date((recentEvent as any).event_date)
    const diffMs = now.getTime() - lastEventDate.getTime()
    daysSinceLastDayOff = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  }

  // ── avg satisfaction last 90d ─────────────────────────────────────────────
  const { data: checkins } = await supabase
    .from('chef_growth_checkins')
    .select('satisfaction_score')
    .eq('tenant_id', tenantId)
    .gte('checkin_date', ninetyDaysAgo.toISOString().slice(0, 10))
    .not('satisfaction_score', 'is', null)

  let avgSatisfactionLast90d: number | null = null
  if (checkins && checkins.length > 0) {
    const scores = checkins
      .map((c: any) => c.satisfaction_score as number)
      .filter((s: number | null) => s != null) as number[]
    if (scores.length > 0) {
      avgSatisfactionLast90d = scores.reduce((a: number, b: number) => a + b, 0) / scores.length
    }
  }

  // ── days since last journal entry ─────────────────────────────────────────
  // chef_journey_entries is the journal table (from chef_journey expansion migration)
  let daysSinceJournalEntry = 60 // default: assume 60 days if no table or no entries
  try {
    const { data: journalEntry } = await supabase
      .from('chef_journey_entries')
      .select('entry_date')
      .eq('tenant_id', tenantId)
      .order('entry_date', { ascending: false })
      .limit(1)
      .single()

    if (journalEntry) {
      const lastEntry = new Date((journalEntry as any).entry_date)
      const diffMs = now.getTime() - lastEntry.getTime()
      daysSinceJournalEntry = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    }
  } catch {
    // Table may not exist or be empty - use default of 60
    daysSinceJournalEntry = 60
  }

  const signals: BurnoutSignals = {
    eventsThisWeek: weekCount ?? 0,
    eventsLastMonth: monthCount ?? 0,
    daysSinceLastDayOff,
    avgSatisfactionLast90d,
    daysSinceJournalEntry,
  }

  const level = computeBurnoutLevel(signals)

  return {
    signals,
    level,
    suggestion: BURNOUT_SUGGESTIONS[level],
  }
}
