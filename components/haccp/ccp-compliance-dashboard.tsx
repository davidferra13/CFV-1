'use client'

import { useEffect, useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getCCPComplianceReport, type CCPComplianceEntry } from '@/lib/haccp/compliance-log-actions'

type DateRange = '30' | '90' | '365'

export function CCPComplianceDashboard() {
  const [entries, setEntries] = useState<CCPComplianceEntry[]>([])
  const [range, setRange] = useState<DateRange>('90')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function loadData(days: DateRange) {
    const end = new Date().toISOString().split('T')[0]
    const start = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    startTransition(async () => {
      try {
        const data = await getCCPComplianceReport(start, end)
        setEntries(data)
        setError(null)
      } catch {
        setError('Failed to load compliance data')
      }
    })
  }

  useEffect(() => {
    loadData(range)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleRangeChange(d: DateRange) {
    setRange(d)
    loadData(d)
  }

  const totalChecks = entries.reduce((sum, e) => sum + e.totalLogs, 0)
  const totalFailures = entries.reduce((sum, e) => sum + e.failCount, 0)
  const overallRate =
    totalChecks > 0 ? Math.round(((totalChecks - totalFailures) / totalChecks) * 100) : 0

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-red-400">{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-stone-100">CCP Compliance Report</h3>
        <div className="flex gap-2">
          {(['30', '90', '365'] as const).map((d) => (
            <Button
              key={d}
              size="sm"
              variant={range === d ? 'primary' : 'secondary'}
              onClick={() => handleRangeChange(d)}
              disabled={isPending}
            >
              {d === '365' ? '1 Year' : `${d} Days`}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Total Checks</p>
            <p className="text-xl font-semibold text-stone-100">{totalChecks}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Failures</p>
            <p
              className={`text-xl font-semibold ${totalFailures > 0 ? 'text-red-400' : 'text-emerald-400'}`}
            >
              {totalFailures}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-stone-500">Pass Rate</p>
            <p
              className={`text-xl font-semibold ${overallRate >= 95 ? 'text-emerald-400' : overallRate >= 80 ? 'text-yellow-400' : 'text-red-400'}`}
            >
              {totalChecks > 0 ? `${overallRate}%` : 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Per-CCP Table */}
      {entries.length === 0 && !isPending ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-stone-500 text-sm">No temperature logs recorded yet.</p>
            <p className="text-stone-600 text-xs mt-1">
              Start logging temperatures in Daily Compliance to see CCP compliance data here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-stone-300">Critical Control Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {entries.map((entry, i) => (
                <div
                  key={entry.location}
                  className="flex items-center justify-between rounded-lg border border-stone-800 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-100">
                      CCP #{i + 1}: {entry.locationLabel}
                    </p>
                    <p className="text-xs text-stone-500">
                      {entry.totalLogs} checks logged
                      {entry.failCount > 0
                        ? `, ${entry.failCount} failure${entry.failCount !== 1 ? 's' : ''}`
                        : ''}
                      {entry.lastLogDate ? ` (last: ${entry.lastLogDate})` : ''}
                    </p>
                  </div>
                  <Badge
                    variant={
                      entry.passRate >= 95 ? 'success' : entry.passRate >= 80 ? 'warning' : 'error'
                    }
                  >
                    {entry.passRate}% pass
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
