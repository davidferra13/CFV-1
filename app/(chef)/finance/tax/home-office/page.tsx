import type { Metadata } from 'next'
import Link from 'next/link'
import { getHomeOfficeDeduction } from '@/lib/tax/home-office-actions'
import { HomeOfficeForm } from '@/components/finance/home-office-form'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'

export const metadata: Metadata = { title: 'Home Office Deduction - ChefFlow' }

export default async function HomeOfficePage({
  searchParams,
}: {
  searchParams: { year?: string }
}) {
  const currentYear = new Date().getFullYear()
  const taxYear = searchParams.year ? parseInt(searchParams.year, 10) : currentYear

  const deductionData = await getHomeOfficeDeduction(taxYear).catch(() => ({
    settings: null,
    homeOfficeSqft: 0,
    homeTotalSqft: 0,
    sqftPercentage: 0,
    simplifiedDeductionCents: 0,
    totalHomeExpensesCents: 0,
    actualDeductionCents: 0,
    selectedMethodDeductionCents: 0,
    recommendedMethodDeductionCents: 0,
    recommendedMethod: 'simplified' as const,
  }))

  const years = [currentYear, currentYear - 1, currentYear - 2]

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/tax" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Tax Center
        </Link>
        <div className="flex items-start justify-between mt-1">
          <div>
            <h1 className="text-3xl font-bold text-stone-100">Home Office Deduction</h1>
            <p className="text-stone-500 mt-1">
              Schedule C, Line 30 — Exclusive business use of home
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-stone-400">Tax Year:</label>
            <div className="flex gap-1">
              {years.map((y) => (
                <Link
                  key={y}
                  href={`/finance/tax/home-office?year=${y}`}
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

      {deductionData.selectedMethodDeductionCents > 0 && (
        <Card className="border-emerald-200 bg-emerald-950">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-200">
                  Current Deduction ({taxYear})
                </p>
                <p className="text-xs text-emerald-200 mt-0.5">
                  Using {deductionData.settings?.homeDeductionMethod ?? 'simplified'} method
                </p>
              </div>
              <p className="text-2xl font-bold text-emerald-200">
                {formatCurrency(deductionData.selectedMethodDeductionCents)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <HomeOfficeForm
        taxYear={taxYear}
        settings={deductionData.settings}
        simplifiedDeductionCents={deductionData.simplifiedDeductionCents}
        actualDeductionCents={deductionData.actualDeductionCents}
        recommendedMethod={deductionData.recommendedMethod}
        sqftPercentage={deductionData.sqftPercentage}
      />
    </div>
  )
}
