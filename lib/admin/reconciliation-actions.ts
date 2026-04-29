// Platform Reconciliation Actions
// Admin-only: cross-tenant aggregation of GMV, fees, transfers, and deferred amounts.

'use server'

import { createServerClient } from '@/lib/db/server'
import { requireAdmin } from '@/lib/auth/admin'

export type ChefReconciliationRow = {
  tenantId: string
  chefName: string
  gmvCents: number
  transferredCents: number
  platformFeesCents: number
  deferredCents: number
  refundedCents: number
  stripeAccountId: string | null
  onboardingComplete: boolean
  transferCount: number
}

export type PlatformReconciliation = {
  totalGmvCents: number
  totalTransferredCents: number
  totalPlatformFeesCents: number
  totalDeferredCents: number
  totalRefundedCents: number
  chefs: ChefReconciliationRow[]
}

function throwIfQueryFailed(error: unknown, context: string) {
  if (error) {
    throw new Error(`[platform-reconciliation] ${context} query failed`)
  }
}

/**
 * Get cross-tenant reconciliation for platform admin.
 * No tenant scoping - uses admin client.
 */
export async function getPlatformReconciliation(): Promise<PlatformReconciliation> {
  await requireAdmin()
  const db = createServerClient({ admin: true })

  // 1. GMV from ledger (all payments/deposits across tenants)
  const { data: gmvEntries, error: gmvError } = await db
    .from('ledger_entries')
    .select('tenant_id, amount_cents, transaction_reference')
    .in('entry_type', ['payment', 'deposit'])
    .eq('is_refund', false)
  throwIfQueryFailed(gmvError, 'GMV')

  // 2. Refunds from ledger
  const { data: refundEntries, error: refundError } = await db
    .from('ledger_entries')
    .select('tenant_id, amount_cents')
    .eq('is_refund', true)
  throwIfQueryFailed(refundError, 'refund')

  // 3. Transfers
  const { data: transfers, error: transferError } = await db
    .from('stripe_transfers')
    .select(
      'tenant_id, gross_amount_cents, platform_fee_cents, net_transfer_cents, status, is_deferred, stripe_payment_intent_id'
    )
  throwIfQueryFailed(transferError, 'transfer')

  // 4. Platform fees
  const { data: fees, error: feeError } = await db
    .from('platform_fee_ledger')
    .select('tenant_id, amount_cents, entry_type')
  throwIfQueryFailed(feeError, 'platform fee')

  // 5. All chefs
  const { data: chefs, error: chefError } = await db
    .from('chefs')
    .select('id, business_name, display_name, stripe_account_id, stripe_onboarding_complete')
  throwIfQueryFailed(chefError, 'chef')

  // Build per-tenant aggregation
  const tenantMap = new Map<string, ChefReconciliationRow>()

  for (const chef of chefs ?? []) {
    tenantMap.set(chef.id, {
      tenantId: chef.id,
      chefName: chef.business_name || (chef as any).display_name || 'Unknown',
      gmvCents: 0,
      transferredCents: 0,
      platformFeesCents: 0,
      deferredCents: 0,
      refundedCents: 0,
      stripeAccountId: (chef as any).stripe_account_id ?? null,
      onboardingComplete: (chef as any).stripe_onboarding_complete === true,
      transferCount: 0,
    })
  }

  // GMV
  for (const entry of gmvEntries ?? []) {
    const row = tenantMap.get(entry.tenant_id)
    if (row) row.gmvCents += entry.amount_cents
  }

  // Refunds
  for (const entry of refundEntries ?? []) {
    const row = tenantMap.get(entry.tenant_id)
    if (row) row.refundedCents += Math.abs(entry.amount_cents ?? 0)
  }

  const transferredPaymentIntentIds = new Set(
    ((transfers ?? []) as any[])
      .map((t) => t.stripe_payment_intent_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
  )

  // Transfers
  for (const t of (transfers ?? []) as any[]) {
    const row = tenantMap.get(t.tenant_id)
    if (!row) continue

    if (t.status === 'paid') {
      row.transferredCents += t.net_transfer_cents
      row.transferCount++
    }

    if (t.is_deferred && t.status !== 'paid') {
      row.deferredCents += t.gross_amount_cents
    }
  }

  // Deferred payments can also be unresolved ledger payments with no transfer row yet.
  for (const entry of (gmvEntries ?? []) as any[]) {
    const reference = entry.transaction_reference
    if (typeof reference !== 'string' || reference.length === 0) continue
    if (transferredPaymentIntentIds.has(reference)) continue

    const row = tenantMap.get(entry.tenant_id)
    if (row) row.deferredCents += entry.amount_cents ?? 0
  }

  // Platform fees
  for (const f of (fees ?? []) as any[]) {
    const row = tenantMap.get(f.tenant_id)
    if (!row) continue

    if (f.entry_type === 'fee') {
      row.platformFeesCents += f.amount_cents
    } else if (f.entry_type === 'fee_refund') {
      row.platformFeesCents -= f.amount_cents
    }
  }

  const chefsArray = Array.from(tenantMap.values())
    .filter((c) => c.gmvCents > 0 || c.transferredCents > 0)
    .sort((a, b) => b.gmvCents - a.gmvCents)

  return {
    totalGmvCents: chefsArray.reduce((s, c) => s + c.gmvCents, 0),
    totalTransferredCents: chefsArray.reduce((s, c) => s + c.transferredCents, 0),
    totalPlatformFeesCents: chefsArray.reduce((s, c) => s + c.platformFeesCents, 0),
    totalDeferredCents: chefsArray.reduce((s, c) => s + c.deferredCents, 0),
    totalRefundedCents: chefsArray.reduce((s, c) => s + c.refundedCents, 0),
    chefs: chefsArray,
  }
}
