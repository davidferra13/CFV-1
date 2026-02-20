# Pricing Engine V2 — Implementation Changelog

**Date:** 2026-02-19
**Files changed:** `lib/pricing/constants.ts`, `lib/pricing/compute.ts`, `docs/agent-brain/04-PRICING.md`

---

## Why This Change Was Made

The original `computePricing()` handled the happy path well but had several silent bugs and
coverage gaps that would produce wrong or meaningless output without any indication to the caller.
The goal of V2 is simple: every possible input combination now results in either a fully-computed,
correct `PricingBreakdown` **or** an explicit `requiresCustomPricing: true` with descriptive
`validationErrors[]` explaining why. No silent $0. No wrong totals. No ambiguous states.

---

## Bugs Fixed

### Bug 1 — Solo client (`guestCount = 1`) priced at group rate
**Before:** `isCouple = guestCount === 2` — a 1-person booking fell through to `GROUP_RATES`,
producing the wrong per-person rate.
**After:** `isCouple = guestCount <= 2 && guestCount >= 1` — solo clients use `COUPLES_RATES` and
receive a note: *"Solo guest — priced at couples rate (1 person)"*.

### Bug 2 — `courseCount` outside 3–5 silently returned `$0`
**Before:** When `courseCount` had no entry in the rate table, `perPersonCents = 0` and
`serviceFeeCents = 0` — but `pricingModel` was set to `'custom'`. The caller had no reliable way
to distinguish "this is a custom booking with no price yet" from "something went wrong."
**After:** `requiresCustomPricing = true` is set explicitly, the note is unambiguous, and
`validationErrors` contains a pre-check warning from `validatePricingInput()`.

### Bug 3 — Weekly service types always computed a single day's rate
**Before:** No `numberOfDays` parameter existed. `weekly_standard` for 7 days produced the same
total as `weekly_standard` for 1 day.
**After:** `numberOfDays?: number` added to `PricingInput` (defaults to 1). All weekly types
multiply by `numberOfDays`. Grocery estimate also scales for multi-day bookings.

### Bug 4 — `weekly_commitment` had no minimum days guard
**Before:** A 2-day booking could silently receive the commitment rate (which requires 5+
consecutive days in the same home).
**After:** `validatePricingInput()` emits an error when `numberOfDays < WEEKLY_COMMITMENT_MIN_DAYS`.
The runtime also adds a note to the breakdown.

### Bug 5 — `multi_night` silently defaulted to `two_night_4_course`
**Before:** If no `multiNightPackage` key was provided, the engine used `'two_night_4_course'`
as a default — quoting a specific package the client never asked for.
**After:** Missing key → `requiresCustomPricing = true` + explicit error. Unknown key → same.
Placeholder-value key (0 cents, not yet confirmed) → same.

### Bug 6 — Large groups and buyouts had no distinct handling
**Before:** A 20-guest booking would silently run `GROUP_RATES[courseCount] × 20`, producing a
number the chef would never actually charge for a buyout event.
**After:**
- 8–14 guests: `isLargeGroup = true`, standard group rates still computed but flagged with a
  confirmation note.
- 15+ guests: `requiresCustomPricing = true` immediately, bypassing all rate tables.

---

## New Capabilities

### New Year's Day (Jan 1) — Tier 1 Holiday
Added to `TIER_1_HOLIDAYS` in `compute.ts`. Also added to the Tier 1 list in
`docs/agent-brain/04-PRICING.md`.

### Holiday Proximity Detection
Events that fall 1–2 days *before* a Tier 1 or Tier 2 holiday now receive a **half-premium**.
- Proximity premium = `tier.default / 2` applied to `serviceFeeCents + weekendPremiumCents`
- Proximity and exact-match are **mutually exclusive** — the proximity check only runs when
  `detectHoliday()` returns null for the event date
- Examples: Dec 23 → near Christmas Eve (Tier 1, half-rate); Feb 13 → near Valentine's Day
  (Tier 1, half-rate); Jul 3 → near Fourth of July (Tier 2, half-rate)
- Constant: `HOLIDAY_PROXIMITY_DAYS = 2` in `constants.ts`

