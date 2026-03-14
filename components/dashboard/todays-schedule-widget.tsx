'use client'

// Today's Schedule Widget - Intelligence-enhanced
// Shows: countdown timers, weather alerts, client context, prep gate, timeline

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Clock, AlertTriangle, User, CheckCircle } from '@/components/ui/icons'
import { TimelineView } from '@/components/scheduling/timeline-view'
import type {
  EnrichedTodaySchedule,
  WeatherAlert,
  ClientEventContext,
  PrepGate,
} from '@/lib/scheduling/types'

interface TodaysScheduleWidgetProps {
  schedule: EnrichedTodaySchedule
  weather?: {
    emoji: string
    tempMinF: number
    tempMaxF: number
    description: string
    precipitationMm: number
  } | null
}

// Phase labels for display
const PHASE_LABELS: Record<string, string> = {
  pre_event: 'Pre-Event',
  shopping: 'Shopping',
  prep: 'Prep',
  packing: 'Packing',
  travel: 'In Transit',
  service: 'Service',
  cleanup: 'Cleanup',
  post_event: 'Post-Event',
}

const PHASE_COLORS: Record<string, string> = {
  pre_event: 'bg-stone-700 text-stone-200',
  shopping: 'bg-blue-900 text-blue-200',
  prep: 'bg-purple-900 text-purple-200',
  packing: 'bg-indigo-900 text-indigo-200',
  travel: 'bg-amber-900 text-amber-200',
  service: 'bg-emerald-900 text-emerald-200',
  cleanup: 'bg-stone-700 text-stone-300',
  post_event: 'bg-stone-800 text-stone-400',
}

export function TodaysScheduleWidget({ schedule, weather }: TodaysScheduleWidgetProps) {
  const {
    event,
    timeline,
    currentPhase,
    nextMilestone,
    departureTime,
    minutesUntilDeparture,
    clientContext,
    prepGate,
    weatherAlerts,
  } = schedule

  return (
    <Card className="border-brand-700">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CardTitle className="text-brand-200">Today: {event.occasion || 'Event'}</CardTitle>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${PHASE_COLORS[currentPhase] ?? 'bg-stone-700 text-stone-300'}`}
            >
              {PHASE_LABELS[currentPhase] ?? currentPhase}
            </span>
          </div>
          <Link
            href={`/events/${event.id}/schedule`}
            className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-400"
          >
            Full Schedule <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Client info + weather */}
        <div className="text-sm text-stone-300">
          {event.client?.full_name} - {event.guest_count} guests
          {event.location_city && ` - ${event.location_city}`}
          {weather && (
            <span
              className="ml-2 inline-flex items-center gap-1 text-sky-400"
              title={weather.description}
            >
              <span>{weather.emoji}</span>
              <span>
                {weather.tempMinF}-{weather.tempMaxF}F
              </span>
              {weather.precipitationMm > 0.5 && (
                <span className="text-amber-400 ml-0.5">&#x1F4A7;</span>
              )}
            </span>
          )}
        </div>

        {/* Countdown timers */}
        <CountdownStrip
          nextMilestone={nextMilestone}
          departureTime={departureTime}
          minutesUntilDeparture={minutesUntilDeparture}
        />

        {/* Weather alerts */}
        {weatherAlerts.length > 0 && (
          <div className="space-y-1">
            {weatherAlerts.map((alert, i) => (
              <WeatherAlertBadge key={i} alert={alert} />
            ))}
          </div>
        )}

        {/* Client context card */}
        {clientContext && <ClientContextCard context={clientContext} />}

        {/* Prep gate */}
        {prepGate.total > 0 && <PrepGateBar gate={prepGate} eventId={event.id} />}

        {/* Compressed timeline warning */}
        {schedule.dop.isCompressed && (
          <div className="bg-amber-950 border border-amber-200 rounded-lg p-2">
            <p className="text-sm font-medium text-amber-900">Compressed timeline active</p>
          </div>
        )}

        {/* Timeline */}
        <TimelineView timeline={timeline} />
      </CardContent>
    </Card>
  )
}

// ── Countdown Strip ──────────────────────────────────────────────

function CountdownStrip({
  nextMilestone,
  departureTime,
  minutesUntilDeparture,
}: {
  nextMilestone: EnrichedTodaySchedule['nextMilestone']
  departureTime: string | null
  minutesUntilDeparture: number | null
}) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(interval)
  }, [])

  if (!nextMilestone && minutesUntilDeparture == null) return null

  // Recompute from live clock
  const liveDepartureMinutes = departureTime
    ? Math.round((new Date(departureTime).getTime() - now) / 60000)
    : null

  const liveMilestoneMinutes = nextMilestone
    ? Math.round((new Date(nextMilestone.time).getTime() - now) / 60000)
    : null

  return (
    <div className="flex flex-wrap gap-2">
      {liveDepartureMinutes != null && (
        <CountdownPill
          label={
            liveDepartureMinutes <= 0
              ? 'Leave NOW'
              : `Leave in ${formatMinutes(liveDepartureMinutes)}`
          }
          minutes={liveDepartureMinutes}
        />
      )}
      {liveMilestoneMinutes != null && nextMilestone && (
        <CountdownPill
          label={
            liveMilestoneMinutes <= 0
              ? `${nextMilestone.label} now`
              : `${nextMilestone.label} in ${formatMinutes(liveMilestoneMinutes)}`
          }
          minutes={liveMilestoneMinutes}
        />
      )}
    </div>
  )
}

function CountdownPill({ label, minutes }: { label: string; minutes: number }) {
  const urgencyClass =
    minutes <= 0
      ? 'bg-red-900 text-red-200 animate-pulse'
      : minutes <= 30
        ? 'bg-red-900/60 text-red-300'
        : minutes <= 120
          ? 'bg-amber-900/60 text-amber-300'
          : 'bg-emerald-900/60 text-emerald-300'

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${urgencyClass}`}
    >
      <Clock className="h-3 w-3" />
      {label}
    </span>
  )
}

