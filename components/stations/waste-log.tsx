/* eslint-disable react-hooks/exhaustive-deps */
'use client'

// Waste Log - Waste tracking panel for a station
// Table of waste entries with reason badges and summary totals.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getWasteLog } from '@/lib/stations/waste-actions'

type Props = {
  stationId?: string
  startDate?: string
  endDate?: string
}

const REASON_BADGE_VARIANT: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
  expired: 'error',
  over_production: 'warning',
  dropped: 'warning',
  contamination: 'error',
  quality: 'info',
  other: 'default',
}

const REASON_LABELS: Record<string, string> = {
  expired: 'Expired',
  over_production: 'Over Production',
  dropped: 'Dropped',
  contamination: 'Contamination',
  quality: 'Quality Issue',
  other: 'Other',
}

export function WasteLog({ stationId, startDate, endDate }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const [from, setFrom] = useState(startDate ?? sevenDaysAgo)
  const [to, setTo] = useState(endDate ?? today)
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [totalValue, setTotalValue] = useState(0)

  useEffect(() => {
    loadData()
  }, [from, to])

  async function loadData() {
    setLoading(true)
    try {
      const data = await getWasteLog(from, to, stationId)
      setEntries(data)
      setTotalValue(data.reduce((sum: number, e: any) => sum + (e.estimated_value_cents ?? 0), 0))
    } catch (err) {
      console.error('[WasteLog] Load error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
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
                  {entries.map((entry: any) => (
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
                        <Badge variant={REASON_BADGE_VARIANT[entry.reason] ?? 'default'}>
                          {REASON_LABELS[entry.reason] ?? entry.reason}
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
                  ))}
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
  )
}
