import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import type { QuoteAcceptanceInsights } from '@/lib/analytics/quote-insights'

interface QuoteAcceptanceInsightsPanelProps {
  data: QuoteAcceptanceInsights
}

export function QuoteAcceptanceInsightsPanel({ data }: QuoteAcceptanceInsightsPanelProps) {
  return (
    <Card className="p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-stone-100">Quote Performance (Last 90 Days)</h3>
        <Link href="/quotes" className="text-xs text-brand-500 hover:text-brand-400 font-medium">
          All Quotes →
        </Link>
      </div>

      {/* Expiring soon - always shown when present */}
      {data.expiringThisWeek.length > 0 && (
        <div className="mb-4 space-y-1">
          <p className="text-xs font-medium text-amber-700 mb-1">Expiring this week:</p>
          {data.expiringThisWeek.map((q) => (
            <Link
              key={q.id}
              href={`/quotes/${q.id}`}
              className="flex items-center justify-between text-xs text-stone-300 hover:text-stone-100"
            >
              <span className="flex items-center gap-1.5">
                <Badge variant="warning">{format(new Date(q.validUntil), 'MMM d')}</Badge>
                {q.clientName}
              </span>
              <span className="font-medium">{formatCurrency(q.totalCents)}</span>
            </Link>
          ))}
        </div>
      )}

      {data.status === 'insufficient_data' ? (
        <p className="text-sm text-stone-400 italic">
          Send at least 3 quotes to see acceptance rate trends here.
        </p>
      ) : (
        <>
          {/* Stat tiles */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-stone-100">{data.acceptanceRate}%</div>
              <p className="text-xs text-stone-500 mt-0.5">acceptance rate</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-stone-100">{data.avgTimeToDaysDecision}d</div>
              <p className="text-xs text-stone-500 mt-0.5">avg time to decision</p>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-stone-100">{data.totalSent}</div>
              <p className="text-xs text-stone-500 mt-0.5">quotes sent</p>
            </div>
          </div>

          {/* Avg values */}
          {(data.avgAcceptedValueCents > 0 || data.avgRejectedValueCents > 0) && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-emerald-950 rounded-lg px-3 py-2 text-center">
                <p className="text-xs text-emerald-600 font-medium">Avg Accepted</p>
                <p className="text-sm font-bold text-emerald-700">
                  {formatCurrency(data.avgAcceptedValueCents)}
                </p>
              </div>
              <div className="bg-stone-800 rounded-lg px-3 py-2 text-center">
                <p className="text-xs text-stone-500 font-medium">Avg Rejected</p>
                <p className="text-sm font-bold text-stone-400">
                  {formatCurrency(data.avgRejectedValueCents)}
                </p>
              </div>
            </div>
          )}

          {/* By pricing model */}
          {data.byPricingModel.length > 0 && (
            <div className="border-t border-stone-800 pt-3">
              <p className="text-xs font-medium text-stone-500 mb-2">By pricing model</p>
              <div className="space-y-1">
                {data.byPricingModel.map((m) => (
                  <div
                    key={m.model}
                    className="flex justify-between items-center text-xs text-stone-400"
                  >
                    <span className="capitalize">{m.model.replace('_', ' ')}</span>
                    <span className="font-medium">
                      {m.acceptanceRate}% ({m.decided} decided)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
