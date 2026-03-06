'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TriagedInquiry {
  inquiryId: string
  clientName: string | null
  channel: string
  status: string
  createdAt: string
  priorityScore: number // 0-100
  priorityLevel: 'urgent' | 'high' | 'medium' | 'low'
  suggestedAction: string
  factors: string[]
  estimatedValueCents: number | null
  hoursUnanswered: number
  hasDateConflict: boolean
}

export interface InquiryTriageResult {
  triaged: TriagedInquiry[]
  urgentCount: number
  avgResponseTimeHours: number
  oldestUnansweredHours: number
  totalOpenInquiries: number
  estimatedPipelineValueCents: number
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getInquiryTriage(): Promise<InquiryTriageResult | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const supabase: any = createServerClient()

  // Fetch open inquiries with client info
  const { data: inquiries, error } = await supabase
    .from('inquiries')
    .select(
      `
      id, status, channel, created_at, confirmed_date, confirmed_budget_cents,
      confirmed_guest_count, unknown_fields, referral_source,
      client:clients(full_name, total_events_count, loyalty_tier, lifetime_value_cents)
    `
    )
    .eq('tenant_id', tenantId)
    .in('status', ['new', 'awaiting_response', 'awaiting_chef', 'awaiting_client', 'quoted'])
    .order('created_at', { ascending: true })

  if (error || !inquiries) return null

  // Fetch upcoming confirmed events for conflict detection
  const { data: confirmedEvents } = await supabase
    .from('events')
    .select('event_date')
    .eq('tenant_id', tenantId)
    .in('status', ['confirmed', 'paid', 'in_progress', 'accepted'])

  const confirmedDates = new Set((confirmedEvents || []).map((e: any) => e.event_date))

  // Fetch historical response times (for context)
  const { data: recentConverted } = await supabase
    .from('inquiries')
    .select('created_at, updated_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'converted')
    .order('created_at', { ascending: false })
    .limit(20)

  const responseTimes = (recentConverted || [])
    .map(
      (i: any) => (new Date(i.updated_at).getTime() - new Date(i.created_at).getTime()) / 3600000
    )
    .filter((h: number) => h > 0 && h < 720) // exclude outliers (> 30 days)
  const avgResponseTimeHours =
    responseTimes.length > 0
      ? Math.round(responseTimes.reduce((s: number, h: number) => s + h, 0) / responseTimes.length)
      : 0

  const now = Date.now()
  const triaged: TriagedInquiry[] = []

  for (const inquiry of inquiries) {
    const factors: string[] = []
    let score = 0

    const hoursUnanswered = Math.round((now - new Date(inquiry.created_at).getTime()) / 3600000)
    const client = inquiry.client as any

    // Time urgency (0-30 pts) — older unanswered = higher priority
    if (hoursUnanswered > 72) {
      score += 30
      factors.push('Waiting 3+ days')
    } else if (hoursUnanswered > 24) {
      score += 20
      factors.push('Waiting 1+ day')
    } else if (hoursUnanswered > 6) {
      score += 10
      factors.push('Waiting 6+ hours')
    } else {
      score += 5
      factors.push('Recent inquiry')
    }

    // Budget signal (0-20 pts)
    const budget = inquiry.confirmed_budget_cents
    if (budget && budget >= 300000) {
      score += 20
      factors.push(`High budget ($${Math.round(budget / 100)})`)
    } else if (budget && budget >= 100000) {
      score += 12
      factors.push(`Mid budget ($${Math.round(budget / 100)})`)
    } else if (budget) {
      score += 5
      factors.push(`Budget: $${Math.round(budget / 100)}`)
    }

    // GOLDMINE lead score (0-15 pts)
    const goldmineScore = inquiry.unknown_fields?.chef_likelihood
    if (typeof goldmineScore === 'number') {
      if (goldmineScore >= 70) {
        score += 15
        factors.push(`Hot lead (score: ${goldmineScore})`)
      } else if (goldmineScore >= 40) {
        score += 8
        factors.push(`Warm lead (score: ${goldmineScore})`)
      } else {
        score += 2
        factors.push(`Cold lead (score: ${goldmineScore})`)
      }
    }

    // Repeat client bonus (0-15 pts)
    if (client?.total_events_count >= 3) {
      score += 15
      factors.push(`Repeat client (${client.total_events_count} events)`)
    } else if (client?.total_events_count >= 1) {
      score += 8
      factors.push('Returning client')
    }

    // Referral source bonus (0-10 pts)
    if (inquiry.referral_source === 'referral') {
      score += 10
      factors.push('Referred by existing client')
    } else if (inquiry.channel === 'website') {
      score += 5
      factors.push('Direct website inquiry')
    }

    // Date conflict check (penalty)
    let hasDateConflict = false
    if (inquiry.confirmed_date && confirmedDates.has(inquiry.confirmed_date)) {
      hasDateConflict = true
      score -= 10
      factors.push('Date conflict with existing event')
    }

    // Status-based urgency
    if (inquiry.status === 'quoted') {
      score += 10
      factors.push('Quote sent, awaiting decision')
    } else if (inquiry.status === 'new') {
      score += 5
      factors.push('New, needs first response')
    }

    score = Math.max(0, Math.min(100, score))

    const priorityLevel: TriagedInquiry['priorityLevel'] =
      score >= 70 ? 'urgent' : score >= 50 ? 'high' : score >= 30 ? 'medium' : 'low'

    // Suggest action based on state
    let suggestedAction: string
    if (inquiry.status === 'new') {
      suggestedAction =
        hoursUnanswered > 24 ? 'Respond ASAP — inquiry aging' : 'Send initial response'
    } else if (inquiry.status === 'quoted') {
      suggestedAction =
        hoursUnanswered > 48 ? 'Follow up on sent quote' : 'Awaiting client decision'
    } else if (inquiry.status === 'awaiting_chef') {
      suggestedAction = 'Your turn — client is waiting'
    } else {
      suggestedAction = 'Review and respond'
    }

    triaged.push({
      inquiryId: inquiry.id,
      clientName: client?.full_name || null,
      channel: inquiry.channel || 'unknown',
      status: inquiry.status,
      createdAt: inquiry.created_at,
      priorityScore: score,
      priorityLevel,
      suggestedAction,
      factors,
      estimatedValueCents: budget || null,
      hoursUnanswered,
      hasDateConflict,
    })
  }

  // Sort by priority score descending
  triaged.sort((a, b) => b.priorityScore - a.priorityScore)

  const urgentCount = triaged.filter((t) => t.priorityLevel === 'urgent').length
  const oldestUnansweredHours =
    triaged.length > 0 ? Math.max(...triaged.map((t) => t.hoursUnanswered)) : 0
  const estimatedPipelineValueCents = triaged.reduce((s, t) => s + (t.estimatedValueCents || 0), 0)

  return {
    triaged,
    urgentCount,
    avgResponseTimeHours,
    oldestUnansweredHours,
    totalOpenInquiries: triaged.length,
    estimatedPipelineValueCents,
  }
}
