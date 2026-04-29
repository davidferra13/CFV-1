// Pre-Event Nerve Center
// Unified T-minus card for events within 48 hours of service.
// Consolidates weather, prep status, readiness gates, logistics, and comms
// into ONE surface so the chef sees everything without clicking through tabs.
// 100% deterministic. No AI. All existing infrastructure.

import Link from 'next/link'
import { format, differenceInMinutes } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EventRunModeRail } from '@/components/events/event-run-mode-rail'
import { getEventWeather, type EventWeather } from '@/lib/weather/open-meteo'
import { assessWeatherRisk, type WeatherRiskResult } from '@/lib/formulas/weather-risk'
import { fetchForecast } from '@/lib/weather/open-meteo'
import { dateToDateString } from '@/lib/utils/format'
import { buildEventMobileRunModeHref } from '@/lib/events/operation-registry'

// ── Types ───────────────────────────────────────────────────────────────────

export interface NerveCenterProps {
  eventId: string
  eventDate: string | Date
  serveTime: string | null
  status: string
  occasion: string | null
  guestCount: number
  locationLat: number | null
  locationLng: number | null
  locationAddress: string | null
  // Prep
  prepTimeline: {
    days: Array<{
      label: string
      items: Array<{ recipeName: string; componentName: string }>
      totalPrepMinutes: number
      isToday: boolean
      isPast: boolean
      isServiceDay: boolean
    }>
    untimedItems: Array<{ recipeName: string }>
    groceryDeadline: string | null
  } | null
  // Readiness
  readinessBlockers: Array<{
    label: string
    description: string
    ctaLabel: string
    verifyRoute: string
  }>
  readinessConfidence: number | null
  // Travel
  travelInfo: { distanceMiles: number; durationMinutes: number } | null
  // Packing
  packingStatus: 'not_started' | 'in_progress' | 'packed'
  packingConfirmedCount: number
  // Comms
  lastMessageAt: string | null
  unreadMessageCount: number
  // Staff
  staffAssignedCount: number
  // Client
  clientName: string | null
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getTMinus(
  eventDate: string | Date,
  serveTime: string | null
): {
  label: string
  hours: number
  urgency: 'green' | 'amber' | 'red'
} {
  const now = new Date()
  const dateStr = dateToDateString(eventDate)
  let target: Date
  if (serveTime) {
    // Parse "6:00 PM" or "18:00" style times
    const match = serveTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
    if (match) {
      let hours = parseInt(match[1], 10)
      const mins = parseInt(match[2], 10)
      if (match[3]?.toUpperCase() === 'PM' && hours !== 12) hours += 12
      if (match[3]?.toUpperCase() === 'AM' && hours === 12) hours = 0
      target = new Date(
        `${dateStr}T${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`
      )
    } else {
      target = new Date(`${dateStr}T18:00:00`)
    }
  } else {
    target = new Date(`${dateStr}T18:00:00`)
  }

  const totalMinutes = differenceInMinutes(target, now)
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60

  let label: string
  if (totalMinutes <= 0) {
    label = 'NOW'
  } else if (hours < 1) {
    label = `T-${mins}m`
  } else if (hours < 24) {
    label = `T-${hours}h ${mins > 0 ? `${mins}m` : ''}`
  } else {
    const days = Math.floor(hours / 24)
    const remainHours = hours % 24
    label = `T-${days}d ${remainHours}h`
  }

  const urgency = totalMinutes <= 0 ? 'red' : hours < 6 ? 'red' : hours < 24 ? 'amber' : 'green'

  return { label: label.trim(), hours, urgency }
}

function urgencyColor(urgency: 'green' | 'amber' | 'red') {
  switch (urgency) {
    case 'green':
      return 'text-emerald-400'
    case 'amber':
      return 'text-amber-400'
    case 'red':
      return 'text-red-400'
  }
}

function urgencyBg(urgency: 'green' | 'amber' | 'red') {
  switch (urgency) {
    case 'green':
      return 'bg-emerald-950/50 border-emerald-800/50'
    case 'amber':
      return 'bg-amber-950/50 border-amber-800/50'
    case 'red':
      return 'bg-red-950/50 border-red-800/50'
  }
}

function riskBadgeVariant(level: string): 'success' | 'warning' | 'error' | 'default' {
  switch (level) {
    case 'low':
      return 'success'
    case 'moderate':
      return 'warning'
    case 'high':
      return 'error'
    case 'severe':
      return 'error'
    default:
      return 'default'
  }
}

function getWeatherUnavailableMessage(input: {
  eventDate: string | Date
  locationLat: number | null
  locationLng: number | null
  weatherError: string | null
}): string {
  if (input.weatherError) return input.weatherError

  if (input.locationLat === null || input.locationLng === null) {
    return 'Add event coordinates to check weather'
  }

  const target = new Date(dateToDateString(input.eventDate))
  if (Number.isNaN(target.getTime())) {
    return 'Weather unavailable for this event date'
  }

  const today = new Date(dateToDateString(new Date()))
  const daysUntilService = Math.ceil((target.getTime() - today.getTime()) / 86_400_000)

  if (daysUntilService > 16) {
    return 'Forecast opens within 16 days of service'
  }

  if (daysUntilService < -1) {
    return 'Historical weather unavailable for this service date'
  }

  return 'Forecast unavailable for this service date'
}

// ── Component ───────────────────────────────────────────────────────────────

export async function PreEventNerveCenter(props: NerveCenterProps) {
  const {
    eventId,
    eventDate,
    serveTime,
    status,
    occasion,
    guestCount,
    locationLat,
    locationLng,
    locationAddress,
    prepTimeline,
    readinessBlockers,
    readinessConfidence,
    travelInfo,
    packingStatus,
    packingConfirmedCount,
    lastMessageAt,
    unreadMessageCount,
    staffAssignedCount,
    clientName,
  } = props

  const tMinus = getTMinus(eventDate, serveTime)
  const dopMobileHref = buildEventMobileRunModeHref(eventId, 'dop')

  // Fetch weather if we have coordinates
  let weather: EventWeather | null = null
  let weatherRisk: WeatherRiskResult | null = null
  let weatherError: string | null = null

  if (locationLat !== null && locationLng !== null) {
    try {
      const weatherResult = await getEventWeather(locationLat, locationLng, eventDate)
      weather = weatherResult.data
      if (!weather && weatherResult.error) {
        weatherError = weatherResult.error
      }
      // Also get forecast for risk scoring
      if (weather) {
        const dateStr = dateToDateString(eventDate)
        const { forecasts } = await fetchForecast(locationLat, locationLng)
        const dayForecast = forecasts.find((f) => f.date === dateStr)
        if (dayForecast) {
          weatherRisk = assessWeatherRisk(dayForecast)
        }
      }
    } catch {
      weatherError = 'Could not check weather'
    }
  }

  // Prep stats
  const prepStats = computePrepStats(prepTimeline)

  // Count blockers
  const blockerCount = readinessBlockers.length

  return (
    <Card className={`p-0 overflow-hidden border ${urgencyBg(tMinus.urgency)}`}>
      {/* Header bar */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-stone-800/50">
        <div className="flex items-center gap-3">
          <span className={`text-2xl font-mono font-bold ${urgencyColor(tMinus.urgency)}`}>
            {tMinus.label}
          </span>
          <div>
            <h3 className="text-sm font-semibold text-stone-100">Pre-Event Nerve Center</h3>
            <p className="text-xs text-stone-400">
              {occasion || 'Event'} for {clientName || 'client'}
              {serveTime ? ` at ${serveTime}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {blockerCount > 0 && (
            <Badge variant="error">
              {blockerCount} blocker{blockerCount !== 1 ? 's' : ''}
            </Badge>
          )}
          {readinessConfidence !== null && (
            <Badge
              variant={
                readinessConfidence >= 80
                  ? 'success'
                  : readinessConfidence >= 50
                    ? 'warning'
                    : 'error'
              }
            >
              {readinessConfidence}% ready
            </Badge>
          )}
        </div>
      </div>

      {/* Grid of status panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-stone-800/30">
        {/* 1. Weather */}
        <div className="p-4 bg-stone-900/80">
          <h4 className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
            Weather
          </h4>
          {weather ? (
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{weather.emoji}</span>
                <div>
                  <p className="text-sm font-medium text-stone-100">{weather.description}</p>
                  <p className="text-xs text-stone-400">
                    {weather.tempMinF}--{weather.tempMaxF}F
                  </p>
                </div>
              </div>
              {weatherRisk && (
                <div className="mt-2">
                  <Badge variant={riskBadgeVariant(weatherRisk.riskLevel)}>
                    {weatherRisk.riskLevel} risk
                  </Badge>
                  {weatherRisk.warnings.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {weatherRisk.warnings.slice(0, 2).map((w, i) => (
                        <li key={i} className="text-xs text-amber-400">
                          {w}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {weather.isHistorical && (
                <p className="text-xs text-stone-500 mt-1">Actual recorded weather</p>
              )}
            </div>
          ) : (
            <p
              className={`text-xs ${
                locationLat === null || locationLng === null ? 'text-amber-400' : 'text-stone-500'
              }`}
            >
              {getWeatherUnavailableMessage({
                eventDate,
                locationLat,
                locationLng,
                weatherError,
              })}
            </p>
          )}
        </div>

        {/* 2. Prep Status */}
        <div className="p-4 bg-stone-900/80">
          <h4 className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">Prep</h4>
          {prepTimeline ? (
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-stone-100">
                  {prepStats.completedItems}
                </span>
                <span className="text-sm text-stone-500">/ {prepStats.totalItems} items done</span>
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-2 rounded-full bg-stone-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${prepStats.percent}%` }}
                />
              </div>
              {prepStats.todayItems > 0 && (
                <p className="text-xs text-amber-400 mt-1.5">
                  {prepStats.todayItems} item{prepStats.todayItems !== 1 ? 's' : ''} due today (
                  {prepStats.todayMinutes} min)
                </p>
              )}
              {prepStats.overdueItems > 0 && (
                <p className="text-xs text-red-400 mt-0.5">
                  {prepStats.overdueItems} overdue item{prepStats.overdueItems !== 1 ? 's' : ''}
                </p>
              )}
              {prepStats.untimedCount > 0 && (
                <p className="text-xs text-stone-500 mt-0.5">{prepStats.untimedCount} untimed</p>
              )}
              <Link
                href={`/events/${eventId}?tab=prep`}
                className="text-xs text-brand-500 hover:text-brand-400 mt-2 inline-block"
              >
                View timeline
              </Link>
            </div>
          ) : (
            <div>
              <p className="text-xs text-amber-400">No prep timeline</p>
              <p className="text-xs text-stone-500 mt-0.5">
                Add recipes with peak windows to generate
              </p>
            </div>
          )}
        </div>

