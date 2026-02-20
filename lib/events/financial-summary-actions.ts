'use server'

// Event Financial Summary Actions
// Provides comprehensive per-event financial data for the Financial Summary page.
// Wraps the existing event_financial_summary view + getEventProfitSummary()
// with mileage tracking, leftover carry-forward, and historical comparison.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { getEventProfitSummary } from '@/lib/expenses/actions'
import { revalidatePath } from 'next/cache'

// IRS standard mileage rate for 2026 (cents per mile)
// Update annually as IRS publishes new rates.
const IRS_MILEAGE_RATE_CENTS_PER_MILE = 70  // $0.70/mile (2025 rate — adjust when 2026 is published)

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventFinancialSummaryData = {
  event: {
    id: string
    occasion: string | null
    eventDate: string
    guestCount: number
    financialClosed: boolean
    financialClosedAt: string | null
    mileageMiles: number | null
  }
  client: {
    displayName: string
  }
  // Section 2: Revenue
  revenue: {
    quotedPriceCents: number
    basePaymentReceivedCents: number
    tipCents: number
    totalReceivedCents: number
    varianceCents: number  // positive = overpaid (tip or extra), negative = underpaid
  }
  // Section 3: Costs
  costs: {
    projectedFoodCostCents: number | null  // from recipe bible before shopping
    actualGrocerySpendCents: number        // from approved receipt data
    leftoverCreditInCents: number | null   // from prior event surplus
    leftoverCreditOutCents: number | null  // surplus carried to future event
    netFoodCostCents: number               // actual - leftover in - leftover out
    additionalExpensesCents: number        // gas, mileage, specialty non-grocery
    totalCostCents: number
  }
  // Section 4: Margins
  margins: {
    foodCostPercent: number
    grossProfitCents: number
    grossMarginPercent: number
    netProfitWithTipCents: number
  }
  // Section 5: Time (from existing time_tracking fields on events)
  time: {
    shoppingMinutes: number | null
    prepMinutes: number | null
    travelMinutes: number | null
    serviceMinutes: number | null
    resetMinutes: number | null
    totalMinutes: number | null
    effectiveHourlyRateCents: number | null  // net profit / total hours
  }
  // Section 6: Mileage
  mileage: {
    miles: number | null
    irsMileageRateCentsPerMile: number
    deductionValueCents: number | null
  }
  // Section 7: Historical comparison (null if insufficient data)
  comparison: {
    vsAverageFoodCostPercent: number | null
    vsAverageMarginPercent: number | null
    vsClientHistoryNotes: string | null
  } | null
  // Draft mode — which data is pending
  pendingItems: string[]
}

// ─── getEventFinancialSummaryFull ─────────────────────────────────────────────

