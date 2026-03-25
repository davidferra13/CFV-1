'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { computeChargebackRate } from '@/lib/finance/chargeback-rate'
import type { ChargebackRate } from '@/lib/finance/chargeback-rate'

export type { ChargebackRate }

export async function getChargebackRate(): Promise<ChargebackRate | null> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const db: any = createServerClient()

  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

  // Count payment disputes in last 12 months
  const { count: disputeCount, error: disputeError } = await db
    .from('payment_disputes')
    .select('id', { count: 'exact', head: true })
    .eq('chef_id', tenantId)
    .gte('opened_at', twelveMonthsAgo.toISOString())

  if (disputeError) {
    console.error('[chargeback] Could not fetch disputes:', disputeError.message)
    throw new Error('Failed to load dispute data for chargeback rate')
  }

  // Count payment ledger entries in last 12 months
  const { count: transactionCount, error: ledgerError } = await db
    .from('ledger_entries')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('type', 'payment')
    .gte('created_at', twelveMonthsAgo.toISOString())

  if (ledgerError) {
    console.error('[chargeback] Could not fetch ledger entries:', ledgerError.message)
    throw new Error('Failed to load transaction data for chargeback rate')
  }

  return computeChargebackRate(disputeCount ?? 0, transactionCount ?? 0)
}
