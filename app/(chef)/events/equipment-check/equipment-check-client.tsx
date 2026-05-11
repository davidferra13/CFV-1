'use client'

import { useState, useTransition, useEffect } from 'react'
import { getEquipmentAllocationReport } from '@/lib/intelligence/equipment-allocation-actions'
import type { EquipmentReport } from '@/lib/intelligence/equipment-allocation-actions'
import { EquipmentConflictCard } from '@/components/intelligence/equipment-conflict-card'
import { EquipmentInventoryStatus } from '@/components/intelligence/equipment-inventory-status'

interface EquipmentCheckClientProps {
  defaultStart: string
  defaultEnd: string
}

export function EquipmentCheckClient({
  defaultStart,
  defaultEnd,
}: EquipmentCheckClientProps) {
  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)
  const [report, setReport] = useState<EquipmentReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const loadReport = (start: string, end: string) => {
    startTransition(async () => {
      try {
        const result = await getEquipmentAllocationReport(start, end)
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

  return (
    <div className="space-y-6">
      {/* Date range selector */}
      <div className="flex flex-wrap items-center gap-3">
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
            No events with equipment checklists found in this date range.
          </p>
          <p className="text-xs text-stone-600 mt-1">
            Add equipment to event packing checklists to see allocation insights.
          </p>
        </div>
      )}

      {/* Report */}
      {report && !isPending && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div
              className={`rounded-lg border p-3 text-center ${
                report.totalConflicts > 0
                  ? 'border-red-800/40 bg-red-950/20'
                  : 'border-stone-800 bg-stone-900/30'
              }`}
            >
              <p
                className={`text-2xl font-bold ${
                  report.totalConflicts > 0 ? 'text-red-400' : 'text-emerald-400'
                }`}
              >
                {report.totalConflicts}
              </p>
              <p className="text-xs text-stone-500">Conflicts</p>
            </div>
            <div className="rounded-lg border border-stone-800 bg-stone-900/30 p-3 text-center">
              <p className="text-2xl font-bold text-stone-200">{report.totalItemsNeeded}</p>
              <p className="text-xs text-stone-500">Items Needed</p>
            </div>
            <div className="rounded-lg border border-stone-800 bg-stone-900/30 p-3 text-center">
              <p className="text-2xl font-bold text-stone-200">{report.available.length}</p>
              <p className="text-xs text-stone-500">In Inventory</p>
            </div>
          </div>

          {/* Conflicts */}
          {report.conflicts.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-stone-200 mb-3">Equipment Conflicts</h2>
              <div className="space-y-3">
                {report.conflicts.map((conflict, i) => (
                  <EquipmentConflictCard key={i} conflict={conflict} />
                ))}
              </div>
            </div>
          )}

          {/* Inventory and needs */}
          <EquipmentInventoryStatus
            available={report.available}
            needed={report.needed}
          />
        </>
      )}
    </div>
  )
}
