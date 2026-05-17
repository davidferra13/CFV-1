'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { UnknownAppError } from '@/lib/errors/app-error'
import { revalidatePath } from 'next/cache'
import type {
  AllergySeverity,
  GuestAllergy,
  AllergyReport,
  AllergyReportEntry,
  CrossContaminationRisk,
  EmergencyInfo,
  KitchenAllergyBriefing,
  BriefingEntry,
} from './allergy-severity-types'
import { SEVERITY_PROTOCOLS } from './allergy-severity-types'

// ---------------------------------------------------------------------------
// Set (upsert) a guest's allergy severity for a specific allergen
// ---------------------------------------------------------------------------
export async function setGuestAllergySeverity(
  guestId: string,
  allergen: string,
  severity: AllergySeverity,
  options?: {
    notes?: string
    emergency_contact_name?: string
    emergency_contact_phone?: string
    has_epipen?: boolean
  }
): Promise<GuestAllergy> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Verify guest belongs to tenant
  const { data: guest, error: guestErr } = await db
    .from('event_guests')
    .select('id, event_id')
    .eq('id', guestId)
    .eq('tenant_id', tenantId)
    .single()

  if (guestErr || !guest) {
    throw new UnknownAppError('Guest not found or access denied')
  }

  const trimmedAllergen = allergen.trim()
  if (!trimmedAllergen) {
    throw new UnknownAppError('Allergen name is required')
  }

  const validSeverities: AllergySeverity[] = ['preference', 'intolerance', 'allergy']
  if (!validSeverities.includes(severity)) {
    throw new UnknownAppError('Invalid severity level')
  }

  // Upsert: update if same guest+allergen exists, else insert
  const row = {
    guest_id: guestId,
    tenant_id: tenantId,
    allergen: trimmedAllergen,
    severity,
    notes: options?.notes ?? null,
    emergency_contact_name: options?.emergency_contact_name ?? null,
    emergency_contact_phone: options?.emergency_contact_phone ?? null,
    has_epipen: options?.has_epipen ?? false,
    updated_at: new Date().toISOString(),
  }

  const { data: existing } = await db
    .from('guest_allergies')
    .select('id')
    .eq('guest_id', guestId)
    .ilike('allergen', trimmedAllergen)
    .maybeSingle()

  let result: GuestAllergy

  if (existing) {
    const { data, error } = await db
      .from('guest_allergies')
      .update(row)
      .eq('id', existing.id)
      .select('*')
      .single()

    if (error || !data) {
      throw new UnknownAppError(`Failed to update allergy: ${error?.message ?? 'unknown'}`)
    }
    result = data as GuestAllergy
  } else {
    const { data, error } = await db.from('guest_allergies').insert(row).select('*').single()

    if (error || !data) {
      throw new UnknownAppError(`Failed to create allergy: ${error?.message ?? 'unknown'}`)
    }
    result = data as GuestAllergy
  }

  revalidatePath(`/events/${guest.event_id}`)
  return result
}

// ---------------------------------------------------------------------------
// Get all allergies with severity for a guest
// ---------------------------------------------------------------------------
export async function getGuestAllergies(guestId: string): Promise<GuestAllergy[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data, error } = await db
    .from('guest_allergies')
    .select('*')
    .eq('guest_id', guestId)
    .eq('tenant_id', tenantId)
    .order('severity', { ascending: true })

  if (error) {
    throw new UnknownAppError(`Failed to fetch guest allergies: ${error.message}`)
  }

  return (data ?? []) as GuestAllergy[]
}

