# Research: Chef Pricing Override Current State

> **Date:** 2026-03-31
> **Question:** What already exists for chef-controlled pricing overrides, where does override intent get lost, and what parts of the pricing system are still separate?
> **Status:** complete

## Origin Context

### Raw Signal

The developer said the pricing functionality already exists in some form, but they want to make sure it is actually working perfectly. They called out that pricing has many streams, that chef pricing needs to tie into everything, and that the chef should be able to override any dinner price at any point.

They also want the override to be visible in the UI, with the normal price crossed out and the chef's chosen price shown as the real number, like a receipt. The ask is not just cosmetic. They want the infrastructure to make chef or operator pricing control explicit and durable.

### Developer Intent

- Verify what pricing control already exists instead of assuming it is complete.
- Find where the current system stores only a final number and loses baseline-vs-override meaning.
- Trace the separate pricing streams that could ignore or overwrite a chef's manual price.
- Produce repo-backed findings a builder can use immediately.

## Summary

Chef-controlled pricing already exists in pieces, but it is not a first-class persisted model yet. Per-chef pricing config is real, the quote form already lets the chef type any final number, and the pricing engine already has a `custom_total` override concept; however, quote and event persistence mostly store only final price fields, so the system cannot reliably preserve, display, or protect "normal price vs chef override" across all downstream flows. See `lib/pricing/config-actions.ts:49-89`, `components/quotes/quote-form.tsx:486-567,1146-1210`, `lib/pricing/evaluate.ts:87-139,286-452`, and `lib/quotes/actions.ts:75-141,309-402`.

The biggest concrete risk is downstream overwrite. Guest-count changes currently recompute event totals from the current final price when an event is still modeled as per-person, and accepted-quote serialization copies only final total/deposit/model into events, not a richer override context. See `lib/guests/count-changes.ts:64-69,117-124` and `database/migrations/20260330000039_quote_acceptance_serialization_and_event_pricing_lock.sql:103-137`.

## Detailed Findings

### 1. Chef pricing config is real and editable

- The settings page already loads the chef's pricing config and routes chefs with no rates into guided setup. See `app/(chef)/settings/pricing/page.tsx:29-82`.
- `getPricingConfig()` reads `chef_pricing_config` and inserts a row if none exists, so the DB table is already the active source for chef pricing state. See `lib/pricing/config-actions.ts:49-89`.
- The table itself stores per-chef couples/group rates, weekly ranges, deposits, mileage, premiums, and add-ons. See `database/migrations/20260401000087_chef_pricing_config.sql:5-64`.
- New-chef defaults were later zeroed out in `database/migrations/20260401000102_pricing_config_zero_defaults.sql:5-24`, and the constant file says new chefs are supposed to start blank until configured in `lib/pricing/constants.ts:1-40,63-120`.

### 2. There is already a verified mismatch in pricing defaults

- API v2 pricing still returns legacy non-zero defaults when no row exists. See `app/api/v2/settings/pricing/route.ts:60-89`.
- That conflicts with the zero-default direction in `database/migrations/20260401000102_pricing_config_zero_defaults.sql:5-24` and `lib/pricing/constants.ts:1-40,63-120`.
- This is a real builder trap because any new baseline-seeding flow that trusts the API route will disagree with the main pricing-config path.

### 3. The quote form already behaves like an implicit manual override tool

- The quote form can compute a pricing suggestion via `computePricing()` and let the chef apply it through `handleUsePrice()`. See `components/quotes/quote-form.tsx:486-521`.
- It auto-derives total from per-person and guest count while in per-person mode. See `components/quotes/quote-form.tsx:523-545`.
- It persists whatever final values are currently typed into the form through `buildUpdatePayload()` and the create payload. See `components/quotes/quote-form.tsx:548-567,675-689`.
- The UI already tells the chef that menu food cost is informational only and the chef sets the price. See `components/quotes/quote-form.tsx:1146-1195`.
- The quote page already has an early source-tag seam through `prefilledSource`, including an explicit `recurring_default` state. See `app/(chef)/quotes/new/page.tsx:94-116,140-165,198-220` and `components/quotes/quote-form.tsx:1034-1095`.

### 4. Override intent is not first-class in quote persistence

- Quote create/update schemas persist final model, total, per-person, guest count, deposit, notes, and validity only. See `lib/quotes/actions.ts:34-50,52-66`.
- The create and update writes mirror those same final fields into the `quotes` row. See `lib/quotes/actions.ts:111-141,342-401`.
- The `quotes` table schema likewise stores final pricing fields plus a frozen snapshot, but no separate baseline or override explanation columns. See `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:266-289`.
- Result: the chef can already override by typing a different number, but the system does not know whether that number was a computed baseline, a recurring default, a booking-page price, or an intentional manual deviation.

### 5. The pricing engine already has a stronger override model than the saved data

- `lib/pricing/evaluate.ts` defines `PricingAdjustmentType`, including `custom_total`, explicitly described as overriding the entire computed total because the chef sets their own price. See `lib/pricing/evaluate.ts:87-109`.
- `PricingEvaluationInput` accepts an optional `adjustment` and the main docs say `evaluateChefPricing()` is the master evaluation function that can apply loyalty discounts, surcharges, or custom price overrides. See `lib/pricing/evaluate.ts:113-139,286-452`.
- `generateQuoteFromPricing()` returns a quote-ready payload plus `_breakdown` and validation metadata, but it still only maps final quote fields into the actual record shape. See `lib/pricing/compute.ts:816-846`.
- The live quote and booking paths inspected here still use other logic instead of `evaluateChefPricing()`, namely `computePricing()` in `components/quotes/quote-form.tsx:486-503` and direct booking-config math in `components/booking/booking-form.tsx:106-125`.

