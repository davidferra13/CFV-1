'use client'

import { useState, useTransition } from 'react'
import { RefreshCw } from '@/components/ui/icons'
import { AttentionFeed } from './attention-feed'
import { TodayGlance } from './today-glance'
import { WeeklyHorizon } from './weekly-horizon'
import type { CommandCenterPayload } from '@/lib/command-center/attention-actions'

function MetricPill({
  label,
  value,
  color,
}: {
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-900/60 border border-stone-800/40">
      <span className={`text-sm font-semibold tabular-nums ${color}`}>{value}</span>
      <span className="text-[10px] text-stone-500">{label}</span>
    </div>
  )
}

function formatCents(cents: number): string {
  if (cents === 0) return '$0'
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function CommandCenterLayout({
  data,
  onRefresh,
}: {
  data: CommandCenterPayload
  onRefresh?: () => Promise<CommandCenterPayload>
}) {
  const [payload, setPayload] = useState(data)
  const [isPending, startTransition] = useTransition()

  const handleRefresh = () => {
    if (!onRefresh) return
    startTransition(async () => {
      try {
        const fresh = await onRefresh()
        setPayload(fresh)
      } catch {
        // Silently fail; stale data is better than no data
      }
    })
  }

  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-stone-100">
            {payload.greeting}, {payload.chefFirstName}
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">{dateStr}</p>
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isPending}
            className="p-2 rounded-lg border border-stone-800 hover:bg-stone-800/50 transition-colors text-stone-400 hover:text-stone-200 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {/* Quick metrics */}
      <div className="flex flex-wrap gap-2">
        <MetricPill
          label="active events"
          value={payload.metrics.activeEvents}
          color="text-blue-400"
        />
        <MetricPill
          label="open inquiries"
          value={payload.metrics.openInquiries}
          color="text-amber-400"
        />
        {payload.metrics.outstandingCents > 0 && (
          <MetricPill
            label="outstanding"
            value={formatCents(payload.metrics.outstandingCents)}
            color="text-red-400"
          />
        )}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Right column on mobile (today + week first), left on desktop */}
        <div className="lg:hidden space-y-4">
          <TodayGlance events={payload.todayEvents} revenueCents={payload.todayRevenueCents} />
          <WeeklyHorizon days={payload.weekDays} />
        </div>

        {/* Attention feed: 60% on desktop */}
        <div className="lg:col-span-3">
          <div className="mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Needs Your Attention
            </h2>
          </div>
          <AttentionFeed items={payload.attentionItems} />
        </div>

        {/* Right column on desktop only */}
        <div className="hidden lg:block lg:col-span-2 space-y-4">
          <TodayGlance events={payload.todayEvents} revenueCents={payload.todayRevenueCents} />
          <WeeklyHorizon days={payload.weekDays} />
        </div>
      </div>
    </div>
  )
}
