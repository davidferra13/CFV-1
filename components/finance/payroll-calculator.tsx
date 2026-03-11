'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  calculatePayroll,
  exportPayrollCSV,
  getStaffPayHistory,
  type PayrollSummary,
  type StaffPayHistoryEntry,
} from '@/lib/finance/payroll-calculator-actions'

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

function getDefaultPeriod(preset: string): { start: string; end: string } {
  const now = new Date()
  const today = now.toISOString().split('T')[0]

  switch (preset) {
    case 'this_week': {
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(now)
      monday.setDate(diff)
      const sunday = new Date(monday)
      sunday.setDate(sunday.getDate() + 6)
      return { start: monday.toISOString().split('T')[0], end: sunday.toISOString().split('T')[0] }
    }
    case 'last_week': {
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7
      const monday = new Date(now)
      monday.setDate(diff)
      const sunday = new Date(monday)
      sunday.setDate(sunday.getDate() + 6)
      return { start: monday.toISOString().split('T')[0], end: sunday.toISOString().split('T')[0] }
    }
    case 'biweekly': {
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7
      const start = new Date(now)
      start.setDate(diff)
      const end = new Date(start)
      end.setDate(end.getDate() + 13)
      return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] }
    }
    default:
      return { start: today, end: today }
  }
}

