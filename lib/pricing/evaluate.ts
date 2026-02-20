// lib/pricing/evaluate.ts
//
// Master pricing evaluation — the single entry point that completely understands
// all of the chef's pricing and knows exactly how to apply it.
//
// Primary export: evaluateChefPricing()
// Secondary export: formatPricingForChef() (usable as standalone)
//
// Pure computation — no database, no network, no side effects.
// All amounts in cents (minor units).
//
// Rate source of truth:  lib/pricing/constants.ts
// Core pricing engine:   lib/pricing/compute.ts
// AI eligibility rules:  docs/agent-brain/04-PRICING.md

import {
  computePricing,
  formatPricingForEmail,
  formatCentsAsDollars,
  type PricingInput,
  type PricingBreakdown,
  type ServiceType,
} from './compute'

import {
  WEEKLY_RATES,
  DEPOSIT_PERCENTAGE,
  MINIMUM_BOOKING_CENTS,
  WEEKLY_COMMITMENT_MIN_DAYS,
  ADD_ON_CATALOG,
  MULTI_NIGHT_PACKAGES,
  IRS_MILEAGE_RATE_CENTS,
  WEEKEND_PREMIUM_PERCENT,
} from './constants'

// ─── Eligibility Context ─────────────────────────────────────────────────────
//
// Controls whether pricing may be presented to the client right now.
// Rules formalise docs/agent-brain/04-PRICING.md section "When Pricing Is Allowed".
// When omitted entirely, pricingAllowed defaults to true (no gate applied).

export interface PricingEligibilityContext {
  /**
   * Client explicitly asked for pricing — e.g. "how much does this cost?",
   * "what are your rates?", "can I get a quote?", "what's the budget?".
   */
  clientAskedForPricing: boolean

  /**
   * Client referenced prior pricing in this message
   * (e.g. "based on the quote you sent…").
   * Alternative trigger that permits pricing without an explicit new ask.
   */
  clientReferencedPriorPricing?: boolean

  /** Guest count has been stated — even as a range ("4–6 guests" counts) */
  guestCountKnown: boolean

  /** A date or date range is known — even approximate ("sometime in July" counts) */
  dateKnown: boolean

  /** City or town is known — needed for travel scoping */
  locationKnown: boolean

  /**
   * Is this a legitimate private chef inquiry — not spam, not unrelated,
   * not a question about general cooking techniques.
   * @default true
   */
  isLegitimateChefRequest?: boolean

  /**
   * Is the requested service type something the chef currently offers?
   * @default true
   */
  serviceTypeInScope?: boolean
}

// ─── Price Adjustment ─────────────────────────────────────────────────────────
//
// Allows the chef to apply a loyalty discount, surcharge, or total override
// on top of the computed price. The breakdown is always preserved as-is;
// only the final output numbers change.

export type PricingAdjustmentType =
  | 'loyalty_discount'  // subtract a fixed amount for returning clients
  | 'surcharge'         // add for extra complexity, extended time, etc.
  | 'custom_total'      // override the entire computed total (chef sets their own price)

export interface PricingAdjustment {
  type: PricingAdjustmentType

  /**
   * For loyalty_discount: amount to subtract (in cents).
   * For surcharge: amount to add (in cents).
   */
  amountCents?: number

  /**
   * For custom_total only: the total override amount.
   * Deposit will be recalculated as 50% of this value.
   */
  totalCents?: number

  /** Human-readable reason — shown in chef summary; may appear in pricing notes */
  reason: string
}

// ─── Evaluation Input ─────────────────────────────────────────────────────────

export interface PricingEvaluationInput {
  // ── Service details (mirrors PricingInput) ────────────────────────────────
  serviceType: ServiceType
  guestCount: number
  courseCount?: number         // required for private_dinner; ignored otherwise
  eventDate?: string           // ISO YYYY-MM-DD
  distanceMiles?: number
  multiNightPackage?: string   // key from MULTI_NIGHT_PACKAGES
  numberOfDays?: number        // for weekly service types
  weekendPremiumEnabled?: boolean
  addOns?: PricingInput['addOns']

  // ── AI eligibility gate ───────────────────────────────────────────────────
  /**
   * Omit this when pricing is always permitted (e.g. chef quoting tool).
   * Pass it when an AI agent is deciding whether to include pricing in a reply.
   */
  eligibility?: PricingEligibilityContext

  // ── Chef override ─────────────────────────────────────────────────────────
  /** Optional adjustment applied on top of the computed price */
  adjustment?: PricingAdjustment
}

// ─── Range Pricing ────────────────────────────────────────────────────────────
//
// Weekly services (weekly_standard, weekly_commitment) have rate ranges
// (e.g. $400–$500/day). The engine normally quotes the high end.
// This type exposes both ends so the chef can decide which to present.

export interface PricingRangeSide {
  label: 'low' | 'high'
  /** Per-day rate used for this side */
  dayRateCents: number
  /** Service fee = dayRateCents × numberOfDays */
  serviceFeeCents: number
  /** Subtotal = service + weekend premium + holiday premiums */
  subtotalCents: number
  /** Final total = subtotal + travel + add-ons (after minimum floor) */
  totalServiceCents: number
  /** 50% deposit of totalServiceCents */
  depositCents: number
  /** Balance due = totalServiceCents − depositCents */
  balanceCents: number
  /** Human-readable rate description for display */
  rateDescription: string
}

// ─── Evaluation Result ────────────────────────────────────────────────────────

export interface PricingEvaluationResult {
  // ── Eligibility ────────────────────────────────────────────────────────────

  /** true if pricing is permitted to be presented to this client right now */
  pricingAllowed: boolean

  /**
   * Why pricing cannot be shown (empty array when pricingAllowed = true).
   * Each string is a distinct reason; surface these to the AI for corrective action.
   */
  eligibilityFailReasons: string[]

  // ── Core computation ───────────────────────────────────────────────────────

