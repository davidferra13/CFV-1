'use server'

// Allergen Risk Matrix
// Privacy-first: guest PII (allergies, dietary restrictions) routed to local Ollama.
// Scans every proposed dish on the event against every attending guest's restrictions.
// Output is DRAFT ONLY — requires chef confirmation, never writes canon data.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from './parse-ollama'
import { withAiFallback } from './with-ai-fallback'
import { buildAllergenMatrixFormula } from '@/lib/formulas/allergen-matrix'
import { z } from 'zod'

// ── Zod schema ──────────────────────────────────────────────────────────────

const RiskLevel = z.enum(['safe', 'may_contain', 'contains', 'unknown'])

const DishRiskSchema = z.object({
  dish: z.string(),
  guestName: z.string(),
  riskLevel: RiskLevel,
  triggerAllergen: z.string().nullable(), // e.g. "shellfish", null if safe
  notes: z.string().nullable(),
})

const AllergenRiskResultSchema = z.object({
  rows: z.array(DishRiskSchema),
  safetyFlags: z.array(z.string()), // critical safety warnings
  confidence: z.enum(['high', 'medium', 'low']),
})

export type AllergenRiskResult = z.infer<typeof AllergenRiskResultSchema>
export type DishRisk = z.infer<typeof DishRiskSchema>

// ── Server Action ─────────────────────────────────────────────────────────

export async function getEventAllergenRisk(eventId: string): Promise<AllergenRiskResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch event + guests + menu components
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const [eventResult, guestsResult, menuResult]: [
    { data: { occasion: string | null; dietary_restrictions: unknown; allergies: unknown } | null },
    {
      data:
        | {
            name: string | null
            dietary_restrictions: unknown
            allergies: unknown
            notes: string | null
          }[]
        | null
    },
    { data: { name: string; description: string | null; allergen_tags: unknown }[] | null },
  ] = await Promise.all([
    db
      .from('events')
      .select('occasion, dietary_restrictions, allergies')
      .eq('id', eventId)
      .eq('tenant_id', user.tenantId!)
      .single(),
    db
      .from('event_guests')
      .select('name, dietary_restrictions, allergies, notes')
      .eq('event_id', eventId),
    db
      .from('event_menu_components' as any)
      .select('name, description, allergen_tags')
      .eq('event_id', eventId),
  ])

  const event = eventResult.data
  if (!event) throw new Error('Event not found')

  const guests = guestsResult.data ?? []
  const menuItems = menuResult.data ?? []

  if (menuItems.length === 0) {
    return {
      rows: [],
      safetyFlags: ['No menu items assigned yet — add dishes to run allergen analysis.'],
      confidence: 'low',
    }
  }

  // Combine event-level + guest-level restrictions
  const guestProfiles = guests.map((g) => ({
    name: g.name ?? 'Unknown Guest',
    restrictions: [
      ...(Array.isArray(g.dietary_restrictions) ? g.dietary_restrictions : []),
      ...(Array.isArray(g.allergies) ? g.allergies : []),
      g.notes ?? '',
    ]
      .filter(Boolean)
      .join(', '),
  }))

  // Add event-level restrictions as a "General" guest entry if no individual guests
  if (guestProfiles.length === 0) {
    const eventRestrictions = [
      ...(Array.isArray(event.dietary_restrictions) ? event.dietary_restrictions : []),
      ...(Array.isArray(event.allergies) ? event.allergies : []),
    ]
      .filter(Boolean)
      .join(', ')
    if (eventRestrictions) {
      guestProfiles.push({ name: 'All Guests (event-level)', restrictions: eventRestrictions })
    }
  }

  if (guestProfiles.length === 0) {
    return { rows: [], safetyFlags: ['No guest dietary information recorded.'], confidence: 'low' }
  }

  const systemPrompt = `You are a food safety expert. Analyze the proposed menu against each guest's dietary restrictions and allergies.
For every (dish, guest) pair, determine the risk level:
  - safe: the dish contains no known allergens for this guest
  - may_contain: possible cross-contamination or uncertain ingredient
  - contains: the dish definitively contains an allergen relevant to this guest
  - unknown: insufficient ingredient information to assess

Always be conservative — when uncertain, use "may_contain" not "safe".
SAFETY PRIORITY: Severe allergies (nuts, shellfish, gluten celiac) should be flagged even for "may_contain" scenarios.
Return valid JSON only, no markdown.`

  const userContent = `
Menu dishes:
${menuItems.map((m) => `- ${m.name}${m.description ? ': ' + m.description : ''}${m.allergen_tags ? ' [tags: ' + (m.allergen_tags as string[]).join(', ') + ']' : ''}`).join('\n')}

Guest dietary profiles:
${guestProfiles.map((g) => `- ${g.name}: ${g.restrictions || 'No restrictions noted'}`).join('\n')}

Return JSON: { "rows": [{"dish":"...","guestName":"...","riskLevel":"safe|may_contain|contains|unknown","triggerAllergen":"...or null","notes":"...or null"}], "safetyFlags": ["critical warnings"], "confidence": "high|medium|low" }
`

  // Build formula inputs from the data we already loaded
  const formulaGuests = guestProfiles.map((g) => ({
    name: g.name,
    restrictions: g.restrictions ? g.restrictions.split(', ').filter(Boolean) : [],
  }))
  const formulaMenuItems = menuItems.map((m) => ({
    name: m.name,
    description: m.description,
    allergenTags: m.allergen_tags as string[] | null,
  }))

  const { result, source } = await withAiFallback(
    // Formula: FDA Big 9 + common allergen keyword lookup — deterministic
    () => buildAllergenMatrixFormula(formulaGuests, formulaMenuItems),
    // AI: enhanced analysis with contextual reasoning (when Ollama is online)
    () => parseWithOllama(systemPrompt, userContent, AllergenRiskResultSchema)
  )

  return { ...result, _aiSource: source }
}
