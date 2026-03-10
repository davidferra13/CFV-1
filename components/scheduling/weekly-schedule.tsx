'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  createShift,
  updateShift,
  deleteShift,
  publishWeek,
  copyWeekSchedule,
  autoFillWeek,
} from '@/lib/scheduling/shift-actions'

type StaffMember = { id: string; name: string; role: string; hourly_rate_cents: number }
type ShiftTemplate = {
  id: string
  name: string
  start_time: string
  end_time: string
  break_minutes: number
  color: string
}
type Shift = {
  id: string
  staff_member_id: string
  template_id: string | null
  shift_date: string
  start_time: string
  end_time: string
  break_minutes: number
  role: string | null
  status: string
  notes: string | null
  staff_members?: { id: string; name: string; hourly_rate_cents: number }
}
type AvailabilityRecord = {
  staff_member_id: string
  day_of_week: number
  available: boolean
  preferred_start: string | null
  preferred_end: string | null
}
type LaborCostDay = { date: string; totalCostCents: number; totalHours: number; shiftCount: number }

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const ROLE_OPTIONS = ['cook', 'server', 'prep', 'dishwasher', 'manager', 'driver']
const ROLE_COLORS: Record<string, string> = {
  cook: '#EF4444',
  server: '#3B82F6',
  prep: '#F59E0B',
  dishwasher: '#6B7280',
  manager: '#8B5CF6',
  driver: '#10B981',
}

