'use client'

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  createRecurringSchedule,
  updateRecurringSchedule,
  type RecurringSchedule,
  type Frequency,
  type CreateRecurringScheduleData,
} from '@/lib/scheduling/recurring-actions'

const DAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 Weeks' },
  { value: 'monthly', label: 'Monthly' },
]

interface ClientOption {
  id: string
  fullName: string
}

interface MenuOption {
  id: string
  name: string
}

interface RecurringScheduleFormProps {
  clients: ClientOption[]
  menus: MenuOption[]
  editingSchedule?: RecurringSchedule | null
  onSaved?: () => void
  onCancel?: () => void
}

export function RecurringScheduleForm({
  clients,
  menus,
  editingSchedule,
  onSaved,
  onCancel,
}: RecurringScheduleFormProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [clientId, setClientId] = useState(editingSchedule?.clientId ?? '')
  const [title, setTitle] = useState(editingSchedule?.title ?? '')
  const [frequency, setFrequency] = useState<Frequency>(editingSchedule?.frequency ?? 'weekly')
  const [dayOfWeek, setDayOfWeek] = useState<number>(editingSchedule?.dayOfWeek ?? 1)
  const [preferredTime, setPreferredTime] = useState(editingSchedule?.preferredTime ?? '18:00')
  const [menuId, setMenuId] = useState(editingSchedule?.menuId ?? '')
  const [guestCount, setGuestCount] = useState(editingSchedule?.guestCount ?? 2)
  const [notes, setNotes] = useState(editingSchedule?.notes ?? '')

  const isEditing = !!editingSchedule

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!clientId) {
      setError('Please select a client')
      return
    }
    if (!title.trim()) {
      setError('Please enter a title')
      return
    }

    startTransition(async () => {
      try {
        if (isEditing) {
          await updateRecurringSchedule(editingSchedule!.id, {
            title: title.trim(),
            frequency,
            dayOfWeek,
            preferredTime: preferredTime || undefined,
            menuId: menuId || null,
            guestCount,
            notes: notes.trim() || undefined,
          })
        } else {
          await createRecurringSchedule({
            clientId,
            title: title.trim(),
            frequency,
            dayOfWeek,
            preferredTime: preferredTime || undefined,
            menuId: menuId || undefined,
            guestCount,
            notes: notes.trim() || undefined,
          })
        }
        onSaved?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save schedule')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold">
        {isEditing ? 'Edit Recurring Schedule' : 'New Recurring Schedule'}
      </h3>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Client Picker */}
      {!isEditing && (
        <div>
          <label className="block text-sm font-medium mb-1">Client</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
            required
          >
            <option value="">Select a client...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Weekly Meal Prep, Sunday Dinner"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
          required
        />
      </div>

      {/* Frequency */}
      <div>
        <label className="block text-sm font-medium mb-1">Frequency</label>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as Frequency)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
        >
          {FREQUENCY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Day of Week */}
      <div>
        <label className="block text-sm font-medium mb-1">Day of Week</label>
        <select
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(Number(e.target.value))}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
        >
          {DAY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Preferred Time */}
      <div>
        <label className="block text-sm font-medium mb-1">Preferred Time</label>
        <input
          type="time"
          value={preferredTime}
          onChange={(e) => setPreferredTime(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
        />
      </div>

      {/* Menu Assignment */}
      <div>
        <label className="block text-sm font-medium mb-1">Menu (optional)</label>
        <select
          value={menuId}
          onChange={(e) => setMenuId(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
        >
          <option value="">No menu assigned</option>
          {menus.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {/* Guest Count */}
      <div>
        <label className="block text-sm font-medium mb-1">Guest Count</label>
        <input
          type="number"
          min={1}
          max={500}
          value={guestCount}
          onChange={(e) => setGuestCount(Number(e.target.value))}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Any special instructions or preferences..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button type="submit" variant="primary" disabled={isPending}>
          {isPending ? 'Saving...' : isEditing ? 'Update Schedule' : 'Create Schedule'}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
