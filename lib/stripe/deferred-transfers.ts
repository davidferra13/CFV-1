// Deferred Transfer Resolution
// Admin-only: resolves payments that were collected before the chef completed Stripe Connect.
// When a chef finishes onboarding, this scans ledger for un-transferred payments and creates
// manual Stripe Transfers to the now-ready connected account.

'use server'

import { createServerClient } from '@/lib/supabase/server'
import type Stripe from 'stripe'

function getStripe(): Stripe {
  const StripeLib = require('stripe')
  const StripeCtor = StripeLib.default || StripeLib
  return new StripeCtor(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-18.acacia' as Stripe.LatestApiVersion,
  })
}

export type DeferredTransferSummary = {
  tenantId: string
  chefName: string
  deferredCount: number
  deferredTotalCents: number
  stripeAccountId: string | null
  canResolve: boolean
}

/**
 * List all chefs with deferred (un-transferred) payments.
 * Admin only - no tenant scoping.
 */
export async function listDeferredTransferChefs(): Promise<DeferredTransferSummary[]> {
  const supabase = createServerClient({ admin: true })

  // Find ledger entries that are payments/deposits with Stripe references
  // but have NO matching stripe_transfers record
  const { data: entries } = await supabase
    .from('ledger_entries')
    .select('tenant_id, amount_cents, transaction_reference')
    .in('entry_type', ['payment', 'deposit'])
    .eq('is_refund', false)
    .not('transaction_reference', 'is', null)

  if (!entries || entries.length === 0) return []

  // Get all existing stripe_transfer event references
  const { data: transfers } = await supabase
    .from('stripe_transfers')
    .select('stripe_payment_intent_id, tenant_id')

  const transferredPIs = new Set(
    (transfers ?? []).map((t: any) => t.stripe_payment_intent_id).filter(Boolean)
  )

  // Group deferred entries by tenant
  const deferredByTenant = new Map<string, { count: number; totalCents: number }>()

  for (const entry of entries) {
    // Check if this entry's payment has been transferred
    // The internal_notes field has "PaymentIntent: pi_xxx"
    // But we can't easily join here, so we check if the tenant has ANY transfers
    // A more precise approach: entries without a corresponding stripe_transfers row
    const tenantTransfers = (transfers ?? []).filter((t: any) => t.tenant_id === entry.tenant_id)
    if (tenantTransfers.length > 0) continue // Tenant has transfers, skip

    const current = deferredByTenant.get(entry.tenant_id) ?? { count: 0, totalCents: 0 }
    current.count++
    current.totalCents += entry.amount_cents
    deferredByTenant.set(entry.tenant_id, current)
  }

  if (deferredByTenant.size === 0) return []

  // Fetch chef info
  const tenantIds = Array.from(deferredByTenant.keys())
  const { data: chefs } = await supabase
    .from('chefs')
    .select('id, business_name, display_name, stripe_account_id, stripe_onboarding_complete')
    .in('id', tenantIds)

  return (chefs ?? []).map((chef) => {
    const deferred = deferredByTenant.get(chef.id) ?? { count: 0, totalCents: 0 }
    const onboardingComplete = (chef as any).stripe_onboarding_complete === true
    const stripeAccountId = (chef as any).stripe_account_id ?? null

    return {
      tenantId: chef.id,
      chefName: chef.business_name || (chef as any).display_name || 'Unknown',
      deferredCount: deferred.count,
      deferredTotalCents: deferred.totalCents,
      stripeAccountId,
      canResolve: !!stripeAccountId && onboardingComplete,
    }
  })
}

/**
 * Resolve deferred transfers for a specific chef.
 * Creates manual Stripe Transfers for each un-transferred payment.
 * Admin only.
 *
 * @returns Number of transfers successfully created
 */
export async function resolveDeferredTransfers(
  tenantId: string
): Promise<{ resolved: number; failed: number; errors: string[] }> {
  const supabase = createServerClient({ admin: true })

  // Verify chef has completed Connect onboarding
  const { data: chef } = await supabase
    .from('chefs')
    .select(
      'stripe_account_id, stripe_onboarding_complete, platform_fee_percent, platform_fee_fixed_cents'
    )
    .eq('id', tenantId)
    .single()

  const stripeAccountId = (chef as any)?.stripe_account_id
  const onboardingComplete = (chef as any)?.stripe_onboarding_complete === true

  if (!stripeAccountId || !onboardingComplete) {
    return { resolved: 0, failed: 0, errors: ['Chef has not completed Stripe Connect onboarding'] }
  }

  // Find ledger entries that need transfers
  const { data: entries } = await supabase
    .from('ledger_entries')
    .select('id, amount_cents, event_id, internal_notes, transaction_reference')
    .eq('tenant_id', tenantId)
    .in('entry_type', ['payment', 'deposit'])
    .eq('is_refund', false)
    .not('transaction_reference', 'is', null)
    .order('created_at', { ascending: true })

  if (!entries || entries.length === 0) {
    return { resolved: 0, failed: 0, errors: [] }
  }

  // Check which entries already have transfers
  const { data: existingTransfers } = await supabase
    .from('stripe_transfers')
    .select('event_id')
    .eq('tenant_id', tenantId)

  const transferredEventIds = new Set(
    (existingTransfers ?? []).map((t: any) => t.event_id).filter(Boolean)
  )

  const stripe = getStripe()
  const { recordStripeTransfer, recordPlatformFee, computeApplicationFee } =
    await import('@/lib/stripe/transfer-routing')

  const feePercent = Number((chef as any)?.platform_fee_percent ?? 0)
  const feeFixed = Number((chef as any)?.platform_fee_fixed_cents ?? 0)

  let resolved = 0
  let failed = 0
  const errors: string[] = []

  for (const entry of entries) {
    // Skip if already transferred
    if (entry.event_id && transferredEventIds.has(entry.event_id)) continue

    try {
      const platformFee = computeApplicationFee(entry.amount_cents, feePercent, feeFixed)
      const netTransfer = entry.amount_cents - platformFee

      if (netTransfer <= 0) {
        errors.push(`Entry ${entry.id}: net transfer would be <= 0, skipping`)
        continue
      }

      // Create Stripe Transfer
      const transfer = await stripe.transfers.create({
        amount: netTransfer,
        currency: 'usd',
        destination: stripeAccountId,
        metadata: {
          tenant_id: tenantId,
          event_id: entry.event_id ?? '',
          ledger_entry_id: entry.id,
          deferred_resolution: 'true',
        },
      })

      // Record in stripe_transfers
      await recordStripeTransfer({
        tenantId,
        eventId: entry.event_id,
        stripeTransferId: transfer.id,
        stripePaymentIntentId: null,
        stripeChargeId: null,
        stripeDestinationAccount: stripeAccountId,
        grossAmountCents: entry.amount_cents,
        platformFeeCents: platformFee,
        netTransferCents: netTransfer,
        status: 'paid',
        isDeferred: true,
        metadata: { ledger_entry_id: entry.id, resolved_at: new Date().toISOString() },
      })

      // Record platform fee
      if (platformFee > 0) {
        await recordPlatformFee({
          tenantId,
          eventId: entry.event_id,
          stripeTransferId: transfer.id,
          stripePaymentIntentId: null,
          amountCents: platformFee,
          description: `Deferred platform fee for entry ${entry.id}`,
          transactionReference: `deferred_fee_${entry.id}`,
        })
      }

      resolved++
    } catch (err) {
      failed++
      errors.push(`Entry ${entry.id}: ${(err as Error).message}`)
    }
  }

  return { resolved, failed, errors }
}
