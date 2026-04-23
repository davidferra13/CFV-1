'use client'

// Task Form - Create or edit a task
// Fields: title, description, assignee, station, due date, due time, priority, notes, recurring rule

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RecurringTaskConfig } from './recurring-task-config'
import { updateTask, type Task, type RecurringRule } from '@/lib/tasks/actions'

type StaffOption = { id: string; name: string; role: string }
type StationOption = { id: string; name: string }

type Props = {
  task?: Task
  staff: StaffOption[]
  stations: StationOption[]
  defaultDate?: string
  onDone?: () => void
}

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export function TaskForm({
  task,
  staff,
  stations,
  defaultDate,
  onDone,
}: Props) {
  const router = useRouter()
  const isEditing = Boolean(task)
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    assigned_to: task?.assigned_to ?? '',
    station_id: task?.station_id ?? '',
    due_date:
      task?.due_date ??
      defaultDate ??
      ((_tf) =>
        `${_tf.getFullYear()}-${String(_tf.getMonth() + 1).padStart(2, '0')}-${String(_tf.getDate()).padStart(2, '0')}`)(
        new Date()
      ),
    due_time: task?.due_time ?? '',
    priority: task?.priority ?? 'medium',
    notes: task?.notes ?? '',
  })
  const [recurringRule, setRecurringRule] = useState<RecurringRule | null>(
    task?.recurring_rule ?? null
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        await updateTask(task!.id, formData)

        router.refresh()
        onDone?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Save failed')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input
        type="hidden"
        name="recurring_rule"
        value={recurringRule ? JSON.stringify(recurringRule) : ''}
      />

      {/* Title */}
      <div>
        <Input
          name="title"
          label="Title"
          value={form.title}
          onChange={(e) => update('title', e.target.value)}
          placeholder="What needs to be done?"
          required
        />
      </div>

      {/* Description */}
      <div>
        <Textarea
          name="description"
          label="Description"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Additional details..."
          rows={2}
        />
      </div>

      {/* Assignee + Station */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1.5">Assign to</label>
          <select
            name="assigned_to"
            value={form.assigned_to}
            onChange={(e) => update('assigned_to', e.target.value)}
            className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">Unassigned</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-300 mb-1.5">Station</label>
          <select
            name="station_id"
            value={form.station_id}
            onChange={(e) => update('station_id', e.target.value)}
            className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="">No station</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Due date + Due time */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Input
            name="due_date"
            label="Due date"
            type="date"
            value={form.due_date}
            onChange={(e) => update('due_date', e.target.value)}
            required
          />
        </div>

        <div>
          <Input
            name="due_time"
            label="Due time"
            type="time"
            value={form.due_time}
            onChange={(e) => update('due_time', e.target.value)}
          />
        </div>
      </div>

      {/* Priority */}
      <div>
        <label className="block text-sm font-medium text-stone-300 mb-1.5">Priority</label>
        <select
          name="priority"
          value={form.priority}
          onChange={(e) => update('priority', e.target.value)}
          className="block w-full rounded-lg border border-stone-600 bg-stone-900 px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          {PRIORITY_OPTIONS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div>
        <Textarea
          name="notes"
          label="Notes"
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Any additional notes..."
          rows={2}
        />
      </div>

      {/* Recurring rule */}
      <RecurringTaskConfig value={recurringRule} onChange={setRecurringRule} />

      {/* Error */}
      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : isEditing ? 'Update Task' : 'Save Task'}
        </Button>
        {onDone && (
          <Button type="button" variant="ghost" onClick={onDone} disabled={isPending}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
