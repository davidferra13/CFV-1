// Chef Quote Pipeline — List all quotes with status tabs
// Follows the same pattern as inquiries pipeline

import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getQuotes } from '@/lib/quotes/actions'

export const metadata: Metadata = { title: 'Quotes - ChefFlow' }
import { QuoteStatusBadge, PricingModelBadge } from '@/components/quotes/quote-status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDistanceToNow, format } from 'date-fns'

type QuoteFilter = 'all' | 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'

async function QuoteList({ filter }: { filter: QuoteFilter }) {
  await requireChef()

  const filterArg = filter === 'all' ? undefined : { status: filter as any }
  const quotes = await getQuotes(filterArg)

  if (quotes.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-stone-500 mb-4">
          {filter === 'all'
            ? 'No quotes yet. Create your first quote!'
            : `No quotes with status "${filter}"`}
        </p>
        {filter === 'all' && (
          <Link href="/quotes/new">
            <Button>Create Quote</Button>
          </Link>
        )}
      </Card>
    )
  }

  return (
    <div className="space-y-2">
      {quotes.map((quote) => {
        const clientName = quote.client?.full_name || 'Unknown Client'

        return (
          <Link
            key={quote.id}
            href={`/quotes/${quote.id}`}
            className={`block rounded-lg border p-4 hover:shadow-sm transition-all ${
              quote.status === 'sent'
                ? 'border-l-4 border-l-brand-500 bg-brand-50/50 hover:bg-brand-50'
                : 'border-stone-200 hover:bg-stone-50'
            }`}
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-stone-900">{clientName}</span>
                  <QuoteStatusBadge status={quote.status as any} />
                  {quote.pricing_model && (
                    <PricingModelBadge model={quote.pricing_model as any} />
                  )}
                </div>
                {quote.quote_name && (
                  <p className="text-sm text-stone-600 mt-1">{quote.quote_name}</p>
                )}
                {quote.inquiry?.confirmed_occasion && (
                  <p className="text-xs text-stone-500 mt-1">
                    Inquiry: {quote.inquiry.confirmed_occasion}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-semibold text-stone-900">
                  {formatCurrency(quote.total_quoted_cents)}
                </p>
                {quote.price_per_person_cents && quote.guest_count_estimated && (
                  <p className="text-xs text-stone-500">
                    {formatCurrency(quote.price_per_person_cents)}/person x {quote.guest_count_estimated}
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
  )
}

export default async function QuotesPage({
  searchParams
}: {
  searchParams: { status?: QuoteFilter }
}) {
  await requireChef()

  const filter = (searchParams.status || 'all') as QuoteFilter

  const tabs: { value: QuoteFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'expired', label: 'Expired' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Quotes</h1>
          <p className="text-stone-600 mt-1">Create and track pricing quotes for your clients</p>
        </div>
        <Link href="/quotes/new">
          <Button>+ New Quote</Button>
        </Link>
      </div>

      {/* Status Tabs */}
      <Card className="p-4">
        <div className="flex gap-2 flex-wrap">
          {tabs.map((tab) => (
            <Link key={tab.value} href={`/quotes?status=${tab.value}`}>
              <Button
                size="sm"
                variant={filter === tab.value ? 'primary' : 'secondary'}
              >
                {tab.label}
              </Button>
            </Link>
          ))}
        </div>
      </Card>

      {/* Quote List */}
      <Suspense fallback={
        <Card className="p-8 text-center">
          <p className="text-stone-500">Loading quotes...</p>
        </Card>
      }>
        <QuoteList filter={filter} />
      </Suspense>
    </div>
  )
}
