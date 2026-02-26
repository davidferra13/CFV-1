'use client'

// DailyBriefingCard — Morning summary card for the chef dashboard.
// Shows events today, tasks due, weekly revenue, and upcoming deadlines.
// If no briefing data is passed (null), shows a "Generate Briefing" button.
// Calls generateDailyBriefing() from daily-actions.

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { generateDailyBriefing } from '@/lib/briefing/daily-actions'
import type { BriefingContent } from '@/lib/briefing/daily-actions'
import { formatCurrency } from '@/lib/utils/currency'
import { Sun, Calendar, CheckSquare, DollarSign, Clock, RefreshCw } from 'lucide-react'

type Props = {
  briefing: {
    briefingDate: string
    content: BriefingContent
  } | null
}

export function DailyBriefingCard({ briefing: initialBriefing }: Props) {
  const [briefing, setBriefing] = useState(initialBriefing)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleGenerate() {
    setGenerating(true)
    setError(null)

    startTransition(async () => {
      try {
        const result = await generateDailyBriefing()
        setBriefing({
          briefingDate: result.briefingDate,
          content: result.content,
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate briefing')
      } finally {
        setGenerating(false)
      }
    })
  }

  // Empty state — no briefing generated yet
  if (!briefing) {
    return (
      <Card className="border-dashed border-stone-300">
        <CardContent className="py-8">
          <div className="text-center">
            <Sun className="h-8 w-8 text-stone-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-stone-700 mb-1">No briefing for today yet</p>
            <p className="text-xs text-stone-500 mb-4">
              Generate your morning summary to see events, tasks, and revenue at a glance.
            </p>
            {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
            <Button
              variant="primary"
              size="sm"
              onClick={handleGenerate}
              disabled={generating}
              loading={generating}
            >
              {generating ? 'Generating...' : 'Generate Briefing'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { eventsToday, tasksDue, revenueThisWeekCents, upcomingDeadlines } = briefing.content

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-amber-500" />
            Daily Briefing
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400">
              {new Date(briefing.briefingDate + 'T00:00:00').toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </span>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="text-stone-400 hover:text-stone-600 transition-colors disabled:opacity-50"
              aria-label="Refresh briefing"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {error && <p className="text-xs text-red-600">{error}</p>}

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Events today */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Calendar className="h-3.5 w-3.5 text-stone-400" />
              <span className="text-xs text-stone-500">Events Today</span>
            </div>
            <p className="text-2xl font-bold text-stone-900">{eventsToday.length}</p>
          </div>

          {/* Tasks due */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <CheckSquare className="h-3.5 w-3.5 text-stone-400" />
              <span className="text-xs text-stone-500">Tasks Due</span>
            </div>
            <p
              className={`text-2xl font-bold ${tasksDue.length > 0 ? 'text-amber-600' : 'text-stone-900'}`}
            >
              {tasksDue.length}
            </p>
          </div>

          {/* Weekly revenue */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <DollarSign className="h-3.5 w-3.5 text-stone-400" />
              <span className="text-xs text-stone-500">This Week</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(revenueThisWeekCents)}
            </p>
          </div>

          {/* Upcoming deadlines */}
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="h-3.5 w-3.5 text-stone-400" />
              <span className="text-xs text-stone-500">Deadlines</span>
            </div>
            <p
              className={`text-2xl font-bold ${upcomingDeadlines.length > 3 ? 'text-red-600' : 'text-stone-900'}`}
            >
              {upcomingDeadlines.length}
            </p>
          </div>
        </div>

        {/* Events today detail */}
        {eventsToday.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Today&apos;s Events
            </h4>
            <div className="space-y-1.5">
              {eventsToday.map((event) => (
                <Link
                  key={event.eventId}
                  href={`/events/${event.eventId}`}
                  className="flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 hover:bg-stone-50 transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-800 group-hover:text-brand-600 truncate">
                      {event.occasion ?? 'Private Event'}
                    </p>
                    <p className="text-xs text-stone-500 truncate">
                      {event.clientName} &middot; {event.guestCount} guests
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-stone-500">{event.serveTime || 'TBD'}</span>
                    <Badge variant={event.status === 'confirmed' ? 'success' : 'default'}>
                      {event.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming deadlines detail */}
        {upcomingDeadlines.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Upcoming Deadlines
            </h4>
            <div className="space-y-1">
              {upcomingDeadlines.slice(0, 5).map((deadline, idx) => (
                <Link
                  key={`${deadline.eventId}-${deadline.deadlineType}-${idx}`}
                  href={`/events/${deadline.eventId}`}
                  className="flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 hover:bg-stone-50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-stone-700 truncate">
                      {deadline.deadlineType}
                      <span className="text-stone-400"> — </span>
                      <span className="text-stone-500">{deadline.occasion ?? 'Event'}</span>
                    </p>
                  </div>
                  <Badge
                    variant={
                      deadline.daysUntil <= 1
                        ? 'error'
                        : deadline.daysUntil <= 3
                          ? 'warning'
                          : 'default'
                    }
                  >
                    {deadline.daysUntil === 1 ? 'Tomorrow' : `${deadline.daysUntil}d`}
                  </Badge>
                </Link>
              ))}
              {upcomingDeadlines.length > 5 && (
                <p className="text-xs text-stone-400 pl-2.5 pt-1">
                  +{upcomingDeadlines.length - 5} more
                </p>
              )}
            </div>
          </div>
        )}

        {/* All-clear message */}
        {eventsToday.length === 0 && tasksDue.length === 0 && upcomingDeadlines.length === 0 && (
          <div className="text-center py-2">
            <p className="text-sm text-stone-500">
              Nothing urgent today. Plan ahead or take a breather.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
