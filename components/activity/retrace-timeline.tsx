// Retrace Timeline — Step-by-step navigation history grouped by session.
// Shows exactly where the chef went, in order, with timestamps.

'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { BreadcrumbSession, BreadcrumbEntry } from '@/lib/activity/breadcrumb-types'
import { labelForPath, BREADCRUMB_TYPE_CONFIG } from '@/lib/activity/breadcrumb-types'

interface RetraceTimelineProps {
  sessions: BreadcrumbSession[]
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  loadingMore?: boolean
}

export function RetraceTimeline({
  sessions,
  loading,
  hasMore,
  onLoadMore,
  loadingMore,
}: RetraceTimelineProps) {
  if (loading) {
    return <div className="text-xs text-stone-300 px-1 py-4">Loading retrace timeline...</div>
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-stone-300 text-sm">
        No navigation history yet. Your steps will appear here as you use ChefFlow.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sessions.map((session) => (
        <SessionCard key={session.session_id} session={session} />
      ))}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="text-xs font-medium border border-stone-700 rounded-md px-3 py-1.5 text-stone-300 bg-stone-900 hover:bg-stone-800 disabled:opacity-50"
          >
            {loadingMore ? 'Loading...' : 'Load older sessions'}
          </button>
        </div>
      )}
    </div>
  )
}

function SessionCard({ session }: { session: BreadcrumbSession }) {
  const [expanded, setExpanded] = useState(false)
  const startTime = new Date(session.started_at)
  const isToday = isSameDay(startTime, new Date())
  const isYesterday = isSameDay(startTime, new Date(Date.now() - 86400000))

  const dateLabel = isToday
    ? 'Today'
    : isYesterday
      ? 'Yesterday'
      : startTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  const timeLabel = startTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })

  const durationLabel =
    session.duration_minutes < 1
      ? 'under a minute'
      : session.duration_minutes === 1
        ? '1 minute'
        : `${session.duration_minutes} minutes`

  // Separate page views from interactions for the collapsed summary
  const pageViews = session.breadcrumbs.filter((b) => b.breadcrumb_type === 'page_view')
  const interactions = session.breadcrumbs.filter((b) => b.breadcrumb_type !== 'page_view')

  return (
    <div className="border border-stone-700 rounded-lg bg-stone-900 overflow-hidden">
      {/* Session header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-800 transition-colors"
      >
        <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-brand-950 text-brand-600">
          <span className="text-xs font-bold">{pageViews.length}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-300">{dateLabel}</span>
            <span className="text-xs text-stone-300">{timeLabel}</span>
            <span className="text-[10px] text-stone-300">· {durationLabel}</span>
            {interactions.length > 0 && (
              <span className="text-[10px] bg-stone-800 text-stone-500 px-1.5 py-0.5 rounded-full">
                +{interactions.length} action{interactions.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500 mt-0.5 truncate">{session.summary}</p>
        </div>
        <svg
          className={`w-4 h-4 text-stone-300 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded: step-by-step breadcrumb trail */}
      {expanded && (
        <div className="border-t border-stone-800 px-4 py-3">
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[9px] top-2 bottom-2 w-px bg-stone-700" />

            <div className="space-y-0">
              {session.breadcrumbs.map((crumb, idx) => (
                <BreadcrumbRow
                  key={crumb.id}
                  crumb={crumb}
                  isFirst={idx === 0}
                  isLast={idx === session.breadcrumbs.length - 1}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BreadcrumbRow({
  crumb,
  isFirst,
  isLast,
}: {
  crumb: BreadcrumbEntry
  isFirst: boolean
  isLast: boolean
}) {
  const config = BREADCRUMB_TYPE_CONFIG[crumb.breadcrumb_type] || BREADCRUMB_TYPE_CONFIG.page_view
  const label = crumb.label || labelForPath(crumb.path)
  const time = new Date(crumb.created_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })

  const isPageView = crumb.breadcrumb_type === 'page_view'

  const dotColor = isFirst
    ? 'bg-brand-500'
    : isLast
      ? 'bg-stone-400'
      : isPageView
        ? 'bg-brand-800'
        : 'bg-stone-300'

  const content = (
    <div className="flex items-start gap-3 py-1.5 group">
      {/* Timeline dot */}
      <div className="relative z-10 flex-shrink-0 mt-1">
        <div className={`w-[7px] h-[7px] rounded-full ring-2 ring-white ${dotColor}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-[10px] text-stone-300 font-medium flex-shrink-0 w-7">
          {config.icon}
        </span>
        <span
          className={`text-xs truncate ${
            isPageView
              ? 'font-medium text-stone-300 group-hover:text-brand-600'
              : 'text-stone-500 italic'
          }`}
        >
          {isPageView ? label : `${config.label}: ${label}`}
        </span>
      </div>

      {/* Timestamp */}
      <span className="text-[10px] text-stone-300 flex-shrink-0 tabular-nums">{time}</span>
    </div>
  )

  if (isPageView) {
    return (
      <Link
        href={crumb.path}
        className="block hover:bg-stone-800 rounded-md -mx-1 px-1 transition-colors"
      >
        {content}
      </Link>
    )
  }

  return content
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
