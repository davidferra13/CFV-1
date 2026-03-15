'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from '@/components/ui/icons'
import {
  createVaTask, updateVaTask,
  type VaTask, type VaTaskCategory, type VaTaskPriority, type CreateVaTaskInput,
} from '@/lib/staff/va-task-actions'

// ============================================
// FORM
// ============================================

export function VaTaskForm({
  task,
  onSaved,
  onCancel,
}: {
  task?: VaTask
  onSaved: () => void
  onCancel: () => void
}) {
  const isEdit = !!task
  const [isPending, startTransition] = useTransition()

  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [category, setCategory] = useState<VaTaskCategory>(task?.category ?? 'admin')
  const [priority, setPriority] = useState<VaTaskPriority>(task?.priority ?? 'medium')
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to ?? '')
  const [dueDate, setDueDate] = useState(task?.due_date ?? '')
  const [notes, setNotes] = useState(task?.notes ?? '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error('Title is required')
      return
    }

    startTransition(async () => {
      try {
        if (isEdit && task) {
          await updateVaTask(task.id, {
            title: title.trim(),
            description: description.trim() || null,
            category,
            priority,
            assigned_to: assignedTo.trim() || null,
            due_date: dueDate || null,
            notes: notes.trim() || null,
          })
          toast.success('Task updated')
        } else {
          const input: CreateVaTaskInput = {
            title: title.trim(),
            category,
            priority,
          }
          if (description.trim()) input.description = description.trim()
          if (assignedTo.trim()) input.assigned_to = assignedTo.trim()
          if (dueDate) input.due_date = dueDate
          if (notes.trim()) input.notes = notes.trim()

          await createVaTask(input)
          toast.success('Task created')
        }
        onSaved()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save task')
      }
    })
  }

  const inputClass =
    'w-full rounded-lg bg-stone-800 border border-stone-600 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500'
  const labelClass = 'block text-sm font-medium text-stone-300 mb-1'

  return (
    <Card className="border-stone-700 bg-stone-800/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <button onClick={onCancel} className="text-stone-400 hover:text-stone-200 transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <CardTitle className="text-stone-200">
            {isEdit ? 'Edit Task' : 'New VA Task'}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className={labelClass}>Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className={inputClass}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Additional details, context, or instructions..."
              rows={3}
              className={inputClass}
            />
          </div>

          {/* Category + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Category *</label>
              <select value={category} onChange={e => setCategory(e.target.value as VaTaskCategory)} className={inputClass}>
                <option value="admin">Admin</option>
                <option value="scheduling">Scheduling</option>
                <option value="communication">Communication</option>
                <option value="data_entry">Data Entry</option>
                <option value="research">Research</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as VaTaskPriority)} className={inputClass}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          {/* Assigned To + Due Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Assign To</label>
              <input
                type="text"
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
                placeholder="VA name or email"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Internal notes..."
              rows={2}
              className={inputClass}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending || !title.trim()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Saving...' : isEdit ? 'Update Task' : 'Create Task'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg bg-stone-700 px-4 py-2 text-sm text-stone-300 hover:bg-stone-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