function getMonday(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().slice(0, 10)
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 || 12
  return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

type ShiftFormData = {
  staff_member_id: string
  template_id: string | null
  shift_date: string
  start_time: string
  end_time: string
  break_minutes: number
  role: string | null
  notes: string | null
}

export function WeeklySchedule({
  initialShifts,
  staffMembers,
  templates,
  availability,
  laborByDay,
  initialWeekStart,
}: {
  initialShifts: Shift[]
  staffMembers: StaffMember[]
  templates: ShiftTemplate[]
  availability: AvailabilityRecord[]
  laborByDay: LaborCostDay[]
  initialWeekStart: string
}) {
  const [weekStart, setWeekStart] = useState(initialWeekStart)
  const [shifts, setShifts] = useState(initialShifts)
  const [dailyLabor, setDailyLabor] = useState(laborByDay)
  const [isPending, startTransition] = useTransition()
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [addingCell, setAddingCell] = useState<{ staffId: string; date: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Build availability map: staffId -> dayOfWeek -> record
  const availMap: Record<string, Record<number, AvailabilityRecord>> = {}
  for (const a of availability) {
    if (!availMap[a.staff_member_id]) availMap[a.staff_member_id] = {}
    availMap[a.staff_member_id][a.day_of_week] = a
  }

  // Build shift lookup: date -> staffId -> shifts
  const shiftMap: Record<string, Record<string, Shift[]>> = {}
  for (const s of shifts) {
    if (!shiftMap[s.shift_date]) shiftMap[s.shift_date] = {}
    if (!shiftMap[s.shift_date][s.staff_member_id]) shiftMap[s.shift_date][s.staff_member_id] = []
    shiftMap[s.shift_date][s.staff_member_id].push(s)
  }

  const dates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  function navigateWeek(direction: number) {
    const newStart = addDays(weekStart, direction * 7)
    setWeekStart(newStart)
    // Reload data via page navigation
    window.location.href = `/scheduling/shifts?week=${newStart}`
  }

  async function handlePublish() {
    const previous = [...shifts]
    setShifts(shifts.map((s) => (s.status === 'scheduled' ? { ...s, status: 'confirmed' } : s)))
    startTransition(async () => {
      try {
        await publishWeek(weekStart)
      } catch (err: any) {
        setShifts(previous)
        setError(err.message ?? 'Failed to publish week')
      }
    })
  }

  async function handleCopyWeek() {
    const targetWeek = addDays(weekStart, 7)
    startTransition(async () => {
      try {
        const result = await copyWeekSchedule(weekStart, targetWeek)
        if (result.copied > 0) {
          window.location.href = `/scheduling/shifts?week=${targetWeek}`
        }
      } catch (err: any) {
        setError(err.message ?? 'Failed to copy week')
      }
    })
  }

  async function handleAutoFill() {
    startTransition(async () => {
      try {
        const result = await autoFillWeek(weekStart)
        if (result.created > 0) {
          window.location.reload()
        }
      } catch (err: any) {
        setError(err.message ?? 'Failed to auto-fill')
      }
    })
  }

  async function handleAddShift(formData: ShiftFormData) {
    startTransition(async () => {
      try {
        await createShift(formData)
        setAddingCell(null)
        window.location.reload()
      } catch (err: any) {
        setError(err.message ?? 'Failed to add shift')
      }
    })
  }

  async function handleUpdateShift(shiftId: string, formData: Partial<ShiftFormData>) {
    startTransition(async () => {
      try {
        await updateShift(shiftId, formData)
        setEditingShift(null)
        window.location.reload()
      } catch (err: any) {
        setError(err.message ?? 'Failed to update shift')
      }
    })
  }

  async function handleDeleteShift(shiftId: string) {
    const previous = [...shifts]
    setShifts(shifts.filter((s) => s.id !== shiftId))
    setEditingShift(null)
    startTransition(async () => {
      try {
        await deleteShift(shiftId)
      } catch (err: any) {
        setShifts(previous)
        setError(err.message ?? 'Failed to delete shift')
      }
    })
  }

  // Total labor cost for the week
  const weekTotalCents = dailyLabor.reduce((sum, d) => sum + d.totalCostCents, 0)
  const weekTotalHours = dailyLabor.reduce((sum, d) => sum + d.totalHours, 0)

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md border border-red-800 bg-red-950 p-3 text-sm text-red-200">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-200">
            Dismiss
          </button>
        </div>
      )}

      {/* Week navigation and actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => navigateWeek(-1)}>
            Previous
          </Button>
          <h2 className="text-lg font-semibold text-stone-100">
            Week of{' '}
            {new Date(weekStart).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </h2>
          <Button variant="secondary" size="sm" onClick={() => navigateWeek(1)}>
            Next
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleAutoFill} disabled={isPending}>
            Auto-Fill
          </Button>
          <Button variant="secondary" size="sm" onClick={handleCopyWeek} disabled={isPending}>
            Copy to Next Week
          </Button>
          <Button variant="primary" size="sm" onClick={handlePublish} disabled={isPending}>
            Publish Week
          </Button>
        </div>
      </div>

      {/* Schedule grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="w-36 border border-stone-700 bg-stone-800 p-2 text-left text-xs font-medium text-stone-300">
                Staff
              </th>
              {dates.map((date, i) => (
                <th
                  key={date}
                  className="border border-stone-700 bg-stone-800 p-2 text-center text-xs font-medium text-stone-300"
                >
                  <div>{DAY_LABELS[i]}</div>
                  <div className="text-stone-500">{new Date(date).getDate()}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staffMembers.map((staff) => (
              <tr key={staff.id}>
                <td className="border border-stone-700 bg-stone-900 p-2 text-sm text-stone-200">
                  <div className="font-medium">{staff.name}</div>
                  <div className="text-xs text-stone-500">{staff.role}</div>
                </td>
                {dates.map((date, dayIdx) => {
                  // Monday=1 in JS Date but our grid is Mon-Sun
                  const jsDay = new Date(date).getDay() // 0=Sun
                  const staffAvail = availMap[staff.id]?.[jsDay]
                  const isUnavailable = staffAvail?.available === false
                  const cellShifts = shiftMap[date]?.[staff.id] ?? []

                  return (
                    <td
                      key={date}
                      className={`border border-stone-700 p-1 align-top ${
                        isUnavailable
                          ? 'bg-stone-800/50 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(120,113,108,0.15)_4px,rgba(120,113,108,0.15)_8px)]'
                          : 'bg-stone-900'
                      }`}
                      style={{ minWidth: '120px', minHeight: '60px' }}
                    >
                      <div className="space-y-1">
                        {cellShifts.map((shift) => (
                          <button
                            key={shift.id}
                            onClick={() => setEditingShift(shift)}
                            className="block w-full rounded px-1.5 py-1 text-left text-xs text-white transition-opacity hover:opacity-80"
                            style={{
                              backgroundColor: shift.role
                                ? (ROLE_COLORS[shift.role] ?? '#3B82F6')
                                : '#3B82F6',
                            }}
                          >
                            <div className="font-medium">
                              {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                            </div>
                            {shift.role && <div className="opacity-80">{shift.role}</div>}
                            <div className="opacity-60">{shift.status}</div>
                          </button>
                        ))}
                        {!isUnavailable && (
                          <button
                            onClick={() => setAddingCell({ staffId: staff.id, date })}
                            className="w-full rounded border border-dashed border-stone-600 p-1 text-xs text-stone-500 hover:border-stone-400 hover:text-stone-300"
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Labor cost summary bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Weekly Labor Cost</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex gap-4">
              {dailyLabor.map((day, i) => (
                <div key={day.date} className="text-center">
                  <div className="text-xs text-stone-400">{DAY_LABELS[i]}</div>
                  <div className="text-sm font-medium text-stone-200">
                    {formatCents(day.totalCostCents)}
                  </div>
                  <div className="text-xs text-stone-500">{day.totalHours}h</div>
                </div>
              ))}
            </div>
            <div className="border-l border-stone-700 pl-4 text-right">
              <div className="text-xs text-stone-400">Week Total</div>
              <div className="text-lg font-bold text-stone-100">{formatCents(weekTotalCents)}</div>
              <div className="text-sm text-stone-400">
                {Math.round(weekTotalHours * 100) / 100} hours
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add shift modal */}
      {addingCell && (
        <ShiftFormModal
          title="Add Shift"
          staffId={addingCell.staffId}
          date={addingCell.date}
          templates={templates}
          isPending={isPending}
          onSubmit={(data) => handleAddShift(data)}
          onClose={() => setAddingCell(null)}
        />
      )}

      {/* Edit shift modal */}
      {editingShift && (
        <ShiftFormModal
          title="Edit Shift"
          staffId={editingShift.staff_member_id}
          date={editingShift.shift_date}
          templates={templates}
          isPending={isPending}
          initialValues={editingShift}
          onSubmit={(data) => handleUpdateShift(editingShift.id, data)}
          onDelete={() => handleDeleteShift(editingShift.id)}
          onClose={() => setEditingShift(null)}
        />
      )}
    </div>
  )
}

