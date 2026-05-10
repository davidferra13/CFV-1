'use client'

import { useState } from 'react'
import type { ProactiveSignal, SignalDomain } from '@/lib/cil/types'
import { SignalCard } from './signal-card'

const DOMAINS: Array<{ key: SignalDomain | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'finance', label: 'Finance' },
  { key: 'clients', label: 'Clients' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'reputation', label: 'Reputation' },
  { key: 'pipeline', label: 'Pipeline' },
]

interface SignalFeedProps {
  signals: ProactiveSignal[]
  onDismiss: (id: string) => void
  onAct: (signal: ProactiveSignal) => void
}

export function SignalFeed({ signals, onDismiss, onAct }: SignalFeedProps) {
  const [activeDomain, setActiveDomain] = useState<SignalDomain | 'all'>('all')

  const activeSignals = signals.filter((s) => !s.dismissedAt)

  const filtered =
    activeDomain === 'all' ? activeSignals : activeSignals.filter((s) => s.domain === activeDomain)

  const sorted = [...filtered].sort((a, b) => b.urgency - a.urgency)

  function countForDomain(domain: SignalDomain | 'all'): number {
    if (domain === 'all') return activeSignals.length
    return activeSignals.filter((s) => s.domain === domain).length
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter signals by domain">
        {DOMAINS.map(({ key, label }) => {
          const count = countForDomain(key)
          const isActive = activeDomain === key
          return (
            <button
              key={key}
              role="tab"
              aria-selected={isActive}
              aria-label={`${label} (${count} signals)`}
              onClick={() => setActiveDomain(key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                isActive
                  ? 'bg-stone-700 text-stone-100'
                  : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
              }`}
            >
              {label}
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs ${
                    isActive ? 'bg-stone-600 text-stone-200' : 'bg-stone-800 text-stone-500'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Signal list */}
      {sorted.length === 0 ? (
        <div className="py-12 text-center text-sm text-stone-500">
          No active signals. Your business is running smooth.
        </div>
      ) : (
        <div className="flex flex-col gap-2" role="feed" aria-label="Intelligence signals">
          {sorted.map((signal) => (
            <SignalCard key={signal.id} signal={signal} onDismiss={onDismiss} onAct={onAct} />
          ))}
        </div>
      )}
    </div>
  )
}
