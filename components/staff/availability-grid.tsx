'use client'

// Staff Availability Grid - toggle grid showing staff × date availability.
// Rows are staff members, columns are dates. Click a cell to toggle availability.

import { useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Users } from '@/components/ui/icons'
import { setAvailability } from '@/lib/staff/availability-actions'

// ─── Types ────────────────────────────────────────────────────────────────────

type StaffMember = {
  id: string
  name: string
  role: string
}

type AvailabilityRecord = {
  staffMemberId: string
  date: string
  isAvailable: boolean
}

interface AvailabilityGridProps {
  staffMembers: StaffMember[]
  availability: AvailabilityRecord[]
  startDate: string
  endDate: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const [_y, _m, _d] = dateStr.split('-').map(Number)
  const d = new Date(_y, _m - 1, _d + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
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
  return `${days[d.getDay()]}\n${months[d.getMonth()]} ${d.getDate()}`
}

function generateDateRange(start: string, count: number): string[] {
  const dates: string[] = []
  for (let i = 0; i < count; i++) {
    dates.push(addDays(start, i))
  }
  return dates
}

const ROLE_LABELS: Record<string, string> = {
  sous_chef: 'Sous Chef',
  kitchen_assistant: 'Kitchen Asst.',
  service_staff: 'Service',
  server: 'Server',
  bartender: 'Bartender',
  dishwasher: 'Dishwasher',
  other: 'Other',
}

const DAYS_VISIBLE = 7

// ─── Component ────────────────────────────────────────────────────────────────

export function AvailabilityGrid({
  staffMembers,
  availability: initialAvailability,
  startDate,
}: AvailabilityGridProps) {
  const [weekStart, setWeekStart] = useState(startDate)
  const [availability, setAvailabilityState] = useState<AvailabilityRecord[]>(initialAvailability)
  const [isPending, startTransition] = useTransition()

  const dates = generateDateRange(weekStart, DAYS_VISIBLE)

  // Build lookup: "staffId:date" -> boolean
  const availLookup = new Map<string, boolean>()
  for (const rec of availability) {
    availLookup.set(`${rec.staffMemberId}:${rec.date}`, rec.isAvailable)
  }

  function getStatus(staffId: string, date: string): 'available' | 'unavailable' | 'unknown' {
    const key = `${staffId}:${date}`
    if (!availLookup.has(key)) return 'unknown'
    return availLookup.get(key) ? 'available' : 'unavailable'
  }

  function handleToggle(staffId: string, date: string) {
    const current = getStatus(staffId, date)
    // Cycle: unknown -> available -> unavailable -> unknown
    let newAvailable: boolean
    if (current === 'unknown') {
      newAvailable = true
    } else if (current === 'available') {
      newAvailable = false
    } else {
      // unavailable -> available (reset to available)
      newAvailable = true
    }

    // Optimistic update
    const key = `${staffId}:${date}`
    setAvailabilityState((prev) => {
      const filtered = prev.filter((r) => !(r.staffMemberId === staffId && r.date === date))
      return [...filtered, { staffMemberId: staffId, date, isAvailable: newAvailable }]
    })

    startTransition(async () => {
      try {
        await setAvailability(staffId, date, newAvailable)
      } catch {
        // Revert on error
        setAvailabilityState((prev) =>
          prev.filter((r) => !(r.staffMemberId === staffId && r.date === date))
        )
      }
    })
  }

  function handlePrev() {
    setWeekStart(addDays(weekStart, -DAYS_VISIBLE))
  }

  function handleNext() {
    setWeekStart(addDays(weekStart, DAYS_VISIBLE))
  }

  const cellColors: Record<string, string> = {
    available: 'bg-emerald-900 hover:bg-emerald-200 border-emerald-300',
    unavailable: 'bg-red-900 hover:bg-red-200 border-red-300',
    unknown: 'bg-stone-100 hover:bg-stone-200 border-stone-300',
  }

  const cellIcons: Record<string, string> = {
    available: '\u2713',
    unavailable: '\u2717',
    unknown: '\u2014',
  }

  // Count available staff per date
  function countAvailable(date: string): number {
    let count = 0
    for (const member of staffMembers) {
      const status = getStatus(member.id, date)
      if (status !== 'unavailable') count++
    }
    return count
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-stone-500" />
            <CardTitle>Staff Availability</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handlePrev} disabled={isPending}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-stone-600 min-w-[140px] text-center">
              {new Date(dates[0] + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
              {' \u2013 '}
              {new Date(dates[dates.length - 1] + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <Button variant="ghost" size="sm" onClick={handleNext} disabled={isPending}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {staffMembers.length === 0 ? (
          <p className="text-sm text-stone-500 text-center py-8">
            No staff members on roster. Add staff members to manage availability.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left text-xs font-medium text-stone-500 uppercase tracking-wider pb-2 pr-4 min-w-[160px]">
                    Staff Member
                  </th>
                  {dates.map((date) => {
                    const d = new Date(date + 'T00:00:00')
                    const _agn = new Date()
                    const isToday =
                      date ===
                      `${_agn.getFullYear()}-${String(_agn.getMonth() + 1).padStart(2, '0')}-${String(_agn.getDate()).padStart(2, '0')}`
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6
                    return (
                      <th
                        key={date}
                        className={`text-center text-xs font-medium pb-2 px-1 min-w-[64px] ${
                          isToday
                            ? 'text-brand-600'
                            : isWeekend
                              ? 'text-stone-400'
                              : 'text-stone-500'
                        }`}
                      >
                        <div>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]}</div>
                        <div
                          className={`text-sm font-semibold ${isToday ? 'text-brand-600' : 'text-stone-700'}`}
                        >
                          {d.getDate()}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {staffMembers.map((member) => (
                  <tr key={member.id} className="border-t border-stone-100">
                    <td className="py-2 pr-4">
                      <div className="text-sm font-medium text-stone-900">{member.name}</div>
                      <div className="text-xs text-stone-500">
                        {ROLE_LABELS[member.role] ?? member.role}
                      </div>
                    </td>
                    {dates.map((date) => {
                      const status = getStatus(member.id, date)
                      return (
                        <td key={date} className="py-2 px-1 text-center">
                          <button
                            onClick={() => handleToggle(member.id, date)}
                            disabled={isPending}
                            className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${cellColors[status]} disabled:opacity-50`}
                            title={`${member.name} - ${date}: ${status}`}
                          >
                            {cellIcons[status]}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}

                {/* Summary row */}
                <tr className="border-t-2 border-stone-200">
                  <td className="py-2 pr-4 text-xs font-medium text-stone-500 uppercase tracking-wider">
                    Available
                  </td>
                  {dates.map((date) => {
                    const count = countAvailable(date)
                    const total = staffMembers.length
                    return (
                      <td key={date} className="py-2 px-1 text-center">
                        <Badge
                          variant={count === total ? 'success' : count === 0 ? 'error' : 'warning'}
                        >
                          {count}/{total}
                        </Badge>
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-stone-100">
          <span className="text-xs text-stone-500">Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-4 rounded bg-emerald-900 border border-emerald-300" />
            <span className="text-xs text-stone-600">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-4 rounded bg-red-900 border border-red-300" />
            <span className="text-xs text-stone-600">Unavailable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-4 rounded bg-stone-100 border border-stone-300" />
            <span className="text-xs text-stone-600">Not Set</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
