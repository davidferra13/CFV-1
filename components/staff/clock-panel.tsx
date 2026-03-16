'use client'

// Clock Panel - clock in/out interface for event day staff.
// Shows active timers with elapsed time, allows clocking in/out of staff members.

import { useState, useEffect, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, MapPin, Play, Square, UserPlus, X } from '@/components/ui/icons'
import { clockIn, clockOut } from '@/lib/staff/clock-actions'

// ─── Types ────────────────────────────────────────────────────────────────────

type ClockEntry = {
  id: string
  staffMemberId: string
  staffName?: string
  clockInAt: string
  clockOutAt?: string | null
  totalMinutes?: number | null
  status: string
}

type StaffOption = {
  id: string
  name: string
}

interface ClockPanelProps {
  entries: ClockEntry[]
  staffMembers: StaffOption[]
  eventId?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatElapsed(clockInAt: string): string {
  const start = new Date(clockInAt).getTime()
  const now = Date.now()
  const diffMs = Math.max(0, now - start)
  const totalMinutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
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
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ClockPanel({ entries: initialEntries, staffMembers, eventId }: ClockPanelProps) {
  const [entries, setEntries] = useState<ClockEntry[]>(initialEntries)
  const [showStaffPicker, setShowStaffPicker] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [, setTick] = useState(0)

  // Active entries (clocked in but not yet clocked out)
  const activeEntries = entries.filter((e) => e.status === 'clocked_in' && !e.clockOutAt)
  const completedEntries = entries.filter((e) => e.status === 'completed' || e.clockOutAt)

  // Set of staff IDs currently clocked in (prevent double clock-in)
  const clockedInStaffIds = new Set(activeEntries.map((e) => e.staffMemberId))

  // Available staff for clock-in (not already clocked in)
  const availableStaff = staffMembers.filter((s) => !clockedInStaffIds.has(s.id))

  // Build name lookup from staffMembers prop
  const staffNameMap = new Map(staffMembers.map((s) => [s.id, s.name]))

  function getStaffName(entry: ClockEntry): string {
    return entry.staffName || staffNameMap.get(entry.staffMemberId) || 'Unknown'
  }

  // Tick every 30 seconds to update elapsed times
  useEffect(() => {
    if (activeEntries.length === 0) return
    const interval = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(interval)
  }, [activeEntries.length])

  function handleClockIn(staffId: string) {
    setShowStaffPicker(false)

    startTransition(async () => {
      try {
        const entry = await clockIn(staffId, eventId)
        setEntries((prev) => [
          {
            id: entry.id,
            staffMemberId: entry.staffMemberId,
            staffName: staffNameMap.get(entry.staffMemberId),
            clockInAt: entry.clockInAt,
            clockOutAt: entry.clockOutAt,
            totalMinutes: entry.totalMinutes,
            status: entry.status,
          },
          ...prev,
        ])
      } catch (err) {
        console.error('Clock in failed:', err)
      }
    })
  }

  function handleClockOut(entryId: string) {
    startTransition(async () => {
      try {
        const updated = await clockOut(entryId)
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entryId
              ? {
                  ...e,
                  clockOutAt: updated.clockOutAt,
                  totalMinutes: updated.totalMinutes,
                  status: updated.status,
                }
              : e
          )
        )
      } catch (err) {
        console.error('Clock out failed:', err)
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-stone-500" />
            <CardTitle>Staff Clock</CardTitle>
            {activeEntries.length > 0 && (
              <Badge variant="success">{activeEntries.length} Active</Badge>
            )}
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowStaffPicker(!showStaffPicker)}
            disabled={isPending || availableStaff.length === 0}
          >
            <UserPlus className="h-4 w-4" />
            Clock In
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Staff Picker Dropdown */}
        {showStaffPicker && (
          <div className="mb-4 p-3 bg-stone-800 rounded-lg border border-stone-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-stone-300">Select staff member</span>
              <button
                onClick={() => setShowStaffPicker(false)}
                className="text-stone-300 hover:text-stone-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {availableStaff.length === 0 ? (
              <p className="text-sm text-stone-500">All staff members are currently clocked in.</p>
            ) : (
              <div className="space-y-1">
                {availableStaff.map((staff) => (
                  <button
                    key={staff.id}
                    onClick={() => handleClockIn(staff.id)}
                    disabled={isPending}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-stone-800 hover:shadow-sm transition-colors text-stone-300 disabled:opacity-50"
                  >
                    {staff.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Active Timers */}
        {activeEntries.length > 0 && (
          <div className="space-y-2 mb-4">
            <h4 className="text-xs font-medium text-stone-500 uppercase tracking-wider">Active</h4>
            {activeEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 bg-emerald-950 border border-emerald-200 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <div className="text-sm font-medium text-stone-100">{getStaffName(entry)}</div>
                    <div className="text-xs text-stone-500">
                      In at {formatTime(entry.clockInAt)}
                      {' \u2022 '}
                      <span className="font-medium text-emerald-700">
                        {formatElapsed(entry.clockInAt)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* GPS indicator */}
                  {'gpsLat' in entry && (entry as any).gpsLat != null && (
                    <span title="GPS location recorded">
                      <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                    </span>
                  )}
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleClockOut(entry.id)}
                    disabled={isPending}
                  >
                    <Square className="h-3.5 w-3.5" />
                    Out
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Completed Entries */}
        {completedEntries.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-stone-500 uppercase tracking-wider">
              Completed
            </h4>
            {completedEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 bg-stone-800 border border-stone-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-stone-400" />
                  <div>
                    <div className="text-sm font-medium text-stone-300">{getStaffName(entry)}</div>
                    <div className="text-xs text-stone-500">
                      {formatTime(entry.clockInAt)}
                      {entry.clockOutAt && ` \u2013 ${formatTime(entry.clockOutAt)}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {'gpsLat' in entry && (entry as any).gpsLat != null && (
                    <span title="GPS location recorded">
                      <MapPin className="h-3.5 w-3.5 text-stone-300" />
                    </span>
                  )}
                  {entry.totalMinutes != null && (
                    <Badge variant="default">{formatDuration(entry.totalMinutes)}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {entries.length === 0 && !showStaffPicker && (
          <div className="text-center py-8">
            <Clock className="h-8 w-8 text-stone-300 mx-auto mb-2" />
            <p className="text-sm text-stone-500">No clock entries yet.</p>
            <p className="text-xs text-stone-300 mt-1">
              Clock in staff members to track their hours.
            </p>
          </div>
        )}

        {/* Summary */}
        {completedEntries.length > 0 && (
          <div className="mt-4 pt-4 border-t border-stone-800 flex items-center justify-between">
            <span className="text-xs text-stone-500">
              {completedEntries.length} completed shift{completedEntries.length !== 1 ? 's' : ''}
            </span>
            <span className="text-sm font-medium text-stone-300">
              Total:{' '}
              {formatDuration(completedEntries.reduce((sum, e) => sum + (e.totalMinutes ?? 0), 0))}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
