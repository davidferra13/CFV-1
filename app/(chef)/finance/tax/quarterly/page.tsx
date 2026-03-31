import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getTaxSummaryForYear } from '@/lib/finance/tax-estimate-actions'
import { TaxEstimateDashboard } from '@/components/finance/tax-estimate-dashboard'

export const metadata: Metadata = { title: 'Quarterly Estimates' }

export default async function QuarterlyEstimatesPage() {
  const currentYear = new Date().getFullYear()
  await requireChef()

  const summary = await getTaxSummaryForYear(currentYear).catch((err) => {
    console.error('[tax-quarterly] Failed to load tax summary:', err)
    return null
  })

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/tax" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Tax Center
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Quarterly Estimates</h1>
        <p className="text-stone-500 mt-1">
          Estimated quarterly tax payments based on your year-to-date income and expenses
        </p>
      </div>

      {summary ? (
        <TaxEstimateDashboard summary={summary} currentYear={currentYear} />
      ) : (
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-8 text-center">
          <p className="text-stone-500 text-sm">
            Tax summary data is not available for {currentYear}.
          </p>
        </div>
      )}
    </div>
  )
}
