/**
 * Pricing Decision Model
 *
 * Shared types and helpers for baseline/override/source semantics across
 * quotes, events, series, and sessions. Final payable amounts live in the
 * existing quote/event columns. These types model the EXPLANATION layer:
 * where the baseline came from, whether the chef overrode it, and what the
 * comparison looks like for display.
 *
 * DO NOT use these fields for invoice math, ledger writes, or payment
 * calculations. Those systems must continue to use quoted_price_cents /
 * total_quoted_cents as the canonical payable amount.
 */

export type PricingSourceKind =
  | 'chef_config_calculated'
  | 'recurring_default'
  | 'booking_page'
  | 'recurring_service'
  | 'series_session'
  | 'manual_only'
  | 'legacy'

export type OverrideKind = 'none' | 'per_person' | 'custom_total'

/**
 * Pricing decision payload that can be attached to a quote or event write.
 * All fields are optional because the builder must not require them to exist.
 */
export interface PricingDecision {
  pricingSourceKind?: PricingSourceKind
  baselineTotalCents?: number | null
  baselinePricePerPersonCents?: number | null
  overrideKind?: OverrideKind
  overrideReason?: string | null
  pricingContext?: Record<string, unknown> | null
}

/**
 * The data a display component needs to render final vs baseline comparison.
 * Sourced from the row returned by the DB (snake_case) and converted here.
 */
export interface PriceComparisonData {
  /** The real, payable final price (always present). */
  finalTotalCents: number
  /** Final per-person rate if the model is per_person. */
  finalPricePerPersonCents?: number | null
  /** Baseline total for comparison. Null = no baseline, do not show crossed-out. */
  baselineTotalCents?: number | null
  /** Baseline per-person for comparison. */
  baselinePricePerPersonCents?: number | null
  /** Where the baseline came from. Determines supporting copy. */
  pricingSourceKind?: PricingSourceKind | null
  /** Whether the chef made a deliberate override. */
  overrideKind?: OverrideKind | null
  /** Optional chef note explaining the override. */
  overrideReason?: string | null
  /** Optional source metadata (inclusions, exclusions, minimums). */
  pricingContext?: Record<string, unknown> | null
  /** Guest count used for per-person math, if relevant. */
  guestCount?: number | null
}

/**
 * Returns true if an override is active and the baseline differs from final.
 * Use this to decide whether to render a comparison (crossed-out baseline).
 */
export function hasActiveOverride(data: PriceComparisonData): boolean {
  if (!data.overrideKind || data.overrideKind === 'none') return false
  if (data.baselineTotalCents == null) return false
  return data.baselineTotalCents !== data.finalTotalCents
}

/**
 * Returns a short human-readable label for the source kind.
 * Used as the "starting point" label in comparison UI.
 */
export function sourceLabelFor(kind: PricingSourceKind | null | undefined): string {
  switch (kind) {
    case 'chef_config_calculated':
      return 'Starting estimate'
    case 'recurring_default':
      return 'Standard rate'
    case 'booking_page':
      return 'Booking page price'
    case 'recurring_service':
      return 'Service rate'
    case 'series_session':
      return 'Series rate'
    case 'manual_only':
    case 'legacy':
    case null:
    case undefined:
      return 'Base price'
  }
}

/**
 * Returns the label for the final (chef-overridden) price side.
 */
export function finalLabelFor(kind: OverrideKind | null | undefined): string {
  switch (kind) {
    case 'per_person':
      return 'Chef rate'
    case 'custom_total':
      return 'Chef price'
    case 'none':
    case null:
    case undefined:
      return 'Final price'
  }
}

/**
 * Validates a PricingDecision for consistency.
 * Returns an error string if invalid, undefined if valid.
 */
export function validatePricingDecision(
  decision: PricingDecision | null | undefined,
  opts: { pricingModel?: string; guestCount?: number | null }
): string | undefined {
  if (!decision) return undefined
  const { overrideKind, pricingSourceKind } = decision

  if (overrideKind === 'custom_total' && opts.pricingModel === 'per_person') {
    return 'custom_total override is not compatible with per_person pricing model'
  }
  if (overrideKind === 'per_person' && !decision.baselinePricePerPersonCents) {
    return 'per_person override requires a baseline per-person rate'
  }
  if (overrideKind === 'per_person' && !opts.guestCount) {
    return 'per_person override requires a guest count'
  }
  return undefined
}

/**
 * Converts a DB row's snake_case pricing fields into PriceComparisonData.
 * Accepts a partial row - missing fields default to null/undefined.
 */
export function rowToPriceComparison(row: {
  quoted_price_cents?: number | null
  total_quoted_cents?: number | null
  price_per_person_cents?: number | null
  baseline_total_cents?: number | null
  baseline_price_per_person_cents?: number | null
  pricing_source_kind?: string | null
  override_kind?: string | null
  override_reason?: string | null
  pricing_context?: Record<string, unknown> | null
  guest_count_estimated?: number | null
  guest_count_actual?: number | null
}): PriceComparisonData {
  const finalTotalCents = (row.total_quoted_cents ?? row.quoted_price_cents) as number

  return {
    finalTotalCents,
    finalPricePerPersonCents: row.price_per_person_cents ?? null,
    baselineTotalCents: row.baseline_total_cents ?? null,
    baselinePricePerPersonCents: row.baseline_price_per_person_cents ?? null,
    pricingSourceKind: (row.pricing_source_kind as PricingSourceKind) ?? null,
    overrideKind: (row.override_kind as OverrideKind) ?? null,
    overrideReason: row.override_reason ?? null,
    pricingContext: row.pricing_context ?? null,
    guestCount: row.guest_count_actual ?? row.guest_count_estimated ?? null,
  }
}
