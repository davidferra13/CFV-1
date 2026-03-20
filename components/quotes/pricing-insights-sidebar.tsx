'use client'

import { useEffect, useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
import { fetchPricingInsights } from '@/lib/finance/pricing-insights-actions'
import { formatCurrency } from '@/lib/utils/currency'
import type { PricingInsights } from '@/lib/finance/pricing-insights'

// ─── Props ───────────────────────────────────────────────────────────────────

interface PricingInsightsSidebarProps {
  eventType?: string
  guestCountRange?: [number, number]
}

// ─── Trend Arrow ─────────────────────────────────────────────────────────────

function TrendIndicator({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') {
    return (
      <span className="inline-flex items-center text-emerald-400 text-xs font-medium" title="Pricing trending up">
        <svg className="w-3.5 h-3.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
        </svg>
        Trending up
      </span>
    )
  }
  if (trend === 'down') {
    return (
      <span className="inline-flex items-center text-red-400 text-xs font-medium" title="Pricing trending down">
        <svg className="w-3.5 h-3.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        Trending down
      </span>
    )
  }
  return (
    <span className="inline-flex items-center text-stone-400 text-xs font-medium" title="Pricing stable">
      <svg className="w-3.5 h-3.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
      </svg>
      Stable
    </span>
  )
}

// ─── Stat Row ────────────────────────────────────────────────────────────────

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-stone-400">{label}</span>
      <span className="text-sm font-medium text-stone-100">{value}</span>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PricingInsightsSidebar({
  eventType,
  guestCountRange,
}: PricingInsightsSidebarProps) {
  const [data, setData] = useState<PricingInsights | null>(null)
  const [error, setError] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setError(false)
    startTransition(async () => {
      try {
        const result = await fetchPricingInsights({
          eventType,
          guestCountRange,
        })
        setData(result)
      } catch (err) {
        console.error('[PricingInsightsSidebar] Failed to load insights:', err)
        setError(true)
      }
    })
  }, [eventType, guestCountRange])

  // Loading state
  if (isPending && !data) {
    return (
      <Card className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-stone-700 rounded w-3/4" />
          <div className="h-3 bg-stone-700 rounded w-1/2" />
          <div className="space-y-2 mt-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-3 bg-stone-700 rounded" />
            ))}
          </div>
        </div>
      </Card>
    )
  }

  // Error state (not zeros, per zero-hallucination rule)
  if (error) {
    return (
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-stone-100 mb-2">Pricing Insights</h3>
        <p className="text-xs text-red-400">Could not load pricing data. Try refreshing the page.</p>
      </Card>
    )
  }

  // No data yet
  if (!data) return null

  // Insufficient data state (not zeros)
  if (data.status === 'insufficient_data') {
    return (
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-stone-100 mb-2">Pricing Insights</h3>
        <p className="text-xs text-stone-400 italic">
          Not enough data yet. Send at least 3 quotes
          {eventType ? ` for "${eventType}" events` : ''} to see pricing insights here.
        </p>
        {data.totalQuotes > 0 && (
          <p className="text-xs text-stone-500 mt-1">
            {data.totalQuotes} quote{data.totalQuotes === 1 ? '' : 's'} found (need 3+)
          </p>
        )}
      </Card>
    )
  }

  // Build subtitle
  const parts: string[] = []
  if (eventType) parts.push(`"${eventType}"`)
  if (guestCountRange) parts.push(`${guestCountRange[0]}-${guestCountRange[1]} guests`)
  const filterLabel = parts.length > 0 ? parts.join(', ') : 'all events'

  return (
    <Card className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-stone-100">Pricing Insights</h3>
        <TrendIndicator trend={data.recentTrend} />
      </div>
      <p className="text-xs text-stone-500 mb-3">
        Based on {data.totalQuotes} similar quote{data.totalQuotes === 1 ? '' : 's'} ({filterLabel})
      </p>

      {/* Divider */}
      <div className="border-t border-stone-700 mb-2" />

      {/* Stats */}
      <div className="space-y-0.5">
        <StatRow label="Avg quote" value={formatCurrency(data.avgQuoteCents)} />
        <StatRow label="Median quote" value={formatCurrency(data.medianQuoteCents)} />
        <StatRow label="Win rate" value={`${data.winRate}%`} />
        <StatRow
          label="Accepted range"
          value={
            data.acceptedQuotes > 0
              ? `${formatCurrency(data.lowestAcceptedCents)} - ${formatCurrency(data.highestAcceptedCents)}`
              : 'N/A'
          }
        />
        <StatRow
          label="Avg per guest"
          value={data.avgPerGuestCents > 0 ? formatCurrency(data.avgPerGuestCents) : 'N/A'}
        />
      </div>

      {/* Footer */}
      <div className="border-t border-stone-700 mt-2 pt-2">
        <div className="flex items-center justify-between text-xs text-stone-500">
          <span>{data.acceptedQuotes} accepted</span>
          <span>{data.totalQuotes - data.acceptedQuotes} other</span>
        </div>
      </div>
    </Card>
  )
}