  /**
   * Full deterministic pricing breakdown from the core engine.
   * Always computed regardless of pricingAllowed — chef can review numbers
   * even before presenting them to the client.
   */
  breakdown: PricingBreakdown

  // ── Range pricing ──────────────────────────────────────────────────────────

  /** true for weekly_standard and weekly_commitment (day rates have min/max) */
  hasRange: boolean

  /** Low end of pricing range (min day rate × numberOfDays + premiums) */
  rangeLow?: PricingRangeSide

  /**
   * High end of pricing range (max day rate × numberOfDays + premiums).
   * This matches breakdown.totalServiceCents — it is the quoted default.
   */
  rangeHigh?: PricingRangeSide

  // ── Final numbers (post-adjustment) ───────────────────────────────────────

  /**
   * Total in cents after any adjustment (discount / surcharge / override).
   * Equals breakdown.totalServiceCents when no adjustment is applied.
   */
  finalTotalCents: number

  /** Deposit = 50% of finalTotalCents */
  finalDepositCents: number

  /** Balance due = finalTotalCents − finalDepositCents */
  finalBalanceCents: number

  /** true when a loyalty_discount, surcharge, or custom_total was applied */
  adjustmentApplied: boolean

  /** Human-readable description of the adjustment (undefined when not applied) */
  adjustmentDescription?: string

  // ── Text outputs ───────────────────────────────────────────────────────────

  /**
   * Client-facing paragraph — ready to paste into an email.
   * Written in conversational tone; no tabular math; no internal notes.
   *
   * null when requiresCustomPricing = true (no computable number exists — caller
   * should prompt chef to set a manual price before presenting anything to the client).
   *
   * For weekly services with a day-rate range (weekly_standard / weekly_commitment),
   * this paragraph presents both the low and high end: "My weekly rate for 5 days
   * runs $2,000–$2,500, depending on schedule."
   */
  clientFacingText: string | null

  /**
   * Comprehensive internal breakdown for the chef to review before sending.
   * Shows every computation step, grocery estimates, pending confirmations,
   * and all internal notes. NEVER send this to a client.
   */
  chefSummaryText: string

  // ── Quote validity ─────────────────────────────────────────────────────────

  /** true when the engine cannot compute a final number (requires manual quote) */
  requiresCustomPricing: boolean

  /** Specific input errors that caused computation to fail or degrade */
  validationErrors: string[]

  // ── Action items ───────────────────────────────────────────────────────────

  /**
   * Prices or values needing chef confirmation before this quote goes live.
   * Examples: unconfirmed add-on prices, unpriced multi-night packages.
   */
  pendingConfirmations: string[]

  /**
   * Non-blocking notes for chef awareness.
   * Examples: large group feasibility, missing travel distance, holiday detected.
   */
  warnings: string[]

  /**
   * Checklist of what the chef should verify before sending this quote.
   * Displayed in the chef quote-review UI as a pre-send checklist.
   */
  chefChecklist: string[]
}

// ─── Internal: Resolved Adjustment ───────────────────────────────────────────

interface ResolvedAdjustment {
  applied: boolean
  finalTotalCents: number
  finalDepositCents: number
  finalBalanceCents: number
  description?: string
}

// ─── Main Function ────────────────────────────────────────────────────────────

/**
 * evaluateChefPricing — the master pricing evaluation function.
 *
 * This is the single entry point that completely understands all of the chef's
 * pricing and knows exactly how to apply it. Use this function whenever code needs to:
 *
 *   - Compute a price for any chef service
 *   - Decide whether pricing should be presented to a client (AI eligibility gate)
 *   - Produce client-facing text and a chef-internal breakdown simultaneously
 *   - Apply loyalty discounts, surcharges, or custom price overrides
 *   - Know what still needs the chef's confirmation before a quote goes live
 *   - Get range pricing for weekly services (min/max day rates)
 *
 * The pricing is entirely deterministic — no AI, no estimation, no guessing.
 * Every computation step is traceable through the returned breakdown and chefSummaryText.
 *
 * @example — Basic private dinner quote
 * ```ts
 * const result = await evaluateChefPricing({
 *   serviceType: 'private_dinner',
 *   guestCount: 4,
 *   courseCount: 4,
 *   eventDate: '2026-02-14',   // Valentine's Day → Tier 1 holiday
 *   distanceMiles: 15,
 *   weekendPremiumEnabled: true,
 * })
 * // result.finalTotalCents  → Valentine's Day price with weekend premium
 * // result.clientFacingText → paste-ready email paragraph
 * // result.chefSummaryText  → full internal breakdown with all steps
 * ```
 *
 * @example — With AI eligibility gate
 * ```ts
 * const result = await evaluateChefPricing({
 *   serviceType: 'private_dinner',
 *   guestCount: 2,
 *   courseCount: 5,
 *   eventDate: '2026-07-04',
 *   eligibility: {
 *     clientAskedForPricing: true,
 *     guestCountKnown: true,
 *     dateKnown: true,
 *     locationKnown: true,
 *   },
 * })
 * if (!result.pricingAllowed) return askClarifyingQuestion(result.eligibilityFailReasons)
 * return sendEmail(result.clientFacingText)
 * ```
 *
 * @example — Weekly service with range
 * ```ts
 * const result = await evaluateChefPricing({
 *   serviceType: 'weekly_standard',
 *   guestCount: 3,
 *   numberOfDays: 5,
 * })
 * // result.hasRange        → true
 * // result.rangeLow.totalServiceCents  → 5 days × $400/day = $2,000
 * // result.rangeHigh.totalServiceCents → 5 days × $500/day = $2,500
 * ```
 *
 * @example — With loyalty discount
 * ```ts
 * const result = await evaluateChefPricing({
 *   serviceType: 'private_dinner',
 *   guestCount: 6,
 *   courseCount: 3,
 *   adjustment: {
 *     type: 'loyalty_discount',
 *     amountCents: 10000,   // $100 off for returning client
 *     reason: 'Returning client — 3rd booking',
 *   },
 * })
 * // result.finalTotalCents     → computed total minus $100
 * // result.adjustmentApplied   → true
 * // result.adjustmentDescription → "Loyalty discount: −$100 (Returning client — 3rd booking)"
 * ```
 */
