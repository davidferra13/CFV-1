import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getFinancialClarityData } from '@/lib/finance/profit-actions'
import { formatCurrency } from '@/lib/utils/currency'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Financial Clarity' }

export default async function FinancialClarityPage() {
  await requireChef()
  const data = await getFinancialClarityData()
  const { atAGlance, recentEvents, mostProfitable, leastProfitable } = data

  if (!atAGlance.hasData) {
    return (
      <div className="space-y-6">
        <Header />
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-stone-400 font-medium">No financial data yet</p>
            <p className="text-stone-500 text-sm mt-1">
              Complete events and log expenses to see your profit analysis.
            </p>
            <Link
              href="/events/new"
              className="inline-block mt-4 text-sm font-medium text-brand-500 hover:text-brand-400"
            >
              Create your first event
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const profitColor = atAGlance.monthlyProfitCents >= 0 ? 'text-emerald-400' : 'text-red-400'
  const ytdColor = atAGlance.ytdProfitCents >= 0 ? 'text-emerald-400' : 'text-red-400'
  const trendLabel = atAGlance.trend.changePercent !== null
    ? `${atAGlance.trend.changePercent > 0 ? '+' : ''}${atAGlance.trend.changePercent}% vs last month`
    : 'First month tracked'
  const trendColor = atAGlance.trend.direction === 'up'
    ? 'text-emerald-400'
    : atAGlance.trend.direction === 'down'
      ? 'text-red-400'
      : 'text-stone-500'

  return (
    <div className="space-y-6">
      <Header />

      {/* Monthly P&L Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-stone-500">Monthly Revenue</p>
            <p className="text-2xl font-bold text-stone-200 mt-1">
              {formatCurrency(atAGlance.monthlyRevenueCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-stone-500">Monthly Costs</p>
            <p className="text-2xl font-bold text-stone-200 mt-1">
              {formatCurrency(atAGlance.monthlyCostCents)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-stone-500">Net Profit</p>
            <p className={`text-2xl font-bold ${profitColor} mt-1`}>
              {formatCurrency(Math.abs(atAGlance.monthlyProfitCents))}
              {atAGlance.monthlyProfitCents < 0 && (
                <span className="text-sm font-normal ml-1">loss</span>
              )}
            </p>
            <p className={`text-xs mt-1 ${trendColor}`}>{trendLabel}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-stone-500">Avg per Event</p>
            <p className="text-2xl font-bold text-stone-200 mt-1">
              {atAGlance.eventCount > 0
                ? formatCurrency(atAGlance.avgProfitPerEventCents)
                : 'N/A'}
            </p>
            <p className="text-xs text-stone-500 mt-1">
              {atAGlance.eventCount} {atAGlance.eventCount === 1 ? 'event' : 'events'} this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Year-to-Date */}
      <Card>
        <CardContent className="py-4">
          <h2 className="text-sm font-semibold text-stone-400 mb-3">Year to Date</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-stone-500">Revenue</p>
              <p className="text-lg font-bold text-stone-200">
                {formatCurrency(atAGlance.ytdRevenueCents)}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Costs</p>
              <p className="text-lg font-bold text-stone-200">
                {formatCurrency(atAGlance.ytdCostCents)}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Net Profit</p>
              <p className={`text-lg font-bold ${ytdColor}`}>
                {formatCurrency(Math.abs(atAGlance.ytdProfitCents))}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500">Events</p>
              <p className="text-lg font-bold text-stone-200">
                {atAGlance.ytdEventCount}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Highlights: most/least profitable */}
      {(mostProfitable || leastProfitable) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mostProfitable && (
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-stone-500 uppercase tracking-wide font-medium mb-2">
                  Most Profitable Event
                </p>
                <Link
                  href={`/events/${mostProfitable.eventId}`}
                  className="block hover:bg-stone-800/30 rounded -mx-2 px-2 py-1 transition-colors"
                >
                  <p className="text-sm font-medium text-stone-200">
                    {mostProfitable.occasion
                      ? mostProfitable.occasion.replace(/_/g, ' ')
                      : 'Event'}
                    {mostProfitable.clientName && (
                      <span className="text-stone-500 ml-2">
                        for {mostProfitable.clientName}
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-emerald-400 font-bold">
                      {formatCurrency(mostProfitable.netProfitCents)} profit
                    </span>
                    <span className="text-xs text-stone-500">
                      {mostProfitable.marginPercent}% margin
                    </span>
                    {mostProfitable.eventDate && (
                      <span className="text-xs text-stone-600">{mostProfitable.eventDate}</span>
                    )}
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}
          {leastProfitable && leastProfitable.eventId !== mostProfitable?.eventId && (
            <Card>
              <CardContent className="py-4">
                <p className="text-xs text-stone-500 uppercase tracking-wide font-medium mb-2">
                  Least Profitable Event
                </p>
                <Link
                  href={`/events/${leastProfitable.eventId}`}
                  className="block hover:bg-stone-800/30 rounded -mx-2 px-2 py-1 transition-colors"
                >
                  <p className="text-sm font-medium text-stone-200">
                    {leastProfitable.occasion
                      ? leastProfitable.occasion.replace(/_/g, ' ')
                      : 'Event'}
                    {leastProfitable.clientName && (
                      <span className="text-stone-500 ml-2">
                        for {leastProfitable.clientName}
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className={leastProfitable.netProfitCents >= 0 ? 'text-amber-400 font-bold' : 'text-red-400 font-bold'}>
                      {formatCurrency(Math.abs(leastProfitable.netProfitCents))}
                      {leastProfitable.netProfitCents < 0 ? ' loss' : ' profit'}
                    </span>
                    <span className="text-xs text-stone-500">
                      {leastProfitable.marginPercent}% margin
                    </span>
                    {leastProfitable.eventDate && (
                      <span className="text-xs text-stone-600">{leastProfitable.eventDate}</span>
                    )}
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Per-Event List */}
      {recentEvents.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <h2 className="text-sm font-semibold text-stone-400 mb-3">Recent Events</h2>
            <div className="space-y-2">
              {recentEvents.map((evt) => {
                const evtProfitColor = evt.netProfitCents >= 0 ? 'text-emerald-400' : 'text-red-400'
                return (
                  <Link
                    key={evt.eventId}
                    href={`/events/${evt.eventId}`}
                    className="flex items-center justify-between py-2 px-2 -mx-2 rounded hover:bg-stone-800/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-stone-200 truncate">
                        {evt.occasion ? evt.occasion.replace(/_/g, ' ') : 'Event'}
                        {evt.clientName && (
                          <span className="text-stone-500 ml-1 text-xs">
                            {evt.clientName}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-stone-600">
                        {evt.eventDate ?? 'No date'}
                        {evt.guestCount ? ` | ${evt.guestCount} guests` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-stone-500">Revenue</p>
                        <p className="text-sm font-medium text-stone-300">
                          {formatCurrency(evt.revenueCents)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-stone-500">Profit</p>
                        <p className={`text-sm font-bold ${evtProfitColor}`}>
                          {formatCurrency(Math.abs(evt.netProfitCents))}
                        </p>
                      </div>
                      <div className="text-right w-14">
                        <p className="text-xs text-stone-500">Margin</p>
                        <p className={`text-sm font-medium ${evt.marginPercent >= 20 ? 'text-stone-400' : 'text-red-400'}`}>
                          {evt.marginPercent}%
                        </p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Receipt capture shortcut */}
      <div className="flex justify-center">
        <Link
          href="/finance/expenses"
          className="inline-flex items-center gap-2 rounded-lg border border-stone-700 bg-stone-800/50 px-4 py-2 text-sm text-stone-300 hover:text-stone-100 hover:border-stone-600 transition-colors"
        >
          Log Receipt / Expense
        </Link>
      </div>
    </div>
  )
}

function Header() {
  return (
    <div>
      <Link href="/finance" className="text-sm text-stone-500 hover:text-stone-300">
        &larr; Finance
      </Link>
      <h1 className="text-3xl font-bold text-stone-100 mt-1">Financial Clarity</h1>
      <p className="text-stone-500 mt-1">
        Your profit per event, monthly trends, and year-to-date summary.
      </p>
    </div>
  )
}