'use client'

// Shift Form
// Create or edit a staff shift assignment.

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  createShift,
  updateShift,
  type CreateShiftInput,
} from '@/lib/staff/staff-scheduling-actions'
import { listStaffMembers } from '@/lib/staff/actions'

const SHIFT_ROLES = [
  { value: 'assistant', label: 'Assistant' },
  { value: 'sous_chef', label: 'Sous Chef' },
  { value: 'server', label: 'Server' },
  { value: 'bartender', label: 'Bartender' },
  { value: 'prep_cook', label: 'Prep Cook' },
  { value: 'cleanup', label: 'Cleanup' },
  { value: 'other', label: 'Other' },
] as const

type ShiftData = {
  id: string
  staff_member_id: string
  event_id: string | null
  shift_date: string
  start_time: string
  end_time: string
  role: string
  hourly_rate_cents: number | null
  notes: string | null
}

type StaffMember = {
  id: string
  name: string
  role: string
  hourly_rate_cents: number
}

type Props = {
  shift?: ShiftData
  prefillDate?: string
  prefillStaffId?: string
  onDone?: () => void
}

export function ShiftForm({ shift, prefillDate, prefillStaffId, onDone }: Props) {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    staff_member_id: shift?.staff_member_id ?? prefillStaffId ?? '',
    event_id: shift?.event_id ?? '',
    shift_date: shift?.shift_date ?? prefillDate ?? new Date().toISOString().split('T')[0],
    start_time: shift?.start_time?.slice(0, 5) ?? '09:00',
    end_time: shift?.end_time?.slice(0, 5) ?? '17:00',
    role: shift?.role ?? 'assistant',
    hourly_rate_dollars: shift?.hourly_rate_cents != null
      ? (shift.hourly_rate_cents / 100).toFixed(2)
      : '',
    notes: shift?.notes ?? '',
  })

  useEffect(() => {
    listStaffMembers().then((members) => {
      setStaffMembers(members as StaffMember[])
    }).catch(() => {
      // Non-blocking, form still works if staff list fails to load
      console.error('[ShiftForm] Failed to load staff members')
    })
  }, [])

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.staff_member_id) {
      setError('Please select a staff member')
      return
    }

    const input: CreateShiftInput = {
      staff_member_id: form.staff_member_id,
      event_id: form.event_id || null,
      shift_date: form.shift_date,
      start_time: form.start_time,
      end_time: form.end_time,
      role: form.role as CreateShiftInput['role'],
      hourly_rate_cents: form.hourly_rate_dollars
        ? Math.round(parseFloat(form.hourly_rate_dollars) * 100)
        : null,
      notes: form.notes || undefined,
    }

    startTransition(async () => {
      try {
        if (shift) {
          await updateShift(shift.id, input)
        } else {
          await createShift(input)
        }
        onDone?.()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save shift')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Staff Member
          </label>
          <select
            value={form.staff_member_id}
            onChange={(e) => update('staff_member_id', e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            required
          >
            <option value="">Select staff...</option>
            {staffMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.role.replace(/_/g, ' ')})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Event (optional)
          </label>
          <Input
            value={form.event_id}
            onChange={(e) => update('event_id', e.target.value)}
            placeholder="Event ID (optional)"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Date</label>
          <Input
            type="date"
            value={form.shift_date}
            onChange={(e) => update('shift_date', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Start Time</label>
          <Input
            type="time"
            value={form.start_time}
            onChange={(e) => update('start_time', e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">End Time</label>
          <Input
            type="time"
            value={form.end_time}
            onChange={(e) => update('end_time', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Role</label>
          <select
            value={form.role}
            onChange={(e) => update('role', e.target.value)}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
          >
            {SHIFT_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Hourly Rate ($)
          </label>
          <Input
            type="number"
            value={form.hourly_rate_dollars}
            onChange={(e) => update('hourly_rate_dollars', e.target.value)}
            placeholder="Leave blank to use default"
            min="0"
            step="0.01"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => update('notes', e.target.value)}
          rows={2}
          placeholder="Special instructions, parking info, dress code..."
          className="w-full rounded-lg border border-stone-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : shift ? 'Update Shift' : 'Create Shift'}
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
