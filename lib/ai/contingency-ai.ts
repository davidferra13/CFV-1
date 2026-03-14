'use server'

// Contingency Suggestion Engine
// AI generates "if X goes wrong, do Y" contingency plans based on event specifics.
// Extends the existing ContingencyPanel (which only allows manual entry).
// Routed to local Ollama — event data (location, dietary restrictions, allergies) is private.
// Output is DRAFT ONLY — chef picks which ones to save to the ContingencyPanel.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { dispatchPrivate } from '@/lib/ai/dispatch'
import { OllamaOfflineError } from './ollama-errors'

export interface ContingencyPlan {
  scenarioType: string // maps to existing SCENARIO_LABELS if possible
  scenarioLabel: string // human-readable label
  riskLevel: 'critical' | 'high' | 'medium'
  mitigationNotes: string // step-by-step what to do
  preventionTip: string // how to reduce likelihood
  timeImpact: string // e.g. "adds 15–20 minutes to service"
}

export interface ContingencyAIResult {
  plans: ContingencyPlan[]
  topRisk: string // the single most likely risk for this event
  generatedAt: string
}

const ContingencyPlanSchema = z.object({
  scenarioType: z.string(),
  scenarioLabel: z.string(),
  riskLevel: z.enum(['critical', 'high', 'medium']),
  mitigationNotes: z.string(),
  preventionTip: z.string(),
  timeImpact: z.string(),
})

const ContingencyAIResultSchema = z.object({
  plans: z.array(ContingencyPlanSchema),
  topRisk: z.string(),
})

export async function generateContingencyPlans(eventId: string): Promise<ContingencyAIResult> {
  const user = await requireChef()
  const supabase = createServerClient()

  // event_menu_components is not in generated types — table exists in DB but not yet in types/database.ts
  const [eventResult, menuResult] = await Promise.all([
    supabase
      .from('events')
      .select(
        'occasion, guest_count, event_date, serve_time, location_address, service_style, dietary_restrictions, allergies, special_requests'
      )
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single(),
    (supabase.from as Function)('event_menu_components')
      .select('name, course_type, description')
      .eq('event_id', eventId) as Promise<{
      data: Array<{ name: string; course_type: string | null; description: string | null }> | null
    }>,
  ])

  const event = eventResult.data
  if (!event) throw new Error('Event not found')

  const menu = menuResult.data ?? []
  const guestCount = event.guest_count ?? 10
  const isLargeEvent = guestCount > 20
  const allergens = [...(event.dietary_restrictions ?? []), ...(event.allergies ?? [])].filter(
    Boolean
  )

  const systemPrompt = `You are a risk management consultant for a private chef business.
Generate 4–6 specific, realistic contingency plans for this event.
Focus on the most likely failure points given the event specifics.
Each plan should be actionable — the chef should be able to execute it mid-service without calling anyone.

Common private chef risks to assess:
  equipment_failure, ingredient_shortage, timing_overrun, dietary_violation,
  guest_medical_emergency, venue_access_issue, staff_no_show,
  dish_failure (overcook, burn, drop), power_outage, traffic_delay

Return JSON: {
  "plans": [{
    "scenarioType": "equipment_failure|ingredient_shortage|timing_overrun|dietary_violation|guest_medical_emergency|venue_access_issue|staff_no_show|dish_failure|power_outage|other",
    "scenarioLabel": "plain English title",
    "riskLevel": "critical|high|medium",
    "mitigationNotes": "step-by-step what to do, 2-4 sentences",
    "preventionTip": "how to reduce likelihood before the event",
    "timeImpact": "estimated service delay"
  }],
  "topRisk": "single sentence on the most likely risk for THIS event"
}

Return ONLY valid JSON.`

  const userContent = `Event:
  Occasion: ${event.occasion ?? 'Private Event'}
  Guests: ${guestCount}${isLargeEvent ? ' (large event — scaling risk higher)' : ''}
  Location: ${event.location_address ?? 'Unknown venue'}
  Service style: ${event.service_style ?? 'plated'}
  Serve time: ${event.serve_time ?? 'TBD'}
  Allergens/restrictions: ${allergens.join(', ') || 'None noted'}
  Special requests: ${event.special_requests ?? 'None'}

Menu complexity (${menu.length} dishes):
${menu.map((m) => `  - [${m.course_type ?? 'Course'}] ${m.name}`).join('\n') || '  - Not yet assigned'}`

  try {
    const parsed = (
      await dispatchPrivate(systemPrompt, userContent, ContingencyAIResultSchema, {
        modelTier: 'standard',
        timeoutMs: 60_000,
      })
    ).result
    return {
      plans: parsed.plans ?? [],
      topRisk: parsed.topRisk ?? '',
      generatedAt: new Date().toISOString(),
    }
  } catch (err) {
    if (err instanceof OllamaOfflineError) throw err
    console.error('[contingency-ai] Failed:', err)
    throw new Error('Could not generate contingency plans. Please try again.')
  }
}
