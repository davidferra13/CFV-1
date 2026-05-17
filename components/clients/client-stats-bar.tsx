'use client'

import { useEffect, useState, useTransition } from 'react'
import { getClientStats, type ClientStats } from '@/lib/clients/client-stats'
import {
  getClientSpendingInsights,
  type ClientSpendingInsights,
} from '@/lib/finance/client-spending-insights'
import { getClientRankings } from '@/lib/clients/rankings'
import { formatCurrency } from '@/lib/utils/currency'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

type Props = {
  clientId: string
  cannabisPermissioned?: boolean
}

function StatCell({
  label,
  value,
  sub,
  warning,
}: {
  label: string
  value: string | number
  sub?: string
  warning?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5 min-w-[100px]">
      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-500">
        {label}
      </span>
      <span className={`text-lg font-bold ${warning ? 'text-red-400' : 'text-stone-100'}`}>
        {value}
      </span>
      {sub && <span className="text-[10px] text-stone-500">{sub}</span>}
    </div>
  )
}

export function ClientStatsBar({ clientId, cannabisPermissioned }: Props) {
  const [stats, setStats] = useState<ClientStats | null>(null)
  const [spending, setSpending] = useState<ClientSpendingInsights | null>(null)
  const [spendPercentile, setSpendPercentile] = useState<number | null>(null)
  const [loading, startTransition] = useTransition()
  const [error, setError] = useState(false)

  useEffect(() => {
    setError(false)
    startTransition(async () => {
      try {
        const [result, spendingResult, rankings] = await Promise.all([
          getClientStats(clientId),
          getClientSpendingInsights(clientId, '').catch(() => null),
          getClientRankings().catch(() => null),
        ])
        setStats(result)
        setSpending(spendingResult)
        if (rankings) {
          const match = rankings.byLifetimeSpend.clients.find((c) => c.id === clientId)
          if (match) {
            setSpendPercentile(100 - match.percentile + 1)
          }
        }
      } catch {
        setError(true)
      }
    })
  }, [clientId])

  if (error) return null

  if (loading || !stats) {
    return (
      <div className="bg-stone-900 border border-stone-800 rounded-lg p-4 animate-pulse">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <div className="h-3 bg-stone-800 rounded w-16 mb-2" />
              <div className="h-5 bg-stone-800 rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const hasDataHealth = stats.eventsWithoutGuestCount > 0 || stats.completedWithoutCloseout > 0

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-stone-400">
          Relationship Intelligence
        </h3>
        <div className="flex gap-2">
          {spendPercentile !== null && (
            <Badge variant="success">Top {spendPercentile}% by spend</Badge>
          )}
          {stats.isDormant && (
            <Badge variant="warning">Dormant ({stats.daysSinceLastEvent}d)</Badge>
          )}
          {stats.outstandingBalanceCents > 0 && <Badge variant="error">Balance due</Badge>}
          {stats.quoteAcceptanceRate !== null && stats.quoteAcceptanceRate < 50 && (
            <Badge variant="warning">{stats.quoteAcceptanceRate}% quote acceptance</Badge>
          )}
        </div>
      </div>

      {/* Financial row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-3">
        <StatCell label="Lifetime Spend" value={formatCurrency(stats.lifetimeSpendCents)} />
        <StatCell label="Total Quoted" value={formatCurrency(stats.totalQuotedCents)} />
        <StatCell
          label="Outstanding"
          value={formatCurrency(stats.outstandingBalanceCents)}
          warning={stats.outstandingBalanceCents > 0}
        />
        <StatCell
          label="Avg Event"
          value={formatCurrency(spending?.avgEventCents ?? stats.averageEventValueCents)}
          sub={spending ? `${spending.eventCount} events` : undefined}
        />
        <StatCell
          label="Highest Event"
          value={formatCurrency(stats.highestValueEventCents)}
          sub={stats.highestValueEventId ? 'View event' : undefined}
        />
        {spending && spending.eventCount > 0 && (
          <StatCell label="Lowest Event" value={formatCurrency(spending.lowestEventCents)} />
        )}
        <StatCell
          label="Quote Rate"
          value={stats.quoteAcceptanceRate !== null ? `${stats.quoteAcceptanceRate}%` : 'N/A'}
          sub={
            stats.quotesSent > 0
              ? `${stats.quotesAccepted}/${stats.quotesSent} accepted`
              : undefined
          }
        />
      </div>

      {/* Events row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-3">
        <StatCell label="Total Dinners" value={stats.totalDinners} />
        <StatCell label="Completed" value={stats.completedDinners} />
        <StatCell label="Upcoming" value={stats.upcomingDinners} />
        <StatCell label="Cancelled" value={stats.cancelledDinners} />
        {cannabisPermissioned && (
          <StatCell label="Cannabis Dinners" value={stats.cannabisDinners} />
        )}
        <StatCell
          label="Next Event"
          value={
            stats.nextEventDate
              ? new Date(stats.nextEventDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
              : 'None'
          }
        />
      </div>

      {/* Guest intelligence row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-3">
        <StatCell
          label="Total Covers"
          value={stats.totalCovers}
          sub="Diners served across all events"
        />
        <StatCell label="Unique Guests" value={stats.uniqueGuests} sub="Distinct people" />
        <StatCell
          label="Guest Appearances"
          value={stats.guestAppearances}
          sub="Total RSVP records"
        />
        <StatCell label="Repeat Guests" value={stats.repeatGuests} sub="Attended 2+ events" />
        <StatCell label="Avg Party Size" value={stats.averagePartySize} />
        <StatCell label="Menus Served" value={stats.menusServed} />
      </div>

      {/* Profitability row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-3">
        <StatCell label="Total Profit" value={formatCurrency(stats.totalProfitCents)} />
        <StatCell
          label="Margin"
          value={stats.profitMarginPercent !== null ? `${stats.profitMarginPercent}%` : 'N/A'}
        />
        <StatCell label="Expenses" value={formatCurrency(stats.totalExpensesCents)} />
        <StatCell
          label="This Month"
          value={formatCurrency(stats.thisMonth.revenueCents)}
          sub={`${stats.thisMonth.dinners} dinners, ${stats.thisMonth.covers} covers`}
        />
        <StatCell
          label="This Year"
          value={formatCurrency(stats.thisYear.revenueCents)}
          sub={`${stats.thisYear.dinners} dinners, ${stats.thisYear.covers} covers`}
        />
        <StatCell
          label="Last Year"
          value={formatCurrency(stats.lastYear.revenueCents)}
          sub={`${stats.lastYear.dinners} dinners, ${stats.lastYear.covers} covers`}
        />
      </div>

      {/* Data health warnings */}
      {hasDataHealth && (
        <div className="border-t border-stone-800 pt-3 flex flex-wrap gap-3 text-[11px] text-stone-500">
          {stats.eventsWithoutGuestCount > 0 && (
            <span>{stats.eventsWithoutGuestCount} event(s) missing guest count</span>
          )}
          {stats.completedWithoutCloseout > 0 && (
            <span>{stats.completedWithoutCloseout} completed event(s) without closeout</span>
          )}
        </div>
      )}
    </div>
  )
}
