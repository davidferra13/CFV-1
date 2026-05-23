'use client'

// Profit At A Glance: dashboard card showing net profit this month,
// event count, avg profit per event, and trend vs last month.
// Handles zero-data gracefully (shows onboarding prompt, never $0.00).

import Link from 'next/link'
import { formatCurrency } from '@/lib/utils/currency'
import type { ProfitAtAGlanceData } from '@/lib/finance/profit-calculator'

type Props = {
  data: ProfitAtAGlanceData
}

function TrendArrow({ direction }: { direction: 'up' | 'down' | 'flat' }) {
  if (direction === 'up') {
    return (
      <svg className="inline-block h-4 w-4 text-emerald-400" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 4l4 4H9v4H7V8H4l4-4z" />
      </svg>
    )
  }
  if (direction === 'down') {
    return (
      <svg className="inline-block h-4 w-4 text-red-400" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 12l-4-4h3V4h2v4h3l-4 4z" />
      </svg>
    )
  }
  return (
    <svg className="inline-block h-4 w-4 text-stone-500" viewBox="0 0 16 16" fill="currentColor">
      <path d="M3 8h10v1H3z" />
    </svg>
  )
}

export function ProfitAtAGlance({ data }: Props) {
  // No financial data at all: show onboarding prompt
  if (!data.hasData) {
    return (
      <div className="rounded-2xl border border-stone-800 bg-stone-900/50 p-6">
        <h3 className="text-sm font-semibold text-stone-400 mb-3">Profit at a Glance</h3>
        <p className="text-stone-500 text-sm">
          Track your first event to see profits here.
        </p>
        <p className="text-stone-600 text-xs mt-2">
          Revenue and expenses from completed events will show your monthly profit, trends, and
          year-to-date totals.
        </p>
        <Link
          href="/events/new"
          className="inline-block mt-3 text-xs font-medium text-brand-500 hover:text-brand-400 transition-colors"
        >
          Create an event
        </Link>
      </div>
    )
  }

  const { trend } = data
  const profitColor = data.monthlyProfitCents >= 0 ? 'text-emerald-400' : 'text-red-400'
  const trendColor = trend.direction === 'up'
    ? 'text-emerald-400'
    : trend.direction === 'down'
      ? 'text-red-400'
      : 'text-stone-500'

  return (
    <Link
      href="/finance/clarity"
      className="block rounded-2xl border border-stone-800 bg-stone-900/50 p-6 hover:border-stone-700 transition-colors"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-stone-400">Profit at a Glance</h3>
        <span className="text-xs text-stone-600">This month</span>
      </div>

      {/* Hero number: net profit */}
      <div className="mb-4">
        <p className={`text-3xl font-bold ${profitColor}`}>
          {formatCurrency(Math.abs(data.monthlyProfitCents))}
          {data.monthlyProfitCents < 0 && (
            <span className="text-sm font-normal ml-1">loss</span>
          )}
        </p>
        <p className="text-xs text-stone-500 mt-1">
          Net profit from {data.eventCount} {data.eventCount === 1 ? 'event' : 'events'}
        </p>
      </div>

      {/* Secondary metrics row */}
      <div className="grid grid-cols-3 gap-3 border-t border-stone-800 pt-3">
        {/* Avg profit per event */}
        <div>
          <p className="text-xs text-stone-500">Per Event</p>
          <p className="text-sm font-semibold text-stone-200">
            {data.eventCount > 0
              ? formatCurrency(data.avgProfitPerEventCents)
              : 'N/A'}
          </p>
        </div>

        {/* Trend vs last month */}
        <div>
          <p className="text-xs text-stone-500">vs Last Month</p>
          <div className={`flex items-center gap-1 text-sm font-semibold ${trendColor}`}>
            <TrendArrow direction={trend.direction} />
            {trend.changePercent !== null
              ? `${trend.changePercent > 0 ? '+' : ''}${trend.changePercent}%`
              : 'New'}
          </div>
        </div>

        {/* YTD */}
        <div>
          <p className="text-xs text-stone-500">Year to Date</p>
          <p className={`text-sm font-semibold ${data.ytdProfitCents >= 0 ? 'text-stone-200' : 'text-red-400'}`}>
            {formatCurrency(Math.abs(data.ytdProfitCents))}
          </p>
        </div>
      </div>
    </Link>
  )
}

// Skeleton for Suspense fallback
export function ProfitAtAGlanceSkeleton() {
  return (
    <div className="rounded-2xl border border-stone-800 bg-stone-900/50 p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-28 rounded bg-stone-800" />
        <div className="h-3 w-16 rounded bg-stone-800" />
      </div>
      <div className="mb-4">
        <div className="h-9 w-32 rounded bg-stone-800" />
        <div className="h-3 w-40 rounded bg-stone-800 mt-2" />
      </div>
      <div className="grid grid-cols-3 gap-3 border-t border-stone-800 pt-3">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <div className="h-3 w-14 rounded bg-stone-800 mb-1" />
            <div className="h-4 w-16 rounded bg-stone-800" />
          </div>
        ))}
      </div>
    </div>
  )
}
