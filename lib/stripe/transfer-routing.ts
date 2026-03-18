// Stripe Transfer Routing Utilities
// Handles destination charge configuration, platform fee computation,
// and transfer/fee recording for the stripe_transfers and platform_fee_ledger tables.
// Note: Not a 'use server' boundary - imported as a library by server action files.

import { createServerClient } from '@/lib/supabase/server'

export type ChefStripeConfig = {
  stripeAccountId: string | null
  onboardingComplete: boolean
  platformFeePercent: number
  platformFeeFixedCents: number
  canReceiveTransfers: boolean
}

/**
 * Fetch a chef's Stripe Connect configuration for transfer routing.
 * Uses admin client - caller is responsible for authorization context.
 */
export async function getChefStripeConfig(tenantId: string): Promise<ChefStripeConfig> {
  const supabase = createServerClient({ admin: true })

  const { data: chef } = await supabase
    .from('chefs')
    .select(
      'stripe_account_id, stripe_onboarding_complete, platform_fee_percent, platform_fee_fixed_cents'
    )
    .eq('id', tenantId)
    .single()

  return {
    stripeAccountId: (chef as any)?.stripe_account_id ?? null,
    onboardingComplete: (chef as any)?.stripe_onboarding_complete === true,
    platformFeePercent: Number((chef as any)?.platform_fee_percent ?? 0),
    platformFeeFixedCents: Number((chef as any)?.platform_fee_fixed_cents ?? 0),
    canReceiveTransfers: !!(
      (chef as any)?.stripe_account_id && (chef as any)?.stripe_onboarding_complete
    ),
  }
}

/**
 * Compute the platform application fee for a given payment amount.
 * Returns fee in cents (integer).
 */
export function computeApplicationFee(
  amountCents: number,
  feePercent: number,
  feeFixedCents: number
): number {
  const percentFee = Math.round(amountCents * (feePercent / 100))
  return percentFee + feeFixedCents
}

/**
 * Record a Stripe transfer in the stripe_transfers tracking table.
 */
export async function recordStripeTransfer(params: {
  tenantId: string
  eventId: string | null
  stripeTransferId: string
  stripePaymentIntentId: string | null
  stripeChargeId: string | null
  stripeDestinationAccount: string
  grossAmountCents: number
  platformFeeCents: number
  netTransferCents: number
  status: string
  isDeferred?: boolean
  metadata?: Record<string, unknown>
}): Promise<void> {
  const supabase = createServerClient({ admin: true })

  await supabase.from('stripe_transfers').insert({
    tenant_id: params.tenantId,
    event_id: params.eventId,
    stripe_transfer_id: params.stripeTransferId,
    stripe_payment_intent_id: params.stripePaymentIntentId,
    stripe_charge_id: params.stripeChargeId,
    stripe_destination_account: params.stripeDestinationAccount,
    gross_amount_cents: params.grossAmountCents,
    platform_fee_cents: params.platformFeeCents,
    net_transfer_cents: params.netTransferCents,
    status: params.status,
    is_deferred: params.isDeferred ?? false,
    metadata: (params.metadata ?? {}) as unknown as import('@/types/database').Json,
  })
}

/**
 * Record a platform fee entry in the append-only platform_fee_ledger.
 */
export async function recordPlatformFee(params: {
  tenantId: string
  eventId: string | null
  stripeTransferId: string | null
  stripePaymentIntentId: string | null
  amountCents: number
  description: string
  transactionReference: string
  entryType?: 'fee' | 'fee_refund' | 'adjustment'
}): Promise<void> {
  const supabase = createServerClient({ admin: true })

  await supabase.from('platform_fee_ledger').insert({
    tenant_id: params.tenantId,
    event_id: params.eventId,
    stripe_transfer_id: params.stripeTransferId,
    entry_type: params.entryType ?? 'fee',
    amount_cents: params.amountCents,
    description: params.description,
    stripe_payment_intent_id: params.stripePaymentIntentId,
    transaction_reference: params.transactionReference,
  })
}
