'use client'

import { useState, useTransition } from 'react'
import {
  createSeasonalPeriod,
  updateSeasonalPeriod,
  type SeasonalPeriod,
  type SeasonalPeriodInput,
} from '@/lib/scheduling/seasonal-availability-actions'
import { Button } from '@/components/ui/button'

type Props = {
  period?: SeasonalPeriod | null
  defaultStartDate?: string | null
  onDone: () => void
  onCancel: () => void
}

export function SeasonalPeriodForm({ period, defaultStartDate, onDone, onCancel }: Props) {
  const isEditing = !!period

  const [seasonName, setSeasonName] = useState(period?.season_name ?? '')
  const [location, setLocation] = useState(period?.location ?? '')
  const [startDate, setStartDate] = useState(period?.start_date ?? defaultStartDate ?? '')
  const [endDate, setEndDate] = useState(period?.end_date ?? '')
  const [isAvailable, setIsAvailable] = useState(period?.is_available ?? true)
  const [travelRadius, setTravelRadius] = useState<string>(
    period?.travel_radius_miles?.toString() ?? ''
  )
  const [isRecurring, setIsRecurring] = useState(period?.is_recurring ?? false)
  const [notes, setNotes] = useState(period?.notes ?? '')

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!seasonName.trim()) {
      setError('Season name is required')
      return
    }
    if (!location.trim()) {
      setError('Location is required')
      return
    }
    if (!startDate || !endDate) {
      setError('Both start and end dates are required')
      return
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setError('End date must be after start date')
      return
    }

    const data: SeasonalPeriodInput = {
      season_name: seasonName.trim(),
      location: location.trim(),
      start_date: startDate,
      end_date: endDate,
      is_available: isAvailable,
      travel_radius_miles: travelRadius ? parseInt(travelRadius, 10) : null,
      is_recurring: isRecurring,
      notes: notes.trim() || null,
    }

    startTransition(async () => {
      try {
        if (isEditing && period) {
          const result = await updateSeasonalPeriod(period.id, data)
          if (!result.success) {
            setError(result.error ?? 'Failed to update')
            return
          }
        } else {
          const result = await createSeasonalPeriod(data)
          if (!result.success) {
            setError(result.error ?? 'Failed to create')
            return
          }
        }
        onDone()
      } catch {
        setError('An unexpected error occurred')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Season Name */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Season Name</label>
        <input
          type="text"
          value={seasonName}
          onChange={(e) => setSeasonName(e.target.value)}
          placeholder="e.g. Hamptons Summer, Aspen Ski Season"
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
        />
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Location</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. East Hampton, NY"
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
        />
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
          />
        </div>
      </div>

      {/* Available Toggle */}
      <div className="flex items-center gap-3">
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={isAvailable}
            onChange={(e) => setIsAvailable(e.target.checked)}
            className="peer sr-only"
          />
          <div className="h-5 w-9 rounded-full bg-stone-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-emerald-500 peer-checked:after:translate-x-full" />
        </label>
        <span className="text-sm text-stone-700">Available for bookings at this location</span>
      </div>

      {/* Travel Radius */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Travel Radius (miles)
        </label>
        <input
          type="number"
          value={travelRadius}
          onChange={(e) => setTravelRadius(e.target.value)}
          placeholder="e.g. 50"
          min={0}
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
        />
        <p className="mt-1 text-xs text-stone-400">
          How far you will travel from this location for events
        </p>
      </div>

      {/* Recurring Toggle */}
      <div className="flex items-center gap-3">
        <label className="relative inline-flex cursor-pointer items-center">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="peer sr-only"
          />
          <div className="h-5 w-9 rounded-full bg-stone-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-emerald-500 peer-checked:after:translate-x-full" />
        </label>
        <span className="text-sm text-stone-700">Recurring every year</span>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Any additional notes about this season..."
          className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-stone-500 focus:outline-none focus:ring-1 focus:ring-stone-500"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="primary" type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : isEditing ? 'Update Season' : 'Add Season'}
        </Button>
      </div>
    </form>
  )
}
