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

interface ProfitLossClientControlsProps {
  yearOptions: number[]
  selectedYear: number
  pl: PLData
}

export function ProfitLossClientControls({
  yearOptions,
  selectedYear,
  pl,
}: ProfitLossClientControlsProps) {
  const router = useRouter()

  function handleYearChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(`/finance/reporting/profit-loss?year=${e.target.value}`)
  }

  function handleDownloadCsv() {
    const rows: string[][] = []

    rows.push(['ChefFlow P&L Statement'])
    rows.push([`Year: ${pl.year}`])
    rows.push([])
    rows.push(['REVENUE'])
    rows.push(['Description', 'Amount'])
    rows.push(['Gross Revenue', centsToDollars(pl.totalRevenueCents)])
    rows.push(['Refunds', `-${centsToDollars(pl.totalRefundsCents)}`])
    rows.push(['Tips', centsToDollars(pl.totalTipsCents)])
    rows.push(['Net Revenue', centsToDollars(pl.netRevenueCents)])
    rows.push([])
    rows.push(['EXPENSES BY CATEGORY'])
    rows.push(['Category', 'Amount'])
    for (const [category, amount] of Object.entries(pl.expensesByCategory).sort(
      (a, b) => b[1] - a[1]
    )) {
      rows.push([category.replace(/_/g, ' '), centsToDollars(amount)])
    }
    rows.push(['Total Expenses', centsToDollars(pl.totalExpensesCents)])
    rows.push([])
    rows.push(['SUMMARY'])
    rows.push(['Net Profit', centsToDollars(pl.netProfitCents)])
    rows.push(['Profit Margin', `${pl.profitMarginPercent}%`])
    rows.push([])
    rows.push(['MONTHLY REVENUE'])
    rows.push(['Month', 'Revenue'])
    const sortedMonths = Object.entries(pl.monthlyRevenue).sort((a, b) => a[0].localeCompare(b[0]))
    for (const [month, amount] of sortedMonths) {
      rows.push([month, centsToDollars(amount)])
    }

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `chefflow-pl-${pl.year}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex items-center gap-3">
      <select
        value={selectedYear}
        onChange={handleYearChange}
        className="text-sm border border-stone-600 rounded-md px-3 py-2 text-stone-300 bg-stone-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        {yearOptions.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
      <button
        onClick={handleDownloadCsv}
        className="text-sm px-4 py-2 rounded-md bg-stone-900 text-white hover:bg-stone-700 transition-colors"
      >
        Download CSV
      </button>
    </div>
  )
}

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2)
}
