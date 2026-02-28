'use server'

// Invoice Actions
// Computes invoice data from the ledger-first financial model.
// There is no separate invoices table — the invoice is a live view over:
//   events (quoted price, occasion, dates) + ledger_entries (payment history) + clients + chefs

import { requireChef } from '@/lib/auth/get-user'
import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { format } from 'date-fns'
import { calculateSalesTax } from '@/lib/tax/api-ninjas'
import { getClientLoyaltySnapshotByTenant } from '@/lib/loyalty/actions'
import {
  computeLoyaltyInvoiceAdjustments,
  type LoyaltyInvoiceAdjustmentSummary,
  type LoyaltyInvoiceRedemption,
} from '@/lib/loyalty/invoice-adjustments'

// ─── Types ────────────────────────────────────────────────────────────────────

export type InvoicePaymentEntry = {
  id: string
  date: string // formatted display date
  description: string
  entryType: string
  paymentMethod: string
  amountCents: number
  isTip: boolean
  isRefund: boolean
  transactionReference: string | null
}

export type InvoiceData = {
  invoiceNumber: string | null
  invoiceIssuedAt: string | null
  // Chef (issuer)
  chef: {
    businessName: string
    email: string
    phone: string | null
  }
  // Client (recipient)
  client: {
    displayName: string
    email: string
  }
  // Event
  event: {
    id: string
    occasion: string | null
    eventDate: string
    formattedDate: string
    guestCount: number
    locationCity: string | null
    locationState: string | null
    status: string
    pricingModel: string | null
  }
  // Financials
  quotedPriceCents: number | null
  serviceSubtotalCents: number
  loyaltyDiscountCents: number
  loyaltyAdjustments: LoyaltyInvoiceAdjustmentSummary | null
  pricePerPersonCents: number | null
  depositAmountCents: number | null
  paymentStatus: string
  paymentEntries: InvoicePaymentEntry[]
  totalPaidCents: number
  totalRefundedCents: number
  tipAmountCents: number
  balanceDueCents: number
  isPaidInFull: boolean
  // Sales tax (computed from event zip code via API Ninjas on adjusted subtotal)
  salesTax: {
    taxRate: number // combined rate as decimal (e.g. 0.0825)
    taxAmountCents: number // tax on the loyalty-adjusted service subtotal
    breakdown: {
      state: number
      county: number
      city: number
    }
    zipCode: string
  } | null // null = tax lookup failed or no zip code — treat as $0 tax
  loyalty?: {
    tier: 'bronze' | 'silver' | 'gold' | 'platinum'
    pointsBalance: number
    lifetimePointsEarned: number
    nextTierName: string | null
    pointsToNextTier: number
  } | null
}

// ─── generateInvoiceNumber ────────────────────────────────────────────────────

/**
 * Generate a sequential invoice number for a tenant.
 * Format: INV-YYYY-NNN (e.g. INV-2026-001)
 * Counts existing invoices for the tenant in the current year.
 */
export async function generateInvoiceNumber(tenantId: string): Promise<string> {
  const supabase: any = createServerClient()
  const year = new Date().getFullYear()

  // Count how many invoices this tenant already has this year
  const { count } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .like('invoice_number', `INV-${year}-%`)

  const seq = (count ?? 0) + 1
  return `INV-${year}-${String(seq).padStart(3, '0')}`
}

// ─── assignInvoiceNumber ──────────────────────────────────────────────────────

/**
 * Assign an invoice number to an event if one doesn't exist yet.
 * Called when the event first receives a payment.
 * Idempotent — does nothing if invoice_number is already set.
 */
