// Station Daily Clipboard — The core prep tracking view
// Shows an Excel-like grid of all components for this station on a given date.

import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { getStation } from '@/lib/stations/actions'
import { getClipboardForDate, getLastShiftHandoff } from '@/lib/stations/clipboard-actions'
import { listStaffMembers } from '@/lib/staff/actions'
import { ClipboardGrid } from '@/components/stations/clipboard-grid'
import { ShiftCheckIn } from '@/components/stations/shift-check-in'
import { ShiftCheckOut } from '@/components/stations/shift-check-out'
import { ClipboardPrint } from '@/components/stations/clipboard-print'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const metadata: Metadata = { title: 'Daily Clipboard — ChefFlow' }

export default async function ClipboardPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { date?: string; print?: string }
}) {
  await requireChef()

  let station: any
  try {
    station = await getStation(params.id)
  } catch {
    notFound()
  }

  const date = searchParams.date ?? new Date().toISOString().split('T')[0]
  const isPrint = searchParams.print === 'true'

  const entries = await getClipboardForDate(params.id, date)
  const lastHandoff = await getLastShiftHandoff(params.id)
  const staffMembers = await listStaffMembers(true)

  // Print view
  if (isPrint) {
    return <ClipboardPrint stationName={station.name} date={date} entries={entries} />
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/stations" className="text-stone-500 hover:text-stone-300">
              Stations
            </Link>
            <span className="text-stone-600">/</span>
            <Link href={`/stations/${params.id}`} className="text-stone-500 hover:text-stone-300">
              {station.name}
            </Link>
            <span className="text-stone-600">/</span>
            <span className="text-stone-300">Clipboard</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-100 mt-1">
            {station.name} — Daily Clipboard
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/stations/${params.id}/clipboard?date=${date}&print=true`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-lg bg-stone-800 border border-stone-600 px-3 py-2 text-sm text-stone-300 hover:bg-stone-700 transition-colors"
          >
            Print
          </Link>
        </div>
      </div>

      {/* Shift controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shift Check-In</CardTitle>
          </CardHeader>
          <CardContent>
            <ShiftCheckIn
              stationId={params.id}
              staffMembers={staffMembers}
              lastHandoff={lastHandoff}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shift Check-Out</CardTitle>
          </CardHeader>
          <CardContent>
            <ShiftCheckOut stationId={params.id} staffMembers={staffMembers} />
          </CardContent>
        </Card>
      </div>

      {/* The clipboard grid — the core view */}
      <ClipboardGrid
        stationId={params.id}
        stationName={station.name}
        date={date}
        entries={entries}
      />
    </div>
  )
}
