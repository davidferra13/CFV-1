// Inbox Source Filters - Toggle which sources to show
'use client'

import type { InboxSource } from '@/lib/inbox/types'

interface InboxFiltersProps {
  activeSources: InboxSource[]
  onToggle: (source: InboxSource) => void
  stats: Record<InboxSource, number>
}

const SOURCE_CONFIG: Record<InboxSource, { label: string; color: string }> = {
  chat: { label: 'Chat', color: 'bg-brand-900 text-brand-700 border-brand-200' },
  message: { label: 'Messages', color: 'bg-emerald-900 text-emerald-700 border-emerald-200' },
  wix: { label: 'Wix', color: 'bg-purple-900 text-purple-700 border-purple-200' },
  notification: { label: 'Notifications', color: 'bg-amber-900 text-amber-700 border-amber-200' },
}

export function InboxFilters({ activeSources, onToggle, stats }: InboxFiltersProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(SOURCE_CONFIG) as InboxSource[]).map((source) => {
        const config = SOURCE_CONFIG[source]
        const isActive = activeSources.includes(source)
        const count = stats[source] || 0

        return (
          <button
            key={source}
            onClick={() => onToggle(source)}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
              border transition-all
              ${isActive ? config.color : 'bg-stone-800 text-stone-400 border-stone-700 opacity-60'}
              hover:opacity-100
            `}
          >
            {config.label}
            {count > 0 && (
              <span
                className={`
                inline-block min-w-[18px] text-center px-1 py-0.5 rounded-full text-xxs
                ${isActive ? 'bg-stone-900/50' : 'bg-stone-700/50'}
              `}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
