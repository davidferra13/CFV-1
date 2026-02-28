// Chef Payout Actions
// Chef-facing read-only views of Stripe transfer activity.
// Data comes from the stripe_transfers table (populated by webhooks).

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export type ChefTransfer = {
  id: string
  eventId: string | null
  stripeTransferId: string
  grossAmountCents: number
  platformFeeCents: number
  netTransferCents: number
  status: string
  isDeferred: boolean
  createdAt: string
  eventOccasion: string | null
  eventDate: string | null
}

export type ChefPayoutSummary = {
  totalTransferredCents: number
  totalPlatformFeesCents: number
  totalNetReceivedCents: number
  transferCount: number
  pendingCount: number
  lastTransferDate: string | null
  stripeAccountId: string | null
  onboardingComplete: boolean
}

/**
 * Get a summary of all Stripe transfers for the current chef.
 */
export async function getChefPayoutSummary(): Promise<ChefPayoutSummary> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: transfers } = await supabase
    .from('stripe_transfers')
    .select('gross_amount_cents, platform_fee_cents, net_transfer_cents, status, created_at')
    .eq('tenant_id', user.entityId)

  const { data: chef } = await supabase
    .from('chefs')
    .select('stripe_account_id, stripe_onboarding_complete')
    .eq('id', user.entityId)
    .single()

  const rows = transfers ?? []
  const paid = rows.filter((t: any) => t.status === 'paid')
  const pending = rows.filter((t: any) => t.status === 'pending')

  const totalTransferredCents = paid.reduce(
    (s: number, t: any) => s + (t.gross_amount_cents ?? 0),
    0
  )
  const totalPlatformFeesCents = paid.reduce(
    (s: number, t: any) => s + (t.platform_fee_cents ?? 0),
    0
  )
  const totalNetReceivedCents = paid.reduce(
    (s: number, t: any) => s + (t.net_transfer_cents ?? 0),
    0
  )

  const sortedDates = paid
    .map((t: any) => t.created_at)
    .filter(Boolean)
    .sort()

  return {
    totalTransferredCents,
    totalPlatformFeesCents,
    totalNetReceivedCents,
    transferCount: paid.length,
    pendingCount: pending.length,
    lastTransferDate: sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null,
    stripeAccountId: chef?.stripe_account_id ?? null,
    onboardingComplete: chef?.stripe_onboarding_complete === true,
  }
}

/**
 * Get paginated list of Stripe transfers for the current chef.
 */
export async function getChefTransfers(opts?: {
  limit?: number
  offset?: number
}): Promise<ChefTransfer[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const limit = opts?.limit ?? 50
  const offset = opts?.offset ?? 0

  const { data } = await supabase
    .from('stripe_transfers')
    .select(
      `
      id,
      event_id,
      stripe_transfer_id,
      gross_amount_cents,
      platform_fee_cents,
      net_transfer_cents,
      status,
      is_deferred,
      created_at,
      event:events(occasion, event_date)
    `
    )
    .eq('tenant_id', user.entityId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  return (data ?? []).map((row: any) => ({
    id: row.id,
    eventId: row.event_id,
    stripeTransferId: row.stripe_transfer_id,
    grossAmountCents: row.gross_amount_cents,
    platformFeeCents: row.platform_fee_cents,
    netTransferCents: row.net_transfer_cents,
    status: row.status,
    isDeferred: row.is_deferred,
    createdAt: row.created_at,
    eventOccasion: row.event?.occasion ?? null,
    eventDate: row.event?.event_date ?? null,
  }))
}
