import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { requireChef } from '@/lib/auth/get-user'
import { getEventById } from '@/lib/events/actions'
import { generateGroceryList } from '@/lib/grocery/generate-grocery-list'
import { getLatestGroceryQuote } from '@/lib/grocery/pricing-actions'
import { GroceryQuotePanel } from '@/components/events/grocery-quote-panel'
import { GroceryListView } from '@/components/grocery/grocery-list-view'
import { Button } from '@/components/ui/button'

export default async function EventProcurementPage({ params }: { params: { id: string } }) {
  await requireChef()

  const event = await getEventById(params.id)
  if (!event) notFound()

  const [groceryList, latestQuote] = await Promise.all([
    generateGroceryList(params.id).catch(() => null),
    getLatestGroceryQuote(params.id).catch(() => null),
  ])

  const eventLabel = [
    event.occasion || 'Event',
    format(new Date(event.event_date), 'MMM d, yyyy'),
  ].join(' - ')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Procurement</h1>
          <p className="mt-1 text-sm text-stone-500">{eventLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/events/${params.id}/grocery-quote`}>
            <Button variant="secondary">Quote Only</Button>
          </Link>
          <Link href={`/events/${params.id}`}>
            <Button variant="ghost">Back to Event</Button>
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-stone-700 bg-stone-900/70 px-4 py-3 text-sm text-stone-400">
        Procurement stays focused on the real next grocery move: finalize the list, refresh live
        prices, or review grocery variance against what you actually spent.
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Grocery List</h2>
          <p className="mt-1 text-sm text-stone-500">
            Review the consolidated list before you lock pricing or head out to shop.
          </p>
        </div>

        {groceryList ? (
          <div className="rounded-[24px] bg-white p-6 shadow-[var(--shadow-card-hover)]">
            <GroceryListView data={groceryList} eventId={params.id} />
          </div>
        ) : (
          <div className="rounded-lg border border-stone-700 bg-stone-900 px-4 py-5 text-sm text-stone-400">
            Grocery data could not be generated for this event right now.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-100">Market Pricing</h2>
          <p className="mt-1 text-sm text-stone-500">
            Pull a fresh grocery quote, compare sources, and inspect estimate accuracy after actual
            spend is logged.
          </p>
        </div>

        <GroceryQuotePanel
          eventId={params.id}
          initialQuote={latestQuote}
          quotedPriceCents={event.quoted_price_cents}
        />
      </section>
    </div>
  )
}
