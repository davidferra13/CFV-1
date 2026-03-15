'use client'

import { useState, useEffect, useTransition } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Plus, Clock, CheckCircle2, Eye, Circle,
  ArrowRight, X, Funnel as Filter,
} from '@/components/ui/icons'
import {
  getVaTasks, updateVaTaskStatus, getVaAssignees,
  type VaTask, type VaTaskCategory, type VaTaskPriority, type VaTaskStatus,
} from '@/lib/staff/va-task-actions'
import { VaTaskForm } from './va-task-form'
import { VaTaskDetail } from './va-task-detail'

// ============================================
// CONSTANTS
// ============================================

const COLUMNS: { status: VaTaskStatus; label: string }[] = [
  { status: 'pending', label: 'Pending' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'review', label: 'Review' },
  { status: 'completed', label: 'Completed' },
]

const CATEGORY_COLORS: Record<VaTaskCategory, string> = {
  admin: 'bg-blue-500/20 text-blue-300',
  scheduling: 'bg-purple-500/20 text-purple-300',
  communication: 'bg-green-500/20 text-green-300',
  data_entry: 'bg-amber-500/20 text-amber-300',
  research: 'bg-cyan-500/20 text-cyan-300',
  other: 'bg-stone-500/20 text-stone-300',
}

const CATEGORY_LABELS: Record<VaTaskCategory, string> = {
  admin: 'Admin',
  scheduling: 'Scheduling',
  communication: 'Comms',
  data_entry: 'Data Entry',
  research: 'Research',
  other: 'Other',
}

const PRIORITY_INDICATORS: Record<VaTaskPriority, { color: string; label: string }> = {
  low: { color: 'text-stone-400', label: 'Low' },
  medium: { color: 'text-blue-400', label: 'Med' },
  high: { color: 'text-amber-400', label: 'High' },
  urgent: { color: 'text-red-400', label: 'Urgent' },
}

// ============================================
// TASK CARD
// ============================================

function TaskCard({
  task,
  onStatusChange,
  onClick,
  isPending,
}: {
  task: VaTask
  onStatusChange: (id: string, status: VaTaskStatus) => void
  onClick: (task: VaTask) => void
  isPending: boolean
}) {
  const isOverdue =
    task.due_date &&
    task.due_date < new Date().toISOString().split('T')[0] &&
    task.status !== 'completed' &&
    task.status !== 'cancelled'
  const priority = PRIORITY_INDICATORS[task.priority]

  return (
    <div
      onClick={() => onClick(task)}
      className="rounded-lg border border-stone-700 bg-stone-800/50 p-3 cursor-pointer hover:border-stone-600 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-medium text-stone-200 line-clamp-2">{task.title}</h4>
        <span className={`text-xs font-medium flex-shrink-0 ${priority.color}`}>
          {priority.label}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs ${CATEGORY_COLORS[task.category]}`}>
          {CATEGORY_LABELS[task.category]}
        </span>
        {task.assigned_to && (
          <span className="text-xs text-stone-400 truncate max-w-[120px]">
            {task.assigned_to}
          </span>
        )}
      </div>

      {task.due_date && (
        <div className={`mt-2 flex items-center gap-1 text-xs ${isOverdue ? 'text-red-400' : 'text-stone-400'}`}>
          <Clock className="h-3 w-3" />
          {new Date(task.due_date + 'T00:00:00').toLocaleDateString()}
          {isOverdue && <span className="font-medium ml-1">Overdue</span>}
        </div>
      )}
    </div>
  )
}

// ============================================
// BOARD
// ============================================

export function VaTaskBoard() {
  const [tasks, setTasks] = useState<VaTask[]>([])
  const [assignees, setAssignees] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const [showForm, setShowForm] = useState(false)
  const [selectedTask, setSelectedTask] = useState<VaTask | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  // Filters
  const [filterCategory, setFilterCategory] = useState<VaTaskCategory | ''>('')
  const [filterAssignee, setFilterAssignee] = useState('')
  const [filterPriority, setFilterPriority] = useState<VaTaskPriority | ''>('')

  const loadTasks = () => {
    startTransition(async () => {
      try {
        const [taskData, assigneeData] = await Promise.all([
          getVaTasks(),
          getVaAssignees(),
        ])
        setTasks(taskData)
        setAssignees(assigneeData)
      } catch (err) {
        toast.error('Failed to load tasks')
      }
    })
  }

  useEffect(() => {
    loadTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleStatusChange = (id: string, newStatus: VaTaskStatus) => {
    const previous = tasks
    // Optimistic update
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, status: newStatus, updated_at: new Date().toISOString() } : t
    ))

    startTransition(async () => {
      try {
        await updateVaTaskStatus(id, newStatus)
      } catch (err) {
        setTasks(previous)
        toast.error(err instanceof Error ? err.message : 'Failed to update status')
      }
    })
  }

  // Apply filters
  const filteredTasks = tasks.filter(t => {
    if (filterCategory && t.category !== filterCategory) return false
    if (filterAssignee && t.assigned_to !== filterAssignee) return false
    if (filterPriority && t.priority !== filterPriority) return false
    return true
  })

  const activeFilterCount = [filterCategory, filterAssignee, filterPriority].filter(Boolean).length

  if (selectedTask) {
    return (
      <VaTaskDetail
        task={selectedTask}
        onBack={() => { setSelectedTask(null); loadTasks() }}
        onStatusChange={handleStatusChange}
      />
    )
  }

  if (showForm) {
    return (
      <VaTaskForm
        onSaved={() => { setShowForm(false); loadTasks() }}
        onCancel={() => setShowForm(false)}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-stone-200">VA Task Board</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-brand-600/20 text-brand-400'
                : 'bg-stone-800 text-stone-300 hover:text-stone-200'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 rounded-full bg-brand-600 px-1.5 py-0.5 text-xs text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Task
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex items-center gap-3 flex-wrap rounded-lg bg-stone-800/50 p-3">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value as VaTaskCategory | '')}
            className="rounded bg-stone-700 px-2 py-1 text-sm text-stone-200 border border-stone-600"
          >
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>

          <select
            value={filterAssignee}
            onChange={e => setFilterAssignee(e.target.value)}
            className="rounded bg-stone-700 px-2 py-1 text-sm text-stone-200 border border-stone-600"
          >
            <option value="">All Assignees</option>
            {assignees.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value as VaTaskPriority | '')}
            className="rounded bg-stone-700 px-2 py-1 text-sm text-stone-200 border border-stone-600"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>

          {activeFilterCount > 0 && (
            <button
              onClick={() => { setFilterCategory(''); setFilterAssignee(''); setFilterPriority('') }}
              className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-200"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
      )}

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map(col => {
          const columnTasks = filteredTasks.filter(t => t.status === col.status)
          return (
            <div key={col.status} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-medium text-stone-300">{col.label}</h3>
                <span className="text-xs text-stone-500">{columnTasks.length}</span>
              </div>
              <div className="space-y-2 min-h-[100px] rounded-lg bg-stone-900/50 p-2">
                {columnTasks.length === 0 && (
                  <p className="text-xs text-stone-500 text-center py-6">No tasks</p>
                )}
                {columnTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onStatusChange={handleStatusChange}
                    onClick={setSelectedTask}
                    isPending={isPending}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
