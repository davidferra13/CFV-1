'use client'

// Task Board - Daily task view grouped by assigned person
// Displays task cards with status toggles, priority badges, and due times.
// Click status to cycle: pending -> in_progress -> done

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { updateTask, completeTask, reopenTask, deleteTask, type Task } from '@/lib/tasks/actions'
import { QuickAssign } from './quick-assign'

// ============================================
// CONSTANTS
// ============================================

const PRIORITY_BADGE: Record<
  string,
  { variant: 'default' | 'info' | 'warning' | 'error'; label: string }
> = {
  low: { variant: 'default', label: 'Low' },
  medium: { variant: 'info', label: 'Medium' },
  high: { variant: 'warning', label: 'High' },
  urgent: { variant: 'error', label: 'Urgent' },
}

const STATUS_STYLES: Record<string, { bg: string; text: string; ring: string; label: string }> = {
  pending: {
    bg: 'bg-stone-800',
    text: 'text-stone-400',
    ring: 'ring-stone-600',
    label: 'Pending',
  },
  in_progress: {
    bg: 'bg-brand-950',
    text: 'text-brand-400',
    ring: 'ring-brand-800',
    label: 'In Progress',
  },
  done: {
    bg: 'bg-emerald-950',
    text: 'text-emerald-400',
    ring: 'ring-emerald-800',
    label: 'Done',
  },
}

const ROLE_LABELS: Record<string, string> = {
  sous_chef: 'Sous Chef',
  kitchen_assistant: 'Kitchen Asst.',
  service_staff: 'Service Staff',
  server: 'Server',
  bartender: 'Bartender',
  dishwasher: 'Dishwasher',
  other: 'Staff',
}

// ============================================
// TYPES
// ============================================

type GroupedTasks = Record<string, { staffName: string; staffRole: string; tasks: Task[] }>

type StaffOption = { id: string; name: string; role: string }

type Props = {
  grouped: GroupedTasks
  unassigned: Task[]
  selectedDate: string
  onEditTask?: (task: Task) => void
  staff?: StaffOption[]
}

// ============================================
// TASK CARD COMPONENT
// ============================================

function TaskCard({
  task,
  onEditTask,
  staff,
}: {
  task: Task
  onEditTask?: (task: Task) => void
  staff?: StaffOption[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const priority = PRIORITY_BADGE[task.priority] ?? PRIORITY_BADGE.medium
  const statusStyle = STATUS_STYLES[task.status] ?? STATUS_STYLES.pending

  async function cycleStatus() {
    setLoading(true)
    try {
      if (task.status === 'pending') {
        await updateTask(task.id, { status: 'in_progress' })
      } else if (task.status === 'in_progress') {
        await completeTask(task.id)
      } else {
        await reopenTask(task.id)
      }
      router.refresh()
    } catch (err) {
      console.error('Failed to update task status:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    try {
      await deleteTask(task.id)
      router.refresh()
    } catch (err) {
      console.error('Failed to delete task:', err)
      setDeleting(false)
    }
  }

  return (
    <div
      className={`rounded-lg border border-stone-700/80 bg-stone-900 p-3 transition-all duration-150 ${
        task.status === 'done' ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Status toggle button */}
        <button
          type="button"
          onClick={cycleStatus}
          disabled={loading}
          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border ring-1 ring-inset transition-colors ${
            task.status === 'done'
              ? 'bg-emerald-600 border-emerald-500 ring-emerald-400'
              : task.status === 'in_progress'
                ? 'bg-brand-600 border-brand-500 ring-brand-400'
                : 'bg-stone-800 border-stone-600 ring-stone-500 hover:bg-stone-700'
          }`}
          title={`Status: ${statusStyle.label}. Click to change.`}
        >
          {task.status === 'done' && (
            <svg viewBox="0 0 16 16" className="w-full h-full text-white p-0.5">
              <path
                d="M4 8l3 3 5-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          {task.status === 'in_progress' && (
            <svg viewBox="0 0 16 16" className="w-full h-full text-white p-0.5">
              <circle cx="8" cy="8" r="3" fill="currentColor" />
            </svg>
          )}
        </button>

        {/* Task content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-sm font-medium ${
                task.status === 'done' ? 'line-through text-stone-500' : 'text-stone-100'
              }`}
            >
              {task.title}
            </span>
            <Badge variant={priority.variant}>{priority.label}</Badge>
            {task.due_time && (
              <span className="text-xs text-stone-400">{formatTime(task.due_time)}</span>
            )}
          </div>

          {task.description && (
            <p className="mt-0.5 text-xs text-stone-400 line-clamp-2">{task.description}</p>
          )}

          {task.notes && <p className="mt-0.5 text-xs text-stone-500 italic">{task.notes}</p>}
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-1">
          {/* Quick-assign (Phase 7) - shown for unassigned tasks when staff list available */}
          {!task.assigned_to && staff && staff.length > 0 && (
            <QuickAssign taskId={task.id} currentAssignee={task.assigned_to} staff={staff} />
          )}
          {onEditTask && (
            <button
              type="button"
              onClick={() => onEditTask(task)}
              className="text-xs text-stone-400 hover:text-stone-200 px-1.5 py-0.5"
            >
              Edit
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs text-red-400 hover:text-red-300 px-1.5 py-0.5 disabled:opacity-40"
          >
            {deleting ? '...' : 'Del'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================
// TASK BOARD COMPONENT
// ============================================

export function TaskBoard({ grouped, unassigned, selectedDate, onEditTask, staff }: Props) {
  const staffIds = Object.keys(grouped)
  const hasAnyTasks = staffIds.length > 0 || unassigned.length > 0

  if (!hasAnyTasks) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-stone-400 text-sm">No tasks for {formatDisplayDate(selectedDate)}.</p>
          <p className="text-stone-500 text-xs mt-1">
            Create a task or generate from a template to get started.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Staff sections */}
      {staffIds.map((staffId) => {
        const group = grouped[staffId]
        const doneCount = group.tasks.filter((t) => t.status === 'done').length
        const totalCount = group.tasks.length

        return (
          <Card key={staffId}>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{group.staffName}</CardTitle>
                  <Badge variant="default">{ROLE_LABELS[group.staffRole] ?? group.staffRole}</Badge>
                </div>
                <span className="text-xs text-stone-400">
                  {doneCount}/{totalCount} done
                </span>
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-1 rounded-full bg-stone-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: totalCount > 0 ? `${(doneCount / totalCount) * 100}%` : '0%' }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-2 pb-3">
              {group.tasks.map((task) => (
                <TaskCard key={task.id} task={task} onEditTask={onEditTask} staff={staff} />
              ))}
            </CardContent>
          </Card>
        )
      })}

      {/* Unassigned section */}
      {unassigned.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base text-stone-400">Unassigned</CardTitle>
              <span className="text-xs text-stone-500">
                {unassigned.filter((t) => t.status === 'done').length}/{unassigned.length} done
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-2 pb-3">
            {unassigned.map((task) => (
              <TaskCard key={task.id} task={task} onEditTask={onEditTask} staff={staff} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ============================================
// HELPERS
// ============================================

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return `${displayHour}:${String(minutes).padStart(2, '0')} ${period}`
}

function formatDisplayDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}
