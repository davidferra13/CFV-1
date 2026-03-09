// Chef Quote Pipeline — List all quotes with status tabs
// Follows the same pattern as inquiries pipeline

import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getQuotes } from '@/lib/quotes/actions'
import { getQuoteAcceptanceInsights } from '@/lib/analytics/quote-insights'
import { QuoteAcceptanceInsightsPanel } from '@/components/analytics/quote-acceptance-insights'
import { QuoteIntelligenceBar } from '@/components/intelligence/quote-intelligence-bar'
import { PricingIntelligenceBar } from '@/components/intelligence/pricing-intelligence-bar'
import { QuotesListClient } from './quotes-list-client'

export const metadata: Metadata = { title: 'Quotes - ChefFlow' }
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { QuotesFilterTabs } from '@/components/quotes/quotes-filter-tabs'

type QuoteFilter = 'all' | 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: { status?: QuoteFilter }
}) {
  await requireChef()

  const filter = (searchParams.status || 'all') as QuoteFilter
  const filterArg = filter === 'all' ? undefined : { status: filter as any }

  // Fetch insights in parallel with page render
  const [insights, quotes] = await Promise.all([
    getQuoteAcceptanceInsights().catch(() => null),
    getQuotes(filterArg),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-stone-100">Quotes</h1>
          <p className="text-stone-400 mt-1">Create and track quotes for your clients</p>
        </div>
        <Link href="/quotes/new">
          <Button className="min-h-[44px]">+ New Quote</Button>
        </Link>
      </div>

      {/* Quote Intelligence */}
      <Suspense fallback={null}>
        <QuoteIntelligenceBar />
      </Suspense>

      {/* Pricing Intelligence */}
      <Suspense fallback={null}>
        <PricingIntelligenceBar />
      </Suspense>

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
        <QuotesListClient quotes={quotes as any} initialStatus={filter} />
      </Suspense>
    </div>
  )
}
