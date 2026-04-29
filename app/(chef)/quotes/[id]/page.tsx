// Quote Detail Page - Full view of a single quote with transitions

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getQuoteById, getQuoteVersionHistory } from '@/lib/quotes/actions'
import { safeFetchAll } from '@/lib/utils/safe-fetch'
import { ErrorState } from '@/components/ui/error-state'
import { QuoteStatusBadge, PricingModelBadge } from '@/components/quotes/quote-status-badge'
import { QuoteVersionHistory } from '@/components/quotes/quote-version-history'
import { QuoteTransitions } from '@/components/quotes/quote-transitions'
import { EntityActivityTimeline } from '@/components/activity/entity-activity-timeline'
import { getEntityActivityTimeline } from '@/lib/activity/entity-timeline'
import { PricingInsightsSidebar } from '@/components/quotes/pricing-insights-sidebar'
import { ClientSpendingBadge } from '@/components/quotes/client-spending-badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { format, formatDistanceToNow } from 'date-fns'
import { PriceComparisonSummary } from '@/components/pricing/price-comparison-summary'
import { rowToPriceComparison } from '@/lib/pricing/pricing-decision'
import { PaymentStructureSummary } from '@/components/quotes/payment-structure-summary'
import { readPaymentStructure } from '@/lib/payments/payment-structure'
import { QuotePriceConfidenceWarning } from '@/components/quotes/quote-price-confidence-warning'
import { QuotePriceFreshnessWarning } from '@/components/quotes/quote-price-freshness-warning'
import { Suspense } from 'react'

function buildCreateEventHref(quote: any) {
  const params = new URLSearchParams()
  if (quote.client_id) params.set('client_id', quote.client_id)
  const occasion = quote.inquiry?.confirmed_occasion || quote.quote_name
  if (occasion) params.set('occasion', occasion)
  if (quote.guest_count_estimated) params.set('guest_count', String(quote.guest_count_estimated))
  if (quote.total_quoted_cents) {
    params.set('quoted_price', (quote.total_quoted_cents / 100).toFixed(2))
  }

  const query = params.toString()
  return query ? `/events/new?${query}` : '/events/new'
}

