/* eslint-disable react-hooks/exhaustive-deps */
'use client'

// Ops Log Viewer - Searchable, paginated history of all station operations
// Filter by action type, station, and date range. Expandable detail rows.

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getOpsLog,
  getOpsLogActionTypes,
  type OpsLogFilterInput,
} from '@/lib/stations/ops-log-actions'

type Station = {
  id: string
  name: string
}

type Props = {
  stations: Station[]
  initialStationId?: string
}

const ACTION_TYPE_COLORS: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  clipboard_update: 'info',
  shift_check_in: 'success',
  shift_check_out: 'success',
  mark_86: 'error',
  unmark_86: 'warning',
  waste_logged: 'error',
  order_created: 'info',
  order_ordered: 'warning',
  order_received: 'success',
  station_created: 'default',
  station_updated: 'default',
  component_added: 'info',
  component_removed: 'warning',
}

export function OpsLogViewer({ stations, initialStationId }: Props) {
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<any[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionTypes, setActionTypes] = useState<string[]>([])

  // Filters
  const [stationFilter, setStationFilter] = useState(initialStationId ?? '')
  const [actionTypeFilter, setActionTypeFilter] = useState('')
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])
  const [page, setPage] = useState(1)

  useEffect(() => {
    loadActionTypes()
  }, [])

  useEffect(() => {
    loadEntries()
  }, [stationFilter, actionTypeFilter, startDate, endDate, page])

  async function loadActionTypes() {
    try {
      const types = await getOpsLogActionTypes()
      setActionTypes(types as string[])
    } catch {
      // Non-critical
    }
  }

  async function loadEntries() {
    setLoading(true)
    try {
      const filters: OpsLogFilterInput = {
        page,
        per_page: 50,
      }
      if (stationFilter) filters.station_id = stationFilter
      if (actionTypeFilter) filters.action_type = actionTypeFilter
      if (startDate) filters.start_date = startDate
      if (endDate) filters.end_date = endDate

      const result = await getOpsLog(filters)
      setEntries(result.entries)
      setTotalPages(result.total_pages)
    } catch (err) {
      console.error('[OpsLogViewer] Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  function formatActionType(type: string): string {
    return type
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Operations Log</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">Station</label>
            <select
              value={stationFilter}
              onChange={(e) => {
                setStationFilter(e.target.value)
                setPage(1)
              }}
              className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100"
            >
              <option value="">All Stations</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">Action Type</label>
            <select
              value={actionTypeFilter}
              onChange={(e) => {
                setActionTypeFilter(e.target.value)
                setPage(1)
              }}
              className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100"
            >
              <option value="">All Types</option>
              {actionTypes.map((t) => (
                <option key={t} value={t}>
                  {formatActionType(t)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setPage(1)
              }}
              className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-200"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-400 mb-1">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setPage(1)
              }}
              className="rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-200"
            />
          </div>
        </div>

        {/* Log entries */}
        {loading ? (
          <div className="py-4 text-center text-sm text-stone-500">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="py-4 text-center text-sm text-stone-500">No log entries found.</div>
        ) : (
          <div className="space-y-1">
            {entries.map((entry: any) => (
              <div key={entry.id}>
                <button
                  type="button"
                  onClick={() => toggleExpand(entry.id)}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-stone-800/50 transition-colors"
                >
                  <span className="text-xs text-stone-500 min-w-[140px]">
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                  <Badge variant={ACTION_TYPE_COLORS[entry.action_type] ?? 'default'}>
                    {formatActionType(entry.action_type)}
                  </Badge>
                  {entry.stations?.name && (
                    <span className="text-xs text-stone-400">@ {entry.stations.name}</span>
                  )}
                  <span className="ml-auto text-xs text-stone-600">
                    {expandedId === entry.id ? 'Hide' : 'Details'}
                  </span>
                </button>

                {/* Expanded details */}
                {expandedId === entry.id && (
                  <div className="ml-[152px] px-3 pb-3 text-sm">
                    <pre className="bg-stone-800/50 rounded-lg p-3 text-xs text-stone-300 overflow-x-auto max-h-[200px] overflow-y-auto">
                      {JSON.stringify(entry.details, null, 2)}
                    </pre>
                    <div className="mt-1 text-xs text-stone-500">
                      Entry ID: {entry.id}
                      {entry.staff_member_id && ` | Staff: ${entry.staff_member_id}`}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <span className="text-sm text-stone-400">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
