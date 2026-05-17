'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { CalendarDays, Clock } from '@/components/ui/icons'
import { getUnsourcedIngredientStatus } from '@/lib/culinary/ingredient-lifecycle'

type CountdownWeather = {
  condition: string
  emoji: string
  tempHighF: number
  tempLowF: number
  precipProbability: number
} | null

type Props = {
  eventName: string
  eventDate: string
  status: string
  countdownEnabled: boolean
  serveTime?: string
  arrivalTime?: string | null
  locationAddress?: string | null
  locationCity?: string | null
  locationState?: string | null
  guestCount?: number | null
  specialRequests?: string | null
  accessInstructions?: string | null
  weather?: CountdownWeather
  daysUntil?: number
  isChefView?: boolean
  eventId?: string
}

function computeCountdown(eventDate: string, serveTime?: string, arrivalTime?: string | null) {
  const now = new Date()
  // Build target in local timezone using date parts to avoid UTC midnight offset.
  // Use arrivalTime or serveTime to pinpoint the event moment.
  const [year, month, day] = eventDate.split('-').map(Number)
  let targetHour = 18,
    targetMin = 0 // default 6 PM if no time provided
  const timeStr = arrivalTime || serveTime
  if (timeStr) {
    const [h, m] = timeStr.split(':').map(Number)
    targetHour = h
    targetMin = m
  }
  const target = new Date(year, month - 1, day, targetHour, targetMin)
  const diff = target.getTime() - now.getTime()

  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, isPast: true }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  return { days, hours, minutes, isPast: false }
}

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

