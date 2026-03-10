'use client'

// TimeSlots - Step 3 of the booking flow.
// Shows available time slots for a selected date + event type.
// Fetches slots from server action, displays in a clean grid.

import { useState, useEffect, useMemo } from 'react'
import { getAvailableSlots } from '@/lib/booking/availability-actions'
import type { TimeSlot } from '@/lib/booking/availability-actions'
import type { PublicEventType } from '@/lib/booking/event-types-actions'

type Props = {
  chefSlug: string
  date: string
  eventType: PublicEventType
  onSelectTime: (time: string) => void
  onBack: () => void
}

function formatTime(time24: string): string {
  const [h, m] = time24.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (remaining === 0) return `${hours} hr`
  return `${hours} hr ${remaining} min`
}

// Get chef ID from slug by calling the availability route to extract it
// We'll pass the chef ID through the event type instead
async function fetchSlots(
  chefSlug: string,
  date: string,
  eventTypeId: string
): Promise<TimeSlot[]> {
  // Use the API route to get chef ID then call the server action
  const response = await fetch(
    `/book/${chefSlug}/availability/slots?date=${date}&event_type_id=${eventTypeId}`
  )
  if (!response.ok) return []
  return response.json()
}

export function TimeSlots({ chefSlug, date, eventType, onSelectTime, onBack }: Props) {
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchSlots(chefSlug, date, eventType.id)
      .then((data) => {
        if (cancelled) return
        setSlots(data)
      })
      .catch((err) => {
        if (cancelled) return
        setError('Could not load available times. Please try again.')
        console.error('[TimeSlots] Fetch error:', err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [chefSlug, date, eventType.id])

  // Group slots by time of day
  const groupedSlots = useMemo(() => {
    const morning: TimeSlot[] = []
    const afternoon: TimeSlot[] = []
    const evening: TimeSlot[] = []

    for (const slot of slots) {
      const hour = parseInt(slot.start.split(':')[0])
      if (hour < 12) morning.push(slot)
      else if (hour < 17) afternoon.push(slot)
      else evening.push(slot)
    }

    return { morning, afternoon, evening }
  }, [slots])

  const hasSlots = slots.length > 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Pick a time</h2>
          <p className="text-sm text-stone-500 mt-0.5">{formatDateLong(date)}</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-stone-400 hover:text-stone-200 transition-colors"
        >
          Back
        </button>
      </div>

      {/* Selected service summary */}
      <div className="rounded-lg bg-stone-800 border border-stone-700 px-4 py-2.5 flex items-center gap-3">
        <span className="text-sm text-stone-400">{eventType.name}</span>
        <span className="text-xs text-stone-500">{formatDuration(eventType.duration_minutes)}</span>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <span className="ml-3 text-sm text-stone-400">Loading available times...</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && !hasSlots && (
        <div className="text-center py-8 space-y-2">
          <p className="text-stone-400">No available times for this date.</p>
          <p className="text-sm text-stone-500">Try selecting a different date.</p>
          <button
            type="button"
            onClick={onBack}
            className="mt-3 text-sm text-brand-400 hover:text-brand-300 font-medium"
          >
            Choose another date
          </button>
        </div>
      )}

      {!loading && hasSlots && (
        <div className="space-y-4">
          {groupedSlots.morning.length > 0 && (
            <TimeSlotGroup label="Morning" slots={groupedSlots.morning} onSelect={onSelectTime} />
          )}
          {groupedSlots.afternoon.length > 0 && (
            <TimeSlotGroup
              label="Afternoon"
              slots={groupedSlots.afternoon}
              onSelect={onSelectTime}
            />
          )}
          {groupedSlots.evening.length > 0 && (
            <TimeSlotGroup label="Evening" slots={groupedSlots.evening} onSelect={onSelectTime} />
          )}
        </div>
      )}
    </div>
  )
}

function TimeSlotGroup({
  label,
  slots,
  onSelect,
}: {
  label: string
  slots: TimeSlot[]
  onSelect: (time: string) => void
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">{label}</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {slots.map((slot) => (
          <button
            key={slot.start}
            type="button"
            onClick={() => onSelect(slot.start)}
            className="rounded-lg border border-stone-700 bg-stone-800 px-3 py-2.5 text-sm font-medium text-stone-200 hover:border-brand-500 hover:bg-brand-600/10 hover:text-brand-400 transition-all text-center"
          >
            {formatTime(slot.start)}
          </button>
        ))}
      </div>
    </div>
  )
}
