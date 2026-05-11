import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getVendorComparisonReport } from '@/lib/reports/vendor-comparison-actions'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { VendorMatrixTable } from '@/components/reports/vendor-comparison/vendor-matrix-table'
import { SavingsSummary } from '@/components/reports/vendor-comparison/savings-summary'
import { MonthSelector } from './vendor-client'

export const metadata: Metadata = { title: 'Vendor Comparison' }

export default async function VendorComparisonPage({
  searchParams,
}: {
  searchParams: { month?: string }
}) {
  await requireChef()

  const now = new Date()
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const selectedMonth = searchParams.month || defaultMonth

  let report
  let error: string | null = null

  try {
    report = await getVendorComparisonReport(selectedMonth)
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to generate vendor comparison'
  }

  // Format month for display
  const [yearStr, monthStr] = selectedMonth.split('-')
  const displayMonth = new Date(parseInt(yearStr), parseInt(monthStr) - 1).toLocaleDateString(
    'en-US',
    { year: 'numeric', month: 'long' }
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href="/analytics" className="text-sm text-stone-500 hover:text-stone-300">
          Back to Analytics
        </Link>
        <div className="flex items-center justify-between mt-1">
          <div>
            <h1 className="text-3xl font-bold text-stone-100">Vendor Comparison</h1>
            <p className="text-stone-500 mt-1">
              Side-by-side pricing for your ingredients across vendors
            </p>
          </div>
          <MonthSelector currentMonth={selectedMonth} />
        </div>
      </div>

      {error && (
        <Card className="p-5 border-l-4 border-l-red-600">
          <p className="text-sm text-red-400">{error}</p>
        </Card>
      )}

      {report && (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <p className="text-2xl font-bold text-stone-100">
                {report.comparisons.length}
              </p>
              <p className="text-sm text-stone-500 mt-0.5">Ingredients tracked</p>
            </Card>
            <Card className="p-4">
              <p className="text-2xl font-bold text-stone-100">
                {report.vendorNames.length}
              </p>
              <p className="text-sm text-stone-500 mt-0.5">Vendors compared</p>
            </Card>
            <Card className="p-4">
              <p className="text-2xl font-bold text-stone-100">
                {report.topVendorByValue || '-'}
              </p>
              <p className="text-sm text-stone-500 mt-0.5">Top vendor by value</p>
            </Card>
            <Card className="p-4">
              {report.totalPotentialSavingsCents > 0 ? (
                <>
                  <p className="text-2xl font-bold text-green-500">
                    {formatCurrency(report.totalPotentialSavingsCents)}
                  </p>
                  <p className="text-sm text-stone-500 mt-0.5">Potential savings</p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-stone-400">$0.00</p>
                  <p className="text-sm text-stone-500 mt-0.5">Potential savings</p>
                </>
              )}
            </Card>
          </div>

          {/* Savings Summary */}
          <SavingsSummary
            opportunities={report.savingsOpportunities}
            totalSavingsCents={report.totalPotentialSavingsCents}
          />

          {/* Main comparison matrix */}
          <VendorMatrixTable
            comparisons={report.comparisons}
            vendorNames={report.vendorNames}
          />

          {/* Vendor Rankings */}
          {report.vendorRankings.length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-stone-300 uppercase tracking-wide mb-4">
                Vendor Rankings
              </h2>
              <div className="space-y-3">
                {report.vendorRankings.map((vr, i) => {
                  const pct =
                    vr.totalItemsTracked > 0
                      ? Math.round((vr.cheapestCount / vr.totalItemsTracked) * 100)
                      : 0

                  return (
                    <div key={vr.vendorId} className="flex items-center gap-4">
                      <span className="text-sm text-stone-500 w-6 text-right font-medium">
                        #{i + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-stone-200">
                            {vr.vendorName}
                          </span>
                          <span className="text-xs text-stone-400">
                            Cheapest on {vr.cheapestCount}/{vr.totalItemsTracked} items ({pct}%)
                          </span>
                        </div>
                        <div className="w-full bg-stone-800 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* Empty state guidance */}
          {report.comparisons.length === 0 && (
            <Card className="p-8 text-center">
              <p className="text-stone-400 mb-2">No vendor price data to compare yet.</p>
              <p className="text-sm text-stone-500">
                Add items to your vendors with ingredient links to see side-by-side price comparisons.
              </p>
              <Link
                href="/culinary/vendors"
                className="inline-block mt-4 text-sm px-4 py-2 rounded-md bg-stone-700 text-stone-200 hover:bg-stone-600 transition-colors"
              >
                Go to Vendors
              </Link>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
