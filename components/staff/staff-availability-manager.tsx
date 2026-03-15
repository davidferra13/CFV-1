'use client'

// Staff Availability Manager
// Weekly grid to set recurring and date-specific availability per staff member.

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getStaffAvailability,
  setStaffAvailability,
  type AvailabilityEntry,
} from '@/lib/staff/staff-scheduling-actions'
import { listStaffMembers } from '@/lib/staff/actions'

type StaffMember = {
  id: string
  name: string
  role: string
}

type DayAvailability = {
  isAvailable: boolean
  startTime: string
  endTime: string
  notes: string
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_ABBREVS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const DEFAULT_DAY: DayAvailability = {
  isAvailable: true,
  startTime: '08:00',
  endTime: '20:00',
  notes: '',
}

export function StaffAvailabilityManager() {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<string>('')
  const [weekly, setWeekly] = useState<DayAvailability[]>(
    Array.from({ length: 7 }, () => ({ ...DEFAULT_DAY }))
  )
  const [dateOverrides, setDateOverrides] = useState<Array<{
    date: string
    isAvailable: boolean
    startTime: string
    endTime: string
    notes: string
  }>>([])
  const [newOverrideDate, setNewOverrideDate] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    listStaffMembers().then((members) => {
      setStaffMembers(members as StaffMember[])
    }).catch(() => {
      console.error('[StaffAvailabilityManager] Failed to load staff')
    })
  }, [])

  useEffect(() => {
    if (!selectedStaffId) return
    loadAvailability(selectedStaffId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStaffId])

  async function loadAvailability(staffId: string) {
    setError(null)
    setSaved(false)
    try {
      const entries = await getStaffAvailability(staffId)
      const typedEntries = entries as Array<{
        day_of_week: number | null
        specific_date: string | null
        is_available: boolean
        start_time: string | null
        end_time: string | null
        notes: string | null
      }>

      // Populate weekly grid from recurring entries
      const newWeekly = Array.from({ length: 7 }, () => ({ ...DEFAULT_DAY }))
      for (const entry of typedEntries) {
        if (entry.day_of_week != null && !entry.specific_date) {
          newWeekly[entry.day_of_week] = {
            isAvailable: entry.is_available,
            startTime: entry.start_time?.slice(0, 5) ?? '08:00',
            endTime: entry.end_time?.slice(0, 5) ?? '20:00',
            notes: entry.notes ?? '',
          }
        }
      }
      setWeekly(newWeekly)

      // Populate date overrides
      const overrides = typedEntries
        .filter((e) => e.specific_date)
        .map((e) => ({
          date: e.specific_date!,
          isAvailable: e.is_available,
          startTime: e.start_time?.slice(0, 5) ?? '08:00',
          endTime: e.end_time?.slice(0, 5) ?? '20:00',
          notes: e.notes ?? '',
        }))
      setDateOverrides(overrides)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load availability')
    }
  }

  function updateDay(dayIndex: number, field: keyof DayAvailability, value: any) {
    setWeekly((prev) => {
      const next = [...prev]
      next[dayIndex] = { ...next[dayIndex], [field]: value }
      return next
    })
    setSaved(false)
  }

  function addDateOverride() {
    if (!newOverrideDate) return
    if (dateOverrides.some((o) => o.date === newOverrideDate)) return
    setDateOverrides((prev) => [
      ...prev,
      { date: newOverrideDate, isAvailable: false, startTime: '08:00', endTime: '20:00', notes: '' },
    ])
    setNewOverrideDate('')
    setSaved(false)
  }

  function updateOverride(index: number, field: string, value: any) {
    setDateOverrides((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
    setSaved(false)
  }

  function removeOverride(index: number) {
    setDateOverrides((prev) => prev.filter((_, i) => i !== index))
    setSaved(false)
  }

  function handleSave() {
    if (!selectedStaffId) return
    setError(null)
    setSaved(false)

    const entries: AvailabilityEntry[] = []

    // Recurring weekly entries
    for (let day = 0; day < 7; day++) {
      const d = weekly[day]
      entries.push({
        day_of_week: day,
        specific_date: null,
        is_available: d.isAvailable,
        start_time: d.isAvailable ? d.startTime : null,
        end_time: d.isAvailable ? d.endTime : null,
        notes: d.notes || undefined,
      })
    }

    // Date-specific overrides
    for (const override of dateOverrides) {
      entries.push({
        day_of_week: null,
        specific_date: override.date,
        is_available: override.isAvailable,
        start_time: override.isAvailable ? override.startTime : null,
        end_time: override.isAvailable ? override.endTime : null,
        notes: override.notes || undefined,
      })
    }

    startTransition(async () => {
      try {
        await setStaffAvailability(selectedStaffId, entries)
        setSaved(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save availability')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Staff Selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-stone-700">Staff Member:</label>
        <select
          value={selectedStaffId}
          onChange={(e) => setSelectedStaffId(e.target.value)}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm min-w-[200px]"
        >
          <option value="">Select staff member...</option>
          {staffMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.role.replace(/_/g, ' ')})
            </option>
          ))}
        </select>
      </div>

      {!selectedStaffId && (
        <p className="text-sm text-stone-400">Select a staff member to manage their availability.</p>
      )}

      {selectedStaffId && (
        <>
          {/* Weekly Recurring Availability */}
          <div>
            <h3 className="text-sm font-semibold text-stone-800 mb-3">Weekly Schedule</h3>
            <div className="rounded-lg border border-stone-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-stone-50">
                    <th className="px-3 py-2 text-left text-xs font-medium text-stone-500 w-24">Day</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-stone-500 w-24">Available</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-stone-500">Start</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-stone-500">End</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-stone-500">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {DAYS.map((day, i) => (
                    <tr key={day} className={`border-t border-stone-100 ${!weekly[i].isAvailable ? 'bg-stone-50' : ''}`}>
                      <td className="px-3 py-2 text-sm font-medium text-stone-700">{DAY_ABBREVS[i]}</td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={weekly[i].isAvailable}
                          onChange={(e) => updateDay(i, 'isAvailable', e.target.checked)}
                          className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        {weekly[i].isAvailable && (
                          <Input
                            type="time"
                            value={weekly[i].startTime}
                            onChange={(e) => updateDay(i, 'startTime', e.target.value)}
                            className="w-28 text-sm"
                          />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {weekly[i].isAvailable && (
                          <Input
                            type="time"
                            value={weekly[i].endTime}
                            onChange={(e) => updateDay(i, 'endTime', e.target.value)}
                            className="w-28 text-sm"
                          />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          value={weekly[i].notes}
                          onChange={(e) => updateDay(i, 'notes', e.target.value)}
                          placeholder="e.g., class until 2pm"
                          className="text-sm"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Date-Specific Overrides */}
          <div>
            <h3 className="text-sm font-semibold text-stone-800 mb-3">Date Overrides</h3>
            <p className="text-xs text-stone-400 mb-2">
              Override weekly availability for specific dates (vacation, appointments, etc.)
            </p>

            <div className="space-y-2 mb-3">
              {dateOverrides.map((override, i) => (
                <div key={override.date} className="flex items-center gap-3 rounded-lg border border-stone-200 px-3 py-2">
                  <span className="text-sm font-medium text-stone-700 w-28">{override.date}</span>
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={override.isAvailable}
                      onChange={(e) => updateOverride(i, 'isAvailable', e.target.checked)}
                      className="h-4 w-4 rounded border-stone-300 text-amber-600"
                    />
                    Available
                  </label>
                  {override.isAvailable && (
                    <>
                      <Input
                        type="time"
                        value={override.startTime}
                        onChange={(e) => updateOverride(i, 'startTime', e.target.value)}
                        className="w-28 text-sm"
                      />
                      <span className="text-stone-400">to</span>
                      <Input
                        type="time"
                        value={override.endTime}
                        onChange={(e) => updateOverride(i, 'endTime', e.target.value)}
                        className="w-28 text-sm"
                      />
                    </>
                  )}
                  <button
                    onClick={() => removeOverride(i)}
                    className="text-sm text-red-400 hover:text-red-600 ml-auto"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={newOverrideDate}
                onChange={(e) => setNewOverrideDate(e.target.value)}
                className="w-40 text-sm"
              />
              <Button variant="ghost" onClick={addDateOverride} disabled={!newOverrideDate}>
                + Add Override
              </Button>
            </div>
          </div>

          {/* Save */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {saved && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              Availability saved.
            </div>
          )}
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? 'Saving...' : 'Save Availability'}
          </Button>
        </>
      )}
    </div>
  )
}
