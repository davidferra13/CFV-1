import { z } from 'zod'

export type QuoteDraftPrefillSource =
  | 'consulting'
  | 'inquiry'
  | 'event'
  | 'change_order'
  | 'quote_revision'
  | 'recurring_default'

export type QuoteDraftPrefillPricingModel = 'flat_rate' | 'per_person' | 'custom'

export type QuoteDraftPrefill = {
  client_id?: string
  inquiry_id?: string
  event_id?: string
  source?: QuoteDraftPrefillSource
  guest_count?: number
  total_cents?: number
  quote_name?: string
  pricing_model?: QuoteDraftPrefillPricingModel
  price_per_person_cents?: number
  deposit_required?: boolean
  deposit_amount_cents?: number
  deposit_percentage?: number
  valid_until?: string
  pricing_notes?: string
  internal_notes?: string
}

type SearchParamInput = URLSearchParams | Record<string, string | string[] | undefined>

const QuoteDraftPrefillSourceSchema = z.enum([
  'consulting',
  'inquiry',
  'event',
  'change_order',
  'quote_revision',
  'recurring_default',
])
const QuoteDraftPrefillPricingModelSchema = z.enum(['flat_rate', 'per_person', 'custom'])
const QuoteIdSchema = z.string().uuid()
const DateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

function firstValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0]
  return value
}

function getSearchParamValue(input: SearchParamInput, key: string): string | null {
  if (input instanceof URLSearchParams) {
    return input.get(key)
  }
  return firstValue(input[key]) ?? null
}

function readTextValue(value: string | null, maxLength: number): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const parsed = z.string().max(maxLength).safeParse(trimmed)
  return parsed.success ? parsed.data : null
}

function readParsedValue<T>(schema: z.ZodType<T>, value: string | null): T | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const parsed = schema.safeParse(trimmed)
  return parsed.success ? parsed.data : null
}

function readIntValue(value: string | null, bounds: { min: number; max: number }): number | null {
  return readParsedValue(z.coerce.number().int().min(bounds.min).max(bounds.max), value)
}

function readFloatValue(value: string | null, bounds: { min: number; max: number }): number | null {
  return readParsedValue(z.coerce.number().min(bounds.min).max(bounds.max), value)
}

function readBooleanValue(value: string | null): boolean | undefined {
  if (!value) return undefined
  const normalized = value.trim().toLowerCase()
  if (!normalized) return undefined
  if (['1', 'true', 'yes'].includes(normalized)) return true
  if (['0', 'false', 'no'].includes(normalized)) return false
  return undefined
}

function setStringParam(params: URLSearchParams, key: string, value: string | null | undefined) {
  if (!value) return
  params.set(key, value)
}

function setIntParam(params: URLSearchParams, key: string, value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return
  params.set(key, String(Math.round(value)))
}

function setFloatParam(params: URLSearchParams, key: string, value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return
  params.set(key, String(value))
}

export function readQuoteDraftPrefillFromSearchParams(input: SearchParamInput): QuoteDraftPrefill {
  const eventId =
    readParsedValue(QuoteIdSchema, getSearchParamValue(input, 'event_id')) ??
    readParsedValue(QuoteIdSchema, getSearchParamValue(input, 'from_event'))

  const prefill: QuoteDraftPrefill = {}

  const clientId = readParsedValue(QuoteIdSchema, getSearchParamValue(input, 'client_id'))
  if (clientId) prefill.client_id = clientId

  const inquiryId = readParsedValue(QuoteIdSchema, getSearchParamValue(input, 'inquiry_id'))
  if (inquiryId) prefill.inquiry_id = inquiryId

  if (eventId) prefill.event_id = eventId

  const source = readParsedValue(
    QuoteDraftPrefillSourceSchema,
    getSearchParamValue(input, 'source')
  )
  if (source) prefill.source = source

  const guestCount = readIntValue(getSearchParamValue(input, 'guest_count'), {
    min: 1,
    max: 10_000,
  })
  if (guestCount != null) prefill.guest_count = guestCount

  const totalCents = readIntValue(getSearchParamValue(input, 'total_cents'), {
    min: 1,
    max: 100_000_000,
  })
  if (totalCents != null) prefill.total_cents = totalCents

  const quoteName = readTextValue(getSearchParamValue(input, 'quote_name'), 140)
  if (quoteName) prefill.quote_name = quoteName

  const pricingModel = readParsedValue(
    QuoteDraftPrefillPricingModelSchema,
    getSearchParamValue(input, 'pricing_model')
  )
  if (pricingModel) prefill.pricing_model = pricingModel

  const pricePerPersonCents = readIntValue(getSearchParamValue(input, 'price_per_person_cents'), {
    min: 1,
    max: 10_000_000,
  })
  if (pricePerPersonCents != null) prefill.price_per_person_cents = pricePerPersonCents

  const depositRequired = readBooleanValue(getSearchParamValue(input, 'deposit_required'))
  if (depositRequired !== undefined) prefill.deposit_required = depositRequired

  const depositAmountCents = readIntValue(getSearchParamValue(input, 'deposit_amount_cents'), {
    min: 1,
    max: 100_000_000,
  })
  if (depositAmountCents != null) prefill.deposit_amount_cents = depositAmountCents

  const depositPercentage = readFloatValue(getSearchParamValue(input, 'deposit_percentage'), {
    min: 0,
    max: 100,
  })
  if (depositPercentage != null) prefill.deposit_percentage = depositPercentage

  const validUntil = readParsedValue(DateOnlySchema, getSearchParamValue(input, 'valid_until'))
  if (validUntil) prefill.valid_until = validUntil

  const pricingNotes = readTextValue(getSearchParamValue(input, 'pricing_notes'), 1200)
  if (pricingNotes) prefill.pricing_notes = pricingNotes

  const internalNotes = readTextValue(getSearchParamValue(input, 'internal_notes'), 1200)
  if (internalNotes) prefill.internal_notes = internalNotes

  return prefill
}

