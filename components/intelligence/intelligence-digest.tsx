'use client'

/**
 * Intelligence Digest - Weekly summary card for the dashboard.
 *
 * Shows:
 *   - "This week ChefFlow noticed X signals"
 *   - Top 3 most important signals with action buttons
 *   - "View all" link to full intelligence feed
 *   - Category breakdown (client/pricing/operations)
 */

import { useTransition } from 'react'
import Link from 'next/link'
import { Brain, Users, DollarSign, Settings, ArrowRight, X } from 'lucide-react'
import type { ProactiveSignal } from '@/lib/cil/types'
import type { MappedSignalAction, ActionCategory } from '@/lib/intelligence/signal-mapper'

const categoryConfig: Record<ActionCategory, { Icon: typeof Users; label: string }> = {
  client: { Icon: Users, label: 'Client' },
  pricing: { Icon: DollarSign, label: 'Pricing' },
  operations: { Icon: Settings, label: 'Ops' },
}

interface DigestSignal {
  signal: ProactiveSignal
  action: MappedSignalAction
}

interface IntelligenceDigestProps {
  totalCount: number
  categoryCounts: Record<ActionCategory | 'all', number>
  topSignals: DigestSignal[]
  periodLabel: string
  onDismiss?: (id: string) => void
  onAct?: (signal: ProactiveSignal) => void
}

export function IntelligenceDigest({
  totalCount,
  categoryCounts,
  topSignals,
  periodLabel,
  onDismiss,
  onAct,
}: IntelligenceDigestProps) {
  const [isPending, startTransition] = useTransition()

  if (totalCount === 0) {
    return (
      <section
        className="rounded-xl border border-stone-700/50 bg-gradient-to-br from-stone-900 via-stone-950 to-stone-950 p-5 sm:p-6"
        aria-label="Intelligence Digest"
      >
        <div className="flex items-center gap-2.5 mb-3">
          <Brain className="h-5 w-5 text-brand-400" aria-hidden="true" />
          <h2 className="text-sm font-bold text-stone-300 uppercase tracking-wider">
            Intelligence Digest
          </h2>
        </div>
        <p className="text-sm text-stone-500">All clear! No signals this week.</p>
      </section>
    )
  }

  function handleDismiss(id: string) {
    startTransition(() => {
      onDismiss?.(id)
    })
  }

  function handleAct(signal: ProactiveSignal) {
    startTransition(() => {
      onAct?.(signal)
    })
  }

  return (
    <section
      className="rounded-xl border border-stone-700/50 bg-gradient-to-br from-stone-900 via-stone-950 to-stone-950 p-5 sm:p-6"
      aria-label="Intelligence Digest"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Brain className="h-5 w-5 text-brand-400" aria-hidden="true" />
          <h2 className="text-sm font-bold text-stone-300 uppercase tracking-wider">
            Intelligence Digest
          </h2>
        </div>
        <Link
          href="/intelligence"
          className="flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Summary line */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-2xl font-display text-stone-50">{totalCount}</span>
        <span className="text-sm text-stone-400">
          signal{totalCount !== 1 ? 's' : ''} {periodLabel.toLowerCase()}
        </span>
      </div>

      {/* Category badges */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {(['client', 'pricing', 'operations'] as ActionCategory[]).map((cat) => {
          const count = categoryCounts[cat] || 0
          if (count === 0) return null
          const { Icon, label } = categoryConfig[cat]
          return (
            <span
              key={cat}
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-700/60 bg-stone-800/60 px-2.5 py-1 text-xs text-stone-300"
            >
              <Icon className="h-3 w-3 text-stone-500" aria-hidden="true" />
              {label}
              <span className="font-semibold text-stone-100">{count}</span>
            </span>
          )
        })}
      </div>

      {/* Top signals with action buttons */}
      {topSignals.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-stone-500 uppercase tracking-wide font-medium">Top signals</p>
          {topSignals.map(({ signal, action }) => {
            const { Icon: CatIcon } = categoryConfig[action.category]
            return (
              <div
                key={signal.id}
                className={`flex items-center gap-3 rounded-lg border border-stone-700/40 bg-stone-800/40 px-3 py-2.5 transition-opacity ${isPending ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <CatIcon className="h-4 w-4 shrink-0 text-stone-500" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <span className="text-sm text-stone-100 line-clamp-1">{signal.title}</span>
                </div>
                <Link
                  href={action.actionHref}
                  onClick={() => handleAct(signal)}
                  className="shrink-0 rounded bg-stone-700/80 px-2.5 py-1 text-[11px] font-medium text-stone-200 hover:bg-stone-600 transition-colors"
                >
                  {action.actionLabel}
                </Link>
                {onDismiss && (
                  <button
                    onClick={() => handleDismiss(signal.id)}
                    disabled={isPending}
                    className="shrink-0 rounded p-1 text-stone-600 hover:bg-stone-700 hover:text-stone-400"
                    aria-label="Dismiss"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
