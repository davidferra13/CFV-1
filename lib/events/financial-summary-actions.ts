'use server'

// Event Financial Summary Actions
// Provides comprehensive per-event financial data for the Financial Summary page.
// Wraps the existing event_financial_summary view + getEventProfitSummary()
// with mileage tracking, leftover carry-forward, and historical comparison.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getEventProfitSummary } from '@/lib/expenses/actions'
import { revalidatePath } from 'next/cache'

// IRS standard mileage rate (cents per mile).
// 2025 rate: $0.70/mile (67 cents in 2024). The 2026 rate is typically announced
// in December of the prior year - check https://www.irs.gov/tax-professionals/standard-mileage-rates
// and update this constant when the IRS publishes the new rate.
const IRS_MILEAGE_RATE_CENTS_PER_MILE = 70 // $0.70/mile - verify 2026 rate when published

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
    varianceCents: number // positive = overpaid (tip or extra), negative = underpaid
  }
  // Section 3: Costs
  costs: {
    projectedFoodCostCents: number | null // from recipe book before shopping
    actualGrocerySpendCents: number // from approved receipt data
    leftoverCreditInCents: number | null // from prior event surplus
    leftoverCreditOutCents: number | null // surplus carried to future event
    netFoodCostCents: number // actual - leftover in - leftover out
    additionalExpensesCents: number // gas, mileage, specialty non-grocery
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
    effectiveHourlyRateCents: number | null // net profit / total hours
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
  // Draft mode - which data is pending
  pendingItems: string[]
}

// ─── getEventFinancialSummaryFull ─────────────────────────────────────────────

