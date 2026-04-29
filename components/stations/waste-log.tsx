/* eslint-disable react-hooks/exhaustive-deps */
'use client'

// Waste Log - Waste tracking panel for a station
// Table of waste entries with reason badges and summary totals.

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getWasteLog } from '@/lib/stations/waste-actions'

type Props = {
  stationId?: string
  startDate?: string
  endDate?: string
  showSummary?: boolean
}

type WasteEntry = {
  id: string
  created_at: string
  reason: string | null
  quantity: number | string | null
  unit: string | null
  estimated_value_cents: number | null
  notes: string | null
  station_components?: { name?: string | null } | null
  stations?: { name?: string | null } | null
}

type SummaryState = 'loading' | 'error' | 'ready'

type WasteSummary = {
  totalEntries: number
  totalValueCents: number
  topReason: string | null
}

const REASON_BADGE_VARIANT: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  expired: 'error',
  damaged: 'error',
  overproduced: 'warning',
  dropped: 'warning',
  contamination: 'error',
  quality: 'info',
  other: 'default',
}

const REASON_LABELS: Record<string, string> = {
  expired: 'Expired',
  damaged: 'Damaged',
  overproduced: 'Overproduced',
  dropped: 'Dropped',
  contamination: 'Contamination',
  quality: 'Quality Issue',
  other: 'Other',
}

const REASON_ALIASES: Record<string, string> = {
  over_production: 'overproduced',
  overproduction: 'overproduced',
  quality_issue: 'quality',
}

function normalizeReason(reason: string | null | undefined) {
  if (!reason) return 'other'
  return REASON_ALIASES[reason] ?? reason
}

function formatUnknownReason(reason: string) {
  return reason
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getTopReason(entries: WasteEntry[]) {
  const counts = new Map<string, number>()

  for (const entry of entries) {
    const reason = normalizeReason(entry.reason)
    counts.set(reason, (counts.get(reason) ?? 0) + 1)
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

function getSummary(entries: WasteEntry[]): WasteSummary {
  return {
    totalEntries: entries.length,
    totalValueCents: entries.reduce((sum, entry) => sum + (entry.estimated_value_cents ?? 0), 0),
    topReason: getTopReason(entries),
  }
}

function SummaryValue({
  state,
  children,
}: {
  state: SummaryState
  children: React.ReactNode
}) {
  if (state === 'loading') {
    return <p className="text-xl font-semibold text-stone-300">Loading...</p>
  }

  if (state === 'error') {
    return <p className="text-xl font-semibold text-red-300">Unavailable</p>
  }

  return <p className="text-3xl font-bold text-stone-100">{children}</p>
}

function WasteSummaryCards({
  entries,
  loading,
  error,
}: {
  entries: WasteEntry[]
  loading: boolean
  error: string | null
}) {
  const summary = getSummary(entries)
  const state: SummaryState = loading ? 'loading' : error ? 'error' : 'ready'
  const topReasonLabel = summary.topReason
    ? REASON_LABELS[summary.topReason] ?? formatUnknownReason(summary.topReason)
    : '-'

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm text-stone-500">Total Waste in Filter</p>
          <SummaryValue state={state}>{summary.totalEntries} items</SummaryValue>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm text-stone-500">Waste Value in Filter</p>
          <SummaryValue state={state}>${(summary.totalValueCents / 100).toFixed(2)}</SummaryValue>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm text-stone-500">Top Reason in Filter</p>
          <SummaryValue state={state}>
            <span className="block truncate">{topReasonLabel}</span>
          </SummaryValue>
        </CardContent>
      </Card>
    </div>
  )
}

export function WasteLog({ stationId, startDate, endDate, showSummary = false }: Props) {
  const _wln = new Date()
  const today = `${_wln.getFullYear()}-${String(_wln.getMonth() + 1).padStart(2, '0')}-${String(_wln.getDate()).padStart(2, '0')}`
  const _wls = new Date(_wln.getFullYear(), _wln.getMonth(), _wln.getDate() - 7)
  const sevenDaysAgo = `${_wls.getFullYear()}-${String(_wls.getMonth() + 1).padStart(2, '0')}-${String(_wls.getDate()).padStart(2, '0')}`

  const [from, setFrom] = useState(startDate ?? sevenDaysAgo)
  const [to, setTo] = useState(endDate ?? today)
  const [entries, setEntries] = useState<WasteEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [from, to])

  async function loadData() {
    if (!from || !to) {
      setEntries([])
      setLoading(false)
      setError('Choose a start and end date to load waste entries.')
      return
    }

    if (from > to) {
      setEntries([])
      setLoading(false)
      setError('Start date must be before end date.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await getWasteLog(from, to, stationId)
      setEntries(data as WasteEntry[])
    } catch (err) {
      console.error('[WasteLog] Load error:', err)
      setEntries([])
      setError(err instanceof Error ? err.message : 'Failed to load waste log')
    } finally {
      setLoading(false)
    }
  }

  const totalValue = entries.reduce((sum, entry) => sum + (entry.estimated_value_cents ?? 0), 0)

  return (
    <div className="space-y-4">
      {showSummary && <WasteSummaryCards entries={entries} loading={loading} error={error} />}

      <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Waste Log</CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <label className="text-stone-400">From:</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded border border-stone-600 bg-stone-900 px-2 py-1 text-sm text-stone-200"
            />
            <label className="text-stone-400">To:</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded border border-stone-600 bg-stone-900 px-2 py-1 text-sm text-stone-200"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-4 text-sm text-stone-500">Loading waste entries...</div>
        ) : error ? (
          <div className="p-4 text-sm text-red-400">{error}</div>
        ) : entries.length === 0 ? (
          <div className="p-4 text-sm text-stone-500">No waste logged in this date range.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-700 text-left text-xs text-stone-400 uppercase">
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium">Component</th>
                    <th className="px-4 py-2 font-medium text-right">Qty</th>
                    <th className="px-4 py-2 font-medium">Reason</th>
                    <th className="px-4 py-2 font-medium text-right">Est. Value</th>
                    <th className="px-4 py-2 font-medium">Station</th>
                    <th className="px-4 py-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => {
                    const reason = normalizeReason(entry.reason)

                    return (
                      <tr key={entry.id} className="border-b border-stone-800">
                        <td className="px-4 py-2 text-stone-400">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2 text-stone-200">
                          {entry.station_components?.name ?? 'Unknown'}
                        </td>
                        <td className="px-4 py-2 text-right text-stone-300">
                          {entry.quantity} {entry.unit}
                        </td>
                        <td className="px-4 py-2">
                          <Badge variant={REASON_BADGE_VARIANT[reason] ?? 'default'}>
                            {REASON_LABELS[reason] ?? formatUnknownReason(reason)}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-right text-stone-300">
                          {entry.estimated_value_cents
                            ? `$${(entry.estimated_value_cents / 100).toFixed(2)}`
                            : '-'}
                        </td>
                        <td className="px-4 py-2 text-stone-400">{entry.stations?.name ?? '-'}</td>
                        <td className="px-4 py-2 text-stone-500 max-w-[200px] truncate">
                          {entry.notes ?? '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary footer */}
            <div className="px-4 py-3 border-t border-stone-700 flex items-center justify-between text-sm">
              <span className="text-stone-400">
                {entries.length} waste event{entries.length !== 1 ? 's' : ''} in range
              </span>
              {totalValue > 0 && (
                <span className="text-red-400 font-medium">
                  Total est. value: ${(totalValue / 100).toFixed(2)}
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
      </Card>
    </div>
  )
}
