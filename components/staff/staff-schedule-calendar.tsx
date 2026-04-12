'use client'

// Staff Schedule Calendar
// Weekly calendar view showing staff shifts as colored blocks.
// Rows = staff members, columns = days of the week.

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { getStaffSchedules, deleteShift } from '@/lib/staff/staff-scheduling-actions'
import { listStaffMembers } from '@/lib/staff/actions'
import { ShiftForm } from './shift-form'

type StaffMember = {
  id: string
  name: string
  role: string
  hourly_rate_cents: number
}

type Shift = {
  id: string
  staff_member_id: string
  event_id: string | null
  shift_date: string
  start_time: string
  end_time: string
  role: string
  status: string
  hourly_rate_cents: number | null
  notes: string | null
  actual_start: string | null
  actual_end: string | null
  staff_members: { id: string; name: string; role: string; hourly_rate_cents: number } | null
  events: { id: string; title: string } | null
}

const ROLE_COLORS: Record<string, string> = {
  assistant: 'bg-brand-100 border-brand-300 text-brand-800',
  sous_chef: 'bg-purple-100 border-purple-300 text-purple-800',
  server: 'bg-green-100 border-green-300 text-green-800',
  bartender: 'bg-amber-100 border-amber-300 text-amber-800',
  prep_cook: 'bg-orange-100 border-orange-300 text-orange-800',
  cleanup: 'bg-stone-100 border-stone-300 text-stone-800',
  other: 'bg-gray-100 border-gray-300 text-gray-800',
}

const STATUS_BADGES: Record<string, string> = {
  scheduled: 'bg-stone-200 text-stone-700',
  confirmed: 'bg-brand-200 text-brand-700',
  checked_in: 'bg-green-200 text-green-700',
  checked_out: 'bg-stone-300 text-stone-700',
  no_show: 'bg-red-200 text-red-700',
  cancelled: 'bg-red-100 text-red-500',
}

