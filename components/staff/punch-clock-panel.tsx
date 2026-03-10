'use client'

// Punch Clock Panel - per-staff clock in/out with live timers,
// today's timesheet, and manager edit/void controls.

import { useState, useEffect, useTransition, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  punchClockIn,
  punchClockOut,
  editPunchEntry,
  deletePunchEntry,
  type PunchEntry,
} from '@/lib/staff/punch-clock-actions'

// -- Types ------------------------------------------------------------------

type StaffMember = {
  id: string
  name: string
  role: string
}

type Props = {
  staffMembers: StaffMember[]
  initialEntries: PunchEntry[]
}

// -- Helpers ----------------------------------------------------------------

function formatElapsed(clockIn: string): string {
  const start = new Date(clockIn).getTime()
  const now = Date.now()
  const diffMs = Math.max(0, now - start)
  const totalMinutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

// -- Component --------------------------------------------------------------

export function PunchClockPanel({ staffMembers, initialEntries }: Props) {
  const [entries, setEntries] = useState<PunchEntry[]>(initialEntries)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [, setTick] = useState(0)

  const activeEntries = entries.filter((e) => e.status === 'clocked_in' && !e.voided)
  const completedEntries = entries.filter(
    (e) => (e.status === 'completed' || e.clockOut) && !e.voided
  )
  const voidedEntries = entries.filter((e) => e.voided)

  const clockedInStaffIds = new Set(activeEntries.map((e) => e.staffMemberId))

  // Tick every 30 seconds to update live timers
  useEffect(() => {
    if (activeEntries.length === 0) return
    const interval = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(interval)
  }, [activeEntries.length])

  const handleClockIn = useCallback(
    (staffId: string) => {
      setError(null)
      const previous = [...entries]

      startTransition(async () => {
        try {
          const entry = await punchClockIn(staffId)
          setEntries((prev) => [entry, ...prev])
        } catch (err: any) {
          setEntries(previous)
          setError(err.message || 'Failed to clock in')
        }
      })
    },
    [entries]
  )

  const handleClockOut = useCallback(
    (staffMemberId: string) => {
      setError(null)
      const previous = [...entries]

      startTransition(async () => {
        try {
          const updated = await punchClockOut(staffMemberId)
          setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
        } catch (err: any) {
          setEntries(previous)
          setError(err.message || 'Failed to clock out')
        }
      })
    },
    [entries]
  )

  const handleVoid = useCallback(
    (entryId: string) => {
      setError(null)
      const previous = [...entries]

      startTransition(async () => {
        try {
          await deletePunchEntry(entryId)
          setEntries((prev) => prev.map((e) => (e.id === entryId ? { ...e, voided: true } : e)))
        } catch (err: any) {
          setEntries(previous)
          setError(err.message || 'Failed to void entry')
        }
      })
    },
    [entries]
  )

  const handleSaveNotes = useCallback(
    (entryId: string) => {
      setError(null)
      const previous = [...entries]

      startTransition(async () => {
        try {
          const updated = await editPunchEntry(entryId, { notes: editNotes })
          setEntries((prev) => prev.map((e) => (e.id === entryId ? updated : e)))
          setEditingId(null)
          setEditNotes('')
        } catch (err: any) {
          setEntries(previous)
          setError(err.message || 'Failed to update entry')
        }
      })
    },
    [entries, editNotes]
  )

  // Compute today's totals from completed, non-voided entries
  const totalWorkedMinutes = completedEntries.reduce(
    (sum, e) => sum + (e.durationMinutes ?? 0) - e.breakMinutes,
    0
  )

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950/50 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-red-500 underline mt-1">
            Dismiss
          </button>
        </div>
      )}

      {/* Clock In/Out Controls */}
      <Card className="border-stone-800 bg-stone-900/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-stone-100">Punch Clock</CardTitle>
            {activeEntries.length > 0 && (
              <Badge variant="success">{activeEntries.length} active</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {staffMembers.map((staff) => {
              const isActive = clockedInStaffIds.has(staff.id)
              const activeEntry = activeEntries.find((e) => e.staffMemberId === staff.id)

              return (
                <div
                  key={staff.id}
                  className={`flex items-center justify-between rounded-lg border p-3 ${
                    isActive
                      ? 'border-emerald-800 bg-emerald-950/30'
                      : 'border-stone-700 bg-stone-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {isActive && (
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                    <div>
                      <div className="text-sm font-medium text-stone-100">{staff.name}</div>
                      <div className="text-xs text-stone-500">
                        {staff.role.replace(/_/g, ' ')}
                        {isActive && activeEntry && (
                          <span className="ml-2 text-emerald-400 font-medium">
                            {formatElapsed(activeEntry.clockIn)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isActive ? (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleClockOut(staff.id)}
                      disabled={isPending}
                    >
                      Clock Out
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleClockIn(staff.id)}
                      disabled={isPending}
                    >
                      Clock In
                    </Button>
                  )}
                </div>
              )
            })}

            {staffMembers.length === 0 && (
              <p className="text-sm text-stone-500 text-center py-4">
                No staff members found. Add staff from the Staff Roster page first.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Today's Timesheet */}
      <Card className="border-stone-800 bg-stone-900/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-stone-100">Today&apos;s Timesheet</CardTitle>
            {completedEntries.length > 0 && (
              <span className="text-sm text-stone-400">
                {formatDuration(totalWorkedMinutes)} total
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {completedEntries.length === 0 && activeEntries.length === 0 ? (
            <p className="text-sm text-stone-500 text-center py-6">
              No time entries for today yet.
            </p>
          ) : (
            <div className="space-y-2">
              {completedEntries.map((entry) => (
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
                    {entry.breakMinutes > 0 && (
                      <span className="ml-2 text-xs text-stone-500">
                        ({entry.breakMinutes}m break)
                      </span>
                    )}
                    {entry.notes && (
                      <span className="ml-2 text-xs text-stone-400 italic">{entry.notes}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {entry.durationMinutes != null && (
                      <Badge variant="default">
                        {formatDuration(Math.max(0, entry.durationMinutes - entry.breakMinutes))}
                      </Badge>
                    )}

                    {/* Edit Notes */}
                    {editingId === entry.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="w-32 rounded border border-stone-600 bg-stone-700 px-2 py-1 text-xs text-stone-100"
                          placeholder="Add note..."
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSaveNotes(entry.id)}
                          disabled={isPending}
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingId(null)
                            setEditNotes('')
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(entry.id)
                          setEditNotes(entry.notes ?? '')
                        }}
                        className="text-xs text-stone-500 hover:text-stone-300"
                      >
                        Edit
                      </button>
                    )}

                    {/* Void */}
                    <button
                      onClick={() => handleVoid(entry.id)}
                      disabled={isPending}
                      className="text-xs text-red-500 hover:text-red-400 disabled:opacity-50"
                    >
                      Void
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Voided Entries (collapsed) */}
          {voidedEntries.length > 0 && (
            <details className="mt-4">
              <summary className="text-xs text-stone-500 cursor-pointer hover:text-stone-400">
                {voidedEntries.length} voided {voidedEntries.length === 1 ? 'entry' : 'entries'}
              </summary>
              <div className="mt-2 space-y-1">
                {voidedEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-lg border border-stone-800 bg-stone-900/30 px-3 py-2 opacity-50"
                  >
                    <span className="text-xs text-stone-500 line-through">
                      {entry.staffName}: {formatTime(entry.clockIn)}
                      {entry.clockOut && ` - ${formatTime(entry.clockOut)}`}
                    </span>
                    <Badge variant="error">Voided</Badge>
                  </div>
                ))}
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