// ---------------------------------------------------------------------------
// Aggregated allergy report for all event guests
// ---------------------------------------------------------------------------
export async function getEventAllergyReport(eventId: string): Promise<AllergyReport> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Verify event belongs to tenant
  const { data: event, error: eventErr } = await db
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventErr || !event) {
    throw new UnknownAppError('Event not found or access denied')
  }

  // Get all guests for event
  const { data: guests } = await db
    .from('event_guests')
    .select('id, full_name')
    .eq('event_id', eventId)

  if (!guests || guests.length === 0) {
    return { allergies: [], intolerances: [], preferences: [], total_guests_with_restrictions: 0 }
  }

  const guestIds = guests.map((g: any) => g.id)
  const guestNameMap: Record<string, string> = {}
  for (const g of guests) {
    guestNameMap[g.id] = g.full_name ?? 'Guest'
  }

  // Get all severity-tracked allergies for these guests
  const { data: allergyRows, error: allergyErr } = await db
    .from('guest_allergies')
    .select('*')
    .in('guest_id', guestIds)
    .eq('tenant_id', tenantId)

  if (allergyErr) {
    throw new UnknownAppError(`Failed to fetch event allergies: ${allergyErr.message}`)
  }

  const rows = (allergyRows ?? []) as GuestAllergy[]

  const toEntry = (row: GuestAllergy): AllergyReportEntry => ({
    guest_id: row.guest_id,
    guest_name: guestNameMap[row.guest_id] ?? 'Guest',
    allergen: row.allergen,
    severity: row.severity,
    notes: row.notes,
    has_epipen: row.has_epipen,
    emergency_contact_name: row.emergency_contact_name,
    emergency_contact_phone: row.emergency_contact_phone,
  })

  const allergies = rows.filter((r) => r.severity === 'allergy').map(toEntry)
  const intolerances = rows.filter((r) => r.severity === 'intolerance').map(toEntry)
  const preferences = rows.filter((r) => r.severity === 'preference').map(toEntry)

  const guestsWithRestrictions = new Set(rows.map((r) => r.guest_id))

  return {
    allergies,
    intolerances,
    preferences,
    total_guests_with_restrictions: guestsWithRestrictions.size,
  }
}

// ---------------------------------------------------------------------------
// Cross-contamination risks: dishes containing allergens that affect guests
// ---------------------------------------------------------------------------
export async function getEventCrossContaminationRisks(
  eventId: string
): Promise<CrossContaminationRisk[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Get event with menu
  const { data: event, error: eventErr } = await db
    .from('events')
    .select('id, menu_id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventErr || !event) {
    throw new UnknownAppError('Event not found or access denied')
  }

  if (!event.menu_id) {
    return []
  }

  // Get guests and their severity-tracked allergies
  const { data: guests } = await db
    .from('event_guests')
    .select('id, full_name')
    .eq('event_id', eventId)

  if (!guests || guests.length === 0) return []

  const guestIds = guests.map((g: any) => g.id)
  const guestNameMap: Record<string, string> = {}
  for (const g of guests) {
    guestNameMap[g.id] = g.full_name ?? 'Guest'
  }

  // Only look at intolerance and allergy tiers for cross-contamination
  const { data: allergyRows } = await db
    .from('guest_allergies')
    .select('*')
    .in('guest_id', guestIds)
    .eq('tenant_id', tenantId)
    .in('severity', ['intolerance', 'allergy'])

  if (!allergyRows || allergyRows.length === 0) return []

  // Get dishes with allergen flags
  const { data: dishes } = await db
    .from('dishes')
    .select('id, name, allergen_flags')
    .eq('menu_id', event.menu_id)
    .eq('tenant_id', tenantId)

  if (!dishes || dishes.length === 0) return []

  const risks: CrossContaminationRisk[] = []

  for (const dish of dishes) {
    const flags: string[] = Array.isArray(dish.allergen_flags) ? dish.allergen_flags : []
    if (flags.length === 0) continue

    for (const flag of flags) {
      const normalizedFlag = flag.toLowerCase().trim()

      // Find guests affected by this allergen
      const affectedGuests: CrossContaminationRisk['affected_guests'] = []
      let highestSeverity: AllergySeverity = 'intolerance'

      for (const row of allergyRows as GuestAllergy[]) {
        const normalizedAllergen = row.allergen.toLowerCase().trim()
        if (
          normalizedAllergen === normalizedFlag ||
          normalizedAllergen.includes(normalizedFlag) ||
          normalizedFlag.includes(normalizedAllergen)
        ) {
          affectedGuests.push({
            guest_id: row.guest_id,
            guest_name: guestNameMap[row.guest_id] ?? 'Guest',
            has_epipen: row.has_epipen,
          })
          if (row.severity === 'allergy') {
            highestSeverity = 'allergy'
          }
        }
      }

      if (affectedGuests.length > 0) {
        risks.push({
          dish_id: dish.id,
          dish_name: dish.name ?? 'Unnamed dish',
          allergen: flag,
          severity: highestSeverity,
          affected_guests: affectedGuests,
        })
      }
    }
  }

  return risks
}

