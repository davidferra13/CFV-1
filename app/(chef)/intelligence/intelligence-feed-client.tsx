'use client'

// Intelligence Feed Client - Filterable, actionable signal feed
// Handles dismiss, act, batch dismiss, and category filtering.

import { useCallback, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, Users, DollarSign, Settings, Trash2 } from 'lucide-react'
import { ActionSignalCard } from '@/components/intelligence/action-signal-card'
import {
  dismissIntelligenceSignal,
  executeSignalAction,
  batchDismissSignals,
} from '@/lib/intelligence/signal-actions-wired'
import type { ActiveSignalWithAction } from '@/lib/intelligence/signal-actions-wired'
import type { ActionCategory } from '@/lib/intelligence/signal-mapper'

const CATEGORIES: Array<{ key: ActionCategory | 'all'; label: string; Icon: typeof Brain }> = [
  { key: 'all', label: 'All', Icon: Brain },
  { key: 'client', label: 'Client', Icon: Users },
  { key: 'pricing', label: 'Pricing', Icon: DollarSign },
  { key: 'operations', label: 'Operations', Icon: Settings },
]

interface Props {
  initialSignals: ActiveSignalWithAction[]
}

export function IntelligenceFeedClient({ initialSignals }: Props) {
  const [signals, setSignals] = useState(initialSignals)
  const [activeCategory, setActiveCategory] = useState<ActionCategory | 'all'>('all')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const filtered =
    activeCategory === 'all'
      ? signals
      : signals.filter((s) => s.action.category === activeCategory)

  const handleDismiss = useCallback((id: string) => {
    setSignals((prev) => prev.filter((s) => s.signal.id !== id))
    startTransition(async () => {
      try {
        await dismissIntelligenceSignal(id)
      } catch {
        // Non-blocking
      }
    })
  }, [])

  const handleAct = useCallback(
    (signal: ActiveSignalWithAction['signal']) => {
      setSignals((prev) => prev.filter((s) => s.signal.id !== signal.id))
      startTransition(async () => {
        try {
          await executeSignalAction(signal)
          if (signal.actionType === 'navigate' && signal.actionPayload?.href) {
            router.push(signal.actionPayload.href as string)
          }
        } catch {
          // Non-blocking
        }
      })
    },
    [router]
  )

  const handleBatchDismiss = useCallback(() => {
    // Dismiss all low-priority (urgency 1-2) signals in current filter
    const lowPriority = filtered.filter((s) => s.signal.urgency <= 2)
    if (lowPriority.length === 0) return

    const ids = lowPriority.map((s) => s.signal.id)
    setSignals((prev) => prev.filter((s) => !ids.includes(s.signal.id)))
    startTransition(async () => {
      try {
        await batchDismissSignals(ids)
      } catch {
        // Non-blocking
      }
    })
  }, [filtered])

  function countForCategory(cat: ActionCategory | 'all'): number {
    if (cat === 'all') return signals.length
    return signals.filter((s) => s.action.category === cat).length
  }

  const lowPriorityCount = filtered.filter((s) => s.signal.urgency <= 2).length

  return (
    <div className="flex flex-col gap-4">
      {/* Category filter tabs */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by category">
          {CATEGORIES.map(({ key, label, Icon }) => {
            const count = countForCategory(key)
            const isActive = activeCategory === key
            return (
              <button
                key={key}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveCategory(key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-stone-700 text-stone-100'
                    : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
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

        {/* Batch dismiss button */}
        {lowPriorityCount > 0 && (
          <button
            onClick={handleBatchDismiss}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-stone-500 hover:bg-stone-800 hover:text-stone-300 transition-colors"
            title="Dismiss all low-priority signals"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Dismiss low ({lowPriorityCount})
          </button>
        )}
      </div>

      {/* Signal list */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Brain className="h-8 w-8 mx-auto text-stone-600 mb-3" />
          <p className="text-sm text-stone-500">
            {signals.length === 0
              ? 'All clear! No active signals right now.'
              : 'No signals in this category.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2" role="feed" aria-label="Intelligence signals">
          {filtered.map(({ signal, action }) => (
            <ActionSignalCard
              key={signal.id}
              signal={signal}
              action={action}
              onDismiss={handleDismiss}
              onAct={handleAct}
            />
          ))}
        </div>
      )}
    </div>
  )
}