export function mergeQuoteDraftPrefill(
  ...prefills: Array<QuoteDraftPrefill | null | undefined>
): QuoteDraftPrefill {
  const merged: QuoteDraftPrefill = {}

  for (const prefill of prefills) {
    if (!prefill) continue
    if (prefill.client_id) merged.client_id = prefill.client_id
    if (prefill.inquiry_id) merged.inquiry_id = prefill.inquiry_id
    if (prefill.event_id) merged.event_id = prefill.event_id
    if (prefill.source) merged.source = prefill.source
    if (prefill.guest_count != null) merged.guest_count = prefill.guest_count
    if (prefill.total_cents != null) merged.total_cents = prefill.total_cents
    if (prefill.quote_name) merged.quote_name = prefill.quote_name
    if (prefill.pricing_model) merged.pricing_model = prefill.pricing_model
    if (prefill.price_per_person_cents != null) {
      merged.price_per_person_cents = prefill.price_per_person_cents
    }
    if (prefill.deposit_required !== undefined) merged.deposit_required = prefill.deposit_required
    if (prefill.deposit_amount_cents != null) {
      merged.deposit_amount_cents = prefill.deposit_amount_cents
    }
    if (prefill.deposit_percentage != null) merged.deposit_percentage = prefill.deposit_percentage
    if (prefill.valid_until) merged.valid_until = prefill.valid_until
    if (prefill.pricing_notes) merged.pricing_notes = prefill.pricing_notes
    if (prefill.internal_notes) merged.internal_notes = prefill.internal_notes
  }

  return merged
}

export function buildQuoteDraftPrefillSearchParams(prefill: QuoteDraftPrefill): URLSearchParams {
  const sanitized = readQuoteDraftPrefillFromSearchParams(
    Object.fromEntries(
      Object.entries({
        client_id: prefill.client_id,
        inquiry_id: prefill.inquiry_id,
        event_id: prefill.event_id,
        source: prefill.source,
        guest_count: prefill.guest_count?.toString(),
        total_cents: prefill.total_cents?.toString(),
        quote_name: prefill.quote_name,
        pricing_model: prefill.pricing_model,
        price_per_person_cents: prefill.price_per_person_cents?.toString(),
        deposit_required:
          prefill.deposit_required === undefined ? undefined : String(prefill.deposit_required),
        deposit_amount_cents: prefill.deposit_amount_cents?.toString(),
        deposit_percentage: prefill.deposit_percentage?.toString(),
        valid_until: prefill.valid_until,
        pricing_notes: prefill.pricing_notes,
        internal_notes: prefill.internal_notes,
      }).filter(([, value]) => value !== undefined)
    )
  )

  const params = new URLSearchParams()
  setStringParam(params, 'client_id', sanitized.client_id)
  setStringParam(params, 'inquiry_id', sanitized.inquiry_id)
  setStringParam(params, 'event_id', sanitized.event_id)
  setStringParam(params, 'source', sanitized.source)
  setIntParam(params, 'guest_count', sanitized.guest_count)
  setIntParam(params, 'total_cents', sanitized.total_cents)
  setStringParam(params, 'quote_name', sanitized.quote_name)
  setStringParam(params, 'pricing_model', sanitized.pricing_model)
  setIntParam(params, 'price_per_person_cents', sanitized.price_per_person_cents)
  if (sanitized.deposit_required !== undefined) {
    params.set('deposit_required', String(sanitized.deposit_required))
  }
  setIntParam(params, 'deposit_amount_cents', sanitized.deposit_amount_cents)
  setFloatParam(params, 'deposit_percentage', sanitized.deposit_percentage)
  setStringParam(params, 'valid_until', sanitized.valid_until)
  setStringParam(params, 'pricing_notes', sanitized.pricing_notes)
  setStringParam(params, 'internal_notes', sanitized.internal_notes)
  return params
}

export function buildQuoteDraftHref(prefill?: QuoteDraftPrefill | null): string {
  const params = buildQuoteDraftPrefillSearchParams(prefill ?? {})
  const query = params.toString()
  return query ? `/quotes/new?${query}` : '/quotes/new'
}
