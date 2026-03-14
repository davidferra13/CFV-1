// Edit Quote Page — Only for draft quotes

import { notFound, redirect } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getQuoteById, getClientPricingHistory } from '@/lib/quotes/actions'
import { getClients } from '@/lib/clients/actions'
import { QuoteForm } from '@/components/quotes/quote-form'

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
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Edit Quote</h1>
        <p className="text-stone-400 mt-1">Update pricing before sending to the client.</p>
      </div>

      <QuoteForm
        tenantId={user.tenantId!}
        clients={clients}
        pricingHistory={pricingHistory}
        existingQuote={quote}
      />
    </div>
  )
}
