// Daily Task Board Page
// Shows tasks for a given date grouped by assigned staff, with inline completion and creation.
// Supports list view (default) and kanban board view via ?view=kanban.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { requireFocusAccess } from '@/lib/billing/require-focus-access'
import {
  getTasksByDate,
  getTasksByStatus,
  getActiveStaff,
  getActiveStations,
} from '@/lib/tasks/actions'
import { getCarriedOverTasks } from '@/lib/tasks/carry-forward'
import { generateRecurringTasks } from '@/lib/tasks/recurring-engine'
import {
  readTaskCreateDraftFromSearchParams,
  readTaskCreateErrorFromSearchParams,
} from '@/lib/tasks/create-form-state'
import { Button } from '@/components/ui/button'
import { TaskCreatePanel } from '@/components/tasks/task-create-panel'
import { TaskPageClient } from '@/components/tasks/task-page-client'
import { TaskKanbanView } from '@/components/tasks/task-kanban-view'

export const metadata: Metadata = { title: 'Tasks' }

function getSingleSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

type TasksPageSearchParams = Record<string, string | string[] | undefined>

export default async function TasksPage({ searchParams }: { searchParams: TasksPageSearchParams }) {
  await requireChef()
  await requireFocusAccess()

  const _tkp = new Date()
  const today = `${_tkp.getFullYear()}-${String(_tkp.getMonth() + 1).padStart(2, '0')}-${String(_tkp.getDate()).padStart(2, '0')}`
  const selectedDate = getSingleSearchParam(searchParams.date) ?? today
  const viewMode = getSingleSearchParam(searchParams.view) ?? 'list'
  const isKanban = viewMode === 'kanban'
  const showCreate = getSingleSearchParam(searchParams.new) === '1'
  const createDraft = showCreate
    ? readTaskCreateDraftFromSearchParams(searchParams, selectedDate)
    : null
  const createError = showCreate ? readTaskCreateErrorFromSearchParams(searchParams) : null

  // Generate any recurring tasks for this date (idempotent)
  try {
    await generateRecurringTasks(selectedDate)
  } catch (err) {
    // Non-blocking: recurring generation failure should not break the page
    console.error('[TasksPage] Recurring generation failed:', err)
  }

  // Fetch shared data (staff, stations) always needed
  const [staff, stations] = await Promise.all([getActiveStaff(), getActiveStations()])

  // Fetch view-specific data
  const listData = !isKanban
    ? await Promise.all([
        getTasksByDate(selectedDate),
        selectedDate === today ? getCarriedOverTasks(today) : Promise.resolve([]),
      ])
    : null

  const kanbanData = isKanban ? await getTasksByStatus() : null

  return (
    <div className={`mx-auto px-4 py-8 space-y-6 ${isKanban ? 'max-w-7xl' : 'max-w-4xl'}`}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Tasks</h1>
          <p className="mt-1 text-sm text-stone-500">Manage daily tasks for you and your team.</p>
        </div>
        <div className="flex gap-2 items-center">
          {/* View mode toggle */}
          <div className="flex rounded-lg border border-stone-700 overflow-hidden">
            <Link
              href={`/tasks?date=${selectedDate}&view=list`}
              className={`px-3 py-1.5 text-sm transition-colors ${
                !isKanban
                  ? 'bg-stone-700 text-stone-100'
                  : 'bg-stone-900 text-stone-400 hover:text-stone-200'
              }`}
              title="List view"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <line x1="2" y1="4" x2="14" y2="4" />
                <line x1="2" y1="8" x2="14" y2="8" />
                <line x1="2" y1="12" x2="14" y2="12" />
              </svg>
            </Link>
            <Link
              href={`/tasks?date=${selectedDate}&view=kanban`}
              className={`px-3 py-1.5 text-sm transition-colors ${
                isKanban
                  ? 'bg-stone-700 text-stone-100'
                  : 'bg-stone-900 text-stone-400 hover:text-stone-200'
              }`}
              title="Kanban view"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="1" y="2" width="4" height="12" rx="1" />
                <rect x="6" y="2" width="4" height="8" rx="1" />
                <rect x="11" y="2" width="4" height="10" rx="1" />
              </svg>
            </Link>
          </div>

          <Link href="/tasks/templates">
            <Button variant="secondary" size="sm">
              Templates
            </Button>
          </Link>
        </div>
      </div>

      {showCreate ? (
        <TaskCreatePanel
          staff={staff}
          stations={stations}
          defaultDate={selectedDate}
          cancelHref={`/tasks?date=${selectedDate}&view=${viewMode}`}
          draft={createDraft!}
          errorMessage={createError}
        />
      ) : null}

      {isKanban && kanbanData ? (
        <TaskKanbanView
          pending={kanbanData.pending}
          inProgress={kanbanData.in_progress}
          completed={kanbanData.done}
          staff={staff}
        />
      ) : listData ? (
        <TaskPageClient
          grouped={listData[0].grouped}
          unassigned={listData[0].unassigned}
          carriedOver={listData[1]}
          staff={staff}
          stations={stations}
          selectedDate={selectedDate}
          today={today}
          showCreate={showCreate}
          createHref={`/tasks?date=${selectedDate}&view=list&new=1`}
        />
      ) : null}
    </div>
  )
}
