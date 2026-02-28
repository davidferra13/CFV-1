// @ts-nocheck
'use server'

// Lead Scoring
// Scores each incoming inquiry by conversion likelihood (0–100).
// Routed to Ollama (contains budget + PII).
// Output is INSIGHT ONLY — never modifies inquiry data without chef action.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from './parse-ollama'
import { z } from 'zod'

// ── Zod schema ──────────────────────────────────────────────────────────────

const LeadScoreSchema = z.object({
  score: z.number().min(0).max(100),
  tier: z.enum(['hot', 'warm', 'cold']),
  strengths: z.array(z.string()), // factors boosting the score
  weaknesses: z.array(z.string()), // factors reducing the score
  recommendation: z.string(), // one-sentence action recommendation
  confidence: z.enum(['high', 'medium', 'low']),
})

export type LeadScore = z.infer<typeof LeadScoreSchema>

// ── Server Action ─────────────────────────────────────────────────────────

export async function scoreInquiry(inquiryId: string): Promise<LeadScore> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const [inquiryResult, historicalResult] = await Promise.all([
    supabase
      .from('inquiries')
      .select(
        `
        status, notes, created_at, confirmed_budget_cents,
        clients(full_name, preferences),
        events(occasion, guest_count, event_date, quoted_price_cents)
      `
      )
      .eq('id', inquiryId)
      .eq('tenant_id', user.tenantId!)
      .single(),
    // Get chef's historical conversion stats
    supabase
      .from('inquiries')
      .select('status')
      .eq('tenant_id', user.tenantId!)
      .in('status', ['converted', 'declined', 'expired']),
  ])

  const inquiry = inquiryResult.data
  if (!inquiry) throw new Error('Inquiry not found')

  const historical = historicalResult.data ?? []
  const totalHistorical = historical.length
  const converted = historical.filter((i) => i.status === 'converted').length
  const historicalRate = totalHistorical > 0 ? Math.round((converted / totalHistorical) * 100) : 0

  const event = Array.isArray(inquiry.events) ? inquiry.events[0] : inquiry.events
  const client = Array.isArray(inquiry.clients) ? inquiry.clients[0] : inquiry.clients

  const today = new Date()
  const eventDate = event?.event_date ? new Date(event.event_date) : null
  const daysUntilEvent = eventDate
    ? Math.round((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    : null
  const daysSinceInquiry = Math.round(
    (today.getTime() - new Date(inquiry.created_at).getTime()) / (1000 * 60 * 60 * 24)
  )

  const budgetCents = inquiry.confirmed_budget_cents ?? event?.quoted_price_cents ?? 0

  const systemPrompt = `You are a business analyst for a private chef. Score this inquiry's conversion likelihood from 0 to 100.
Scoring framework:
  - Budget (20 pts): Is budget present? Is it in a realistic range for private chef events ($500–$5000+)?
  - Lead time (20 pts): 30–90 days = ideal. <7 days = rushed. >180 days = low urgency.
  - Engagement (20 pts): How detailed is the inquiry? Specific requests = higher intent.
  - Event clarity (20 pts): Guest count known? Occasion specified? Date set?
  - Client history (20 pts): Returning client? Preferences noted?
Tiers: 70–100 = hot, 40–69 = warm, 0–39 = cold.
Return valid JSON only.`

  const userContent = `
Inquiry Details:
  Status: ${inquiry.status}
  Budget: ${budgetCents > 0 ? '$' + (budgetCents / 100).toFixed(0) : 'Not specified'}
  Notes/description: ${inquiry.notes ?? 'None'}
  Days since inquiry: ${daysSinceInquiry}
  Days until event: ${daysUntilEvent ?? 'Date not set'}
  Occasion: ${event?.occasion ?? 'Not specified'}
  Guest count: ${event?.guest_count ?? 'Unknown'}
  Client: ${client ? ((client as any).full_name ?? 'Unknown') : 'New client'}
  Client preferences on file: ${client ? ((client as any).preferences ?? 'None') : 'No prior history'}

Chef's historical conversion rate: ${historicalRate}% (based on ${totalHistorical} closed inquiries)

Return JSON: { "score": 0-100, "tier": "hot|warm|cold", "strengths": ["..."], "weaknesses": ["..."], "recommendation": "one sentence", "confidence": "high|medium|low" }`

  try {
    return await parseWithOllama(systemPrompt, userContent, LeadScoreSchema)
  } catch (err) {
    console.error('[lead-scoring] Failed:', err)
    throw new Error('Could not score inquiry. Please try again.')
  }
}