### Weekend Premium (opt-in)
- Configurable via `WEEKEND_PREMIUM_PERCENT = 0.10` (10%) in `constants.ts`
- Activated per-call via `weekendPremiumEnabled?: boolean` in `PricingInput` (default `false`)
- Applied to `serviceFeeCents` before holiday premiums stack on top
- `isWeekend: boolean` always populated in the breakdown (useful for UI display even when premium
  is not applied)

### Multi-Night 3-Night and 4-Night Package Slots
New keys added to `MULTI_NIGHT_PACKAGES`: `three_night_*` and `four_night_*` for 3-course,
4-course, 5-course, and mixed variants.
**⚠️ All values are currently set to 0 (placeholder).** These will trigger `requiresCustomPricing`
until the chef confirms the actual prices and sets them in `constants.ts`.

### Add-On Line Items
`PricingInput` now accepts `addOns?: AddOnInput[]`. Each add-on can be:
- A **catalog key** (from `ADD_ON_CATALOG` in constants.ts): `wine_pairing`, `charcuterie_board`,
  `extra_appetizer_course`, `birthday_dessert`
- A **custom add-on** with fully specified label, type, and price

The breakdown returns `addOnLines: ComputedAddOnLine[]` and `addOnTotalCents: number`.
Add-ons are included in `totalServiceCents` and therefore in `depositCents`.
Travel and add-ons are **not** subject to holiday or weekend premiums.

**⚠️ All catalog prices are placeholders — confirm before shipping:**
```
wine_pairing:           $35/person
charcuterie_board:      $150 flat
extra_appetizer_course: $25/person
birthday_dessert:       $75 flat
```

### Minimum Booking Floor
`MINIMUM_BOOKING_CENTS = 30000` ($300) in `constants.ts`.
If `subtotalCents` (service + premiums) falls below this threshold, it is raised to the minimum.
`minimumApplied: true` is set in the breakdown and a note explains the adjustment.
The floor applies to the **service fee only** — travel and add-ons are added on top.
The floor does **not** apply when `requiresCustomPricing = true`.
**⚠️ Confirm the $300 minimum value with the chef.**

### `validatePricingInput()` — New Export
Available for pre-validation in UI forms before calling `computePricing()`. Returns
`{ valid: boolean; errors: string[] }`. Never throws.

### Enriched `PricingBreakdown` Output
New fields (all backward-compatible additions):
```typescript
isNearHoliday: boolean
nearHolidayName: string | null
nearHolidayPremiumCents: number
isWeekend: boolean
weekendPremiumPercent: number
weekendPremiumCents: number
addOnLines: ComputedAddOnLine[]
addOnTotalCents: number
minimumApplied: boolean
isLargeGroup: boolean
requiresCustomPricing: boolean
numberOfDays: number
validationErrors: string[]
balanceDueHours: number   // always 24
```

---

## Pricing Computation Order

The pipeline order in `computePricing()` is intentional and must be preserved:

1. **Validate** — collect all errors before touching arithmetic
2. **Guest classification** — solo/couple/large group/buyout determined once, used everywhere
3. **Resolve `numberOfDays`** — before rate table multiplication
4. **Base service fee** — rate table lookup by service type
5. **Weekend premium** — on `serviceFeeCents` (before holiday stacks on top)
6. **Holiday detection** — on `serviceFeeCents + weekendPremiumCents`; exact match OR proximity (never both)
7. **Subtotal** — service + weekend + holiday premiums
8. **Travel fee** — flat addition, not subject to premiums
9. **Add-ons** — flat addition, not subject to premiums
10. **Minimum floor** — only on subtotal (not travel/add-ons)
11. **Deposit** — 50% of final `totalServiceCents` (after floor)
12. **Grocery estimate** — informational only, scales for multi-day

---

## How It Connects to the System

- **Quote creation** (`lib/quotes/actions.ts`): `generateQuoteFromPricing()` now surfaces
  `_requiresCustomPricing` and `_validationErrors` — callers should guard against persisting a
  quote when custom pricing is required.
- **AI brain** (`lib/ai/agent-brain.ts`): imports `generateRateCardString()` which now includes
  weekend premium info, the dynamic add-on catalog, and the minimum booking floor.
- **Email formatting**: `formatPricingForEmail()` outputs richer paragraphs covering all new
  components. `[INTERNAL: ...]`-prefixed lines carry validation warnings and must be stripped
  before sending to the client.
- **No schema changes**: The enriched `PricingBreakdown` is captured in the `pricing_snapshot`
  JSONB column when a quote is accepted — no migrations required.

