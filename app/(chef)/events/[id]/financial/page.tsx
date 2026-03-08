// Event Financial Summary Page — Standalone financial close view
// Shows complete P&L picture for one event: revenue, costs, margins, time, mileage, comparison.
// Separate from the event detail page so it can be bookmarked and shared with an accountant.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEventFinancialSummaryFull } from '@/lib/events/financial-summary-actions'
import { getEventRevenuePerHour } from '@/lib/finance/revenue-per-hour-actions'
import { FinancialSummaryView } from '@/components/events/financial-summary-view'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'

export default async function EventFinancialPage({ params }: { params: { id: string } }) {
  await requireChef()

  const [data, rphData] = await Promise.all([
    getEventFinancialSummaryFull(params.id),
    getEventRevenuePerHour(params.id).catch(() => null),
  ])

  if (!data) {
    notFound()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back link + PDF download */}
      <div className="flex justify-between items-center">
        <Link href={`/events/${params.id}`}>
          <Button variant="ghost" size="sm">
            ← Back to Event
          </Button>
        </Link>
        <a
          href={`/api/documents/financial-summary/${params.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-lg border border-stone-600 px-3 py-1.5 text-sm font-medium text-stone-300 hover:bg-stone-800"
        >
          Download PDF
        </a>
      </div>

      <FinancialSummaryView data={data} />

      {/* Revenue Per Hour Comparison */}
      {rphData && rphData.totalHours > 0 && (
        <Card className="p-5">
          <h2 className="font-semibold text-stone-900 mb-3">Revenue Per Hour</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Effective Rate</p>
              <p className="text-xl font-bold text-stone-900">
                {formatCurrency(rphData.effectiveHourlyRateCents)}/hr
              </p>
              <p className="text-xs text-stone-400 mt-0.5">{rphData.totalHours.toFixed(1)}h total time</p>
            </div>
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Cooking-Only Rate</p>
              <p className="text-xl font-bold text-blue-700">
                {formatCurrency(rphData.cookingOnlyRateCents)}/hr
              </p>
              <p className="text-xs text-stone-400 mt-0.5">{rphData.breakdown.cooking.toFixed(1)}h cooking</p>
            </div>
          </div>
          {rphData.comparisonPercent !== null && rphData.averageRateCents !== null && (
            <div className={`mt-3 text-sm px-3 py-2 rounded-lg ${
              rphData.comparisonPercent >= 0
                ? 'bg-emerald-50 text-emerald-800'
                : 'bg-red-50 text-red-800'
            }`}>
              {rphData.comparisonPercent >= 0 ? 'Above' : 'Below'} your average
              ({formatCurrency(rphData.averageRateCents)}/hr)
              by {Math.abs(rphData.comparisonPercent)}%
            </div>
          )}
          <div className="mt-3">
            <Link
              href="/finance/revenue-per-hour"
              className="text-sm text-brand-600 hover:underline"
            >
              View full analysis
            </Link>
          </div>
        </Card>
      )}
    </div>
  )
}