export async function evaluateChefPricing(
  input: PricingEvaluationInput
): Promise<PricingEvaluationResult> {
  const { eligibility, adjustment, weekendPremiumEnabled: inputWeekendPremium, ...rest } = input

  // ── weekendPremiumEnabled default ─────────────────────────────────────────
  // Chef-tool mode (eligibility omitted): default to true so Fri/Sat events are
  // correctly priced without the chef having to remember to pass the flag.
  // AI path (eligibility context present): keep false — the AI should never
  // silently apply a premium the client hasn't been told about.
  const weekendPremiumEnabled =
    inputWeekendPremium !== undefined
      ? inputWeekendPremium
      : eligibility === undefined // true = chef tool, false = AI path

  const pricingInput = { ...rest, weekendPremiumEnabled }

  // ── Step 1: Eligibility ────────────────────────────────────────────────────
  // Determines whether pricing may be presented to this client right now.
  // Rules from docs/agent-brain/04-PRICING.md. Always computed; never blocks
  // the downstream computation (breakdown is always returned for chef review).
  const { allowed: pricingAllowed, failReasons: eligibilityFailReasons } =
    assessEligibility(eligibility)

  // ── Step 2: Core pricing computation ──────────────────────────────────────
  // Deterministic. Returns a full PricingBreakdown regardless of eligibility.
  // computePricing() is declared async (no actual I/O; safe to await).
  const breakdown = await computePricing(pricingInput)

  // ── Step 3: Range pricing for weekly services ──────────────────────────────
  // weekly_standard and weekly_commitment have min/max day rates.
  // The core engine quotes the high end; we also compute the low end here.
  const rangeResult = computeWeeklyRange(pricingInput, breakdown)

  // ── Step 4: Apply adjustment (discount / surcharge / custom override) ──────
  const adjustmentResult = resolveAdjustment(adjustment, breakdown)

  // ── Step 5: Format text outputs ───────────────────────────────────────────
  // null when custom pricing is required (caller must gate on this before showing to client).
  // Range-aware paragraph for weekly services (both ends expressed).
  // Standard email paragraph for everything else.
  const clientFacingText: string | null = breakdown.requiresCustomPricing
    ? null
    : rangeResult.hasRange && rangeResult.low && rangeResult.high
    ? formatWeeklyRangeForEmail(breakdown, rangeResult.low, rangeResult.high)
    : formatPricingForEmail(breakdown)

  const chefSummaryText = formatPricingForChef(breakdown, {
    serviceType: input.serviceType,
    eventDate: input.eventDate,
    weekendPremiumEnabled, // resolved value — what the engine actually used, not raw input
    rangeLow: rangeResult.low,
    rangeHigh: rangeResult.high,
    adjustmentApplied: adjustmentResult.applied,
    adjustmentDescription: adjustmentResult.description,
    finalTotalCents: adjustmentResult.finalTotalCents,
    finalDepositCents: adjustmentResult.finalDepositCents,
    finalBalanceCents: adjustmentResult.finalBalanceCents,
  })

  // ── Step 6: Action items ──────────────────────────────────────────────────
  const pendingConfirmations = collectPendingConfirmations(pricingInput, breakdown)
  const warnings = collectWarnings(pricingInput, breakdown, adjustment)
  const chefChecklist = buildChefChecklist(breakdown, pricingInput, adjustmentResult)

  return {
    pricingAllowed,
    eligibilityFailReasons,
    breakdown,
    hasRange: rangeResult.hasRange,
    rangeLow: rangeResult.low,
    rangeHigh: rangeResult.high,
    finalTotalCents: adjustmentResult.finalTotalCents,
    finalDepositCents: adjustmentResult.finalDepositCents,
    finalBalanceCents: adjustmentResult.finalBalanceCents,
    adjustmentApplied: adjustmentResult.applied,
    adjustmentDescription: adjustmentResult.description,
    clientFacingText,
    chefSummaryText,
    requiresCustomPricing: breakdown.requiresCustomPricing,
    validationErrors: breakdown.validationErrors,
    pendingConfirmations,
    warnings,
    chefChecklist,
  }
}

// ─── Eligibility Assessment ───────────────────────────────────────────────────
// Implements the "when pricing is allowed" rules from docs/agent-brain/04-PRICING.md.

function assessEligibility(ctx?: PricingEligibilityContext): {
  allowed: boolean
  failReasons: string[]
} {
  // No context = no gate; allow by default (e.g. chef-initiated quoting tool)
  if (!ctx) return { allowed: true, failReasons: [] }

  const failReasons: string[] = []

  // ── Trigger: at least one of the three trigger conditions must be true ────
  // 1. Client explicitly asked for pricing / quote / cost / budget
  // 2. Client referenced prior pricing in their message
  // (3rd trigger — "question cannot be answered without pricing" — is handled
  //  by the AI agent and passed as clientAskedForPricing = true when applicable)
  const hasTrigger =
    ctx.clientAskedForPricing ||
    ctx.clientReferencedPriorPricing === true

  if (!hasTrigger) {
    failReasons.push(
      'Client has not asked for pricing — do not volunteer pricing unprompted'
    )
  }

  // ── Gate: all four context requirements must be met ───────────────────────
  if (!ctx.guestCountKnown) {
    failReasons.push('Guest count unknown — ask before quoting')
  }
  if (!ctx.dateKnown) {
    failReasons.push('Event date unknown — ask before quoting')
  }
  if (!ctx.locationKnown) {
    failReasons.push('Event location unknown — ask before quoting')
  }

  // ── Optional gates (fail only when explicitly set to false) ──────────────
  if (ctx.isLegitimateChefRequest === false) {
    failReasons.push('Inquiry is not classified as a legitimate private chef request')
  }
  if (ctx.serviceTypeInScope === false) {
    failReasons.push("Service type is outside the chef's current offerings")
  }

  return { allowed: failReasons.length === 0, failReasons }
}

