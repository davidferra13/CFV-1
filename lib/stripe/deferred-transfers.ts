// Deferred transfer reconciliation.
// Listing remains read-only. Execution is fail-closed until the admin cross-tenant
// exact-action approval flow is available; no loop may move money silently.

'use server'

import { requireAdmin } from '@/lib/auth/admin'
import { createServerClient } from '@/lib/db/server'

export type DeferredTransferSummary = {
  tenantId: string
  chefName: string
  deferredCount: number
  deferredTotalCents: number
  stripeAccountId: string | null
  canResolve: boolean
}

export async function listDeferredTransferChefs(): Promise<DeferredTransferSummary[]> {
  await requireAdmin()
  const db = createServerClient({ admin: true })

  const { data: entries } = await db
    .from('ledger_entries')
    .select('tenant_id, amount_cents, transaction_reference')
    .in('entry_type', ['payment', 'deposit'])
    .eq('is_refund', false)
    .not('transaction_reference', 'is', null)

  if (!entries || entries.length === 0) return []

  const { data: transfers } = await db
    .from('stripe_transfers')
    .select('stripe_payment_intent_id, tenant_id')

  const transferredRefs = new Set(
    (transfers ?? []).map((transfer: any) => transfer.stripe_payment_intent_id).filter(Boolean)
  )
  const deferredByTenant = new Map<string, { count: number; totalCents: number }>()

  for (const entry of entries) {
    if (entry.transaction_reference && transferredRefs.has(entry.transaction_reference)) {
      continue
    }
    const current = deferredByTenant.get(entry.tenant_id) ?? {
      count: 0,
      totalCents: 0,
    }
    current.count += 1
    current.totalCents += entry.amount_cents
    deferredByTenant.set(entry.tenant_id, current)
  }
  if (deferredByTenant.size === 0) return []

  const tenantIds = Array.from(deferredByTenant.keys())
  const { data: chefs } = await db
    .from('chefs')
    .select('id, business_name, display_name, stripe_account_id, stripe_onboarding_complete')
    .in('id', tenantIds)

  return (chefs ?? []).map((chef: any) => {
    const deferred = deferredByTenant.get(chef.id) ?? {
      count: 0,
      totalCents: 0,
    }
    const onboardingComplete = chef.stripe_onboarding_complete === true
    const stripeAccountId = chef.stripe_account_id ?? null
    return {
      tenantId: chef.id,
      chefName: chef.business_name || chef.display_name || 'Unknown',
      deferredCount: deferred.count,
      deferredTotalCents: deferred.totalCents,
      stripeAccountId,
      // Visibility is not execution authority. Transfers remain hard-disabled.
      canResolve: false,
    }
  })
}
export async function resolveDeferredTransfers(
  _tenantId: string
): Promise<{ resolved: number; failed: number; errors: string[] }> {
  await requireAdmin()
  throw new Error(
    'Deferred transfer execution is disabled: each transfer requires an exact, single-use approval bound to destination, gross amount, fees, net amount, and current Stripe state.'
  )
}
