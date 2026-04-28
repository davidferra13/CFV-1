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

type PrepBlockRow = {
  block_date: string
  block_type: string
  is_completed: boolean
}

type FinancialSummaryRow = {
  quoted_price_cents: number | null
  payment_status: string | null
  total_paid_cents: number | null
  outstanding_balance_cents: number | null
  food_cost_percentage: number | string | null
}

function dateOnly(value: string) {
  return value.includes('T') ? value.slice(0, 10) : value
}

function localDate(value: string) {
  return new Date(`${dateOnly(value)}T00:00:00`)
}

function isBeforeToday(value: string) {
  const target = localDate(value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return target.getTime() < today.getTime()
}

function normalizeFoodCostPct(value: FinancialSummaryRow['food_cost_percentage']) {
  if (value == null) return null

  const numeric = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(numeric)) return null

  return numeric > 0 && numeric <= 1 ? numeric * 100 : numeric
}

function getBudgetStatus(
  foodCostPct: number | null
): ConstraintRadarData['financial']['budgetStatus'] {
  if (foodCostPct == null) return 'unknown'
  if (foodCostPct >= 40) return 'critical'
  if (foodCostPct >= 35) return 'warning'
  return 'ok'
}

function getPaymentStatus(
  summary: FinancialSummaryRow
): ConstraintRadarData['financial']['paymentStatus'] {
  const quotedPrice = summary.quoted_price_cents ?? null
  const totalPaid = summary.total_paid_cents ?? 0
  const outstandingBalance = summary.outstanding_balance_cents ?? null

  if (quotedPrice == null || quotedPrice <= 0) {
    return totalPaid > 0 ? 'paid' : 'unknown'
  }

  if (outstandingBalance != null && outstandingBalance <= 0) return 'paid'
  if (totalPaid > 0) return 'partial'

  if (
    summary.payment_status === 'paid' ||
    summary.payment_status === 'partial' ||
    summary.payment_status === 'unpaid'
  ) {
    return summary.payment_status
  }

  return 'unpaid'
}

export async function getEventConstraintRadar(eventId: string): Promise<ConstraintRadarData> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  // Start unknown, then fill each section from available event data.
  const logistics: ConstraintRadarData['logistics'] = {
    groceryDeadlinePassed: false,
    daysUntilEvent: null,
    hasPrepTimeline: false,
    prepStartDate: null,
  }
  const financial: ConstraintRadarData['financial'] = {
    paymentStatus: 'unknown',
    budgetStatus: 'unknown',
    foodCostPct: null,
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

      // Fetch household member dietary data for the client
      // Household members (spouse, children, etc.) may have allergies that
      // MUST be considered when planning menus for the event.
      let householdMembers: Array<{ allergies: string[]; dietary_restrictions: string[] }> = []
      try {
        const { data: profiles } = await db
          .from('hub_guest_profiles')
          .select('id')
          .eq('client_id', event.client_id)

        const profileIds = (profiles || []).map((p: any) => p.id)
        if (profileIds.length > 0) {
          const { data: members } = await db
            .from('hub_household_members')
            .select('allergies, dietary_restrictions')
            .in('profile_id', profileIds)

          householdMembers = members || []
        }
      } catch (err) {
        console.warn('[constraint-radar] household member lookup failed (non-blocking):', err)
      }

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

      // Include household member allergies and dietary restrictions
      for (const m of householdMembers) {
        for (const a of m.allergies || []) allAllergens.add(a)
        for (const r of m.dietary_restrictions || []) allRestrictions.add(r)
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
      const eventDate = localDate(event.event_date)
      const now = new Date()
      const diffMs = eventDate.getTime() - now.getTime()
      logistics.daysUntilEvent = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    }

    try {
      const { data: prepBlocks, error: prepBlocksError } = await db
        .from('event_prep_blocks')
        .select('block_date, block_type, is_completed')
        .eq('event_id', eventId)
        .eq('chef_id', tenantId)
        .order('block_date', { ascending: true })

      if (prepBlocksError) {
        console.warn('[constraint-radar] prep block lookup failed:', prepBlocksError)
      } else {
        const blocks = ((prepBlocks ?? []) as PrepBlockRow[]).filter((block) => block.block_date)
        const firstBlock = blocks[0] ?? null
        const shoppingBlock =
          blocks.find((block) => block.block_type === 'shopping' && !block.is_completed) ?? null

        logistics.hasPrepTimeline = blocks.length > 0
        logistics.prepStartDate = firstBlock?.block_date ?? null
        logistics.groceryDeadlinePassed = Boolean(
          shoppingBlock && isBeforeToday(shoppingBlock.block_date)
        )
      }
    } catch (err) {
      console.warn('[constraint-radar] prep block lookup failed:', err)
    }

    try {
      const { data: financialSummary, error: financialError } = await db
        .from('event_financial_summary')
        .select(
          'quoted_price_cents, payment_status, total_paid_cents, outstanding_balance_cents, food_cost_percentage'
        )
        .eq('event_id', eventId)
        .eq('tenant_id', tenantId)
        .single()

      if (financialError) {
        console.warn('[constraint-radar] financial lookup failed:', financialError)
      } else if (financialSummary) {
        const summary = financialSummary as FinancialSummaryRow
        const foodCostPct = normalizeFoodCostPct(summary.food_cost_percentage)

        financial.paymentStatus = getPaymentStatus(summary)
        financial.foodCostPct = foodCostPct
        financial.budgetStatus = getBudgetStatus(foodCostPct)
      }
    } catch (err) {
      console.warn('[constraint-radar] financial lookup failed:', err)
    }
  } catch (err) {
    console.error('[constraint-radar] dietary check error:', err)
  }

  return { logistics, financial, dietary, completion }
}
