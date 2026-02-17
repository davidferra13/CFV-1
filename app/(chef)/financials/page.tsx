// Chef Financials Dashboard - Protected by layout

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getTenantFinancialSummary } from '@/lib/ledger/compute'

export const metadata: Metadata = { title: 'Financials - ChefFlow' }
import { getLedgerEntries } from '@/lib/ledger/actions'
import { getMonthlyFinancialSummary } from '@/lib/expenses/actions'
import { getOutstandingPayments } from '@/lib/dashboard/actions'
import { FinancialsClient } from './financials-client'

export default async function FinancialsPage() {
  const user = await requireChef()

  const now = new Date()
  const [financials, ledgerEntries, monthlySummary, outstanding] = await Promise.all([
    getTenantFinancialSummary(),
    getLedgerEntries(),
    getMonthlyFinancialSummary(now.getFullYear(), now.getMonth() + 1),
    getOutstandingPayments(),
  ])

  return (
    <FinancialsClient
      financials={financials}
      ledgerEntries={ledgerEntries}
      pendingPaymentsCents={outstanding.totalOutstandingCents}
      monthlySummary={monthlySummary}
    />
  )
}
