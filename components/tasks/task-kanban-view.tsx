'use client'

// Kanban view for tasks. Three columns: To Do, In Progress, Done.
// Supports drag-and-drop between columns to update status.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { updateTaskStatus } from '@/lib/tasks/actions'
import type { Task } from '@/lib/tasks/actions'

// ============================================
// TYPES
// ============================================

type StaffOption = { id: string; name: string }

type KanbanProps = {
  pending: Task[]
  inProgress: Task[]
  completed: Task[]
  staff: StaffOption[]
}

// ============================================
// CONSTANTS
// ============================================

const COLUMNS = [
  {
    key: 'pending',
    label: 'To Do',
    color: 'text-stone-400',
    borderColor: 'border-stone-600',
    bgHeader: 'bg-stone-800/60',
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    color: 'text-amber-400',
    borderColor: 'border-amber-800',
    bgHeader: 'bg-amber-950/40',
  },
  {
    key: 'done',
    label: 'Done',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-800',
    bgHeader: 'bg-emerald-950/40',
  },
] as const

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-900/60 text-red-300 border-red-700',
  high: 'bg-amber-900/60 text-amber-300 border-amber-700',
  medium: 'bg-stone-700/60 text-stone-300 border-stone-600',
  low: 'bg-stone-800/60 text-stone-500 border-stone-700',
}

// ============================================
// KANBAN CARD
// ============================================

function KanbanCard({ task, staff }: { task: Task; staff: StaffOption[] }) {
  const priorityStyle = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.medium
  const assignee = task.assigned_to ? staff.find((s) => s.id === task.assigned_to) : null

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(
          'text/plain',
          JSON.stringify({
            taskId: task.id,
            fromStatus: task.status,
          })
        )
        e.dataTransfer.effectAllowed = 'move'
      }}
      className="rounded-lg border border-stone-700 bg-stone-900 p-3 cursor-grab active:cursor-grabbing hover:border-stone-500 transition-colors"
    >
      {/* Title */}
      <p
        className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-stone-500' : 'text-stone-100'}`}
      >
        {task.title}
      </p>

      {/* Meta row */}
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        {/* Priority */}
        <span
          className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-xxs font-medium ${priorityStyle}`}
        >
          {task.priority}
        </span>

        {/* Time estimate */}
        {task.time_estimate_minutes != null && task.time_estimate_minutes > 0 && (
          <span className="inline-flex items-center rounded-md border border-stone-700 bg-stone-800 px-1.5 py-0.5 text-xxs text-stone-400">
            ~{formatEstimate(task.time_estimate_minutes)}
          </span>
        )}

        {/* Auto source */}
        {task.auto_source && (
          <span className="inline-flex items-center rounded-md border border-blue-800 bg-blue-950/40 px-1.5 py-0.5 text-xxs text-blue-400">
            Auto: {task.auto_source}
          </span>
        )}
      </div>

      {/* Bottom row: assignee + due date */}
      <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
        <span>{assignee ? assignee.name : 'Unassigned'}</span>
        <span>{formatDueDate(task.due_date)}</span>
      </div>
    </div>
  )
}

// ============================================
// KANBAN COLUMN
// ============================================

function KanbanColumn({
  columnKey,
  label,
  color,
  borderColor,
  bgHeader,
  tasks,
  staff,
  onDrop,
}: {
  columnKey: string
  label: string
  color: string
  borderColor: string
  bgHeader: string
  tasks: Task[]
  staff: StaffOption[]
  onDrop: (taskId: string, newStatus: string) => void
}) {
  const [dragOver, setDragOver] = useState(false)

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(true)
  }

  function handleDragLeave() {
    setDragOver(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)

    try {
      const raw = e.dataTransfer.getData('text/plain')
      const { taskId, fromStatus } = JSON.parse(raw) as { taskId: string; fromStatus: string }
      if (fromStatus !== columnKey) {
        onDrop(taskId, columnKey)
      }
    } catch {
      // Invalid drag data
    }
  }

  return (
    <div
      className={`flex flex-col min-w-[280px] flex-1 rounded-xl border ${borderColor} ${
        dragOver ? 'ring-2 ring-brand-500/40 border-brand-500' : ''
      } bg-stone-950/50 transition-all`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Column header */}
      <div className={`flex items-center justify-between rounded-t-xl px-3 py-2.5 ${bgHeader}`}>
        <span className={`text-sm font-semibold ${color}`}>{label}</span>
        <Badge variant="default" className="text-xxs">
          {tasks.length}
        </Badge>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 p-2 min-h-[100px]">
        {tasks.length === 0 && (
          <p className="py-6 text-center text-xs text-stone-600">
            {dragOver ? 'Drop here' : 'No tasks'}
          </p>
        )}
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} staff={staff} />
        ))}
      </div>
    </div>
  )
}

// ============================================
// KANBAN VIEW (exported)
// ============================================

export function TaskKanbanView({ pending, inProgress, completed, staff }: KanbanProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Optimistic local state
  const [localPending, setLocalPending] = useState(pending)
  const [localInProgress, setLocalInProgress] = useState(inProgress)
  const [localCompleted, setLocalCompleted] = useState(completed)

  function getColumnTasks(status: string): Task[] {
    if (status === 'pending') return localPending
    if (status === 'in_progress') return localInProgress
    return localCompleted
  }

  function setColumnTasks(status: string, tasks: Task[]) {
    if (status === 'pending') setLocalPending(tasks)
    else if (status === 'in_progress') setLocalInProgress(tasks)
    else setLocalCompleted(tasks)
  }

  async function handleDrop(taskId: string, newStatus: string) {
    // Find which column the task is in
    let task: Task | undefined
    let fromStatus: string | undefined

    for (const status of ['pending', 'in_progress', 'done']) {
      const col = getColumnTasks(status)
      const found = col.find((t) => t.id === taskId)
      if (found) {
        task = found
        fromStatus = status
        break
      }
    }

    if (!task || !fromStatus || fromStatus === newStatus) return

    // Optimistic update: move task between columns
    const updatedTask = { ...task, status: newStatus as Task['status'] }
    setColumnTasks(
      fromStatus,
      getColumnTasks(fromStatus).filter((t) => t.id !== taskId)
    )
    setColumnTasks(newStatus, [...getColumnTasks(newStatus), updatedTask])

    startTransition(async () => {
      try {
        await updateTaskStatus(taskId, newStatus)
        router.refresh()
      } catch (err) {
        console.error('[TaskKanbanView] Status update failed:', err)
        // Rollback: move task back
        setColumnTasks(
          newStatus,
          getColumnTasks(newStatus).filter((t) => t.id !== taskId)
        )
        setColumnTasks(fromStatus!, [...getColumnTasks(fromStatus!), task!])
      }
    })
  }

  return (
    <div className="relative">
      {isPending && (
        <div className="absolute inset-0 z-10 flex items-start justify-center pt-8 bg-stone-950/30 rounded-xl">
          <span className="text-xs text-stone-400">Updating...</span>
        </div>
      )}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.key}
            columnKey={col.key}
            label={col.label}
            color={col.color}
            borderColor={col.borderColor}
            bgHeader={col.bgHeader}
            tasks={getColumnTasks(col.key)}
            staff={staff}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </div>
  )
}

// ============================================
// HELPERS
// ============================================

function formatEstimate(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h${m}m` : `${h}h`
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
