'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { ConstraintRadarData } from '@/lib/events/constraint-radar-types'

export async function getEventConstraintRadar(eventId: string): Promise<ConstraintRadarData> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const logistics = {
    groceryDeadlinePassed: false,
    daysUntilEvent: null as number | null,
    hasPrepTimeline: false,
    prepStartDate: null as string | null,
  }
  const financial = {
    paymentStatus: 'unknown' as const,
    budgetStatus: 'unknown' as const,
    foodCostPct: null as number | null,
  }
  const completion = {
    blockingCount: 0,
    score: 0,
    topBlocker: null as { label: string; url: string } | null,
  }

  let dietary: ConstraintRadarData['dietary'] = {
    complexityLevel: 'unknown',
    criticalConflicts: 0,
    activeConflicts: 0,
    unconfirmedAllergies: false,
  }

  try {
    const db: any = createServerClient()
    const { data: event } = await db
      .from('events')
      .select('id, client_id, menu_id, dietary_restrictions, allergies, event_date')
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single()

    if (!event?.client_id) {
      dietary.complexityLevel = 'no_client'
    } else {
      const { data: client } = await db
        .from('clients')
        .select('allergies, dietary_restrictions')
        .eq('id', event.client_id)
        .eq('tenant_id', tenantId)
        .single()

      const { data: guests } = await db
        .from('event_guests')
        .select('dietary_restrictions, allergies, plus_one_dietary, plus_one_allergies')
        .eq('event_id', eventId)

      const { data: allergyRecords } = await db
        .from('client_allergy_records')
        .select('allergen, severity, confirmed_by_chef')
        .eq('client_id', event.client_id)
        .eq('tenant_id', tenantId)

      const allAllergens = new Set<string>()
      const allRestrictions = new Set<string>()

      for (const allergy of client?.allergies || []) allAllergens.add(allergy)
      for (const restriction of client?.dietary_restrictions || []) allRestrictions.add(restriction)
      for (const allergy of event.allergies || []) allAllergens.add(allergy)
      for (const restriction of event.dietary_restrictions || []) allRestrictions.add(restriction)

      for (const guest of guests || []) {
        for (const allergy of guest.allergies || []) allAllergens.add(allergy)
        for (const restriction of guest.dietary_restrictions || []) allRestrictions.add(restriction)
        for (const allergy of guest.plus_one_allergies || []) allAllergens.add(allergy)
        for (const restriction of guest.plus_one_dietary || []) allRestrictions.add(restriction)
      }

      const totalConstraints = allAllergens.size + allRestrictions.size
      const fdaBigNine = new Set([
        'crustacean shellfish',
        'eggs',
        'fish',
        'milk',
        'peanuts',
        'sesame',
        'soybeans',
        'tree nuts',
        'wheat',
      ])
      let criticalCount = 0
      for (const allergy of allAllergens) {
        if (fdaBigNine.has(allergy.toLowerCase())) criticalCount++
      }

      let complexityLevel: ConstraintRadarData['dietary']['complexityLevel'] = 'low'
      if (criticalCount >= 3 || totalConstraints >= 8) complexityLevel = 'critical'
      else if (criticalCount >= 2 || totalConstraints >= 5) complexityLevel = 'high'
      else if (totalConstraints >= 2) complexityLevel = 'moderate'

      dietary = {
        complexityLevel,
        criticalConflicts: criticalCount,
        activeConflicts: totalConstraints,
        unconfirmedAllergies: (allergyRecords || []).some(
          (record: any) => !record.confirmed_by_chef
        ),
      }
    }

    if (event?.event_date) {
      const eventDate = new Date(event.event_date)
      const now = new Date()
      logistics.daysUntilEvent = Math.ceil((eventDate.getTime() - now.getTime()) / 86400000)
    }
  } catch (err) {
    console.error('[constraint-radar] lookup failed:', err)
  }

  return { logistics, financial, dietary, completion }
}
