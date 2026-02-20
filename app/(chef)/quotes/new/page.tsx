// New Quote Page — Create a quote with pricing intelligence
// Can be navigated to directly or from an inquiry (with pre-filled data)

import { requireChef } from '@/lib/auth/get-user'
import { getClients } from '@/lib/clients/actions'
import { getClientPricingHistory } from '@/lib/quotes/actions'
import { getInquiryById } from '@/lib/inquiries/actions'
import { QuoteForm } from '@/components/quotes/quote-form'

export default async function NewQuotePage({
  searchParams
}: {
  searchParams: { client_id?: string; inquiry_id?: string }
}) {
  await requireChef()

  const clients = await getClients()

  // Pre-fill from inquiry if provided
  let prefilledClientId = searchParams.client_id
  let prefilledInquiryId = searchParams.inquiry_id
  let prefilledGuestCount: number | null = null
  let prefilledBudgetCents: number | null = null
  let prefilledOccasion: string | null = null
  let prefilledEventDate: string | null = null

  if (prefilledInquiryId) {
    const inquiry = await getInquiryById(prefilledInquiryId)
    if (inquiry) {
      prefilledClientId = inquiry.client_id || prefilledClientId
      prefilledGuestCount = inquiry.confirmed_guest_count
      prefilledBudgetCents = inquiry.confirmed_budget_cents
      prefilledOccasion = inquiry.confirmed_occasion ?? null
      prefilledEventDate = inquiry.confirmed_date ?? null
    }
  }

  // Fetch pricing history if client is known
  let pricingHistory: Awaited<ReturnType<typeof getClientPricingHistory>> = []
  if (prefilledClientId) {
    pricingHistory = await getClientPricingHistory(prefilledClientId)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-900">Create Quote</h1>
        <p className="text-stone-600 mt-1">
          Build a pricing quote. Previous client pricing is shown to help set the right price.
        </p>
      </div>

      <QuoteForm
        clients={clients}
        pricingHistory={pricingHistory}
        prefilledClientId={prefilledClientId}
        prefilledInquiryId={prefilledInquiryId}
        prefilledGuestCount={prefilledGuestCount}
        prefilledBudgetCents={prefilledBudgetCents}
        prefilledOccasion={prefilledOccasion}
        prefilledEventDate={prefilledEventDate}
      />
    </div>
  )
}