// ─── Range Pricing ────────────────────────────────────────────────────────────
// Weekly services have min/max day rates. The engine quotes the high end by default.
// Here we compute the low end and expose both sides.

function computeWeeklyRange(
  input: PricingEvaluationInput,
  breakdown: PricingBreakdown
): { hasRange: boolean; low?: PricingRangeSide; high?: PricingRangeSide } {
  const weeklyRangeTypes: ServiceType[] = ['weekly_standard', 'weekly_commitment']

  // Only weekly services with a computable service fee get a range
  if (
    !weeklyRangeTypes.includes(input.serviceType) ||
    breakdown.requiresCustomPricing ||
    breakdown.serviceFeeCents === 0
  ) {
    return { hasRange: false }
  }

  const rates =
    input.serviceType === 'weekly_standard'
      ? WEEKLY_RATES.standard_day
      : WEEKLY_RATES.commitment_day

  const days = breakdown.numberOfDays

  // The breakdown was computed using the max rate; the high side mirrors it exactly.
  const high: PricingRangeSide = {
    label: 'high',
    dayRateCents: rates.max,
    serviceFeeCents: breakdown.serviceFeeCents,
    subtotalCents: breakdown.subtotalCents,
    totalServiceCents: breakdown.totalServiceCents,
    depositCents: breakdown.depositCents,
    balanceCents: breakdown.totalServiceCents - breakdown.depositCents,
    rateDescription: `${formatCentsAsDollars(rates.max)}/day × ${days} day${days > 1 ? 's' : ''} = ${formatCentsAsDollars(breakdown.serviceFeeCents)}`,
  }

  // Compute the low side by scaling all premium amounts proportionally.
  // This is valid because weekend premium and holiday premiums are both
  // percentage-based on serviceFeeCents, so they scale linearly with the day rate.
  const lowServiceFee = rates.min * days
  const scalingFactor = lowServiceFee / breakdown.serviceFeeCents // always ≤ 1

  const lowWeekendPremium = Math.round(breakdown.weekendPremiumCents * scalingFactor)
  const lowHolidayPremium = Math.round(breakdown.holidayPremiumCents * scalingFactor)
  const lowNearHolidayPremium = Math.round(breakdown.nearHolidayPremiumCents * scalingFactor)
  const lowSubtotal = lowServiceFee + lowWeekendPremium + lowHolidayPremium + lowNearHolidayPremium

  // Travel and add-ons are fixed (do not change with day rate choice)
  const lowPreTotal = lowSubtotal + breakdown.travelFeeCents + breakdown.addOnTotalCents

  // Apply minimum booking floor if needed (same rule as in computePricing)
  const lowTotal =
    lowSubtotal > 0 && lowSubtotal < MINIMUM_BOOKING_CENTS
      ? MINIMUM_BOOKING_CENTS + breakdown.travelFeeCents + breakdown.addOnTotalCents
      : lowPreTotal

  const lowDeposit = Math.round(lowTotal * DEPOSIT_PERCENTAGE)

  const low: PricingRangeSide = {
    label: 'low',
    dayRateCents: rates.min,
    serviceFeeCents: lowServiceFee,
    subtotalCents: lowSubtotal,
    totalServiceCents: lowTotal,
    depositCents: lowDeposit,
    balanceCents: lowTotal - lowDeposit,
    rateDescription: `${formatCentsAsDollars(rates.min)}/day × ${days} day${days > 1 ? 's' : ''} = ${formatCentsAsDollars(lowServiceFee)}`,
  }

  return { hasRange: true, low, high }
}

// ─── Adjustment Resolution ────────────────────────────────────────────────────

function resolveAdjustment(
  adjustment: PricingAdjustment | undefined,
  breakdown: PricingBreakdown
): ResolvedAdjustment {
  const baseTotal = breakdown.totalServiceCents
  const baseDeposit = breakdown.depositCents

  if (!adjustment) {
    return {
      applied: false,
      finalTotalCents: baseTotal,
      finalDepositCents: baseDeposit,
      finalBalanceCents: baseTotal - baseDeposit,
    }
  }

  let finalTotalCents: number

  switch (adjustment.type) {
    case 'loyalty_discount': {
      finalTotalCents = Math.max(0, baseTotal - (adjustment.amountCents ?? 0))
      break
    }
    case 'surcharge': {
      finalTotalCents = baseTotal + (adjustment.amountCents ?? 0)
      break
    }
    case 'custom_total': {
      finalTotalCents = adjustment.totalCents ?? baseTotal
      break
    }
    default:
      finalTotalCents = baseTotal
  }

  const finalDepositCents = Math.round(finalTotalCents * DEPOSIT_PERCENTAGE)
  const finalBalanceCents = finalTotalCents - finalDepositCents

  let description: string
  const delta = baseTotal - finalTotalCents // positive = client pays less

  switch (adjustment.type) {
    case 'loyalty_discount':
      description = `Loyalty discount: −${formatCentsAsDollars(Math.abs(delta))} (${adjustment.reason})`
      break
    case 'surcharge':
      description = `Surcharge: +${formatCentsAsDollars(Math.abs(delta))} (${adjustment.reason})`
      break
    case 'custom_total':
      description = `Custom total override: ${formatCentsAsDollars(finalTotalCents)} (${adjustment.reason})`
      break
    default:
      description = adjustment.reason
  }

  return {
    applied: true,
    finalTotalCents,
    finalDepositCents,
    finalBalanceCents,
    description,
  }
}

// ─── Pending Confirmations ────────────────────────────────────────────────────
// Items that need chef confirmation before the quote can go live.

