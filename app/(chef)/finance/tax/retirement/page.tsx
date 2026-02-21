import type { Metadata } from 'next'
import Link from 'next/link'
import {
  getRetirementContributions,
  getHealthInsurancePremiums,
} from '@/lib/tax/retirement-actions'
import { RetirementHealthPanel } from '@/components/finance/retirement-health-panel'

export const metadata: Metadata = { title: 'Retirement & Health Deductions - ChefFlow' }

export default async function RetirementPage({
  searchParams,
}: {
  searchParams: { year?: string }
}) {
  const currentYear = new Date().getFullYear()
  const taxYear = searchParams.year ? parseInt(searchParams.year, 10) : currentYear

  const [retirementData, healthData] = await Promise.all([
    getRetirementContributions(taxYear).catch(() => ({
      contributions: [],
      totalContributionCents: 0,
      sepIraMaxCents: 0,
      remainingCapacityCents: 0,
    })),
    getHealthInsurancePremiums(taxYear).catch(() => ({
      premiums: [],
      totalPremiumCents: 0,
    })),
  ])

  const years = [currentYear, currentYear - 1, currentYear - 2]

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/tax" className="text-sm text-stone-500 hover:text-stone-700">
          &larr; Tax Center
        </Link>
        <div className="flex items-start justify-between mt-1">
          <div>
            <h1 className="text-3xl font-bold text-stone-900">Retirement & Health Deductions</h1>
            <p className="text-stone-500 mt-1">
              Above-the-line deductions that reduce your Adjusted Gross Income
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-stone-600">Tax Year:</label>
            <div className="flex gap-1">
              {years.map((y) => (
                <Link
                  key={y}
                  href={`/finance/tax/retirement?year=${y}`}
                  className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                    y === taxYear
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
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
