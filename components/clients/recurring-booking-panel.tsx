'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Repeat } from '@/components/ui/icons'
import { toast } from 'sonner'
import type { RecurringSchedule, Frequency } from '@/lib/scheduling/recurring-actions'
import {
  createRecurringSchedule,
  updateRecurringSchedule,
  deleteRecurringSchedule,
} from '@/lib/scheduling/recurring-actions'

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 Weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
]

const DAY_OPTIONS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

interface RecurringBookingPanelProps {
  clientId: string
  clientName: string
  schedule: RecurringSchedule | null
  menus: { id: string; name: string }[]
}

export function RecurringBookingPanel({
  clientId,
  clientName,
  schedule,
  menus,
}: RecurringBookingPanelProps) {
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [title, setTitle] = useState(schedule?.title ?? `${clientName} recurring`)
  const [frequency, setFrequency] = useState<Frequency>(schedule?.frequency ?? 'monthly')
  const [dayOfWeek, setDayOfWeek] = useState<number>(schedule?.dayOfWeek ?? 6)
  const [preferredTime, setPreferredTime] = useState(schedule?.preferredTime ?? '18:00')
  const [guestCount, setGuestCount] = useState(schedule?.guestCount ?? 2)
  const [menuId, setMenuId] = useState(schedule?.menuId ?? '')
  const [leadTimeDays, setLeadTimeDays] = useState(schedule?.leadTimeDays ?? 21)
  const [autoGenerate, setAutoGenerate] = useState(schedule?.autoGenerate ?? true)
  const [occasion, setOccasion] = useState(schedule?.occasion ?? '')
  const [notes, setNotes] = useState(schedule?.notes ?? '')

  function handleSave() {
    startTransition(async () => {
      try {
        if (schedule) {
          await updateRecurringSchedule(schedule.id, {
            title,
            frequency,
            dayOfWeek,
            preferredTime: preferredTime || undefined,
            guestCount,
            menuId: menuId || null,
            leadTimeDays,
            autoGenerate,
            occasion: occasion || undefined,
            notes: notes || undefined,
          })
          toast.success('Recurring booking updated')
        } else {
          await createRecurringSchedule({
            clientId,
            title,
            frequency,
            dayOfWeek,
            preferredTime: preferredTime || undefined,
            guestCount,
            menuId: menuId || undefined,
            leadTimeDays,
            autoGenerate,
            occasion: occasion || undefined,
            notes: notes || undefined,
          })
          toast.success('Recurring booking created')
        }
        setEditing(false)
      } catch (err) {
        toast.error('Failed to save recurring booking')
      }
    })
  }

  function handleDeactivate() {
    if (!schedule) return
    startTransition(async () => {
      try {
        await deleteRecurringSchedule(schedule.id)
        toast.success('Recurring booking deactivated')
        setEditing(false)
      } catch (err) {
        toast.error('Failed to deactivate')
      }
    })
  }

  const frequencyLabel = FREQUENCY_OPTIONS.find((f) => f.value === frequency)?.label ?? frequency
  const dayLabel = DAY_OPTIONS.find((d) => d.value === (schedule?.dayOfWeek ?? dayOfWeek))?.label

  // Display mode
  if (!editing && schedule && schedule.isActive) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Repeat className="h-4 w-4 text-brand-400" />
              Recurring Booking
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={schedule.autoGenerate ? 'success' : 'default'}>
                {schedule.autoGenerate ? 'Auto-draft ON' : 'Manual'}
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                Edit
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-stone-300">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            <div>
              <span className="text-stone-500">Frequency:</span>{' '}
              {FREQUENCY_OPTIONS.find((f) => f.value === schedule.frequency)?.label}
            </div>
            <div>
              <span className="text-stone-500">Preferred Day:</span>{' '}
              {DAY_OPTIONS.find((d) => d.value === schedule.dayOfWeek)?.label ?? 'Any'}
            </div>
            <div>
              <span className="text-stone-500">Time:</span> {schedule.preferredTime || 'TBD'}
            </div>
            <div>
              <span className="text-stone-500">Guests:</span> {schedule.guestCount}
            </div>
            {schedule.autoGenerate && (
              <div>
                <span className="text-stone-500">Lead Time:</span> {schedule.leadTimeDays} days
                before
              </div>
            )}
            {schedule.nextOccurrence && (
              <div>
                <span className="text-stone-500">Next:</span> {schedule.nextOccurrence}
              </div>
            )}
            {schedule.menuName && (
              <div className="col-span-2">
                <span className="text-stone-500">Default Menu:</span> {schedule.menuName}
              </div>
            )}
            {schedule.occasion && (
              <div className="col-span-2">
                <span className="text-stone-500">Occasion:</span> {schedule.occasion}
              </div>
            )}
          </div>
          {schedule.notes && <p className="text-xs text-stone-500">{schedule.notes}</p>}
        </CardContent>
      </Card>
    )
  }

  // Empty state or edit mode
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Repeat className="h-4 w-4 text-brand-400" />
            Recurring Booking
          </CardTitle>
          {!editing && !schedule && (
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              Set Up
            </Button>
          )}
          {editing && (
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!editing ? (
          <p className="text-sm text-stone-500">
            No recurring booking configured. Set up automatic event drafts for this client.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-stone-500">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Monthly dinner"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-stone-500">Occasion</label>
                <Input
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  placeholder="e.g. Family dinner"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-stone-500">Frequency</label>
                <select
                  className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as Frequency)}
                >
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-stone-500">Preferred Day</label>
                <select
                  className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                >
                  {DAY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="mb-1 block text-xs text-stone-500">Time</label>
                <Input
                  type="time"
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-stone-500">Guests</label>
                <Input
                  type="number"
                  min={1}
                  value={guestCount}
                  onChange={(e) => setGuestCount(Number(e.target.value) || 1)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-stone-500">Lead Time (days)</label>
                <Input
                  type="number"
                  min={1}
                  max={90}
                  value={leadTimeDays}
                  onChange={(e) => setLeadTimeDays(Number(e.target.value) || 21)}
                />
              </div>
            </div>

            {menus.length > 0 && (
              <div>
                <label className="mb-1 block text-xs text-stone-500">
                  Default Menu Template (optional)
                </label>
                <select
                  className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200"
                  value={menuId}
                  onChange={(e) => setMenuId(e.target.value)}
                >
                  <option value="">None</option>
                  {menus.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-stone-300">
                <input
                  type="checkbox"
                  checked={autoGenerate}
                  onChange={(e) => setAutoGenerate(e.target.checked)}
                  className="rounded border-stone-600"
                />
                Auto-create draft events {leadTimeDays} days before each booking
              </label>
            </div>

            <div>
              <label className="mb-1 block text-xs text-stone-500">Notes</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions for recurring bookings"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleSave} disabled={isPending || !title.trim()}>
                {isPending ? 'Saving...' : schedule ? 'Update' : 'Create Recurring Booking'}
              </Button>
              {schedule && (
                <Button variant="danger" onClick={handleDeactivate} disabled={isPending}>
                  Deactivate
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