// ============================================
// Shift Form Modal
// ============================================

function ShiftFormModal({
  title,
  staffId,
  date,
  templates,
  isPending,
  initialValues,
  onSubmit,
  onDelete,
  onClose,
}: {
  title: string
  staffId: string
  date: string
  templates: ShiftTemplate[]
  isPending: boolean
  initialValues?: Partial<Shift>
  onSubmit: (data: ShiftFormData) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const [templateId, setTemplateId] = useState(initialValues?.template_id ?? '')
  const [startTime, setStartTime] = useState(initialValues?.start_time ?? '09:00')
  const [endTime, setEndTime] = useState(initialValues?.end_time ?? '17:00')
  const [breakMins, setBreakMins] = useState(initialValues?.break_minutes ?? 0)
  const [role, setRole] = useState(initialValues?.role ?? '')
  const [notes, setNotes] = useState(initialValues?.notes ?? '')

  function handleTemplateChange(tplId: string) {
    setTemplateId(tplId)
    const tpl = templates.find((t) => t.id === tplId)
    if (tpl) {
      setStartTime(tpl.start_time)
      setEndTime(tpl.end_time)
      setBreakMins(tpl.break_minutes)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      staff_member_id: staffId,
      template_id: templateId || null,
      shift_date: date,
      start_time: startTime,
      end_time: endTime,
      break_minutes: breakMins,
      role: role || null,
      notes: notes || null,
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-stone-700 bg-stone-900 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-lg font-semibold text-stone-100">{title}</h3>
        <p className="mb-4 text-sm text-stone-400">
          {new Date(date).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          })}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          {templates.length > 0 && (
            <div>
              <label className="mb-1 block text-xs text-stone-400">Template</label>
              <select
                value={templateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="h-9 w-full rounded border border-stone-700 bg-stone-800 px-2 text-sm text-stone-200"
              >
                <option value="">Custom times</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({formatTime(t.start_time)} - {formatTime(t.end_time)})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-stone-400">Start</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="h-9 w-full rounded border border-stone-700 bg-stone-800 px-2 text-sm text-stone-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-stone-400">End</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="h-9 w-full rounded border border-stone-700 bg-stone-800 px-2 text-sm text-stone-200"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-stone-400">Break (min)</label>
              <input
                type="number"
                value={breakMins}
                onChange={(e) => setBreakMins(Number(e.target.value))}
                min={0}
                className="h-9 w-full rounded border border-stone-700 bg-stone-800 px-2 text-sm text-stone-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-stone-400">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-9 w-full rounded border border-stone-700 bg-stone-800 px-2 text-sm text-stone-200"
              >
                <option value="">None</option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-stone-400">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded border border-stone-700 bg-stone-800 p-2 text-sm text-stone-200"
            />
          </div>
          <div className="flex justify-between pt-2">
            <div>
              {onDelete && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={onDelete}
                  disabled={isPending}
                >
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isPending}>
                Save
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
