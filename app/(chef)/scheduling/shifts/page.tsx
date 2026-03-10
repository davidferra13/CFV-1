import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import {
  getWeeklySchedule,
  getShiftTemplates,
  getAllAvailability,
  getLaborCostByDay,
  getActiveStaff,
} from '@/lib/scheduling/shift-actions'
import { WeeklySchedule } from '@/components/scheduling/weekly-schedule'

export const metadata: Metadata = { title: 'Shift Schedule - ChefFlow' }

function getMonday(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().slice(0, 10)
}

type Props = {
  searchParams?: { week?: string }
}

export default async function ShiftsPage({ searchParams }: Props) {
  await requireChef()

  const weekStart = getMonday(searchParams?.week)

  const [schedule, templates, availability, laborByDay, staffMembers] = await Promise.all([
    getWeeklySchedule(weekStart),
    getShiftTemplates(),
    getAllAvailability(),
    getLaborCostByDay(weekStart),
    getActiveStaff(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-4">
          <Link href="/scheduling" className="text-sm text-stone-500 hover:text-stone-300">
            &larr; Scheduling
          </Link>
          <Link
            href="/scheduling/availability"
            className="text-sm text-stone-500 hover:text-stone-300"
          >
            Availability
          </Link>
          <Link href="/scheduling/swaps" className="text-sm text-stone-500 hover:text-stone-300">
            Swap Board
          </Link>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-stone-100">Staff Shift Schedule</h1>
        <p className="mt-1 text-stone-400">
          Build weekly schedules for your team. Assign shifts, set roles, and track labor costs.
        </p>
      </div>

      <WeeklySchedule
        initialShifts={schedule.shifts}
        staffMembers={staffMembers}
        templates={templates}
        availability={availability}
        laborByDay={laborByDay}
        initialWeekStart={weekStart}
      />
    </div>
  )
}
