// Data Reconciliation Dashboard
// Surfaces actionable gaps: events without expenses, unpaid invoices,
// missing dietary info, unsigned contracts, and missing debriefs.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getFullReconciliation } from '@/lib/data-quality/reconciliation-actions'
import { getDataFreshnessReport } from '@/lib/data-quality/freshness-actions'
import { ReconciliationCard } from '@/components/data-quality/reconciliation-card'
import { DataHealthScore } from '@/components/data-quality/data-health-score'
import { FreshnessReportCard } from '@/components/data-quality/freshness-report-card'

export const metadata: Metadata = { title: 'Data Review' }

export default async function ReconciliationPage() {
  await requireChef()

  const [reconciliation, freshness] = await Promise.allSettled([
    getFullReconciliation(),
    getDataFreshnessReport(),
  ])

  const reconData =
    reconciliation.status === 'fulfilled'
      ? reconciliation.value
      : { categories: [], totalGaps: 0, healthScore: 0 }

  const freshnessData = freshness.status === 'fulfilled' ? freshness.value : null

  return (
    <div className="space-y-6">
      <div>
        <Link href="/analytics" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Analytics
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Data Review</h1>
        <p className="text-stone-400 mt-1">
          Actionable gaps in your business data. Each item links to where you can fix it.
        </p>
      </div>

      {/* Health Score + Freshness side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex items-center justify-center rounded-xl border border-stone-700/40 bg-[var(--surface-2)] p-6">
          <DataHealthScore score={reconData.healthScore} totalGaps={reconData.totalGaps} />
        </div>

        {freshnessData && <FreshnessReportCard report={freshnessData} />}
      </div>

      {/* Gap Categories */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-200">What's Missing</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reconData.categories.map((cat) => (
            <ReconciliationCard key={cat.key} category={cat} />
          ))}
        </div>
      </div>

      {reconData.totalGaps === 0 && (
        <div className="rounded-xl border border-emerald-800/30 bg-emerald-950/20 p-6 text-center">
          <p className="text-emerald-400 font-medium">All clear</p>
          <p className="text-sm text-stone-400 mt-1">
            No reconciliation gaps found. Your data is in good shape.
          </p>
        </div>
      )}
    </div>
  )
}
