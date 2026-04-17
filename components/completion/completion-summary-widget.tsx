'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getDashboardCompletionSummary } from '@/lib/completion/actions'

function scoreColor(score: number): string {
  if (score >= 80) return '#10b981'
  if (score >= 60) return '#b15c26'
  if (score >= 40) return '#f59e0b'
  return '#ef4444'
}

function MiniRing({ score }: { score: number }) {
  const r = 12
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <svg width="32" height="32" className="shrink-0">
      <circle cx="16" cy="16" r={r} fill="none" stroke="rgba(120,113,108,0.2)" strokeWidth="3" />
      <circle
        cx="16"
        cy="16"
        r={r}
        fill="none"
        stroke={scoreColor(score)}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 16 16)"
        className="transition-all duration-500"
      />
      <text
        x="16"
        y="16"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-stone-300"
        style={{ fontSize: '9px', fontWeight: 600 }}
      >
        {score}
      </text>
    </svg>
  )
}

function statusLabel(status: string): { text: string; cls: string } {
  if (status === 'complete') return { text: 'Ready', cls: 'text-emerald-400' }
  if (status === 'partial') return { text: 'In progress', cls: 'text-amber-400' }
  return { text: 'Needs work', cls: 'text-red-400' }
}

type EventCompletion = Awaited<ReturnType<typeof getDashboardCompletionSummary>>[number]

export function CompletionSummaryWidget() {
  const [events, setEvents] = useState<EventCompletion[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    getDashboardCompletionSummary()
      .then(setEvents)
      .catch(() => setError(true))
  }, [])

  if (error) {
    return (
      <div className="rounded-lg border border-stone-700/50 bg-stone-800/50 p-4">
        <h3 className="text-sm font-medium text-stone-300 mb-2">Event Readiness</h3>
        <p className="text-xs text-red-400">Could not load completion data</p>
      </div>
    )
  }

  if (!events) {
    return (
      <div className="rounded-lg border border-stone-700/50 bg-stone-800/50 p-4 animate-pulse">
        <div className="w-28 h-4 rounded bg-stone-700 mb-3" />
        <div className="space-y-2">
          <div className="w-full h-8 rounded bg-stone-700" />
          <div className="w-full h-8 rounded bg-stone-700" />
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-stone-700/50 bg-stone-800/50 p-4">
        <h3 className="text-sm font-medium text-stone-300 mb-2">Event Readiness</h3>
        <p className="text-xs text-stone-500">No upcoming events in the next 30 days</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-stone-700/50 bg-stone-800/50 p-4">
      <h3 className="text-sm font-medium text-stone-300 mb-3">Event Readiness</h3>
      <div className="space-y-2">
        {events.map((ev) => {
          const sl = statusLabel(ev.status)
          return (
            <div key={ev.eventId} className="flex items-center gap-3 py-1">
              <MiniRing score={ev.score} />
              <div className="flex-1 min-w-0">
                <Link
                  href={`/events/${ev.eventId}`}
                  className="text-xs font-medium text-stone-200 hover:text-stone-100 truncate block"
                >
                  {ev.eventName}
                </Link>
                <div className="flex items-center gap-2">
                  {ev.eventDate && (
                    <span className="text-[10px] text-stone-500">
                      {new Date(ev.eventDate + 'T00:00:00').toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                  <span className={`text-[10px] ${sl.cls}`}>{sl.text}</span>
                </div>
              </div>
              {ev.nextAction && (
                <Link
                  href={ev.nextAction.url}
                  className="text-[10px] text-brand-400 hover:text-brand-300 shrink-0"
                >
                  {ev.nextAction.label}
                </Link>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
