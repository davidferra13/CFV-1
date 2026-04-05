'use client'

import { useMemo, useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  scheduleStaffMemberWithConflictCheck,
  type StaffSchedulerData,
} from '@/lib/staff/staffing-actions'

function formatCurrency(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

type Props = {
  initialData: StaffSchedulerData
}

export function StaffScheduler({ initialData }: Props) {
  const [data, setData] = useState(initialData)
  const [selectedStaffByEvent, setSelectedStaffByEvent] = useState<Record<string, string>>({})
  const [hoursByEvent, setHoursByEvent] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const staffMap = useMemo(() => {
    return new Map(data.staff.map((s) => [s.id, s]))
  }, [data.staff])

  const sortedEvents = useMemo(() => {
    return [...data.events].sort((a, b) => a.date.localeCompare(b.date))
  }, [data.events])

  function handleAssign(eventId: string) {
    const staffMemberId = selectedStaffByEvent[eventId]
    if (!staffMemberId) return
    const scheduledHours = parseFloat(hoursByEvent[eventId] || '0')

    setError(null)
    startTransition(async () => {
      try {
        await scheduleStaffMemberWithConflictCheck({
          eventId,
          staffMemberId,
          scheduledHours:
            Number.isFinite(scheduledHours) && scheduledHours > 0 ? scheduledHours : undefined,
        })

        const staff = staffMap.get(staffMemberId)
        setData((prev) => ({
          ...prev,
          events: prev.events.map((event) =>
            event.id !== eventId
              ? event
              : {
                  ...event,
                  assignments: [
                    ...event.assignments,
                    {
                      assignmentId: `local-${Date.now()}`,
                      staffMemberId,
                      staffName: staff?.name ?? 'Staff',
                      role: staff?.role ?? 'other',
                      status: 'scheduled',
                      scheduledHours:
                        Number.isFinite(scheduledHours) && scheduledHours > 0
                          ? scheduledHours
                          : null,
                      actualHours: null,
                      effectiveRateCents: staff?.hourlyRateCents ?? 0,
                    },
                  ],
                }
          ),
        }))
        setSelectedStaffByEvent((prev) => ({ ...prev, [eventId]: '' }))
        setHoursByEvent((prev) => ({ ...prev, [eventId]: '' }))
      } catch (err: any) {
        setError(err?.message || 'Failed to assign staff member')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>StaffScheduler</CardTitle>
        <p className="text-sm text-stone-500">
          Calendar assignments with conflict prevention and availability awareness.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}

        {sortedEvents.length === 0 ? (
          <p className="text-sm text-stone-500">No events in the selected range.</p>
        ) : (
          sortedEvents.map((event) => {
            const assignedIds = new Set(event.assignments.map((a) => a.staffMemberId))
            const availableOptions = data.staff.filter((s) => !assignedIds.has(s.id))

            return (
              <div key={event.id} className="rounded-lg border border-stone-700 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-stone-100">{event.name}</h3>
                    <p className="text-xs text-stone-500">
                      {new Date(`${event.date}T00:00:00`).toLocaleDateString()} · {event.status}
                    </p>
                  </div>
                  <Badge variant="info">{event.assignments.length} assigned</Badge>
                </div>

                {event.assignments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {event.assignments.map((assignment) => (
                      <div
                        key={assignment.assignmentId}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-stone-300">
                          {assignment.staffName} · {assignment.role.replace(/_/g, ' ')}
                        </span>
                        <span className="text-stone-500">
                          {assignment.scheduledHours ?? assignment.actualHours ?? 0}h ·{' '}
                          {formatCurrency(assignment.effectiveRateCents)}/hr
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_120px_120px]">
                  <select
                    value={selectedStaffByEvent[event.id] ?? ''}
                    onChange={(e) =>
                      setSelectedStaffByEvent((prev) => ({ ...prev, [event.id]: e.target.value }))
                    }
                    className="rounded-md border border-stone-600 bg-stone-900 px-2 py-2 text-sm"
                  >
                    <option value="">Assign staff member...</option>
                    {availableOptions.map((staff) => {
                      const explicitlyAvailable = staff.availableDates.includes(event.date)
                      return (
                        <option key={staff.id} value={staff.id}>
                          {staff.name} ({staff.role.replace(/_/g, ' ')})
                          {explicitlyAvailable ? '' : ' · availability not set'}
                        </option>
                      )
                    })}
                  </select>

                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    placeholder="Hours"
                    value={hoursByEvent[event.id] ?? ''}
                    onChange={(e) =>
                      setHoursByEvent((prev) => ({ ...prev, [event.id]: e.target.value }))
                    }
                    className="rounded-md border border-stone-600 bg-stone-900 px-2 py-2 text-sm"
                  />

                  <Button
                    variant="primary"
                    onClick={() => handleAssign(event.id)}
                    disabled={isPending || !selectedStaffByEvent[event.id]}
                  >
                    Assign
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
