// Prep Prompts View - displays time-aware preparation nudges
// Client component (needs useState for show-more toggle).

'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { PrepPrompt } from '@/lib/scheduling/types'

const MAX_VISIBLE = 10

const URGENCY_STYLES: Record<string, { bg: string; text: string; border: string; badge: string }> =
  {
    overdue: {
      bg: 'bg-red-950',
      text: 'text-red-800',
      border: 'border-red-200',
      badge: 'bg-red-900 text-red-700',
    },
    actionable: {
      bg: 'bg-amber-950',
      text: 'text-amber-800',
      border: 'border-amber-200',
      badge: 'bg-amber-900 text-amber-700',
    },
    upcoming: {
      bg: 'bg-brand-950',
      text: 'text-brand-300',
      border: 'border-brand-700',
      badge: 'bg-brand-900 text-brand-400',
    },
  }

const URGENCY_LABELS: Record<string, string> = {
  overdue: 'Overdue',
  actionable: 'Today',
  upcoming: 'Upcoming',
}

function PromptCard({ prompt }: { prompt: PrepPrompt }) {
  const style = URGENCY_STYLES[prompt.urgency]
  return (
    <Link href={prompt.actionUrl} className="block">
      <div
        className={`${style.bg} border ${style.border} rounded-lg p-3 hover:shadow-sm transition-shadow`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className={`text-sm ${style.text}`}>{prompt.message}</p>
            {prompt.components && prompt.components.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {prompt.components.slice(0, 5).map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-800 text-stone-400"
                  >
                    {name}
                  </span>
                ))}
                {prompt.components.length > 5 && (
                  <span className="text-[10px] text-stone-500">
                    +{prompt.components.length - 5} more
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-stone-500">{prompt.clientName}</span>
              <span className="text-xs text-stone-400">
                {prompt.daysUntilEvent === 0
                  ? 'Today'
                  : prompt.daysUntilEvent === 1
                    ? 'Tomorrow'
                    : `In ${prompt.daysUntilEvent} days`}
              </span>
            </div>
          </div>
          <span
            className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style.badge}`}
          >
            {prompt.action}
          </span>
        </div>
      </div>
    </Link>
  )
}

export function PrepPromptsView({ prompts }: { prompts: PrepPrompt[] }) {
  const [showAll, setShowAll] = useState(false)

  if (prompts.length === 0) {
    return (
      <div className="text-sm text-stone-500 py-4 text-center">
        No active prep prompts. All upcoming events are on track.
      </div>
    )
  }

  // Group by urgency
  const grouped = {
    overdue: prompts.filter((p) => p.urgency === 'overdue'),
    actionable: prompts.filter((p) => p.urgency === 'actionable'),
    upcoming: prompts.filter((p) => p.urgency === 'upcoming'),
  }

  // Flatten for counting / capping
  const allOrdered = [...grouped.overdue, ...grouped.actionable, ...grouped.upcoming]
  const hiddenCount = allOrdered.length - MAX_VISIBLE
  const visibleSet = showAll ? null : new Set(allOrdered.slice(0, MAX_VISIBLE))

  return (
    <div className="space-y-4">
      {(['overdue', 'actionable', 'upcoming'] as const).map((urgency) => {
        let group = grouped[urgency]
        if (visibleSet) {
          group = group.filter((p) => visibleSet.has(p))
        }
        if (group.length === 0) return null

        return (
          <div key={urgency} className="space-y-2">
            <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
              {URGENCY_LABELS[urgency]} ({grouped[urgency].length})
            </h4>
            {group.map((prompt, i) => (
              <PromptCard key={`${prompt.eventId}-${prompt.category}-${i}`} prompt={prompt} />
            ))}
          </div>
        )
      })}

      {hiddenCount > 0 && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="w-full text-center text-xs text-stone-500 hover:text-stone-300 transition-colors py-2"
        >
          Show {hiddenCount} more prompt{hiddenCount !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  )
}
