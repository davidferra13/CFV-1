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
}

export function YearEndClientControls({
  yearOptions,
  selectedYear,
  pl,
  completedEventsCount,
  totalEventsCount,
}: YearEndClientControlsProps) {
  const router = useRouter()

  function handleYearChange(e: React.ChangeEvent<HTMLSelectElement>) {
    router.push(`/finance/year-end?year=${e.target.value}`)
  }

  function handleDownloadAccountantCsv() {
    const rows: string[][] = []

    rows.push(['ChefFlow Year-End Financial Summary'])
    rows.push([`Year: ${pl.year}`])
    rows.push([`Generated: ${new Date().toLocaleDateString('en-US')}`])
    rows.push([])

    rows.push(['BUSINESS OVERVIEW'])
    rows.push(['Metric', 'Value'])
    rows.push(['Total Events', String(totalEventsCount)])
    rows.push(['Completed Events', String(completedEventsCount)])
    rows.push([])

    rows.push(['INCOME STATEMENT'])
    rows.push(['Line Item', 'Amount (USD)'])
    rows.push(['Gross Business Income', centsToDollars(pl.totalRevenueCents)])
    if (pl.totalRefundsCents > 0) {
      rows.push(['Less: Refunds Issued', `-${centsToDollars(pl.totalRefundsCents)}`])
    }
    rows.push(['Net Revenue', centsToDollars(pl.netRevenueCents)])
    if (pl.totalTipsCents > 0) {
      rows.push(['Tips Received', centsToDollars(pl.totalTipsCents)])
    }
    rows.push(['Less: Total Business Expenses', `-${centsToDollars(pl.totalExpensesCents)}`])
    rows.push(['Estimated Net Income', centsToDollars(pl.netProfitCents)])
    rows.push(['Profit Margin', `${pl.profitMarginPercent}%`])
    rows.push([])

    rows.push(['EXPENSE BREAKDOWN BY CATEGORY'])
    rows.push(['Category', 'Amount (USD)', '% of Revenue'])
    const sortedExpenses = Object.entries(pl.expensesByCategory).sort((a, b) => b[1] - a[1])
    for (const [category, amount] of sortedExpenses) {
      const pct = pl.netRevenueCents > 0
        ? `${Math.round((amount / pl.netRevenueCents) * 100)}%`
        : '—'
      rows.push([category.replace(/_/g, ' '), centsToDollars(amount), pct])
    }
    rows.push(['TOTAL EXPENSES', centsToDollars(pl.totalExpensesCents)])
    rows.push([])

    rows.push(['MONTHLY REVENUE BREAKDOWN'])
    rows.push(['Month', 'Revenue (USD)'])
    const sortedMonths = Object.entries(pl.monthlyRevenue).sort((a, b) => a[0].localeCompare(b[0]))
    for (const [month, amount] of sortedMonths) {
      rows.push([month, centsToDollars(amount)])
    }
    rows.push([])

    rows.push(['TAX PREPARATION (Schedule C Reference)'])
    rows.push(['Item', 'Amount (USD)'])
    rows.push(['Gross business income', centsToDollars(pl.totalRevenueCents)])
    if (pl.totalRefundsCents > 0) {
      rows.push(['Less: refunds', `-${centsToDollars(pl.totalRefundsCents)}`])
    }
    rows.push(['Less: business expenses (deductible)', `-${centsToDollars(pl.totalExpensesCents)}`])
    rows.push(['Estimated net self-employment income', centsToDollars(pl.netProfitCents)])
    rows.push([])
    rows.push(['IMPORTANT: Consult a licensed tax professional for official filings.'])

    const csv = rows.map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `chefflow-year-end-${pl.year}-accountant.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const mailtoBody = encodeURIComponent(
    `Hi,\n\nPlease find my ChefFlow ${pl.year} Year-End Financial Summary attached.\n\n` +
    `Year: ${pl.year}\n` +
    `Net Revenue: $${(pl.netRevenueCents / 100).toFixed(2)}\n` +
    `Total Expenses: $${(pl.totalExpensesCents / 100).toFixed(2)}\n` +
    `Estimated Net Income: $${(pl.netProfitCents / 100).toFixed(2)}\n\n` +
    `(Please attach the downloaded CSV file)\n`
  )
  const mailtoSubject = encodeURIComponent(`ChefFlow ${pl.year} Year-End Financial Summary`)
  const mailtoHref = `mailto:?subject=${mailtoSubject}&body=${mailtoBody}`

  return (
    <div className="flex flex-col items-end gap-2">
      <select
        value={selectedYear}
        onChange={handleYearChange}
        className="text-sm border border-stone-300 rounded-md px-3 py-2 text-stone-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        {yearOptions.map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <div className="flex gap-2">
        <button
          onClick={handleDownloadAccountantCsv}
          className="text-sm px-4 py-2 rounded-md bg-stone-900 text-white hover:bg-stone-700 transition-colors"
        >
          Download for Accountant
        </button>
        <a
          href={mailtoHref}
          className="text-sm px-4 py-2 rounded-md border border-stone-300 text-stone-700 hover:bg-stone-50 transition-colors"
        >
          Email to Myself
        </a>
      </div>
    </div>
  )
}

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2)
}
