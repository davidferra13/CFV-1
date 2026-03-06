// Expiring Quotes Widget
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import type { ExpiringQuote } from '@/lib/dashboard/widget-actions'

interface Props {
  quotes: ExpiringQuote[]
}

export function ExpiringQuotesWidget({ quotes }: Props) {
  if (quotes.length === 0) return null

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-stone-100">Expiring Quotes</h3>
        <span className="text-xs text-stone-400">{quotes.length} expiring soon</span>
      </div>
      <div className="space-y-2">
        {quotes.map((q) => {
          const urgency = q.daysLeft <= 2 ? 'text-red-500' : 'text-amber-500'
          return (
            <Link
              key={q.quoteId}
              href={`/events/${q.eventId}`}
              className="flex items-center justify-between hover:bg-stone-800 rounded-md px-1 py-1.5 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-100 truncate">{q.occasion}</p>
                <p className="text-xs text-stone-500">
                  {q.clientName} · {formatCurrency(q.totalCents)}
                </p>
              </div>
              <span className={`text-xs font-semibold shrink-0 ml-3 ${urgency}`}>
                {q.daysLeft === 0 ? 'Today' : q.daysLeft === 1 ? '1 day' : `${q.daysLeft} days`}
              </span>
            </Link>
          )
        })}
      </div>
      <p className="text-xs text-stone-400 mt-3">Follow up before these quotes expire</p>
    </Card>
  )
}
