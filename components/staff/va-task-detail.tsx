'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Pencil as Edit,
  Trash2,
  X,
} from '@/components/ui/icons'
import {
  updateVaTaskStatus,
  deleteVaTask,
  type VaTask,
  type VaTaskStatus,
} from '@/lib/staff/va-task-actions'
import { VaTaskForm } from './va-task-form'

// ============================================
// STATUS CONFIG
// ============================================

const STATUS_CONFIG: Record<VaTaskStatus, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-stone-500/20 text-stone-300' },
  in_progress: { label: 'In Progress', color: 'bg-brand-500/20 text-brand-300' },
  review: { label: 'Review', color: 'bg-amber-500/20 text-amber-300' },
  completed: { label: 'Completed', color: 'bg-green-500/20 text-green-300' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500/20 text-red-300' },
}

const NEXT_ACTIONS: Record<VaTaskStatus, { status: VaTaskStatus; label: string }[]> = {
  pending: [
    { status: 'in_progress', label: 'Start Work' },
    { status: 'cancelled', label: 'Cancel' },
  ],
  in_progress: [
    { status: 'review', label: 'Submit for Review' },
    { status: 'completed', label: 'Mark Complete' },
    { status: 'cancelled', label: 'Cancel' },
  ],
  review: [
    { status: 'in_progress', label: 'Send Back' },
    { status: 'completed', label: 'Approve & Complete' },
    { status: 'cancelled', label: 'Cancel' },
  ],
  completed: [{ status: 'pending', label: 'Reopen' }],
  cancelled: [{ status: 'pending', label: 'Reopen' }],
}

const CATEGORY_LABELS: Record<string, string> = {
  admin: 'Admin',
  scheduling: 'Scheduling',
  communication: 'Communication',
  data_entry: 'Data Entry',
  research: 'Research',
  other: 'Other',
}

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-stone-400' },
  medium: { label: 'Medium', color: 'text-brand-400' },
  high: { label: 'High', color: 'text-amber-400' },
  urgent: { label: 'Urgent', color: 'text-red-400' },
}

// ============================================
// DETAIL VIEW
// ============================================

export function VaTaskDetail({
  task: initialTask,
  onBack,
  onStatusChange,
}: {
  task: VaTask
  onBack: () => void
  onStatusChange: (id: string, status: VaTaskStatus) => void
}) {
  const [task, setTask] = useState(initialTask)
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const statusConfig = STATUS_CONFIG[task.status]
  const priorityConfig = PRIORITY_LABELS[task.priority]
  const actions = NEXT_ACTIONS[task.status] ?? []
  const isOverdue =
    task.due_date &&
    task.due_date < new Date().toISOString().split('T')[0] &&
    task.status !== 'completed' &&
    task.status !== 'cancelled'

  const handleStatusChange = (newStatus: VaTaskStatus) => {
    const previous = task
    setTask((prev) => ({ ...prev, status: newStatus, updated_at: new Date().toISOString() }))

    startTransition(async () => {
      try {
        const updated = await updateVaTaskStatus(task.id, newStatus)
        setTask(updated)
      } catch (err) {
        setTask(previous)
        toast.error(err instanceof Error ? err.message : 'Failed to update status')
      }
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteVaTask(task.id)
        toast.success('Task deleted')
        onBack()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to delete task')
      }
    })
  }

  if (isEditing) {
    return (
      <VaTaskForm
        task={task}
        onSaved={() => {
          setIsEditing(false)
          onBack()
        }}
        onCancel={() => setIsEditing(false)}
      />
    )
  }

  return (
    <Card className="border-stone-700 bg-stone-800/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-stone-400 hover:text-stone-200 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <CardTitle className="text-stone-200">{task.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-lg bg-stone-700 p-2 text-stone-300 hover:bg-stone-600 hover:text-stone-200 transition-colors"
              title="Edit task"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-lg bg-stone-700 p-2 text-stone-300 hover:bg-red-600 hover:text-white transition-colors"
              title="Delete task"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Status + Meta */}
        <div className="flex items-center gap-3 flex-wrap">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig.color}`}
          >
            {statusConfig.label}
          </span>
          <span className={`text-sm font-medium ${priorityConfig.color}`}>
            {priorityConfig.label} priority
          </span>
          <span className="text-xs text-stone-500">
            {CATEGORY_LABELS[task.category] ?? task.category}
          </span>
        </div>

        {/* Description */}
        {task.description && (
          <div>
            <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">
              Description
            </h4>
            <p className="text-sm text-stone-300 whitespace-pre-wrap">{task.description}</p>
          </div>
        )}

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-4">
          {task.assigned_to && (
            <div>
              <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">
                Assigned To
              </h4>
              <p className="text-sm text-stone-200">{task.assigned_to}</p>
            </div>
          )}
          {task.due_date && (
            <div>
              <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">
                Due Date
              </h4>
              <p
                className={`text-sm flex items-center gap-1 ${isOverdue ? 'text-red-400' : 'text-stone-200'}`}
              >
                <Clock className="h-3.5 w-3.5" />
                {new Date(task.due_date + 'T00:00:00').toLocaleDateString()}
                {isOverdue && <span className="text-xs font-medium">(Overdue)</span>}
              </p>
            </div>
          )}
          {task.completed_at && (
            <div>
              <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">
                Completed
              </h4>
              <p className="text-sm text-stone-200 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                {new Date(task.completed_at).toLocaleDateString()}
              </p>
            </div>
          )}
          <div>
            <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">
              Created
            </h4>
            <p className="text-sm text-stone-300">
              {new Date(task.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Notes */}
        {task.notes && (
          <div>
            <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">
              Notes
            </h4>
            <p className="text-sm text-stone-300 whitespace-pre-wrap rounded-lg bg-stone-900/50 p-3">
              {task.notes}
            </p>
          </div>
        )}

        {/* Status transitions */}
        {actions.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2">
              Actions
            </h4>
            <div className="flex items-center gap-2 flex-wrap">
              {actions.map((action) => (
                <button
                  key={action.status}
                  onClick={() => handleStatusChange(action.status)}
                  disabled={isPending}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    action.status === 'cancelled'
                      ? 'bg-stone-700 text-stone-300 hover:bg-stone-600'
                      : action.status === 'completed'
                        ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                        : 'bg-brand-600/20 text-brand-400 hover:bg-brand-600/30'
                  }`}
                >
                  {action.status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : action.status === 'cancelled' ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Delete confirmation */}
        {showDeleteConfirm && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm text-red-300 mb-3">
              Are you sure you want to delete this task? This cannot be undone.
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {isPending ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg bg-stone-700 px-3 py-1.5 text-sm text-stone-300 hover:bg-stone-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
