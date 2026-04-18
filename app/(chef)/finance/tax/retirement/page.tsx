import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import {
  getRetirementContributions,
  getHealthInsurancePremiums,
} from '@/lib/tax/retirement-actions'
import { RetirementHealthPanel } from '@/components/finance/retirement-health-panel'

export const metadata: Metadata = { title: 'Retirement & Health Deductions' }

export default async function RetirementPage({
  searchParams,
}: {
  searchParams: { year?: string }
}) {
  await requireChef()
  const currentYear = new Date().getFullYear()
  const taxYear = searchParams.year ? parseInt(searchParams.year, 10) : currentYear

  const [retirementData, healthData] = await Promise.all([
    getRetirementContributions(taxYear),
    getHealthInsurancePremiums(taxYear),
  ])

  const years = [currentYear, currentYear - 1, currentYear - 2]

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/tax" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Tax Center
        </Link>
        <div className="flex items-start justify-between mt-1">
          <div>
            <h1 className="text-3xl font-bold text-stone-100">Retirement & Health Deductions</h1>
            <p className="text-stone-500 mt-1">
              Above-the-line deductions that reduce your Adjusted Gross Income
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-stone-400">Tax Year:</label>
            <div className="flex gap-1">
              {years.map((y) => (
                <Link
                  key={y}
                  href={`/finance/tax/retirement?year=${y}`}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                    y === taxYear
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                  }`}
                >
                  {y}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      <RetirementHealthPanel
        taxYear={taxYear}
        contributions={retirementData.contributions}
        retirementTotalCents={retirementData.totalContributionCents}
        sepIraMaxCents={retirementData.sepIraMaxCents}
        remainingCapacityCents={retirementData.remainingCapacityCents}
        premiums={healthData.premiums}
        healthTotalCents={healthData.totalPremiumCents}
      />
    </div>
  )
}
