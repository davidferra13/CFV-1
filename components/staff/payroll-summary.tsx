'use client'

// Payroll Summary
// Date range report showing hours worked and earnings per staff member.
// Export-ready layout for accountant handoff.

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getPayrollSummary } from '@/lib/staff/staff-scheduling-actions'

type PayrollRow = {
  staffId: string
  name: string
  role: string
  scheduledHours: number
  actualHours: number
  hourlyRateCents: number
  totalEarningsCents: number
  shiftCount: number
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatHours(hours: number): string {
  return hours.toFixed(1)
}

function getDefaultDateRange(): { from: string; to: string } {
  const now = new Date()
  // Default to current pay period: last 2 weeks
  const twoWeeksAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14)
  return {
    from: `${twoWeeksAgo.getFullYear()}-${String(twoWeeksAgo.getMonth() + 1).padStart(2, '0')}-${String(twoWeeksAgo.getDate()).padStart(2, '0')}`,
    to: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
  }
}

export function PayrollSummary() {
  const defaults = getDefaultDateRange()
  const [dateFrom, setDateFrom] = useState(defaults.from)
  const [dateTo, setDateTo] = useState(defaults.to)
  const [rows, setRows] = useState<PayrollRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleLoad() {
    if (!dateFrom || !dateTo) return
    setError(null)

    startTransition(async () => {
      try {
        const data = await getPayrollSummary({ from: dateFrom, to: dateTo })
        setRows(data as PayrollRow[])
        setLoaded(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load payroll data')
        setRows([])
      }
    })
  }

  // Totals
  const totalScheduledHours = rows.reduce((s, r) => s + r.scheduledHours, 0)
  const totalActualHours = rows.reduce((s, r) => s + r.actualHours, 0)
  const totalEarningsCents = rows.reduce((s, r) => s + r.totalEarningsCents, 0)
  const totalShifts = rows.reduce((s, r) => s + r.shiftCount, 0)

  return (
    <div className="space-y-4">
      {/* Date Range Controls */}
      <div className="flex items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">From</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-40"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">To</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-40"
          />
        </div>
        <Button onClick={handleLoad} disabled={isPending}>
          {isPending ? 'Loading...' : 'Generate Report'}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loaded && rows.length === 0 && (
        <div className="rounded-lg border border-stone-200 bg-stone-50 p-6 text-center text-sm text-stone-400">
          No shift data found for this date range.
        </div>
      )}

      {loaded && rows.length > 0 && (
        <div className="rounded-lg border border-stone-200 overflow-hidden" id="payroll-report">
          {/* Report Header (visible in print) */}
          <div className="bg-stone-50 px-4 py-3 border-b border-stone-200">
            <h3 className="text-sm font-semibold text-stone-800">
              Payroll Summary: {dateFrom} to {dateTo}
            </h3>
            <p className="text-xs text-stone-400 mt-0.5">
              {totalShifts} shifts across {rows.length} staff members
            </p>
          </div>

          <table className="w-full">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="px-4 py-2 text-left text-xs font-medium text-stone-500">
                  Staff Member
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-stone-500">Role</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-stone-500">Shifts</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-stone-500">
                  Scheduled Hrs
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-stone-500">
                  Actual Hrs
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-stone-500">
                  Variance
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-stone-500">Rate</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-stone-500">
                  Total Pay
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const variance = row.actualHours - row.scheduledHours
                const varianceColor =
                  variance > 0
                    ? 'text-amber-600'
                    : variance < 0
                      ? 'text-green-600'
                      : 'text-stone-400'
                return (
                  <tr key={row.staffId} className="border-t border-stone-100 hover:bg-stone-50">
                    <td className="px-4 py-2 text-sm font-medium text-stone-800">{row.name}</td>
                    <td className="px-4 py-2 text-sm text-stone-500 capitalize">
                      {row.role.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-2 text-sm text-stone-600 text-right">
                      {row.shiftCount}
                    </td>
                    <td className="px-4 py-2 text-sm text-stone-600 text-right">
                      {formatHours(row.scheduledHours)}
                    </td>
                    <td className="px-4 py-2 text-sm text-stone-600 text-right">
                      {row.actualHours > 0 ? formatHours(row.actualHours) : '-'}
                    </td>
                    <td className={`px-4 py-2 text-sm text-right ${varianceColor}`}>
                      {row.actualHours > 0
                        ? `${variance > 0 ? '+' : ''}${formatHours(variance)}`
                        : '-'}
                    </td>
                    <td className="px-4 py-2 text-sm text-stone-600 text-right">
                      {formatCents(row.hourlyRateCents)}/hr
                    </td>
                    <td className="px-4 py-2 text-sm font-medium text-stone-800 text-right">
                      {formatCents(row.totalEarningsCents)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-stone-300 bg-stone-50 font-semibold">
                <td className="px-4 py-2 text-sm text-stone-800">Totals</td>
                <td className="px-4 py-2"></td>
                <td className="px-4 py-2 text-sm text-stone-800 text-right">{totalShifts}</td>
                <td className="px-4 py-2 text-sm text-stone-800 text-right">
                  {formatHours(totalScheduledHours)}
                </td>
                <td className="px-4 py-2 text-sm text-stone-800 text-right">
                  {totalActualHours > 0 ? formatHours(totalActualHours) : '-'}
                </td>
                <td className="px-4 py-2"></td>
                <td className="px-4 py-2"></td>
                <td className="px-4 py-2 text-sm text-stone-800 text-right">
                  {formatCents(totalEarningsCents)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Print/Export hint */}
      {loaded && rows.length > 0 && (
        <p className="text-xs text-stone-400">
          Use Ctrl+P / Cmd+P to print this report for your accountant.
        </p>
      )}
    </div>
  )
}
