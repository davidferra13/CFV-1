// Client Quote List - View all quotes sent to this client

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'My Quotes' }
import { requireClient } from '@/lib/auth/get-user'
import { getClientQuotes } from '@/lib/quotes/client-actions'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDistanceToNow } from 'date-fns'
import { ActivityTracker } from '@/components/activity/activity-tracker'
import { QuoteExpiryCountdown } from '@/components/quotes/quote-expiry-countdown'

const STATUS_DISPLAY: Record<
  string,
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }
> = {
  sent: { label: 'Pending Review', variant: 'info' },
  accepted: { label: 'Accepted', variant: 'success' },
  rejected: { label: 'Declined', variant: 'error' },
  expired: { label: 'Expired', variant: 'warning' },
}

export default async function ClientQuotesPage() {
  await requireClient()

  let quotes: any[]
  try {
    quotes = await getClientQuotes()
  } catch (err) {
    console.error('[ClientQuotesPage] Failed to load quotes:', err)
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">My Quotes</h1>
          <p className="text-stone-400 mt-1">Review and respond to pricing quotes from your chef</p>
        </div>
        <div className="rounded-xl border border-red-800/50 bg-red-950/30 p-6 text-center">
          <p className="text-sm text-red-400">
            Could not load your quotes. Please refresh the page or try again later.
          </p>
        </div>
      </div>
    )
  }

  const pendingQuotes = quotes.filter((q: any) => q.status === 'sent')
  const resolvedQuotes = quotes.filter((q: any) => q.status !== 'sent')

  return (
    <div className="space-y-6">
      <div data-tour="client-review-quote">
        <h1 className="text-3xl font-bold text-stone-100">My Quotes</h1>
        <p className="text-stone-400 mt-1">Review and respond to pricing quotes from your chef</p>
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
                      {(quote.version as number) > 1 && (
                        <Badge variant="default">Revision {quote.version as number}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-sm text-stone-500">
                        Received{' '}
                        {formatDistanceToNow(new Date(quote.sent_at || quote.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                      {quote.valid_until && (
                        <>
                          <span className="text-stone-700">·</span>
                          <QuoteExpiryCountdown validUntil={quote.valid_until} />
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-stone-100">
                      {formatCurrency(quote.total_quoted_cents)}
                    </p>
                    <p className="text-sm text-brand-500 font-medium">Review &rarr;</p>
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
                        {(quote.version as number) > 1 && (
                          <Badge variant="default">Revision {quote.version as number}</Badge>
                        )}
                        {(quote.is_superseded as boolean) && (
                          <Badge variant="warning">Superseded</Badge>
                        )}
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
