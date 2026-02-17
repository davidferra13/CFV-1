// Client Quote Detail — View and respond to a single quote

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireClient } from '@/lib/auth/get-user'
import { getClientQuoteById } from '@/lib/quotes/client-actions'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import QuoteResponseButtons from './quote-response-buttons'

export default async function ClientQuoteDetailPage({
  params
}: {
  params: { id: string }
}) {
  await requireClient()

  const quote = await getClientQuoteById(params.id)

  if (!quote) {
    notFound()
  }

  const isPending = quote.status === 'sent'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">
            {quote.quote_name || 'Quote'}
          </h1>
          {(quote.inquiry as any)?.confirmed_occasion && (
            <p className="text-stone-600 mt-1">{(quote.inquiry as any).confirmed_occasion}</p>
          )}
        </div>
        <Link href="/my-quotes">
          <Button variant="ghost">Back to Quotes</Button>
        </Link>
      </div>

      {/* Status Banner */}
      {quote.status === 'accepted' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 font-medium">You accepted this quote on {quote.accepted_at && format(new Date(quote.accepted_at), 'MMMM d, yyyy')}.</p>
        </div>
      )}

      {quote.status === 'rejected' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">You declined this quote on {quote.rejected_at && format(new Date(quote.rejected_at), 'MMMM d, yyyy')}.</p>
        </div>
      )}

      {/* Pricing Summary */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Pricing Summary</h2>
        <div className="space-y-4">
          <div className="text-center py-4 border-b">
            <p className="text-4xl font-bold text-stone-900">
              {formatCurrency(quote.total_quoted_cents)}
            </p>
            {quote.pricing_model === 'per_person' && quote.price_per_person_cents && quote.guest_count_estimated && (
              <p className="text-sm text-stone-500 mt-1">
                {formatCurrency(quote.price_per_person_cents)} per person x {quote.guest_count_estimated} guests
              </p>
            )}
            {quote.pricing_model === 'flat_rate' && (
              <p className="text-sm text-stone-500 mt-1">Flat rate</p>
            )}
          </div>

          {quote.deposit_required && quote.deposit_amount_cents && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-600">Deposit required</span>
              <span className="font-medium text-stone-900">
                {formatCurrency(quote.deposit_amount_cents)}
                {quote.deposit_percentage && ` (${quote.deposit_percentage}%)`}
              </span>
            </div>
          )}

          {quote.valid_until && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-stone-600">Valid until</span>
              <span className="font-medium text-stone-900">
                {format(new Date(quote.valid_until), 'MMMM d, yyyy')}
                {new Date(quote.valid_until) < new Date() && (
                  <Badge variant="warning" className="ml-2">Expired</Badge>
                )}
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Event Details from Inquiry */}
      {quote.inquiry && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Event Details</h2>
          <dl className="space-y-3">
            {(quote.inquiry as any).confirmed_occasion && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Occasion</dt>
                <dd className="text-sm text-stone-900 mt-1">{(quote.inquiry as any).confirmed_occasion}</dd>
              </div>
            )}
            {(quote.inquiry as any).confirmed_date && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Date</dt>
                <dd className="text-sm text-stone-900 mt-1">
                  {format(new Date((quote.inquiry as any).confirmed_date), 'EEEE, MMMM d, yyyy')}
                </dd>
              </div>
            )}
            {(quote.inquiry as any).confirmed_guest_count && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Guests</dt>
                <dd className="text-sm text-stone-900 mt-1">{(quote.inquiry as any).confirmed_guest_count} guests</dd>
              </div>
            )}
          </dl>
        </Card>
      )}

      {/* Pricing Notes (from chef) */}
      {quote.pricing_notes && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">What&apos;s Included</h2>
          <p className="text-sm text-stone-700 whitespace-pre-wrap">{quote.pricing_notes}</p>
        </Card>
      )}

      {/* Response Buttons */}
      {isPending && <QuoteResponseButtons quoteId={quote.id} totalCents={quote.total_quoted_cents} />}
    </div>
  )
}
