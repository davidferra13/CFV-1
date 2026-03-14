'use client'

// Drag Schedule — week view staff scheduling grid.
// 7-column layout (Mon-Sun) with event cards showing assigned staff.
// Uses click-to-assign pattern (no drag-and-drop library required).

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar, ChevronLeft, ChevronRight, UserPlus, X, Users, Check } from 'lucide-react'
import { assignStaffToEvent } from '@/lib/staff/actions'

// ─── Types ────────────────────────────────────────────────────────────────────

type ScheduleEvent = {
  id: string
  name: string
  date: string
  staffAssigned: string[]
}

type StaffMember = {
  id: string
  name: string
}

interface DragScheduleProps {
  events: ScheduleEvent[]
  staffMembers: StaffMember[]
  weekStart: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function getMonday(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function generateWeekDates(mondayStr: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(mondayStr, i))
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  return `${months[d.getMonth()]} ${d.getDate()}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DragSchedule({
  events: initialEvents,
  staffMembers,
  weekStart,
}: DragScheduleProps) {
  const monday = getMonday(weekStart)
  const [currentMonday, setCurrentMonday] = useState(monday)
  const [events, setEvents] = useState<ScheduleEvent[]>(initialEvents)
  const [pickerEventId, setPickerEventId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const weekDates = generateWeekDates(currentMonday)
  const todayStr = new Date().toISOString().split('T')[0]

  // Build staff name lookup
  const staffNameMap = new Map(staffMembers.map((s) => [s.id, s.name]))

  // Group events by date
  const eventsByDate = new Map<string, ScheduleEvent[]>()
  for (const date of weekDates) {
    eventsByDate.set(date, [])
  }
  for (const evt of events) {
    const bucket = eventsByDate.get(evt.date)
    if (bucket) {
      bucket.push(evt)
    }
  }

  function handlePrevWeek() {
    setCurrentMonday(addDays(currentMonday, -7))
    setPickerEventId(null)
  }

  function handleNextWeek() {
    setCurrentMonday(addDays(currentMonday, 7))
    setPickerEventId(null)
  }

  function handleToday() {
    setCurrentMonday(getMonday(todayStr))
    setPickerEventId(null)
  }

  function togglePicker(eventId: string) {
    setPickerEventId((prev) => (prev === eventId ? null : eventId))
  }

  function handleAssignStaff(eventId: string, staffId: string) {
    // Optimistic update
    setEvents((prev) =>
      prev.map((evt) =>
        evt.id === eventId ? { ...evt, staffAssigned: [...evt.staffAssigned, staffId] } : evt
      )
    )
    setPickerEventId(null)

    startTransition(async () => {
      try {
        await assignStaffToEvent({
          event_id: eventId,
          staff_member_id: staffId,
        })
      } catch {
        // Revert on failure
        setEvents((prev) =>
          prev.map((evt) =>
            evt.id === eventId
              ? { ...evt, staffAssigned: evt.staffAssigned.filter((id) => id !== staffId) }
              : evt
          )
        )
      }
    })
  }

  // Week range label
  const weekLabel = `${formatDate(weekDates[0])} \u2013 ${formatDate(weekDates[6])}`

  // Count total events this week
  const totalEventsThisWeek = events.filter((evt) => weekDates.includes(evt.date)).length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-stone-500" />
            <CardTitle>Staff Schedule</CardTitle>
            {totalEventsThisWeek > 0 && (
              <Badge variant="info">
                {totalEventsThisWeek} event{totalEventsThisWeek !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handlePrevWeek} disabled={isPending}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleToday} disabled={isPending}>
              Today
            </Button>
            <span className="text-sm text-stone-400 min-w-[150px] text-center font-medium">
              {weekLabel}
            </span>
            <Button variant="ghost" size="sm" onClick={handleNextWeek} disabled={isPending}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {/* Day Headers */}
          {weekDates.map((date, idx) => {
            const isToday = date === todayStr
            const d = new Date(date + 'T00:00:00')
            return (
              <div
                key={date}
                className={`text-center pb-2 border-b-2 ${
                  isToday ? 'border-brand-500' : 'border-stone-700'
                }`}
              >
                <div
                  className={`text-xs font-medium ${isToday ? 'text-brand-600' : 'text-stone-500'}`}
                >
                  {DAY_LABELS[idx]}
                </div>
                <div
                  className={`text-lg font-semibold ${isToday ? 'text-brand-600' : 'text-stone-100'}`}
                >
                  {d.getDate()}
                </div>
              </div>
            )
          })}

          {/* Day Columns */}
          {weekDates.map((date) => {
            const dayEvents = eventsByDate.get(date) || []
            const isToday = date === todayStr
            return (
              <div
                key={date}
                className={`min-h-[120px] rounded-lg p-1.5 space-y-2 ${
                  isToday ? 'bg-brand-950/50' : 'bg-stone-800/50'
                }`}
              >
                {dayEvents.length === 0 && (
                  <p className="text-xs text-stone-400 text-center py-4">\u2014</p>
                )}
                {dayEvents.map((evt) => {
                  const isPickerOpen = pickerEventId === evt.id
                  const assignedStaff = evt.staffAssigned
                    .map((id) => staffNameMap.get(id))
                    .filter(Boolean)
                  const unassignedStaff = staffMembers.filter(
                    (s) => !evt.staffAssigned.includes(s.id)
                  )

                  return (
                    <div
                      key={evt.id}
                      className="bg-stone-900 rounded-lg border border-stone-700 shadow-sm p-2"
                    >
                      {/* Event Name */}
                      <div className="text-xs font-semibold text-stone-100 truncate mb-1.5">
                        {evt.name}
                      </div>

                      {/* Assigned Staff */}
                      {assignedStaff.length > 0 ? (
                        <div className="space-y-0.5 mb-1.5">
                          {assignedStaff.map((name, i) => (
                            <div key={i} className="flex items-center gap-1 text-xs text-stone-400">
                              <Check className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                              <span className="truncate">{name}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-xs text-stone-400 mb-1.5">
                          <Users className="h-3 w-3" />
                          <span>No staff assigned</span>
                        </div>
                      )}

                      {/* Assign Button */}
                      <button
                        onClick={() => togglePicker(evt.id)}
                        disabled={isPending || unassignedStaff.length === 0}
                        className="w-full flex items-center justify-center gap-1 px-2 py-1 text-xs rounded border border-dashed border-stone-600 text-stone-500 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-950 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isPickerOpen ? (
                          <>
                            <X className="h-3 w-3" />
                            Cancel
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-3 w-3" />
                            Assign
                          </>
                        )}
                      </button>

                      {/* Staff Picker Dropdown */}
                      {isPickerOpen && unassignedStaff.length > 0 && (
                        <div className="mt-1.5 bg-stone-800 rounded border border-stone-700 p-1 space-y-0.5 max-h-[120px] overflow-y-auto">
                          {unassignedStaff.map((staff) => (
                            <button
                              key={staff.id}
                              onClick={() => handleAssignStaff(evt.id, staff.id)}
                              disabled={isPending}
                              className="w-full text-left px-2 py-1 text-xs rounded hover:bg-stone-800 hover:shadow-sm transition-colors text-stone-300 disabled:opacity-50"
                            >
                              {staff.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {/* Staff Roster Summary */}
        {staffMembers.length > 0 && (
          <div className="mt-4 pt-4 border-t border-stone-800">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-stone-400" />
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">
                Staff Roster
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {staffMembers.map((staff) => {
                // Count how many events this staff member is assigned to this week
                const assignmentCount = events.filter(
                  (evt) => weekDates.includes(evt.date) && evt.staffAssigned.includes(staff.id)
                ).length

                return (
                  <Badge key={staff.id} variant={assignmentCount > 0 ? 'success' : 'default'}>
                    {staff.name}
                    {assignmentCount > 0 && (
                      <span className="ml-1 opacity-75">{assignmentCount}</span>
                    )}
                  </Badge>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
