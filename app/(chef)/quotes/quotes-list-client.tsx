'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { NoQuotesIllustration } from '@/components/ui/branded-illustrations'
import { QuoteStatusBadge, PricingModelBadge } from '@/components/quotes/quote-status-badge'
import { formatCurrency } from '@/lib/utils/currency'
import { usePersistentViewState } from '@/lib/view-state/use-persistent-view-state'

type QuoteFilter = 'all' | 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'

type QuoteRecord = {
  id: string
  status: QuoteFilter
  quote_name: string | null
  pricing_model: string | null
  total_quoted_cents: number
  price_per_person_cents: number | null
  guest_count_estimated: number | null
  updated_at: string
  valid_until: string | null
  client: {
    id: string
    full_name: string
    email: string
  } | null
  inquiry: {
    id: string
    confirmed_occasion: string | null
    status: string
  } | null
}

type Props = {
  quotes: QuoteRecord[]
  initialStatus: QuoteFilter
}

function parseCurrencyInput(value: string): number | null {
  if (!value.trim()) return null
  const normalized = value.replace(/[$,\s]/g, '')
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.round(parsed * 100)
}

function isWithinDateRange(dateValue: string, from: string, to: string) {
  const isoDate = format(new Date(dateValue), 'yyyy-MM-dd')
  if (from && isoDate < from) return false
  if (to && isoDate > to) return false
  return true
}

export function QuotesListClient({ quotes, initialStatus }: Props) {
  const { state, setState, reset } = usePersistentViewState('quotes.list', {
    strategy: 'url',
    defaults: {
      status: initialStatus,
      search: '',
      minAmount: '',
      maxAmount: '',
      updatedFrom: '',
      updatedTo: '',
    },
  })

  const filteredQuotes = useMemo(() => {
    const search = String(state.search || '')
      .trim()
      .toLowerCase()
    const minAmountCents = parseCurrencyInput(String(state.minAmount || ''))
    const maxAmountCents = parseCurrencyInput(String(state.maxAmount || ''))
    const updatedFrom = String(state.updatedFrom || '')
    const updatedTo = String(state.updatedTo || '')

    return quotes.filter((quote) => {
      if (search) {
        const haystack = [
          quote.client?.full_name,
          quote.client?.email,
          quote.quote_name,
          quote.inquiry?.confirmed_occasion,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        if (!haystack.includes(search)) {
          return false
        }
      }

      if (minAmountCents !== null && quote.total_quoted_cents < minAmountCents) {
        return false
      }

      if (maxAmountCents !== null && quote.total_quoted_cents > maxAmountCents) {
        return false
      }

      if (!isWithinDateRange(quote.updated_at, updatedFrom, updatedTo)) {
        return false
      }

      return true
    })
  }, [quotes, state.maxAmount, state.minAmount, state.search, state.updatedFrom, state.updatedTo])

  const hasActiveFilters = Boolean(
    state.search || state.minAmount || state.maxAmount || state.updatedFrom || state.updatedTo
  )

  if (quotes.length === 0) {
    return (
      <Card className="p-8 text-center">
        {initialStatus === 'all' && (
          <div className="mb-4 flex justify-center">
            <NoQuotesIllustration className="h-24 w-24" />
          </div>
        )}
        <p className="mb-4 text-stone-500">
          {initialStatus === 'all'
            ? 'No quotes yet. Create your first quote.'
            : `No quotes with status "${initialStatus}"`}
        </p>
        {initialStatus === 'all' && (
          <Link href="/quotes/new">
            <Button>Create Quote</Button>
          </Link>
        )}
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="xl:col-span-2">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-stone-500">
              Search
            </label>
            <Input
              type="search"
              value={String(state.search || '')}
              onChange={(event) => setState({ search: event.target.value })}
              placeholder="Client, email, quote name, or occasion"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-stone-500">
              Min Amount
            </label>
            <Input
              inputMode="decimal"
              value={String(state.minAmount || '')}
              onChange={(event) => setState({ minAmount: event.target.value })}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-stone-500">
              Max Amount
            </label>
            <Input
              inputMode="decimal"
              value={String(state.maxAmount || '')}
              onChange={(event) => setState({ maxAmount: event.target.value })}
              placeholder="5000.00"
            />
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              variant="ghost"
              size="md"
              className="min-h-[44px] w-full"
              onClick={() => reset()}
              disabled={!hasActiveFilters}
            >
              Clear Filters
            </Button>
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:max-w-[420px]">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-stone-500">
              Updated From
            </label>
            <Input
              type="date"
              value={String(state.updatedFrom || '')}
              onChange={(event) => setState({ updatedFrom: event.target.value })}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-stone-500">
              Updated To
            </label>
            <Input
              type="date"
              value={String(state.updatedTo || '')}
              onChange={(event) => setState({ updatedTo: event.target.value })}
            />
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-stone-400">
          Showing {filteredQuotes.length} of {quotes.length} quotes
        </p>
      </div>

      {filteredQuotes.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-medium text-stone-300">No quotes match the current filters.</p>
          <p className="mt-1 text-sm text-stone-500">
            Try widening the amount range or clearing the search terms.
          </p>
          <div className="mt-4">
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="min-h-[44px]"
              onClick={() => reset()}
            >
              Reset Filters
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredQuotes.map((quote) => {
            const clientName = quote.client?.full_name || 'Unknown Client'

            return (
              <Link
                key={quote.id}
                href={`/quotes/${quote.id}`}
                className={`block rounded-lg border p-4 transition-all hover:shadow-sm ${
                  quote.status === 'sent'
                    ? 'border-l-4 border-l-brand-500 bg-brand-950/50 hover:bg-brand-950'
                    : 'border-stone-700 hover:bg-stone-800'
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-stone-100">{clientName}</span>
                      <QuoteStatusBadge status={quote.status as any} />
                      {quote.pricing_model && (
                        <PricingModelBadge model={quote.pricing_model as any} />
                      )}
                    </div>
                    {quote.quote_name && (
                      <p className="mt-1 text-sm text-stone-400">{quote.quote_name}</p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
                      {quote.inquiry?.confirmed_occasion && (
                        <span>Occasion: {quote.inquiry.confirmed_occasion}</span>
                      )}
                      <span>Updated: {format(new Date(quote.updated_at), 'MMM d, yyyy')}</span>
                      {quote.valid_until && (
                        <span>
                          Valid until: {format(new Date(quote.valid_until), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-left md:text-right">
                    <p className="text-lg font-semibold text-stone-100">
                      {formatCurrency(quote.total_quoted_cents)}
                    </p>
                    {quote.price_per_person_cents && quote.guest_count_estimated && (
                      <p className="text-xs text-stone-500">
                        {formatCurrency(quote.price_per_person_cents)}/person x{' '}
                        {quote.guest_count_estimated}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-stone-400">
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
