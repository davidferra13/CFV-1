'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getPayrollReportForPeriod, type PayrollReportData } from '@/lib/staff/staffing-actions'

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

type Props = {
  initialData: PayrollReportData
}

export function PayrollReport({ initialData }: Props) {
  const [report, setReport] = useState(initialData)
  const [startDate, setStartDate] = useState(initialData.startDate)
  const [endDate, setEndDate] = useState(initialData.endDate)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function refreshReport() {
    setError(null)
    startTransition(async () => {
      try {
        const next = await getPayrollReportForPeriod(startDate, endDate)
        setReport(next)
      } catch (err: any) {
        setError(err?.message || 'Failed to refresh payroll report')
      }
    })
  }

  function exportCsv() {
    const lines = [
      ['Staff', 'Hours', 'Minutes', 'Rate', 'Estimated Labor Cost', 'Entries'].join(','),
      ...report.rows.map((row) =>
        [
          `"${row.staffName.replace(/"/g, '""')}"`,
          row.totalHours.toFixed(2),
          row.totalMinutes,
          (row.hourlyRateCents / 100).toFixed(2),
          (row.estimatedLaborCostCents / 100).toFixed(2),
          row.entryCount,
        ].join(',')
      ),
    ]

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `payroll-report-${startDate}-to-${endDate}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>PayrollReport</CardTitle>
        <p className="text-sm text-stone-500">
          Pay-period labor totals from tracked hours and staff rates.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-[150px_150px_120px_120px]">
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
          <Button variant="primary" onClick={refreshReport} disabled={isPending}>
            Run Report
          </Button>
          <Button variant="secondary" onClick={exportCsv}>
            Export CSV
          </Button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-stone-700 p-3">
            <p className="text-xs uppercase text-stone-500">Total Hours</p>
            <p className="text-xl font-semibold text-stone-100">{report.totalHours.toFixed(2)}</p>
          </div>
          <div className="rounded-lg border border-stone-700 p-3">
            <p className="text-xs uppercase text-stone-500">Total Minutes</p>
            <p className="text-xl font-semibold text-stone-100">{report.totalMinutes}</p>
          </div>
          <div className="rounded-lg border border-stone-700 p-3">
            <p className="text-xs uppercase text-stone-500">Estimated Labor Cost</p>
            <p className="text-xl font-semibold text-stone-100">
              {formatCurrency(report.totalLaborCostCents)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700 text-stone-500">
                <th className="px-2 py-2 text-left font-medium">Staff</th>
                <th className="px-2 py-2 text-right font-medium">Hours</th>
                <th className="px-2 py-2 text-right font-medium">Rate</th>
                <th className="px-2 py-2 text-right font-medium">Labor Cost</th>
                <th className="px-2 py-2 text-right font-medium">Entries</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-stone-500">
                    No payroll activity in this period.
                  </td>
                </tr>
              ) : (
                report.rows.map((row) => (
                  <tr key={row.staffMemberId} className="border-b border-stone-800">
                    <td className="px-2 py-2 text-stone-100">{row.staffName}</td>
                    <td className="px-2 py-2 text-right text-stone-300">
                      {row.totalHours.toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-right text-stone-300">
                      {formatCurrency(row.hourlyRateCents)}
                    </td>
                    <td className="px-2 py-2 text-right text-stone-100 font-medium">
                      {formatCurrency(row.estimatedLaborCostCents)}
                    </td>
                    <td className="px-2 py-2 text-right text-stone-500">{row.entryCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