export default async function QuoteDetailPage({ params }: { params: { id: string } }) {
  const user = await requireChef()

  const result = await safeFetchAll({
    quote: () => getQuoteById(params.id),
    versionHistory: () => getQuoteVersionHistory(params.id),
    timelineEntries: () => getEntityActivityTimeline('quote', params.id),
  })

  if (result.error) {
    return (
      <div className="space-y-6">
        <Link href="/quotes">
          <Button variant="ghost">Back to Quotes</Button>
        </Link>
        <ErrorState title="Could not load quote" description={result.error} />
      </div>
    )
  }

  if (!result.data) {
    notFound()
  }

  const { quote, versionHistory, timelineEntries } = result.data
  const paymentStructure = readPaymentStructure((quote as any).pricing_context ?? null)

  if (!quote) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-stone-100">
              {quote.quote_name || `Quote for ${quote.client?.full_name || 'Unknown'}`}
            </h1>
            <QuoteStatusBadge status={quote.status as any} />
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <p className="text-stone-300">
              {quote.client?.full_name || 'Unknown Client'}
              {quote.client?.email && ` - ${quote.client.email}`}
            </p>
            <ClientSpendingBadge
              clientId={(quote as any).client_id ?? null}
              tenantId={user.tenantId!}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href={`/api/documents/quote/${quote.id}`} target="_blank" prefetch={false}>
            <Button variant="secondary">Download PDF</Button>
          </Link>
          <Link href="/quotes">
            <Button variant="ghost">Back to Quotes</Button>
          </Link>
        </div>
      </div>

      {/* Frozen Snapshot Notice */}
      {quote.snapshot_frozen && (
        <div className="bg-green-950 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-800">
            Pricing snapshot frozen at acceptance. Original pricing is preserved.
          </p>
        </div>
      )}

      {/* Price confidence warning - shown when event's menu has incomplete recipe costs */}
      {(quote as any).event?.id && (
        <Suspense fallback={null}>
          <QuotePriceConfidenceWarning eventId={(quote as any).event.id} />
        </Suspense>
      )}

      {/* Price freshness warning - shown when ingredient prices are stale or missing */}
      {(quote as any).event?.id && (
        <Suspense fallback={null}>
          <QuotePriceFreshnessWarning eventId={(quote as any).event.id} />
        </Suspense>
      )}

      {/* Version History */}
      <QuoteVersionHistory
        currentQuoteId={params.id}
        versions={versionHistory}
        isSuperseded={(quote as any).is_superseded ?? false}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pricing + Deposit (left two columns) */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pricing */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Pricing</h2>
            <div className="mb-4">
              <PriceComparisonSummary
                showPerPerson
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
            </div>
            <dl className="space-y-3">
              {quote.pricing_model && (
                <div>
                  <dt className="text-sm font-medium text-stone-500">Pricing Model</dt>
                  <dd className="mt-1">
                    <PricingModelBadge model={quote.pricing_model as any} />
                  </dd>
                </div>
              )}
              {quote.guest_count_estimated && (
                <div>
                  <dt className="text-sm font-medium text-stone-500">Estimated Guests</dt>
                  <dd className="text-sm text-stone-100 mt-1">{quote.guest_count_estimated}</dd>
                </div>
              )}
            </dl>
          </Card>

          {/* Deposit & Validity */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Deposit & Validity</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-stone-500">Deposit Required</dt>
                <dd className="text-sm mt-1">
                  {quote.deposit_required ? (
                    <span className="text-stone-100">
                      Yes -{' '}
                      {quote.deposit_amount_cents
                        ? formatCurrency(quote.deposit_amount_cents)
                        : 'Amount TBD'}
                      {quote.deposit_percentage && ` (${quote.deposit_percentage}%)`}
                    </span>
                  ) : (
                    <span className="text-stone-300">No deposit required</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-stone-500">Valid Until</dt>
                <dd className="text-sm mt-1">
                  {quote.valid_until ? (
                    <span className="text-stone-100">
                      {format(new Date(quote.valid_until), 'MMMM d, yyyy')}
                      {new Date(quote.valid_until) < new Date() && (
                        <Badge variant="warning" className="ml-2">
                          Expired
                        </Badge>
                      )}
                    </span>
                  ) : (
                    <span className="text-stone-300">No expiration set</span>
                  )}
                </dd>
              </div>
              {quote.sent_at && (
                <div>
                  <dt className="text-sm font-medium text-stone-500">Sent At</dt>
                  <dd className="text-sm text-stone-100 mt-1">
                    {format(new Date(quote.sent_at), "MMM d, yyyy 'at' h:mm a")}
                  </dd>
                </div>
              )}
              {quote.accepted_at && (
                <div>
                  <dt className="text-sm font-medium text-stone-500">Accepted At</dt>
                  <dd className="text-sm text-green-700 mt-1">
                    {format(new Date(quote.accepted_at), "MMM d, yyyy 'at' h:mm a")}
                  </dd>
                </div>
              )}
              {quote.rejected_at && (
                <div>
                  <dt className="text-sm font-medium text-stone-500">Rejected At</dt>
                  <dd className="text-sm text-red-700 mt-1">
                    {format(new Date(quote.rejected_at), "MMM d, yyyy 'at' h:mm a")}
                  </dd>
                </div>
              )}
            </dl>
            {paymentStructure ? (
              <div className="mt-4">
                <PaymentStructureSummary structure={paymentStructure} compact />
              </div>
            ) : null}
          </Card>
        </div>

        {/* Pricing Insights Sidebar (right column) */}
        <div className="lg:col-span-1">
          <PricingInsightsSidebar
            eventType={quote.event?.occasion || quote.inquiry?.confirmed_occasion || undefined}
            guestCountRange={
              quote.guest_count_estimated
                ? [Math.max(1, quote.guest_count_estimated - 10), quote.guest_count_estimated + 10]
                : undefined
            }
          />
        </div>
      </div>

      {/* Linked Resources */}
      {(quote.inquiry ||
        quote.event ||
        (quote.status === 'accepted' && !(quote as any).event_id)) && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Linked Resources</h2>
          <div className="flex flex-wrap gap-4">
            {quote.inquiry && (
              <Link href={`/inquiries/${quote.inquiry.id}`}>
                <div className="border rounded-lg p-3 hover:bg-stone-800 transition-colors">
                  <p className="text-sm font-medium text-stone-100">Inquiry</p>
                  <p className="text-sm text-stone-300">
                    {quote.inquiry.confirmed_occasion || 'Untitled'} - {quote.inquiry.status}
                  </p>
                </div>
              </Link>
            )}
            {quote.event && (
              <Link href={`/events/${quote.event.id}`}>
                <div className="border rounded-lg p-3 hover:bg-stone-800 transition-colors">
                  <p className="text-sm font-medium text-stone-100">Event</p>
                  <p className="text-sm text-stone-300">
                    {quote.event.occasion || 'Untitled'}
                    {quote.event.event_date &&
                      ` - ${format(new Date(quote.event.event_date), 'MMM d, yyyy')}`}
                  </p>
                </div>
              </Link>
            )}
            {quote.status === 'accepted' && !quote.event && !(quote as any).event_id && (
              <Link href={buildCreateEventHref(quote)}>
                <div className="border rounded-lg p-3 hover:bg-stone-800 transition-colors">
                  <p className="text-sm font-medium text-stone-100">Create Event</p>
                  <p className="text-sm text-stone-300">
                    Start with this quote&apos;s client, guest count, and price.
                  </p>
                </div>
              </Link>
            )}
          </div>
        </Card>
      )}

      {/* Actions (Transitions) */}
      <QuoteTransitions quote={quote} />

      <EntityActivityTimeline entityType="quote" entityId={quote.id} entries={timelineEntries} />

      {/* Notes */}
      {quote.pricing_notes && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Pricing Notes</h2>
          <p className="text-sm text-stone-300 whitespace-pre-wrap">{quote.pricing_notes}</p>
          <p className="text-xs text-stone-300 mt-2">Visible to client when quote is sent</p>
        </Card>
      )}

      {quote.internal_notes && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Internal Notes</h2>
          <p className="text-sm text-stone-300 whitespace-pre-wrap">{quote.internal_notes}</p>
          <p className="text-xs text-stone-300 mt-2">Chef eyes only - not visible to client</p>
        </Card>
      )}

      {/* Rejection Reason */}
      {quote.rejected_reason && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Rejection Reason</h2>
          <p className="text-sm text-red-700 whitespace-pre-wrap">{quote.rejected_reason}</p>
        </Card>
      )}

      {/* Status History */}
      {quote.transitions.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Status History</h2>
          <div className="space-y-3">
            {quote.transitions.map((transition: any) => (
              <div key={transition.id} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-brand-500" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {transition.from_status && (
                      <>
                        <span className="text-sm font-medium text-stone-100 capitalize">
                          {(transition.from_status as string).replace('_', ' ')}
                        </span>
                        <span className="text-stone-300">&rarr;</span>
                      </>
                    )}
                    <span className="text-sm font-medium text-stone-100 capitalize">
                      {(transition.to_status as string).replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    {format(new Date(transition.transitioned_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Metadata */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-3 text-stone-500">Metadata</h2>
        <dl className="grid grid-cols-2 gap-3 text-xs text-stone-300">
          <div>
            <dt className="font-medium">Created</dt>
            <dd>{format(new Date(quote.created_at), "MMM d, yyyy 'at' h:mm a")}</dd>
          </div>
          <div>
            <dt className="font-medium">Last Updated</dt>
            <dd>{format(new Date(quote.updated_at), "MMM d, yyyy 'at' h:mm a")}</dd>
          </div>
          <div>
            <dt className="font-medium">Quote ID</dt>
            <dd className="font-mono">{quote.id.slice(0, 8)}...</dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
