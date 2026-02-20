# Pricing Evaluate — Implementation Doc

**File:** `lib/pricing/evaluate.ts`
**Date:** 2026-02-19
**Branch:** `feature/packing-list-system`

---

## Why This Was Built

The existing pricing system had three separate layers:

1. `validatePricingInput()` — pre-validates inputs
2. `computePricing()` — computes the full breakdown
3. `formatPricingForEmail()` — formats client-facing text

Every caller had to wire these together manually, and several things were missing:

- **No eligibility gate** — the "when is pricing allowed" rules in `docs/agent-brain/04-PRICING.md` existed only as prose, not callable code
- **No range pricing** — weekly rates have min/max day rates (`$400–$500/day`) but the engine always quoted the high end with no way to surface the low end
- **No chef-facing breakdown** — there was a client-facing `formatPricingForEmail()` but nothing showing the chef all the internal computation steps, grocery estimates, and pending confirmations in one view
- **No adjustment support** — no way to apply a loyalty discount, surcharge, or custom override on top of the computed price
- **No master entry point** — callers had to know the full pipeline and call each piece independently

`evaluateChefPricing()` is that master entry point. It handles everything in one call.

---

## What Changed

**Initial commit:** `lib/pricing/evaluate.ts` — new file, purely additive. No existing files modified.

**Follow-up session changes** (all in `evaluate.ts`):

1. **`clientFacingText: string | null`** — Changed from `string` to `string | null`. Returns `null` when `requiresCustomPricing` is true, so callers can distinguish "no number exists" from "empty text". Previously returned an empty string, which callers could not distinguish from intentional blank output.

2. **`weekendPremiumEnabled` auto-default** — In chef-tool mode (no `eligibility` context), `weekendPremiumEnabled` now defaults to `true` when not explicitly passed. In AI path (eligibility context present), still defaults to `false`. Prevents the chef from accidentally quoting a Fri/Sat event without the premium.

3. **Range-aware `clientFacingText` for weekly services** — When `hasRange` is true (`weekly_standard` / `weekly_commitment`), the client-facing paragraph now presents both ends: "My weekly rate for 5 days runs $2,000–$2,500, depending on the schedule." Previously quoted only the high end (what `computePricing()` computed).

4. **`formatPricingForChef()` improvements:**
   - Weekend premium opportunity cost shown even when not applied (visibility gap fix)
   - Base rate line annotates which rate table and course count was used (`[Group rate, 4-course]`)

5. **New helper exports:** `isQuotable()`, `generateQuoteSummary()`

6. **Unit tests:** `tests/unit/pricing.evaluate.test.ts` — 60 tests covering all paths

---

## Primary Export: `evaluateChefPricing()`

```typescript
evaluateChefPricing(input: PricingEvaluationInput): Promise<PricingEvaluationResult>
```

One function. Internally it runs six steps:

1. **Eligibility check** — formalises the rules from `04-PRICING.md` into `assessEligibility()`
2. **Core computation** — calls the existing `computePricing()` engine
3. **Range pricing** — computes low/high ends for weekly services (`computeWeeklyRange()`)
4. **Adjustment** — applies any loyalty discount, surcharge, or custom override
5. **Text formatting** — produces both `clientFacingText` and `chefSummaryText`
6. **Action items** — collects pending confirmations, warnings, and a pre-send checklist

### Input

```typescript
interface PricingEvaluationInput {
  serviceType: ServiceType     // required
  guestCount: number           // required
  courseCount?: number         // required for private_dinner
  eventDate?: string           // ISO YYYY-MM-DD
  distanceMiles?: number
  multiNightPackage?: string
  numberOfDays?: number        // for weekly types
  weekendPremiumEnabled?: boolean
  addOns?: AddOnInput[]
  eligibility?: PricingEligibilityContext  // AI gate; omit to always allow
  adjustment?: PricingAdjustment           // discount / surcharge / override
}
```

### Result (key fields)

