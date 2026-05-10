'use client'

import { useTransition } from 'react'
import type { ProactiveSignal, SignalDomain } from '@/lib/cil/types'
import { DollarSign, Users, Calendar, Package, Star, TrendingUp, X } from 'lucide-react'

const urgencyColors: Record<number, string> = {
  5: 'bg-red-500',
  4: 'bg-orange-500',
  3: 'bg-amber-500',
  2: 'bg-blue-500',
  1: 'bg-stone-500',
}

const domainIcons: Record<SignalDomain, typeof DollarSign> = {
  finance: DollarSign,
  clients: Users,
  calendar: Calendar,
  inventory: Package,
  reputation: Star,
  pipeline: TrendingUp,
}

interface SignalCardProps {
  signal: ProactiveSignal
  onDismiss?: (id: string) => void
  onAct?: (signal: ProactiveSignal) => void
  compact?: boolean
}

export function SignalCard({ signal, onDismiss, onAct, compact }: SignalCardProps) {
  const [isPending, startTransition] = useTransition()
  const Icon = domainIcons[signal.domain]
  const urgencyColor = urgencyColors[signal.urgency] || urgencyColors[3]

  function handleDismiss() {
    startTransition(() => {
      onDismiss?.(signal.id)
    })
  }

  function handleAct() {
    startTransition(() => {
      onAct?.(signal)
    })
  }

  if (compact) {
    return (
      <div
        className={`flex items-center gap-3 rounded-lg border border-stone-700/40 bg-stone-800/50 px-3 py-2 transition-opacity ${isPending ? 'opacity-50' : ''}`}
        role="article"
        aria-label={`Signal: ${signal.title}`}
      >
        <div className={`h-2 w-2 shrink-0 rounded-full ${urgencyColor}`} aria-hidden="true" />
        <Icon className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-sm text-stone-100">{signal.title}</span>
        <span className="shrink-0 rounded-full bg-stone-700/60 px-2 py-0.5 text-xs text-stone-400">
          {Math.round(signal.confidence * 100)}%
        </span>
        {onDismiss && (
          <button
            onClick={handleDismiss}
            disabled={isPending}
            className="shrink-0 rounded p-1 text-stone-500 hover:bg-stone-700 hover:text-stone-300"
            aria-label={`Dismiss signal: ${signal.title}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className={`relative flex overflow-hidden rounded-xl border border-stone-700/40 bg-stone-800/50 transition-opacity ${isPending ? 'opacity-50' : ''}`}
      role="article"
      aria-label={`Signal: ${signal.title}`}
    >
      {/* Left urgency stripe */}
      <div className={`w-1 shrink-0 ${urgencyColor}`} aria-hidden="true" />

      <div className="flex flex-1 flex-col gap-2 px-4 py-3">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 h-5 w-5 shrink-0 text-stone-400" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-stone-100">{signal.title}</h3>
            <p className="mt-0.5 line-clamp-2 text-sm text-stone-400">{signal.detail}</p>
          </div>
          <span className="shrink-0 rounded-full bg-stone-700/60 px-2 py-0.5 text-xs text-stone-400">
            {Math.round(signal.confidence * 100)}%
          </span>
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-2 pl-8">
          {onDismiss && (
            <button
              onClick={handleDismiss}
              disabled={isPending}
              className="rounded px-3 py-1 text-xs text-stone-400 hover:bg-stone-700 hover:text-stone-200"
              aria-label={`Dismiss signal: ${signal.title}`}
            >
              Dismiss
            </button>
          )}
          {onAct && (
            <button
              onClick={handleAct}
              disabled={isPending}
              className="rounded bg-stone-700 px-3 py-1 text-xs text-stone-100 hover:bg-stone-600"
              aria-label={signal.suggestedAction}
            >
              {signal.suggestedAction}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
