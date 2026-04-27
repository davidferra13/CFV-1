'use client'

import { useState, useEffect, useCallback } from 'react'

interface KioskCheckinProps {
  token: string
  onCheckedIn: () => void
}

interface KioskEvent {
  id: string
  event_date: string
  occasion: string | null
  serve_time: string | null
  guest_count: number
  location_address: string | null
  client_name: string | null
}

interface CheckedInGuest {
  id: string
  full_name: string
  email: string | null
  dietary_restrictions: string[]
  allergies: string[]
  dietary_notes: string | null
  plus_one: boolean
  plus_one_name: string | null
  rsvp_status: string
}

type CheckinStep = 'loading' | 'select_event' | 'enter_name' | 'confirmed' | 'not_found' | 'error'

export function KioskCheckin({ token, onCheckedIn }: KioskCheckinProps) {
  const [step, setStep] = useState<CheckinStep>('loading')
  const [events, setEvents] = useState<KioskEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<KioskEvent | null>(null)
  const [nameOrEmail, setNameOrEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [guest, setGuest] = useState<CheckedInGuest | null>(null)
  const [walkInName, setWalkInName] = useState('')
  const [walkInEmail, setWalkInEmail] = useState('')
  const [walkInSubmitting, setWalkInSubmitting] = useState(false)
  const [countdown, setCountdown] = useState(10)

  // Fetch today's events on mount
  useEffect(() => {
    fetch('/api/kiosk/checkin', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.events && data.events.length > 0) {
          setEvents(data.events)
          // If only one event today, auto-select it
          if (data.events.length === 1) {
            setSelectedEvent(data.events[0])
            setStep('enter_name')
          } else {
            setStep('select_event')
          }
        } else {
          setError('No events scheduled for today')
          setStep('error')
        }
      })
      .catch(() => {
        setError('Unable to load events. Please try again.')
        setStep('error')
      })
  }, [token])

  // Auto-reset countdown on confirmed/not_found screens
  useEffect(() => {
    if (step !== 'confirmed') return

    setCountdown(10)
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          resetFlow()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [step])

  const resetFlow = useCallback(() => {
    setGuest(null)
    setNameOrEmail('')
    setWalkInName('')
    setWalkInEmail('')
    setError('')

    if (events.length === 1) {
      setStep('enter_name')
    } else {
      setSelectedEvent(null)
      setStep('select_event')
    }
  }, [events.length])

  function handleSelectEvent(event: KioskEvent) {
    setSelectedEvent(event)
    setStep('enter_name')
  }

  async function handleCheckIn(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedEvent || !nameOrEmail.trim()) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/kiosk/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          event_id: selectedEvent.id,
          name_or_email: nameOrEmail.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Check-in failed')
        setLoading(false)
        return
      }

      if (data.found && data.guest) {
        setGuest(data.guest)
        setStep('confirmed')
      } else {
        // Not found on guest list
        setWalkInName(nameOrEmail.trim())
        setStep('not_found')
      }
    } catch {
      setError('Network error. Please try again.')
    }

    setLoading(false)
  }

  async function handleWalkIn() {
    if (!selectedEvent || !walkInName.trim()) return

    setWalkInSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/kiosk/checkin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          event_id: selectedEvent.id,
          name_or_email: walkInName.trim(),
          is_walk_in: true,
          walk_in_email: walkInEmail.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Walk-in registration failed')
        setWalkInSubmitting(false)
        return
      }

      setGuest(data.guest || { full_name: walkInName, dietary_restrictions: [], allergies: [] })
      setStep('confirmed')
    } catch {
      setError('Network error. Please try again.')
    }

    setWalkInSubmitting(false)
  }

  function formatTime(time: string | null): string {
    if (!time) return ''
    // time is HH:MM:SS format
    const [h, m] = time.split(':')
    const hour = parseInt(h, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${m} ${ampm}`
  }

  // Loading state
  if (step === 'loading') {
    return (
      <div className="flex w-full max-w-lg flex-col items-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-600 border-t-brand-500" />
        <p className="text-stone-400">Loading today's events...</p>
      </div>
    )
  }

  // Error state (no events)
  if (step === 'error') {
    return (
      <div className="w-full max-w-lg space-y-6 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-stone-800">
          <svg className="h-10 w-10 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-stone-100">No Events Today</h2>
        <p className="text-stone-400">{error || 'There are no events scheduled for check-in today.'}</p>
      </div>
    )
  }

  // Step 1: Select event (if multiple events today)
  if (step === 'select_event') {
    return (
      <div className="w-full max-w-lg select-none space-y-5">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-stone-100">Welcome</h2>
          <p className="mt-1 text-sm text-stone-400">Select your event to check in</p>
        </div>

        <div className="space-y-3">
          {events.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => handleSelectEvent(event)}
              className="w-full rounded-xl bg-stone-800 px-5 py-5 text-left transition-colors hover:bg-stone-700 active:bg-stone-600"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-medium text-stone-100">
                    {event.occasion || 'Private Dinner'}
                  </p>
                  {event.client_name && (
                    <p className="mt-0.5 text-sm text-stone-400">Hosted by {event.client_name}</p>
                  )}
                </div>
                {event.serve_time && (
                  <span className="whitespace-nowrap rounded-lg bg-stone-700 px-3 py-1.5 text-sm font-medium text-stone-200">
                    {formatTime(event.serve_time)}
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center gap-3 text-sm text-stone-500">
                <span>{event.guest_count} guests expected</span>
                {event.location_address && (
                  <>
                    <span className="text-stone-700">|</span>
                    <span className="truncate">{event.location_address}</span>
                  </>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Step 2: Enter name or email
  if (step === 'enter_name') {
    return (
      <form onSubmit={handleCheckIn} className="w-full max-w-lg select-none space-y-5">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-stone-100">Check In</h2>
          {selectedEvent && (
            <p className="mt-1 text-sm text-stone-400">
              {selectedEvent.occasion || 'Event'}
              {selectedEvent.serve_time ? ` at ${formatTime(selectedEvent.serve_time)}` : ''}
            </p>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-950 px-4 py-3 text-sm text-red-300">{error}</div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-stone-300">
            Your Name or Email
          </label>
          <input
            type="text"
            value={nameOrEmail}
            onChange={(e) => setNameOrEmail(e.target.value)}
            placeholder="Jane Smith or jane@email.com"
            autoFocus
            autoComplete="name"
            className="w-full rounded-xl bg-stone-800 px-4 py-4 text-lg text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !nameOrEmail.trim()}
          className="w-full rounded-xl bg-brand-500 py-5 text-lg font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Check In'}
        </button>

        {events.length > 1 && (
          <button
            type="button"
            onClick={() => {
              setSelectedEvent(null)
              setNameOrEmail('')
              setError('')
              setStep('select_event')
            }}
            className="w-full rounded-xl bg-stone-800 py-3 text-sm font-medium text-stone-400 transition-colors hover:bg-stone-700"
          >
            Back to Event List
          </button>
        )}
      </form>
    )
  }

  // Step 3a: Not found, offer walk-in
  if (step === 'not_found') {
    return (
      <div className="w-full max-w-lg select-none space-y-5">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-900/30">
            <svg className="h-9 w-9 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-stone-100">Not on the Guest List</h2>
          <p className="mt-1 text-sm text-stone-400">
            We could not find "{walkInName}" on the RSVP list.
          </p>
        </div>

        {error && (
          <div className="rounded-lg bg-red-950 px-4 py-3 text-sm text-red-300">{error}</div>
        )}

        <div className="rounded-xl bg-stone-800/50 p-5 space-y-4">
          <p className="text-sm font-medium text-stone-300">Add as a walk-in guest?</p>

          <div>
            <label className="mb-1.5 block text-xs text-stone-500">Name</label>
            <input
              type="text"
              value={walkInName}
              onChange={(e) => setWalkInName(e.target.value)}
              className="w-full rounded-xl bg-stone-800 px-4 py-3.5 text-base text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-stone-500">Email (optional)</label>
            <input
              type="email"
              value={walkInEmail}
              onChange={(e) => setWalkInEmail(e.target.value)}
              placeholder="guest@email.com"
              autoComplete="email"
              className="w-full rounded-xl bg-stone-800 px-4 py-3.5 text-base text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <button
            type="button"
            onClick={handleWalkIn}
            disabled={walkInSubmitting || !walkInName.trim()}
            className="w-full rounded-xl bg-brand-500 py-4 text-base font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {walkInSubmitting ? 'Adding...' : 'Add as Walk-In'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            setNameOrEmail('')
            setError('')
            setStep('enter_name')
          }}
          className="w-full rounded-xl bg-stone-800 py-3 text-sm font-medium text-stone-400 transition-colors hover:bg-stone-700"
        >
          Try a Different Name
        </button>
      </div>
    )
  }

  // Step 3b: Confirmed check-in
  if (step === 'confirmed') {
    const hasDietary =
      (guest?.dietary_restrictions && guest.dietary_restrictions.length > 0) ||
      (guest?.allergies && guest.allergies.length > 0) ||
      guest?.dietary_notes

    return (
      <div className="w-full max-w-md select-none space-y-6 text-center">
        {/* Checkmark */}
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-900/30">
          <svg
            className="h-14 w-14 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div>
          <h2 className="text-3xl font-bold text-stone-100">
            Welcome, {guest?.full_name || 'Guest'}!
          </h2>
          <p className="mt-2 text-lg text-stone-400">You're checked in. Enjoy the event!</p>
        </div>

        {/* Dietary info on file */}
        {hasDietary && (
          <div className="rounded-xl bg-stone-800/50 p-4 text-left">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-stone-500">
              Dietary Info on File
            </p>
            {guest?.dietary_restrictions && guest.dietary_restrictions.length > 0 && (
              <div className="mb-1.5 flex flex-wrap gap-1.5">
                {guest.dietary_restrictions.map((d, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-stone-700 px-2.5 py-1 text-xs text-stone-300"
                  >
                    {d}
                  </span>
                ))}
              </div>
            )}
            {guest?.allergies && guest.allergies.length > 0 && (
              <div className="mb-1.5 flex flex-wrap gap-1.5">
                {guest.allergies.map((a, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-red-900/40 px-2.5 py-1 text-xs text-red-300"
                  >
                    Allergy: {a}
                  </span>
                ))}
              </div>
            )}
            {guest?.dietary_notes && (
              <p className="text-sm text-stone-400">{guest.dietary_notes}</p>
            )}
          </div>
        )}

        {guest?.plus_one && (
          <p className="text-sm text-stone-400">
            Plus one: {guest.plus_one_name || 'Guest'}
          </p>
        )}

        {/* Countdown */}
        <p className="text-sm text-stone-500">Returning to start in {countdown}s</p>

        <button
          type="button"
          onClick={resetFlow}
          className="rounded-xl bg-stone-800 px-8 py-3 text-base font-medium text-stone-300 transition-colors hover:bg-stone-700"
        >
          Check In Another Guest
        </button>
      </div>
    )
  }

  return null
}
