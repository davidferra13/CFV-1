// Daily Task Board Page
// Shows tasks for a given date grouped by assigned staff, with inline completion and creation.
// Phase 1: Also shows carried-over tasks from previous days.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { requireFocusAccess } from '@/lib/billing/require-focus-access'
import { getTasksByDate, getActiveStaff, getActiveStations } from '@/lib/tasks/actions'
import { getCarriedOverTasks } from '@/lib/tasks/carry-forward'
import { generateRecurringTasks } from '@/lib/tasks/recurring-engine'
import { Button } from '@/components/ui/button'
import { TaskPageClient } from '@/components/tasks/task-page-client'

export const metadata: Metadata = { title: 'Tasks' }

export default async function TasksPage({ searchParams }: { searchParams: { date?: string } }) {
  const user = await requireChef()
  await requireFocusAccess()

  const today = new Date().toISOString().split('T')[0]
  const selectedDate = searchParams.date ?? today

  // Generate any recurring tasks for this date (idempotent)
  try {
    await generateRecurringTasks(selectedDate)
  } catch (err) {
    // Non-blocking - recurring generation failure should not break the page
    console.error('[TasksPage] Recurring generation failed:', err)
  }

  // Fetch tasks, carried-over tasks, and dropdown data in parallel
  const [taskData, carriedOver, staff, stations] = await Promise.all([
    getTasksByDate(selectedDate),
    selectedDate === today ? getCarriedOverTasks(today) : Promise.resolve([]),
    getActiveStaff(),
    getActiveStations(),
  ])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Tasks</h1>
          <p className="mt-1 text-sm text-stone-500">Manage daily tasks for you and your team.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/tasks/templates">
            <Button variant="secondary" size="sm">
              Templates
            </Button>
          </Link>
        </div>
      </div>

      <TaskPageClient
        grouped={taskData.grouped}
        unassigned={taskData.unassigned}
        carriedOver={carriedOver}
        staff={staff}
        stations={stations}
        selectedDate={selectedDate}
        today={today}
      />
    </div>
  )
}