function collectPendingConfirmations(
  input: PricingEvaluationInput,
  breakdown: PricingBreakdown
): string[] {
  const confirmations: string[] = []

  // Add-on catalog prices are all marked ⚠️ CONFIRM VALUE in constants.ts
  for (const line of breakdown.addOnLines) {
    if (line.key !== 'custom' && line.key in ADD_ON_CATALOG) {
      const unitDesc =
        line.type === 'per_person'
          ? `${formatCentsAsDollars(line.unitCents)}/person`
          : `${formatCentsAsDollars(line.unitCents)} flat`
      confirmations.push(
        `Add-on "${line.label}" priced at ${unitDesc} — verify this is still current before quoting`
      )
    }
  }

  // Multi-night packages with price = 0 (not yet confirmed by chef)
  if (input.serviceType === 'multi_night' && input.multiNightPackage) {
    const price = MULTI_NIGHT_PACKAGES[input.multiNightPackage]
    if (price === 0) {
      confirmations.push(
        `Multi-night package "${input.multiNightPackage}" has no confirmed price — set value in lib/pricing/constants.ts before quoting`
      )
    }
  }

  // Minimum booking floor was applied — remind chef to verify the floor amount is current
  if (breakdown.minimumApplied) {
    confirmations.push(
      `Minimum booking floor of ${formatCentsAsDollars(MINIMUM_BOOKING_CENTS)} was applied — confirm this minimum is still current`
    )
  }

  return confirmations
}

// ─── Warnings ─────────────────────────────────────────────────────────────────
// Non-blocking notes for chef awareness.

function collectWarnings(
  input: PricingEvaluationInput,
  breakdown: PricingBreakdown,
  adjustment?: PricingAdjustment
): string[] {
  const warnings: string[] = []

  // Large group — verify feasibility before committing
  if (breakdown.isLargeGroup && input.serviceType === 'private_dinner') {
    warnings.push(
      `Large group (${input.guestCount} guests) — verify kitchen space and logistics can support this before committing`
    )
  }

  // Holiday detected but pricing is custom — chef must manually factor it in
  if (breakdown.requiresCustomPricing && breakdown.holidayName) {
    warnings.push(
      `${breakdown.holidayName} (Tier ${breakdown.holidayTier}) detected — factor the holiday premium into your custom quote`
    )
  }

  // Near-holiday proximity for custom pricing
  if (breakdown.requiresCustomPricing && breakdown.isNearHoliday) {
    warnings.push(
      `Event is within proximity window of ${breakdown.nearHolidayName} — consider adding a proximity premium to your custom quote`
    )
  }

  // Weekly commitment below minimum days
  if (
    input.serviceType === 'weekly_commitment' &&
    (input.numberOfDays ?? 1) < WEEKLY_COMMITMENT_MIN_DAYS
  ) {
    warnings.push(
      `Commitment rate requires ${WEEKLY_COMMITMENT_MIN_DAYS}+ consecutive days — only ${input.numberOfDays ?? 1} provided. Consider using weekly_standard instead.`
    )
  }

  // No event date — holiday and weekend premiums not computed
  if (!input.eventDate) {
    warnings.push(
      'No event date provided — holiday detection and weekend premium not applied. Final price may be higher.'
    )
  }

  // No travel distance — travel fee is $0 (may be wrong)
  if (!input.distanceMiles || input.distanceMiles === 0) {
    warnings.push(
      'Travel distance not provided — travel fee set to $0. Confirm whether travel reimbursement applies.'
    )
  }

  // Loyalty discount brings total below minimum floor
  if (adjustment?.type === 'loyalty_discount' && adjustment.amountCents) {
    const adjustedTotal = Math.max(0, breakdown.totalServiceCents - adjustment.amountCents)
    if (adjustedTotal < MINIMUM_BOOKING_CENTS) {
      warnings.push(
        `Loyalty discount brings total to ${formatCentsAsDollars(adjustedTotal)}, below the ${formatCentsAsDollars(MINIMUM_BOOKING_CENTS)} minimum booking floor — confirm this is intentional`
      )
    }
  }

  return warnings
}

// ─── Chef Checklist ───────────────────────────────────────────────────────────
// What the chef should verify before sending this quote.

function buildChefChecklist(
  breakdown: PricingBreakdown,
  input: PricingEvaluationInput,
  adjustment: ResolvedAdjustment
): string[] {
  const checklist: string[] = []

  if (!breakdown.requiresCustomPricing) {
    checklist.push(
      `Review the total (${formatCentsAsDollars(adjustment.finalTotalCents)}) — does this feel right for this event?`
    )
    checklist.push(
      `Deposit: ${formatCentsAsDollars(adjustment.finalDepositCents)} (50% non-refundable) — client must pay this to lock the date`
    )
    checklist.push(
      `Balance: ${formatCentsAsDollars(adjustment.finalBalanceCents)} due 24 hours before service`
    )
  } else {
    checklist.push('Custom pricing required — set your price before creating a quote in the system')
  }

  if (input.eventDate) {
    checklist.push(`Confirm the event date with the client: ${input.eventDate}`)
  } else {
    checklist.push('Get the event date from the client before finalizing the quote')
  }

  if (input.distanceMiles && input.distanceMiles > 0) {
    checklist.push(
      `Travel fee: ${formatCentsAsDollars(breakdown.travelFeeCents)} (${input.distanceMiles} miles at $${(IRS_MILEAGE_RATE_CENTS / 100).toFixed(2)}/mile) — verify the distance is accurate`
    )
  } else {
    checklist.push('Confirm whether travel reimbursement applies and get the client address')
  }

  if (breakdown.holidayPremiumCents > 0 || breakdown.nearHolidayPremiumCents > 0) {
    const premiumTotal = breakdown.holidayPremiumCents + breakdown.nearHolidayPremiumCents
    const holidayLabel = breakdown.holidayName ?? breakdown.nearHolidayName ?? 'holiday'
    checklist.push(
      `Holiday premium of ${formatCentsAsDollars(premiumTotal)} applied for ${holidayLabel} — make sure the client understands`
    )
  }

  if (breakdown.addOnLines.length > 0) {
    const labels = breakdown.addOnLines.map((l) => l.label).join(', ')
    checklist.push(
      `Add-ons included: ${labels} — confirm the client requested these and the prices are current`
    )
  }

  checklist.push(
    'Groceries billed separately at actual receipt cost — remind the client if not already covered'
  )
  checklist.push(
    'Read the client-facing text before sending — tone should be warm and conversational, not transactional'
  )

  if (!adjustment.applied && breakdown.totalServiceCents > 0) {
    checklist.push(
      'Consider whether a loyalty discount applies (returning client, referral, special circumstance)'
    )
  }

  return checklist
}

