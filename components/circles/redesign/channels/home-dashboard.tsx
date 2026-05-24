'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { CircleDetail } from '@/lib/hub/circle-detail-actions'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diffMs = now - then
  if (diffMs < 0) return 'just now'
  const seconds = Math.floor(diffMs / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const target = new Date(dateStr).getTime()
  const now = Date.now()
  const diff = target - now
  if (diff < 0) return null
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function nextEvent(events: CircleDetail['events']) {
  const now = Date.now()
  const future = events
    .filter((e) => e.event_date && new Date(e.event_date).getTime() > now)
    .sort((a, b) => new Date(a.event_date!).getTime() - new Date(b.event_date!).getTime())
  return future[0] ?? null
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type Props = {
  circle: CircleDetail
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HomeDashboard({ circle }: Props) {
  const nearest = useMemo(() => nextEvent(circle.events), [circle.events])
  const confirmedCount = useMemo(
    () => circle.members.filter((m) => m.rsvp_status === 'confirmed').length,
    [circle.members]
  )
  const readinessPercent = useMemo(() => {
    if (circle.members.length === 0) return 0
    return Math.round((confirmedCount / circle.members.length) * 100)
  }, [confirmedCount, circle.members.length])

  const daysLeft = nearest ? daysUntil(nearest.event_date) : null

  // Attention items
  const attentionItems = useMemo(() => {
    const items: Array<{
      icon: string
      description: string
      action: string
    }> = []

    const noRsvp = circle.members.filter((m) => !m.rsvp_status)
    if (noRsvp.length > 0) {
      items.push({
        icon: '\u{1F4E9}',
        description: `${noRsvp.length} member${noRsvp.length > 1 ? 's' : ''} haven't RSVP'd yet`,
        action: 'Send Reminder',
      })
    }

    if (circle.events.length === 0) {
      items.push({
        icon: '\u{1F4C5}',
        description: 'No events linked to this circle',
        action: 'Link Event',
      })
    }

    if (circle.message_count === 0) {
      items.push({
        icon: '\u{1F4AC}',
        description: 'No messages yet; start the conversation',
        action: 'Send Message',
      })
    }

    return items
  }, [circle.members, circle.events.length, circle.message_count])

  // Timeline events sorted by date
  const timelineEvents = useMemo(() => {
    return [...circle.events].sort((a, b) => {
      if (!a.event_date && !b.event_date) return 0
      if (!a.event_date) return 1
      if (!b.event_date) return -1
      return new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    })
  }, [circle.events])

  // Recent messages (last 5)
  const recentMessages = useMemo(() => circle.recent_messages.slice(-5), [circle.recent_messages])

  // SVG ring params
  const ringSize = 120
  const strokeWidth = 8
  const radius = (ringSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (readinessPercent / 100) * circumference

  return (
    <div className="space-y-6 pb-8">
      {/* ----------------------------------------------------------------- */}
      {/* 1. Hero Header                                                    */}
      {/* ----------------------------------------------------------------- */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900/30 via-stone-900/10 to-transparent p-6">
        <div className="flex items-center gap-4">
          <span className="text-[64px] leading-none">{circle.emoji ?? '\u{1F37D}\u{FE0F}'}</span>
          <div className="min-w-0">
            <h1 className="truncate text-3xl font-bold text-stone-100">{circle.name}</h1>
            {nearest?.event_date && (
              <p className="mt-1 text-sm text-stone-300">
                {new Date(nearest.event_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}
            <p className="mt-0.5 text-sm text-stone-400">Location to be determined</p>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 2. Readiness Ring                                                 */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-col items-center gap-2">
        <div className="relative" style={{ width: ringSize, height: ringSize }}>
          <svg width={ringSize} height={ringSize} className="-rotate-90">
            {/* Track */}
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              strokeWidth={strokeWidth}
              className="stroke-stone-700"
            />
            {/* Filled arc */}
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="stroke-brand-500 transition-[stroke-dashoffset] duration-1000 ease-out"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-stone-100">
            {readinessPercent}%
          </span>
        </div>
        <span className="text-xs uppercase tracking-wider text-stone-400">Dinner Readiness</span>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 3. Countdown Stat Cards                                           */}
      {/* ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-gradient-to-br from-blue-900/40 to-blue-800/20 p-4">
          <p className="text-3xl font-bold text-stone-100">{daysLeft !== null ? daysLeft : '—'}</p>
          <p className="mt-1 text-xs uppercase tracking-wider text-stone-400">Days Until</p>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 p-4">
          <p className="text-3xl font-bold text-stone-100">{confirmedCount}</p>
          <p className="mt-1 text-xs uppercase tracking-wider text-stone-400">Confirmed</p>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-purple-900/40 to-purple-800/20 p-4">
          <p className="text-3xl font-bold text-stone-100">TBD</p>
          <p className="mt-1 text-xs uppercase tracking-wider text-stone-400">Courses</p>
        </div>

        <div className="rounded-xl bg-gradient-to-br from-amber-900/40 to-amber-800/20 p-4">
          <p className="text-3xl font-bold text-stone-100">{circle.message_count}</p>
          <p className="mt-1 text-xs uppercase tracking-wider text-stone-400">Messages</p>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 4. Needs Your Attention                                           */}
      {/* ----------------------------------------------------------------- */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
          <h2 className="text-lg font-semibold text-stone-100">Needs Your Attention</h2>
        </div>

        {attentionItems.length === 0 ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-900/20 p-3 text-sm text-emerald-400">
            <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            All caught up
          </div>
        ) : (
          <div className="space-y-2">
            {attentionItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-stone-800/50 p-3"
              >
                <div className="flex items-center gap-3 text-sm text-stone-300">
                  <span className="text-base">{item.icon}</span>
                  {item.description}
                </div>
                <button
                  type="button"
                  className="flex-shrink-0 rounded-full bg-brand-500/10 px-3 py-1 text-sm text-brand-400 transition-colors hover:bg-brand-500/20"
                >
                  {item.action}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 5. Dinner Timeline                                                */}
      {/* ----------------------------------------------------------------- */}
      {timelineEvents.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-stone-100">Dinner Timeline</h2>
          <div className="relative ml-3">
            {timelineEvents.map((evt, i) => {
              const isLast = i === timelineEvents.length - 1
              const statusColor =
                evt.event_status === 'completed'
                  ? 'bg-emerald-500'
                  : evt.event_status === 'draft'
                    ? 'bg-stone-600'
                    : 'bg-brand-500'

              return (
                <div key={evt.event_id} className="relative pb-6 pl-6">
                  {!isLast && (
                    <div className="absolute left-[5px] top-3 h-full border-l-2 border-stone-700" />
                  )}
                  <div
                    className={cn('absolute left-0 top-1.5 h-3 w-3 rounded-full', statusColor)}
                  />
                  <div>
                    <p className="text-sm font-medium text-stone-200">{evt.event_title}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-stone-400">
                      {evt.event_date && (
                        <span>
                          {new Date(evt.event_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                      {evt.guest_count !== null && (
                        <span className="rounded-full bg-stone-700/60 px-2 py-0.5">
                          {evt.guest_count} guest
                          {evt.guest_count !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 6. Recent Activity Feed                                           */}
      {/* ----------------------------------------------------------------- */}
      {recentMessages.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-stone-100">Recent Activity</h2>
          <div className="space-y-1">
            {recentMessages.map((msg) => {
              const initial = (msg.author_name?.[0] ?? '?').toUpperCase()
              return (
                <div
                  key={msg.id}
                  className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-stone-800/40"
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-stone-700 text-xs font-semibold text-stone-300">
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-stone-200">{msg.author_name}</span>
                      <span className="text-xs text-stone-500">{relativeTime(msg.created_at)}</span>
                    </div>
                    <p className="truncate text-sm text-stone-400">
                      {msg.body ?? `[${msg.message_type}]`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* 7. What Remy Did Today                                            */}
      {/* ----------------------------------------------------------------- */}
      {circle.chef_show_remy && (
        <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-4">
          <div className="mb-2 flex items-center gap-2">
            <svg className="h-4 w-4 text-stone-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.789l1.599.799L9 4.323V3a1 1 0 011-1z" />
            </svg>
            <h2 className="text-sm font-semibold text-stone-300">What Remy Did Today</h2>
            <span className="rounded bg-stone-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-stone-400">
              Bot
            </span>
          </div>
          <p className="text-sm text-stone-500">No activity today</p>
        </div>
      )}
    </div>
  )
}
