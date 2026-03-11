'use client'

import { useMemo, useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  clockInFromTimeTracker,
  clockOutFromTimeTracker,
  type TimeTrackerData,
} from '@/lib/staffing/actions'

function formatMinutes(minutes: number | null) {
  if (minutes == null) return '--'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
}

type Props = {
  initialData: TimeTrackerData
  lockedStaffMemberId?: string
}

export function TimeTracker({ initialData, lockedStaffMemberId }: Props) {
  const [data, setData] = useState(initialData)
  const [selectedStaff, setSelectedStaff] = useState(lockedStaffMemberId ?? '')
  const [selectedEvent, setSelectedEvent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const activeEntries = useMemo(
    () => data.entries.filter((entry) => entry.status === 'clocked_in' && !entry.clockOutAt),
    [data.entries]
  )

  function handleClockIn() {
    const staffToClock = lockedStaffMemberId ?? selectedStaff
    if (!staffToClock) return
    setError(null)

    startTransition(async () => {
      try {
        const created = await clockInFromTimeTracker({
          staffMemberId: staffToClock,
          eventId: selectedEvent || null,
        })
        const staff = data.staff.find((member) => member.id === staffToClock)
        const event = data.events.find((item) => item.id === selectedEvent)

        setData((prev) => ({
          ...prev,
          entries: [
            {
              id: created.id,
              staffMemberId: created.staffMemberId,
              staffName: staff?.name ?? 'Staff',
              eventId: created.eventId,
              eventName: event?.name ?? null,
              clockInAt: created.clockInAt,
              clockOutAt: created.clockOutAt,
              totalMinutes: created.totalMinutes,
              status: created.status,
            },
            ...prev.entries,
          ],
        }))
        setSelectedEvent('')
      } catch (err: any) {
        setError(err?.message || 'Clock in failed')
      }
    })
  }

  function handleClockOut(entryId: string) {
    setError(null)
    startTransition(async () => {
      try {
        const updated = await clockOutFromTimeTracker(entryId)
        setData((prev) => ({
          ...prev,
          entries: prev.entries.map((entry) =>
            entry.id === entryId
              ? {
                  ...entry,
                  clockOutAt: updated.clockOutAt,
                  totalMinutes: updated.totalMinutes,
                  status: updated.status,
                }
              : entry
          ),
        }))
      } catch (err: any) {
        setError(err?.message || 'Clock out failed')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>TimeTracker</CardTitle>
        <p className="text-sm text-stone-500">
          Staff clock in/out linked to events for accurate labor capture.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="grid gap-2 md:grid-cols-[1fr_1fr_120px]">
          {lockedStaffMemberId ? (
            <div className="flex items-center rounded-md border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-200">
              {data.staff.find((member) => member.id === lockedStaffMemberId)?.name || 'My Shift'}
            </div>
          ) : (
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="rounded-md border border-stone-600 bg-stone-900 px-2 py-2 text-sm"
            >
              <option value="">Staff member...</option>
              {data.staff.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="rounded-md border border-stone-600 bg-stone-900 px-2 py-2 text-sm"
          >
            <option value="">No event (general shift)</option>
            {data.events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name} ({new Date(`${event.date}T00:00:00`).toLocaleDateString()})
              </option>
            ))}
          </select>

          <Button
            variant="primary"
            onClick={handleClockIn}
            disabled={isPending || !(lockedStaffMemberId ?? selectedStaff)}
          >
            Clock In
          </Button>
        </div>

        {activeEntries.length > 0 && (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-200">
            {activeEntries.length} active clocked-in{' '}
            {activeEntries.length === 1 ? 'entry' : 'entries'}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700 text-stone-500">
                <th className="px-2 py-2 text-left font-medium">Staff</th>
                <th className="px-2 py-2 text-left font-medium">Event</th>
                <th className="px-2 py-2 text-left font-medium">Clock In</th>
                <th className="px-2 py-2 text-left font-medium">Clock Out</th>
                <th className="px-2 py-2 text-right font-medium">Duration</th>
                <th className="px-2 py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-6 text-center text-stone-500">
                    No time log entries in this period.
                  </td>
                </tr>
              ) : (
                data.entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-stone-800">
                    <td className="px-2 py-2 text-stone-100">{entry.staffName}</td>
                    <td className="px-2 py-2 text-stone-400">{entry.eventName || '--'}</td>
                    <td className="px-2 py-2 text-stone-400">
                      {new Date(entry.clockInAt).toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-stone-400">
                      {entry.clockOutAt ? new Date(entry.clockOutAt).toLocaleString() : 'Active'}
                    </td>
                    <td className="px-2 py-2 text-right text-stone-300">
                      {formatMinutes(entry.totalMinutes)}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {entry.status === 'clocked_in' && !entry.clockOutAt ? (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleClockOut(entry.id)}
                          disabled={isPending}
                        >
                          Clock Out
                        </Button>
                      ) : (
                        <span className="text-xs text-stone-500">Completed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
