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

/**
 * Get cross-tenant reconciliation for platform admin.
 * No tenant scoping - uses admin client.
 */
export async function getPlatformReconciliation(): Promise<PlatformReconciliation> {
  await requireAdmin()
  const db = createServerClient({ admin: true })

  // 1. GMV from ledger (all payments/deposits across tenants)
  const { data: gmvEntries } = await db
    .from('ledger_entries')
    .select('tenant_id, amount_cents')
    .in('entry_type', ['payment', 'deposit'])
    .eq('is_refund', false)

  // 2. Refunds from ledger
  const { data: refundEntries } = await db
    .from('ledger_entries')
    .select('tenant_id, amount_cents')
    .eq('is_refund', true)

  // 3. Transfers
  const { data: transfers } = await db
    .from('stripe_transfers')
    .select(
      'tenant_id, gross_amount_cents, platform_fee_cents, net_transfer_cents, status, is_deferred'
    )

  // 4. Platform fees
  const { data: fees } = await db
    .from('platform_fee_ledger')
    .select('tenant_id, amount_cents, entry_type')

  // 5. All chefs
  const { data: chefs } = await db
    .from('chefs')
    .select('id, business_name, display_name, stripe_account_id, stripe_onboarding_complete')

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
    if (row) row.refundedCents += entry.amount_cents
  }

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
