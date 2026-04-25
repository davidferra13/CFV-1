// Station Shift History - Browse all past shift check-ins, check-outs, and handoff notes.
// Solves: "adjustments disappear between shifts" by making all shift knowledge browsable.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getStation } from '@/lib/stations/actions'
import { getStationShiftHistory } from '@/lib/stations/clipboard-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { notFound } from 'next/navigation'

export const metadata: Metadata = { title: 'Shift History' }

function formatDateTime(timestamp: string | null): string {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDuration(checkIn: string, checkOut: string | null): string {
  if (!checkOut) return 'In progress'
  const diffMs = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

function shiftBadgeVariant(
  shiftType: string
): 'default' | 'success' | 'warning' | 'error' | 'info' {
  if (shiftType === 'open') return 'success'
  if (shiftType === 'mid') return 'warning'
  if (shiftType === 'close') return 'info'
  return 'default'
}

function getSnapshotSummary(snapshot: any): { total: number; eightySixed: number } | null {
  if (!snapshot || !snapshot.entries || !Array.isArray(snapshot.entries)) return null
  const entries = snapshot.entries as any[]
  return {
    total: entries.length,
    eightySixed: entries.filter((e: any) => e.is_86d).length,
  }
}

export default async function ShiftHistoryPage({ params }: { params: { id: string } }) {
  await requireChef()

  let station: any
  try {
    station = await getStation(params.id)
  } catch {
    notFound()
  }

  const shifts = await getStationShiftHistory(params.id, 100)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/stations" className="text-stone-500 hover:text-stone-300">
          Stations
        </Link>
        <span className="text-stone-600">/</span>
        <Link href={`/stations/${params.id}`} className="text-stone-500 hover:text-stone-300">
          {station.name}
        </Link>
        <span className="text-stone-600">/</span>
        <span className="text-stone-300">Shift History</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-stone-100">{station.name} - Shift History</h1>
        <p className="mt-1 text-sm text-stone-500">
          Every shift check-in and check-out with handoff notes. Nothing gets lost between shifts.
        </p>
      </div>

      {shifts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-500 text-sm">
              No shift history yet. Use the clipboard page to check in and out of shifts.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {shifts.map((shift: any) => {
            const snapshotInfo = getSnapshotSummary(shift.snapshot)
            return (
              <Card key={shift.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant={shiftBadgeVariant(shift.shift_type)}>
                        {shift.shift_type === 'open'
                          ? 'Opening'
                          : shift.shift_type === 'mid'
                            ? 'Mid'
                            : shift.shift_type === 'close'
                              ? 'Closing'
                              : shift.shift_type}
                      </Badge>
                      <CardTitle className="text-base">
                        {formatDateTime(shift.check_in_at)}
                      </CardTitle>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-stone-500">
                      <span>{formatDuration(shift.check_in_at, shift.check_out_at)}</span>
                      {!shift.check_out_at && <Badge variant="warning">Active</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Timing details */}
                  <div className="flex flex-wrap gap-4 text-xs text-stone-500">
                    <span>In: {formatDateTime(shift.check_in_at)}</span>
                    <span>Out: {formatDateTime(shift.check_out_at)}</span>
                  </div>

                  {/* Handoff notes */}
                  {shift.notes && (
                    <div className="bg-stone-800 rounded-lg p-3">
                      <p className="text-xs font-medium text-stone-400 mb-1 uppercase tracking-wide">
                        Handoff Notes
                      </p>
                      <p className="text-sm text-stone-200 whitespace-pre-wrap">{shift.notes}</p>
                    </div>
                  )}

                  {/* Snapshot summary */}
                  {snapshotInfo && (
                    <div className="flex items-center gap-4 text-xs text-stone-500">
                      <span>
                        Clipboard snapshot: {snapshotInfo.total} component
                        {snapshotInfo.total !== 1 ? 's' : ''}
                      </span>
                      {snapshotInfo.eightySixed > 0 && (
                        <Badge variant="error" className="text-xxs">
                          {snapshotInfo.eightySixed} 86'd
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