### 6. Accepted-event locking keeps only final numbers

- `pricing_model` is currently an enum with `per_person`, `flat_rate`, and `custom`. See `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:32-37`.
- The `events` table stores `quoted_price_cents`, `pricing_model`, `pricing_snapshot`, `deposit_amount_cents`, and `pricing_notes`, but not final `price_per_person_cents` or baseline/override metadata. See `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:141-149`.
- The `quotes` table stores final quote fields and a frozen snapshot, but again no baseline/override structure. See `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:266-289`.
- Quote acceptance freezes only final total/model/per-person/guest/deposit into `quotes.pricing_snapshot`. See `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:645-667`.
- The event-side frozen snapshot created on insert includes only final total/model/deposit. See `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:575-592`.
- Quote acceptance serialization copies only total/deposit/model into the linked event. See `database/migrations/20260330000039_quote_acceptance_serialization_and_event_pricing_lock.sql:103-137`.
- DB immutability and drift guard then enforce those final fields after acceptance. See `database/migrations/20260306000001_event_immutability_triggers.sql:27-61` and `database/migrations/20260330000045_event_pricing_drift_guard_function.sql:5-49`.

### 7. Current quote and event surfaces are final-only

- Chef quote list shows only the final total and optional final per-person summary. See `app/(chef)/quotes/page.tsx:69-98`.
- Chef quote detail shows final total, final model, final per-person, and guest count only. See `app/(chef)/quotes/[id]/page.tsx:79-131`.
- Chef event money tab shows only quoted price, deposit, paid, and balance. See `app/(chef)/events/[id]/_components/event-detail-money-tab.tsx:145-199`.
- Client proposal page shows final service fee and deposit only. See `app/(client)/my-events/[id]/proposal/page.tsx:182-234`.
- Client payment page shows final total event cost, deposit, paid, and amount due. See `app/(client)/my-events/[id]/pay/page.tsx:31-48,118-160`.
- Client event detail page shows final total price, paid, balance, and deposit only. See `app/(client)/my-events/[id]/page.tsx:300-348`.

### 8. There are multiple separate pricing-source systems

- Booking-page pricing is stored on `chefs.booking_*`, not in `chef_pricing_config`. See `lib/booking/booking-settings-actions.ts:12-33,49-77` and `database/migrations/20260312000014_dual_booking_model.sql:7-29`.
- Public booking computes live total and deposit directly from `bookingConfig`. See `app/book/[chefSlug]/page.tsx:56-63`, `app/book/[chefSlug]/booking-page-client.tsx:10-22`, and `components/booking/booking-form.tsx:106-125,741-762`.
- Instant-book writes only final total/deposit/model into events today. See `lib/booking/instant-book-actions.ts:321-350,387-414`.
- Client recurring defaults live on the `clients` table and already prefill the quote form when there is no explicit quote amount. See `database/migrations/20260330000032_client_recurring_pricing_defaults.sql:4-23` and `app/(chef)/quotes/new/page.tsx:140-165`.
- Recurring services use a separate `recurring_services.rate_cents` model. See `database/migrations/20260303000017_recurring_services.sql:9-40` and `lib/recurring/actions.ts:30-78`.
- Event series and event service sessions have their own quote/deposit fields. See `database/migrations/20260330000053_event_series_and_sessions.sql:50-151`.
- Series materialization currently writes only total/deposit/model onto the first event it creates. See `lib/booking/series-materialization.ts:191-235`.

### 9. There is already one verified downstream overwrite path

- Chef-side guest-count changes compute `priceImpactCents` by dividing the current final event quote by the old guest count. See `lib/guests/count-changes.ts:64-69`.
- When pricing is per-person, the server action then rewrites `events.quoted_price_cents` with the newly derived number. See `lib/guests/count-changes.ts:117-124`.
- That means any custom total that is still represented as per-person math can be silently replaced by guest-count edits.

### 10. There are adjacent stale or misleading surfaces in the same neighborhood

- The chef quote actions UI still renders `Mark Accepted` and `Mark Rejected` for sent quotes. See `components/quotes/quote-transitions.tsx:183-238`.
- The server action now blocks those statuses from the chef side and says acceptance/rejection must come from the client portal. See `lib/quotes/actions.ts:485-489`.
- The app audit is partially stale in this area. It says the rate-card route reads from `lib/pricing/constants.ts` at `docs/app-complete-audit.md:600-605`, but the live rate-card component resolves from actual config at `components/pricing/rate-card-view.tsx:54-113`.

## Gaps

- "Food operator" as a separate permission model was not verified. The pricing paths inspected here are chef-scoped via `requireChef()`, but I did not verify a distinct non-chef operator role.
- I verified the existence of event-series/session pricing schemas and write paths, but I did not fully trace every UI surface that reads them.
- I did not verify a live application path using `evaluateChefPricing()`. The inspected quote and booking flows use `computePricing()` and direct booking-config math instead at `components/quotes/quote-form.tsx:486-503` and `components/booking/booking-form.tsx:106-125`.

## Recommendations

1. Model baseline-vs-final pricing explicitly on quotes and event-like records instead of inferring it later from final amounts.
2. Add final `price_per_person_cents` to events so downstream code stops dividing custom totals by guest count and pretending that number is authoritative.
3. Extend quote acceptance serialization, frozen snapshots, and event drift guards so override metadata survives the quote-to-event handoff.
4. Treat booking-page pricing, recurring defaults, recurring services, and series/session pricing as separate baseline sources that normalize into one shared override model.
5. Preserve final payable amounts as the only accounting source of truth. Baseline fields should power comparison UI and overwrite protection, not billing math.
