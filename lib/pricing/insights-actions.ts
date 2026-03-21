'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import {
  calculatePricingFormula,
  type CurrentEvent,
  type HistoricalEvent,
  type PricingIntelligenceResult,
} from '@/lib/formulas/pricing-intelligence'

export type PricingInsightsInput = {
  occasion: string | null
  guestCount: number | null
  eventDate: string | null
  serviceStyle: string | null
  dietaryRestrictions: string[] | null
  quotedPriceCents: number | null
}

export type PricingInsightsResponse =
  | { success: true; data: PricingIntelligenceResult }
  | { success: false; error: string }

export async function getPricingInsights(
  input: PricingInsightsInput
): Promise<PricingInsightsResponse> {
  try {
    const user = await requireChef()
    const supabase = createServerClient()

    // Fetch all completed events for this tenant with pricing data
    const { data: events, error: fetchError } = await supabase
      .from('events')
      .select('occasion, guest_count, quoted_price_cents, service_style, event_date, status')
      .eq('tenant_id', user.tenantId!)
      .eq('status', 'completed')
      .gt('quoted_price_cents', 0)
      .eq('is_demo', false)

    if (fetchError) {
      console.error('[pricing-insights] Failed to fetch historical events:', fetchError)
      return { success: false, error: 'Failed to load historical pricing data.' }
    }

    // Map to HistoricalEvent[]
    const historicalEvents: HistoricalEvent[] = (events ?? []).map((e) => ({
      occasion: e.occasion,
      guest_count: e.guest_count,
      quoted_price_cents: e.quoted_price_cents,
      amount_paid_cents: null, // not selected, not needed for formula
      service_style: e.service_style,
      event_date: e.event_date,
    }))

    // Build CurrentEvent from input
    const currentEvent: CurrentEvent = {
      occasion: input.occasion,
      guest_count: input.guestCount,
      event_date: input.eventDate,
      service_style: input.serviceStyle,
      dietary_restrictions: input.dietaryRestrictions,
      quoted_price_cents: input.quotedPriceCents,
    }

    const result = calculatePricingFormula(currentEvent, historicalEvents)

    return { success: true, data: result }
  } catch (err) {
    console.error('[pricing-insights] Unexpected error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    }
  }
}