export function EventCountdown({
  eventName,
  eventDate,
  status,
  countdownEnabled,
  serveTime,
  arrivalTime,
  locationAddress,
  locationCity,
  locationState,
  guestCount,
  specialRequests,
  accessInstructions,
  weather,
  daysUntil,
  isChefView,
  eventId,
}: Props) {
  const [countdown, setCountdown] = useState(computeCountdown(eventDate, serveTime, arrivalTime))
  const [unsourcedCount, setUnsourcedCount] = useState(0)

  useEffect(() => {
    if (!countdownEnabled) return
    const interval = setInterval(() => {
      setCountdown(computeCountdown(eventDate, serveTime, arrivalTime))
    }, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [eventDate, serveTime, arrivalTime, countdownEnabled])

  // Fetch unsourced ingredient count for chef view when event is within 48h
  useEffect(() => {
    if (!isChefView || !eventId) return
    const now = new Date()
    const [year, month, day] = eventDate.split('-').map(Number)
    const eventTime = new Date(year, month - 1, day, 18, 0)
    const hoursUntil = (eventTime.getTime() - now.getTime()) / (1000 * 60 * 60)
    if (hoursUntil > 48 || hoursUntil <= 0) return

    getUnsourcedIngredientStatus(eventId)
      .then((result) => {
        if (result.flagEnabled) {
          setUnsourcedCount(result.unsourcedCount)
        }
      })
      .catch(() => {
        // Silently fail; badge simply won't show
      })
  }, [isChefView, eventId, eventDate])

  if (!countdownEnabled) return null

  // Parse as local date parts to avoid UTC offset shifting the displayed day
  const [yr, mo, dy] = eventDate.split('-').map(Number)
  const formattedDate = new Date(yr, mo - 1, dy).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const locationLine = [locationAddress, locationCity, locationState].filter(Boolean).join(', ')

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-brand-50 to-white border-brand-700">
        <CardContent className="py-6 text-center">
          <CalendarDays className="h-8 w-8 text-brand-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-stone-100 mb-1">{eventName}</h3>
          <p className="text-sm text-stone-500 mb-4">{formattedDate}</p>

          {countdown.isPast ? (
            <div className="text-sm text-stone-500">Event has started or passed</div>
          ) : (
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-brand-600">{countdown.days}</p>
                <p className="text-xs text-stone-500 uppercase">Days</p>
              </div>
              <span className="text-2xl text-stone-300">:</span>
              <div className="text-center">
                <p className="text-3xl font-bold text-brand-600">{countdown.hours}</p>
                <p className="text-xs text-stone-500 uppercase">Hours</p>
              </div>
              <span className="text-2xl text-stone-300">:</span>
              <div className="text-center">
                <p className="text-3xl font-bold text-brand-600">{countdown.minutes}</p>
                <p className="text-xs text-stone-500 uppercase">Minutes</p>
              </div>
            </div>
          )}

          <p className="text-xs text-stone-400 mt-3">Status: {status}</p>

          {isChefView && unsourcedCount > 0 && eventId && (
            <Link
              href={`/culinary/sourcing?eventId=${eventId}`}
              className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-medium bg-amber-900/40 text-amber-300 border border-amber-700/50 hover:bg-amber-900/60 transition-colors"
            >
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
              {unsourcedCount} ingredient{unsourcedCount !== 1 ? 's' : ''} unsourced
            </Link>
          )}
        </CardContent>
      </Card>

      {/* Practical event details */}
      <Card className="border-stone-700">
        <CardContent className="py-5">
          <h4 className="text-sm font-semibold text-stone-300 mb-3 uppercase tracking-wide">
            Event Details
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {serveTime && (
              <div>
                <span className="text-stone-500">Serve time:</span>{' '}
                <span className="text-stone-200">{formatTime12h(serveTime)}</span>
              </div>
            )}
            {arrivalTime && (
              <div>
                <span className="text-stone-500">Arrival:</span>{' '}
                <span className="text-stone-200">{formatTime12h(arrivalTime)}</span>
              </div>
            )}
            {guestCount && (
              <div>
                <span className="text-stone-500">Guests:</span>{' '}
                <span className="text-stone-200">{guestCount}</span>
              </div>
            )}
            {locationLine && (
              <div className="sm:col-span-2">
                <span className="text-stone-500">Location:</span>{' '}
                <span className="text-stone-200">{locationLine}</span>
              </div>
            )}
            {accessInstructions && (
              <div className="sm:col-span-2">
                <span className="text-stone-500">Access notes:</span>{' '}
                <span className="text-stone-200">{accessInstructions}</span>
              </div>
            )}
            {specialRequests && (
              <div className="sm:col-span-2">
                <span className="text-stone-500">Special requests:</span>{' '}
                <span className="text-stone-200">{specialRequests}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Weather forecast */}
      {weather ? (
        <Card className="border-stone-700">
          <CardContent className="py-5">
            <h4 className="text-sm font-semibold text-stone-300 mb-3 uppercase tracking-wide">
              Weather Forecast
            </h4>
            <div className="flex items-center gap-4">
              <span className="text-3xl">{weather.emoji}</span>
              <div className="space-y-1">
                <p className="text-stone-200 font-medium">{weather.condition}</p>
                <p className="text-sm text-stone-400">
                  {weather.tempLowF}&deg;F to {weather.tempHighF}&deg;F
                </p>
                {weather.precipProbability > 0 && (
                  <p className="text-sm text-stone-400">
                    {weather.precipProbability}% chance of rain
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : daysUntil != null && daysUntil > 7 && !countdown.isPast ? (
        <Card className="border-stone-700">
          <CardContent className="py-5">
            <h4 className="text-sm font-semibold text-stone-300 mb-2 uppercase tracking-wide">
              Weather Forecast
            </h4>
            <p className="text-sm text-stone-500">
              Weather forecast available closer to your event date.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Last-minute reminders when event is close */}
      {countdown.days <= 3 && !countdown.isPast && (
        <Card className="border-amber-700/50 bg-amber-950/20">
          <CardContent className="py-4">
            <h4 className="text-sm font-semibold text-amber-400 mb-2">Last-Minute Reminders</h4>
            <ul className="text-sm text-stone-400 space-y-1 list-disc list-inside">
              <li>Confirm your guest count is up to date</li>
              <li>Clear counter and prep space for your chef</li>
              <li>Check that any dietary updates are communicated</li>
              {accessInstructions && <li>Gate code or entry info is current</li>}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