// ─── Weekly Range Email Formatter ────────────────────────────────────────────
// Produces a client-facing paragraph for weekly_standard / weekly_commitment when
// both ends of the rate range are known. Presents low–high total rather than a
// single fixed number, since the day rate itself is a range by design.

function formatWeeklyRangeForEmail(
  breakdown: PricingBreakdown,
  low: PricingRangeSide,
  high: PricingRangeSide
): string {
  const lines: string[] = []
  const days = breakdown.numberOfDays
  const dayLabel = days === 1 ? '1 day' : `${days} days`

  // Opening: range total (includes all premiums, travel, add-ons already baked in)
  lines.push(
    `My weekly rate for ${dayLabel} runs ${formatCentsAsDollars(low.totalServiceCents)}–${formatCentsAsDollars(high.totalServiceCents)}, depending on the schedule — I work within a range rather than a single fixed daily rate.`
  )

  // Holiday note (premium is already included in both range totals — just explain the bump)
  if (breakdown.holidayPremiumCents > 0 && breakdown.holidayName) {
    lines.push(
      `Since this falls on ${breakdown.holidayName}, a holiday premium is already included in those figures.`
    )
  }
  if (breakdown.isNearHoliday && breakdown.nearHolidayName && breakdown.nearHolidayPremiumCents > 0) {
    lines.push(
      `This date falls just before ${breakdown.nearHolidayName}, so a proximity premium is included as well.`
    )
  }

  // Add-ons (included in the totals above)
  if (breakdown.addOnLines.length > 0) {
    const descriptions = breakdown.addOnLines.map(
      (line) => `${line.label} (${formatCentsAsDollars(line.totalCents)})`
    )
    lines.push(`Add-ons included in those totals: ${descriptions.join(', ')}.`)
  }

  // Travel (included in the totals above)
  if (breakdown.travelFeeCents > 0) {
    lines.push(`Travel reimbursement of ${formatCentsAsDollars(breakdown.travelFeeCents)} is included based on mileage.`)
  }

  // Groceries — always shown, always billed separately
  lines.push(
    `Groceries are billed separately at actual cost based on real receipts, usually in the ${formatCentsAsDollars(breakdown.estimatedGroceryCents.low)}–${formatCentsAsDollars(breakdown.estimatedGroceryCents.high)} range for a booking of ${dayLabel}.`
  )

  // Deposit / balance terms
  lines.push(
    `A ${breakdown.depositPercent}% non-refundable deposit locks the date, with the balance due ${breakdown.balanceDueHours} hours before service.`
  )

  return lines.join(' ')
}

// ─── Chef Summary Formatter ───────────────────────────────────────────────────

/**
 * Format a comprehensive internal pricing breakdown for the chef to review.
 * Shows every computation step, internal notes, grocery estimates,
 * pending confirmations, and warnings.
 *
 * ⚠️ NEVER send this output to a client — it contains internal numbers and notes.
 *
 * Can be called standalone with just a PricingBreakdown, or with the full
 * options object when called from evaluateChefPricing().
 */
