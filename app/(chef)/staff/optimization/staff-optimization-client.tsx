'use client'

import { useState, useTransition, useEffect } from 'react'
import { getStaffOptimizationReport } from '@/lib/intelligence/staff-optimization-actions'
import type { StaffOptimizationReport } from '@/lib/intelligence/staff-optimization-actions'
import { StaffConflictCard } from '@/components/intelligence/staff-conflict-card'
import { StaffSharingCard } from '@/components/intelligence/staff-sharing-card'
import { StaffScheduleTimeline } from '@/components/intelligence/staff-schedule-timeline'

interface StaffOptimizationClientProps {
  defaultStart: string
  defaultEnd: string
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function StaffOptimizationClient({
  defaultStart,
  defaultEnd,
}: StaffOptimizationClientProps) {
  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)
  const [report, setReport] = useState<StaffOptimizationReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const loadReport = (start: string, end: string) => {
    startTransition(async () => {
      try {
        const result = await getStaffOptimizationReport(start, end)
        if (result.error) {
          setError(result.error)
          setReport(null)
        } else {
          setReport(result.data)
          setError(null)
        }
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load')
        setReport(null)
      }
    })
  }

  useEffect(() => {
    loadReport(defaultStart, defaultEnd)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDateChange = () => {
    loadReport(startDate, endDate)
  }

  // Quick nav: prev/next week
  const shiftWeek = (direction: number) => {
    const d = new Date(startDate + 'T00:00:00')
    d.setDate(d.getDate() + direction * 7)
    const newStart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const e = new Date(d)
    e.setDate(e.getDate() + 6)
    const newEnd = `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`
    setStartDate(newStart)
    setEndDate(newEnd)
    loadReport(newStart, newEnd)
  }

  return (
    <div className="space-y-6">
      {/* Date range selector */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => shiftWeek(-1)}
          className="px-2 py-1 text-sm text-stone-400 border border-stone-700 rounded hover:bg-stone-800 transition-colors"
        >
          &larr; Prev
        </button>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-stone-900 border border-stone-700 rounded px-2 py-1 text-sm text-stone-300"
          />
          <span className="text-stone-500 text-sm">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-stone-900 border border-stone-700 rounded px-2 py-1 text-sm text-stone-300"
          />
        </div>
        <button
          onClick={handleDateChange}
          disabled={isPending}
          className="px-3 py-1 text-sm font-medium text-stone-200 bg-stone-700 rounded hover:bg-stone-600 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Loading...' : 'Update'}
        </button>
        <button
          onClick={() => shiftWeek(1)}
          className="px-2 py-1 text-sm text-stone-400 border border-stone-700 rounded hover:bg-stone-800 transition-colors"
        >
          Next &rarr;
        </button>
      </div>

      {/* Loading */}
      {isPending && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-stone-800/50 animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !isPending && (
        <div className="rounded-lg border border-red-800/40 bg-red-950/30 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* No data */}
      {!report && !error && !isPending && (
        <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-8 text-center">
          <p className="text-sm text-stone-500">
            No events or staff assignments found in this date range.
          </p>
        </div>
      )}

      {/* Report */}
      {report && !isPending && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-stone-800 bg-stone-900/30 p-3 text-center">
              <p className="text-2xl font-bold text-stone-200">{report.totalStaffNeeded}</p>
              <p className="text-xs text-stone-500">Staff Needed</p>
            </div>
            <div className="rounded-lg border border-stone-800 bg-stone-900/30 p-3 text-center">
              <p className="text-2xl font-bold text-stone-200">
                {formatCents(report.totalEstimatedCostCents)}
              </p>
              <p className="text-xs text-stone-500">Estimated Labor</p>
            </div>
            <div
              className={`rounded-lg border p-3 text-center ${
                report.conflicts.length > 0
                  ? 'border-red-800/40 bg-red-950/20'
                  : 'border-stone-800 bg-stone-900/30'
              }`}
            >
              <p
                className={`text-2xl font-bold ${
                  report.conflicts.length > 0 ? 'text-red-400' : 'text-stone-200'
                }`}
              >
                {report.conflicts.length}
              </p>
              <p className="text-xs text-stone-500">Conflicts</p>
            </div>
            <div
              className={`rounded-lg border p-3 text-center ${
                report.opportunities.length > 0
                  ? 'border-emerald-800/40 bg-emerald-950/20'
                  : 'border-stone-800 bg-stone-900/30'
              }`}
            >
              <p
                className={`text-2xl font-bold ${
                  report.opportunities.length > 0 ? 'text-emerald-400' : 'text-stone-200'
                }`}
              >
                {report.opportunities.length}
              </p>
              <p className="text-xs text-stone-500">Sharing Opportunities</p>
            </div>
          </div>

          {/* Conflicts */}
          {report.conflicts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-stone-200 mb-3">Conflicts</h2>
              <div className="space-y-3">
                {report.conflicts.map((conflict, i) => (
                  <StaffConflictCard key={i} conflict={conflict} />
                ))}
              </div>
            </div>
          )}

          {/* Sharing opportunities */}
          {report.opportunities.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-stone-200 mb-3">Sharing Opportunities</h2>
              <div className="space-y-3">
                {report.opportunities.map((opp, i) => (
                  <StaffSharingCard key={i} opportunity={opp} />
                ))}
              </div>
            </div>
          )}

          {/* Schedule timeline */}
          <div>
            <h2 className="text-lg font-semibold text-stone-200 mb-3">Staff Schedule</h2>
            <StaffScheduleTimeline schedule={report.suggestedSchedule} />
          </div>
        </>
      )}
    </div>
  )
}