export function PayrollCalculator() {
  const defaultPeriod = getDefaultPeriod('last_week')
  const [startDate, setStartDate] = useState(defaultPeriod.start)
  const [endDate, setEndDate] = useState(defaultPeriod.end)
  const [summary, setSummary] = useState<PayrollSummary | null>(null)
  const [drillDown, setDrillDown] = useState<{
    staffId: string
    staffName: string
    history: StaffPayHistoryEntry[]
  } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function applyPreset(preset: string) {
    const period = getDefaultPeriod(preset)
    setStartDate(period.start)
    setEndDate(period.end)
  }

  function handleCalculate() {
    setError(null)
    setSummary(null)
    setDrillDown(null)

    startTransition(async () => {
      try {
        const result = await calculatePayroll(startDate, endDate)
        setSummary(result)
      } catch (err) {
        setError('Failed to calculate payroll')
      }
    })
  }

  function handleExportCSV() {
    startTransition(async () => {
      try {
        const csv = await exportPayrollCSV(startDate, endDate)
        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `payroll-${startDate}-to-${endDate}.csv`
        a.click()
        URL.revokeObjectURL(url)
      } catch (err) {
        setError('Failed to export CSV')
      }
    })
  }

  function handleDrillDown(staffId: string, staffName: string) {
    startTransition(async () => {
      try {
        const history = await getStaffPayHistory(staffId)
        setDrillDown({ staffId, staffName, history })
      } catch (err) {
        setError('Failed to load staff pay history')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Calculator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => applyPreset('this_week')}>
              This Week
            </Button>
            <Button variant="secondary" size="sm" onClick={() => applyPreset('last_week')}>
              Last Week
            </Button>
            <Button variant="secondary" size="sm" onClick={() => applyPreset('biweekly')}>
              Biweekly
            </Button>
          </div>

          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <Label>Period Start</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-44"
              />
            </div>
            <div>
              <Label>Period End</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-44"
              />
            </div>
            <Button onClick={handleCalculate} disabled={isPending}>
              Calculate
            </Button>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="rounded-lg border border-amber-200 bg-amber-950 px-4 py-3 text-sm text-amber-200">
            <strong>Reference tool only.</strong> Payroll calculations are estimates based on clock
            entries and tip distributions. Consult your payroll provider for official pay stubs and
            tax filings.
          </div>
        </CardContent>
      </Card>

      {/* Payroll Table */}
      {summary && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Payroll: {summary.payPeriodStart} to {summary.payPeriodEnd}
              </CardTitle>
              <Button variant="secondary" size="sm" onClick={handleExportCSV} disabled={isPending}>
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {summary.lines.length === 0 ? (
              <p className="px-6 py-8 text-sm text-stone-500 text-center">
                No clock entries or tip distributions found for this period.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-700">
                      <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                        Staff
                      </th>
                      <th className="text-right px-3 py-3 text-xs font-medium text-stone-500 uppercase">
                        Rate
                      </th>
                      <th className="text-right px-3 py-3 text-xs font-medium text-stone-500 uppercase">
                        Reg Hrs
                      </th>
                      <th className="text-right px-3 py-3 text-xs font-medium text-stone-500 uppercase">
                        OT Hrs
                      </th>
                      <th className="text-right px-3 py-3 text-xs font-medium text-stone-500 uppercase">
                        Reg Pay
                      </th>
                      <th className="text-right px-3 py-3 text-xs font-medium text-stone-500 uppercase">
                        OT Pay
                      </th>
                      <th className="text-right px-3 py-3 text-xs font-medium text-stone-500 uppercase">
                        Tips
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                        Gross Pay
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800">
                    {summary.lines.map((line) => (
                      <tr
                        key={line.staffMemberId}
                        className="hover:bg-stone-800 cursor-pointer"
                        onClick={() => handleDrillDown(line.staffMemberId, line.staffName)}
                      >
                        <td className="px-6 py-3">
                          <p className="font-medium text-stone-200">{line.staffName}</p>
                          <p className="text-xs text-stone-500">{line.role}</p>
                        </td>
                        <td className="px-3 py-3 text-right text-stone-400">
                          {formatCurrency(line.hourlyRateCents)}/hr
                        </td>
                        <td className="px-3 py-3 text-right text-stone-300">
                          {line.regularHours.toFixed(2)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {line.overtimeHours > 0 ? (
                            <span className="text-amber-400 font-medium">
                              {line.overtimeHours.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-stone-500">0.00</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right text-stone-300">
                          {formatCurrency(line.regularPayCents)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          {line.overtimePayCents > 0 ? (
                            <span className="text-amber-400">
                              {formatCurrency(line.overtimePayCents)}
                            </span>
                          ) : (
                            <span className="text-stone-500">$0.00</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right text-stone-300">
                          {line.tipIncomeCents > 0 ? formatCurrency(line.tipIncomeCents) : '$0.00'}
                        </td>
                        <td className="px-6 py-3 text-right font-semibold text-stone-100">
                          {formatCurrency(line.grossPayCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-stone-600 bg-stone-900">
                      <td className="px-6 py-3 font-bold text-stone-200" colSpan={2}>
                        Totals ({summary.staffCount} staff)
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-stone-200">
                        {summary.totalRegularHours.toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-stone-200">
                        {summary.totalOvertimeHours > 0 ? (
                          <span className="text-amber-400">
                            {summary.totalOvertimeHours.toFixed(2)}
                          </span>
                        ) : (
                          '0.00'
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-stone-200">
                        {formatCurrency(summary.totalRegularPayCents)}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-stone-200">
                        {summary.totalOvertimePayCents > 0 ? (
                          <span className="text-amber-400">
                            {formatCurrency(summary.totalOvertimePayCents)}
                          </span>
                        ) : (
                          '$0.00'
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-stone-200">
                        {formatCurrency(summary.totalTipIncomeCents)}
                      </td>
                      <td className="px-6 py-3 text-right font-bold text-emerald-400 text-lg">
                        {formatCurrency(summary.totalGrossPayCents)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {summary.lines.some((l) => l.overtimeHours > 0) && (
              <div className="px-6 py-3 border-t border-stone-700">
                <Badge variant="warning">
                  Overtime detected at 1.5x rate for hours exceeding 40/week
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Staff Drill-Down */}
      {drillDown && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Pay History: {drillDown.staffName}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setDrillDown(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {drillDown.history.length === 0 ? (
              <p className="px-6 py-8 text-sm text-stone-500 text-center">
                No pay history found for this staff member.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-700">
                    <th className="text-left px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                      Period
                    </th>
                    <th className="text-right px-3 py-3 text-xs font-medium text-stone-500 uppercase">
                      Reg Hrs
                    </th>
                    <th className="text-right px-3 py-3 text-xs font-medium text-stone-500 uppercase">
                      OT Hrs
                    </th>
                    <th className="text-right px-3 py-3 text-xs font-medium text-stone-500 uppercase">
                      Reg Pay
                    </th>
                    <th className="text-right px-3 py-3 text-xs font-medium text-stone-500 uppercase">
                      OT Pay
                    </th>
                    <th className="text-right px-3 py-3 text-xs font-medium text-stone-500 uppercase">
                      Tips
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-stone-500 uppercase">
                      Gross
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                  {drillDown.history.map((h, i) => (
                    <tr key={i} className="hover:bg-stone-800">
                      <td className="px-6 py-3 text-stone-300 text-xs">
                        {h.periodStart} to {h.periodEnd}
                      </td>
                      <td className="px-3 py-3 text-right text-stone-300">
                        {h.regularHours.toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {h.overtimeHours > 0 ? (
                          <span className="text-amber-400">{h.overtimeHours.toFixed(2)}</span>
                        ) : (
                          <span className="text-stone-500">0.00</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-stone-300">
                        {formatCurrency(h.regularPayCents)}
                      </td>
                      <td className="px-3 py-3 text-right text-stone-300">
                        {formatCurrency(h.overtimePayCents)}
                      </td>
                      <td className="px-3 py-3 text-right text-stone-300">
                        {formatCurrency(h.tipIncomeCents)}
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-stone-100">
                        {formatCurrency(h.grossPayCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
