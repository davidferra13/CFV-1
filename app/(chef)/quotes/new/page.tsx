// New Quote Page — Create a quote with pricing intelligence
// Can be navigated to directly or from an inquiry (with pre-filled data)

import { requireChef } from '@/lib/auth/get-user'
import { getClients } from '@/lib/clients/actions'
import { getClientPricingHistory } from '@/lib/quotes/actions'
import { getInquiryById } from '@/lib/inquiries/actions'
import { getPricingSuggestion } from '@/lib/analytics/pricing-suggestions'
import { QuoteForm } from '@/components/quotes/quote-form'

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: { client_id?: string; inquiry_id?: string }
}) {
  const user = await requireChef()

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

  // Fetch pricing history and benchmark suggestion in parallel
  const [pricingHistory, pricingSuggestion] = await Promise.all([
    prefilledClientId ? getClientPricingHistory(prefilledClientId) : Promise.resolve([]),
    prefilledGuestCount && prefilledGuestCount > 0
      ? getPricingSuggestion({
          pricingModel: 'flat_rate',
          guestCount: prefilledGuestCount,
          occasion: prefilledOccasion,
        }).catch(() => null)
      : Promise.resolve(null),
  ])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Create Quote</h1>
        <p className="text-stone-400 mt-1">
          Build a pricing quote. Previous client pricing is shown to help set the right price.
        </p>
      </div>

      <QuoteForm
        tenantId={user.tenantId!}
        clients={clients}
        pricingHistory={pricingHistory}
        pricingSuggestion={pricingSuggestion}
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
