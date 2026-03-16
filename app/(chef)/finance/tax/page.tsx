// Tax Center Page
// Mileage log, quarterly estimated tax cards, and accountant export.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { TaxDeductionPanel } from '@/components/ai/tax-deduction-panel'
import { getYearlyMileageSummary, computeQuarterlyEstimate } from '@/lib/tax/actions'
import { TaxCenterClient, TaxYearSelect } from './tax-center-client'

export const metadata: Metadata = { title: 'Tax Center | ChefFlow' }

export default async function TaxCenterPage({ searchParams }: { searchParams: { year?: string } }) {
  await requireChef()

  const year = parseInt(searchParams.year ?? String(new Date().getFullYear()))

  const [mileage, q1, q2, q3, q4] = await Promise.all([
    getYearlyMileageSummary(year),
    computeQuarterlyEstimate(year, 1),
    computeQuarterlyEstimate(year, 2),
    computeQuarterlyEstimate(year, 3),
    computeQuarterlyEstimate(year, 4),
  ])

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Tax Center</h1>
          <p className="mt-1 text-sm text-stone-500">
            Mileage log, quarterly estimates, and accountant export for {year}.
          </p>
        </div>
        <TaxYearSelect currentYear={year} />
      </div>

      <TaxCenterClient year={year} mileage={mileage} quarterlyEstimates={[q1, q2, q3, q4]} />

      {/* AI Tax Deduction Identifier */}
      <TaxDeductionPanel />
    </div>
  )
}
