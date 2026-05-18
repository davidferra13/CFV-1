'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import {
  DollarSign,
  Users,
  Calendar,
  Package,
  Star,
  TrendingUp,
  Leaf,
  ShieldCheck,
  ClipboardCheck,
  Activity,
  ArrowRight,
  X,
} from 'lucide-react'
import type { ProactiveSignal, SignalDomain } from '@/lib/cil/types'
import { dismissSignalAction, actOnSignal } from '@/lib/cil/signal-actions'

const domainIcons: Record<SignalDomain, typeof DollarSign> = {
  finance: DollarSign,
  clients: Users,
  calendar: Calendar,
  inventory: Package,
  reputation: Star,
  pipeline: TrendingUp,
  cannabis: Leaf,
  commitment: ShieldCheck,
  event_debrief: ClipboardCheck,
}

const urgencyColors: Record<number, string> = {
  5: 'bg-red-500',
  4: 'bg-orange-500',
  3: 'bg-amber-500',
  2: 'bg-blue-500',
  1: 'bg-stone-500',
}

const urgencyBarColors: Record<number, string> = {
  5: 'bg-red-500/80',
  4: 'bg-orange-500/80',
  3: 'bg-amber-500/80',
  2: 'bg-blue-500/80',
  1: 'bg-stone-500/80',
}

interface BreakdownItem {
  domain: SignalDomain
  label: string
  count: number
}

interface Props {
  totalCount: number
  recentCount: number
  breakdown: BreakdownItem[]
  topSignals: ProactiveSignal[]
}

export function CilSignalSummaryClient({ totalCount, recentCount, breakdown, topSignals }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleDismiss(id: string) {
    startTransition(async () => {
      try {
        await dismissSignalAction(id)
      } catch {
        // Non-blocking
      }
    })
  }

  function handleAct(signal: ProactiveSignal) {
    startTransition(async () => {
      try {
        await actOnSignal(signal)
      } catch {
        // Non-blocking
      }
    })
  }

  return (
    <section
      className="rounded-xl border border-stone-700/50 bg-gradient-to-br from-stone-900 via-stone-950 to-stone-950 p-5 sm:p-6"
      aria-label="System Pulse: Intelligence Signals"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Activity className="h-5 w-5 text-brand-400" aria-hidden="true" />
          <h2 className="text-sm font-bold text-stone-300 uppercase tracking-wider">
            System Pulse
          </h2>
        </div>
        <Link
          href="/remy/signals"
          className="flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Signal counts */}
      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-3xl font-display text-stone-50">{totalCount}</span>
        <span className="text-sm text-stone-400">active signal{totalCount !== 1 ? 's' : ''}</span>
        {recentCount > 0 && (
          <span className="rounded-full bg-stone-800 px-2 py-0.5 text-xs text-stone-400">
            {recentCount} in last 24h
          </span>
        )}
      </div>

      {/* Domain breakdown badges */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {breakdown.map(({ domain, label, count }) => {
          const Icon = domainIcons[domain]
          return (
            <span
              key={domain}
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-700/60 bg-stone-800/60 px-2.5 py-1 text-xs text-stone-300"
            >
              {Icon && <Icon className="h-3 w-3 text-stone-500" aria-hidden="true" />}
              {label}
              <span className="font-semibold text-stone-100">{count}</span>
            </span>
          )
        })}
      </div>

      {/* Top 3 signals */}
      {topSignals.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-xs text-stone-500 uppercase tracking-wide font-medium">Top signals</p>
          {topSignals.map((signal) => {
            const Icon = domainIcons[signal.domain]
            const urgencyColor = urgencyColors[signal.urgency] || urgencyColors[3]
            const barColor = urgencyBarColors[signal.urgency] || urgencyBarColors[3]
            const confidencePct = Math.round(signal.confidence * 100)

            return (
              <div
                key={signal.id}
                className={`relative flex overflow-hidden rounded-lg border border-stone-700/40 bg-stone-800/40 transition-opacity ${isPending ? 'opacity-50 pointer-events-none' : ''}`}
                role="article"
                aria-label={`Signal: ${signal.title}`}
              >
                {/* Left urgency stripe */}
                <div className={`w-1 shrink-0 ${urgencyColor}`} aria-hidden="true" />

                <div className="flex-1 px-3.5 py-2.5">
                  {/* Signal header */}
                  <div className="flex items-start gap-2.5">
                    {Icon && (
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-stone-500" aria-hidden="true" />
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-stone-100 leading-snug">
                        {signal.title}
                      </h3>
                      <p className="mt-0.5 text-xs text-stone-400 line-clamp-1">{signal.detail}</p>
                    </div>

                    {/* Dismiss button */}
                    <button
                      onClick={() => handleDismiss(signal.id)}
                      disabled={isPending}
                      className="shrink-0 rounded p-1 text-stone-600 hover:bg-stone-700 hover:text-stone-400 transition-colors"
                      aria-label={`Dismiss: ${signal.title}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Confidence bar + action row */}
                  <div className="mt-2 flex items-center gap-3">
                    {/* Confidence bar */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="h-1.5 w-16 rounded-full bg-stone-700/60 overflow-hidden"
                        role="progressbar"
                        aria-valuenow={confidencePct}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Confidence: ${confidencePct}%`}
                      >
                        <div
                          className={`h-full rounded-full transition-all ${barColor}`}
                          style={{ width: `${confidencePct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-stone-500 tabular-nums shrink-0">
                        {confidencePct}%
                      </span>
                    </div>

                    {/* Suggested action */}
                    {signal.suggestedAction && signal.actionType !== 'dismiss' && (
                      <button
                        onClick={() => handleAct(signal)}
                        disabled={isPending}
                        className="ml-auto shrink-0 rounded bg-stone-700/80 px-2.5 py-1 text-[11px] font-medium text-stone-200 hover:bg-stone-600 transition-colors truncate max-w-[180px]"
                        title={signal.suggestedAction}
                      >
                        {signal.suggestedAction}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