export async function getEventFinancialSummaryFull(eventId: string): Promise<EventFinancialSummaryData | null> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch base event data with financial fields
  const { data: event } = await supabase
    .from('events')
    .select(`
      id, occasion, event_date, guest_count,
      financial_closed, financial_closed_at,
      mileage_miles,
      leftover_value_carried_forward_cents,
      leftover_value_received_cents,
      leftover_notes,
      client:clients(full_name)
    `)
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  const clientData = event.client as unknown as { full_name: string } | null

  // Fetch profit summary (reuses existing, comprehensive action)
  const profitSummary = await getEventProfitSummary(eventId).catch(() => null)

  const pendingItems: string[] = []

  // Revenue section
  const quotedPriceCents = profitSummary?.revenue.quotedPriceCents ?? 0
  const basePaymentCents = profitSummary?.revenue.totalPaidCents ?? 0
  const tipCents = profitSummary?.revenue.tipCents ?? 0
  const totalReceivedCents = basePaymentCents + tipCents
  const varianceCents = totalReceivedCents - quotedPriceCents

  if (basePaymentCents === 0) pendingItems.push('Payment not yet recorded')

  // Costs section
  const actualGrocerySpendCents = (profitSummary?.expenses.groceriesCents ?? 0)
    + (profitSummary?.expenses.alcoholCents ?? 0)
    + (profitSummary?.expenses.specialtyCents ?? 0)
  const additionalExpensesCents = (profitSummary?.expenses.gasMileageCents ?? 0)
    + (profitSummary?.expenses.otherCents ?? 0)
  const leftoverCreditInCents = event.leftover_value_received_cents ?? null
  const leftoverCreditOutCents = event.leftover_value_carried_forward_cents ?? null

  const netFoodCostCents = actualGrocerySpendCents
    - (leftoverCreditInCents ?? 0)
    - (leftoverCreditOutCents ?? 0)

  const totalCostCents = netFoodCostCents + additionalExpensesCents

  if (actualGrocerySpendCents === 0) pendingItems.push('Receipts not uploaded')

  // Margins
  const grossProfitCents = quotedPriceCents - totalCostCents
  const grossMarginPercent = quotedPriceCents > 0
    ? parseFloat(((grossProfitCents / quotedPriceCents) * 100).toFixed(1))
    : 0
  const foodCostPercent = quotedPriceCents > 0
    ? parseFloat(((netFoodCostCents / quotedPriceCents) * 100).toFixed(1))
    : 0
  const netProfitWithTipCents = grossProfitCents + tipCents

  // Time tracking — from profitSummary.timeInvested (already computed by getEventProfitSummary)
  const timeInvested = profitSummary?.timeInvested ?? null
  const shoppingMinutes = timeInvested?.shoppingMinutes ?? null
  const prepMinutes = timeInvested?.prepMinutes ?? null
  const travelMinutes = timeInvested?.travelMinutes ?? null
  const serviceMinutes = timeInvested?.serviceMinutes ?? null
  const resetMinutes = timeInvested?.resetMinutes ?? null
  const totalMinutes = timeInvested?.totalMinutes ?? null

  const effectiveHourlyRateCents = totalMinutes && totalMinutes > 0 && netProfitWithTipCents
    ? Math.round((netProfitWithTipCents / totalMinutes) * 60)
    : null

  // Mileage
  const mileageMiles = event.mileage_miles ? parseFloat(String(event.mileage_miles)) : null
  const deductionValueCents = mileageMiles
    ? Math.round(mileageMiles * IRS_MILEAGE_RATE_CENTS_PER_MILE)
    : null

  // Historical comparison — fetch chef's average across completed events
  let comparison: EventFinancialSummaryData['comparison'] = null
  const { data: historicalSummaries } = await supabase
    .from('event_financial_summary')
    .select('food_cost_percentage, profit_margin, event_id')
    .eq('tenant_id', user.tenantId!)
    .neq('event_id', eventId)
    .limit(20)

  if (historicalSummaries && historicalSummaries.length >= 3) {
    const validSummaries = historicalSummaries.filter(s =>
      s.food_cost_percentage !== null && s.profit_margin !== null
    )
    if (validSummaries.length >= 3) {
      const avgFoodCost = validSummaries.reduce((sum, s) => sum + (s.food_cost_percentage as number), 0)
        / validSummaries.length
      const avgMargin = validSummaries.reduce((sum, s) => sum + (s.profit_margin as number), 0)
        / validSummaries.length

      comparison = {
        vsAverageFoodCostPercent: parseFloat((foodCostPercent - avgFoodCost * 100).toFixed(1)),
        vsAverageMarginPercent: parseFloat((grossMarginPercent - avgMargin * 100).toFixed(1)),
        vsClientHistoryNotes: null,
      }
    }
  }

  return {
    event: {
      id: eventId,
      occasion: event.occasion,
      eventDate: event.event_date,
      guestCount: event.guest_count,
      financialClosed: event.financial_closed ?? false,
      financialClosedAt: event.financial_closed_at ?? null,
      mileageMiles,
    },
    client: {
      displayName: clientData?.full_name ?? 'Client',
    },
    revenue: {
      quotedPriceCents,
      basePaymentReceivedCents: basePaymentCents,
      tipCents,
      totalReceivedCents,
      varianceCents,
    },
    costs: {
      projectedFoodCostCents: null,  // future: derive from recipe bible
      actualGrocerySpendCents,
      leftoverCreditInCents,
      leftoverCreditOutCents,
      netFoodCostCents,
      additionalExpensesCents,
      totalCostCents,
    },
    margins: {
      foodCostPercent,
      grossProfitCents,
      grossMarginPercent,
      netProfitWithTipCents,
    },
    time: {
      shoppingMinutes,
      prepMinutes,
      travelMinutes,
      serviceMinutes,
      resetMinutes,
      totalMinutes,
      effectiveHourlyRateCents,
    },
    mileage: {
      miles: mileageMiles,
      irsMileageRateCentsPerMile: IRS_MILEAGE_RATE_CENTS_PER_MILE,
      deductionValueCents,
    },
    comparison,
    pendingItems,
  }
}

// ─── markFinancialClosed ──────────────────────────────────────────────────────

/**
 * Mark an event as financially closed.
 * Prerequisites: payment received + receipts reviewed.
 * This sets the event's financial closure flag and triggers the closure checklist update.
 */
export async function markFinancialClosed(eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('events')
    .update({
      financial_closed: true,
      financial_closed_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[markFinancialClosed] Error:', error)
    throw new Error('Failed to close event financially')
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/financial`)

  return { success: true }
}

// ─── updateMileage ────────────────────────────────────────────────────────────

/**
 * Record mileage for an event (round trip: home → stores → client → home).
 */
export async function updateMileage(eventId: string, mileageMiles: number) {
  const user = await requireChef()
  const supabase = createServerClient()

  if (mileageMiles < 0) throw new Error('Mileage must be non-negative')

  const { error } = await supabase
    .from('events')
    .update({ mileage_miles: mileageMiles })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[updateMileage] Error:', error)
    throw new Error('Failed to update mileage')
  }

  revalidatePath(`/events/${eventId}/financial`)
  return { success: true }
}
