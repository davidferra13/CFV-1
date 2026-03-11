// Staff Schedule View — Shows upcoming event assignments for this staff member
// Read-only view with event name, date, times, role, and hours.

import type { Metadata } from 'next'
import { requireStaff } from '@/lib/auth/get-user'
import { getMyAssignments } from '@/lib/staff/staff-portal-actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = { title: 'Schedule' }

export default async function StaffSchedulePage() {
  const user = await requireStaff()
  const assignments = await getMyAssignments()

  // Separate past and upcoming
  const today = new Date().toISOString().split('T')[0]
  const upcoming = assignments.filter((a) => {
    const eventDate = a.event?.event_date
    return eventDate && eventDate >= today
  })
  const past = assignments.filter((a) => {
    const eventDate = a.event?.event_date
    return eventDate && eventDate < today
  })

  return (
    <div className="space-y-6">
      <div data-tour="staff-schedule">
        <h1 className="text-2xl font-bold text-stone-100">My Schedule</h1>
      </div>

      {/* Upcoming assignments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length === 0 ? (
            <p className="text-sm text-stone-500">No upcoming assignments.</p>
          ) : (
            <div className="space-y-0">
              {upcoming.map((assignment) => (
                <AssignmentRow key={assignment.id} assignment={assignment} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past assignments (collapsed by default) */}
      {past.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-stone-400">
              Past Assignments ({past.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {past.slice(0, 10).map((assignment) => (
                <AssignmentRow key={assignment.id} assignment={assignment} isPast />
              ))}
              {past.length > 10 && (
                <p className="text-sm text-stone-500 pt-2">
                  + {past.length - 10} more past assignments
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {assignments.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-400">No event assignments yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function AssignmentRow({ assignment, isPast = false }: { assignment: any; isPast?: boolean }) {
  const event = assignment.event
  const eventDate = event?.event_date
    ? new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Date TBD'

  const statusVariants: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    scheduled: 'info',
    confirmed: 'success',
    completed: 'default',
    no_show: 'error',
  }

  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-stone-800 last:border-0 gap-2 ${
        isPast ? 'opacity-60' : ''
      }`}
    >
      <div className="flex-1">
        <div className={`text-sm font-medium ${isPast ? 'text-stone-400' : 'text-stone-200'}`}>
          {event?.occasion ?? 'Unnamed Event'}
        </div>
        <div className="text-xs text-stone-500 flex flex-wrap items-center gap-2 mt-0.5">
          <span>{eventDate}</span>
          {event?.arrival_time && <span>Arrival {event.arrival_time}</span>}
          {event?.serve_time && <span>Serve {event.serve_time}</span>}
          {assignment.role_override && (
            <span className="capitalize">{assignment.role_override.replace('_', ' ')}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {assignment.scheduled_hours && (
          <span className="text-xs text-stone-400">{assignment.scheduled_hours}h scheduled</span>
        )}
        {assignment.actual_hours && (
          <span className="text-xs text-emerald-400">{assignment.actual_hours}h actual</span>
        )}
        <Badge variant={statusVariants[assignment.status] ?? 'default'}>
          {assignment.status.replace('_', ' ')}
        </Badge>
      </div>
    </div>
  )
}
