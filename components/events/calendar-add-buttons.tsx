'use client'

// Calendar Add Buttons
// Gives clients two ways to save their event to a calendar:
//   1. "Add to Google Calendar" — opens a prefilled deep-link URL in a new tab (no OAuth)
//   2. "Download .ics" — triggers the API route that returns an RFC 5545 .ics file
//      compatible with Apple Calendar, Outlook, and any other iCalendar-aware client.

import { CalendarPlus } from 'lucide-react'

type Props = {
  eventId: string
  occasion: string
  eventDate: string // 'YYYY-MM-DD'
  startTime?: string // 'HH:MM' 24-hour
  location?: string
}

// Build the Google Calendar deep-link URL.
// Uses local (floating) times — no timezone conversion needed for a private event.
function buildGoogleCalendarUrl({
  occasion,
  eventDate,
  startTime,
  location,
}: Omit<Props, 'eventId'>): string {
  const datePart = eventDate.replace(/-/g, '')

  // Default: 6pm–10pm if no times provided
  const startHHMM = startTime ?? '18:00'
  const [startH, startM] = startHHMM.split(':').map(Number)
  const endH = Math.min(startH + 3, 23) // 3-hour duration cap at 11pm

  const start = `${datePart}T${String(startH).padStart(2, '0')}${String(startM).padStart(2, '0')}00`
  const end = `${datePart}T${String(endH).padStart(2, '0')}${String(startM).padStart(2, '0')}00`

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: occasion,
    dates: `${start}/${end}`,
    details: 'Event booked via ChefFlow',
  })

  if (location) params.set('location', location)

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function CalendarAddButtons({ eventId, occasion, eventDate, startTime, location }: Props) {
  const googleUrl = buildGoogleCalendarUrl({ occasion, eventDate, startTime, location })
  const icsUrl = `/api/calendar/event/${eventId}`

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
        Add to calendar
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href={googleUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center h-10 px-3 text-sm font-medium rounded-lg gap-1.5 bg-surface text-stone-300 border border-stone-600 hover:bg-stone-800 transition-all duration-150"
        >
          <CalendarPlus className="w-3.5 h-3.5" />
          Google Calendar
        </a>

        <a
          href={icsUrl}
          download={`${occasion.replace(/\s+/g, '-').toLowerCase()}.ics`}
          className="inline-flex items-center justify-center h-10 px-3 text-sm font-medium rounded-lg gap-1.5 bg-surface text-stone-300 border border-stone-600 hover:bg-stone-800 transition-all duration-150"
        >
          <CalendarPlus className="w-3.5 h-3.5" />
          Apple / Outlook (.ics)
        </a>
      </div>
    </div>
  )
}
