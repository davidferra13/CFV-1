'use client'

// Staff Schedule Board - Week-at-a-Glance Grid
// Module: station-ops
// Visual board: staff rows x day columns, event assignments as cells.
// Highlights conflicts, shows availability gaps, links to assignment.
// Deterministic: formula > AI.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { StaffSchedulerData } from '@/lib/staff/staffing-actions'

type Props = {
  data: StaffSchedulerData
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getWeekDays(startDate: string): string[] {
  const start = new Date(startDate + 'T12:00:00')
  // Find Monday of that week
  const day = start.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(start)
  monday.setDate(monday.getDate() + mondayOffset)

  const days: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
  assigned: 'bg-blue-500/20 border-blue-500/30 text-blue-400',
  pending: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
  completed: 'bg-stone-600/20 border-stone-600/30 text-stone-400',
}

export function StaffScheduleBoard({ data }: Props) {
  const weekDays = useMemo(() => getWeekDays(data.startDate), [data.startDate])
  const [hoveredStaff, setHoveredStaff] = useState<string | null>(null)

  // Build assignment map: staffId -> date -> events[]
  const assignmentMap = useMemo(() => {
    const map: Record<
      string,
      Record<
        string,
        Array<{ eventId: string; eventName: string; status: string; hours: number | null }>
      >
    > = {}
    for (const event of data.events) {
      const eventDate = event.date.split('T')[0]
      for (const assignment of event.assignments) {
        if (!map[assignment.staffMemberId]) map[assignment.staffMemberId] = {}
        if (!map[assignment.staffMemberId][eventDate]) map[assignment.staffMemberId][eventDate] = []
        map[assignment.staffMemberId][eventDate].push({
          eventId: event.id,
          eventName: event.name,
          status: assignment.status,
          hours: assignment.scheduledHours,
        })
      }
    }
    return map
  }, [data.events])

  // Staff availability lookup
  const availMap = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    for (const staff of data.staff) {
      map[staff.id] = new Set(staff.availableDates)
    }
    return map
  }, [data.staff])

  if (data.staff.length === 0) {
    return (
      <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-6 text-center">
        <p className="text-sm text-stone-500">
          No staff members. Add team members to see the schedule board.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-900/50 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-stone-800">
            <th className="text-left py-2 px-3 text-stone-500 font-medium sticky left-0 bg-stone-900 z-10 min-w-[140px]">
              Staff
            </th>
            {weekDays.map((day, i) => {
              const isToday = day === new Date().toISOString().split('T')[0]
              return (
                <th
                  key={day}
                  className={`py-2 px-2 text-center font-medium min-w-[100px] ${isToday ? 'text-brand-400 bg-brand-500/5' : 'text-stone-500'}`}
                >
                  <div>{DAY_NAMES[i]}</div>
                  <div className="text-[10px] font-normal">{formatShortDate(day)}</div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {data.staff.map((staff) => {
            const staffAssignments = assignmentMap[staff.id] || {}
            const staffAvail = availMap[staff.id] || new Set()
            const isHovered = hoveredStaff === staff.id

            return (
              <tr
                key={staff.id}
                className={`border-b border-stone-800/50 ${isHovered ? 'bg-stone-800/30' : ''}`}
                onMouseEnter={() => setHoveredStaff(staff.id)}
                onMouseLeave={() => setHoveredStaff(null)}
              >
                <td className="py-2 px-3 sticky left-0 bg-stone-900 z-10">
                  <div className="text-stone-300 font-medium truncate">{staff.name}</div>
                  <div className="text-[10px] text-stone-600">{staff.role}</div>
                </td>
                {weekDays.map((day) => {
                  const dayAssignments = staffAssignments[day] || []
                  const isAvailable = staffAvail.size === 0 || staffAvail.has(day)
                  const hasConflict = dayAssignments.length > 1

                  return (
                    <td key={day} className="py-1 px-1 text-center align-top">
                      {dayAssignments.length > 0 ? (
                        <div className="space-y-0.5">
                          {dayAssignments.map((a, i) => {
                            const colorClass = STATUS_COLORS[a.status] || STATUS_COLORS.pending
                            return (
                              <Link
                                key={i}
                                href={`/events/${a.eventId}`}
                                className={`block rounded border px-1.5 py-1 truncate hover:opacity-80 ${colorClass}`}
                                title={`${a.eventName}${a.hours ? ` (${a.hours}h)` : ''}`}
                              >
                                <div className="truncate">{a.eventName}</div>
                                {a.hours && <div className="text-[9px] opacity-70">{a.hours}h</div>}
                              </Link>
                            )
                          })}
                          {hasConflict && (
                            <div className="text-[9px] text-red-400 font-medium">CONFLICT</div>
                          )}
                        </div>
                      ) : (
                        <div
                          className={`h-8 rounded ${
                            !isAvailable
                              ? 'bg-stone-800/60 border border-dashed border-stone-700'
                              : ''
                          }`}
                        >
                          {!isAvailable && (
                            <span className="text-[9px] text-stone-600 leading-8">off</span>
                          )}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