export function formatPricingForChef(
  breakdown: PricingBreakdown,
  options?: {
    serviceType?: ServiceType
    eventDate?: string
    weekendPremiumEnabled?: boolean
    rangeLow?: PricingRangeSide
    rangeHigh?: PricingRangeSide
    adjustmentApplied?: boolean
    adjustmentDescription?: string
    finalTotalCents?: number
    finalDepositCents?: number
    finalBalanceCents?: number
  }
): string {
  const lines: string[] = []
  const divider = '─'.repeat(52)
  const opts = options ?? {}

  // ── Header ──────────────────────────────────────────────────────────────────
  lines.push('╔══ PRICING BREAKDOWN — INTERNAL (NOT FOR CLIENT) ══╗')
  lines.push('')

  // ── Service summary ─────────────────────────────────────────────────────────
  if (opts.serviceType) {
    lines.push(`Service:   ${serviceTypeLabel(opts.serviceType)}`)
  }
  lines.push(
    `Guests:    ${breakdown.guestCount} guest${breakdown.guestCount === 1 ? '' : 's'}` +
      (breakdown.isCouple ? '  (couples rate)' : '') +
      (breakdown.isLargeGroup ? '  (large group — confirm feasibility)' : '')
  )
  if (breakdown.courseCount !== undefined) {
    lines.push(`Courses:   ${breakdown.courseCount}`)
  }
  if (breakdown.numberOfDays > 1) {
    lines.push(`Days:      ${breakdown.numberOfDays}`)
  }
  if (opts.eventDate) {
    const dayLabel = breakdown.isWeekend ? ' (Fri/Sat)' : ''
    lines.push(`Date:      ${formatDate(opts.eventDate)}${dayLabel}`)
  }
  lines.push('')

  // ── Custom pricing flag ──────────────────────────────────────────────────────
  if (breakdown.requiresCustomPricing) {
    lines.push('⚠️  REQUIRES CUSTOM PRICING — no computed total')
    for (const err of breakdown.validationErrors) {
      lines.push(`   • ${err}`)
    }
    lines.push('')
  }

  // ── Computation steps ────────────────────────────────────────────────────────
  if (!breakdown.requiresCustomPricing && breakdown.serviceFeeCents > 0) {
    lines.push(divider)
    lines.push('COMPUTATION STEPS:')
    let step = 1

    // Base service fee — annotate which rate table and course count were used
    if (breakdown.pricingModel === 'per_person' && breakdown.perPersonCents > 0) {
      const rateTable = breakdown.isCouple ? 'Couples rate' : 'Group rate'
      const courseNote = breakdown.courseCount !== undefined ? `, ${breakdown.courseCount}-course` : ''
      lines.push(
        `  ${step++}. Base rate:    ${formatCentsAsDollars(breakdown.perPersonCents)}/person × ${breakdown.guestCount} = ${formatCentsAsDollars(breakdown.serviceFeeCents)}  [${rateTable}${courseNote}]`
      )
    } else {
      const dayNote = breakdown.numberOfDays > 1 ? ` × ${breakdown.numberOfDays} days` : ''
      lines.push(
        `  ${step++}. Service fee:  ${formatCentsAsDollars(breakdown.serviceFeeCents)}${dayNote}`
      )
    }

    // Weekend premium — show for ALL weekend events, whether applied or not
    if (breakdown.weekendPremiumCents > 0) {
      lines.push(
        `  ${step++}. Weekend (+${Math.round(breakdown.weekendPremiumPercent * 100)}%):  +${formatCentsAsDollars(breakdown.weekendPremiumCents)}`
      )
    } else if (breakdown.isWeekend) {
      // Event is on Fri/Sat but premium was not applied — show the opportunity cost
      const potential = Math.round(breakdown.serviceFeeCents * WEEKEND_PREMIUM_PERCENT)
      const reason =
        opts.weekendPremiumEnabled === false
          ? 'opt-in disabled'
          : 'weekendPremiumEnabled not passed — consider enabling'
      lines.push(
        `  ${step++}. Weekend premium: not applied (${reason}) — would add +${formatCentsAsDollars(potential)}`
      )
    }

    // Exact holiday premium
    if (breakdown.holidayPremiumCents > 0) {
      lines.push(
        `  ${step++}. ${breakdown.holidayName} — Tier ${breakdown.holidayTier} (+${Math.round(breakdown.holidayPremiumPercent * 100)}%):  +${formatCentsAsDollars(breakdown.holidayPremiumCents)}`
      )
    } else if (breakdown.holidayName && breakdown.requiresCustomPricing) {
      lines.push(
        `  ${step++}. ${breakdown.holidayName} detected — factor Tier ${breakdown.holidayTier} premium into custom quote`
      )
    }

    // Near-holiday proximity premium
    if (breakdown.nearHolidayPremiumCents > 0) {
      lines.push(
        `  ${step++}. Near ${breakdown.nearHolidayName} (proximity, half-rate):  +${formatCentsAsDollars(breakdown.nearHolidayPremiumCents)}`
      )
    } else if (breakdown.isNearHoliday) {
      lines.push(
        `  ${step++}. Near ${breakdown.nearHolidayName} — factor proximity premium into custom quote`
      )
    }

    // Subtotal (after premiums, before travel and add-ons)
    lines.push(
      `  ${step++}. Subtotal (service + premiums):   ${formatCentsAsDollars(breakdown.subtotalCents)}`
    )

    // Travel fee
    if (breakdown.travelFeeCents > 0) {
      lines.push(
        `  ${step++}. Travel:       ${breakdown.distanceMiles} mi × $${(IRS_MILEAGE_RATE_CENTS / 100).toFixed(2)}/mi = ${formatCentsAsDollars(breakdown.travelFeeCents)}`
      )
    } else {
      lines.push(`  ${step++}. Travel:       $0 (no distance provided or no travel)`)
    }

    // Add-on line items
    for (const line of breakdown.addOnLines) {
      const unitNote =
        line.type === 'per_person'
          ? `${formatCentsAsDollars(line.unitCents)}/person × ${line.quantity}`
          : `flat`
      lines.push(
        `  ${step++}. Add-on [${line.label}]: ${unitNote} = ${formatCentsAsDollars(line.totalCents)}`
      )
    }

    // Minimum booking floor
    if (breakdown.minimumApplied) {
      lines.push(
        `  ${step++}. Minimum floor applied → raised to ${formatCentsAsDollars(MINIMUM_BOOKING_CENTS)}`
      )
    }

    // Final total and deposit
    lines.push(`  ${step++}. TOTAL:        ${formatCentsAsDollars(breakdown.totalServiceCents)}`)
    lines.push(`  ${step++}. Deposit (50%): ${formatCentsAsDollars(breakdown.depositCents)}`)
    lines.push(
      `  ${step++}. Balance due:  ${formatCentsAsDollars(breakdown.totalServiceCents - breakdown.depositCents)}  (24 hours before service)`
    )
    lines.push('')
  }

  // ── Applied adjustment ───────────────────────────────────────────────────────
  if (opts.adjustmentApplied && opts.adjustmentDescription) {
    lines.push(divider)
    lines.push('PRICE ADJUSTMENT:')
    lines.push(`  ${opts.adjustmentDescription}`)
    if (opts.finalTotalCents !== undefined) {
      lines.push(`  → Adjusted total:    ${formatCentsAsDollars(opts.finalTotalCents)}`)
    }
    if (opts.finalDepositCents !== undefined) {
      lines.push(`  → Adjusted deposit:  ${formatCentsAsDollars(opts.finalDepositCents)}`)
    }
    if (opts.finalBalanceCents !== undefined) {
      lines.push(`  → Balance due:       ${formatCentsAsDollars(opts.finalBalanceCents)}`)
    }
    lines.push('')
  }

  // ── Rate range (weekly services only) ────────────────────────────────────────
  if (opts.rangeLow && opts.rangeHigh) {
    lines.push(divider)
    lines.push('RATE RANGE (weekly service — chef may offer low or high end):')
    lines.push(
      `  Low  (${formatCentsAsDollars(opts.rangeLow.dayRateCents)}/day):  ${opts.rangeLow.rateDescription}`
    )
    lines.push(
      `    Total: ${formatCentsAsDollars(opts.rangeLow.totalServiceCents)}  |  Deposit: ${formatCentsAsDollars(opts.rangeLow.depositCents)}`
    )
    lines.push(
      `  High (${formatCentsAsDollars(opts.rangeHigh.dayRateCents)}/day): ${opts.rangeHigh.rateDescription}`
    )
    lines.push(
      `    Total: ${formatCentsAsDollars(opts.rangeHigh.totalServiceCents)}  |  Deposit: ${formatCentsAsDollars(opts.rangeHigh.depositCents)}`
    )
    lines.push(`  Default quoted: high end`)
    lines.push('')
  }

  // ── Internal grocery estimate ─────────────────────────────────────────────────
  lines.push(divider)
  lines.push('INTERNAL GROCERY ESTIMATE  ⚠️  DO NOT SHOW TO CLIENT:')
  const groceryNote = breakdown.numberOfDays > 1 ? ` (for ${breakdown.numberOfDays} days)` : ''
  lines.push(
    `  ${formatCentsAsDollars(breakdown.estimatedGroceryCents.low)} – ${formatCentsAsDollars(breakdown.estimatedGroceryCents.high)}${groceryNote}`
  )
  lines.push(`  Actual cost billed at receipt cost — no markup.`)
  lines.push('')

  // ── Engine notes ─────────────────────────────────────────────────────────────
  if (breakdown.notes.length > 0) {
    lines.push(divider)
    lines.push('NOTES:')
    for (const note of breakdown.notes) {
      lines.push(`  • ${note}`)
    }
    lines.push('')
  }

  // ── Validation errors ─────────────────────────────────────────────────────────
  if (breakdown.validationErrors.length > 0) {
    lines.push(divider)
    lines.push('⚠️  VALIDATION ERRORS:')
    for (const err of breakdown.validationErrors) {
      lines.push(`  • ${err}`)
    }
    lines.push('')
  }

  lines.push('╚═══════════════════════════════════════════════════╝')

  return lines.join('\n')
}