---

## Additional Fixes (Post-Review)

### `courseCount` made optional in `PricingInput`
`courseCount?: number` — required for `private_dinner`, silently irrelevant for all other service
types. Callers booking weekly, pizza, multi-night, or custom service no longer need to pass a
meaningless course count.

### `generateQuoteFromPricing` default quote name fixed
Previously: `"0-course dinner for 3"` for any non-dinner booking.
Now uses a service-type-aware `buildDefaultQuoteName()` helper:
- `private_dinner` → `"4-course dinner for 2"`
- `pizza_experience` → `"Pizza experience for 6"`
- `weekly_standard` → `"Weekly cooking — 5 day(s)"`
- `weekly_commitment` → `"Commitment rate — 7 day(s)"`
- `cook_and_leave` → `"Cook & Leave — 2 session(s)"`
- `multi_night` → `"Multi-night package (two night 4 course)"`
- `custom` → `"Custom quote for 4 guests"`

### `courseCount = 0` default removed from destructuring

**Before:** `computePricing()` destructured with `courseCount = 0`, so an undefined course count
became `0`. The `private_dinner` branch then looked up `rateTable[0]` (no match → `$0`), and the
error note read `"0-course menu is outside the standard 3–5 course range"` — nonsensical to the chef.

**After:** `courseCount` is kept as `undefined` when not provided. The `private_dinner` branch now
distinguishes between the two failure modes:

- `courseCount === undefined` → `"Course count not provided — requires custom pricing for private dinner"`
- `courseCount` provided but outside 3–5 → `"${n}-course menu is outside the standard 3–5 course range — requires custom pricing"`

Both still produce `requiresCustomPricing = true`. The note is now human-readable in both cases.

### `createQuoteFromPricingInput` added to `lib/quotes/actions.ts`

A new high-level server action that combines pricing computation and quote persistence into a single
call. Callers no longer need to wire `computePricing → generateQuoteFromPricing → createQuote`
manually.

**Signature:**

```typescript
createQuoteFromPricingInput(
  pricingInput: PricingInput & {
    clientId: string
    inquiryId?: string
    eventId?: string
    quoteName?: string
    pricingNotes?: string
    internalNotes?: string
  }
): Promise<{ success: true; quote: QuoteRow }>
```

**Contract:**

1. Calls `generateQuoteFromPricing` (which calls `computePricing` internally)
2. If `_requiresCustomPricing = true` → throws with the human-readable `_validationErrors`; no DB write happens
3. Strips the `_requiresCustomPricing`, `_validationErrors`, `_breakdown` internal fields
4. Calls `createQuote` with the cleaned quote data (inherits tenant scoping, activity logging, path revalidation)

This is the recommended entry point whenever a chef UI form wants to "quote this inquiry."

### `formatPricingForEmail` grocery sentence made service-type-aware

**Before:** The grocery range sentence always ended `"for a dinner this size"` — factually wrong
for pizza experiences, weekly bookings, and multi-night packages.

**After:** Sentence tail is computed from `pricing.numberOfDays`:

- `numberOfDays > 1` → `"for a booking of N days"` (weekly / multi-day)
- `numberOfDays = 1` → `"for a booking this size"` (dinner, pizza, single-night)

No interface changes — derived from the already-present `numberOfDays` field in `PricingBreakdown`.

---

## Items Requiring Chef Confirmation Before Going Live

These are structural slots with `0` or placeholder values:

| Item | Location | Action Required |
|------|----------|----------------|
| 3-night package prices (×4 variants) | `MULTI_NIGHT_PACKAGES` in constants.ts | Set actual dollar amounts |
| 4-night package prices (×4 variants) | `MULTI_NIGHT_PACKAGES` in constants.ts | Set actual dollar amounts |
| Wine pairing: $35/person | `ADD_ON_CATALOG` in constants.ts | Confirm or update |
| Charcuterie board: $150 flat | `ADD_ON_CATALOG` in constants.ts | Confirm or update |
| Extra appetizer course: $25/person | `ADD_ON_CATALOG` in constants.ts | Confirm or update |
| Birthday dessert: $75 flat | `ADD_ON_CATALOG` in constants.ts | Confirm or update |
| Minimum booking: $300 | `MINIMUM_BOOKING_CENTS` in constants.ts | Confirm or update |
