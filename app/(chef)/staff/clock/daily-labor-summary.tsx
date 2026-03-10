'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DailyLaborSummary } from '@/lib/staff/time-tracking-actions'

type Props = {
  summary: DailyLaborSummary
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function DailyLaborSummaryCard({ summary }: Props) {
  return (
    <Card className="border-stone-800 bg-stone-900/50">
      <CardHeader>
        <CardTitle className="text-stone-100">Daily Labor Summary</CardTitle>
        <p className="text-sm text-stone-500">{summary.date}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Totals */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-3 text-center">
            <p className="text-xs text-stone-500 uppercase">Total Hours</p>
            <p className="text-2xl font-bold text-stone-100">{summary.totalHours}</p>
          </div>
          <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-3 text-center">
            <p className="text-xs text-stone-500 uppercase">Labor Cost</p>
            <p className="text-2xl font-bold text-stone-100">
              {formatCents(summary.totalCostCents)}
            </p>
          </div>
        </div>

        {/* By Staff Member */}
        {summary.staffEntries.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-stone-400">By Staff Member</h3>
            {summary.staffEntries.map((entry) => (
              <div
                key={entry.staffMemberId}
                className="flex items-center justify-between rounded-lg border border-stone-700 bg-stone-800/50 px-3 py-2"
              >
                <span className="text-sm text-stone-200">{entry.staffName}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-stone-400">
                    {Math.round((entry.totalMinutes / 60) * 100) / 100}h
                  </span>
                  <span className="text-sm font-medium text-stone-200">
                    {formatCents(entry.totalPayCents)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-stone-500">No time entries today.</p>
        )}
      </CardContent>
    </Card>
  )
}
