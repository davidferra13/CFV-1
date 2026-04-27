'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'

export type ConstraintRadarData = {
  logistics: {
    groceryDeadlinePassed: boolean
    daysUntilEvent: number | null
    hasPrepTimeline: boolean
    prepStartDate: string | null
  }
  financial: {
    paymentStatus: 'unpaid' | 'partial' | 'paid' | 'unknown'
    budgetStatus: 'critical' | 'warning' | 'ok' | 'unknown'
    foodCostPct: number | null
  }
  dietary: {
    complexityLevel: 'no_client' | 'unknown' | 'high' | 'critical' | 'moderate' | 'low'
    criticalConflicts: number
    activeConflicts: number
    unconfirmedAllergies: boolean
  }
  completion: {
    blockingCount: number
    score: number
    topBlocker: { label: string; url: string } | null
  }
}

export async function getEventConstraintRadar(eventId: string): Promise<ConstraintRadarData> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  // Default stubs for non-dietary sections (still TODO)
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

  // Dietary: real data from client/guest allergy records
  let dietary: ConstraintRadarData['dietary'] = {
    complexityLevel: 'unknown',
    criticalConflicts: 0,
    activeConflicts: 0,
    unconfirmedAllergies: false,
  }

  try {
    const db: any = createServerClient() as any

    // Fetch event with client
    const { data: event } = await db
      .from('events')
      .select('id, client_id, menu_id, dietary_restrictions, allergies, event_date')
      .eq('id', eventId)
      .eq('tenant_id', tenantId)
      .single()

    if (!event?.client_id) {
      dietary.complexityLevel = 'no_client'
    } else {
      // Fetch client allergies
      const { data: client } = await db
        .from('clients')
        .select('allergies, dietary_restrictions')
        .eq('id', event.client_id)
        .eq('tenant_id', tenantId)
        .single()

      // Fetch guest dietary data
      const { data: guests } = await db
        .from('event_guests')
        .select('dietary_restrictions, allergies, plus_one_dietary, plus_one_allergies')
        .eq('event_id', eventId)

      // Check for unconfirmed allergy records
      const { data: allergyRecords } = await db
        .from('client_allergy_records')
        .select('allergen, severity, confirmed_by_chef')
        .eq('client_id', event.client_id)
        .eq('tenant_id', tenantId)

      const hasUnconfirmed = (allergyRecords || []).some((r: any) => !r.confirmed_by_chef)

      // Count all unique allergens/restrictions across event
      const allAllergens = new Set<string>()
      const allRestrictions = new Set<string>()

      for (const a of client?.allergies || []) allAllergens.add(a)
      for (const r of client?.dietary_restrictions || []) allRestrictions.add(r)
      for (const a of event.allergies || []) allAllergens.add(a)
      for (const r of event.dietary_restrictions || []) allRestrictions.add(r)

      for (const g of guests || []) {
        for (const a of g.allergies || []) allAllergens.add(a)
        for (const r of g.dietary_restrictions || []) allRestrictions.add(r)
        for (const a of g.plus_one_allergies || []) allAllergens.add(a)
        for (const r of g.plus_one_dietary || []) allRestrictions.add(r)
      }

      const totalConstraints = allAllergens.size + allRestrictions.size

      // Count critical (FDA Big 9) allergens
      const FDA_BIG_9_LOWER = new Set([
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
      for (const a of allAllergens) {
        if (FDA_BIG_9_LOWER.has(a.toLowerCase())) criticalCount++
      }

      // Determine complexity level
      let level: ConstraintRadarData['dietary']['complexityLevel'] = 'low'
      if (totalConstraints === 0) {
        level = 'low'
      } else if (criticalCount >= 3 || totalConstraints >= 8) {
        level = 'critical'
      } else if (criticalCount >= 2 || totalConstraints >= 5) {
        level = 'high'
      } else if (totalConstraints >= 2) {
        level = 'moderate'
      }

      dietary = {
        complexityLevel: level,
        criticalConflicts: criticalCount,
        activeConflicts: totalConstraints,
        unconfirmedAllergies: hasUnconfirmed,
      }
    }

    // Logistics: compute days until event
    if (event?.event_date) {
      const eventDate = new Date(event.event_date)
      const now = new Date()
      const diffMs = eventDate.getTime() - now.getTime()
      logistics.daysUntilEvent = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    }
  } catch (err) {
    console.error('[constraint-radar] dietary check error:', err)
  }

  return { logistics, financial, dietary, completion }
}
