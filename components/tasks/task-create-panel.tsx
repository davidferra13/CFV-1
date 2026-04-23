import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TaskCreateFields } from './task-create-fields'
import { createTask } from '@/lib/tasks/actions'
import {
  buildTaskCreateDraftFromFormData,
  buildTaskCreateHref,
  type TaskCreateDraft,
} from '@/lib/tasks/create-form-state'

type StaffOption = { id: string; name: string; role: string }
type StationOption = { id: string; name: string }

type Props = {
  staff: StaffOption[]
  stations: StationOption[]
  defaultDate: string
  cancelHref: string
  draft: TaskCreateDraft
  errorMessage?: string | null
}

const PRIMARY_BUTTON_CLASSNAME =
  'inline-flex min-h-[44px] items-center justify-center rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2'
const GHOST_LINK_CLASSNAME =
  'inline-flex min-h-[44px] items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium text-stone-300 transition-all duration-150 hover:bg-stone-800 hover:text-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2'

function getTaskCreateErrorMessage(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'issues' in error &&
    Array.isArray((error as { issues?: unknown }).issues)
  ) {
    const firstIssue = (error as { issues: Array<{ message?: unknown }> }).issues.find(
      (issue) => typeof issue?.message === 'string' && issue.message.trim()
    )
    if (firstIssue?.message) {
      return String(firstIssue.message)
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return 'Failed to create task'
}

export function TaskCreatePanel({
  staff,
  stations,
  defaultDate,
  cancelHref,
  draft,
  errorMessage,
}: Props) {
  async function submitCreateTask(formData: FormData) {
    'use server'

    const nextDraft = buildTaskCreateDraftFromFormData(formData, defaultDate)
    const nextDate = nextDraft.due_date || defaultDate

    try {
      await createTask(formData)
    } catch (error) {
      redirect(
        buildTaskCreateHref({
          date: nextDate,
          draft: nextDraft,
          error: getTaskCreateErrorMessage(error),
        })
      )
    }

    redirect(`/tasks?date=${encodeURIComponent(nextDate)}`)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New Task</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={submitCreateTask} className="space-y-4">
          <TaskCreateFields staff={staff} stations={stations} draft={draft} />

          {errorMessage && (
            <p role="alert" className="text-sm text-red-500">
              {errorMessage}
            </p>
          )}

          <div className="flex gap-2">
            <button type="submit" className={PRIMARY_BUTTON_CLASSNAME}>
              Create Task
            </button>
            <a href={cancelHref} className={GHOST_LINK_CLASSNAME}>
              Cancel
            </a>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
