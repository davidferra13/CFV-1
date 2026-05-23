'use client'

/**
 * Action Signal Card - Intelligence signal with ONE-CLICK action button.
 *
 * Each card shows:
 *   - Domain icon (client, pricing, operations)
 *   - One-line summary of the signal
 *   - ONE primary action button (Send Check-in, Update Price, etc.)
 *   - Dismiss button to acknowledge without acting
 *   - Urgency stripe (red/orange/amber/blue/gray)
 */

import { useTransition } from 'react'
import Link from 'next/link'
import { Users, DollarSign, Settings, AlertTriangle, AlertCircle, Info, X } from 'lucide-react'
import type { ProactiveSignal } from '@/lib/cil/types'
import type { MappedSignalAction, ActionCategory } from '@/lib/intelligence/signal-mapper'

const categoryIcons: Record<ActionCategory, typeof Users> = {
  client: Users,
  pricing: DollarSign,
  operations: Settings,
}

const urgencyIconMap = {
  alert: AlertTriangle,
  warning: AlertCircle,
  info: Info,
} as const

const urgencyStripeColors: Record<number, string> = {
  5: 'bg-red-500',
  4: 'bg-orange-500',
  3: 'bg-amber-500',
  2: 'bg-blue-500',
  1: 'bg-stone-500',
}

interface ActionSignalCardProps {
  signal: ProactiveSignal
  action: MappedSignalAction
  onDismiss: (id: string) => void
  onAct: (signal: ProactiveSignal) => void
  compact?: boolean
}

export function ActionSignalCard({
  signal,
  action,
  onDismiss,
  onAct,
  compact,
}: ActionSignalCardProps) {
  const [isPending, startTransition] = useTransition()
  const CategoryIcon = categoryIcons[action.category]
  const UrgencyIcon = urgencyIconMap[action.urgencyIcon]
  const stripeColor = urgencyStripeColors[signal.urgency] || urgencyStripeColors[3]

  function handleDismiss() {
    startTransition(() => {
      onDismiss(signal.id)
    })
  }

  function handleAct() {
    startTransition(() => {
      onAct(signal)
    })
  }

  if (compact) {
    return (
      <div
        className={`flex items-center gap-3 rounded-lg border border-stone-700/40 bg-stone-800/50 px-3 py-2 transition-opacity ${isPending ? 'opacity-50 pointer-events-none' : ''}`}
        role="article"
        aria-label={`Signal: ${action.title}`}
      >
        <div className={`h-2 w-2 shrink-0 rounded-full ${stripeColor}`} aria-hidden="true" />
        <CategoryIcon className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
        <span className="min-w-0 flex-1 text-sm text-stone-100">{signal.title}</span>
        <Link
          href={action.actionHref}
          onClick={handleAct}
          className="shrink-0 rounded bg-stone-700 px-2.5 py-1 text-xs font-medium text-stone-100 hover:bg-stone-600 transition-colors"
        >
          {action.actionLabel}
        </Link>
        <button
          onClick={handleDismiss}
          disabled={isPending}
          className="shrink-0 rounded p-1 text-stone-500 hover:bg-stone-700 hover:text-stone-300"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div
      className={`relative flex overflow-hidden rounded-xl border border-stone-700/40 bg-stone-800/50 transition-opacity ${isPending ? 'opacity-50 pointer-events-none' : ''}`}
      role="article"
      aria-label={`Signal: ${action.title}`}
    >
      <div className={`w-1 shrink-0 ${stripeColor}`} aria-hidden="true" />

      <div className="flex flex-1 flex-col gap-2 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex items-center gap-1.5">
            <UrgencyIcon
              className={`h-4 w-4 shrink-0 ${
                action.urgencyIcon === 'alert'
                  ? 'text-red-400'
                  : action.urgencyIcon === 'warning'
                    ? 'text-amber-400'
                    : 'text-blue-400'
              }`}
              aria-hidden="true"
            />
            <CategoryIcon className="h-4 w-4 shrink-0 text-stone-500" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-stone-100">{signal.title}</h3>
            <p className="mt-0.5 text-sm text-stone-400 line-clamp-2">
              {action.description || signal.detail}
            </p>
          </div>
          <button
            onClick={handleDismiss}
            disabled={isPending}
            className="shrink-0 rounded p-1 text-stone-600 hover:bg-stone-700 hover:text-stone-400"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2 pl-[2.375rem]">
          <Link
            href={action.actionHref}
            onClick={handleAct}
            className="rounded bg-brand-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-500 transition-colors"
          >
            {action.actionLabel}
          </Link>
          <span className="text-xs text-stone-500">
            {Math.round(signal.confidence * 100)}% confidence
          </span>
        </div>
      </div>
    </div>
  )
}
