import Link from 'next/link'
import { format } from 'date-fns'
import { notFound } from 'next/navigation'
import { EventStaffPanel } from '@/components/events/event-staff-panel'
import { StaffBriefingPanel } from '@/components/events/staff-briefing-panel'
import { Card } from '@/components/ui/card'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { eventsOverlapInTime } from '@/lib/staff/time-overlap'
import { checkAssignmentConflict, getEventStaffRoster, listStaffMembers } from '@/lib/staff/actions'

type ConflictSummary = {
  staffName: string
  eventNames: string[]
}

export default async function EventStaffPage({ params }: { params: { id: string } }) {
  await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count, status, serve_time, departure_time,
      client:clients(full_name)
    `
    )
    .eq('id', params.id)
    .single()

  if (!event) notFound()

  const [roster, assignments] = await Promise.all([
    listStaffMembers(true).catch(() => []),
    getEventStaffRoster(params.id).catch(() => []),
  ])

  const assignedStaffIds = (assignments as Array<{ staff_member_id: string }>).map(
    (assignment) => assignment.staff_member_id
  )

  const [taskCountResponse, conflicts] = await Promise.all([
    assignedStaffIds.length > 0
      ? db
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('event_id', params.id)
          .in('assigned_to', assignedStaffIds)
      : Promise.resolve({ count: 0 }),
    Promise.all(
      (assignments as any[]).map(async (assignment) => {
        const overlapping = await checkAssignmentConflict(
          assignment.staff_member_id,
          event.event_date,
          params.id
        )
        const timeConflicts = (overlapping ?? []).filter((row: any) =>
          eventsOverlapInTime(row.events, event.serve_time, event.departure_time)
        )

        if (timeConflicts.length === 0) return null

        return {
          staffName: assignment.staff_members?.name ?? 'Staff member',
          eventNames: timeConflicts.map((row: any) => row.events?.occasion || 'another event'),
        } satisfies ConflictSummary
      })
    ),
  ])

  const activeConflictSummaries = conflicts.filter((value): value is ConflictSummary =>
    Boolean(value)
  )
  const staffTaskCount = Number((taskCountResponse as any)?.count ?? 0)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link href={`/events/${params.id}`} className="text-sm text-stone-500 hover:text-stone-300">
          Back to event
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-stone-100">Team Ready</h1>
        <p className="mt-1 text-sm text-stone-400">
          {((event as any).client?.full_name as string | undefined) ?? 'Client'} |{' '}
          {event.occasion ?? 'Event'} | {format(new Date(event.event_date), 'MMMM d, yyyy')}
        </p>
      </div>

      <Card className="border-sky-800/50 bg-sky-950/30 p-6">
        <h2 className="text-lg font-semibold text-sky-200">Focused staffing route</h2>
        <p className="mt-2 text-sm text-sky-300">
          This route owns assignment, conflict cleanup, staff handoff tasks, and the event-specific
          briefing. It keeps those execution moves out of the broader ops tab.
        </p>
      </Card>

      {activeConflictSummaries.length > 0 ? (
        <Card className="border-rose-800/60 bg-rose-950/30 p-6">
          <h2 className="text-lg font-semibold text-rose-200">Staff conflicts need attention</h2>
          <div className="mt-3 space-y-2 text-sm text-rose-300">
            {activeConflictSummaries.map((conflict) => (
              <p key={`${conflict.staffName}-${conflict.eventNames.join('|')}`}>
                {conflict.staffName} overlaps with {conflict.eventNames.join(', ')}.
              </p>
            ))}
          </div>
        </Card>
      ) : null}

      {!['draft', 'cancelled'].includes(event.status) ? (
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-stone-100">Assignments</h2>
          <EventStaffPanel
            eventId={params.id}
            roster={roster as any}
            assignments={assignments as any}
          />
        </Card>
      ) : (
        <Card className="p-6">
          <p className="text-sm text-stone-400">
            Staffing starts once the event moves out of draft or cancellation state.
          </p>
        </Card>
      )}

      {(assignments as any[]).length > 0 && staffTaskCount === 0 ? (
        <Card className="border-brand-800/50 bg-brand-950/30 p-6">
          <h2 className="text-lg font-semibold text-brand-200">Add the first staff task</h2>
          <p className="mt-2 text-sm text-brand-300">
            The roster is assigned, but there are no event-linked staff tasks yet. Use the Tasks
            expander in the assignment panel above to add the first handoff task.
          </p>
        </Card>
      ) : null}

      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-stone-100">Staff Briefing</h2>
        <StaffBriefingPanel eventId={params.id} hasStaff={(assignments as any[]).length > 0} />
      </Card>
    </div>
  )
}
