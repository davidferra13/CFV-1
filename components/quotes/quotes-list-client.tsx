'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useFilterableList, applyFilters } from '@/lib/shared/use-filterable-list'
import { FilterBar } from '@/components/shared/filterable-list'
import { QuoteStatusBadge, PricingModelBadge } from '@/components/quotes/quote-status-badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import { PriceComparisonSummary } from '@/components/pricing/price-comparison-summary'
import { rowToPriceComparison } from '@/lib/pricing/pricing-decision'
import { NoQuotesIllustration } from '@/components/ui/branded-illustrations'
import type { FilterableListConfig } from '@/lib/shared/use-filterable-list'

// Shape that the server passes down (from getQuotes)
export type QuoteListItem = {
  id: string
  status: string
  quote_name?: string | null
  total_quoted_cents: number | null
  price_per_person_cents?: number | null
  baseline_total_cents?: number | null
  baseline_price_per_person_cents?: number | null
  pricing_source_kind?: string | null
  override_kind?: string | null
  override_reason?: string | null
  pricing_context?: Record<string, unknown> | null
  guest_count_estimated?: number | null
  pricing_model?: string | null
  viewed_at?: string | null
  updated_at: string
  created_at: string
  client?: { id: string; full_name: string; email?: string } | null
  inquiry?: { id: string; confirmed_occasion: string; status: string } | null
}

const QUOTE_FILTER_CONFIG: FilterableListConfig = {
  scopeKey: 'quotes.list',
  dimensions: [
    {
      key: 'status',
      label: 'Status',
      type: 'single-select',
      options: [
        { value: 'all', label: 'All' },
        { value: 'draft', label: 'Draft' },
        { value: 'sent', label: 'Sent' },
        { value: 'viewed', label: 'Viewed' },
        { value: 'accepted', label: 'Accepted' },
        { value: 'rejected', label: 'Rejected' },
        { value: 'expired', label: 'Expired' },
      ],
    },
    {
      key: 'search',
      label: 'Search',
      type: 'text',
      placeholder: 'Search by client name or quote name...',
    },
  ],
  defaultFilters: { status: 'all', search: '' },
  presets: [
    { label: 'Needs Attention', filters: { status: 'sent' } },
    { label: 'In Progress', filters: { status: 'draft' } },
  ],
}

function matchesSearch(quote: QuoteListItem, search: string): boolean {
  const term = search.toLowerCase()
  const clientName = quote.client?.full_name?.toLowerCase() || ''
  const quoteName = quote.quote_name?.toLowerCase() || ''
  const occasion = quote.inquiry?.confirmed_occasion?.toLowerCase() || ''
  return clientName.includes(term) || quoteName.includes(term) || occasion.includes(term)
}

function matchesStatus(quote: QuoteListItem, status: string): boolean {
  if (!status || status === 'all') return true
  if (status === 'viewed') return quote.status === 'sent' && quote.viewed_at != null
  return quote.status === status
}

export function QuotesListClient({
  quotes,
  initialStatus,
}: {
  quotes: QuoteListItem[]
  initialStatus?: string
}) {
  // Override default if initialStatus was provided (from sub-page redirect or searchParam)
  const config = useMemo(() => {
    if (initialStatus && initialStatus !== 'all') {
      return {
        ...QUOTE_FILTER_CONFIG,
        defaultFilters: { status: initialStatus, search: '' },
      }
    }
    return QUOTE_FILTER_CONFIG
  }, [initialStatus])

  const filterState = useFilterableList(config)
  const { filters } = filterState

  // Add counts to options
  const configWithCounts = useMemo(() => {
    const statusCounts: Record<string, number> = { all: quotes.length }
    for (const q of quotes) {
      statusCounts[q.status] = (statusCounts[q.status] || 0) + 1
      if (q.status === 'sent' && q.viewed_at != null) {
        statusCounts['viewed'] = (statusCounts['viewed'] || 0) + 1
      }
    }
    return {
      ...config,
      dimensions: config.dimensions.map((dim) => {
        if (dim.key === 'status' && dim.options) {
          return {
            ...dim,
            options: dim.options.map((opt) => ({
              ...opt,
              count: statusCounts[opt.value] || 0,
            })),
          }
        }
        return dim
      }),
    }
  }, [config, quotes])

  // Update the filterState config to use counts
  const filterStateWithCounts = useMemo(
    () => ({ ...filterState, config: configWithCounts }),
    [filterState, configWithCounts]
  )

  const matchers = useMemo(
    () => ({
      status: (item: QuoteListItem, value: unknown) => matchesStatus(item, value as string),
      search: (item: QuoteListItem, value: unknown) => matchesSearch(item, value as string),
    }),
    []
  )

  const filtered = useMemo(
    () => applyFilters(quotes, filters, matchers),
    [quotes, filters, matchers]
  )

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <FilterBar filterState={filterStateWithCounts} />
      </Card>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center">
          {filterState.activeCount === 0 || (filters.status === 'all' && !filters.search) ? (
            <>
              <div className="flex justify-center mb-4">
                <NoQuotesIllustration className="h-24 w-24" />
              </div>
              <p className="text-stone-500 mb-4">No quotes yet. Create your first quote!</p>
              <Link href="/quotes/new">
                <Button>Create Quote</Button>
              </Link>
            </>
          ) : (
            <>
              <p className="text-stone-500 mb-2">No quotes match the current filters.</p>
              <button
                type="button"
                onClick={filterState.clearFilters}
                className="text-sm text-brand-400 hover:text-brand-300"
              >
                Clear filters
              </button>
            </>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((quote) => (
            <QuoteRow key={quote.id} quote={quote} />
          ))}
        </div>
      )}
    </div>
  )
}

function QuoteRow({ quote }: { quote: QuoteListItem }) {
  const clientName = quote.client?.full_name || 'Unknown Client'
  const isSent = quote.status === 'sent'

  return (
    <Link
      href={`/quotes/${quote.id}`}
      className={`block rounded-lg border p-4 hover:shadow-sm transition-all ${
        isSent
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
          {quote.quote_name && <p className="text-sm text-stone-400 mt-1">{quote.quote_name}</p>}
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
              price_per_person_cents: quote.price_per_person_cents ?? null,
              baseline_total_cents: quote.baseline_total_cents ?? null,
              baseline_price_per_person_cents: quote.baseline_price_per_person_cents ?? null,
              pricing_source_kind: quote.pricing_source_kind ?? null,
              override_kind: quote.override_kind ?? null,
              override_reason: quote.override_reason ?? null,
              pricing_context: quote.pricing_context ?? null,
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
}
