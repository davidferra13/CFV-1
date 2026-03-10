'use client'

import { useState, useTransition, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  startBreak,
  endBreak,
  getCurrentShift,
  type ShiftEntry,
} from '@/lib/staff/time-tracking-actions'
import { clockInFromTimeTracker, clockOutFromTimeTracker } from '@/lib/staffing/actions'

type StaffMember = {
  id: string
  name: string
  hourlyRateCents: number
}

type Props = {
  staffMembers: StaffMember[]
  initialShifts: Map<string, ShiftEntry | null>
  todayEntries: ShiftEntry[]
}

function formatDuration(startIso: string): string {
  const start = new Date(startIso)
  const now = new Date()
  const diffMs = now.getTime() - start.getTime()
  const hours = Math.floor(diffMs / 3600000)
  const mins = Math.floor((diffMs % 3600000) / 60000)
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function TimeClock({ staffMembers, initialShifts, todayEntries }: Props) {
  const [selectedStaff, setSelectedStaff] = useState(staffMembers[0]?.id ?? '')
  const [shifts, setShifts] = useState(initialShifts)
  const [entries, setEntries] = useState(todayEntries)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [, setTick] = useState(0)

  // Update running timer every 30s
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(interval)
  }, [])

  const currentShift = shifts.get(selectedStaff) ?? null
  const isOnBreak = currentShift?.breakStartAt != null

  function handleClockIn() {
    if (!selectedStaff) return
    setError(null)
    startTransition(async () => {
      try {
        await clockInFromTimeTracker({ staffMemberId: selectedStaff })
        const shift = await getCurrentShift(selectedStaff)
        setShifts((prev) => {
          const next = new Map(prev)
          next.set(selectedStaff, shift)
          return next
        })
      } catch (err: any) {
        setError(err.message || 'Failed to clock in')
      }
    })
  }

  function handleClockOut() {
    if (!currentShift) return
    setError(null)
    startTransition(async () => {
      try {
        await clockOutFromTimeTracker(currentShift.id)
        setShifts((prev) => {
          const next = new Map(prev)
          next.set(selectedStaff, null)
          return next
        })
        // Refresh entries
        const shift = await getCurrentShift(selectedStaff)
        setShifts((prev) => {
          const next = new Map(prev)
          next.set(selectedStaff, shift)
          return next
        })
      } catch (err: any) {
        setError(err.message || 'Failed to clock out')
      }
    })
  }

  function handleStartBreak() {
    if (!selectedStaff) return
    setError(null)
    startTransition(async () => {
      try {
        await startBreak(selectedStaff)
        const shift = await getCurrentShift(selectedStaff)
        setShifts((prev) => {
          const next = new Map(prev)
          next.set(selectedStaff, shift)
          return next
        })
      } catch (err: any) {
        setError(err.message || 'Failed to start break')
      }
    })
  }

  function handleEndBreak() {
    if (!selectedStaff) return
    setError(null)
    startTransition(async () => {
      try {
        await endBreak(selectedStaff)
        const shift = await getCurrentShift(selectedStaff)
        setShifts((prev) => {
          const next = new Map(prev)
          next.set(selectedStaff, shift)
          return next
        })
      } catch (err: any) {
        setError(err.message || 'Failed to end break')
      }
    })
  }

  // Compute today's totals
  const todayTotalMinutes = entries.reduce((sum, e) => sum + (e.totalMinutes ?? 0), 0)
  const todayTotalHours = Math.round((todayTotalMinutes / 60) * 100) / 100

  return (
    <div className="space-y-6">
      {/* Staff Selector */}
      <Card className="border-stone-800 bg-stone-900/50">
        <CardHeader>
          <CardTitle className="text-stone-100">Punch Clock</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-400 mb-1">Staff Member</label>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full rounded-md border border-stone-700 bg-stone-800 px-3 py-2 text-stone-100"
            >
              {staffMembers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Current Status */}
          <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-4 text-center">
            {currentShift ? (
              <>
                <p className="text-stone-400 text-sm">
                  {isOnBreak ? 'On Break' : 'Clocked In'} since
                </p>
                <p className="text-2xl font-bold text-stone-100 mt-1">
                  {formatTime(currentShift.clockIn)}
                </p>
                <p className="text-stone-500 text-sm mt-1">
                  Running: {formatDuration(currentShift.clockIn)}
                  {currentShift.breakMinutes > 0 && ` (${currentShift.breakMinutes}m break)`}
                </p>
                {isOnBreak && (
                  <p className="text-amber-400 text-sm mt-1 font-medium">
                    Break started {formatDuration(currentShift.breakStartAt!)} ago
                  </p>
                )}
              </>
            ) : (
              <p className="text-stone-500">Not clocked in</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!currentShift ? (
              <Button
                onClick={handleClockIn}
                disabled={isPending || !selectedStaff}
                variant="primary"
                className="flex-1"
              >
                {isPending ? 'Processing...' : 'Clock In'}
              </Button>
            ) : (
              <>
                {!isOnBreak ? (
                  <Button
                    onClick={handleStartBreak}
                    disabled={isPending}
                    variant="secondary"
                    className="flex-1"
                  >
                    Start Break
                  </Button>
                ) : (
                  <Button
                    onClick={handleEndBreak}
                    disabled={isPending}
                    variant="secondary"
                    className="flex-1"
                  >
                    End Break
                  </Button>
                )}
                <Button
                  onClick={handleClockOut}
                  disabled={isPending || isOnBreak}
                  variant="danger"
                  className="flex-1"
                >
                  Clock Out
                </Button>
              </>
            )}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </CardContent>
      </Card>

      {/* Today's Entries */}
      <Card className="border-stone-800 bg-stone-900/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-stone-100">Today's Time Entries</CardTitle>
            <span className="text-sm text-stone-400">{todayTotalHours}h total</span>
          </div>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className="text-stone-500 text-sm">No entries today.</p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border border-stone-700 bg-stone-800/50 px-3 py-2"
                >
                  <div>
                    <span className="text-sm font-medium text-stone-200">{entry.staffName}</span>
                    <span className="ml-2 text-xs text-stone-500">
                      {formatTime(entry.clockIn)}
                      {entry.clockOut && ` - ${formatTime(entry.clockOut)}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {entry.breakMinutes > 0 && (
                      <span className="text-xs text-stone-500">{entry.breakMinutes}m break</span>
                    )}
                    <span className="text-sm font-medium text-stone-300">
                      {entry.totalMinutes != null
                        ? `${Math.round((entry.totalMinutes / 60) * 100) / 100}h`
                        : 'Active'}
                    </span>
                    {entry.totalPayCents != null && (
                      <span className="text-xs text-stone-500">
                        {formatCents(entry.totalPayCents)}
                      </span>
                    )}
                    {entry.approved && (
                      <span className="text-xs text-green-500 bg-green-950/50 px-1.5 py-0.5 rounded">
                        Approved
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
