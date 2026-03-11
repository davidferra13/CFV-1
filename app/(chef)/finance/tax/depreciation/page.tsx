import type { Metadata } from 'next'
import { EquipmentDepreciationPanel } from '@/components/ai/equipment-depreciation-panel'
import Link from 'next/link'
import {
  getEquipmentWithDepreciation,
  getDepreciationForYear,
} from '@/lib/equipment/depreciation-actions'
import { DepreciationSchedulePanel } from '@/components/equipment/depreciation-schedule-panel'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'

export const metadata: Metadata = { title: 'Depreciation (Form 4562) - ChefFlow' }

export default async function DepreciationPage({
  searchParams,
}: {
  searchParams: { year?: string }
}) {
  const currentYear = new Date().getFullYear()
  const taxYear = searchParams.year ? parseInt(searchParams.year, 10) : currentYear

  const [equipment, yearSummary] = await Promise.all([
    getEquipmentWithDepreciation(taxYear).catch(() => []),
    getDepreciationForYear(taxYear).catch(() => ({
      items: [],
      totalSection179Cents: 0,
      totalStraightLineCents: 0,
      totalDepreciationCents: 0,
    })),
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
            <h1 className="text-3xl font-bold text-stone-100">Equipment Depreciation</h1>
            <p className="text-stone-500 mt-1">
              Schedule C, Line 13 — Depreciation and Section 179 (Form 4562)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-stone-400">Tax Year:</label>
            <div className="flex gap-1">
              {years.map((y) => (
                <Link
                  key={y}
                  href={`/finance/tax/depreciation?year=${y}`}
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

      {yearSummary.totalDepreciationCents > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-3">
              <p className="text-xs text-stone-500">Section 179</p>
              <p className="text-xl font-semibold text-stone-100">
                {formatCurrency(yearSummary.totalSection179Cents)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3">
              <p className="text-xs text-stone-500">Straight-Line</p>
              <p className="text-xl font-semibold text-stone-100">
                {formatCurrency(yearSummary.totalStraightLineCents)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3">
              <p className="text-xs text-stone-500">Total Deduction</p>
              <p className="text-xl font-semibold text-emerald-200">
                {formatCurrency(yearSummary.totalDepreciationCents)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <DepreciationSchedulePanel equipment={equipment} taxYear={taxYear} />

      {/* AI Equipment Depreciation Plain-Language Guide */}
      <EquipmentDepreciationPanel />
    </div>
  )
}