| Field | What it is |
|-------|-----------|
| `pricingAllowed` | Whether pricing can be shown to client right now |
| `eligibilityFailReasons` | Why not (empty when allowed) |
| `breakdown` | Full `PricingBreakdown` from the engine — always computed |
| `hasRange` | true for weekly_standard / weekly_commitment |
| `rangeLow` / `rangeHigh` | Low and high sides of weekly day rate range |
| `finalTotalCents` | Total after any adjustment |
| `finalDepositCents` | 50% of finalTotal |
| `finalBalanceCents` | Remaining balance |
| `adjustmentApplied` | Whether an adjustment was applied |
| `clientFacingText` | Paste-ready email paragraph (`null` when requiresCustomPricing) |
| `chefSummaryText` | Full internal breakdown (never send to client) |
| `requiresCustomPricing` | Engine couldn't compute a final number |
| `validationErrors` | Specific input errors |
| `pendingConfirmations` | Prices needing chef confirmation before quoting |
| `warnings` | Non-blocking notes (feasibility, missing data, etc.) |
| `chefChecklist` | Pre-send verification list |

---

## Secondary Export: `formatPricingForChef()`

```typescript
formatPricingForChef(breakdown: PricingBreakdown, options?: {...}): string
```

Can be called standalone with just a `PricingBreakdown`. The options object adds:
- Rate range display (low/high sides)
- Adjustment summary
- Service type label and formatted date

Output is a multi-section plain text block covering every computation step, internal grocery estimates, and all notes. Marked clearly as internal — never send to client.

**Chef summary improvements added in this session:**

- **Weekend premium visibility** — when an event is on Fri/Sat but the premium wasn't applied, the summary now shows the missed opportunity: `Weekend premium: not applied (weekendPremiumEnabled not passed) — would add +$X`. Previously this line was silently absent.
- **Rate table annotation** — the base rate line now includes which rate table and course count was used: `Base rate: $185/person × 4 = $740  [Group rate, 4-course]`. Previously it showed only the math with no context.

---

## Helper Exports

### `isQuotable(result: PricingEvaluationResult): boolean`

Returns `true` when the evaluation result is safe to persist as a quote and present to a client.

Fails when:

- `requiresCustomPricing` is true (no computable total)
- `finalTotalCents` is zero or negative
- `validationErrors` is non-empty

Does **not** gate on:

- `pendingConfirmations` or `warnings` — advisory only; chef decides
- `pricingAllowed` — the AI eligibility gate controls whether the AI includes pricing in an email reply; chefs can create quotes at any time

```typescript
const result = await evaluateChefPricing(input)
if (!isQuotable(result)) {
  // surface pendingConfirmations / validationErrors to chef for resolution
} else {
  await createQuoteFromPricingInput({ totalCents: result.finalTotalCents, ... })
}
```

---

### `generateQuoteSummary(result, options?): string`

Returns a concise single-line description of the evaluation. Suitable for activity feeds, quote lists, inquiry summaries, and notifications.

Examples:

```
"4-course for 4 on Valentine's Day — $1,366 total"
"5-course for 2 (near Mother's Day) — $720 total (adjusted)"
"Weekly Standard — 5 days for 3 — $2,500 total"
"Custom pricing required — large tasting menu (8+ guests)"
```

The summary reflects `finalTotalCents` (post-adjustment) and appends `(adjusted)` when a loyalty discount, surcharge, or custom override was applied.

---

## weekendPremiumEnabled Behavior

`weekendPremiumEnabled` has different defaults depending on call context:

| Context | Default |
| ------- | ------- |
| No `eligibility` passed (chef quoting tool) | `true` — apply on Fri/Sat automatically |
| `eligibility` context passed (AI path) | `false` — must be explicit opt-in |
| Explicitly passed either way | Explicit value is always respected |

**Rationale:** The chef is building a real quote and needs to see the accurate price. The AI should never silently apply a premium the client hasn't been told about.

When `weekendPremiumEnabled` defaults to `true` but no `eventDate` is passed, `isWeekend` remains `false` and no premium fires — this is safe.

---

## clientFacingText — Range Behavior

For weekly services (`weekly_standard`, `weekly_commitment`), `clientFacingText` presents both ends of the rate range instead of quoting only the high end:

> My weekly rate for 5 days runs $2,000–$2,500, depending on the schedule — I work within a range rather than a single fixed daily rate. Groceries are billed separately...

The low and high totals in the paragraph are complete figures: they include any weekend/holiday premiums, travel, and add-ons already baked in. The chef uses `rangeLow` and `rangeHigh` in the result to see the per-day rate breakdown for each side.