// ─── Public Helpers ───────────────────────────────────────────────────────────

/**
 * Returns true when the evaluation result is safe to persist as a quote and
 * present to a client.
 *
 * Fails when:
 *   - The engine requires custom pricing (no computable total)
 *   - The final total is zero or negative
 *   - There are hard validation errors on the input
 *
 * Note: pendingConfirmations and warnings do NOT block quoting — they are
 * advisory. The chef decides whether to proceed with unconfirmed catalog prices.
 *
 * Note: pricingAllowed (the AI eligibility gate) is intentionally NOT part of
 * this check. A chef can create a quote at any time; the eligibility gate only
 * controls whether the AI includes pricing in an email reply.
 */
export function isQuotable(result: PricingEvaluationResult): boolean {
  return (
    !result.requiresCustomPricing &&
    result.finalTotalCents > 0 &&
    result.validationErrors.length === 0
  )
}

/**
 * Generate a concise single-line summary of the pricing result.
 * Suitable for activity feeds, quote lists, inquiry summaries, and notifications.
 *
 * @example
 * "4-course dinner for 4 on Valentine's Day — $1,366 total"
 * "5-course dinner for 2 (near Mother's Day) — $720 total (adjusted)"
 * "Weekly Standard — 5 days for 3 — $2,500 total"
 * "Custom pricing required — 16-guest buyout"
 */
export function generateQuoteSummary(
  result: PricingEvaluationResult,
  options?: { serviceType?: ServiceType }
): string {
  const { breakdown } = result

  if (result.requiresCustomPricing) {
    const reason = breakdown.validationErrors[0] ?? breakdown.notes[0] ?? 'manual pricing required'
    return `Custom pricing required — ${reason}`
  }

  const parts: string[] = []

  // Service type label
  if (options?.serviceType) {
    parts.push(serviceTypeLabel(options.serviceType))
  }

  // Service description: course-count dinner, weekly days, or generic guest count
  if (breakdown.courseCount !== undefined && breakdown.pricingModel === 'per_person') {
    parts.push(`${breakdown.courseCount}-course for ${breakdown.guestCount}`)
  } else if (breakdown.numberOfDays > 1) {
    parts.push(`${breakdown.numberOfDays} days for ${breakdown.guestCount}`)
  } else {
    parts.push(`for ${breakdown.guestCount} guest${breakdown.guestCount === 1 ? '' : 's'}`)
  }

  // Holiday context
  if (breakdown.holidayName) {
    parts.push(`on ${breakdown.holidayName}`)
  } else if (breakdown.isNearHoliday && breakdown.nearHolidayName) {
    parts.push(`(near ${breakdown.nearHolidayName})`)
  }

  // Total — use finalTotalCents to reflect any adjustments
  parts.push(`— ${formatCentsAsDollars(result.finalTotalCents)} total`)

  if (result.adjustmentApplied) {
    parts.push('(adjusted)')
  }

  return parts.join(' ')
}

// ─── Private Utilities ────────────────────────────────────────────────────────

const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  private_dinner: 'Private Dinner',
  pizza_experience: 'Brick-Fired Pizza Experience',
  weekly_standard: 'Weekly Standard',
  weekly_commitment: 'Weekly Commitment Rate',
  cook_and_leave: 'Cook & Leave',
  multi_night: 'Multi-Night Package',
  custom: 'Custom Service',
}

function serviceTypeLabel(serviceType: ServiceType): string {
  return SERVICE_TYPE_LABELS[serviceType] ?? serviceType
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}
