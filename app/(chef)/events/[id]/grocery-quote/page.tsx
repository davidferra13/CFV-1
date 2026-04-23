// Grocery Quote Page
// Shows automated ingredient pricing from Spoonacular + Kroger APIs,
// plus an Instacart cart link pre-filled with all event ingredients.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEventById } from '@/lib/events/actions'
import { getLatestGroceryQuote } from '@/lib/grocery/pricing-actions'
import { GroceryQuotePanel } from '@/components/events/grocery-quote-panel'
import { ServiceSimulationReturnBanner } from '@/components/events/service-simulation-return-banner'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { sanitizeReturnTo } from '@/lib/navigation/return-to'

export default async function GroceryQuotePage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { returnTo?: string }
}) {
  await requireChef()
  const returnTo = sanitizeReturnTo(searchParams?.returnTo)

  const event = await getEventById(params.id)
  if (!event) notFound()

  const existingQuote = await getLatestGroceryQuote(params.id).catch(() => null)

  const eventLabel = [
    event.occasion || 'Event',
    format(new Date(event.event_date), 'MMM d, yyyy'),
  ].join(' - ')

  return (
    <div className="space-y-6">
      <ServiceSimulationReturnBanner returnTo={returnTo} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Grocery Price Quote</h1>
          <p className="text-stone-500 mt-1 text-sm">{eventLabel}</p>
        </div>
        <Link href={returnTo ?? `/events/${params.id}`}>
          <Button variant="ghost">Back to Event</Button>
        </Link>
      </div>

      <div className="rounded-lg border border-stone-700 bg-stone-800 px-4 py-3 text-sm text-stone-400">
        <p>
          Prices are estimated from Spoonacular (US average) and Kroger (real-time shelf prices).
          The average is used for your food cost estimate. Actuals may vary by store and region.
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
