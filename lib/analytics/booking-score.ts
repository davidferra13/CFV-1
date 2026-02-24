// @ts-nocheck
'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BookingScoreBreakdown {
  profitabilityPoints: number
  clientReliabilityPoints: number
  dateConflictPenalty: number
  newClientBonus: number
  total: number
}

export interface BookingScore {
  inquiryId: string
  score: number
  level: 'high' | 'medium' | 'low' | 'conflict'
  breakdown: BookingScoreBreakdown
  hasDateConflict: boolean
  isNewClient: boolean
  clientName: string | null
}

// ─── Single scorer ────────────────────────────────────────────────────────────

export async function getBookingScoreForInquiry(inquiryId: string): Promise<BookingScore | null> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: inquiry, error } = await supabase
    .from('inquiries')
    .select('id, client_id, confirmed_date, confirmed_guest_count, confirmed_budget_cents, client:clients(full_name)')
    .eq('id', inquiryId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !inquiry) return null

  // ── Profitability (0–40 pts) ──────────────────────────────────────────────
  let profitabilityPoints = 20 // default midpoint

  const [avgData] = await Promise.all([
    supabase
      .from('quotes')
      .select('total_quoted_cents, guest_count_estimated')
      .eq('tenant_id', user.tenantId!)
      .eq('status', 'accepted')
      .not('guest_count_estimated', 'is', null)
      .gt('guest_count_estimated', 0),
  ])

  const allAccepted = (avgData.data ?? []).filter(
    q => q.guest_count_estimated && q.total_quoted_cents,
  )
  const tenantAvgPerGuest =
    allAccepted.length > 0
      ? allAccepted.reduce(
          (s, q) => s + q.total_quoted_cents / q.guest_count_estimated!,
          0,
        ) / allAccepted.length
      : 0

  const inquiryPerGuest =
    inquiry.confirmed_budget_cents && inquiry.confirmed_guest_count && inquiry.confirmed_guest_count > 0
      ? inquiry.confirmed_budget_cents / inquiry.confirmed_guest_count
      : null

  if (inquiryPerGuest !== null && tenantAvgPerGuest > 0) {
    const ratio = inquiryPerGuest / tenantAvgPerGuest
    if (ratio >= 1.3) profitabilityPoints = 40
    else if (ratio >= 1.0) profitabilityPoints = 30
    else if (ratio >= 0.7) profitabilityPoints = 15
    else profitabilityPoints = 5
  }

  // ── Client reliability (0–30 pts) ────────────────────────────────────────
  let clientReliabilityPoints = 0
  let isNewClient = true

  if (inquiry.client_id) {
    const { data: summary } = await supabase
      .from('client_financial_summary')
      .select('total_events_completed, total_events_cancelled, total_events_count')
      .eq('client_id', inquiry.client_id)
      .single()

    const completed = summary?.total_events_completed ?? 0
    const cancelled = summary?.total_events_cancelled ?? 0
    const total = (summary as any)?.total_events_count ?? 0

    if (total > 0) {
      isNewClient = false
      const rate = completed + cancelled > 0 ? completed / (completed + cancelled) : 0
      if (rate >= 0.9) clientReliabilityPoints = 30
      else if (rate >= 0.7) clientReliabilityPoints = 20
      else if (rate >= 0.5) clientReliabilityPoints = 10
      else clientReliabilityPoints = 5
    }
  }

  // ── Date conflict (-50 pts) ───────────────────────────────────────────────
  let dateConflictPenalty = 0
  let hasDateConflict = false

  if (inquiry.confirmed_date) {
    const { data: conflicts } = await supabase
      .from('events')
      .select('id')
      .eq('tenant_id', user.tenantId!)
      .eq('event_date', inquiry.confirmed_date)
      .in('status', ['confirmed', 'paid', 'in_progress'])
      .limit(1)

    if (conflicts && conflicts.length > 0) {
      dateConflictPenalty = -50
      hasDateConflict = true
    }
  }

  // ── New client bonus (+10 pts) ────────────────────────────────────────────
  const newClientBonus = isNewClient ? 10 : 0

  const raw = profitabilityPoints + clientReliabilityPoints + dateConflictPenalty + newClientBonus
  const total = Math.max(0, Math.min(100, raw))

  const level: BookingScore['level'] =
    hasDateConflict ? 'conflict' :
    total >= 65 ? 'high' :
    total >= 40 ? 'medium' : 'low'

  return {
    inquiryId,
    score: total,
    level,
    breakdown: { profitabilityPoints, clientReliabilityPoints, dateConflictPenalty, newClientBonus, total },
    hasDateConflict,
    isNewClient,
    clientName: (inquiry.client as any)?.full_name ?? null,
  }
}

// ─── Batch scorer for inquiry list ───────────────────────────────────────────

export async function getBookingScoresForOpenInquiries(): Promise<BookingScore[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: inquiries } = await supabase
    .from('inquiries')
    .select('id')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['new', 'awaiting_client', 'awaiting_chef', 'quoted'])

  if (!inquiries || inquiries.length === 0) return []

  const results = await Promise.allSettled(
    inquiries.map(inq => getBookingScoreForInquiry(inq.id)),
  )

  return results
    .filter(
      (r): r is PromiseFulfilledResult<BookingScore> =>
        r.status === 'fulfilled' && r.value !== null,
    )
    .map(r => r.value!)
}
