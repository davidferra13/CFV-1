import Link from 'next/link'
import {
  Receipt,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertTriangle,
  Download,
  DollarSign,
} from '@/components/ui/icons'
import { buildCpaExportDataset } from '@/lib/finance/cpa-export-actions'

function formatCents(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(cents / 100)
}

export async function TaxPrepCard() {
  const currentYear = new Date().getFullYear()

  let dataset: Awaited<ReturnType<typeof buildCpaExportDataset>> | null = null
  let loadError = false

  try {
    dataset = await buildCpaExportDataset(currentYear)
  } catch {
    loadError = true
  }

  const isReady = dataset?.readiness?.isExportReady ?? false
  const blockerCount = dataset?.readiness?.blockers?.length ?? 0
  const summary = dataset?.scheduleCSummary
  const lastRun = dataset?.lastExportRun

  return (
    <details className="bg-stone-800 rounded-lg border border-stone-700 group">
      <summary className="flex items-center justify-between p-4 cursor-pointer list-none hover:bg-stone-750 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-teal-400" />
          <h2 className="text-lg font-semibold text-stone-100">Tax Prep</h2>
          <span className="text-sm text-stone-400">({currentYear})</span>
        </div>
        <ChevronDown className="w-4 h-4 text-stone-400 group-open:hidden" />
        <ChevronUp className="w-4 h-4 text-stone-400 hidden group-open:block" />
      </summary>

      <div className="px-4 pb-4 space-y-3">
        {loadError ? (
          <p className="text-sm text-red-400">Failed to load tax prep data. Try refreshing.</p>
        ) : (
          <>
            {/* Readiness Status */}
            <div className="p-3 bg-stone-900 rounded-md border border-stone-700">
              <div className="flex items-center gap-2 mb-2">
                {isReady ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-900/50 text-green-300">
                    <CheckCircle className="w-3 h-3" />
                    Export Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-900/50 text-amber-300">
                    <AlertTriangle className="w-3 h-3" />
                    {blockerCount} Blocker{blockerCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {!isReady && blockerCount > 0 && (
                <Link
                  href="/finance/year-end"
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  View blockers and resolve
                </Link>
              )}
            </div>

            {/* Financial Summary */}
            {summary && (
              <div className="p-3 bg-stone-900 rounded-md border border-stone-700 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wide">Revenue</p>
                  <p className="text-sm font-semibold text-emerald-300 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    {formatCents(summary.netRevenueCents)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wide">Expenses</p>
                  <p className="text-sm font-semibold text-red-300">
                    {formatCents(summary.totalDeductibleExpensesCents)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wide">Net Profit</p>
                  <p
                    className={`text-sm font-semibold ${summary.netProfitCents >= 0 ? 'text-emerald-300' : 'text-red-300'}`}
                  >
                    {formatCents(summary.netProfitCents)}
                  </p>
                </div>
              </div>
            )}

            {/* Last Export Run */}
            {lastRun && (
              <p className="text-xs text-stone-500">
                Last export: #{lastRun.exportNumber} on{' '}
                {new Date(lastRun.generatedAt).toLocaleDateString()} ({lastRun.detailRowCount} rows)
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              {isReady && (
                <Link
                  href="/finance/year-end/export"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-teal-600 hover:bg-teal-500 text-white rounded"
                >
                  <Download className="w-4 h-4" /> Download CPA Export
                </Link>
              )}
              <Link
                href="/finance/year-end"
                className="px-3 py-1.5 text-sm text-stone-400 hover:text-stone-200"
              >
                Full Year-End View
              </Link>
            </div>
          </>
        )}
      </div>
    </details>
  )
}
