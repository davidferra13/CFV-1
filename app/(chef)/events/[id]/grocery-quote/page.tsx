// Grocery Quote Page
// Shows automated ingredient pricing from Spoonacular + Kroger APIs,
// plus an Instacart cart link pre-filled with all event ingredients.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEventById } from '@/lib/events/actions'
import { getLatestGroceryQuote } from '@/lib/grocery/pricing-actions'
import { GroceryQuotePanel } from '@/components/events/grocery-quote-panel'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'

export default async function GroceryQuotePage({
  params,
}: {
  params: { id: string }
}) {
  await requireChef()

  const event = await getEventById(params.id)
  if (!event) notFound()

  const existingQuote = await getLatestGroceryQuote(params.id).catch(() => null)

  const eventLabel = [
    event.occasion || 'Event',
    format(new Date(event.event_date), 'MMM d, yyyy'),
  ].join(' — ')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Grocery Price Quote</h1>
          <p className="text-stone-500 mt-1 text-sm">{eventLabel}</p>
        </div>
        <Link href={`/events/${params.id}`}>
          <Button variant="ghost">Back to Event</Button>
        </Link>
      </div>

      <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
        <p>
          Prices are estimated from Spoonacular (US average) and Kroger (real-time shelf
          prices). The average is used for your food cost estimate. Actuals may vary by
          store and region.
        </p>
      </div>

      <GroceryQuotePanel
        eventId={params.id}
        initialQuote={existingQuote}
        quotedPriceCents={event.quoted_price_cents}
      />
    </div>
  )
}
