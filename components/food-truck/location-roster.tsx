'use client'

import { useState, useTransition } from 'react'
import {
  type TruckLocation,
  type TruckScheduleEntry,
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
  getWeeklySchedule,
  createScheduleEntry,
  deleteScheduleEntry,
  copyWeekSchedule,
} from '@/lib/food-truck/location-actions'

// ---- Helpers ----

function getMonday(dateStr?: string): string {
  const d = dateStr ? new Date(dateStr) : new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d.toISOString().split('T')[0]
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function formatTime(time: string): string {
  const [h, m] = time.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${m} ${ampm}`
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

// ---- Component ----

export function LocationRoster({
  initialLocations,
  initialSchedule,
  initialWeekStart,
}: {
  initialLocations: TruckLocation[]
  initialSchedule: TruckScheduleEntry[]
  initialWeekStart: string
}) {
  const [tab, setTab] = useState<'locations' | 'schedule'>('locations')
  const [locations, setLocations] = useState(initialLocations)
  const [schedule, setSchedule] = useState(initialSchedule)
  const [weekStart, setWeekStart] = useState(initialWeekStart)
  const [isPending, startTransition] = useTransition()

  // Location form state
  const [showLocationForm, setShowLocationForm] = useState(false)
  const [editingLocation, setEditingLocation] = useState<TruckLocation | null>(null)
  const [locationForm, setLocationForm] = useState({
    name: '',
    address: '',
    contact_name: '',
    contact_phone: '',
    permit_required: false,
    notes: '',
  })

  // Schedule form state
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [scheduleForm, setScheduleForm] = useState({
    location_id: '',
    date: '',
    start_time: '08:00',
    end_time: '14:00',
    expected_covers: '',
    notes: '',
  })

  const [error, setError] = useState<string | null>(null)

  // ---- Location handlers ----

  function openAddLocation() {
    setEditingLocation(null)
    setLocationForm({
      name: '',
      address: '',
      contact_name: '',
      contact_phone: '',
      permit_required: false,
      notes: '',
    })
    setShowLocationForm(true)
  }

  function openEditLocation(loc: TruckLocation) {
    setEditingLocation(loc)
    setLocationForm({
      name: loc.name,
      address: loc.address ?? '',
      contact_name: loc.contact_name ?? '',
      contact_phone: loc.contact_phone ?? '',
      permit_required: loc.permit_required,
      notes: loc.notes ?? '',
    })
    setShowLocationForm(true)
  }

  function handleSaveLocation() {
    setError(null)
    if (!locationForm.name.trim()) {
      setError('Location name is required')
      return
    }

    const previous = [...locations]

    startTransition(async () => {
      try {
        if (editingLocation) {
          const updated = await updateLocation(editingLocation.id, {
            name: locationForm.name,
            address: locationForm.address || undefined,
            contact_name: locationForm.contact_name || undefined,
            contact_phone: locationForm.contact_phone || undefined,
            permit_required: locationForm.permit_required,
            notes: locationForm.notes || undefined,
          })
          setLocations((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
        } else {
          const created = await createLocation({
            name: locationForm.name,
            address: locationForm.address || undefined,
            contact_name: locationForm.contact_name || undefined,
            contact_phone: locationForm.contact_phone || undefined,
            permit_required: locationForm.permit_required,
            notes: locationForm.notes || undefined,
          })
          setLocations((prev) => [...prev, created])
        }
        setShowLocationForm(false)
      } catch (err) {
        setLocations(previous)
        setError(err instanceof Error ? err.message : 'Failed to save location')
      }
    })
  }

  function handleDeleteLocation(id: string) {
    if (!confirm('Delete this location? This will also remove any scheduled stops.')) return
    const previous = [...locations]
    setLocations((prev) => prev.filter((l) => l.id !== id))

    startTransition(async () => {
      try {
        await deleteLocation(id)
      } catch (err) {
        setLocations(previous)
        setError(err instanceof Error ? err.message : 'Failed to delete location')
      }
    })
  }

  // ---- Schedule handlers ----

  function navigateWeek(direction: -1 | 1) {
    const newStart = addDays(weekStart, direction * 7)
    setWeekStart(newStart)

    startTransition(async () => {
      try {
        const data = await getWeeklySchedule(newStart)
        setSchedule(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load schedule')
      }
    })
  }

  function openScheduleForm(date?: string) {
    setScheduleForm({
      location_id: locations[0]?.id ?? '',
      date: date ?? weekStart,
      start_time: '08:00',
      end_time: '14:00',
      expected_covers: '',
      notes: '',
    })
    setShowScheduleForm(true)
  }

  function handleSaveSchedule() {
    setError(null)
    if (!scheduleForm.location_id) {
      setError('Select a location')
      return
    }

    startTransition(async () => {
      try {
        const created = await createScheduleEntry({
          location_id: scheduleForm.location_id,
          date: scheduleForm.date,
          start_time: scheduleForm.start_time,
          end_time: scheduleForm.end_time,
          expected_covers: scheduleForm.expected_covers
            ? parseInt(scheduleForm.expected_covers)
            : undefined,
          notes: scheduleForm.notes || undefined,
        })
        setSchedule((prev) => [...prev, created])
        setShowScheduleForm(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create schedule entry')
      }
    })
  }

  function handleDeleteSchedule(id: string) {
    const previous = [...schedule]
    setSchedule((prev) => prev.filter((s) => s.id !== id))

    startTransition(async () => {
      try {
        await deleteScheduleEntry(id)
      } catch (err) {
        setSchedule(previous)
        setError(err instanceof Error ? err.message : 'Failed to delete schedule entry')
      }
    })
  }

  function handleCopyWeek() {
    const toWeek = addDays(weekStart, 7)
    startTransition(async () => {
      try {
        const count = await copyWeekSchedule(weekStart, toWeek)
        if (count === 0) {
          setError('No entries to copy from this week')
          return
        }
        // Navigate to the target week to show the copied entries
        setWeekStart(toWeek)
        const data = await getWeeklySchedule(toWeek)
        setSchedule(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to copy week schedule')
      }
    })
  }

  // ---- Render helpers ----

  function getEntriesForDay(dayIndex: number): TruckScheduleEntry[] {
    const dayDate = addDays(weekStart, dayIndex)
    return schedule.filter((s) => s.date === dayDate)
  }

  // ---- Render ----

  return (
    <div className="space-y-4">
      {/* Error display */}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-2 font-medium underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-700">
        <button
          onClick={() => setTab('locations')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'locations'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
          }`}
        >
          Locations
        </button>
        <button
          onClick={() => setTab('schedule')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'schedule'
              ? 'border-amber-500 text-amber-600 dark:text-amber-400'
              : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400'
          }`}
        >
          Schedule
        </button>
      </div>

      {/* ---- Locations Tab ---- */}
      {tab === 'locations' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Location Roster
            </h2>
            <button
              onClick={openAddLocation}
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
            >
              + Add Location
            </button>
          </div>

          {locations.length === 0 ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-8 text-center dark:border-zinc-700 dark:bg-zinc-800/50">
              <p className="text-zinc-500 dark:text-zinc-400">
                No locations yet. Add your regular spots to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {locations.map((loc) => (
                <div
                  key={loc.id}
                  className={`rounded-lg border p-4 transition-colors ${
                    loc.is_active
                      ? 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800'
                      : 'border-zinc-100 bg-zinc-50 opacity-60 dark:border-zinc-800 dark:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-zinc-900 dark:text-zinc-100">{loc.name}</h3>
                        {loc.permit_required && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            Permit Required
                          </span>
                        )}
                        {!loc.is_active && (
                          <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
                            Inactive
                          </span>
                        )}
                      </div>
                      {loc.address && (
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          {loc.address}
                        </p>
                      )}
                      {(loc.contact_name || loc.contact_phone) && (
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          Contact:{' '}
                          {[loc.contact_name, loc.contact_phone].filter(Boolean).join(' - ')}
                        </p>
                      )}
                      {loc.notes && (
                        <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500 italic">
                          {loc.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditLocation(loc)}
                        className="rounded px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteLocation(loc.id)}
                        className="rounded px-2 py-1 text-sm text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/20"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- Schedule Tab ---- */}
      {tab === 'schedule' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigateWeek(-1)}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                &larr;
              </button>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                Week of{' '}
                {new Date(weekStart + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </h2>
              <button
                onClick={() => navigateWeek(1)}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                &rarr;
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopyWeek}
                disabled={isPending || schedule.length === 0}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Copy to Next Week
              </button>
              <button
                onClick={() => openScheduleForm()}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
              >
                + Schedule Stop
              </button>
            </div>
          </div>

          {/* 7-day grid */}
          <div className="grid grid-cols-7 gap-2">
            {DAY_NAMES.map((day, i) => {
              const dayDate = addDays(weekStart, i)
              const entries = getEntriesForDay(i)
              const isToday = dayDate === new Date().toISOString().split('T')[0]

              return (
                <div
                  key={day}
                  className={`min-h-[120px] rounded-lg border p-2 ${
                    isToday
                      ? 'border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-900/10'
                      : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className={`text-xs font-medium ${
                        isToday
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-zinc-500 dark:text-zinc-400'
                      }`}
                    >
                      {day} {new Date(dayDate + 'T00:00:00').getDate()}
                    </span>
                    <button
                      onClick={() => openScheduleForm(dayDate)}
                      className="text-xs text-zinc-400 hover:text-amber-500"
                      title="Add stop"
                    >
                      +
                    </button>
                  </div>

                  {entries.length === 0 ? (
                    <p className="text-xs text-zinc-300 dark:text-zinc-600 italic">No stops</p>
                  ) : (
                    <div className="space-y-1">
                      {entries.map((entry) => (
                        <div
                          key={entry.id}
                          className={`rounded p-1.5 text-xs ${
                            entry.status === 'completed'
                              ? 'bg-green-50 dark:bg-green-900/20'
                              : entry.status === 'cancelled'
                                ? 'bg-red-50 line-through dark:bg-red-900/20'
                                : entry.status === 'active'
                                  ? 'bg-blue-50 dark:bg-blue-900/20'
                                  : 'bg-zinc-50 dark:bg-zinc-700/50'
                          }`}
                        >
                          <div className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                            {entry.location?.name ?? 'Unknown'}
                          </div>
                          <div className="text-zinc-500 dark:text-zinc-400">
                            {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                          </div>
                          {entry.expected_covers && (
                            <div className="text-zinc-400 dark:text-zinc-500">
                              ~{entry.expected_covers} covers
                            </div>
                          )}
                          {entry.revenue_cents != null && (
                            <div className="text-green-600 dark:text-green-400 font-medium">
                              {formatCents(entry.revenue_cents)}
                            </div>
                          )}
                          <button
                            onClick={() => handleDeleteSchedule(entry.id)}
                            className="mt-0.5 text-red-400 hover:text-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ---- Location Form Modal ---- */}
      {showLocationForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-800">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {editingLocation ? 'Edit Location' : 'Add Location'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Name *
                </label>
                <input
                  type="text"
                  value={locationForm.name}
                  onChange={(e) => setLocationForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                  placeholder="Downtown Farmers Market"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Address
                </label>
                <input
                  type="text"
                  value={locationForm.address}
                  onChange={(e) => setLocationForm((f) => ({ ...f, address: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                  placeholder="123 Main St"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={locationForm.contact_name}
                    onChange={(e) =>
                      setLocationForm((f) => ({
                        ...f,
                        contact_name: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={locationForm.contact_phone}
                    onChange={(e) =>
                      setLocationForm((f) => ({
                        ...f,
                        contact_phone: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="permit_required"
                  checked={locationForm.permit_required}
                  onChange={(e) =>
                    setLocationForm((f) => ({
                      ...f,
                      permit_required: e.target.checked,
                    }))
                  }
                  className="rounded border-zinc-300 dark:border-zinc-600"
                />
                <label
                  htmlFor="permit_required"
                  className="text-sm text-zinc-700 dark:text-zinc-300"
                >
                  Permit required for this location
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Notes
                </label>
                <textarea
                  value={locationForm.notes}
                  onChange={(e) => setLocationForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowLocationForm(false)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLocation}
                disabled={isPending}
                className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {isPending ? 'Saving...' : editingLocation ? 'Update' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Schedule Form Modal ---- */}
      {showScheduleForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-zinc-800">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Schedule a Stop
            </h3>

            {locations.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Add a location first before scheduling a stop.
              </p>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Location
                  </label>
                  <select
                    value={scheduleForm.location_id}
                    onChange={(e) =>
                      setScheduleForm((f) => ({
                        ...f,
                        location_id: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                  >
                    {locations
                      .filter((l) => l.is_active)
                      .map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Date
                  </label>
                  <input
                    type="date"
                    value={scheduleForm.date}
                    onChange={(e) => setScheduleForm((f) => ({ ...f, date: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={scheduleForm.start_time}
                      onChange={(e) =>
                        setScheduleForm((f) => ({
                          ...f,
                          start_time: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={scheduleForm.end_time}
                      onChange={(e) =>
                        setScheduleForm((f) => ({
                          ...f,
                          end_time: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Expected Covers
                  </label>
                  <input
                    type="number"
                    value={scheduleForm.expected_covers}
                    onChange={(e) =>
                      setScheduleForm((f) => ({
                        ...f,
                        expected_covers: e.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                    placeholder="50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Notes
                  </label>
                  <textarea
                    value={scheduleForm.notes}
                    onChange={(e) => setScheduleForm((f) => ({ ...f, notes: e.target.value }))}
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-100"
                  />
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowScheduleForm(false)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>
              {locations.length > 0 && (
                <button
                  onClick={handleSaveSchedule}
                  disabled={isPending}
                  className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                >
                  {isPending ? 'Scheduling...' : 'Schedule'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isPending && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900">
          Updating...
        </div>
      )}
    </div>
  )
}
