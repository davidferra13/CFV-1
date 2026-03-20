'use server'

// Lead Scoring - GOLDMINE deterministic formula
// Formula > AI. No LLM calls. Pure math derived from 49 real conversations.
//
// Previously used Ollama to "reason" about conversion likelihood.
// Removed: the talk on LLM limitations proved that AI pattern-matches on
// statistical shortcuts (label names, prompt format) rather than reasoning
// about the actual inquiry. A formula derived from real conversion data
// is strictly more reliable. GOLDMINE scores are instant, consistent,
// auditable, and free.
//
// This file is kept as a thin wrapper so existing imports (lead-score-badge.tsx)
// continue to work without changing import paths.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { scoreFromExtraction, type LeadScoreResult } from '@/lib/inquiries/goldmine-lead-score'

// ── Output type (adapted from GOLDMINE for badge compatibility) ──────────

export interface LeadScore {
  score: number
  tier: 'hot' | 'warm' | 'cold'
  factors: string[] // what contributed to the score
  recommendation: string // one-sentence action recommendation
}

// ── Recommendation templates (deterministic, no AI) ──────────────────────

function getRecommendation(tier: 'hot' | 'warm' | 'cold', score: number): string {
  if (tier === 'hot')
    return 'High-intent lead. Follow up within 24 hours with a personalized quote.'
  if (tier === 'warm' && score >= 55)
    return 'Promising lead. Send a follow-up to clarify details and move toward a quote.'
  if (tier === 'warm')
    return 'Moderate interest. Respond promptly and ask about date, guest count, or budget to qualify further.'
  return 'Low engagement so far. A brief, friendly check-in may surface interest, but prioritize hotter leads.'
}

// ── Server Action ─────────────────────────────────────────────────────────

export async function scoreInquiry(inquiryId: string): Promise<LeadScore> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch the inquiry and its related data
  const { data: inquiry, error } = await supabase
    .from('inquiries')
    .select(
      `
      status, source_message, created_at, confirmed_budget_cents,
      confirmed_date, confirmed_guest_count, confirmed_location,
      confirmed_occasion, confirmed_dietary_restrictions,
      confirmed_cannabis_preference, referral_source,
      messages:inquiry_messages(id)
    `
    )
    .eq('id', inquiryId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !inquiry) throw new Error('Inquiry not found')

  // Count messages for multi-message signal
  const messageCount = Array.isArray(inquiry.messages) ? inquiry.messages.length : 0

  // Check if chef has quoted pricing (any event with a quoted price)
  const { count: quotedCount } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('inquiry_id', inquiryId)
    .eq('tenant_id', user.tenantId!)
    .gt('quoted_price_cents', 0)

  // Run GOLDMINE formula
  const result: LeadScoreResult = scoreFromExtraction(
    {
      dates: inquiry.confirmed_date ? [{ raw: inquiry.confirmed_date }] : [],
      guest_counts: inquiry.confirmed_guest_count
        ? [{ number: inquiry.confirmed_guest_count }]
        : [],
      budget_mentions: inquiry.confirmed_budget_cents
        ? [{ amount_cents: inquiry.confirmed_budget_cents }]
        : [],
      occasion_keywords: inquiry.confirmed_occasion ? [inquiry.confirmed_occasion] : [],
      dietary_mentions: inquiry.confirmed_dietary_restrictions || [],
      cannabis_mentions: inquiry.confirmed_cannabis_preference
        ? [inquiry.confirmed_cannabis_preference]
        : [],
      location_mentions: inquiry.confirmed_location ? [inquiry.confirmed_location] : [],
      referral_signals: inquiry.referral_source ? [inquiry.referral_source] : [],
    },
    {
      total_messages: messageCount,
      has_pricing_quoted: (quotedCount ?? 0) > 0,
    }
  )

  return {
    score: result.score,
    tier: result.tier,
    factors: result.factors,
    recommendation: getRecommendation(result.tier, result.score),
  }
}