Returns `null` (not an empty string) when `requiresCustomPricing` is true. Callers should gate on this:

```typescript
if (result.clientFacingText === null) {
  // block sending — show validationErrors to chef
}
```

---

## Eligibility Assessment

`assessEligibility()` formalises the rules from `docs/agent-brain/04-PRICING.md`:

**Trigger (at least one must be true):**
- `clientAskedForPricing: true`
- `clientReferencedPriorPricing: true`

**Gate (all must be true):**
- `guestCountKnown: true`
- `dateKnown: true`
- `locationKnown: true`
- `isLegitimateChefRequest !== false`
- `serviceTypeInScope !== false`

When `eligibility` is omitted entirely, `pricingAllowed` is always `true` (chef-initiated quoting tool doesn't need the gate).

---

## Range Pricing

Weekly services (`weekly_standard`, `weekly_commitment`) have min/max day rates:

```
standard_day:   $400–$500/day
commitment_day: $300–$350/day
```

The core engine always uses the max. `computeWeeklyRange()` computes the low side by:

1. Computing `lowServiceFee = rates.min × numberOfDays`
2. Scaling all premiums (weekend, holiday, near-holiday) proportionally using `scalingFactor = lowServiceFee / breakdown.serviceFeeCents`
3. Applying the same travel fee and add-on totals (they don't change with day rate)
4. Applying the minimum booking floor if needed

This is correct because weekend and holiday premiums are percentage-based on `serviceFeeCents`, so they scale linearly with the day rate.

**Result:** `rangeLow` and `rangeHigh` in the evaluation result. The `breakdown` always reflects the high end (what `computePricing()` computed). The chef can choose to offer the low end for preferred clients.

---

## Adjustments

Three types:

| Type | Effect |
|------|--------|
| `loyalty_discount` | Subtracts `amountCents` from total. Deposit recalculated on new total. |
| `surcharge` | Adds `amountCents` to total. Deposit recalculated on new total. |
| `custom_total` | Replaces entire computed total with `totalCents`. Deposit recalculated. |

The original `breakdown.totalServiceCents` is preserved. Only `finalTotalCents`, `finalDepositCents`, `finalBalanceCents` reflect the adjustment.

---

## Pending Confirmations

Collected from the breakdown and input:

- **Add-on catalog prices** — all ADD_ON_CATALOG entries are marked `⚠️ CONFIRM VALUE` in constants.ts; any used add-on surfaces a confirmation prompt
- **Unpriced multi-night packages** — 3-night and 4-night packages have `price = 0` (placeholder); these always surface
- **Minimum booking floor** — if it was applied, remind chef to verify the $300 floor is current

---

## How It Connects to the System

| System | How it uses this |
|--------|-----------------|
| **Chef quote form** | Call `evaluateChefPricing()` on form submission; gate on `requiresCustomPricing`; show `chefSummaryText` for review; submit `finalTotalCents` to `createQuoteFromPricingInput()` |
| **AI agent brain** | Pass `eligibility` context; gate response on `pricingAllowed`; use `clientFacingText` as the pricing paragraph |
| **Event detail page** | Call with no eligibility context to always compute; display breakdown for chef |
| **Inquiry response composer** | Use `pricingAllowed` to decide whether to show pricing in draft reply |

---

## What This Does NOT Change

- `lib/pricing/constants.ts` — unchanged
- `lib/pricing/compute.ts` — unchanged
- `lib/quotes/actions.ts` — unchanged; `createQuoteFromPricingInput()` is still the DB write path

---

## Items Still Pending Chef Confirmation

These come from constants.ts and are surfaced through `pendingConfirmations` in every evaluation that uses them:

| Item | Current Value | Status |
|------|---------------|--------|
| Wine pairing | $35/person | Confirm |
| Charcuterie board | $150 flat | Confirm |
| Extra appetizer course | $25/person | Confirm |
| Birthday dessert | $75 flat | Confirm |
| 3-night packages (×4 variants) | $0 placeholder | Set actual price |
| 4-night packages (×4 variants) | $0 placeholder | Set actual price |
| Minimum booking floor | $300 | Confirm |
