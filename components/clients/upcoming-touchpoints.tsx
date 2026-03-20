'use client'

import { useState, useTransition } from 'react'
import type { UpcomingTouchpoint } from '@/lib/clients/touchpoint-actions'

const URGENCY_STYLES: Record<string, string> = {
  high: 'border-red-200 bg-red-50',
  medium: 'border-yellow-200 bg-yellow-50',
  low: 'border-gray-200 bg-white',
}

const URGENCY_BADGES: Record<string, { label: string; className: string }> = {
  high: { label: 'Urgent', className: 'bg-red-100 text-red-800' },
  medium: { label: 'Soon', className: 'bg-yellow-100 text-yellow-800' },
  low: { label: 'Upcoming', className: 'bg-gray-100 text-gray-700' },
}

const RULE_TYPE_ICONS: Record<string, string> = {
  birthday: '🎂',
  anniversary: '🎉',
  days_since_last_event: '📅',
  lifetime_spend_milestone: '💰',
  streak_milestone: '🔥',
  custom: '📝',
}

export default function UpcomingTouchpoints({
  initialTouchpoints,
}: {
  initialTouchpoints: UpcomingTouchpoint[]
}) {
  const [touchpoints, setTouchpoints] =
    useState<UpcomingTouchpoint[]>(initialTouchpoints)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [done, setDone] = useState<Set<string>>(new Set())

  // Create a stable key for each touchpoint
  function touchpointKey(t: UpcomingTouchpoint): string {
    return `${t.client_id}-${t.rule_type}-${t.reason}`
  }

  function handleDismiss(t: UpcomingTouchpoint) {
    setDismissed((prev) => new Set(prev).add(touchpointKey(t)))
  }

  function handleMarkDone(t: UpcomingTouchpoint) {
    setDone((prev) => new Set(prev).add(touchpointKey(t)))
  }

  const visible = touchpoints.filter(
    (t) => !dismissed.has(touchpointKey(t)) && !done.has(touchpointKey(t)),
  )

  if (visible.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Upcoming Touchpoints
        </h3>
        <p className="text-sm text-gray-400 text-center py-4">
          No upcoming touchpoints right now. Configure rules to start getting
          reminders.
        </p>
        {done.size > 0 && (
          <p className="text-xs text-green-600 text-center">
            {done.size} touchpoint{done.size === 1 ? '' : 's'} completed
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900">
          Upcoming Touchpoints
        </h3>
        <span className="rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 text-xs font-medium">
          {visible.length}
        </span>
      </div>

      <div className="space-y-2">
        {visible.map((t) => {
          const key = touchpointKey(t)
          const badge = URGENCY_BADGES[t.urgency]
          const icon = RULE_TYPE_ICONS[t.rule_type] || '📋'

          return (
            <div
              key={key}
              className={`rounded-md border p-3 ${URGENCY_STYLES[t.urgency]}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base" aria-hidden="true">
                      {icon}
                    </span>
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {t.client_name}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{t.reason}</p>
                  {t.action_suggestion && (
                    <p className="mt-1 text-xs text-gray-500 italic">
                      Suggestion: {t.action_suggestion}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 ml-3 shrink-0">
                  <button
                    onClick={() => handleMarkDone(t)}
                    className="rounded-md border border-green-300 bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                  >
                    Done
                  </button>
                  <button
                    onClick={() => handleDismiss(t)}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {done.size > 0 && (
        <p className="mt-3 text-xs text-green-600 text-center">
          {done.size} touchpoint{done.size === 1 ? '' : 's'} completed this
          session
        </p>
      )}
    </div>
  )
}
