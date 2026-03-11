'use client'

import { useEffect, useState, useTransition, useCallback } from 'react'
import {
  getServerTableView,
  fireCoursesForTable,
  closeServerCheck,
  requestCheckSplit,
} from '@/lib/commerce/server-workflow-actions'
import type { ServerTableView, CourseStatus } from '@/lib/commerce/server-workflow-actions'

function formatOpenTime(openedAt: string): string {
  const diff = Math.floor((Date.now() - new Date(openedAt).getTime()) / 60000)
  if (diff < 1) return 'Just opened'
  if (diff < 60) return `${diff}m`
  const hrs = Math.floor(diff / 60)
  return `${hrs}h ${diff % 60}m`
}

function courseStatusDot(status: CourseStatus['status']): string {
  switch (status) {
    case 'pending':
      return 'bg-zinc-300 dark:bg-zinc-600'
    case 'fired':
      return 'bg-amber-400 dark:bg-amber-500'
    case 'ready':
      return 'bg-emerald-400 dark:bg-emerald-500'
    case 'served':
      return 'bg-blue-400 dark:bg-blue-500'
  }
}

function tableStatusBg(status: string): string {
  switch (status) {
    case 'seated':
      return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
    case 'reserved':
      return 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800'
    case 'out_of_service':
      return 'bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 opacity-60'
    default:
      return 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700'
  }
}

export default function ServerTablePanel() {
  const [tables, setTables] = useState<ServerTableView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const loadTables = useCallback(async () => {
    try {
      const data = await getServerTableView()
      setTables(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tables')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTables()
    const interval = setInterval(loadTables, 15_000)
    return () => clearInterval(interval)
  }, [loadTables])

  function handleFireCourse(checkId: string, courseNumber: number) {
    startTransition(async () => {
      try {
        await fireCoursesForTable(checkId, courseNumber)
        await loadTables()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fire course')
      }
    })
  }

  function handleSplit(checkId: string, splitType: 'even' | 'by_item') {
    startTransition(async () => {
      try {
        await requestCheckSplit(checkId, splitType)
        await loadTables()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to request split')
      }
    })
  }

  function handleCloseCheck(checkId: string) {
    const method = prompt('Payment method (cash, card, etc.):')
    if (!method) return

    const tipStr = prompt('Tip amount in dollars (0 for no tip):')
    const tipCents = tipStr ? Math.round(parseFloat(tipStr) * 100) : undefined

    startTransition(async () => {
      try {
        await closeServerCheck({
          checkId,
          paymentMethod: method,
          tipCents: isNaN(tipCents ?? 0) ? undefined : tipCents,
        })
        await loadTables()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to close check')
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 rounded-full border-4 border-zinc-300 border-t-blue-600" />
      </div>
    )
  }

  // Group tables by zone
  const zoneMap = new Map<string, { name: string; tables: ServerTableView[] }>()
  for (const t of tables) {
    const zone = zoneMap.get(t.zoneId) ?? { name: t.zoneName, tables: [] }
    zone.tables.push(t)
    zoneMap.set(t.zoneId, zone)
  }

  const seatedTables = tables.filter((t) => t.check !== null)

  return (
    <div className="space-y-6">
      {/* Summary Bar */}
      <div className="flex flex-wrap gap-3 text-sm">
        <div className="rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-2">
          <span className="text-zinc-500">Total tables: </span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">{tables.length}</span>
        </div>
        <div className="rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-3 py-2">
          <span className="text-blue-600 dark:text-blue-400">Seated: </span>
          <span className="font-semibold text-blue-200 dark:text-blue-300">
            {seatedTables.length}
          </span>
        </div>
        <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-3 py-2">
          <span className="text-emerald-600 dark:text-emerald-400">Available: </span>
          <span className="font-semibold text-emerald-200 dark:text-emerald-300">
            {tables.filter((t) => t.status === 'available').length}
          </span>
        </div>
        {isPending && (
          <div className="flex items-center">
            <div className="animate-spin h-4 w-4 rounded-full border-2 border-zinc-300 border-t-blue-600" />
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-200 dark:bg-red-950 dark:text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            dismiss
          </button>
        </div>
      )}

      {/* Tables by Zone */}
      {Array.from(zoneMap.entries()).map(([zoneId, zone]) => (
        <div key={zoneId}>
          <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
            {zone.name}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {zone.tables.map((table) => (
              <div
                key={table.tableId}
                className={`rounded-lg border-2 p-3 ${tableStatusBg(table.status)}`}
              >
                {/* Table Label */}
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    {table.tableLabel}
                  </span>
                  <span className="text-xs text-zinc-500">{table.seatCapacity} seats</span>
                </div>

                {table.check ? (
                  <>
                    {/* Guest Info */}
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                      {table.check.guestName && (
                        <span className="font-medium">{table.check.guestName}</span>
                      )}
                      {table.check.guestCount != null && (
                        <span className="ml-2">({table.check.guestCount} guests)</span>
                      )}
                      <div className="text-xs text-zinc-400 mt-0.5">
                        Open: {formatOpenTime(table.check.openedAt)}
                      </div>
                    </div>

                    {/* Course Status Dots */}
                    {table.courseStatuses.length > 0 && (
                      <div className="flex items-center gap-1 mb-3">
                        <span className="text-xs text-zinc-500 mr-1">Courses:</span>
                        {table.courseStatuses.map((cs) => (
                          <div key={cs.courseNumber} className="flex flex-col items-center gap-0.5">
                            <div
                              className={`w-3 h-3 rounded-full ${courseStatusDot(cs.status)}`}
                              title={`Course ${cs.courseNumber}: ${cs.status}`}
                            />
                            <span className="text-[10px] text-zinc-400">{cs.courseNumber}</span>
                          </div>
                        ))}
                        {/* Legend */}
                        <div className="ml-2 flex items-center gap-1 text-[10px] text-zinc-400">
                          <div className="w-2 h-2 rounded-full bg-zinc-300" /> Pending
                          <div className="w-2 h-2 rounded-full bg-amber-400 ml-1" /> Fired
                          <div className="w-2 h-2 rounded-full bg-emerald-400 ml-1" /> Ready
                          <div className="w-2 h-2 rounded-full bg-blue-400 ml-1" /> Served
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-1.5">
                      {/* Fire Next Course */}
                      {table.courseStatuses.length > 0 &&
                        (() => {
                          const nextPending = table.courseStatuses.find(
                            (c) => c.status === 'pending'
                          )
                          if (!nextPending) return null
                          return (
                            <button
                              onClick={() =>
                                handleFireCourse(table.check!.id, nextPending.courseNumber)
                              }
                              disabled={isPending}
                              className="rounded px-2.5 py-1.5 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 touch-manipulation"
                            >
                              Fire Course {nextPending.courseNumber}
                            </button>
                          )
                        })()}

                      <button
                        onClick={() => handleSplit(table.check!.id, 'even')}
                        disabled={isPending}
                        className="rounded px-2.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 touch-manipulation"
                      >
                        Split
                      </button>

                      <button
                        onClick={() => handleCloseCheck(table.check!.id)}
                        disabled={isPending}
                        className="rounded px-2.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 touch-manipulation"
                      >
                        Close
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-zinc-400 italic">
                    {table.status === 'out_of_service'
                      ? 'Out of service'
                      : table.status === 'reserved'
                        ? 'Reserved'
                        : 'Available'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {tables.length === 0 && (
        <div className="text-center text-zinc-400 py-12">
          No tables configured. Set up dining zones and tables in Table Service settings.
        </div>
      )}
    </div>
  )
}
