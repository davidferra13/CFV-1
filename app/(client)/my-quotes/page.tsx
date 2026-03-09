// Client Quote List — View all quotes sent to this client

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'My Quotes - ChefFlow' }
import { requireClient } from '@/lib/auth/get-user'
import { getClientQuotes } from '@/lib/quotes/client-actions'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDistanceToNow } from 'date-fns'
import { ActivityTracker } from '@/components/activity/activity-tracker'

const STATUS_DISPLAY: Record<
  string,
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }
> = {
  sent: { label: 'Pending Review', variant: 'info' },
  accepted: { label: 'Accepted', variant: 'success' },
  rejected: { label: 'Declined', variant: 'error' },
}

export default async function ClientQuotesPage() {
  await requireClient()

  const quotes = await getClientQuotes()

  const pendingQuotes = quotes.filter((q: any) => q.status === 'sent')
  const resolvedQuotes = quotes.filter((q: any) => q.status !== 'sent')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">My Quotes</h1>
        <p className="text-stone-400 mt-1">Review and respond to quotes from your chef</p>
      </div>

      {/* Pending Quotes (action needed) */}
      {pendingQuotes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-100">Action Needed</h2>
          {pendingQuotes.map((quote: any) => (
            <Link key={quote.id} href={`/my-quotes/${quote.id}`}>
              <Card className="p-4 border-l-4 border-l-brand-500 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-stone-100">
                        {quote.quote_name || (quote.inquiry as any)?.confirmed_occasion || 'Quote'}
                      </span>
                      <Badge variant="info">Pending Review</Badge>
                    </div>
                    <p className="text-sm text-stone-500 mt-1">
                      Received{' '}
                      {formatDistanceToNow(new Date(quote.sent_at || quote.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-stone-100">
                      {formatCurrency(quote.total_quoted_cents)}
                    </p>
                    <p className="text-sm text-brand-600 font-medium">Review &rarr;</p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* No pending quotes */}
      {pendingQuotes.length === 0 && resolvedQuotes.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-stone-500">
            No quotes yet. Your chef will send you quotes when ready.
          </p>
        </Card>
      )}

      {/* Resolved Quotes */}
      {resolvedQuotes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-stone-500">Previous Quotes</h2>
          {resolvedQuotes.map((quote: any) => {
            const display = STATUS_DISPLAY[quote.status] || STATUS_DISPLAY.sent

            return (
              <Link key={quote.id} href={`/my-quotes/${quote.id}`}>
                <Card className="p-4 hover:shadow-sm transition-shadow cursor-pointer">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-stone-100">
                          {quote.quote_name ||
                            (quote.inquiry as any)?.confirmed_occasion ||
                            'Quote'}
                        </span>
                        <Badge variant={display.variant}>{display.label}</Badge>
                      </div>
                    </div>
                    <p className="text-lg font-semibold text-stone-100">
                      {formatCurrency(quote.total_quoted_cents)}
                    </p>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      <ActivityTracker eventType="quotes_list_viewed" metadata={{ quote_count: quotes.length }} />
    </div>
  )
}
