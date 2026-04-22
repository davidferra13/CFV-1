// New Quote Page - Create a quote with pricing intelligence
// Can be navigated to directly or from an inquiry (with pre-filled data)

import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getClients } from '@/lib/clients/actions'
import { getClientPricingHistory } from '@/lib/quotes/actions'
import { getInquiryById } from '@/lib/inquiries/actions'
import { getPricingSuggestion } from '@/lib/analytics/pricing-suggestions'
import { formatBenchmarkSuggestion } from '@/lib/inquiries/goldmine-pricing-benchmarks'
import { QuoteForm } from '@/components/quotes/quote-form'
import { getPricingConfig } from '@/lib/pricing/config-actions'
import { getEventById } from '@/lib/events/actions'
import {
  readQuoteDraftPrefillFromSearchParams,
  type QuoteDraftPrefillSource,
} from '@/lib/quotes/quote-prefill'

type SearchParamValue = string | string[] | undefined
type NewQuoteSearchParams = Record<string, SearchParamValue>
type ClientRecord = {
  id: string
  full_name: string
  email: string
  recurring_pricing_model?: 'none' | 'flat_rate' | 'per_person' | null
  recurring_price_cents?: number | null
  recurring_pricing_notes?: string | null
}

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: NewQuoteSearchParams
}) {
  const user = await requireChef()

  const [clients, pricingConfig] = await Promise.all([
    getClients() as Promise<ClientRecord[]>,
    getPricingConfig(),
  ])

  const RATE_KEYS = [
    'couples_rate_3_course',
    'couples_rate_4_course',
    'couples_rate_5_course',
    'group_rate_3_course',
    'group_rate_4_course',
    'group_rate_5_course',
    'weekly_standard_min',
    'weekly_standard_max',
    'cook_and_leave_rate',
  ] as const
  const usingDefaults = !RATE_KEYS.some((k) => {
    const val = (pricingConfig as unknown as Record<string, unknown>)[k]
    return typeof val === 'number' && val > 0
  })

  // Canonical prefill comes from the shared search-param contract. Inquiry and event
  // enrichment then compose on top of explicit URL values instead of replacing them.
  const urlPrefill = readQuoteDraftPrefillFromSearchParams(searchParams)

  let prefilledClientId = urlPrefill.client_id ?? null
  let prefilledInquiryId = urlPrefill.inquiry_id ?? null
  let prefilledSource: QuoteDraftPrefillSource | null = urlPrefill.source ?? null
  let prefilledGuestCount = urlPrefill.guest_count ?? null
  let prefilledBudgetCents = urlPrefill.total_cents ?? null
  let prefilledQuoteName = urlPrefill.quote_name ?? null
  let prefilledPricingModel = urlPrefill.pricing_model ?? null
  let prefilledPricePerPersonCents = urlPrefill.price_per_person_cents ?? null
  let prefilledDepositRequired = urlPrefill.deposit_required
  let prefilledDepositAmountCents = urlPrefill.deposit_amount_cents ?? null
  let prefilledDepositPercentage = urlPrefill.deposit_percentage ?? null
  let prefilledValidUntil = urlPrefill.valid_until ?? null
  let prefilledPricingNotes = urlPrefill.pricing_notes ?? null
  let prefilledInternalNotes = urlPrefill.internal_notes ?? null
  let prefilledEventId = urlPrefill.event_id ?? null
  let prefilledOccasion: string | null = null
  let prefilledEventDate: string | null = null

  if (prefilledInquiryId) {
    const inquiry = await getInquiryById(prefilledInquiryId)
    if (inquiry) {
      prefilledClientId = prefilledClientId ?? inquiry.client_id ?? null
      prefilledGuestCount = prefilledGuestCount ?? inquiry.confirmed_guest_count
      prefilledBudgetCents = prefilledBudgetCents ?? inquiry.confirmed_budget_cents
      prefilledOccasion = inquiry.confirmed_occasion ?? null
      prefilledEventDate = inquiry.confirmed_date ?? null
    }
  }

  if (prefilledEventId) {
    const event = await getEventById(prefilledEventId)
    if (event) {
      prefilledClientId = prefilledClientId ?? event.client_id ?? null
      prefilledGuestCount = prefilledGuestCount ?? event.guest_count ?? null
      prefilledOccasion = prefilledOccasion ?? event.occasion ?? null
      prefilledEventDate = prefilledEventDate ?? event.event_date ?? null
    }
  }

  const selectedClient = prefilledClientId
    ? (clients.find((client) => client.id === prefilledClientId) ?? null)
    : null

  const hasExplicitBudgetPrefill = !!(prefilledBudgetCents && prefilledBudgetCents > 0)
  const hasExplicitPerPersonPrefill = !!(
    prefilledPricePerPersonCents && prefilledPricePerPersonCents > 0
  )
  const recurringRateCents = selectedClient?.recurring_price_cents ?? null
  const recurringModel = selectedClient?.recurring_pricing_model ?? null

  if (
    selectedClient &&
    recurringModel &&
    recurringModel !== 'none' &&
    recurringRateCents &&
    recurringRateCents > 0 &&
    !hasExplicitBudgetPrefill &&
    !hasExplicitPerPersonPrefill
  ) {
    if (recurringModel === 'per_person') {
      prefilledPricingModel = prefilledPricingModel ?? 'per_person'
      prefilledPricePerPersonCents = recurringRateCents
      if (prefilledGuestCount && prefilledGuestCount > 0) {
        prefilledBudgetCents = recurringRateCents * prefilledGuestCount
      }
    } else {
      prefilledPricingModel = prefilledPricingModel ?? 'flat_rate'
      prefilledBudgetCents = recurringRateCents
    }
    if (!prefilledSource) prefilledSource = 'recurring_default'
    if (!prefilledPricingNotes && selectedClient.recurring_pricing_notes) {
      prefilledPricingNotes = selectedClient.recurring_pricing_notes
    }
  }

  // Fetch pricing history and benchmark suggestion in parallel
  const [pricingHistory, rawPricingSuggestion] = await Promise.all([
    prefilledClientId ? getClientPricingHistory(prefilledClientId) : Promise.resolve([]),
    prefilledGuestCount && prefilledGuestCount > 0
      ? getPricingSuggestion({
          pricingModel: 'flat_rate',
          guestCount: prefilledGuestCount,
          occasion: prefilledOccasion,
        }).catch(() => null)
      : Promise.resolve(null),
  ])

  // If chef has no pricing history, fall back to GOLDMINE benchmarks
  const pricingSuggestion = rawPricingSuggestion
  const benchmarkHint =
    (!pricingSuggestion || pricingSuggestion.status === 'insufficient_data') &&
    prefilledGuestCount &&
    prefilledGuestCount > 0
      ? formatBenchmarkSuggestion(prefilledGuestCount)
      : null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-stone-100">Create Quote</h1>
        <p className="text-stone-400 mt-1">
          Build a pricing quote. Previous client pricing is shown to help set the right price.
        </p>
      </div>

      {usingDefaults && (
        <div className="rounded-xl border border-amber-800/40 bg-amber-950/30 px-5 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-amber-300">
            Your pricing rates haven&apos;t been configured yet. Quotes will use system defaults
            until you set your own rates.
          </p>
          <Link
            href="/settings/pricing"
            className="text-sm font-medium text-amber-400 hover:text-amber-300 whitespace-nowrap"
          >
            Set Rates &rarr;
          </Link>
        </div>
      )}

      <QuoteForm
        tenantId={user.tenantId!}
        clients={clients}
        pricingHistory={pricingHistory}
        pricingSuggestion={pricingSuggestion}
        benchmarkHint={benchmarkHint}
        prefilledClientId={prefilledClientId ?? undefined}
        prefilledInquiryId={prefilledInquiryId ?? undefined}
        prefilledGuestCount={prefilledGuestCount}
        prefilledBudgetCents={prefilledBudgetCents}
        prefilledSource={prefilledSource}
        prefilledQuoteName={prefilledQuoteName}
        prefilledPricingModel={prefilledPricingModel}
        prefilledPricePerPersonCents={prefilledPricePerPersonCents}
        prefilledDepositRequired={prefilledDepositRequired}
        prefilledDepositAmountCents={prefilledDepositAmountCents}
        prefilledDepositPercentage={prefilledDepositPercentage}
        prefilledValidUntil={prefilledValidUntil}
        prefilledPricingNotes={prefilledPricingNotes}
        prefilledInternalNotes={prefilledInternalNotes}
        prefilledOccasion={prefilledOccasion}
        prefilledEventDate={prefilledEventDate}
        prefilledEventId={prefilledEventId ?? undefined}
      />
    </div>
  )
}
