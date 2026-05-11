// Quote Comparison View - Side-by-side comparison of 2-3 quotes

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireClient } from '@/lib/auth/get-user'
import { getQuotesForComparison, type CompareQuote } from '@/lib/quotes/client-compare-actions'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'

export const metadata: Metadata = { title: 'Compare Quotes' }

const STATUS_DISPLAY: Record<
  string,
  { label: string; variant: 'default' | 'success' | 'warning' | 'error' | 'info' }
> = {
  sent: { label: 'Pending', variant: 'info' },
  accepted: { label: 'Accepted', variant: 'success' },
  rejected: { label: 'Declined', variant: 'error' },
}

function QuoteColumn({
  quote,
  isHighest,
  isLowest,
}: {
  quote: CompareQuote
  isHighest: boolean
  isLowest: boolean
}) {
  const total = quote.effective_total_cents ?? quote.total_quoted_cents ?? 0
  const display = STATUS_DISPLAY[quote.status] ?? STATUS_DISPLAY.sent

  return (
    <Card className="p-5 space-y-4 flex flex-col h-full">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Badge variant={display.variant}>{display.label}</Badge>
          {quote.version > 1 && <Badge variant="default">v{quote.version}</Badge>}
        </div>
        <h3 className="text-lg font-semibold text-stone-100">{quote.quote_name || 'Quote'}</h3>
        {quote.occasion && <p className="text-sm text-stone-400">{quote.occasion}</p>}
        {quote.event_date && (
          <p className="text-sm text-stone-500">
            {format(new Date(quote.event_date), 'MMM d, yyyy')}
          </p>
        )}
        {quote.sent_at && (
          <p className="text-xs text-stone-600">
            Sent {format(new Date(quote.sent_at), 'MMM d, yyyy')}
          </p>
        )}
      </div>

      {/* Pricing model */}
      {quote.pricing_model === 'per_person' && quote.price_per_person_cents && (
        <div className="border-t border-stone-800 pt-3">
          <p className="text-sm text-stone-400">
            {formatCurrency(quote.price_per_person_cents)} per person
            {quote.guest_count_estimated && (
              <span className="text-stone-500"> x {quote.guest_count_estimated} guests</span>
            )}
          </p>
        </div>
      )}

      {/* Line items */}
      {quote.show_cost_breakdown && quote.line_items.length > 0 && (
        <div className="border-t border-stone-800 pt-3 space-y-2 flex-1">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Breakdown</p>
          {quote.line_items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-stone-300">{item.label}</span>
              <span className="text-stone-100">{formatCurrency(item.amount_cents)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Addons */}
      {quote.addons.length > 0 && (
        <div className="border-t border-stone-800 pt-3 space-y-2">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Add-ons</p>
          {quote.addons.map((addon) => (
            <div key={addon.id} className="flex justify-between text-sm">
              <span className="text-stone-300">{addon.label}</span>
              <span className="text-stone-100">
                {formatCurrency(addon.price_cents)}
                {addon.is_per_person && <span className="text-stone-500">/pp</span>}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Exclusions */}
      {quote.exclusions_note && (
        <div className="border-t border-stone-800 pt-3">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Exclusions</p>
          <p className="text-sm text-stone-400 mt-1">{quote.exclusions_note}</p>
        </div>
      )}

      {/* Total */}
      <div className="border-t border-stone-800 pt-3 mt-auto">
        {quote.addon_total_cents != null && quote.addon_total_cents > 0 && (
          <div className="flex justify-between text-sm text-stone-400 mb-1">
            <span>Add-ons total</span>
            <span>{formatCurrency(quote.addon_total_cents)}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-stone-300">Total</span>
          <span
            className={`text-xl font-bold ${
              isLowest ? 'text-green-400' : isHighest ? 'text-stone-100' : 'text-stone-100'
            }`}
          >
            {formatCurrency(total)}
          </span>
        </div>
        {isLowest && <p className="text-xs text-green-500 text-right mt-1">Lowest price</p>}
        {quote.deposit_required && quote.deposit_amount_cents && (
          <p className="text-xs text-stone-500 text-right mt-1">
            Deposit: {formatCurrency(quote.deposit_amount_cents)}
          </p>
        )}
      </div>

      {/* Action */}
      {quote.status === 'sent' && (
        <Link
          href={`/my-quotes/${quote.id}`}
          className="block w-full text-center py-2 px-4 rounded-lg bg-brand-500 text-white font-medium hover:bg-brand-600 transition-colors"
        >
          Review & Accept
        </Link>
      )}
      {quote.status !== 'sent' && (
        <Link
          href={`/my-quotes/${quote.id}`}
          className="block w-full text-center py-2 px-4 rounded-lg border border-stone-700 text-stone-300 hover:border-stone-500 transition-colors"
        >
          View Details
        </Link>
      )}
    </Card>
  )
}

export default async function CompareQuotesPage({
  searchParams,
}: {
  searchParams: { ids?: string }
}) {
  await requireClient()

  const idsParam = searchParams.ids
  if (!idsParam) {
    redirect('/my-quotes')
  }

  const quoteIds = idsParam
    .split(',')
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !isNaN(id))
    .slice(0, 4)

  if (quoteIds.length < 2) {
    redirect('/my-quotes')
  }

  const quotes = await getQuotesForComparison(quoteIds)

  if (quotes.length < 2) {
    redirect('/my-quotes')
  }

  // Determine highest/lowest totals for highlighting
  const totals = quotes.map((q) => q.effective_total_cents ?? q.total_quoted_cents ?? 0)
  const maxTotal = Math.max(...totals)
  const minTotal = Math.min(...totals)
  const hasDifferentTotals = maxTotal !== minTotal

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Compare Quotes</h1>
          <p className="text-stone-400 mt-1">Side-by-side comparison of {quotes.length} quotes</p>
        </div>
        <Link
          href="/my-quotes"
          className="text-sm text-stone-400 hover:text-stone-200 transition-colors"
        >
          &larr; Back to quotes
        </Link>
      </div>

      <div
        className={`grid gap-4 ${
          quotes.length === 2
            ? 'grid-cols-1 md:grid-cols-2'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
        }`}
      >
        {quotes.map((quote) => {
          const total = quote.effective_total_cents ?? quote.total_quoted_cents ?? 0
          return (
            <QuoteColumn
              key={quote.id}
              quote={quote}
              isHighest={hasDifferentTotals && total === maxTotal}
              isLowest={hasDifferentTotals && total === minTotal}
            />
          )
        })}
      </div>

      {/* Summary comparison row */}
      {hasDifferentTotals && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-stone-400">Price difference</span>
            <span className="text-sm font-medium text-stone-100">
              {formatCurrency(maxTotal - minTotal)} between highest and lowest
            </span>
          </div>
        </Card>
      )}
    </div>
  )
}