function getWeekDates(date: Date): Date[] {
  const day = date.getDay()
  const monday = new Date(date)
  monday.setDate(date.getDate() - ((day + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDayHeader(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime(t: string): string {
  const [h, m] = t.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${display}:${m} ${ampm}`
}

export function StaffScheduleCalendar() {
  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((day + 6) % 7))
    return monday
  })
  const [shifts, setShifts] = useState<Shift[]>([])
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [filterStaffId, setFilterStaffId] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [editingShift, setEditingShift] = useState<Shift | null>(null)
  const [prefillDate, setPrefillDate] = useState<string | null>(null)
  const [prefillStaffId, setPrefillStaffId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const weekDates = getWeekDates(weekStart)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, filterStaffId])

  async function loadData() {
    setError(null)
    try {
      const dateFrom = formatDate(weekDates[0])
      const dateTo = formatDate(weekDates[6])
      const [schedules, members] = await Promise.all([
        getStaffSchedules({
          dateFrom,
          dateTo,
          staffId: filterStaffId || undefined,
        }),
        listStaffMembers(),
      ])
      setShifts(schedules as Shift[])
      setStaffMembers(members as StaffMember[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load schedule')
    }
  }

  function navigateWeek(delta: number) {
    const next = new Date(weekStart)
    next.setDate(weekStart.getDate() + delta * 7)
    setWeekStart(next)
  }

  function handleCellClick(date: Date, staffId: string) {
    setPrefillDate(formatDate(date))
    setPrefillStaffId(staffId)
    setEditingShift(null)
    setShowForm(true)
  }

  function handleEditShift(shift: Shift) {
    setEditingShift(shift)
    setPrefillDate(null)
    setPrefillStaffId(null)
    setShowForm(true)
  }

  function handleDeleteShift(shiftId: string) {
    startTransition(async () => {
      const previous = shifts
      setShifts((s) => s.filter((x) => x.id !== shiftId))
      try {
        await deleteShift(shiftId)
      } catch (err) {
        setShifts(previous)
        setError(err instanceof Error ? err.message : 'Failed to delete shift')
      }
    })
  }

  function handleFormDone() {
    setShowForm(false)
    setEditingShift(null)
    setPrefillDate(null)
    setPrefillStaffId(null)
    loadData()
  }

  // Group shifts by staff member
  const displayStaff = filterStaffId
    ? staffMembers.filter((m) => m.id === filterStaffId)
    : staffMembers

  function getShiftsForCell(staffId: string, date: string): Shift[] {
    return shifts.filter((s) => s.staff_member_id === staffId && s.shift_date === date)
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigateWeek(-1)}>
            &larr; Prev
          </Button>
          <span className="text-sm font-medium text-stone-700">
            {formatDayHeader(weekDates[0])} - {formatDayHeader(weekDates[6])}
          </span>
          <Button variant="ghost" onClick={() => navigateWeek(1)}>
            Next &rarr;
          </Button>
          <Button
            variant="ghost"
            onClick={() => setWeekStart(getWeekDates(new Date())[0])}
            className="text-xs"
          >
            Today
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={filterStaffId}
            onChange={(e) => setFilterStaffId(e.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm"
          >
            <option value="">All Staff</option>
            {staffMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <Button
            onClick={() => {
              setEditingShift(null)
              setPrefillDate(null)
              setPrefillStaffId(null)
              setShowForm(true)
            }}
          >
            + Add Shift
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Shift Form Modal */}
      {showForm && (
        <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-stone-800">
              {editingShift ? 'Edit Shift' : 'New Shift'}
            </h3>
            <Button variant="ghost" onClick={() => setShowForm(false)} className="text-xs">
              Close
            </Button>
          </div>
          <ShiftForm
            shift={editingShift ?? undefined}
            prefillDate={prefillDate ?? undefined}
            prefillStaffId={prefillStaffId ?? undefined}
            onDone={handleFormDone}
          />
        </div>
      )}

      {/* Calendar Grid */}
      <div className="overflow-x-auto rounded-lg border border-stone-200">
        <table className="w-full min-w-[800px] table-fixed">
          <thead>
            <tr className="bg-stone-50">
              <th className="w-40 border-b border-r border-stone-200 px-3 py-2 text-left text-xs font-medium text-stone-500">
                Staff
              </th>
              {weekDates.map((d) => {
                const isToday = formatDate(d) === formatDate(new Date())
                return (
                  <th
                    key={formatDate(d)}
                    className={`border-b border-r border-stone-200 px-2 py-2 text-center text-xs font-medium ${
                      isToday ? 'bg-amber-50 text-amber-700' : 'text-stone-500'
                    }`}
                  >
                    {formatDayHeader(d)}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {displayStaff.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-stone-400">
                  No staff members found. Add staff to your roster first.
                </td>
              </tr>
            )}
            {displayStaff.map((member) => (
              <tr key={member.id} className="hover:bg-stone-50/50">
                <td className="border-b border-r border-stone-200 px-3 py-2">
                  <div className="text-sm font-medium text-stone-800">{member.name}</div>
                  <div className="text-xs text-stone-400">{member.role.replace(/_/g, ' ')}</div>
                </td>
                {weekDates.map((d) => {
                  const dateStr = formatDate(d)
                  const cellShifts = getShiftsForCell(member.id, dateStr)
                  return (
                    <td
                      key={dateStr}
                      className="border-b border-r border-stone-200 px-1 py-1 align-top cursor-pointer hover:bg-stone-100/50"
                      onClick={() => handleCellClick(d, member.id)}
                    >
                      <div className="space-y-1 min-h-[48px]">
                        {cellShifts.map((shift) => (
                          <div
                            key={shift.id}
                            className={`rounded border px-1.5 py-1 text-xs cursor-pointer ${
                              ROLE_COLORS[shift.role] ?? ROLE_COLORS.other
                            }`}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditShift(shift)
                            }}
                          >
                            <div className="font-medium">
                              {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                            </div>
                            {shift.events && (
                              <div className="truncate text-xxs opacity-75">
                                {shift.events.title}
                              </div>
                            )}
                            <div className="flex items-center gap-1 mt-0.5">
                              <span
                                className={`inline-block rounded px-1 py-0.5 text-xxs ${
                                  STATUS_BADGES[shift.status] ?? ''
                                }`}
                              >
                                {shift.status.replace(/_/g, ' ')}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteShift(shift.id)
                                }}
                                className="ml-auto text-xxs text-red-400 hover:text-red-600"
                                title="Delete shift"
                              >
                                x
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isPending && <div className="text-center text-xs text-stone-400">Updating...</div>}
    </div>
  )
}
