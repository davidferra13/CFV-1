// Staff Schedule Page
// Weekly drag-to-assign grid for managing staff assignments across events.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getCalendarEvents } from '@/lib/scheduling/actions'
import { listStaffMembers, getEventStaffRoster } from '@/lib/staff/actions'
import { DragSchedule } from '@/components/staff/drag-schedule'

export const metadata: Metadata = { title: 'Staff Schedule - ChefFlow' }

function getMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export default async function StaffSchedulePage() {
  await requireChef()

  const today = new Date().toISOString().split('T')[0]
  const weekStart = getMonday(today)
  const weekEnd = addDays(weekStart, 6)

  const [calendarEvents, staff] = await Promise.all([
    getCalendarEvents(weekStart, weekEnd).catch(() => []),
    listStaffMembers(true).catch(() => []),
  ])

  // Build schedule events with staff_assigned lists
  const eventsWithStaff = await Promise.all(
    (calendarEvents as any[]).map(async (event: any) => {
      const roster = await getEventStaffRoster(event.id).catch(() => [])
      return {
        id: event.id,
        name: event.occasion || event.clientName || 'Event',
        date: event.date || event.event_date || event.start?.split('T')[0] || today,
        staffAssigned: (roster as any[]).map((r: any) => r.staff_member_id || r.staffMemberId),
      }
    })
  )

  const staffMembers = (staff as any[]).map((s: any) => ({
    id: s.id,
    name: s.name,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <Link href="/staff" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Staff Roster
          </Link>
          <h1 className="text-3xl font-bold text-stone-100 mt-1">Staff Schedule</h1>
          <p className="text-stone-500 mt-1">
            Assign team members to events for the current week. Click a slot to assign or remove
            staff.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/staff/availability"
            className="inline-flex items-center justify-center px-3 py-2 border border-stone-600 text-stone-300 rounded-lg hover:bg-stone-800 transition-colors font-medium text-sm"
          >
            Availability
          </Link>
          <Link
            href="/staff/labor"
            className="inline-flex items-center justify-center px-3 py-2 border border-stone-600 text-stone-300 rounded-lg hover:bg-stone-800 transition-colors font-medium text-sm"
          >
            Labor Costs
          </Link>
        </div>
      </div>

      {staffMembers.length === 0 ? (
        <div className="rounded-lg border border-stone-700 bg-stone-800 p-8 text-center">
          <p className="text-stone-500 text-sm">
            No active staff members yet. Add team members from the{' '}
            <Link href="/staff" className="text-brand-600 hover:underline">
              Staff Roster
            </Link>{' '}
            to start scheduling.
          </p>
        </div>
      ) : (
        <DragSchedule events={eventsWithStaff} staffMembers={staffMembers} weekStart={weekStart} />
      )}
    </div>
  )
}
