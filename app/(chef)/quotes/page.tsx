// Chef Quote Pipeline - List all quotes with URL-synced filters
// Uses the shared FilterableList pattern instead of status-as-page anti-pattern

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
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { QuotesListClient, type QuoteListItem } from '@/components/quotes/quotes-list-client'

export const metadata: Metadata = { title: 'Quotes' }

async function QuoteListWithFilters({ initialStatus }: { initialStatus: string }) {
  await requireChef()

  // Fetch ALL quotes; filtering happens client-side via FilterableList
  const quotes = (await getQuotes()) as QuoteListItem[]

  return <QuotesListClient quotes={quotes} initialStatus={initialStatus} />
}

export default async function QuotesPage({ searchParams }: { searchParams: { status?: string } }) {
  await requireChef()

  const initialStatus = searchParams.status || 'all'

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

      {/* Intelligence panels (collapsed by default to reduce cognitive load) */}
      <details className="group">
        <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium text-stone-400 hover:text-stone-200 transition-colors select-none list-none [&::-webkit-details-marker]:hidden">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform group-open:rotate-90"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
          Quote Insights
        </summary>
        <div className="mt-3 space-y-4">
          <WidgetErrorBoundary name="Quote Intelligence" compact>
            <Suspense fallback={null}>
              <QuoteIntelligenceBar />
            </Suspense>
          </WidgetErrorBoundary>
          <WidgetErrorBoundary name="Pricing Intelligence" compact>
            <Suspense fallback={null}>
              <PricingIntelligenceBar />
            </Suspense>
          </WidgetErrorBoundary>
          {insights && <QuoteAcceptanceInsightsPanel data={insights} />}
        </div>
      </details>

      {/* Filterable quote list */}
      <WidgetErrorBoundary name="Quote List">
        <Suspense
          fallback={
            <Card className="p-8 text-center">
              <p className="text-stone-500">Loading quotes...</p>
            </Card>
          }
        >
          <QuoteListWithFilters initialStatus={initialStatus} />
        </Suspense>
      </WidgetErrorBoundary>
    </div>
  )
}