        {/* 3. Logistics */}
        <div className="p-4 bg-stone-900/80">
          <h4 className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
            Logistics
          </h4>
          <div className="space-y-2">
            {/* Guest count */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-400">Guests</span>
              <span className="text-sm font-medium text-stone-100">{guestCount}</span>
            </div>
            {/* Travel */}
            {travelInfo ? (
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-400">Travel</span>
                <span className="text-sm text-stone-100">
                  {travelInfo.distanceMiles}mi, ~{travelInfo.durationMinutes}min
                </span>
              </div>
            ) : locationAddress ? (
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-400">Travel</span>
                <span className="text-xs text-stone-500">Geocode needed</span>
              </div>
            ) : null}
            {/* Packing */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-400">Packing</span>
              {packingStatus === 'packed' ? (
                <Badge variant="success">Packed</Badge>
              ) : packingConfirmedCount > 0 ? (
                <span className="text-sm text-amber-400">{packingConfirmedCount} items</span>
              ) : (
                <span className="text-xs text-stone-500">Not started</span>
              )}
            </div>
            {/* Staff */}
            {staffAssignedCount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-400">Staff</span>
                <span className="text-sm text-stone-100">{staffAssignedCount} assigned</span>
              </div>
            )}
            {/* Location */}
            {locationAddress && (
              <p className="text-xs text-stone-500 truncate" title={locationAddress}>
                {locationAddress}
              </p>
            )}
          </div>
        </div>

        {/* 4. Comms & Readiness */}
        <div className="p-4 bg-stone-900/80">
          <h4 className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
            Status
          </h4>
          <div className="space-y-2">
            {/* Last contact */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-400">Last contact</span>
              {lastMessageAt ? (
                <span className="text-xs text-stone-300">
                  {format(new Date(lastMessageAt), 'MMM d, h:mm a')}
                </span>
              ) : (
                <span className="text-xs text-amber-400">No messages</span>
              )}
            </div>
            {unreadMessageCount > 0 && (
              <p className="text-xs text-amber-400">{unreadMessageCount} unread</p>
            )}
            {/* Blockers */}
            {blockerCount > 0 && (
              <div className="mt-1 space-y-1">
                <p className="text-xs font-medium text-red-400">Blockers:</p>
                {readinessBlockers.slice(0, 3).map((b, i) => (
                  <Link
                    key={i}
                    href={
                      b.verifyRoute.startsWith('/')
                        ? b.verifyRoute
                        : `/events/${eventId}/${b.verifyRoute}`
                    }
                    className="block text-xs text-red-300 hover:text-red-200 truncate"
                    title={b.description}
                  >
                    {b.label}
                  </Link>
                ))}
                {blockerCount > 3 && (
                  <p className="text-xs text-stone-500">+{blockerCount - 3} more</p>
                )}
              </div>
            )}
            {blockerCount === 0 && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-emerald-400">No blockers</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick action bar */}
      <div className="px-4 py-2.5 border-t border-stone-800/50 flex flex-wrap items-center gap-2 bg-stone-900/60">
        <EventRunModeRail eventId={eventId} status={status} compact />
        <Link href={`/events/${eventId}/grocery-quote`}>
          <Button variant="secondary" size="sm">
            Grocery
          </Button>
        </Link>
        <Link href={`/events/${eventId}?tab=prep`}>
          <Button variant="secondary" size="sm">
            Prep
          </Button>
        </Link>
        {tMinus.hours <= 0 && (
          <Link href={dopMobileHref}>
            <Button variant="primary" size="sm">
              Go Live
            </Button>
          </Link>
        )}
      </div>
    </Card>
  )
}

// ── Prep Stats Calculator ───────────────────────────────────────────────────

function computePrepStats(timeline: NerveCenterProps['prepTimeline']) {
  if (!timeline) {
    return {
      completedItems: 0,
      totalItems: 0,
      percent: 0,
      todayItems: 0,
      todayMinutes: 0,
      overdueItems: 0,
      untimedCount: 0,
    }
  }

  let totalItems = 0
  let completedItems = 0
  let todayItems = 0
  let todayMinutes = 0
  let overdueItems = 0

  for (const day of timeline.days) {
    const itemCount = day.items.length
    totalItems += itemCount

    if (day.isPast && !day.isToday && !day.isServiceDay) {
      // Past days are considered complete (chef did them or they're overdue)
      completedItems += itemCount
    }

    if (day.isToday) {
      todayItems = itemCount
      todayMinutes = day.totalPrepMinutes
    }

    // Items on past non-today days that weren't service day are potentially overdue
    // but we treat past prep as done since timeline is reverse-computed
  }

  // For overdue: items on past days that are NOT the service day
  // (In practice, if today is service day and there are past prep days, those should be done)
  for (const day of timeline.days) {
    if (day.isPast && !day.isToday && !day.isServiceDay && day.items.length > 0) {
      // These should have been done; count them as done not overdue
      // (prep timeline is the plan, not a checklist with completion state)
    }
  }

  const untimedCount = timeline.untimedItems.length
  totalItems += untimedCount

  const percent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 100

  return {
    completedItems,
    totalItems,
    percent,
    todayItems,
    todayMinutes,
    overdueItems,
    untimedCount,
  }
}
