'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import {
  logDashboardHours,
  type DashboardHoursEntry,
  type DashboardHoursTopActivity,
  type DashboardHoursCategoryEntry,
  type ManualLaborCategory,
  type UnloggedEvent,
} from '@/lib/dashboard/actions'
import Link from 'next/link'
import { formatMinutesAsDuration } from '@/lib/events/time-tracking'

const CATEGORY_OPTIONS: { value: ManualLaborCategory; label: string }[] = [
  { value: 'planning', label: 'Planning & Menu Design' },
  { value: 'admin', label: 'Admin & Bookkeeping' },
  { value: 'client_comms', label: 'Client Communication' },
  { value: 'marketing', label: 'Marketing & Social Media' },
  { value: 'recipe_dev', label: 'Recipe Development' },
  { value: 'shopping_sourcing', label: 'Shopping & Sourcing' },
  { value: 'prep_work', label: 'Prep Work' },
  { value: 'cooking_service', label: 'Cooking & Service' },
  { value: 'cleanup', label: 'Cleanup & Reset' },
  { value: 'travel', label: 'Travel' },
  { value: 'learning', label: 'Learning & Training' },
  { value: 'charity', label: 'Charity / Volunteer' },
  { value: 'other', label: 'Other' },
]

const QUICK_LOG_PRESETS = [
  { label: '15m', value: '0.25' },
  { label: '30m', value: '0.5' },
  { label: '1h', value: '1' },
  { label: '2h', value: '2' },
] as const

function getCategoryLabel(category: ManualLaborCategory | null): string {
  if (!category) return ''
  return CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? category
}

function getEncouragementMessage(todayMinutes: number, hasWeekHistory: boolean): string {
  if (todayMinutes === 0 && !hasWeekHistory)
    return 'Start building your labor log - every hour you track helps you understand your true value.'
  if (todayMinutes === 0 && hasWeekHistory)
    return "Add today's hours - even 30 minutes of planning or admin counts."
  if (todayMinutes < 60)
    return 'Good start! Mental work counts too - log any planning, emails, or admin time.'
  if (todayMinutes < 240)
    return "You've been tracking well today. Keep capturing all the invisible work."
  return 'Great tracking today! Consistent logs reveal what your time is truly worth.'
}

function getStreakMilestoneLabel(streak: number): string {
  if (streak >= 30) return `${streak} days in a row - one month of consistent tracking!`
  if (streak >= 14) return `${streak} days in a row - two weeks strong!`
  if (streak >= 7) return `${streak} days in a row - one full week!`
  return `${streak} ${streak === 1 ? 'day' : 'days'} in a row`
}

type HoursLogWidgetProps = {
  todayMinutes: number
  weekMinutes: number
  allTimeMinutes: number
  topActivity: DashboardHoursTopActivity | null
  recentEntries: DashboardHoursEntry[]
  trackingStreak: number
  todayLogged: boolean
  weekCategoryBreakdown: DashboardHoursCategoryEntry[]
  unloggedEvents?: UnloggedEvent[]
}

function formatEntryDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function HoursLogWidget({
  todayMinutes,
  weekMinutes,
  allTimeMinutes,
  topActivity,
  recentEntries,
  trackingStreak,
  todayLogged,
  weekCategoryBreakdown,
  unloggedEvents = [],
}: HoursLogWidgetProps) {
  const router = useRouter()
  const [dismissedUnlogged, setDismissedUnlogged] = useState<Set<string>>(new Set())
  const [loggingEventId, setLoggingEventId] = useState<string | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const [loggedFor, setLoggedFor] = useState(() => today)
  const [hours, setHours] = useState('')
  const [category, setCategory] = useState<ManualLaborCategory>('planning')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!category) {
      setError('Please select a category.')
      return
    }

    const parsedHours = Number(hours)
    if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
      setError('Enter a valid number of hours greater than 0.')
      return
    }

    const minutes = Math.round(parsedHours * 60)
    if (minutes <= 0 || minutes > 24 * 60) {
      setError('Hours must be between 0.1 and 24.')
      return
    }

    setSubmitting(true)
    try {
      await logDashboardHours({
        minutes,
        logged_for: loggedFor,
        category,
        note: note.trim() || undefined,
      })

      setHours('')
      setNote('')
      setCategory('planning')
      setLoggedFor(today)
      setSuccess(
        `Saved ${formatMinutesAsDuration(minutes)} - ${getCategoryLabel(category)} - for ${formatEntryDate(loggedFor)}.`
      )
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log hours')
    } finally {
      setSubmitting(false)
    }
  }

  const showStreakBanner = trackingStreak > 0 || !todayLogged
  const streakMessage =
    trackingStreak === 0
      ? "Log today's hours to start a streak."
      : !todayLogged
        ? `${trackingStreak} day streak - log today to keep it going!`
        : getStreakMilestoneLabel(trackingStreak)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hours Log</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-stone-700 p-3">
            <p className="text-xs uppercase tracking-wide text-stone-500">Today</p>
            <p className="text-xl font-semibold text-stone-100 mt-1">
              {formatMinutesAsDuration(todayMinutes)}
            </p>
          </div>
          <div className="rounded-lg border border-stone-700 p-3">
            <p className="text-xs uppercase tracking-wide text-stone-500">Last 7 Days</p>
            <p className="text-xl font-semibold text-stone-100 mt-1">
              {formatMinutesAsDuration(weekMinutes)}
            </p>
          </div>
          <div className="rounded-lg border border-stone-700 p-3">
            <p className="text-xs uppercase tracking-wide text-stone-500">All Time</p>
            <p className="text-xl font-semibold text-stone-100 mt-1">
              {formatMinutesAsDuration(allTimeMinutes)}
            </p>
          </div>
        </div>

        {/* Unlogged Event Hours Prompt */}
        {unloggedEvents.filter((e) => !dismissedUnlogged.has(e.id)).length > 0 && (
          <div className="space-y-2">
            {unloggedEvents
              .filter((e) => !dismissedUnlogged.has(e.id))
              .map((evt) => (
                <div key={evt.id} className="rounded-lg border border-brand-700 bg-brand-950 p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-medium text-brand-200">
                        No hours logged for {evt.occasion}
                      </p>
                      <p className="text-xs text-brand-400 mt-0.5">
                        {evt.clientName} · {formatEntryDate(evt.date)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDismissedUnlogged((prev) => new Set([...prev, evt.id]))}
                      className="text-brand-500 hover:text-brand-300 text-xs shrink-0"
                    >
                      Dismiss
                    </button>
                  </div>

                  {loggingEventId === evt.id ? (
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      {(
                        [
                          ['Service', evt.suggestedHours.service, 'cooking_service'],
                          ['Prep', evt.suggestedHours.prep, 'prep_work'],
                          ['Shopping', evt.suggestedHours.shopping, 'shopping_sourcing'],
                          ['Travel', evt.suggestedHours.travel, 'travel'],
                        ] as const
                      ).map(([label, suggested, cat]) => (
                        <div key={label} className="text-center">
                          <p className="text-stone-400 mb-1">{label}</p>
                          <p className="text-stone-200 font-medium">{suggested}h</p>
                        </div>
                      ))}
                      <div className="col-span-4 flex gap-2 mt-2">
                        <Button
                          size="sm"
                          loading={submitting}
                          onClick={async () => {
                            setSubmitting(true)
                            try {
                              const entries = [
                                {
                                  minutes: Math.round(evt.suggestedHours.service * 60),
                                  logged_for: evt.date,
                                  category: 'cooking_service' as ManualLaborCategory,
                                  note: `Auto-logged for ${evt.occasion}`,
                                },
                                {
                                  minutes: Math.round(evt.suggestedHours.prep * 60),
                                  logged_for: evt.date,
                                  category: 'prep_work' as ManualLaborCategory,
                                  note: `Auto-logged for ${evt.occasion}`,
                                },
                                {
                                  minutes: Math.round(evt.suggestedHours.shopping * 60),
                                  logged_for: evt.date,
                                  category: 'shopping_sourcing' as ManualLaborCategory,
                                  note: `Auto-logged for ${evt.occasion}`,
                                },
                                {
                                  minutes: Math.round(evt.suggestedHours.travel * 60),
                                  logged_for: evt.date,
                                  category: 'travel' as ManualLaborCategory,
                                  note: `Auto-logged for ${evt.occasion}`,
                                },
                              ].filter((e) => e.minutes > 0)

                              for (const entry of entries) {
                                await logDashboardHours(entry)
                              }

                              setDismissedUnlogged((prev) => new Set([...prev, evt.id]))
                              setLoggingEventId(null)
                              setSuccess(`Logged ${entries.length} entries for ${evt.occasion}`)
                              router.refresh()
                            } catch (err) {
                              setError('Failed to log event hours')
                            } finally {
                              setSubmitting(false)
                            }
                          }}
                        >
                          Log these hours
                        </Button>
                        <Link
                          href={`/events/${evt.id}`}
                          className="inline-flex items-center px-3 py-1 text-xs text-stone-400 hover:text-stone-200"
                        >
                          Edit first
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setLoggingEventId(evt.id)}>
                      Log hours for this event
                    </Button>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* Streak */}
        {showStreakBanner && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-950 px-3 py-2">
            {trackingStreak > 0 && (
              <span className="text-amber-700 text-sm font-mono" aria-hidden="true">
                {'▰'.repeat(Math.min(trackingStreak, 7))}
                {'▱'.repeat(Math.max(0, 7 - Math.min(trackingStreak, 7)))}
              </span>
            )}
            <p className="text-sm font-medium text-amber-800">{streakMessage}</p>
          </div>
        )}

        {/* Encouragement */}
        <p className="text-sm text-stone-500 italic">
          {getEncouragementMessage(todayMinutes, weekMinutes > 0)}
        </p>

        {/* Week category breakdown */}
        {weekCategoryBreakdown.length > 0 ? (
          <div className="space-y-1">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
              This week by category
            </p>
            {weekCategoryBreakdown.map((entry) => (
              <div key={entry.key} className="flex justify-between text-xs text-stone-400">
                <span>{entry.label}</span>
                <span className="font-medium text-stone-200">
                  {formatMinutesAsDuration(entry.minutes)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-stone-500">
            {topActivity
              ? `Most time spent: ${topActivity.label} (${formatMinutesAsDuration(topActivity.minutes)}, ${topActivity.sharePercent}% of all time).`
              : 'Most time spent: no tracked hours yet.'}
          </p>
        )}

        {/* All-time top activity (secondary, only when week breakdown is shown) */}
        {weekCategoryBreakdown.length > 0 && topActivity && (
          <p className="text-xs text-stone-400">
            All-time top: {topActivity.label} ({formatMinutesAsDuration(topActivity.minutes)},{' '}
            {topActivity.sharePercent}%)
          </p>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Quick log presets */}
          <div>
            <p className="text-xs font-medium text-stone-500 mb-1.5">Quick log</p>
            <div className="flex gap-2">
              {QUICK_LOG_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setHours(p.value)}
                  disabled={submitting}
                  className={`rounded-md border px-3 py-1 text-xs disabled:opacity-50 transition-colors ${
                    hours === p.value
                      ? 'border-stone-500 bg-stone-800 text-stone-100 font-semibold'
                      : 'border-stone-600 text-stone-300 hover:bg-stone-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Date"
              type="date"
              value={loggedFor}
              max={today}
              onChange={(event) => setLoggedFor(event.target.value)}
              required
              disabled={submitting}
            />
            <Input
              label="Hours"
              type="number"
              min="0.1"
              max="24"
              step="0.25"
              placeholder="2.5"
              value={hours}
              onChange={(event) => setHours(event.target.value)}
              required
              disabled={submitting}
              helperText="Use decimals (1.5 = 1h 30m)."
            />
            <Select
              label="Category"
              value={category}
              onChange={(event) => setCategory(event.target.value as ManualLaborCategory)}
              required
              disabled={submitting}
              options={CATEGORY_OPTIONS}
            />
          </div>

          <Textarea
            label="Note (optional)"
            placeholder="Any additional context"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            disabled={submitting}
          />

          <div className="flex justify-end">
            <Button type="submit" size="sm" loading={submitting}>
              Log Hours
            </Button>
          </div>
        </form>

        {error && (
          <Alert variant="error" title="Could not log hours">
            {error}
          </Alert>
        )}

        {success && <Alert variant="success">{success}</Alert>}

        {/* Recent Entries */}
        <div>
          <h3 className="text-sm font-semibold text-stone-300 mb-2">Recent Manual Entries</h3>
          {recentEntries.length === 0 ? (
            <p className="text-sm text-stone-500">No manual entries yet.</p>
          ) : (
            <div className="space-y-2">
              {recentEntries.slice(0, 5).map((entry) => (
                <div key={entry.id} className="rounded-lg border border-stone-700 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-stone-200">
                      {formatEntryDate(entry.loggedFor)}
                      {entry.category && (
                        <span className="ml-2 text-xs font-normal text-stone-500">
                          {getCategoryLabel(entry.category)}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-stone-400">
                      {formatMinutesAsDuration(entry.minutes)}
                    </p>
                  </div>
                  {entry.note && <p className="text-xs text-stone-500 mt-1">{entry.note}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
