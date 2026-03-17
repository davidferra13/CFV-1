// Event Detail Popover - appears on calendar event click
// Shows event summary with quick actions.

'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { CalendarEvent } from '@/lib/scheduling/actions'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  proposed: 'Proposed',
  accepted: 'Accepted',
  paid: 'Paid',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  // Inquiry statuses
  new: 'New',
  awaiting_client: 'Client Reply',
  awaiting_chef: 'Your Reply',
  quoted: 'Quoted',
  declined: 'Declined',
  expired: 'Expired',
}

const STATUS_BADGE_COLORS: Record<string, string> = {
  draft: 'bg-stone-800 text-stone-300',
  proposed: 'bg-blue-900 text-blue-700',
  accepted: 'bg-yellow-900 text-yellow-700',
  paid: 'bg-emerald-900 text-emerald-700',
  confirmed: 'bg-brand-900 text-brand-400',
  in_progress: 'bg-brand-950 text-brand-300',
  completed: 'bg-green-900 text-green-700',
  cancelled: 'bg-red-900 text-red-700',
}

const PREP_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ready: { label: 'Ready', color: 'bg-green-900 text-green-700' },
  partial: { label: 'Partial', color: 'bg-yellow-900 text-yellow-700' },
  not_started: { label: 'Not Started', color: 'bg-red-900 text-red-700' },
}

export function EventDetailPopover({
  event,
  position,
  onClose,
}: {
  event: CalendarEvent
  position: { x: number; y: number }
  onClose: () => void
}) {
  const popoverRef = useRef<HTMLDivElement>(null)
  const [adjustedPos, setAdjustedPos] = useState(position)
  const props = event.extendedProps
  const isPrep = props.dayType === 'prep'
  const isInquiry = props.dayType === 'inquiry'

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!popoverRef.current) return
    const el = popoverRef.current
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    let x = position.x - rect.width / 2
    let y = position.y - rect.height - 8

    // Flip below if not enough space above
    if (y < 8) {
      y = position.y + 40
    }
    // Keep within horizontal bounds
    if (x < 8) x = 8
    if (x + rect.width > vw - 8) x = vw - rect.width - 8
    // Keep within vertical bounds
    if (y + rect.height > vh - 8) y = vh - rect.height - 8

    setAdjustedPos({ x, y })
  }, [position])

  // Escape to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const eventDate = event.start ? new Date(event.start) : null
  const formattedDate = eventDate
    ? eventDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : ''

  const formattedTime = eventDate
    ? eventDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    : ''

  const prepInfo = PREP_STATUS_LABELS[props.prepStatus]

  return (
    <div
      ref={popoverRef}
      className="event-popover fixed z-50 w-[calc(100vw-2rem)] sm:w-80 max-w-80 bg-stone-900 rounded-xl shadow-xl border border-stone-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
      style={{
        left: adjustedPos.x,
        top: adjustedPos.y,
      }}
    >
      {/* Header */}
      <div
        className={`px-4 py-3 ${isInquiry ? 'bg-stone-900 border-b border-stone-700' : isPrep ? 'bg-amber-950 border-b border-amber-200' : 'bg-stone-800 border-b border-stone-700'}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-stone-100 truncate text-base">{event.title}</h3>
            <p className="text-sm text-stone-500 mt-0.5">{props.clientName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-300 hover:text-stone-300 p-1 -mr-1 rounded-lg hover:bg-stone-700 transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE_COLORS[props.status] || 'bg-stone-800 text-stone-300'}`}
          >
            {STATUS_LABELS[props.status] || props.status}
          </span>
          {prepInfo && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${prepInfo.color}`}>
              Prep: {prepInfo.label}
            </span>
          )}
          {isPrep && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-900 text-amber-700">
              Prep Day
            </span>
          )}
          {isInquiry && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 border border-stone-700 border-dashed">
              Tentative Hold
            </span>
          )}
        </div>

        {/* Date & Time */}
        <div className="flex items-start gap-3 text-sm">
          <svg
            className="w-4 h-4 text-stone-300 mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
            />
          </svg>
          <div>
            <div className="text-stone-100">{formattedDate}</div>
            {!isPrep && formattedTime && (
              <div className="text-stone-500">
                Service at {formattedTime}
                {props.arrivalTime && ` (arrive ${props.arrivalTime})`}
              </div>
            )}
          </div>
        </div>

        {/* Location */}
        {props.locationAddress && (
          <div className="flex items-start gap-3 text-sm">
            <svg
              className="w-4 h-4 text-stone-300 mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
              />
            </svg>
            <div className="text-stone-300">
              {props.locationAddress}
              {props.locationCity && `, ${props.locationCity}`}
            </div>
          </div>
        )}

        {/* Guest Count */}
        {props.guestCount > 0 && (
          <div className="flex items-start gap-3 text-sm">
            <svg
              className="w-4 h-4 text-stone-300 mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
              />
            </svg>
            <div className="text-stone-300">{props.guestCount} guests</div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 bg-stone-800 border-t border-stone-800 flex items-center gap-2">
        {isInquiry ? (
          <Link
            href={`/inquiries/${props.eventId}`}
            className="flex-1 text-center text-sm font-medium px-3 py-2 rounded-lg bg-stone-600 text-white hover:bg-stone-700 transition-colors"
          >
            View Inquiry
          </Link>
        ) : (
          <>
            <Link
              href={`/events/${props.eventId}`}
              className="flex-1 text-center text-sm font-medium px-3 py-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors"
            >
              View Event
            </Link>
            <Link
              href={`/events/${props.eventId}#timeline`}
              className="text-sm font-medium px-3 py-2 rounded-lg border border-stone-700 text-stone-300 hover:bg-stone-800 transition-colors"
            >
              Timeline
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
