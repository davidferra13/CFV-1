'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { setAvailability } from '@/lib/scheduling/shift-actions'

type StaffMember = { id: string; name: string; role: string }
type AvailabilityRecord = {
  id: string
  staff_member_id: string
  day_of_week: number
  available: boolean
  preferred_start: string | null
  preferred_end: string | null
  notes: string | null
  staff_members?: { id: string; name: string }
}

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function AvailabilityEditor({
  staffMembers,
  initialAvailability,
}: {
  staffMembers: StaffMember[]
  initialAvailability: AvailabilityRecord[]
}) {
  const [selectedStaff, setSelectedStaff] = useState(staffMembers[0]?.id ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Build availability map: staffId -> dayOfWeek -> record
  const [availData, setAvailData] = useState<Record<string, Record<number, AvailabilityRecord>>>(
    () => {
      const map: Record<string, Record<number, AvailabilityRecord>> = {}
      for (const a of initialAvailability) {
        if (!map[a.staff_member_id]) map[a.staff_member_id] = {}
        map[a.staff_member_id][a.day_of_week] = a
      }
      return map
    }
  )

  const staffAvail = availData[selectedStaff] ?? {}

  function getDay(dayOfWeek: number): {
    available: boolean
    preferredStart: string
    preferredEnd: string
  } {
    const record = staffAvail[dayOfWeek]
    return {
      available: record?.available ?? true,
      preferredStart: record?.preferred_start ?? '',
      preferredEnd: record?.preferred_end ?? '',
    }
  }

  async function handleToggle(dayOfWeek: number, available: boolean) {
    const current = getDay(dayOfWeek)
    startTransition(async () => {
      try {
        await setAvailability({
          staff_member_id: selectedStaff,
          day_of_week: dayOfWeek,
          available,
          preferred_start: current.preferredStart || null,
          preferred_end: current.preferredEnd || null,
        })
        // Update local state
        setAvailData((prev) => {
          const next = { ...prev }
          if (!next[selectedStaff]) next[selectedStaff] = {}
          next[selectedStaff] = {
            ...next[selectedStaff],
            [dayOfWeek]: {
              ...(next[selectedStaff][dayOfWeek] ?? {
                id: '',
                staff_member_id: selectedStaff,
                day_of_week: dayOfWeek,
                notes: null,
              }),
              available,
              preferred_start: current.preferredStart || null,
              preferred_end: current.preferredEnd || null,
            },
          }
          return next
        })
        setSuccessMsg('Saved')
        setTimeout(() => setSuccessMsg(null), 1500)
      } catch (err: any) {
        setError(err.message ?? 'Failed to update availability')
      }
    })
  }

  async function handleTimeChange(
    dayOfWeek: number,
    field: 'preferred_start' | 'preferred_end',
    value: string
  ) {
    const current = getDay(dayOfWeek)
    const updatedStart =
      field === 'preferred_start' ? value || null : current.preferredStart || null
    const updatedEnd = field === 'preferred_end' ? value || null : current.preferredEnd || null

    startTransition(async () => {
      try {
        await setAvailability({
          staff_member_id: selectedStaff,
          day_of_week: dayOfWeek,
          available: current.available,
          preferred_start: updatedStart,
          preferred_end: updatedEnd,
        })
        setAvailData((prev) => {
          const next = { ...prev }
          if (!next[selectedStaff]) next[selectedStaff] = {}
          next[selectedStaff] = {
            ...next[selectedStaff],
            [dayOfWeek]: {
              ...(next[selectedStaff][dayOfWeek] ?? {
                id: '',
                staff_member_id: selectedStaff,
                day_of_week: dayOfWeek,
                notes: null,
              }),
              available: current.available,
              preferred_start: updatedStart,
              preferred_end: updatedEnd,
            },
          }
          return next
        })
        setSuccessMsg('Saved')
        setTimeout(() => setSuccessMsg(null), 1500)
      } catch (err: any) {
        setError(err.message ?? 'Failed to update availability')
      }
    })
  }

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
      {successMsg && (
        <div className="rounded-md border border-emerald-800 bg-emerald-950 p-2 text-sm text-emerald-300">
          {successMsg}
        </div>
      )}

      {/* Staff selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-stone-400">Staff Member:</label>
        <select
          value={selectedStaff}
          onChange={(e) => setSelectedStaff(e.target.value)}
          className="h-9 rounded border border-stone-700 bg-stone-800 px-3 text-sm text-stone-200"
        >
          {staffMembers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.role})
            </option>
          ))}
        </select>
      </div>

      {staffMembers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-400">
              No staff members yet. Add staff to manage availability.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {Array.from({ length: 7 }, (_, i) => {
            const day = getDay(i)
            return (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{DAY_LABELS[i]}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <button
                    onClick={() => handleToggle(i, !day.available)}
                    disabled={isPending}
                    className={`w-full rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      day.available
                        ? 'bg-emerald-900/50 text-emerald-300 hover:bg-emerald-900/70'
                        : 'bg-red-900/50 text-red-300 hover:bg-red-900/70'
                    }`}
                  >
                    {day.available ? 'Available' : 'Unavailable'}
                  </button>
                  {day.available && (
                    <div className="space-y-2">
                      <div>
                        <label className="mb-1 block text-xs text-stone-500">Preferred start</label>
                        <input
                          type="time"
                          value={day.preferredStart}
                          onChange={(e) => handleTimeChange(i, 'preferred_start', e.target.value)}
                          className="h-8 w-full rounded border border-stone-700 bg-stone-800 px-2 text-xs text-stone-300"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-stone-500">Preferred end</label>
                        <input
                          type="time"
                          value={day.preferredEnd}
                          onChange={(e) => handleTimeChange(i, 'preferred_end', e.target.value)}
                          className="h-8 w-full rounded border border-stone-700 bg-stone-800 px-2 text-xs text-stone-300"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* All staff overview */}
      {staffMembers.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Team Availability Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border border-stone-700 bg-stone-800 p-2 text-left text-xs text-stone-400">
                      Staff
                    </th>
                    {DAY_SHORT.map((d) => (
                      <th
                        key={d}
                        className="border border-stone-700 bg-stone-800 p-2 text-center text-xs text-stone-400"
                      >
                        {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staffMembers.map((staff) => (
                    <tr key={staff.id}>
                      <td className="border border-stone-700 p-2 text-stone-200">{staff.name}</td>
                      {Array.from({ length: 7 }, (_, dayIdx) => {
                        const record = availData[staff.id]?.[dayIdx]
                        const isAvail = record?.available ?? true
                        return (
                          <td
                            key={dayIdx}
                            className={`border border-stone-700 p-2 text-center text-xs ${
                              isAvail
                                ? 'bg-emerald-950/30 text-emerald-400'
                                : 'bg-red-950/30 text-red-400'
                            }`}
                          >
                            {isAvail ? 'Yes' : 'No'}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
