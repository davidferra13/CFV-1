// Event Dietary Context Actions
// Aggregates dietary restrictions from the event's client AND all attending guests,
// with per-person attribution. Used by DietaryAlertsBanner on event detail pages.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// --- Types ---

export interface PersonDietaryInfo {
  name: string
  role: 'client' | 'guest' | 'plus_one'
  clientId: string | null
  allergies: string[]
  dietaryRestrictions: string[]
  severity: 'critical' | 'warning' | 'info'
}

export interface EventDietaryContext {
  people: PersonDietaryInfo[]
  totalAllergies: number
  totalRestrictions: number
  hasCritical: boolean
}

// Critical allergens (life-threatening, FDA Big 9 category)
const CRITICAL_ALLERGENS = new Set([
  'peanut',
  'peanuts',
  'tree nut',
  'tree nuts',
  'nuts',
  'shellfish',
  'sesame',
  'anaphylaxis',
  'epipen',
])

function classifyPersonSeverity(allergies: string[]): 'critical' | 'warning' | 'info' {
  for (const a of allergies) {
    if (CRITICAL_ALLERGENS.has(a.toLowerCase().trim())) return 'critical'
  }
  if (allergies.length > 0) return 'warning'
  return 'info'
}

function safeArray(val: string[] | null | undefined): string[] {
  return Array.isArray(val) ? val.filter(Boolean) : []
}

/**
 * Get all dietary restrictions and allergies for an event, attributed per person.
 * Includes: the booking client (from client_allergy_records + client.allergies/dietary_restrictions)
 * and all attending guests (from event_guests).
 */
export async function getEventDietaryContext(eventId: string): Promise<EventDietaryContext> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch event with client info
  const { data: event } = await db
    .from('events')
    .select(
      'id, client_id, dietary_restrictions, allergies, client:clients(id, full_name, allergies, dietary_restrictions)'
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return { people: [], totalAllergies: 0, totalRestrictions: 0, hasCritical: false }

  const people: PersonDietaryInfo[] = []

  // 1. Client (booker) dietary data
  const clientData = event.client as any
  if (clientData) {
    // Also check structured allergy records for the client
    const { data: allergyRecords } = await db
      .from('client_allergy_records')
      .select('allergen, severity')
      .eq('client_id', clientData.id)
      .eq('tenant_id', user.tenantId!)

    const clientAllergies = safeArray(clientData.allergies)
    const recordAllergens = (allergyRecords || []).map((r: any) => r.allergen)
    // Merge and deduplicate
    const mergedAllergies = [...new Set([...clientAllergies, ...recordAllergens])]
    const clientRestrictions = safeArray(clientData.dietary_restrictions)

    // Also include event-level dietary data
    const eventAllergies = safeArray(event.allergies)
    const eventRestrictions = safeArray(event.dietary_restrictions)
    const allAllergies = [...new Set([...mergedAllergies, ...eventAllergies])]
    const allRestrictions = [...new Set([...clientRestrictions, ...eventRestrictions])]

    if (allAllergies.length > 0 || allRestrictions.length > 0) {
      // Check if any allergy record is anaphylaxis-severity
      const hasAnaphylaxis = (allergyRecords || []).some((r: any) => r.severity === 'anaphylaxis')
      let severity = classifyPersonSeverity(allAllergies)
      if (hasAnaphylaxis) severity = 'critical'

      people.push({
        name: clientData.full_name || 'Client',
        role: 'client',
        clientId: clientData.id,
        allergies: allAllergies,
        dietaryRestrictions: allRestrictions,
        severity,
      })
    }
  }

  // 2. RSVP guests
  const { data: guests } = await db
    .from('event_guests')
    .select(
      'full_name, allergies, dietary_restrictions, plus_one_name, plus_one_allergies, plus_one_dietary, rsvp_status'
    )
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (guests) {
    for (const g of guests) {
      const gAllergies = safeArray(g.allergies)
      const gRestrictions = safeArray(g.dietary_restrictions)
      if (gAllergies.length > 0 || gRestrictions.length > 0) {
        people.push({
          name: g.full_name || 'Guest',
          role: 'guest',
          clientId: null,
          allergies: gAllergies,
          dietaryRestrictions: gRestrictions,
          severity: classifyPersonSeverity(gAllergies),
        })
      }

      // Plus-one
      if (g.plus_one_name) {
        const poAllergies = safeArray(
          Array.isArray(g.plus_one_allergies)
            ? g.plus_one_allergies
            : g.plus_one_allergies
              ? [g.plus_one_allergies]
              : []
        )
        const poRestrictions = safeArray(
          Array.isArray(g.plus_one_dietary)
            ? g.plus_one_dietary
            : g.plus_one_dietary
              ? [g.plus_one_dietary]
              : []
        )
        if (poAllergies.length > 0 || poRestrictions.length > 0) {
          people.push({
            name: g.plus_one_name,
            role: 'plus_one',
            clientId: null,
            allergies: poAllergies,
            dietaryRestrictions: poRestrictions,
            severity: classifyPersonSeverity(poAllergies),
          })
        }
      }
    }
  }

  // Sort: critical first, then warning, then info
  const severityOrder = { critical: 0, warning: 1, info: 2 }
  people.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  const totalAllergies = people.reduce((sum, p) => sum + p.allergies.length, 0)
  const totalRestrictions = people.reduce((sum, p) => sum + p.dietaryRestrictions.length, 0)
  const hasCritical = people.some((p) => p.severity === 'critical')

  return { people, totalAllergies, totalRestrictions, hasCritical }
}

/**
 * Get upcoming events for a client where their dietary restrictions will apply.
 * Returns events that are in the future and not cancelled.
 */
export async function getClientUpcomingDietaryEvents(clientId: string): Promise<
  Array<{
    id: string
    eventDate: string
    occasion: string | null
    status: string
    guestCount: number | null
    hasMenu: boolean
  }>
> {
  const user = await requireChef()
  const db: any = createServerClient()

  const today = new Date().toISOString().split('T')[0]

  const { data: events } = await db
    .from('events')
    .select('id, event_date, occasion, status, guest_count, menu_id')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', today)
    .not('status', 'eq', 'cancelled')
    .order('event_date', { ascending: true })
    .limit(10)

  if (!events) return []

  return events.map((e: any) => ({
    id: e.id,
    eventDate: e.event_date,
    occasion: e.occasion ?? null,
    status: e.status,
    guestCount: e.guest_count ?? null,
    hasMenu: Boolean(e.menu_id),
  }))
}
