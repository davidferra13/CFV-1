'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import {
  getProfitAndLossReport,
  type ProfitAndLossReportData,
} from '@/lib/finance/profit-loss-report-actions'

type Props = {
  initialData: ProfitAndLossReportData
}

export function ProfitAndLossReport({ initialData }: Props) {
  const [report, setReport] = useState(initialData)
  const [startDate, setStartDate] = useState(initialData.startDate)
  const [endDate, setEndDate] = useState(initialData.endDate)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function refresh() {
    setError(null)
    startTransition(async () => {
      try {
        const next = await getProfitAndLossReport(startDate, endDate)
        setReport(next)
      } catch (err: any) {
        setError(err?.message || 'Failed to load P&L report')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profit &amp; Loss Report</CardTitle>
        <p className="text-sm text-stone-500">
          Revenue - (COGS + Operating Expenses) = Net Profit/Loss
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-[150px_150px_120px]">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-md border border-stone-600 bg-stone-900 px-2 py-2 text-sm"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-md border border-stone-600 bg-stone-900 px-2 py-2 text-sm"
          />
          <Button onClick={refresh} loading={isPending}>
            Run Report
          </Button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="grid gap-3 md:grid-cols-4">
          <Metric
            label="Total Revenue"
            value={formatCurrency(report.revenue.totalRevenueCents)}
            tone="text-emerald-600"
          />
          <Metric
            label="COGS"
            value={formatCurrency(report.cogs.purchaseOrdersCents)}
            tone="text-red-500"
          />
          <Metric
            label="Operating Expenses"
            value={formatCurrency(report.operatingExpenses.totalOperatingExpensesCents)}
            tone="text-red-500"
          />
          <Metric
            label="Net Profit/Loss"
            value={formatCurrency(report.totals.netProfitLossCents)}
            tone={report.totals.netProfitLossCents >= 0 ? 'text-emerald-600' : 'text-red-600'}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              <Row label="Billing Revenue" value={report.revenue.billingRevenueCents} />
              <Row label="Commerce Revenue" value={report.revenue.commerceRevenueCents} />
              <Row label="Sales Revenue" value={report.revenue.salesRevenueCents} />
              <Row
                label="Total Revenue"
                value={report.revenue.totalRevenueCents}
                strong
                tone="text-emerald-600"
              />
              <Row label="Cost of Goods Sold (POs)" value={-report.cogs.purchaseOrdersCents} />
              <Row
                label="Gross Profit"
                value={report.totals.grossProfitCents}
                strong
                tone={report.totals.grossProfitCents >= 0 ? 'text-stone-100' : 'text-red-600'}
              />
              <Row
                label="Expenses Table"
                value={-report.operatingExpenses.expenseTableCents}
                tone="text-red-500"
              />
              <Row
                label="Labor (Payroll Report)"
                value={-report.operatingExpenses.laborFromPayrollCents}
                tone="text-red-500"
              />
              <Row
                label="Total Operating Expenses"
                value={-report.operatingExpenses.totalOperatingExpensesCents}
                strong
                tone="text-red-500"
              />
              <Row
                label={`Net Profit/Loss (${report.totals.profitMarginPercent.toFixed(1)}%)`}
                value={report.totals.netProfitLossCents}
                strong
                tone={report.totals.netProfitLossCents >= 0 ? 'text-emerald-600' : 'text-red-600'}
              />
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-stone-700 p-3">
      <p className="text-xs uppercase text-stone-500">{label}</p>
      <p className={`text-xl font-semibold ${tone ?? 'text-stone-100'}`}>{value}</p>
    </div>
  )
}

function Row({
  label,
  value,
  tone,
  strong,
}: {
  label: string
  value: number
  tone?: string
  strong?: boolean
}) {
  return (
    <tr className="border-b border-stone-800">
      <td className={`py-2 ${strong ? 'font-semibold text-stone-200' : 'text-stone-400'}`}>
        {label}
      </td>
      <td
        className={`py-2 text-right ${tone ?? 'text-stone-200'} ${strong ? 'font-semibold' : ''}`}
      >
        {formatCurrency(value)}
      </td>
    </tr>
  )
}
