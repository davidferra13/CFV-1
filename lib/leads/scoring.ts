'use server'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { holidayLeadScoreBoost } from '@/lib/holidays/upcoming'

export interface LeadScore {
  inquiryId: string
  score: number
  label: 'hot' | 'warm' | 'cold'
  factors: string[]
}

export async function scoreInquiry(inquiry: {
  id: string
  confirmed_budget_cents?: number | null
  confirmed_guest_count?: number | null
  confirmed_date?: string | null
  channel?: string | null
  client_id?: string | null
  created_at: string
}): Promise<LeadScore> {
  let score = 50
  const factors: string[] = []

  // Budget factor
  if (inquiry.confirmed_budget_cents) {
    if (inquiry.confirmed_budget_cents > 200000) {
      score += 20
      factors.push('High budget')
    } else if (inquiry.confirmed_budget_cents > 100000) {
      score += 10
      factors.push('Good budget')
    }
  }

  // Guest count (larger = more valuable)
  if (inquiry.confirmed_guest_count) {
    if (inquiry.confirmed_guest_count > 20) {
      score += 10
      factors.push('Large group')
    } else if (inquiry.confirmed_guest_count >= 6) {
      score += 5
      factors.push('Good group size')
    }
  }

  // Lead time (more time = easier to plan)
  if (inquiry.confirmed_date) {
    const daysOut = Math.floor((new Date(inquiry.confirmed_date).getTime() - Date.now()) / 86400000)
    if (daysOut > 30) {
      score += 10
      factors.push('Good lead time')
    } else if (daysOut < 7 && daysOut > 0) {
      score -= 10
      factors.push('Short notice')
    }
  }

  // Channel factor
  if (inquiry.channel === 'referral') {
    score += 15
    factors.push('Referral lead')
  } else if (inquiry.channel === 'repeat') {
    score += 20
    factors.push('Repeat client')
  }

  // Recency of inquiry
  const hoursSince = (Date.now() - new Date(inquiry.created_at).getTime()) / 3600000
  if (hoursSince < 24) {
    score += 5
    factors.push('Fresh inquiry')
  }

  // Holiday proximity boost (0–20 points)
  if (inquiry.confirmed_date) {
    const boost = holidayLeadScoreBoost(new Date(inquiry.confirmed_date))
    if (boost > 0) {
      score += boost
      factors.push('Near a holiday')
    }
  }

  score = Math.min(100, Math.max(0, score))
  const label = score >= 70 ? 'hot' : score >= 45 ? 'warm' : 'cold'

  return { inquiryId: inquiry.id, score, label, factors }
}

export async function getLeadScoresForChef(): Promise<LeadScore[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: inquiries } = await supabase
    .from('inquiries')
    .select(
      'id, confirmed_budget_cents, confirmed_guest_count, confirmed_date, channel, client_id, created_at'
    )
    .eq('tenant_id', user.entityId)
    .not('status', 'in', '("declined","expired","closed")')

  if (!inquiries) return []
  return Promise.all(inquiries.map(scoreInquiry))
}
