// Chef Quote Pipeline - Server-side FTS search, pagination, and status filtering
// Replaces client-side-only filtering with proper server queries

import type { Metadata } from 'next'
import { Suspense } from 'react'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getQuotesPaginated } from '@/lib/quotes/actions'
import { getQuoteAcceptanceInsights } from '@/lib/analytics/quote-insights'
import { QuoteAcceptanceInsightsPanel } from '@/components/analytics/quote-acceptance-insights'
import { QuoteIntelligenceBar } from '@/components/intelligence/quote-intelligence-bar'
import { PricingIntelligenceBar } from '@/components/intelligence/pricing-intelligence-bar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { QuotesListClient, type QuoteListItem } from '@/components/quotes/quotes-list-client'
import { safeFetch } from '@/lib/utils/safe-fetch'
import { ErrorState } from '@/components/ui/error-state'
import { SkeletonTable } from '@/components/ui/skeleton'

export const metadata: Metadata = { title: 'Quotes' }

const PAGE_SIZE = 50

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'expired', label: 'Expired' },
]

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireChef()
  const params = await searchParams

  const search = typeof params.q === 'string' ? params.q.trim() : ''
  const status = typeof params.status === 'string' ? params.status : 'all'
  const page = Math.max(1, parseInt(typeof params.page === 'string' ? params.page : '1', 10) || 1)

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
        <div className="flex gap-2">
          <a
            href="/quotes/csv-export"
            className="inline-flex items-center justify-center px-3 py-2 border border-stone-600 text-stone-300 rounded-lg hover:bg-stone-800 transition-colors font-medium text-sm"
          >
            Export CSV
          </a>
          <Link href="/quotes/new">
            <Button data-tour="chef-send-quote">+ New Quote</Button>
          </Link>
        </div>
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

      {/* Server-filtered quote list */}
      <WidgetErrorBoundary name="Quote List">
        <Suspense
          fallback={
            <Card className="p-8 text-center">
              <SkeletonTable rows={5} />
            </Card>
          }
        >
          <QuoteListContent search={search} status={status} page={page} />
        </Suspense>
      </WidgetErrorBoundary>
    </div>
  )
}

async function QuoteListContent({
  search,
  status,
  page,
}: {
  search: string
  status: string
  page: number
}) {
  const result = await safeFetch(() =>
    getQuotesPaginated({ search: search || undefined, status, page, pageSize: PAGE_SIZE })
  )

  if (result.error || !result.data) {
    return (
      <ErrorState
        title="Could not load quotes"
        description={result.error ?? 'Quote data was unavailable.'}
      />
    )
  }

  const { items, total } = result.data
  const quotes = items as QuoteListItem[]
  const offset = (page - 1) * PAGE_SIZE

  const buildUrl = (overrides: { page?: number; status?: string; q?: string }) => {
    const p = new URLSearchParams()
    const nextQ = overrides.q ?? search
    const nextStatus = overrides.status ?? status
    const nextPage = overrides.page ?? page
    if (nextQ) p.set('q', nextQ)
    if (nextStatus && nextStatus !== 'all') p.set('status', nextStatus)
    if (nextPage > 1) p.set('page', String(nextPage))
    const qs = p.toString()
    return `/quotes${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="space-y-4">
      {/* Search + Status filter bar */}
      <Card className="p-4">
        <form action="/quotes" method="get" className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Search quotes by client, name, occasion..."
            className="w-full max-w-sm rounded-lg border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-500 focus:border-brand-500 focus:outline-none"
          />
          {/* Hidden field preserves status when search form submits */}
          {status !== 'all' && <input type="hidden" name="status" value={status} />}
          <button
            type="submit"
            className="rounded-lg bg-stone-800 px-3 py-2 text-sm text-stone-200 hover:bg-stone-700"
          >
            Search
          </button>
          {(search || status !== 'all') && (
            <Link href="/quotes" className="text-sm text-stone-500 hover:text-stone-300">
              Clear
            </Link>
          )}
        </form>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {STATUS_OPTIONS.map((opt) => {
            const isActive = status === opt.value
            return (
              <Link
                key={opt.value}
                href={buildUrl({ status: opt.value, page: 1 })}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'bg-stone-800 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
                }`}
              >
                {opt.label}
              </Link>
            )
          })}
        </div>
      </Card>

      {/* Quote list (client component renders rows, no more client-side filtering) */}
      <QuotesListClient quotes={quotes} initialStatus="all" />

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex items-center justify-between border-t border-stone-800 pt-3">
          <p className="text-xs text-stone-500">
            Showing {offset + 1}-{Math.min(offset + PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildUrl({ page: page - 1 })}
                className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-700"
              >
                Previous
              </Link>
            )}
            {offset + PAGE_SIZE < total && (
              <Link
                href={buildUrl({ page: page + 1 })}
                className="rounded-lg bg-stone-800 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-700"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
