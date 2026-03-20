'use server'

// Pricing Intelligence
// Analyzes chef's historical accepted quotes to suggest optimal price band for a new event.
// Distinct from quote-draft.ts (which drafts line items) - this is strategic pricing guidance.
// Routed to Ollama (chef revenue history is sensitive business data).
// Output is INSIGHT ONLY - never writes to ledger or quote records.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from './parse-ollama'
import { withAiFallback } from './with-ai-fallback'
import { calculatePricingFormula } from '@/lib/formulas/pricing-intelligence'
import { z } from 'zod'

// ── Zod schema ──────────────────────────────────────────────────────────────

const PricingIntelligenceSchema = z.object({
  suggestedMinCents: z.number(),
  suggestedMaxCents: z.number(),
  suggestedPerHeadCents: z.number(),
  rationale: z.string(),
  underbiddingRisk: z.boolean(),
  underbiddingWarning: z.string().nullable(),
  marketPosition: z.enum(['below_average', 'at_average', 'above_average']),
  comparableEvents: z.number(), // how many historical events were used as reference
  confidence: z.enum(['high', 'medium', 'low']),
})

export type PricingIntelligenceResult = z.infer<typeof PricingIntelligenceSchema>

// ── Server Action ─────────────────────────────────────────────────────────

export async function getPricingIntelligence(eventId: string): Promise<PricingIntelligenceResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const [eventResult, historicalResult] = await Promise.all([
    supabase
      .from('events')
      .select(
        'occasion, guest_count, event_date, service_style, dietary_restrictions, quoted_price_cents'
      )
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single(),
    // Historical accepted/paid events for pricing reference
    // Note: amount_paid_cents doesn't exist on events table; using quoted_price_cents only
    supabase
      .from('events')
      .select('occasion, guest_count, quoted_price_cents, service_style, event_date')
      .eq('tenant_id', user.tenantId!)
      .in('status', ['completed', 'in_progress', 'confirmed', 'paid'])
      .not('quoted_price_cents', 'is', null)
      .order('event_date', { ascending: false })
      .limit(30),
  ])

  const event = eventResult.data
  if (!event) throw new Error('Event not found')

  const historicalEvents = historicalResult.data ?? []

  const currentQuote = event.quoted_price_cents

  // Compute comparable events (same occasion type, similar guest count ±50%)
  const guestCount = event.guest_count ?? 10
  const comparables = historicalEvents.filter((h: any) => {
    const hGuests = h.guest_count ?? 0
    return hGuests >= guestCount * 0.5 && hGuests <= guestCount * 1.5
  })

  const systemPrompt = `You are a business pricing consultant for a private chef.
Analyze the chef's historical event pricing to suggest an optimal price range for the new event.
Consider: occasion type, guest count, service style, market positioning.
Be direct and specific. Warn clearly if the chef is likely underpricing.
Return valid JSON only.`

  const userContent = `
NEW EVENT TO PRICE:
  Occasion: ${event.occasion ?? 'Private Event'}
  Guest count: ${guestCount}
  Service style: ${event.service_style ?? 'Not specified'}
  Dietary restrictions: ${event.dietary_restrictions?.join(', ') || 'None'}
  Current draft price: ${currentQuote ? '$' + (currentQuote / 100).toFixed(0) : 'Not yet set'}

CHEF'S HISTORICAL PRICING (last ${historicalEvents.length} completed events):
${
  historicalEvents
    .slice(0, 15)
    .map(
      (h: any) =>
        `  - ${h.occasion ?? 'Event'}, ${h.guest_count ?? '?'} guests, $${((h.quoted_price_cents ?? 0) / 100).toFixed(0)} quoted, style: ${h.service_style ?? 'unknown'}`
    )
    .join('\n') || '  No historical data yet'
}

Comparable events (similar guest count): ${comparables.length}
${comparables.length > 0 ? 'Avg comparable price: $' + Math.round(comparables.reduce((s: any, h: any) => s + (h.quoted_price_cents ?? 0), 0) / comparables.length / 100).toFixed(0) : ''}

Return JSON: { "suggestedMinCents": number, "suggestedMaxCents": number, "suggestedPerHeadCents": number, "rationale": "...", "underbiddingRisk": bool, "underbiddingWarning": "...or null", "marketPosition": "below_average|at_average|above_average", "comparableEvents": number, "confidence": "high|medium|low" }`

  const { result, source } = await withAiFallback(
    // Formula: percentile math on historical data - deterministic
    () =>
      calculatePricingFormula(
        {
          occasion: event.occasion,
          guest_count: event.guest_count,
          event_date: event.event_date,
          service_style: event.service_style,
          dietary_restrictions: event.dietary_restrictions,
          quoted_price_cents: event.quoted_price_cents,
        },
        historicalEvents.map((h: any) => ({
          occasion: h.occasion,
          guest_count: h.guest_count,
          quoted_price_cents: h.quoted_price_cents,
          amount_paid_cents: null, // not available on events table; formula handles null
          service_style: h.service_style,
          event_date: h.event_date,
        }))
      ),
    // AI: enhanced pricing analysis with narrative (when Ollama is online)
    () => parseWithOllama(systemPrompt, userContent, PricingIntelligenceSchema)
  )

  return { ...result, _aiSource: source } as PricingIntelligenceResult
}
