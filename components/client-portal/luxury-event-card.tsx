'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Calendar, Users, MapPin } from '@/components/ui/icons'

interface LuxuryEventCardProps {
  eventId: string
  eventDate: string
  occasion: string | null
  guestCount: number | null
  location: string | null
  chefNote: string | null
  chefName: string | null
  dietarySummary: string | null
  status: string
}

function useCountdown(targetDate: string) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const target = new Date(targetDate)
  const diff = target.getTime() - now.getTime()

  if (diff <= 0) return null

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  return { days, hours, minutes }
}

export function LuxuryEventCard({
  eventId,
  eventDate,
  occasion,
  guestCount,
  location,
  chefNote,
  chefName,
  dietarySummary,
  status,
}: LuxuryEventCardProps) {
  const countdown = useCountdown(eventDate)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const formattedDate = format(new Date(eventDate), 'EEEE, MMMM d, yyyy')
  const isUpcoming = ['paid', 'confirmed', 'in_progress'].includes(status)
  const isPast = status === 'completed'

  return (
    <div
      className={`luxury-portal-card group relative overflow-hidden rounded-2xl border transition-all duration-500 ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      } ${
        isUpcoming
          ? 'border-[#c4a35a]/30 bg-gradient-to-br from-[#faf9f7] to-[#f5f0e8]'
          : 'border-stone-200 bg-[#faf9f7]'
      }`}
    >
      {/* Gold accent line */}
      {isUpcoming && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#c4a35a] to-transparent" />
      )}

      <div className="p-8 sm:p-10">
        {/* Event title */}
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#c4a35a] mb-2">
            {isUpcoming ? 'Your Upcoming Dinner' : isPast ? 'Past Event' : 'Event'}
          </p>
          <h2 className="font-display-serif text-2xl sm:text-3xl font-bold text-[#2d2d2d] leading-tight">
            {occasion || 'Private Dining Experience'}
          </h2>
        </div>

        {/* Date display */}
        <div className="flex items-center gap-3 mb-6 text-[#2d2d2d]/70">
          <Calendar className="h-4 w-4 text-[#c4a35a]" />
          <span className="text-sm font-medium">{formattedDate}</span>
        </div>

        {/* Countdown */}
        {countdown && isUpcoming && (
          <div className="mb-8 rounded-xl bg-[#2d2d2d] p-6 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-[#c4a35a] mb-3">
              Your dinner is in
            </p>
            <div className="flex items-center justify-center gap-6">
              <CountdownUnit value={countdown.days} label="days" />
              <span className="text-[#c4a35a]/40 text-2xl font-light">:</span>
              <CountdownUnit value={countdown.hours} label="hours" />
              <span className="text-[#c4a35a]/40 text-2xl font-light">:</span>
              <CountdownUnit value={countdown.minutes} label="min" />
            </div>
          </div>
        )}

        {/* Details grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {guestCount && (
            <div className="flex items-center gap-3 text-sm text-[#2d2d2d]/70">
              <Users className="h-4 w-4 text-[#c4a35a]/70" />
              <span>
                {guestCount} guest{guestCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}
          {location && (
            <div className="flex items-center gap-3 text-sm text-[#2d2d2d]/70">
              <MapPin className="h-4 w-4 text-[#c4a35a]/70" />
              <span className="truncate">{location}</span>
            </div>
          )}
        </div>

        {/* Dietary summary */}
        {dietarySummary && (
          <div className="mb-6 rounded-lg bg-[#f5f0e8] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#2d2d2d]/50 mb-1">
              Dietary Notes
            </p>
            <p className="text-sm text-[#2d2d2d]/70">{dietarySummary}</p>
          </div>
        )}

        {/* Chef's note */}
        {chefNote && (
          <div className="mb-6 border-l-2 border-[#c4a35a]/40 pl-5">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-[#c4a35a] mb-2">
              A note from {chefName || 'your chef'}
            </p>
            <p className="text-sm text-[#2d2d2d]/80 italic leading-relaxed">
              &ldquo;{chefNote}&rdquo;
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="pt-2">
          <Link
            href={`/my-events/${eventId}`}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2d2d2d] px-6 py-3 text-sm font-medium text-[#faf9f7] transition-colors hover:bg-[#2d2d2d]/90"
          >
            View Event Details
          </Link>
        </div>
      </div>
    </div>
  )
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-3xl sm:text-4xl font-light text-white tabular-nums">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 mt-1">{label}</span>
    </div>
  )
}