// ---------------------------------------------------------------------------
// Set emergency info (EpiPen, emergency contact) for a guest
// ---------------------------------------------------------------------------
export async function setGuestEmergencyInfo(guestId: string, info: EmergencyInfo): Promise<void> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Verify guest belongs to tenant
  const { data: guest, error: guestErr } = await db
    .from('event_guests')
    .select('id, event_id')
    .eq('id', guestId)
    .eq('tenant_id', tenantId)
    .single()

  if (guestErr || !guest) {
    throw new UnknownAppError('Guest not found or access denied')
  }

  // Update all allergy-tier records for this guest with emergency info
  const { error } = await db
    .from('guest_allergies')
    .update({
      emergency_contact_name: info.emergency_contact_name,
      emergency_contact_phone: info.emergency_contact_phone,
      has_epipen: info.has_epipen,
      updated_at: new Date().toISOString(),
    })
    .eq('guest_id', guestId)
    .eq('tenant_id', tenantId)
    .eq('severity', 'allergy')

  if (error) {
    throw new UnknownAppError(`Failed to update emergency info: ${error.message}`)
  }

  revalidatePath(`/events/${guest.event_id}`)
}

// ---------------------------------------------------------------------------
// Kitchen allergy briefing: prep-ready, severity-coded
// ---------------------------------------------------------------------------
export async function getKitchenAllergyBriefing(eventId: string): Promise<KitchenAllergyBriefing> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Get event
  const { data: event, error: eventErr } = await db
    .from('events')
    .select('id, title, menu_id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventErr || !event) {
    throw new UnknownAppError('Event not found or access denied')
  }

  // Get guests for event
  const { data: guests } = await db
    .from('event_guests')
    .select('id, full_name')
    .eq('event_id', eventId)

  if (!guests || guests.length === 0) {
    return {
      event_id: eventId,
      event_name: event.title ?? null,
      critical_allergies: [],
      intolerances: [],
      preferences: [],
      separation_protocols: [],
    }
  }

  const guestIds = guests.map((g: any) => g.id)
  const guestNameMap: Record<string, string> = {}
  for (const g of guests) {
    guestNameMap[g.id] = g.full_name ?? 'Guest'
  }

  // Get all severity-tracked records
  const { data: allergyRows } = await db
    .from('guest_allergies')
    .select('*')
    .in('guest_id', guestIds)
    .eq('tenant_id', tenantId)

  const rows = (allergyRows ?? []) as GuestAllergy[]

  const toBriefingEntry = (row: GuestAllergy): BriefingEntry => ({
    guest_name: guestNameMap[row.guest_id] ?? 'Guest',
    allergen: row.allergen,
    severity: row.severity,
    protocol: SEVERITY_PROTOCOLS[row.severity],
    has_epipen: row.has_epipen,
    emergency_contact_name: row.emergency_contact_name,
    emergency_contact_phone: row.emergency_contact_phone,
  })

  const critical = rows.filter((r) => r.severity === 'allergy').map(toBriefingEntry)
  const intol = rows.filter((r) => r.severity === 'intolerance').map(toBriefingEntry)
  const prefs = rows.filter((r) => r.severity === 'preference').map(toBriefingEntry)

  // Generate separation protocols for allergy-tier items
  const separationProtocols: string[] = []
  const allergyAllergens = [...new Set(critical.map((c) => c.allergen))]

  for (const allergen of allergyAllergens) {
    const affectedGuests = critical.filter((c) => c.allergen === allergen).map((c) => c.guest_name)

    separationProtocols.push(
      `Prep allergy-safe dishes FIRST before any ${allergen} enters the kitchen. Affected: ${affectedGuests.join(', ')}.`
    )
    separationProtocols.push(`Use separate cutting boards and utensils for ${allergen}-free prep.`)
    separationProtocols.push(`Verify all ingredient labels for hidden ${allergen} content.`)
  }

  return {
    event_id: eventId,
    event_name: event.title ?? null,
    critical_allergies: critical,
    intolerances: intol,
    preferences: prefs,
    separation_protocols: separationProtocols,
  }
}
