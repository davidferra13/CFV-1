// Prep Prompts View — displays time-aware preparation nudges
// Server component.

import Link from 'next/link'
import type { PrepPrompt } from '@/lib/scheduling/types'

const URGENCY_STYLES: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  overdue: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700',
  },
  actionable: {
    bg: 'bg-amber-50',
    text: 'text-amber-800',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
  },
  upcoming: {
    bg: 'bg-brand-50',
    text: 'text-brand-800',
    border: 'border-brand-200',
    badge: 'bg-brand-100 text-brand-700',
  },
}

const URGENCY_LABELS: Record<string, string> = {
  overdue: 'Overdue',
  actionable: 'Today',
  upcoming: 'Upcoming',
}

export function PrepPromptsView({ prompts }: { prompts: PrepPrompt[] }) {
  if (prompts.length === 0) {
    return (
      <div className="text-sm text-stone-500 py-4 text-center">
        No active prep prompts. All upcoming events are on track.
      </div>
    )
  }

  // Group by urgency
  const grouped = {
    overdue: prompts.filter(p => p.urgency === 'overdue'),
    actionable: prompts.filter(p => p.urgency === 'actionable'),
    upcoming: prompts.filter(p => p.urgency === 'upcoming'),
  }

  return (
    <div className="space-y-4">
      {(['overdue', 'actionable', 'upcoming'] as const).map(urgency => {
        const group = grouped[urgency]
        if (group.length === 0) return null

        return (
          <div key={urgency} className="space-y-2">
            <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
              {URGENCY_LABELS[urgency]} ({group.length})
            </h4>
            {group.map((prompt, i) => {
              const style = URGENCY_STYLES[prompt.urgency]
              return (
                <Link key={`${prompt.eventId}-${i}`} href={prompt.actionUrl} className="block">
                  <div className={`${style.bg} border ${style.border} rounded-lg p-3 hover:shadow-sm transition-shadow`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${style.text}`}>{prompt.message}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-stone-500">{prompt.clientName}</span>
                          <span className="text-xs text-stone-400">
                            {prompt.daysUntilEvent === 0 ? 'Today' :
                             prompt.daysUntilEvent === 1 ? 'Tomorrow' :
                             `In ${prompt.daysUntilEvent} days`}
                          </span>
                        </div>
                      </div>
                      <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${style.badge}`}>
                        {prompt.action}
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
