// Client Quote Detail - View and respond to a single quote

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireClient } from '@/lib/auth/get-user'
import { getClientQuoteById } from '@/lib/quotes/client-actions'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import QuoteResponseButtons from './quote-response-buttons'
import { QuoteExpiryCountdown } from '@/components/quotes/quote-expiry-countdown'
import { MessageChefButton } from '@/components/chat/message-chef-button'
import { ActivityTracker } from '@/components/activity/activity-tracker'
import { SessionHeartbeat } from '@/components/activity/session-heartbeat'
import { PaymentStructureSummary } from '@/components/quotes/payment-structure-summary'
import { readPaymentStructure } from '@/lib/payments/payment-structure'

export default async function ClientQuoteDetailPage({ params }: { params: { id: string } }) {
  await requireClient()

  const quote = await getClientQuoteById(params.id)

  if (!quote) {
    redirect('/my-quotes')
  }

  const isPending = quote.status === 'sent'
  const paymentStructure = readPaymentStructure((quote as any).pricing_context ?? null)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-100">
              {quote.quote_name || 'Quote'}
            </h1>
            {(quote.version as number) > 1 && (
              <Badge variant="info">Revision {quote.version as number}</Badge>
            )}
            {(quote.is_superseded as boolean) && <Badge variant="warning">Superseded</Badge>}
          </div>
          {(quote.inquiry as any)?.confirmed_occasion && (
            <p className="text-stone-400 mt-1">{(quote.inquiry as any).confirmed_occasion}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/documents/quote-client/${params.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg border border-stone-600 px-3 py-1.5 text-sm font-medium text-stone-300 hover:bg-stone-800"
          >
            Download PDF
          </a>
          <Link href="/my-quotes">
            <Button variant="ghost">Back to Quotes</Button>
          </Link>
        </div>
      </div>

      {/* Status Banner */}
      {quote.status === 'accepted' && (
        <div className="bg-green-950 border border-green-200 rounded-lg p-4">
          <p className="text-green-200 font-medium">
            You accepted this quote on{' '}
            {quote.accepted_at && format(new Date(quote.accepted_at), 'MMMM d, yyyy')}.
          </p>
        </div>
      )}

      {quote.status === 'rejected' && (
        <div className="bg-red-950 border border-red-200 rounded-lg p-4">
          <p className="text-red-200 font-medium">
            You declined this quote on{' '}
            {quote.rejected_at && format(new Date(quote.rejected_at), 'MMMM d, yyyy')}.
          </p>
        </div>
      )}

      {/* Pricing Summary */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Pricing Summary</h2>
        <div className="space-y-4">
          <div className="text-center py-4 border-b">
            <p className="text-3xl sm:text-4xl font-bold text-stone-100">
              {formatCurrency(quote.total_quoted_cents)}
            </p>
            {quote.pricing_model === 'per_person' &&
              quote.price_per_person_cents &&
              quote.guest_count_estimated && (
                <p className="text-sm text-stone-500 mt-1">
                  {formatCurrency(quote.price_per_person_cents)} per guest x{' '}
                  {quote.guest_count_estimated} guests
                </p>
              )}
            {quote.pricing_model === 'flat_rate' && (
              <p className="text-sm text-stone-500 mt-1">Fixed price</p>
            )}
          </div>

          {quote.deposit_required && quote.deposit_amount_cents && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-400">Deposit required</span>
              <span className="font-medium text-stone-100">
                {formatCurrency(quote.deposit_amount_cents)}
                {quote.deposit_percentage && ` (${quote.deposit_percentage}%)`}
              </span>
            </div>
          )}

          {quote.valid_until && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-400">Valid until</span>
              <span className="font-medium text-stone-100 flex items-center gap-2">
                {format(new Date(quote.valid_until), 'MMMM d, yyyy')}
                {isPending ? (
                  <QuoteExpiryCountdown validUntil={quote.valid_until} />
                ) : (
                  new Date(quote.valid_until) < new Date() && (
                    <Badge variant="warning" className="ml-2">
                      Expired
                    </Badge>
                  )
                )}
              </span>
            </div>
          )}
        </div>
      </Card>

      {paymentStructure && <PaymentStructureSummary structure={paymentStructure} />}

      {/* Event Details from Inquiry */}
      {quote.inquiry && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Event Details</h2>
            <Link
              href={`/my-inquiries/${(quote.inquiry as any).id}`}
              className="text-sm text-brand-500 hover:text-brand-400 font-medium"
            >
              View Inquiry →
            </Link>
          </div>
          <dl className="space-y-3">
            {(quote.inquiry as any).confirmed_occasion && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Occasion</dt>
                <dd className="text-sm text-stone-100 mt-1">
                  {(quote.inquiry as any).confirmed_occasion}
                </dd>
              </div>
            )}
            {(quote.inquiry as any).confirmed_date && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Date</dt>
                <dd className="text-sm text-stone-100 mt-1">
                  {format(new Date((quote.inquiry as any).confirmed_date), 'EEEE, MMMM d, yyyy')}
                </dd>
              </div>
            )}
            {(quote.inquiry as any).confirmed_guest_count && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Guests</dt>
                <dd className="text-sm text-stone-100 mt-1">
                  {(quote.inquiry as any).confirmed_guest_count} guests
                </dd>
              </div>
            )}
          </dl>
        </Card>
      )}

      {/* Pricing Notes (from chef) */}
      {quote.pricing_notes && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">What&apos;s Included</h2>
          <p className="text-sm text-stone-300 whitespace-pre-wrap">{quote.pricing_notes}</p>
        </Card>
      )}

      {/* Menu Snapshot (if event has menus) */}
      {quote.menus && (quote.menus as any[]).length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Your Menu</h2>
          {(quote.menus as any[]).map((menu: any) => (
            <div key={menu.id} className="space-y-3">
              {menu.name && <h3 className="text-sm font-medium text-stone-300">{menu.name}</h3>}
              {menu.description && <p className="text-sm text-stone-400">{menu.description}</p>}
              {menu.dishes && menu.dishes.length > 0 && (
                <div className="space-y-2">
                  {(menu.dishes as any[])
                    .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                    .map((dish: any) => (
                      <div key={dish.id} className="border-l-2 border-brand-700 pl-3 py-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            {dish.course_name && (
                              <span className="text-xs uppercase tracking-wide text-stone-500">
                                {dish.course_name}
                              </span>
                            )}
                            {dish.description && (
                              <p className="text-sm text-stone-200">{dish.description}</p>
                            )}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            {dish.dietary_tags?.map((tag: string) => (
                              <Badge key={tag} variant="default" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* Response Buttons */}
      {isPending && (
        <QuoteResponseButtons
          quoteId={quote.id}
          totalCents={quote.total_quoted_cents}
          eventId={quote.event_id ?? undefined}
        />
      )}

      {/* Message chef about this quote */}
      <div className="flex justify-center pt-4">
        <MessageChefButton label="Have a question? Message your chef" />
      </div>

      {/* Activity tracking */}
      <ActivityTracker
        eventType="quote_viewed"
        entityType="quote"
        entityId={quote.id}
        metadata={{
          quote_status: quote.status,
          total_quoted_cents: quote.total_quoted_cents,
          is_pending: isPending,
          valid_until: quote.valid_until,
          has_deposit: quote.deposit_required,
        }}
      />
      {isPending && <SessionHeartbeat entityType="quote" entityId={quote.id} />}
    </div>
  )
}
