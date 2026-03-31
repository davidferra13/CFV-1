import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getQuotes } from '@/lib/quotes/actions'
import { QuoteStatusBadge, PricingModelBadge } from '@/components/quotes/quote-status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDistanceToNow } from 'date-fns'

export const metadata: Metadata = { title: 'Draft Quotes' }

export default async function DraftQuotesPage() {
  await requireChef()

  const quotes = await getQuotes({ status: 'draft' } as any)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/quotes" className="text-sm text-stone-500 hover:text-stone-300">
          ← All Quotes
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Draft Quotes</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {quotes.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">Quotes in progress, not yet sent to the client</p>
      </div>

      {quotes.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium mb-1">No draft quotes</p>
          <p className="text-stone-400 text-sm mb-4">
            Quotes you&apos;re working on will appear here
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/quotes/new">
              <Button size="sm">+ New Quote</Button>
            </Link>
            <Link href="/quotes">
              <Button variant="secondary" size="sm">
                View All Quotes
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {quotes.map((quote: any) => {
            const clientName = quote.client?.full_name || 'Unknown Client'
            return (
              <Link
                key={quote.id}
                href={`/quotes/${quote.id}`}
                className="block rounded-lg border border-stone-700 p-4 hover:shadow-sm transition-all hover:bg-stone-800"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-stone-100">{clientName}</span>
                      <QuoteStatusBadge status={quote.status as any} />
                      {quote.pricing_model && (
                        <PricingModelBadge model={quote.pricing_model as any} />
                      )}
                    </div>
                    {quote.quote_name && (
                      <p className="text-sm text-stone-400 mt-1">{quote.quote_name}</p>
                    )}
                    {quote.inquiry?.confirmed_occasion && (
                      <p className="text-xs text-stone-500 mt-1">
                        Inquiry: {quote.inquiry.confirmed_occasion}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-semibold text-stone-100">
                      {formatCurrency(quote.total_quoted_cents)}
                    </p>
                    {quote.price_per_person_cents && quote.guest_count_estimated && (
                      <p className="text-xs text-stone-500">
                        {formatCurrency(quote.price_per_person_cents)}/person x{' '}
                        {quote.guest_count_estimated}
                      </p>
                    )}
                    <p className="text-xs text-stone-400 mt-1">
                      {formatDistanceToNow(new Date(quote.updated_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
