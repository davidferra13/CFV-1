'use client'

import { useRouter } from 'next/navigation'

type PLData = {
  year: number
  totalRevenueCents: number
  totalRefundsCents: number
  totalTipsCents: number
  netRevenueCents: number
  totalExpensesCents: number
  netProfitCents: number
  profitMarginPercent: number
  expensesByCategory: Record<string, number>
  monthlyRevenue: Record<string, number>
}

interface YearEndClientControlsProps {
  yearOptions: number[]
  selectedYear: number
  pl: PLData
  completedEventsCount: number
  totalEventsCount: number
  exportYear: number
  exportReady?: boolean
}

export function YearEndClientControls({
  yearOptions,
  selectedYear,
  exportYear,
  exportReady = false,
}: YearEndClientControlsProps) {
  const router = useRouter()

  function handleYearChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(`/finance/year-end?year=${e.target.value}`)
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <select
        value={selectedYear}
        onChange={handleYearChange}
        title="Select tax year"
        className="text-sm border border-stone-600 rounded-md px-3 py-2 text-stone-300 bg-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        {yearOptions.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      {exportReady ? (
        <a
          href={`/finance/year-end/export?year=${exportYear}`}
          className="text-sm px-4 py-2 rounded-md bg-stone-900 text-white hover:bg-stone-700 transition-colors border border-stone-600"
        >
          Download CPA Export
        </a>
      ) : (
        <span
          title="Resolve issues in the CPA Readiness section before downloading"
          className="text-sm px-4 py-2 rounded-md bg-stone-950 text-stone-600 border border-stone-800 cursor-not-allowed"
        >
          Download CPA Export
        </span>
      )}
    </div>
  )
}
