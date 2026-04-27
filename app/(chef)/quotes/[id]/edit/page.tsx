// Edit Quote Page - Only for draft quotes

import { notFound, redirect } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getQuoteById, getClientPricingHistory } from '@/lib/quotes/actions'
import { getClients } from '@/lib/clients/actions'
import { QuoteForm } from '@/components/quotes/quote-form'
import { PricingInsightsSidebar } from '@/components/quotes/pricing-insights-sidebar'
import { ClientSpendingBadge } from '@/components/quotes/client-spending-badge'

export default async function EditQuotePage({ params }: { params: { id: string } }) {
  const user = await requireChef()

  const quote = await getQuoteById(params.id)

  if (!quote) {
    notFound()
  }

  if (quote.status !== 'draft') {
    redirect(`/quotes/${params.id}`)
  }

  const clients = await getClients()
  const pricingHistory = await getClientPricingHistory(quote.client_id)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Edit Quote</h1>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <p className="text-stone-400">Update pricing before sending to the client.</p>
          <ClientSpendingBadge clientId={quote.client_id ?? null} tenantId={user.tenantId!} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <QuoteForm
            tenantId={user.tenantId!}
            clients={clients}
            pricingHistory={pricingHistory}
            existingQuote={quote}
            prefilledClientId={quote.client_id ?? undefined}
            prefilledEventId={quote.event_id ?? undefined}
          />
        </div>

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
    </div>
  )
}