export async function assignInvoiceNumber(eventId: string) {
  const supabase: any = createServerClient({ admin: true })

  // Check if already assigned
  const { data: event } = await supabase
    .from('events')
    .select('id, invoice_number, tenant_id')
    .eq('id', eventId)
    .single()

  if (!event || event.invoice_number) return // already set, nothing to do

  const invoiceNumber = await generateInvoiceNumber(event.tenant_id)

  await supabase
    .from('events')
    .update({
      invoice_number: invoiceNumber,
      invoice_issued_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .eq('tenant_id', event.tenant_id)

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/invoice`)
  revalidatePath(`/my-events/${eventId}`)
}

// ─── getInvoiceData (chef) ────────────────────────────────────────────────────

/**
 * Fetch all data needed to render an invoice for a chef.
 * Returns null if event not found or not accessible.
 */
export async function getInvoiceData(eventId: string): Promise<InvoiceData | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: event } = await supabase
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, status, tenant_id,
      quoted_price_cents, deposit_amount_cents, payment_status,
      tip_amount_cents, pricing_model,
      invoice_number, invoice_issued_at,
      location_city, location_state, location_zip,
      client:clients(id, full_name, email)
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) return null

  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name, email, phone')
    .eq('id', user.tenantId!)
    .single()

  if (!chef) return null

  // Fetch ledger entries for this event
  const { data: ledgerEntries } = await supabase
    .from('ledger_entries')
    .select(
      'id, amount_cents, entry_type, payment_method, received_at, created_at, description, transaction_reference, is_refund'
    )
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: true })

  // Loyalty context + adjustment policy resolve before tax lookup
  const clientData = event.client as { id?: string } | null
  const baseServiceCents = event.quoted_price_cents ?? 0
  const [loyalty, loyaltyAdjustments] = await Promise.all([
    clientData?.id && user.tenantId
      ? getClientLoyaltySnapshotByTenant(user.tenantId, clientData.id).catch(() => null)
      : Promise.resolve(null),
    getEventLoyaltyAdjustmentSummary({
      supabase,
      tenantId: user.tenantId!,
      clientId: clientData?.id,
      eventId,
      baseServiceCents,
    }),
  ])
  const taxableSubtotalCents = loyaltyAdjustments?.adjustedServiceCents ?? baseServiceCents
  // Sales tax lookup is non-blocking and reflects loyalty-adjusted subtotal.
  const taxCalc = await lookupSalesTax(taxableSubtotalCents, event.location_zip ?? null)
  return buildInvoiceData(event, chef, ledgerEntries ?? [], taxCalc, loyalty, loyaltyAdjustments)
}

// ─── getInvoiceDataForClient ──────────────────────────────────────────────────

/**
 * Fetch invoice data for a client viewing their own event.
 * Scoped to the client's own entity — no cross-client access.
 */
export async function getInvoiceDataForClient(eventId: string): Promise<InvoiceData | null> {
  const user = await requireClient()
  const supabase: any = createServerClient()

  const { data: event } = await supabase
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, status, tenant_id,
      quoted_price_cents, deposit_amount_cents, payment_status,
      tip_amount_cents, pricing_model,
      invoice_number, invoice_issued_at,
      location_city, location_state, location_zip,
      client:clients(id, full_name, email)
    `
    )
    .eq('id', eventId)
    .eq('client_id', user.entityId!)
    .single()

  if (!event) return null

  const { data: chef } = await supabase
    .from('chefs')
    .select('business_name, email, phone')
    .eq('id', event.tenant_id as string)
    .single()

  if (!chef) return null

  const { data: ledgerEntries } = await supabase
    .from('ledger_entries')
    .select(
      'id, amount_cents, entry_type, payment_method, received_at, created_at, description, transaction_reference, is_refund'
    )
    .eq('event_id', eventId)
    .eq('client_id', user.entityId!)
    .order('created_at', { ascending: true })

  // Loyalty context + adjustment policy resolve before tax lookup
  const clientData = event.client as { id?: string } | null
  const tenantId = event.tenant_id as string
  const baseServiceCents = event.quoted_price_cents ?? 0
  const [loyalty, loyaltyAdjustments] = await Promise.all([
    clientData?.id && tenantId
      ? getClientLoyaltySnapshotByTenant(tenantId, clientData.id).catch(() => null)
      : Promise.resolve(null),
    getEventLoyaltyAdjustmentSummary({
      supabase,
      tenantId,
      clientId: clientData?.id,
      eventId,
      baseServiceCents,
    }),
  ])
  const taxableSubtotalCents = loyaltyAdjustments?.adjustedServiceCents ?? baseServiceCents
  // Sales tax lookup is non-blocking and reflects loyalty-adjusted subtotal.
  const taxCalc = await lookupSalesTax(taxableSubtotalCents, event.location_zip ?? null)
  return buildInvoiceData(event, chef, ledgerEntries ?? [], taxCalc, loyalty, loyaltyAdjustments)
}

// ─── buildInvoiceData ─────────────────────────────────────────────────────────

type RawEvent = {
  id: string
  occasion: string | null
  event_date: string
  guest_count: number
  status: string
  quoted_price_cents: number | null
  deposit_amount_cents: number | null
  payment_status: string
  tip_amount_cents: number
  pricing_model: string | null
  invoice_number: string | null
  invoice_issued_at: string | null
  location_city: string | null
  location_state: string | null
  location_zip: string | null
  client: unknown
  tenant_id?: string
}

type RawChef = {
  business_name: string
  email: string
  phone: string | null
}

type RawLedgerEntry = {
  id: string
  amount_cents: number
  entry_type: string
  payment_method: string
  received_at: string | null
  created_at: string
  description: string
  transaction_reference: string | null
  is_refund: boolean
}

type RawRedemptionRow = {
  id: string
  reward_id: string
  reward_name: string
  reward_type: string
  points_spent: number
  created_at: string
  reward_value_cents?: number | null
  reward_percent?: number | null
}

type RawRewardValueRow = {
  id: string
  reward_value_cents: number | null
  reward_percent: number | null
}

type QueryErrorLike = {
  code?: string
  message?: string
} | null

function isMissingSnapshotColumnError(error: QueryErrorLike): boolean {
  if (!error) return false
  return (
    error.code === '42703' ||
    error.message?.includes('reward_value_cents') ||
    error.message?.includes('reward_percent') ||
    false
  )
}

async function fetchDeliveredRedemptionsForEvent(params: {
  supabase: any
  tenantId: string
  clientId: string
  eventId: string
}): Promise<RawRedemptionRow[]> {
  const { supabase, tenantId, clientId, eventId } = params

  const withSnapshots = await supabase
    .from('loyalty_reward_redemptions')
    .select(
      'id, reward_id, reward_name, reward_type, points_spent, created_at, reward_value_cents, reward_percent'
    )
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .eq('event_id', eventId)
    .eq('delivery_status', 'delivered')
    .order('created_at', { ascending: true })

  if (!withSnapshots.error) return (withSnapshots.data || []) as RawRedemptionRow[]
  if (!isMissingSnapshotColumnError(withSnapshots.error as QueryErrorLike)) {
    throw withSnapshots.error
  }

  // Backward-compatible fallback before snapshot migration is applied.
  const legacy = await supabase
    .from('loyalty_reward_redemptions')
    .select('id, reward_id, reward_name, reward_type, points_spent, created_at')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .eq('event_id', eventId)
    .eq('delivery_status', 'delivered')
    .order('created_at', { ascending: true })

  if (legacy.error) throw legacy.error
  return (legacy.data || []) as RawRedemptionRow[]
}

async function getEventLoyaltyAdjustmentSummary(params: {
  supabase: any
  tenantId: string
  clientId: string | null | undefined
  eventId: string
  baseServiceCents: number
}): Promise<LoyaltyInvoiceAdjustmentSummary | null> {
  const { supabase, tenantId, clientId, eventId, baseServiceCents } = params
  if (!clientId || baseServiceCents <= 0) return null

  try {
    const rows = await fetchDeliveredRedemptionsForEvent({
      supabase,
      tenantId,
      clientId,
      eventId,
    })
    if (rows.length === 0) return null

    const missingRewardValueIds = Array.from(
      new Set(
        rows
          .filter(
            (row) =>
              (row.reward_type === 'discount_fixed' || row.reward_type === 'discount_percent') &&
              row.reward_value_cents == null &&
              row.reward_percent == null
          )
          .map((row) => row.reward_id)
      )
    )

    const rewardValueMap = new Map<string, RawRewardValueRow>()
    if (missingRewardValueIds.length > 0) {
      const { data: rewardRows, error: rewardErr } = await supabase
        .from('loyalty_rewards')
        .select('id, reward_value_cents, reward_percent')
        .in('id', missingRewardValueIds)

      if (rewardErr) {
        console.error('[invoice] Failed to load fallback reward values', rewardErr)
      } else {
        for (const reward of (rewardRows || []) as RawRewardValueRow[]) {
          rewardValueMap.set(reward.id, reward)
        }
      }
    }

    const policyRows: LoyaltyInvoiceRedemption[] = rows.map((row) => {
      const fallbackReward = rewardValueMap.get(row.reward_id)
      const rewardValueCents = row.reward_value_cents ?? fallbackReward?.reward_value_cents ?? null
      const rewardPercent = row.reward_percent ?? fallbackReward?.reward_percent ?? null
      const valuationSource =
        row.reward_value_cents != null || row.reward_percent != null
          ? 'snapshot'
          : fallbackReward
            ? 'catalog_fallback'
            : 'unknown'

      return {
        id: row.id,
        rewardId: row.reward_id,
        rewardName: row.reward_name,
        rewardType: row.reward_type,
        pointsSpent: row.points_spent,
        createdAt: row.created_at,
        rewardValueCents,
        rewardPercent,
        valuationSource,
      }
    })

    const summary = computeLoyaltyInvoiceAdjustments(baseServiceCents, policyRows)
    return summary.totalDiscountCents > 0 ? summary : null
  } catch (err) {
    console.error('[invoice] Failed to compute loyalty invoice adjustments', err)
    return null
  }
}

// ─── lookupSalesTax ──────────────────────────────────────────────────────────

type SalesTaxInfo = {
  taxRate: number
  taxAmountCents: number
  breakdown: { state: number; county: number; city: number }
  zipCode: string
}

/**
 * Non-blocking sales tax lookup.
 * If the API is down, the key is missing, or the zip is empty, returns null.
 * The caller treats null as $0 tax — the invoice is still valid without it.
 */
async function lookupSalesTax(
  subtotalCents: number,
  zipCode: string | null
): Promise<SalesTaxInfo | null> {
  if (!zipCode || subtotalCents <= 0) return null

  try {
    const calc = await calculateSalesTax(subtotalCents, zipCode)
    if (!calc) return null

    return {
      taxRate: calc.taxRate,
      taxAmountCents: calc.taxAmountCents,
      breakdown: calc.breakdown,
      zipCode,
    }
  } catch (err) {
    console.error('[non-blocking] Sales tax lookup failed', err)
    return null
  }
}

// ─── buildInvoiceData ─────────────────────────────────────────────────────────

function buildInvoiceData(
  event: RawEvent,
  chef: RawChef,
  entries: RawLedgerEntry[],
  salesTax: SalesTaxInfo | null = null,
  loyaltySnapshot: Awaited<ReturnType<typeof getClientLoyaltySnapshotByTenant>> | null = null,
  loyaltyAdjustmentSummary: LoyaltyInvoiceAdjustmentSummary | null = null
): InvoiceData {
  const clientData = event.client as { id: string; full_name: string; email: string } | null

  const paymentEntries: InvoicePaymentEntry[] = entries.map((e) => {
    const dateStr = e.received_at ?? e.created_at
    return {
      id: e.id,
      date: format(new Date(dateStr), 'MMM d, yyyy'),
      description: e.description,
      entryType: e.entry_type,
      paymentMethod: e.payment_method,
      amountCents: e.amount_cents,
      isTip: e.entry_type === 'tip',
      isRefund: e.is_refund,
      transactionReference: e.transaction_reference,
    }
  })

  // Total paid = sum of non-refund, non-tip entries
  const totalPaidCents = entries
    .filter((e) => !e.is_refund)
    .reduce((sum, e) => sum + e.amount_cents, 0)

  // Total refunded = sum of refund entries (stored as positive, applied as deduction)
  const totalRefundedCents = entries
    .filter((e) => e.is_refund)
    .reduce((sum, e) => sum + Math.abs(e.amount_cents), 0)

  const quotedPriceCents = event.quoted_price_cents ?? 0
  const loyaltyDiscountCents = loyaltyAdjustmentSummary?.totalDiscountCents ?? 0
  const serviceSubtotalCents = loyaltyAdjustmentSummary?.adjustedServiceCents ?? quotedPriceCents
  const taxAmountCents = salesTax?.taxAmountCents ?? 0
  const servicePaid = entries
    .filter((e) => !e.is_refund && e.entry_type !== 'tip')
    .reduce((sum, e) => sum + e.amount_cents, 0)

  // Balance due includes tax: (service + tax) - paid + refunded
  const balanceDueCents = Math.max(
    0,
    serviceSubtotalCents + taxAmountCents - servicePaid + totalRefundedCents
  )

  return {
    invoiceNumber: event.invoice_number,
    invoiceIssuedAt: event.invoice_issued_at,
    chef: {
      businessName: chef.business_name,
      email: chef.email,
      phone: chef.phone,
    },
    client: {
      displayName: clientData?.full_name ?? 'Client',
      email: clientData?.email ?? '',
    },
    event: {
      id: event.id,
      occasion: event.occasion,
      eventDate: event.event_date,
      formattedDate: format(new Date(event.event_date), 'MMMM d, yyyy'),
      guestCount: event.guest_count,
      locationCity: event.location_city,
      locationState: event.location_state,
      status: event.status,
      pricingModel: event.pricing_model,
    },
    quotedPriceCents: event.quoted_price_cents,
    serviceSubtotalCents,
    loyaltyDiscountCents,
    loyaltyAdjustments: loyaltyAdjustmentSummary,
    pricePerPersonCents:
      event.pricing_model === 'per_person' && event.quoted_price_cents && event.guest_count
        ? Math.round(event.quoted_price_cents / event.guest_count)
        : null,
    depositAmountCents: event.deposit_amount_cents,
    paymentStatus: event.payment_status,
    paymentEntries,
    totalPaidCents,
    totalRefundedCents,
    tipAmountCents: event.tip_amount_cents,
    balanceDueCents,
    isPaidInFull: balanceDueCents === 0 && serviceSubtotalCents + taxAmountCents > 0,
    salesTax,
    loyalty: loyaltySnapshot
      ? {
          tier: loyaltySnapshot.tier,
          pointsBalance: loyaltySnapshot.pointsBalance,
          lifetimePointsEarned: loyaltySnapshot.lifetimePointsEarned,
          nextTierName: loyaltySnapshot.nextTierName,
          pointsToNextTier: loyaltySnapshot.pointsToNextTier,
        }
      : null,
  }
}
