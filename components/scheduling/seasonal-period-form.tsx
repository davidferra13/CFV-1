'use client'

import { useState, useTransition } from 'react'
import {
  createSeasonalPeriod,
  updateSeasonalPeriod,
  deleteSeasonalPeriod,
} from '@/lib/scheduling/seasonal-availability-actions'
import type {
  SeasonalPeriod,
  SeasonalPeriodInput,
} from '@/lib/scheduling/seasonal-availability-actions'

type Props = {
  period?: SeasonalPeriod | null
  onSaved?: () => void
  onCancelled?: () => void
}

export default function SeasonalPeriodForm({ period, onSaved, onCancelled }: Props) {
  const isEditing = !!period

  const [name, setName] = useState(period?.period_name ?? '')
  const [location, setLocation] = useState(period?.location ?? '')
  const [startDate, setStartDate] = useState(period?.start_date ?? '')
  const [endDate, setEndDate] = useState(period?.end_date ?? '')
  const [acceptingBookings, setAcceptingBookings] = useState(period?.is_accepting_bookings ?? true)
  const [maxEventsPerWeek, setMaxEventsPerWeek] = useState(period?.max_events_per_week ?? 5)
  const [travelRadius, setTravelRadius] = useState<string>(
    period?.travel_radius_miles != null ? String(period.travel_radius_miles) : ''
  )
  const [notes, setNotes] = useState(period?.notes ?? '')
  const [recurringYearly, setRecurringYearly] = useState(period?.recurring_yearly ?? false)

  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isDeleting, startDeleteTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim() || !location.trim() || !startDate || !endDate) {
      setError('Please fill in all required fields')
      return
    }

    if (endDate <= startDate) {
      setError('End date must be after start date')
      return
    }

    const input: SeasonalPeriodInput = {
      period_name: name.trim(),
      location: location.trim(),
      start_date: startDate,
      end_date: endDate,
      is_accepting_bookings: acceptingBookings,
      max_events_per_week: maxEventsPerWeek,
      travel_radius_miles: travelRadius ? parseInt(travelRadius, 10) : null,
      notes: notes.trim() || null,
      recurring_yearly: recurringYearly,
    }

    startTransition(async () => {
      try {
        const result = isEditing
          ? await updateSeasonalPeriod(period.id, input)
          : await createSeasonalPeriod(input)

        if (!result.success) {
          setError(result.error ?? 'Failed to save period')
          return
        }

        onSaved?.()
      } catch (err) {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  function handleDelete() {
    if (!period) return

    startDeleteTransition(async () => {
      try {
        const result = await deleteSeasonalPeriod(period.id)
        if (!result.success) {
          setError(result.error ?? 'Failed to delete period')
          return
        }
        onSaved?.()
      } catch (err) {
        setError('Failed to delete period. Please try again.')
      }
    })
  }

  const inputClasses =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
  const labelClasses = 'block text-sm font-medium text-foreground mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold">
        {isEditing ? 'Edit Seasonal Period' : 'New Seasonal Period'}
      </h3>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Period Name */}
      <div>
        <label className={labelClasses}>Period Name *</label>
        <input
          type="text"
          className={inputClasses}
          placeholder="e.g. Hamptons Summer"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      {/* Location */}
      <div>
        <label className={labelClasses}>Location *</label>
        <input
          type="text"
          className={inputClasses}
          placeholder="e.g. Hamptons, NY"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
        />
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClasses}>Start Date *</label>
          <input
            type="date"
            className={inputClasses}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClasses}>End Date *</label>
          <input
            type="date"
            className={inputClasses}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Accepting Bookings Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={acceptingBookings}
          onClick={() => setAcceptingBookings(!acceptingBookings)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            acceptingBookings ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              acceptingBookings ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <label className="text-sm font-medium text-foreground">
          Accepting bookings during this period
        </label>
      </div>

      {/* Max Events Per Week */}
      <div>
        <label className={labelClasses}>Max Events Per Week</label>
        <input
          type="number"
          className={inputClasses}
          min={1}
          max={20}
          value={maxEventsPerWeek}
          onChange={(e) => setMaxEventsPerWeek(parseInt(e.target.value, 10) || 5)}
        />
      </div>

      {/* Travel Radius */}
      <div>
        <label className={labelClasses}>Travel Radius (miles)</label>
        <input
          type="number"
          className={inputClasses}
          min={0}
          placeholder="Leave empty for no limit"
          value={travelRadius}
          onChange={(e) => setTravelRadius(e.target.value)}
        />
      </div>

      {/* Notes */}
      <div>
        <label className={labelClasses}>Notes</label>
        <textarea
          className={inputClasses + ' min-h-[80px] resize-y'}
          placeholder="Any additional details about this period..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      {/* Recurring Yearly */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={recurringYearly}
          onClick={() => setRecurringYearly(!recurringYearly)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            recurringYearly ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
              recurringYearly ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <label className="text-sm font-medium text-foreground">
          Repeat every year
        </label>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? 'Saving...' : isEditing ? 'Update Period' : 'Create Period'}
        </button>

        {onCancelled && (
          <button
            type="button"
            onClick={onCancelled}
            className="rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Cancel
          </button>
        )}

        {isEditing && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="ml-auto rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        )}
      </div>
    </form>
  )
}
