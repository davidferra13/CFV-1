// New Quote Page — Create a quote with pricing intelligence
// Can be navigated to directly or from an inquiry (with pre-filled data)

import { requireChef } from '@/lib/auth/get-user'
import { getClients } from '@/lib/clients/actions'
import { getClientPricingHistory } from '@/lib/quotes/actions'
import { getInquiryById } from '@/lib/inquiries/actions'
import { getPricingSuggestion } from '@/lib/analytics/pricing-suggestions'
import { formatBenchmarkSuggestion } from '@/lib/inquiries/goldmine-pricing-benchmarks'
import { QuoteForm } from '@/components/quotes/quote-form'

type SearchParamValue = string | string[] | undefined
type NewQuoteSearchParams = Record<string, SearchParamValue>
type PricingModel = 'flat_rate' | 'per_person' | 'custom'

function firstValue(value: SearchParamValue): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

function readString(params: NewQuoteSearchParams, key: string, maxLength = 200): string | null {
  const raw = firstValue(params[key])?.trim()
  if (!raw) return null
  return raw.slice(0, maxLength)
}

function readInt(
  params: NewQuoteSearchParams,
  key: string,
  opts: { min?: number; max?: number } = {}
): number | null {
  const raw = firstValue(params[key])
  if (!raw) return null
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed)) return null
  if (opts.min != null && parsed < opts.min) return null
  if (opts.max != null && parsed > opts.max) return null
  return parsed
}

function readFloat(
  params: NewQuoteSearchParams,
  key: string,
  opts: { min?: number; max?: number } = {}
): number | null {
  const raw = firstValue(params[key])
  if (!raw) return null
  const parsed = Number.parseFloat(raw)
  if (!Number.isFinite(parsed)) return null
  if (opts.min != null && parsed < opts.min) return null
  if (opts.max != null && parsed > opts.max) return null
  return parsed
}

function readBoolean(params: NewQuoteSearchParams, key: string): boolean | undefined {
  const raw = firstValue(params[key])?.toLowerCase()
  if (!raw) return undefined
  if (raw === '1' || raw === 'true' || raw === 'yes') return true
  if (raw === '0' || raw === 'false' || raw === 'no') return false
  return undefined
}

function readDateString(params: NewQuoteSearchParams, key: string): string | null {
  const raw = firstValue(params[key])?.trim()
  if (!raw) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null
  return raw
}

function readPricingModel(params: NewQuoteSearchParams, key: string): PricingModel | null {
  const raw = firstValue(params[key])
  if (raw === 'flat_rate' || raw === 'per_person' || raw === 'custom') return raw
  return null
}

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: NewQuoteSearchParams
}) {
  const user = await requireChef()

  const clients = await getClients()

  // Pre-fill from query params and inquiry if provided
  let prefilledClientId = readString(searchParams, 'client_id', 80)
  let prefilledInquiryId = readString(searchParams, 'inquiry_id', 80)
  let prefilledSource = readString(searchParams, 'source', 40)
  let prefilledGuestCount = readInt(searchParams, 'guest_count', { min: 1, max: 10000 })
  let prefilledBudgetCents = readInt(searchParams, 'total_cents', { min: 1, max: 100000000 })
  let prefilledQuoteName = readString(searchParams, 'quote_name', 140)
  let prefilledPricingModel = readPricingModel(searchParams, 'pricing_model')
  let prefilledPricePerPersonCents = readInt(searchParams, 'price_per_person_cents', {
    min: 1,
    max: 10000000,
  })
  let prefilledDepositRequired = readBoolean(searchParams, 'deposit_required')
  let prefilledDepositAmountCents = readInt(searchParams, 'deposit_amount_cents', {
    min: 1,
    max: 100000000,
  })
  let prefilledDepositPercentage = readFloat(searchParams, 'deposit_percentage', {
    min: 0,
    max: 100,
  })
  let prefilledValidUntil = readDateString(searchParams, 'valid_until')
  let prefilledPricingNotes = readString(searchParams, 'pricing_notes', 1200)
  let prefilledInternalNotes = readString(searchParams, 'internal_notes', 1200)
  let prefilledEventId = readString(searchParams, 'event_id', 80)
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
