'use client'

// Task Form - Create or edit a task
// Fields: title, description, assignee, station, due date, due time, priority, notes, recurring rule

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RecurringTaskConfig } from './recurring-task-config'
import {
  createTask,
  updateTask,
  type CreateTaskInput,
  type UpdateTaskInput,
  type Task,
  type RecurringRule,
} from '@/lib/tasks/actions'

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

export function TaskForm({ task, staff, stations, defaultDate, onDone }: Props) {
  const router = useRouter()
  const isEditing = !!task

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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      if (isEditing) {
        const input: UpdateTaskInput = {
          title: form.title,
          description: form.description || null,
          assigned_to: form.assigned_to || null,
          station_id: form.station_id || null,
          due_date: form.due_date,
          due_time: form.due_time || null,
          priority: form.priority as CreateTaskInput['priority'],
          notes: form.notes || null,
          recurring_rule: recurringRule,
        }
        await updateTask(task!.id, input)
      } else {
        const input: CreateTaskInput = {
          title: form.title,
          description: form.description || undefined,
          assigned_to: form.assigned_to || null,
          station_id: form.station_id || null,
          due_date: form.due_date,
          due_time: form.due_time || null,
          priority: form.priority as CreateTaskInput['priority'],
          notes: form.notes || undefined,
          recurring_rule: recurringRule,
        }
        await createTask(input)
      }

      router.refresh()
      onDone?.()

      // Reset form if creating new
      if (!isEditing) {
        setForm({
          title: '',
          description: '',
          assigned_to: '',
          station_id: '',
          due_date: form.due_date,
          due_time: '',
          priority: 'medium',
          notes: '',
        })
        setRecurringRule(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <Input
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
            label="Due date"
            type="date"
            value={form.due_date}
            onChange={(e) => update('due_date', e.target.value)}
            required
          />
        </div>

        <div>
          <Input
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
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Actions */}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving...' : isEditing ? 'Update Task' : 'Create Task'}
        </Button>
        {onDone && (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
