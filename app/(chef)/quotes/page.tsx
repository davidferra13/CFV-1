// Chef Quote Pipeline - List all quotes with status tabs
// Follows the same pattern as inquiries pipeline

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getQuotes } from '@/lib/quotes/actions'
import { getQuoteAcceptanceInsights } from '@/lib/analytics/quote-insights'
import { QuoteAcceptanceInsightsPanel } from '@/components/analytics/quote-acceptance-insights'
import { QuoteIntelligenceBar } from '@/components/intelligence/quote-intelligence-bar'
import { PricingIntelligenceBar } from '@/components/intelligence/pricing-intelligence-bar'

export const metadata: Metadata = { title: 'Quotes' }
import { QuoteStatusBadge, PricingModelBadge } from '@/components/quotes/quote-status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { formatDistanceToNow, format } from 'date-fns'
import { NoQuotesIllustration } from '@/components/ui/branded-illustrations'
import { QuotesFilterTabs } from '@/components/quotes/quotes-filter-tabs'
import { PriceComparisonSummary } from '@/components/pricing/price-comparison-summary'
import { rowToPriceComparison } from '@/lib/pricing/pricing-decision'

type QuoteFilter = 'all' | 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'

async function QuoteList({ filter }: { filter: QuoteFilter }) {
  await requireChef()

  const filterArg = filter === 'all' ? undefined : { status: filter as any }
  const quotes = await getQuotes(filterArg)

  if (quotes.length === 0) {
    return (
      <Card className="p-8 text-center">
        {filter === 'all' && (
          <div className="flex justify-center mb-4">
            <NoQuotesIllustration className="h-24 w-24" />
          </div>
        )}
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
      {quotes.map((quote: any) => {
        const clientName = quote.client?.full_name || 'Unknown Client'

        return (
          <Link
            key={quote.id}
            href={`/quotes/${quote.id}`}
            className={`block rounded-lg border p-4 hover:shadow-sm transition-all ${
              quote.status === 'sent'
                ? 'border-l-4 border-l-brand-500 bg-brand-950/50 hover:bg-brand-950'
                : 'border-stone-700 hover:bg-stone-800'
            }`}
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-stone-100">{clientName}</span>
                  <QuoteStatusBadge status={quote.status as any} />
                  {quote.pricing_model && <PricingModelBadge model={quote.pricing_model as any} />}
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
                <PriceComparisonSummary
                  compact
                  data={rowToPriceComparison({
                    total_quoted_cents: quote.total_quoted_cents,
                    price_per_person_cents: (quote as any).price_per_person_cents ?? null,
                    baseline_total_cents: (quote as any).baseline_total_cents ?? null,
                    baseline_price_per_person_cents:
                      (quote as any).baseline_price_per_person_cents ?? null,
                    pricing_source_kind: (quote as any).pricing_source_kind ?? null,
                    override_kind: (quote as any).override_kind ?? null,
                    override_reason: (quote as any).override_reason ?? null,
                    pricing_context: (quote as any).pricing_context ?? null,
                    guest_count_estimated: quote.guest_count_estimated ?? null,
                  })}
                />
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
  searchParams,
}: {
  searchParams: { status?: QuoteFilter }
}) {
  await requireChef()

  const filter = (searchParams.status || 'all') as QuoteFilter

  // Fetch insights in parallel with page render
  const insights = await getQuoteAcceptanceInsights().catch(() => null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Quotes</h1>
          <p className="text-stone-400 mt-1">Create and track pricing quotes for your clients</p>
        </div>
        <Link href="/quotes/new">
          <Button data-tour="chef-send-quote">+ New Quote</Button>
        </Link>
      </div>

      {/* Quote Intelligence */}
      <WidgetErrorBoundary name="Quote Intelligence" compact>
        <Suspense fallback={null}>
          <QuoteIntelligenceBar />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Pricing Intelligence */}
      <WidgetErrorBoundary name="Pricing Intelligence" compact>
        <Suspense fallback={null}>
          <PricingIntelligenceBar />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Quote Acceptance Insights */}
      {insights && <QuoteAcceptanceInsightsPanel data={insights} />}

      {/* Status Tabs */}
      <Card className="p-4">
        <QuotesFilterTabs initialStatus={filter} />
      </Card>

      {/* Quote List */}
      <Suspense
        fallback={
          <Card className="p-8 text-center">
            <p className="text-stone-500">Loading quotes...</p>
          </Card>
        }
      >
        <QuoteList filter={filter} />
      </Suspense>
    </div>
  )
}
