'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { PrivateContextPanel } from './private-context-panel'
import { SecretsPanel } from './secrets-panel'
import { ComplimentaryPanel } from './complimentary-panel'
import type { ChefPrivateContext } from '@/lib/private-context/types'
import type { EventSecret, ComplimentaryItem, ComplimentarySuggestion } from '@/lib/private-context/types'

interface Props {
  eventId: string
  privateContexts: ChefPrivateContext[]
  secrets: EventSecret[]
  compItems: ComplimentaryItem[]
  compSuggestions: ComplimentarySuggestion[]
}

/**
 * Combined "Behind the Scenes" panel for event detail pages.
 * Contains: Private Notes, Secrets & Surprises, Complimentary Intelligence.
 * 100% chef-only. Never rendered on client-facing surfaces.
 */
export function BehindTheScenesPanel({
  eventId,
  privateContexts,
  secrets,
  compItems,
  compSuggestions,
}: Props) {
  const [expanded, setExpanded] = useState(false)

  const activeSecrets = secrets.filter(s => s.status !== 'cancelled')
  const pendingSuggestions = compSuggestions.filter(s => s.status === 'pending')
  const totalItems =
    privateContexts.length + activeSecrets.length + compItems.length + pendingSuggestions.length

  return (
    <div className="space-y-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-zinc-300">Behind the Scenes</span>
          {totalItems > 0 && (
            <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
              {totalItems} item{totalItems !== 1 ? 's' : ''}
            </span>
          )}
          {pendingSuggestions.length > 0 && (
            <span className="text-xs text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full">
              {pendingSuggestions.length} suggestion{pendingSuggestions.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <span className="text-zinc-600 text-sm">{expanded ? '−' : '+'}</span>
      </button>

      {expanded && (
        <div className="space-y-4 pt-2">
          <PrivateContextPanel
            entityType="event"
            entityId={eventId}
            contexts={privateContexts}
          />
          <SecretsPanel
            eventId={eventId}
            secrets={secrets}
          />
          <ComplimentaryPanel
            eventId={eventId}
            compItems={compItems}
            suggestions={compSuggestions}
          />
        </div>
      )}
    </div>
  )
}
