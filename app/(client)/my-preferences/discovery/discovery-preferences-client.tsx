'use client'

import { useState } from 'react'
import type { RankedDiscoveryPreference } from '@/lib/discovery/user-scroll-signals'
import { trackDiscoveryEvent } from '@/lib/discovery/track-discovery-click'

type DiscoveryPreferencesClientProps = {
  preferences: RankedDiscoveryPreference[]
}

export function DiscoveryPreferencesClient({ preferences }: DiscoveryPreferencesClientProps) {
  const [localOverrides, setLocalOverrides] = useState<Record<string, 'love' | 'hate' | 'hide'>>({})

  function handleFeedback(preference: RankedDiscoveryPreference, action: 'love' | 'hate' | 'hide') {
    const key = `${preference.itemType}:${preference.itemValue}`
    setLocalOverrides((current) => ({ ...current, [key]: action }))
    trackDiscoveryEvent({
      action,
      itemType: preference.itemType,
      itemValue: preference.itemValue,
      itemLabel: preference.itemValue.replace(/_/g, ' '),
      eventContext: {
        source: 'client_discovery_preferences',
      },
    })
  }

  if (preferences.length === 0) {
    return (
      <div className="rounded-lg border border-stone-800 bg-stone-900/60 p-6">
        <p className="text-sm text-stone-400">
          Discovery preferences will appear after you browse, save, and give feedback on homepage
          discovery items.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-stone-800 bg-stone-900/60">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-stone-800 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
        <span>Signal</span>
        <span>Adjust</span>
      </div>
      <div className="divide-y divide-stone-800">
        {preferences.slice(0, 30).map((preference) => {
          const key = `${preference.itemType}:${preference.itemValue}`
          const override = localOverrides[key]
          const scoreTone =
            preference.score > 0
              ? 'text-emerald-300'
              : preference.score < 0
                ? 'text-red-300'
                : 'text-stone-300'

          return (
            <div
              key={key}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-stone-100">
                  {preference.itemValue.replace(/_/g, ' ')}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {preference.itemType} |{' '}
                  <span className={scoreTone}>score {preference.score}</span> |{' '}
                  {preference.interactionCount} signals
                  {override ? ` | marked ${override}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleFeedback(preference, 'love')}
                  className="rounded-md border border-emerald-500/30 px-2.5 py-1 text-xs font-medium text-emerald-200 hover:bg-emerald-500/10"
                >
                  More
                </button>
                <button
                  type="button"
                  onClick={() => handleFeedback(preference, 'hate')}
                  className="rounded-md border border-amber-500/30 px-2.5 py-1 text-xs font-medium text-amber-200 hover:bg-amber-500/10"
                >
                  Less
                </button>
                <button
                  type="button"
                  onClick={() => handleFeedback(preference, 'hide')}
                  className="rounded-md border border-red-500/30 px-2.5 py-1 text-xs font-medium text-red-200 hover:bg-red-500/10"
                >
                  Hide
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
