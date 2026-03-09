// Quote Detail Page — Full view of a single quote with transitions

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getQuoteById, getQuoteVersionHistory } from '@/lib/quotes/actions'
import { QuoteStatusBadge, PricingModelBadge } from '@/components/quotes/quote-status-badge'
import { QuoteVersionHistory } from '@/components/quotes/quote-version-history'
import { QuoteTransitions } from '@/components/quotes/quote-transitions'
import { EntityActivityTimeline } from '@/components/activity/entity-activity-timeline'
import { getEntityActivityTimeline } from '@/lib/activity/entity-timeline'
import { getQuoteLineItems } from '@/lib/quotes/cost-breakdown-actions'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { format, formatDistanceToNow } from 'date-fns'
import { CostBreakdownEditor } from '@/components/quotes/cost-breakdown-editor'

export default async function QuoteDetailPage({ params }: { params: { id: string } }) {
  await requireChef()

  const [quote, versionHistory, timelineEntries, quoteBreakdown] = await Promise.all([
    getQuoteById(params.id),
    getQuoteVersionHistory(params.id),
    getEntityActivityTimeline('quote', params.id),
    getQuoteLineItems(params.id).catch(() => ({ lineItems: [] })),
  ])

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
          <p className="text-stone-300 mt-1">
            {quote.client?.full_name || 'Unknown Client'}
            {quote.client?.email && ` - ${quote.client.email}`}
          </p>
        </div>
        <Link href="/quotes">
          <Button variant="ghost">Back to Quotes</Button>
        </Link>
      </div>

      {/* Frozen Snapshot Notice */}
      {quote.snapshot_frozen && (
        <div className="bg-green-950 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-medium text-green-800">
            Pricing snapshot frozen at acceptance. Original pricing is preserved.
          </p>
        </div>
      )}

      {/* Version History */}
      <QuoteVersionHistory
        currentQuoteId={params.id}
        versions={versionHistory}
        isSuperseded={(quote as any).is_superseded ?? false}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pricing */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Pricing</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-stone-500">Total Quoted</dt>
              <dd className="text-2xl font-bold text-stone-100 mt-1">
                {formatCurrency(quote.total_quoted_cents)}
              </dd>
            </div>
            {quote.pricing_model && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Pricing Model</dt>
                <dd className="mt-1">
                  <PricingModelBadge model={quote.pricing_model as any} />
                </dd>
              </div>
            )}
            {quote.price_per_person_cents && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Per Person</dt>
                <dd className="text-sm text-stone-100 mt-1">
                  {formatCurrency(quote.price_per_person_cents)}
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
        </Card>
      </div>

      {/* Linked Resources */}
      {(quote.inquiry || quote.event) && (
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

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold text-stone-100">Client Cost Breakdown</h2>
        <CostBreakdownEditor
          quoteId={quote.id}
          totalQuotedCents={quote.total_quoted_cents}
          initialShowCostBreakdown={quote.show_cost_breakdown ?? false}
          initialExclusionsNote={quote.exclusions_note ?? null}
          initialLineItems={quoteBreakdown.lineItems}
        />
      </Card>

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