export async function getEventFinancialSummaryFull(
  eventId: string
): Promise<EventFinancialSummaryData | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch base event data with financial fields
  const { data: event } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count,
      financial_closed, financial_closed_at,
      mileage_miles,
      leftover_value_carried_forward_cents,
      leftover_value_received_cents,
      leftover_notes,
      client:clients(full_name)
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  const clientData = event.client as unknown as { full_name: string } | null

  // Fetch profit summary (reuses existing, comprehensive action)
  let profitSummary: Awaited<ReturnType<typeof getEventProfitSummary>> | null = null
  let profitSummaryError: string | null = null
  try {
    profitSummary = await getEventProfitSummary(eventId)
  } catch (err) {
    console.error('[getEventFinancialSummaryFull] getEventProfitSummary failed:', err)
    profitSummaryError = err instanceof Error ? err.message : 'Unknown error'
  }

  const pendingItems: string[] = []
  if (profitSummaryError) {
    pendingItems.push(`Financial data unavailable: ${profitSummaryError}`)
  }

  // Revenue section
  const quotedPriceCents = profitSummary?.revenue.quotedPriceCents ?? 0
  const basePaymentCents = profitSummary?.revenue.totalPaidCents ?? 0
  const tipCents = profitSummary?.revenue.tipCents ?? 0
  const totalReceivedCents = basePaymentCents + tipCents
  const varianceCents = totalReceivedCents - quotedPriceCents

  if (basePaymentCents === 0) pendingItems.push('Payment not yet recorded')

  // Costs section
  const actualGrocerySpendCents =
    (profitSummary?.expenses.groceriesCents ?? 0) +
    (profitSummary?.expenses.alcoholCents ?? 0) +
    (profitSummary?.expenses.specialtyCents ?? 0)
  const additionalExpensesCents =
    (profitSummary?.expenses.gasMileageCents ?? 0) + (profitSummary?.expenses.otherCents ?? 0)
  const leftoverCreditInCents = event.leftover_value_received_cents ?? null
  const leftoverCreditOutCents = event.leftover_value_carried_forward_cents ?? null

  const netFoodCostCents =
    actualGrocerySpendCents - (leftoverCreditInCents ?? 0) - (leftoverCreditOutCents ?? 0)

  const totalCostCents = netFoodCostCents + additionalExpensesCents

  if (actualGrocerySpendCents === 0) pendingItems.push('Receipts not uploaded')

  // Margins
  const grossProfitCents = quotedPriceCents - totalCostCents
  const grossMarginPercent =
    quotedPriceCents > 0 ? parseFloat(((grossProfitCents / quotedPriceCents) * 100).toFixed(1)) : 0
  const foodCostPercent =
    quotedPriceCents > 0 ? parseFloat(((netFoodCostCents / quotedPriceCents) * 100).toFixed(1)) : 0
  const netProfitWithTipCents = grossProfitCents + tipCents

  // Time tracking - from profitSummary.timeInvested (already computed by getEventProfitSummary)
  const timeInvested = profitSummary?.timeInvested ?? null
  const shoppingMinutes = timeInvested?.shoppingMinutes ?? null
  const prepMinutes = timeInvested?.prepMinutes ?? null
  const travelMinutes = timeInvested?.travelMinutes ?? null
  const serviceMinutes = timeInvested?.serviceMinutes ?? null
  const resetMinutes = timeInvested?.resetMinutes ?? null
  const totalMinutes = timeInvested?.totalMinutes ?? null

  const effectiveHourlyRateCents =
    totalMinutes && totalMinutes > 0 && netProfitWithTipCents
      ? Math.round((netProfitWithTipCents / totalMinutes) * 60)
      : null

  // Mileage
  const mileageMiles = event.mileage_miles ? parseFloat(String(event.mileage_miles)) : null
  const deductionValueCents = mileageMiles
    ? Math.round(mileageMiles * IRS_MILEAGE_RATE_CENTS_PER_MILE)
    : null

  // Historical comparison - fetch chef's average across completed events
  let comparison: EventFinancialSummaryData['comparison'] = null
  const { data: historicalSummaries } = await db
    .from('event_financial_summary')
    .select('food_cost_percentage, profit_margin, event_id')
    .eq('tenant_id', user.tenantId!)
    .neq('event_id', eventId)
    .limit(20)

  if (historicalSummaries && historicalSummaries.length >= 3) {
    const validSummaries = historicalSummaries.filter(
      (s: any) => s.food_cost_percentage !== null && s.profit_margin !== null
    )
    if (validSummaries.length >= 3) {
      const avgFoodCost =
        validSummaries.reduce((sum: any, s: any) => sum + (s.food_cost_percentage as number), 0) /
        validSummaries.length
      const avgMargin =
        validSummaries.reduce((sum: any, s: any) => sum + (s.profit_margin as number), 0) /
        validSummaries.length

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
      projectedFoodCostCents: null, // future: derive from recipe book
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
  const db: any = createServerClient()

  // Fetch the event date for streak calculation before closing
  const { data: eventRow } = await db
    .from('events')
    .select('event_date')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  const { error } = await db
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

  // Update closure streak - non-blocking, don't fail the close if streak update fails
  if (eventRow?.event_date) {
    try {
      const { recordClosureForStreak } = await import('@/lib/chefs/streaks')
      await recordClosureForStreak(eventRow.event_date)
    } catch (streakErr) {
      console.error('[markFinancialClosed] Streak update failed (non-critical):', streakErr)
    }
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/financial`)
  revalidatePath('/dashboard')

  return { success: true }
}

// ─── recordTip ────────────────────────────────────────────────────────────────

import type { PaymentMethod } from '@/lib/ledger/append'

/**
 * Record a tip received after service (cash, Venmo, Zelle, etc.)
 * Appends an immutable ledger entry with entry_type = 'tip'.
 * Can be called from the close-out wizard for completed or in_progress events.
 */
export async function recordTip({
  eventId,
  amountCents,
  paymentMethod,
}: {
  eventId: string
  amountCents: number
  paymentMethod: PaymentMethod
}) {
  const user = await requireChef()

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error('Tip amount must be a positive integer (cents)')
  }

  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select('id, tenant_id, client_id, status')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) throw new Error('Event not found')
  if (!['in_progress', 'completed'].includes(event.status)) {
    throw new Error('Tips can only be recorded for in-progress or completed events')
  }

  const dbAdmin = createServerClient({ admin: true })

  const { data: entry, error } = await dbAdmin
    .from('ledger_entries')
    .insert({
      tenant_id: event.tenant_id,
      client_id: event.client_id,
      entry_type: 'tip' as const,
      amount_cents: amountCents,
      payment_method: paymentMethod,
      description: `Tip received - ${paymentMethod}`,
      event_id: eventId,
      is_refund: false,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[recordTip] Error:', error)
    throw new Error('Failed to record tip')
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/financial`)
  revalidatePath(`/events/${eventId}/close-out`)
  revalidatePath(`/my-events/${eventId}`)

  return { success: true, entryId: entry?.id }
}

// ─── getEventCloseOutData ─────────────────────────────────────────────────────

export type CloseOutData = {
  event: {
    id: string
    occasion: string | null
    eventDate: string
    guestCount: number
    status: string
    financialClosed: boolean
    aarFiled: boolean
    mileageMiles: number | null
    clientFirstName: string
  }
  financial: {
    quotedPriceCents: number
    totalPaidCents: number
    tipCents: number
    totalReceivedCents: number
    outstandingBalanceCents: number
    actualGrocerySpendCents: number
    totalCostCents: number
    grossProfitCents: number
    grossMarginPercent: number
    netProfitWithTipCents: number
    effectiveHourlyRateCents: number | null
    foodCostPercent: number
    deductionValueCents: number | null
  }
  existingTip: { amountCents: number; paymentMethod: string } | null
  expensesNeedingReceipts: Array<{
    id: string
    description: string
    amountCents: number
    receiptUploaded: boolean
  }>
  hasAnyExpenses: boolean
  aarExists: boolean
}

/**
 * Fetch all data needed to render the post-event close-out wizard.
 * Single round-trip-friendly aggregation for the wizard page.
 */
export async function getEventCloseOutData(eventId: string): Promise<CloseOutData | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch event with client name
  const { data: event } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, status,
      financial_closed, aar_filed, mileage_miles,
      client:clients(full_name)
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event || event.status !== 'completed') return null

  const clientData = event.client as unknown as { full_name: string } | null
  const firstName = clientData?.full_name?.split(' ')[0] ?? 'the client'

  // Parallel fetches: financial summary view, tip entry, expenses, AAR check
  const [financialRow, tipRow, expenses, aarRow] = await Promise.all([
    db
      .from('event_financial_summary')
      .select('*')
      .eq('event_id', eventId)
      .single()
      .then((r: any) => r.data),

    db
      .from('ledger_entries')
      .select('amount_cents, payment_method')
      .eq('event_id', eventId)
      .eq('tenant_id', user.tenantId!)
      .eq('entry_type', 'tip')
      .order('created_at', { ascending: false })
      .limit(1)
      .then((r: any) => r.data?.[0] ?? null),

    db
      .from('expenses')
      .select('id, description, amount_cents, receipt_uploaded')
      .eq('event_id', eventId)
      .eq('tenant_id', user.tenantId!)
      .order('created_at', { ascending: true })
      .then((r: any) => r.data ?? []),

    db
      .from('after_action_reviews')
      .select('id')
      .eq('event_id', eventId)
      .eq('tenant_id', user.tenantId!)
      .limit(1)
      .then((r: any) => (r.data?.length ?? 0) > 0),
  ])

  const totalPaid = financialRow?.total_paid_cents ?? 0
  const tipCents = financialRow?.tip_amount_cents ?? 0
  const quoted = financialRow?.quoted_price_cents ?? 0
  const outstanding = financialRow?.outstanding_balance_cents ?? 0
  const totalExpenses = (financialRow as any)?.total_expenses_cents ?? 0
  const grossProfit = (financialRow as any)?.profit_cents ?? quoted - totalExpenses
  const grossMargin = (financialRow as any)?.profit_margin
    ? parseFloat(String((financialRow as any).profit_margin)) * 100
    : 0
  const foodCostPct = (financialRow as any)?.food_cost_percentage
    ? parseFloat(String((financialRow as any).food_cost_percentage)) * 100
    : 0

  const mileageMiles = event.mileage_miles ? parseFloat(String(event.mileage_miles)) : null
  const deductionValueCents = mileageMiles
    ? Math.round(mileageMiles * IRS_MILEAGE_RATE_CENTS_PER_MILE)
    : null

  // Net profit = gross + tip
  const netProfitWithTipCents = grossProfit + tipCents

  // Effective hourly rate - columns use time_ prefix (added in 20260216000003_operational_refinements.sql)
  const { data: timeRow } = await db
    .from('events')
    .select(
      'time_shopping_minutes, time_prep_minutes, time_travel_minutes, time_service_minutes, time_reset_minutes'
    )
    .eq('id', eventId)
    .single()

  const totalMinutes = timeRow
    ? (timeRow.time_shopping_minutes ?? 0) +
      (timeRow.time_prep_minutes ?? 0) +
      (timeRow.time_travel_minutes ?? 0) +
      (timeRow.time_service_minutes ?? 0) +
      (timeRow.time_reset_minutes ?? 0)
    : 0

  const effectiveHourlyRateCents =
    totalMinutes > 0 && netProfitWithTipCents > 0
      ? Math.round((netProfitWithTipCents / totalMinutes) * 60)
      : null

  return {
    event: {
      id: eventId,
      occasion: event.occasion,
      eventDate: event.event_date,
      guestCount: event.guest_count,
      status: event.status,
      financialClosed: event.financial_closed ?? false,
      aarFiled: event.aar_filed ?? false,
      mileageMiles,
      clientFirstName: firstName,
    },
    financial: {
      quotedPriceCents: quoted,
      totalPaidCents: totalPaid,
      tipCents,
      totalReceivedCents: totalPaid + tipCents,
      outstandingBalanceCents: outstanding,
      actualGrocerySpendCents: totalExpenses,
      totalCostCents: totalExpenses,
      grossProfitCents: grossProfit,
      grossMarginPercent: Math.round(grossMargin * 10) / 10,
      netProfitWithTipCents,
      effectiveHourlyRateCents,
      foodCostPercent: Math.round(foodCostPct * 10) / 10,
      deductionValueCents,
    },
    existingTip: tipRow
      ? { amountCents: tipRow.amount_cents, paymentMethod: tipRow.payment_method }
      : null,
    expensesNeedingReceipts: (expenses ?? [])
      .filter((e: any) => !e.receipt_uploaded)
      .map((e: any) => ({
        id: e.id,
        description: e.description,
        amountCents: e.amount_cents,
        receiptUploaded: e.receipt_uploaded ?? false,
      })),
    hasAnyExpenses: (expenses ?? []).length > 0,
    aarExists: aarRow,
  }
}

// ─── updateMileage ────────────────────────────────────────────────────────────

/**
 * Record mileage for an event (round trip: home → stores → client → home).
 */
export async function updateMileage(eventId: string, mileageMiles: number) {
  const user = await requireChef()
  const db: any = createServerClient()

  if (mileageMiles < 0) throw new Error('Mileage must be non-negative')

  const { error } = await db
    .from('events')
    .update({ mileage_miles: mileageMiles })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[updateMileage] Error:', error)
    throw new Error('Failed to update mileage')
  }

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/financial`)
  revalidatePath(`/events/${eventId}/close-out`)
  revalidatePath(`/my-events/${eventId}`)
  return { success: true }
}
