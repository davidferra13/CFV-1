'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createEventStub } from '@/lib/event-stubs/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarPlus, Loader2 } from '@/components/ui/icons'

const OCCASIONS = [
  'Dinner Party',
  'Birthday',
  'Anniversary',
  'Holiday',
  'Date Night',
  'Corporate',
  'Celebration',
  'Other',
]

interface CreateEventFormProps {
  profileToken: string
}

export function CreateEventForm({ profileToken }: CreateEventFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [occasion, setOccasion] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [guestCount, setGuestCount] = useState('')
  const [location, setLocation] = useState('')
  const [notes, setNotes] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('Give your dinner a name')
      return
    }

    startTransition(async () => {
      try {
        const stub = await createEventStub({
          profileToken,
          title: title.trim(),
          occasion: occasion || null,
          event_date: eventDate || null,
          guest_count: guestCount ? parseInt(guestCount, 10) : null,
          location_text: location || null,
          notes: notes || null,
          createGroup: true,
        })

        router.push(stub.hub_group_token ? `/my-hub/g/${stub.hub_group_token}` : '/my-hub')
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <Card className="border-stone-800 bg-stone-900/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-stone-100">
          <CalendarPlus className="h-5 w-5 text-brand-400" />
          Plan Your Dinner
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-stone-300">
              What&apos;s the dinner called? *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sarah's Birthday Dinner"
              className="w-full rounded-lg border border-stone-700 bg-stone-800 px-4 py-2.5 text-stone-100 placeholder-stone-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              maxLength={200}
              required
            />
          </div>

          {/* Occasion */}
          <div>
            <label htmlFor="occasion" className="mb-1.5 block text-sm font-medium text-stone-300">
              Occasion
            </label>
            <select
              id="occasion"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              className="w-full rounded-lg border border-stone-700 bg-stone-800 px-4 py-2.5 text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">Select an occasion</option>
              {OCCASIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          {/* Date + Guest Count (side by side) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="eventDate"
                className="mb-1.5 block text-sm font-medium text-stone-300"
              >
                Date
              </label>
              <input
                id="eventDate"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full rounded-lg border border-stone-700 bg-stone-800 px-4 py-2.5 text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label
                htmlFor="guestCount"
                className="mb-1.5 block text-sm font-medium text-stone-300"
              >
                Guest count
              </label>
              <input
                id="guestCount"
                type="number"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                placeholder="e.g. 8"
                min="1"
                max="500"
                className="w-full rounded-lg border border-stone-700 bg-stone-800 px-4 py-2.5 text-stone-100 placeholder-stone-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location" className="mb-1.5 block text-sm font-medium text-stone-300">
              Location
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. My home, downtown restaurant, TBD"
              className="w-full rounded-lg border border-stone-700 bg-stone-800 px-4 py-2.5 text-stone-100 placeholder-stone-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              maxLength={500}
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-stone-300">
              Notes for the group
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any dietary restrictions, theme ideas, or things your friends should know..."
              rows={3}
              className="w-full rounded-lg border border-stone-700 bg-stone-800 px-4 py-2.5 text-stone-100 placeholder-stone-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
              maxLength={2000}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{error}</p>
          )}

          <Button type="submit" variant="primary" disabled={isPending} className="w-full">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <CalendarPlus className="mr-2 h-4 w-4" />
                Create Dinner &amp; Invite Friends
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
