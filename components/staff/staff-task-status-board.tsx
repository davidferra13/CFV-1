// Staff Task Status Board - Status-grouped task view for the staff portal
// Three columns: Pending, In Progress, Done. Staff can move tasks between statuses.

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { updateMyTaskStatus } from '@/lib/staff/staff-portal-actions'
import type { StaffTask } from '@/lib/staff/staff-portal-actions'

// ============================================
// TYPES
// ============================================

type StatusBoardProps = {
  pending: StaffTask[]
  inProgress: StaffTask[]
  done: StaffTask[]
}

type StatusKey = 'pending' | 'in_progress' | 'done'

// ============================================
// CONSTANTS
// ============================================

const COLUMNS: { key: StatusKey; label: string; emptyText: string }[] = [
  { key: 'pending', label: 'To Do', emptyText: 'Nothing pending' },
  { key: 'in_progress', label: 'In Progress', emptyText: 'Nothing in progress' },
  { key: 'done', label: 'Done', emptyText: 'No completed tasks' },
]

const PRIORITY_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  urgent: 'error',
}

const STATUS_TRANSITIONS: Record<StatusKey, { label: string; target: StatusKey }[]> = {
  pending: [{ label: 'Start', target: 'in_progress' }],
  in_progress: [
    { label: 'Done', target: 'done' },
    { label: 'Back to To Do', target: 'pending' },
  ],
  done: [{ label: 'Reopen', target: 'pending' }],
}

// ============================================
// TASK CARD
// ============================================

function TaskCard({
  task,
  onStatusChange,
  isUpdating,
}: {
  task: StaffTask
  onStatusChange: (taskId: string, newStatus: StatusKey) => void
  isUpdating: boolean
}) {
  const isDone = task.status === 'done'
  const isOverdue = !isDone && task.due_date < getTodayString()
  const transitions = STATUS_TRANSITIONS[task.status as StatusKey] ?? []

  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        isDone
          ? 'border-stone-700/50 bg-stone-900/50'
          : isOverdue
            ? 'border-red-800/60 bg-red-950/20'
            : 'border-stone-700 bg-stone-900'
      }`}
    >
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <p
          className={`text-sm font-medium ${
            isDone ? 'text-stone-500 line-through' : 'text-stone-100'
          }`}
        >
          {task.title}
        </p>
        <Badge variant={PRIORITY_VARIANTS[task.priority] ?? 'default'}>{task.priority}</Badge>
      </div>

      {/* Description */}
      {task.description && (
        <p className="mt-1 text-xs text-stone-500 line-clamp-2">{task.description}</p>
      )}

      {/* Event context */}
      {task.event_name && (
        <div className="mt-1.5">
          <span className="text-xs bg-brand-500/15 text-brand-400 border border-brand-500/25 rounded px-1.5 py-0.5">
            {task.event_name}
            {task.event_guest_count ? `, ${task.event_guest_count} guests` : ''}
          </span>
        </div>
      )}

      {/* Meta row: due date, overdue indicator, notes */}
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        <span className={`text-xs ${isOverdue ? 'text-red-400 font-medium' : 'text-stone-500'}`}>
          {isOverdue && '⚠ '}
          {formatDueDate(task.due_date)}
          {task.due_time ? ` at ${task.due_time}` : ''}
        </span>
        {isOverdue && <Badge variant="error">Overdue</Badge>}
        {task.notes && (
          <span className="text-xs text-stone-600 italic truncate max-w-[180px]">{task.notes}</span>
        )}
      </div>

      {/* Status transition buttons */}
      {transitions.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          {transitions.map((t) => (
            <Button
              key={t.target}
              variant={t.target === 'done' ? 'primary' : 'secondary'}
              size="sm"
              disabled={isUpdating}
              onClick={() => onStatusChange(task.id, t.target)}
            >
              {t.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================
// STATUS COLUMN
// ============================================

function StatusColumn({
  column,
  tasks,
  onStatusChange,
  isUpdating,
}: {
  column: (typeof COLUMNS)[number]
  tasks: StaffTask[]
  onStatusChange: (taskId: string, newStatus: StatusKey) => void
  isUpdating: boolean
}) {
  return (
    <Card className="flex-1 min-w-[280px]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{column.label}</CardTitle>
          <Badge variant="default">{tasks.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="py-8 text-center text-xs text-stone-600">{column.emptyText}</p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onStatusChange={onStatusChange}
                isUpdating={isUpdating}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// STATUS BOARD (exported)
// ============================================

export function StaffTaskStatusBoard({ pending, inProgress, done }: StatusBoardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Optimistic local state
  const [localTasks, setLocalTasks] = useState<Record<StatusKey, StaffTask[]>>({
    pending,
    in_progress: inProgress,
    done,
  })

  function handleStatusChange(taskId: string, newStatus: StatusKey) {
    // Find which column the task is in
    let task: StaffTask | undefined
    let fromStatus: StatusKey | undefined

    for (const status of ['pending', 'in_progress', 'done'] as StatusKey[]) {
      const found = localTasks[status].find((t) => t.id === taskId)
      if (found) {
        task = found
        fromStatus = status
        break
      }
    }

    if (!task || !fromStatus || fromStatus === newStatus) return

    // Optimistic update
    const updatedTask = { ...task, status: newStatus }
    const prevState = { ...localTasks }

    setLocalTasks((prev) => ({
      ...prev,
      [fromStatus!]: prev[fromStatus!].filter((t) => t.id !== taskId),
      [newStatus]: [...prev[newStatus], updatedTask],
    }))

    startTransition(async () => {
      try {
        await updateMyTaskStatus(taskId, newStatus)
        router.refresh()
      } catch (err) {
        console.error('[StaffTaskStatusBoard] Status update failed:', err)
        // Rollback
        setLocalTasks(prevState)
      }
    })
  }

  return (
    <div className="relative">
      {isPending && (
        <div className="absolute inset-0 z-10 flex items-start justify-center pt-12 bg-stone-950/20 rounded-xl pointer-events-none">
          <span className="text-xs text-stone-400 bg-stone-800 px-3 py-1.5 rounded-full">
            Updating...
          </span>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => (
          <StatusColumn
            key={col.key}
            column={col}
            tasks={localTasks[col.key]}
            onStatusChange={handleStatusChange}
            isUpdating={isPending}
          />
        ))}
      </div>
    </div>
  )
}

// ============================================
// HELPERS
// ============================================

function getTodayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDueDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000)

  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff < -1) return `${Math.abs(diff)}d overdue`

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