function formatMinutes(mins: number): string {
  if (mins < 0) return '0m'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// ── Weather Alert Badge ──────────────────────────────────────────

function WeatherAlertBadge({ alert }: { alert: WeatherAlert }) {
  const styles = {
    critical: 'bg-red-950 border-red-800 text-red-300',
    warning: 'bg-amber-950 border-amber-800 text-amber-300',
    info: 'bg-sky-950 border-sky-800 text-sky-300',
  }

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs ${styles[alert.severity]}`}
    >
      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
      <span>{alert.message}</span>
    </div>
  )
}

// ── Client Context Card ──────────────────────────────────────────

function ClientContextCard({ context }: { context: ClientEventContext }) {
  return (
    <div className="bg-stone-800 rounded-lg p-3 space-y-1">
      <div className="flex items-center gap-2 text-sm text-stone-200">
        <User className="h-3.5 w-3.5 text-stone-400" />
        <span className="font-medium">{context.name}</span>
        {context.dietaryRestrictions && (
          <span className="text-xs bg-stone-700 px-1.5 py-0.5 rounded text-stone-300">
            {context.dietaryRestrictions}
          </span>
        )}
      </div>

      {/* Allergies - always visible, red highlight for safety */}
      {context.allergies && (
        <div className="flex items-center gap-1.5 text-xs">
          <span className="bg-red-900 text-red-200 font-bold px-1.5 py-0.5 rounded">ALLERGY</span>
          <span className="text-red-300 font-medium">{context.allergies}</span>
        </div>
      )}

      {/* History */}
      {context.pastEventCount > 0 && (
        <p className="text-xs text-stone-400">
          {ordinal(context.pastEventCount + 1)} event together
          {context.lastEventDate && context.lastOccasion && <> - last: {context.lastOccasion}</>}
        </p>
      )}
      {context.pastEventCount === 0 && (
        <p className="text-xs text-amber-400">First event with this client</p>
      )}
    </div>
  )
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// ── Prep Gate Bar ────────────────────────────────────────────────

function PrepGateBar({ gate, eventId }: { gate: PrepGate; eventId: string }) {
  const pct = Math.round(gate.progress * 100)
  const barColor = pct >= 100 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-stone-300 font-medium">
          Prep: {gate.completed}/{gate.total} complete
        </span>
        <span className="text-stone-400">{pct}%</span>
      </div>
      <div className="h-1.5 bg-stone-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {gate.blockers.length > 0 && (
        <div className="space-y-1">
          {gate.blockers.map((blocker, i) => (
            <Link
              key={i}
              href={`/events/${eventId}/schedule`}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300"
            >
              <AlertTriangle className="h-3 w-3" />
              <span className="font-medium">OVERDUE:</span>
              <span>{blocker.label}</span>
            </Link>
          ))}
        </div>
      )}
      {gate.blockers.length === 0 && pct >= 100 && (
        <div className="flex items-center gap-1 text-xs text-emerald-400">
          <CheckCircle className="h-3 w-3" />
          <span>All prep complete</span>
        </div>
      )}
    </div>
  )
}
