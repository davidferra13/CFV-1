// Staff Station View - Station clipboard for the staff member
// Shows the station's clipboard grid, allows check-in/check-out,
// and lets staff update on_hand and waste fields.

import type { Metadata } from 'next'
import { requireStaff } from '@/lib/auth/get-user'
import { getMyStations, getStationClipboard } from '@/lib/staff/staff-portal-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { StaffClipboardView } from '@/components/staff/staff-clipboard-view'
import { StaffShiftControls } from '@/components/staff/staff-shift-controls'

export const metadata: Metadata = { title: 'Station' }

type Props = {
  searchParams: { id?: string; date?: string }
}

export default async function StaffStationPage({ searchParams }: Props) {
  const user = await requireStaff()
  const stations = await getMyStations()

  const today = new Date().toISOString().split('T')[0]
  const selectedDate = searchParams.date ?? today
  const selectedStationId = searchParams.id ?? stations[0]?.id

  // If no station selected and no stations exist
  if (!selectedStationId || stations.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-stone-100">Station Clipboard</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-400">
              No stations available. Your chef has not set up stations yet.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Load clipboard data for the selected station
  let clipboardData: Awaited<ReturnType<typeof getStationClipboard>> | null = null
  try {
    clipboardData = await getStationClipboard(selectedStationId, selectedDate)
  } catch (err) {
    console.error('[StaffStationPage] Error loading clipboard:', err)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-stone-100">Station Clipboard</h1>

        {/* Station selector */}
        {stations.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {stations.map((station) => (
              <Link
                key={station.id}
                href={`/staff-station?id=${station.id}&date=${selectedDate}`}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  station.id === selectedStationId
                    ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                    : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-500'
                }`}
              >
                {station.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Shift check-in/out controls */}
      <StaffShiftControls stationId={selectedStationId} />

      {/* Clipboard grid */}
      {clipboardData ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {clipboardData.station.name} &mdash; {selectedDate}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Link
                  href={`/staff-station?id=${selectedStationId}&date=${prevDate(selectedDate)}`}
                  className="px-2 py-1 text-sm text-stone-400 hover:text-stone-200 rounded border border-stone-700 hover:border-stone-500"
                >
                  Prev
                </Link>
                <Link
                  href={`/staff-station?id=${selectedStationId}&date=${nextDate(selectedDate)}`}
                  className="px-2 py-1 text-sm text-stone-400 hover:text-stone-200 rounded border border-stone-700 hover:border-stone-500"
                >
                  Next
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {clipboardData.entries.length === 0 ? (
              <div className="p-8 text-center text-sm text-stone-500">
                No clipboard entries for this station on {selectedDate}.
              </div>
            ) : (
              <StaffClipboardView
                stationId={selectedStationId}
                stationName={clipboardData.station.name}
                date={selectedDate}
                entries={clipboardData.entries}
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-400">Unable to load clipboard data.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function prevDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

function nextDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}
