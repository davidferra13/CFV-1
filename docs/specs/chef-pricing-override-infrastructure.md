# Spec: Chef Pricing Override Infrastructure

> **Status:** built
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                                   | Date             | Agent/Session            | Commit |
| --------------------------------------- | ---------------- | ------------------------ | ------ |
| Created                                 | 2026-03-31 23:59 | planner + research agent |        |
| Status: ready                           | 2026-03-31 23:59 | planner + research agent |        |
| Refined with external operator research | 2026-04-01 00:34 | planner + research agent |        |
| Status: built (TSC clean)               | 2026-04-01       | builder agent            |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without Developer Notes is building blind._

### Raw Signal

The developer said the pricing stack already exists, but they want it verified and tightened so it actually behaves like a chef-controlled pricing system instead of a fragile set of parallel flows.

They specifically want:

- Full chef control over pricing.
- Chef pricing tied into everything, not just one calculator.
- The chef to be able to override the normal dinner price at any point and charge whatever they want.
- The UI to make overrides feel intentional and attractive, with the normal price crossed out like a receipt and the chef-set price shown as the real number.
- The infrastructure to make that control explicit for the chef or food operator, even if the current code already contains partial or redundant versions of the idea.

They also acknowledged that parts of this probably already exist, but the ask is to make sure it actually works across the system instead of assuming that because a few inputs exist, the override behavior is truly durable.

### Developer Intent

- **Core goal:** Make chef-entered pricing overrides a first-class, durable pricing concept instead of an informal side effect of manually typing a different number.
- **Key constraints:** The chef's chosen final price must always win before acceptance, the normal price must still be preserved for display and comparison, accepted-event pricing immutability must remain intact, and no downstream recalculator may silently stomp an intentional override.
- **Motivation:** The codebase already has multiple pricing sources and partial override concepts, but they are not modeled consistently enough to trust.
- **Success from the developer's perspective:** A chef can see the normal computed price, override it cleanly, and every relevant quote and event surface will both honor that choice and explain it visually with a crossed-out baseline price.

---

## What This Does (Plain English)

This adds one shared pricing-decision model across quotes and quote-derived event records. A chef can start from a normal computed or source price, change it to a custom per-person rate or a custom total, and the app will preserve both numbers: the baseline price for comparison, and the final payable price as the real source of truth. Chef and client pricing surfaces then show the comparison in a receipt-like layout, while downstream flows like quote acceptance, event locking, guest-count changes, and direct-booking seeding all keep the override metadata intact instead of dropping or overwriting it.

---

## Why It Matters

Today the chef can often type a different total, but the system usually stores only the final number. That means override intent is easy to lose, downstream math can overwrite it, and the UI cannot honestly show "normal price vs chef price" because the baseline is not modeled as durable data. See `components/quotes/quote-form.tsx:486-567,1146-1210`, `lib/quotes/actions.ts:75-141,309-402`, and `lib/guests/count-changes.ts:64-124`.

---

## External Operator Patterns

Research basis for this section: `docs/research/chef-pricing-operator-patterns-2026-04-01.md`

External chef and catering research tightened this spec in four useful ways:

- Real operators commonly publish a starting estimate, tier, or instant quote, then escalate larger or more custom events into a tailored proposal. Examples: [Honest to Goodness](https://honesttogoodness.com/instant-quote) uses an instant quote as a starting point and routes events above 20 guests into a customized quote, while [Chef Ana](https://personalchefana.com/faq/private-chef-cost-guide/) uses flat-rate tiers plus a custom-quote path.
- Operators usually separate the base chef/service fee from variable extras such as groceries, staffing, rentals, travel, admin fees, taxes, or gratuity. Examples: [Honest to Goodness](https://honesttogoodness.com/instant-quote), [Florabelle](https://www.florabellefood.com/pricing), [Pascaline Fine Catering](https://pascalinefinecatering.com/wp-content/uploads/2025/05/Pascaline_Fine_Catering_-_Weddings_Brochure_25-26.pdf), and [Chef's Choice Catering](https://chefschoicecatering.com/wp-content/uploads/2025/12/2026-01-Policies.pdf).
- Minimum spends, minimum guest counts, and clear pricing model boundaries are normal margin-protection tools, not edge cases. Examples: [Florabelle](https://www.florabellefood.com/pricing) uses minimum spends and hourly staffing, while [KitchenCost's 2026 private chef pricing guide](https://kitchencost.app/en/blog/us-private-chef-pricing-guide/) recommends minimum spends and says chefs should pick one pricing model clearly.
- Operators increasingly explain price changes and cost drivers instead of treating price as static. [KitchenCost's guide](https://kitchencost.app/en/blog/us-private-chef-pricing-guide/) explicitly says private-chef pricing must move with costs, and [Toast's menu costing resource](https://pos.toasttab.com/resources/menu-costing-infographic) frames transparent cost explanation as a customer-communication requirement.

What this changes in this spec:

- A crossed-out baseline is only valid when the baseline and final price describe the same scope of work.
- Source snapshots must preserve minimums, service style, menu shape, and included-vs-extra assumptions.
- When the baseline is a starting estimate instead of a guaranteed all-in number, UI copy must say that plainly.

---

## Files to Create

| File                                                                       | Purpose                                                                                                                                        |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `database/migrations/[next-timestamp]_pricing_override_infrastructure.sql` | Add explicit baseline/override columns, add `price_per_person_cents` to event-like records, and replace pricing-related DB functions/triggers. |
| `lib/pricing/pricing-decision.ts`                                          | Shared types and helpers for pricing source, baseline, override semantics, comparison rendering data, and quote-to-event copy logic.           |
| `components/pricing/price-comparison-summary.tsx`                          | Shared receipt-style UI that shows baseline price struck through and the final chef price as the active amount.                                |

---

## Files to Modify

| File                                                            | What to Change                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/api/v2/settings/pricing/route.ts`                          | Remove the stale legacy fallback defaults and align the API with the zero-default pricing-config reality so pricing baselines are not seeded from contradictory sources. Current mismatch is at `app/api/v2/settings/pricing/route.ts:60-89`, while the DB/default path is zeroed in `database/migrations/20260401000102_pricing_config_zero_defaults.sql:5-24` and `lib/pricing/constants.ts:1-40,63-120`. |
| `app/(chef)/quotes/new/page.tsx`                                | Convert existing `prefilledSource` handling into structured baseline source metadata for quote creation. Current seams already exist at `app/(chef)/quotes/new/page.tsx:94-116,140-165,198-220`.                                                                                                                                                                                                            |
| `components/quotes/quote-form.tsx`                              | Add explicit baseline vs final pricing state, override-kind selection, reason capture, and receipt-style comparison UI. Current quote form already calculates prices, auto-derives totals, and surfaces `prefilledSource`/recurring comparisons at `components/quotes/quote-form.tsx:192-240,260-340,486-567,1025-1075,1146-1210`.                                                                          |
| `lib/quotes/actions.ts`                                         | Extend create/update schemas and writes so quotes persist final price, final per-person rate, baseline price, pricing source kind, override kind, override reason, and pricing context JSON. Current create/update writes only final quote fields at `lib/quotes/actions.ts:34-50,75-141,309-402`.                                                                                                          |
| `lib/events/actions.ts`                                         | Add the same pricing-decision fields to draft/proposed event writes and guard pricing edits consistently with the current accepted-quote protection path at `lib/events/actions.ts:37-55,58-90,351-370`.                                                                                                                                                                                                    |
| `lib/guests/count-changes.ts`                                   | Stop custom-total overrides from being silently recomputed when guest count changes. Current logic divides `quoted_price_cents` by guest count and rewrites the final event total at `lib/guests/count-changes.ts:64-69,117-124`.                                                                                                                                                                           |
| `lib/booking/instant-book-actions.ts`                           | Seed event baseline/final pricing metadata from booking-page config instead of writing only total + deposit. Current writes are total/deposit/model only at `lib/booking/instant-book-actions.ts:321-350,387-414`.                                                                                                                                                                                          |
| `lib/booking/series-materialization.ts`                         | Carry baseline/final pricing metadata, including per-person values when present, when series materialization creates events. Current materialization only seeds total/deposit/model on the first event at `lib/booking/series-materialization.ts:191-235`.                                                                                                                                                  |
| `app/(chef)/quotes/page.tsx`                                    | Use the shared comparison component so list rows can show a struck-through baseline when an override exists. Current list shows only the final total and optional final per-person summary at `app/(chef)/quotes/page.tsx:69-98`.                                                                                                                                                                           |
| `app/(chef)/quotes/[id]/page.tsx`                               | Replace the single final-price card with the shared comparison component plus baseline/override explanation. Current detail page shows only final total/per-person/guest count at `app/(chef)/quotes/[id]/page.tsx:79-131`.                                                                                                                                                                                 |
| `components/quotes/quote-transitions.tsx`                       | Keep accepted-state copy aligned with the new override model and remove the stale accepted/rejected buttons that currently contradict the server action. Current mismatch: UI renders `Mark Accepted`/`Mark Rejected` at `components/quotes/quote-transitions.tsx:183-238`, but server action blocks those statuses at `lib/quotes/actions.ts:485-489`.                                                     |
| `app/(chef)/events/[id]/_components/event-detail-money-tab.tsx` | Show baseline vs final pricing on the chef event money tab without changing financial math. Current surface reads only `quoted_price_cents` and `deposit_amount_cents` at `app/(chef)/events/[id]/_components/event-detail-money-tab.tsx:145-199`.                                                                                                                                                          |
| `app/(client)/my-events/[id]/proposal/page.tsx`                 | Show the crossed-out baseline and final chef price on the client proposal page when override metadata exists. Current proposal pricing section shows only final total/deposit at `app/(client)/my-events/[id]/proposal/page.tsx:182-234`.                                                                                                                                                                   |
| `app/(client)/my-events/[id]/pay/page.tsx`                      | Show the same comparison on the payment page while keeping the payable amount tied only to the final quote total. Current page shows final total/deposit only at `app/(client)/my-events/[id]/pay/page.tsx:31-48,118-160`.                                                                                                                                                                                  |
| `app/(client)/my-events/[id]/page.tsx`                          | Show the comparison on the client event detail summary. Current card shows only total paid, balance, and deposit at `app/(client)/my-events/[id]/page.tsx:300-348`.                                                                                                                                                                                                                                         |
| `lib/events/invoice-actions.ts`                                 | Stop inferring per-person price by dividing total by guest count for overridden events. Current inference is at `lib/events/invoice-actions.ts:650-657`. Use explicit final `price_per_person_cents` only when the pricing model is truly per-person.                                                                                                                                                       |

---

## Database Changes

Additive only. Do not modify old migration files.

### New Tables

None.

### New Columns on Existing Tables

```sql
ALTER TABLE quotes
  ADD COLUMN IF NOT EXISTS pricing_source_kind TEXT NOT NULL DEFAULT 'manual_only'
    CHECK (
      pricing_source_kind IN (
        'chef_config_calculated',
        'recurring_default',
        'booking_page',
        'recurring_service',
        'series_session',
        'manual_only',
        'legacy'
      )
    ),
  ADD COLUMN IF NOT EXISTS baseline_total_cents INTEGER
    CHECK (baseline_total_cents IS NULL OR baseline_total_cents >= 0),
  ADD COLUMN IF NOT EXISTS baseline_price_per_person_cents INTEGER
    CHECK (
      baseline_price_per_person_cents IS NULL
      OR baseline_price_per_person_cents > 0
    ),
  ADD COLUMN IF NOT EXISTS override_kind TEXT NOT NULL DEFAULT 'none'
    CHECK (override_kind IN ('none', 'per_person', 'custom_total')),
  ADD COLUMN IF NOT EXISTS override_reason TEXT,
  ADD COLUMN IF NOT EXISTS pricing_context JSONB;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS price_per_person_cents INTEGER
    CHECK (price_per_person_cents IS NULL OR price_per_person_cents > 0),
  ADD COLUMN IF NOT EXISTS pricing_source_kind TEXT NOT NULL DEFAULT 'manual_only'
    CHECK (
      pricing_source_kind IN (
        'chef_config_calculated',
        'recurring_default',
        'booking_page',
        'recurring_service',
        'series_session',
        'manual_only',
        'legacy'
      )
    ),
  ADD COLUMN IF NOT EXISTS baseline_total_cents INTEGER
    CHECK (baseline_total_cents IS NULL OR baseline_total_cents >= 0),
  ADD COLUMN IF NOT EXISTS baseline_price_per_person_cents INTEGER
    CHECK (
      baseline_price_per_person_cents IS NULL
      OR baseline_price_per_person_cents > 0
    ),
  ADD COLUMN IF NOT EXISTS override_kind TEXT NOT NULL DEFAULT 'none'
    CHECK (override_kind IN ('none', 'per_person', 'custom_total')),
  ADD COLUMN IF NOT EXISTS override_reason TEXT,
  ADD COLUMN IF NOT EXISTS pricing_context JSONB;

ALTER TABLE event_series
  ADD COLUMN IF NOT EXISTS price_per_person_cents INTEGER
    CHECK (price_per_person_cents IS NULL OR price_per_person_cents > 0),
  ADD COLUMN IF NOT EXISTS pricing_source_kind TEXT NOT NULL DEFAULT 'manual_only'
    CHECK (
      pricing_source_kind IN (
        'chef_config_calculated',
        'recurring_default',
        'booking_page',
        'recurring_service',
        'series_session',
        'manual_only',
        'legacy'
      )
    ),
  ADD COLUMN IF NOT EXISTS baseline_total_cents INTEGER
    CHECK (baseline_total_cents IS NULL OR baseline_total_cents >= 0),
  ADD COLUMN IF NOT EXISTS baseline_price_per_person_cents INTEGER
    CHECK (
      baseline_price_per_person_cents IS NULL
      OR baseline_price_per_person_cents > 0
    ),
  ADD COLUMN IF NOT EXISTS override_kind TEXT NOT NULL DEFAULT 'none'
    CHECK (override_kind IN ('none', 'per_person', 'custom_total')),
  ADD COLUMN IF NOT EXISTS override_reason TEXT,
  ADD COLUMN IF NOT EXISTS pricing_context JSONB;

ALTER TABLE event_service_sessions
  ADD COLUMN IF NOT EXISTS price_per_person_cents INTEGER
    CHECK (price_per_person_cents IS NULL OR price_per_person_cents > 0),
  ADD COLUMN IF NOT EXISTS pricing_source_kind TEXT NOT NULL DEFAULT 'manual_only'
    CHECK (
      pricing_source_kind IN (
        'chef_config_calculated',
        'recurring_default',
        'booking_page',
        'recurring_service',
        'series_session',
        'manual_only',
        'legacy'
      )
    ),
  ADD COLUMN IF NOT EXISTS baseline_total_cents INTEGER
    CHECK (baseline_total_cents IS NULL OR baseline_total_cents >= 0),
  ADD COLUMN IF NOT EXISTS baseline_price_per_person_cents INTEGER
    CHECK (
      baseline_price_per_person_cents IS NULL
      OR baseline_price_per_person_cents > 0
    ),
  ADD COLUMN IF NOT EXISTS override_kind TEXT NOT NULL DEFAULT 'none'
    CHECK (override_kind IN ('none', 'per_person', 'custom_total')),
  ADD COLUMN IF NOT EXISTS override_reason TEXT,
  ADD COLUMN IF NOT EXISTS pricing_context JSONB;
```

### Migration Notes

- Migration filename must be strictly greater than the current highest file in `database/migrations/`, following the additive migration rule in `CLAUDE.md:148-153`. At inspection time the highest existing migration inspected was `database/migrations/20260401000150_canonical_ingredients.sql:1`.
- Do not backfill legacy quotes or events with fake baseline numbers. Existing rows should keep `baseline_*` and `pricing_context` as `NULL` unless a trusted source is available.
- The new migration must `CREATE OR REPLACE` the existing pricing-related DB functions so they understand the new columns:
  - `freeze_event_pricing_snapshot()` from `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:575-592`
  - `freeze_quote_snapshot_on_acceptance()` from `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:645-667`
  - `prevent_quote_mutation_after_acceptance()` from `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:669-688`
  - `transition_quote_atomic` behavior that currently copies only total/deposit/model into events at `database/migrations/20260330000039_quote_acceptance_serialization_and_event_pricing_lock.sql:103-137`
  - `prevent_event_pricing_drift_from_accepted_quote()` from `database/migrations/20260330000045_event_pricing_drift_guard_function.sql:5-49`
  - `prevent_event_price_mutation_after_acceptance()` from `database/migrations/20260306000001_event_immutability_triggers.sql:27-61`

---

## Data Model

There are now two pricing layers on every quote-like record:

1. **Final payable price**
   - `total_quoted_cents`, `quoted_price_cents`, `price_per_person_cents`, `pricing_model`, and deposit fields remain the canonical financial numbers.
   - These are the numbers invoicing, payment, ledger math, and reporting must continue to use. Current financial consumers already treat `quoted_price_cents` as the real price, for example `lib/events/invoice-actions.ts:609-657`.

2. **Baseline and override explanation**
   - `pricing_source_kind`: where the baseline came from.
   - `baseline_total_cents`: what the system or source price would normally have been.
   - `baseline_price_per_person_cents`: what the normal per-person rate would have been when relevant.
   - `override_kind`: `none`, `per_person`, or `custom_total`.
   - `override_reason`: optional chef-entered explanation.
   - `pricing_context`: optional JSON with source-specific inputs, calculator metadata, or recurring/booking snapshots.

Minimum `pricing_context` expectations when a trusted baseline exists:

- `source_generated_at`: when the baseline was produced or copied.
- `pricing_basis`: `full_quote`, `service_fee_only`, or other truthful scope label used by the source flow.
- `guest_count_basis` and any `minimum_applied_cents` or `minimum_applied_label`.
- `service_style` and menu-shape inputs that materially affect price, such as `course_count`, `menu_complexity`, or `family_style` vs `plated`.
- Known inclusions or exclusions that affect whether the baseline and final price are comparable, such as groceries, staffing, rentals, travel, taxes, or gratuity.

This does not create a new accounting model. It preserves the context operators actually use when they turn a standard rate or quick estimate into a custom proposal.

Override semantics:

- **`override_kind = 'none'`**
  - Final price and baseline match, or baseline is unknown.
  - UI shows only the final price unless baseline is present and distinct.

- **`override_kind = 'per_person'`**
  - Final `pricing_model` stays `per_person`.
  - Final `price_per_person_cents` is the chef-chosen amount.
  - Final total must equal `price_per_person_cents x guest_count`.
  - Baseline per-person and baseline total remain for comparison.

- **`override_kind = 'custom_total'`**
  - Final `pricing_model` must be `custom`.
  - Final total is the chef-chosen amount.
  - Final `price_per_person_cents` should be `NULL` on persisted event-like records because the custom total is not derivable from guest count without lying.
  - Baseline per-person and baseline total remain for comparison only.

Source-kind rules:

- `chef_config_calculated`: derived from the chef pricing calculator / configured pricing engine.
- `recurring_default`: derived from client recurring defaults already surfaced in the quote form at `app/(chef)/quotes/new/page.tsx:140-165` and `components/quotes/quote-form.tsx:1042-1075`.
- `booking_page`: derived from public instant-book settings on `chefs.booking_*`, currently used at `lib/booking/booking-settings-actions.ts:12-33,49-77`, `app/book/[chefSlug]/page.tsx:56-63`, and `components/booking/booking-form.tsx:106-125`.
- `recurring_service`: derived from `recurring_services.rate_cents`, defined at `database/migrations/20260303000017_recurring_services.sql:9-40` and written through `lib/recurring/actions.ts:30-78`.
- `series_session`: derived from event-series/session pricing state in `database/migrations/20260330000053_event_series_and_sessions.sql:50-151`.
- `manual_only`: no trusted baseline exists.
- `legacy`: historical rows or imports where only the final price is trustworthy.

---

## Server Actions

| Action                           | Auth            | Input                                                                                                                                                                       | Output                                                                                        | Side Effects                                                                                                                        |
| -------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `createQuote(input)`             | `requireChef()` | Existing quote fields plus `pricingDecision` payload `{ pricingSourceKind, baselineTotalCents, baselinePricePerPersonCents, overrideKind, overrideReason, pricingContext }` | `{ success: boolean, quote?: Quote, error?: string }`                                         | Persists quote final price plus pricing-decision metadata, revalidates `/quotes`                                                    |
| `updateQuote(id, input)`         | `requireChef()` | Existing editable quote fields plus `pricingDecision` payload                                                                                                               | `{ success: boolean, quote?: Quote, error?: string }`                                         | Updates draft quotes only, keeps baseline/override fields in sync with final quote values, revalidates `/quotes` and `/quotes/[id]` |
| `updateEvent(eventId, input)`    | `requireChef()` | Draft/proposed event edits plus pricing-decision fields whenever pricing changes                                                                                            | Existing update response shape                                                                | Keeps draft/proposed event pricing metadata aligned with the final price and existing accepted-quote guard rails                    |
| `requestGuestCountChange(input)` | `requireChef()` | Existing payload                                                                                                                                                            | Existing success shape plus warning metadata when override preservation blocks auto-repricing | Updates guest count; for `custom_total` overrides preserve final price instead of recomputing it                                    |

Rules for action behavior:

- `createQuote` and `updateQuote` must reject inconsistent combinations:
  - `override_kind = 'custom_total'` with `pricing_model = 'per_person'`
  - `override_kind = 'per_person'` without `price_per_person_cents`
  - `override_kind = 'per_person'` when guest count is missing
- `updateEvent` must treat `price_per_person_cents`, `baseline_*`, `pricing_source_kind`, `override_kind`, `override_reason`, and `pricing_context` as pricing fields for accepted-quote conflict detection.
- `requestGuestCountChange` behavior must branch:
  - `override_kind = 'none'` and `pricing_model = 'per_person'`: keep current auto-reprice behavior.
  - `override_kind = 'per_person'`: recompute total using final overridden `price_per_person_cents`.
  - `override_kind = 'custom_total'`: update guest count only, preserve final total, return a warning string explaining that the chef-set total was intentionally left untouched.

---

## UI / Component Spec

### Page Layout

Use one shared component, `PriceComparisonSummary`, on all user-facing pricing surfaces. It must support:

- Final-only mode when no trusted baseline exists.
- Comparison mode when baseline exists and differs from the final price.
- Optional secondary row for per-person comparison.

Visual direction:

- Baseline amount: smaller, muted, struck through.
- Final amount: larger, bolder, brand-colored or success-colored emphasis.
- Delta badge: short chip like `Chef override`, `$300 below baseline`, or `$150 above baseline`.
- Supporting copy: one short line such as `Starting quote` / `Chef price`, `Standard rate` / `Revised quote`, or `Service fee estimate` / `Final chef price`, depending on source scope.
- The layout should feel more like a receipt or revised quote than a warning banner.

### States

- **Loading:** Existing page skeletons stay unchanged.
- **Empty:** If baseline is null, render the final price only. Never invent a crossed-out number.
- **Error:** If save/update fails, keep the current rollback behavior and show existing error UI. Do not optimistically show an override that the server rejected.
- **Populated:** Show baseline vs final when override metadata exists and baseline differs from final.
- **Scope mismatch:** If `pricing_context` says the baseline and final price do not cover the same scope, render this as a revised quote with supporting scope notes, not as a fake discount.

### Interactions

Quote form behavior:

1. **Using calculator or trusted source**
   - Internal calculator result (`components/quotes/quote-form.tsx:486-521`) sets both baseline and final values.
   - `override_kind` resets to `none`.
   - `pricing_source_kind` becomes `chef_config_calculated` unless another trusted source already supplied the baseline.

2. **Manual per-person override**
   - When baseline exists for a per-person flow and the chef changes `price_per_person`, mark `override_kind = 'per_person'`.
   - Keep `pricing_model = 'per_person'`.
   - Recompute final total from final per-person x guest count.

3. **Manual total override**
   - When the chef chooses an arbitrary total that should no longer be tied to per-person math, switch final `pricing_model` to `custom`, preserve the baseline values, mark `override_kind = 'custom_total'`, and set final `price_per_person_cents = null` on persisted event-like records.
   - This is the safe path that prevents later guest-count changes and invoice helpers from pretending the total still has a per-person meaning.

4. **Reset to baseline**
   - If a baseline exists, provide one explicit action that copies baseline back into final values and clears override metadata.

5. **Accepted quote propagation**
   - When a quote is accepted, the event record receives final price, final per-person price, baseline values, source kind, override kind, override reason, and pricing context.
   - Frozen snapshots on quote and event must include the same metadata.

6. **Scope-aware comparison rules**
   - If the baseline came from a source that behaves like a starting estimate, tier, or service-fee-only quote, preserve that label in `pricing_context` and render it honestly.
   - If the chef changes the scope itself, for example adds staffing assumptions that were not in the baseline, keep the baseline for context but suppress any misleading "discount" framing.
   - Optional note rows may call out source assumptions such as `Groceries billed separately`, `Staffing extra`, `Travel not included`, or `Minimum applied`.

Surfaces that must render comparison UI when metadata exists:

- Chef quote list
- Chef quote detail
- Chef event money tab
- Client proposal page
- Client payment page
- Client event detail summary

Surfaces that must stay final-only in this spec:

- Invoice math and invoice line-item calculations
- Ledger and payment-plan calculations
- Revenue and analytics summaries
- Public instant-book page, unless a real manual override has already been persisted onto the underlying event

---

## Edge Cases and Error Handling

| Scenario                                                         | Correct Behavior                                                                                                              |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Legacy quote or event has no baseline fields                     | Show final price only. Never fabricate a crossed-out baseline from the current total.                                         |
| Chef overrides a per-person quote with an arbitrary total        | Final `pricing_model` becomes `custom`, final per-person is not inferred later, baseline per-person remains display-only.     |
| Chef overrides a per-person quote by editing the per-person rate | Final model stays `per_person`, final total is recomputed from the final per-person rate.                                     |
| Guest count changes on `custom_total` event                      | Update guest count, preserve final total, return a warning or note that manual repricing may be needed.                       |
| Quote accepted after override                                    | Event copy path and frozen snapshots preserve the same final price and override metadata.                                     |
| Builder only updates UI and not DB copy/lock functions           | Reject this implementation. Quote acceptance would drop the override context or let event data drift from the accepted quote. |
| Public booking creates a direct event                            | Seed baseline/final fields from booking config with `override_kind = 'none'`.                                                 |
| Historical rows are backfilled with current totals as baseline   | Reject this. That would create fake crossed-out prices with no verified source.                                               |
| Baseline and final price do not cover the same scope             | Show a revised-quote layout with scope notes. Do not present it as a simple discount or markup against the same package.      |

---

## Verification Steps

1. Configure non-zero chef pricing in `/settings/pricing`, then verify the same values come back from `/api/v2/settings/pricing` instead of the stale hardcoded fallback.
2. Create a dinner quote from the quote form calculator and verify the saved draft has matching final and baseline values with `override_kind = 'none'`.
3. On a per-person quote, change only the per-person rate and verify the UI shows a struck-through baseline per-person + total, the saved quote keeps `pricing_model = 'per_person'`, and the final total equals final per-person x guest count.
4. On a dinner quote, change the final total to an arbitrary custom amount and verify the UI shows baseline struck through, final total highlighted, saved `pricing_model = 'custom'`, and saved `override_kind = 'custom_total'`.
5. Accept that quote and verify the linked event receives final total, final per-person, baseline values, source kind, override kind, and identical frozen snapshot content.
6. Open the chef quote list, chef quote detail, chef event money tab, client proposal page, client payment page, and client event detail page. Verify each shows the same final-vs-baseline comparison for the overridden record.
7. Trigger a guest-count change on an overridden event:
   - `per_person` override should recompute final total from final per-person.
   - `custom_total` override should preserve final total and return a warning instead of silently changing it.
8. Create an instant-book event from booking-page pricing and verify it persists baseline and final pricing metadata with no override applied.
9. Open a legacy quote or event created before the migration and verify it still renders cleanly with final-only pricing and no invented crossed-out amount.
10. Verify a source-driven quote with contextual exclusions or minimums carries those notes through `pricing_context` and displays a truthful source label such as `Starting quote` or `Service fee estimate` instead of implying an all-in baseline.

---

## Out of Scope

- Rewriting the entire app to use `evaluateChefPricing()` as the only pricing engine. That function is documented as the master entry point at `lib/pricing/evaluate.ts:286-452`, but it is not wired anywhere outside its own file today.
- Changing invoice, ledger, payout, or analytics math to use baseline fields. Those systems must continue to use final payable amounts.
- Fixing the separate rate-card holiday-range issue in `components/pricing/rate-card-view.tsx:107-110`.
- Backfilling historical records with synthetic baseline numbers.
- Redesigning the public instant-book checkout experience beyond seeding the new metadata fields correctly.
- Turning this feature into a full line-item grocery, staffing, rental, tax, or gratuity quoting engine. External research shows those concepts matter, but this spec only requires honest metadata and scope labels, not a whole new financial subsystem.

---

## Notes for Builder Agent

- Use the existing `prefilledSource` seam in `app/(chef)/quotes/new/page.tsx:94-116,162-165,198-220` and `components/quotes/quote-form.tsx:1034-1095`. Do not invent a second, conflicting source-tag system.
- Final payable numbers stay in the current final-price columns. New baseline/override columns explain the price. They do not replace it.
- Do not infer per-person price from `quoted_price_cents / guest_count` when `override_kind = 'custom_total'`. Current invoice logic does that at `lib/events/invoice-actions.ts:654-657`, and it is exactly the kind of hidden re-derivation that this spec is meant to stop.
- Do not show crossed-out prices on legacy rows unless the new baseline fields are actually populated.
- Do not touch old migration files. Replace DB functions inside the new migration only.
- External operator research supports richer source context, not a wider billing model. Keep extras and minimums in `pricing_context` unless the existing app already models them as first-class amounts.

## Spec Validation (Planner Gate Evidence)

### 1. What exists today that this touches?

- Chef pricing config already exists as a real per-chef table, with editable pricing settings fetched through `getPricingConfig()` and rendered through the pricing settings page at `lib/pricing/config-actions.ts:49-89` and `app/(chef)/settings/pricing/page.tsx:29-82`. The table is defined in `database/migrations/20260401000087_chef_pricing_config.sql:5-64`.
- New-chef defaults were later zeroed out in `database/migrations/20260401000102_pricing_config_zero_defaults.sql:5-24`, and the code comments in `lib/pricing/constants.ts:1-40,63-120` say the constants are intentionally blank until the chef configures pricing.
- API v2 pricing still returns the older hardcoded defaults if no config row exists, which conflicts with the zero-default behavior. That mismatch lives in `app/api/v2/settings/pricing/route.ts:60-89`.
- The quote form already computes pricing, lets the chef apply calculator output, auto-derives totals in per-person mode, and lets the chef type any final number they want. See `components/quotes/quote-form.tsx:486-521` for calculator use, `components/quotes/quote-form.tsx:523-545` for per-person auto math, and `components/quotes/quote-form.tsx:1146-1210` for the current final-price UI.
- Quote persistence today stores only the final fields plus notes, not an explicit baseline-vs-override model. See `lib/quotes/actions.ts:34-50,75-141,309-402` and the quote schema in `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:256-303`.
- The pricing engine already contains a richer manual override concept through `custom_total`, but the live quote and booking paths inspected here still use other logic. The richer model is defined in `lib/pricing/evaluate.ts:83-139,286-452`, while the active quote form uses `computePricing()` at `components/quotes/quote-form.tsx:486-503` and the booking page uses direct `bookingConfig` math at `components/booking/booking-form.tsx:106-125`.
- Accepted quotes copy only final total/deposit/model into events in `database/migrations/20260330000039_quote_acceptance_serialization_and_event_pricing_lock.sql:103-137`, while frozen quote snapshots include only final pricing fields in `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:645-667`.
- Event pricing is locked after acceptance by DB triggers at `database/migrations/20260306000001_event_immutability_triggers.sql:27-61`, and drift guard ensures event final pricing must match the accepted quote at `database/migrations/20260330000045_event_pricing_drift_guard_function.sql:5-49`.
- Current chef and client pricing surfaces show only the final amount:
  - chef quote list: `app/(chef)/quotes/page.tsx:69-98`
  - chef quote detail: `app/(chef)/quotes/[id]/page.tsx:79-131`
  - chef event money tab: `app/(chef)/events/[id]/_components/event-detail-money-tab.tsx:145-199`
  - client proposal: `app/(client)/my-events/[id]/proposal/page.tsx:182-234`
  - client payment: `app/(client)/my-events/[id]/pay/page.tsx:31-48,118-160`
  - client event detail: `app/(client)/my-events/[id]/page.tsx:300-348`
- Parallel pricing-source systems exist outside quote creation:
  - booking-page pricing on `chefs.booking_*` at `lib/booking/booking-settings-actions.ts:12-33,49-77` and `database/migrations/20260312000014_dual_booking_model.sql:7-29`
  - public booking computation at `app/book/[chefSlug]/page.tsx:56-63` and `components/booking/booking-form.tsx:106-125,741-762`
  - recurring client defaults at `database/migrations/20260330000032_client_recurring_pricing_defaults.sql:4-23`, `app/(chef)/quotes/new/page.tsx:140-165`, and `components/quotes/quote-form.tsx:260-340,1042-1075`
  - recurring service rate storage at `database/migrations/20260303000017_recurring_services.sql:9-40` and `lib/recurring/actions.ts:30-78`
  - event-series/session pricing at `database/migrations/20260330000053_event_series_and_sessions.sql:50-151`
- There is an existing overwrite risk: guest-count changes currently recompute event totals from current event price and guest count at `lib/guests/count-changes.ts:64-69,117-124`.

### 2. What exactly changes?

- Add new explicit baseline/override fields plus final `price_per_person_cents` on event-like records via a new migration. Today `events` only has total/deposit/model at `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:144-149`, which is not enough for durable override semantics.
- Keep quote and event final payable amounts in the existing columns. The new fields only explain baseline/source/override state, because downstream financial consumers currently rely on final amounts such as `lib/events/invoice-actions.ts:609-657`.
- Extend quote create/update writes in `lib/quotes/actions.ts:75-141,309-402` so they persist the new pricing-decision payload instead of only final fields.
- Extend accepted-quote serialization and snapshot locking so event rows and frozen snapshots carry the same override metadata now missing from `database/migrations/20260330000039_quote_acceptance_serialization_and_event_pricing_lock.sql:103-137` and `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:645-667`.
- Add one shared comparison component and replace the current final-only displays on the chef quote/event surfaces and client proposal/payment/detail surfaces.
- Update guest-count change logic in `lib/guests/count-changes.ts:64-124` so custom-total overrides are preserved instead of recomputed.
- Update instant-book and series materialization to seed the new metadata from their own pricing sources. Current writes are final-only in `lib/booking/instant-book-actions.ts:321-350,387-414` and `lib/booking/series-materialization.ts:191-235`.
- Fix the zero-default mismatch in `app/api/v2/settings/pricing/route.ts:60-89`.

### 3. What assumptions are you making?

| Assumption                                                                                                         | Verified or Unverified                                    | Evidence                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Food operator" can stay on current chef-scoped auth for this spec, rather than introducing a new staff role model | Unverified role semantics, safe scope choice              | Pricing settings, quote actions, and event updates all use `requireChef()` today at `lib/pricing/config-actions.ts:52-55,95-99`, `lib/quotes/actions.ts:75-78,309-313`, and `lib/events/actions.ts:309-313` |
| Existing `prefilledSource` is the right seam for quote source tracking                                             | Verified                                                  | `app/(chef)/quotes/new/page.tsx:94-116,162-165,198-220`; `components/quotes/quote-form.tsx:1034-1095`                                                                                                       |
| Legacy rows do not currently have a trustworthy baseline price stored anywhere structured                          | Verified                                                  | `quotes` and `events` schemas store only final pricing columns plus snapshot JSON at `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:144-149,266-289`                              |
| `custom_total` should map to a final custom pricing model instead of leaving final records in per-person mode      | Verified by current downstream math risk                  | `lib/pricing/evaluate.ts:87-109`; `lib/guests/count-changes.ts:64-69,117-124`; `lib/events/invoice-actions.ts:654-657`                                                                                      |
| Event-series and session surfaces may need the data model even if their UI is not part of v1                       | Verified for schema presence, UI reach remains unverified | `database/migrations/20260330000053_event_series_and_sessions.sql:50-151`; `lib/booking/series-materialization.ts:191-235`                                                                                  |

### 4. Where will this most likely break?

1. A builder may keep a custom-total override in `pricing_model = 'per_person'`, which would let later guest-count and invoice helpers re-derive the price incorrectly. The current risk path already exists in `lib/guests/count-changes.ts:64-69,117-124` and `lib/events/invoice-actions.ts:654-657`.
2. A builder may update quote writes and UI but forget the DB copy/lock path. Quote acceptance currently copies only final total/deposit/model into events at `database/migrations/20260330000039_quote_acceptance_serialization_and_event_pricing_lock.sql:103-137`, and the existing freeze/immutability functions only know about those fields at `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:645-688` and `database/migrations/20260306000001_event_immutability_triggers.sql:27-61`.
3. A builder may accidentally use baseline amounts for accounting views or invoices. Financial consumers currently treat the final event quote as the billable amount in `app/(client)/my-events/[id]/pay/page.tsx:31-48`, `app/(client)/my-events/[id]/proposal/page.tsx:49-54`, and `lib/events/invoice-actions.ts:609-657`.

### 5. What is underspecified?

- The meaning of an override on a per-person quote is now explicit:
  - `per_person` override means chef changed the per-person rate.
  - `custom_total` override means chef chose a flat total and the final model becomes `custom`.
- Legacy-row behavior is now explicit: if baseline is missing, show final-only pricing. Current schemas do not carry a trustworthy baseline at `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:144-149,266-289`.
- Public booking is now explicit in scope: its config becomes a baseline source, but this spec does not redesign the checkout UI beyond seeding correct metadata from `app/book/[chefSlug]/page.tsx:56-63` and `components/booking/booking-form.tsx:106-125,741-762`.
- The stale API default mismatch is explicitly part of this spec so builders do not seed fake baselines from the old hardcoded values in `app/api/v2/settings/pricing/route.ts:60-89`.
- Source-scope labeling is now explicit: a baseline can be shown as `Starting quote`, `Standard rate`, or `Service fee estimate` instead of always pretending it is a universal all-in normal price.

### 6. What dependencies or prerequisites exist?

- A new additive migration is required before app code, because current event-like schemas do not have the needed columns. Current schema evidence: `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:144-149,266-289` and `database/migrations/20260330000053_event_series_and_sessions.sql:69-72,122-127`.
- The migration must use a timestamp above the current highest existing migration, per `CLAUDE.md:148-153`. At inspection time that highest file was `database/migrations/20260401000150_canonical_ingredients.sql:1`.
- No dependency on another spec is required.
- Builders must preserve current financial-lock behavior in the DB function layer from `database/migrations/20260330000039_quote_acceptance_serialization_and_event_pricing_lock.sql:103-137`, `database/migrations/20260330000045_event_pricing_drift_guard_function.sql:5-49`, and `database/migrations/20260306000001_event_immutability_triggers.sql:27-61`.

### 7. What existing logic could this conflict with?

- Zero-default pricing config vs stale API defaults conflict today between `app/api/v2/settings/pricing/route.ts:60-89` and `database/migrations/20260401000102_pricing_config_zero_defaults.sql:5-24`.
- Booking-page pricing is a separate source on `chefs.booking_*`, not `chef_pricing_config`, so baseline-source handling must not assume all prices come from one table. See `lib/booking/booking-settings-actions.ts:49-77` and `database/migrations/20260312000014_dual_booking_model.sql:7-29`.
- Recurring defaults and recurring services are separate systems, so source tagging must not collapse them into one vague "default" bucket. See `database/migrations/20260330000032_client_recurring_pricing_defaults.sql:4-23` and `database/migrations/20260303000017_recurring_services.sql:9-40`.
- Existing invoice/reporting code uses final event price fields heavily, for example `lib/events/invoice-actions.ts:609-657`. Baseline fields must not replace those consumers.
- The quote transition UI already conflicts with server behavior for accepted/rejected statuses, so builders should clean that stale UI while touching this area: `components/quotes/quote-transitions.tsx:183-238` vs `lib/quotes/actions.ts:485-489`.

### 8. What is the end-to-end data flow?

**Chef quote flow**

1. Chef opens `/quotes/new`.
2. Page derives any initial source hints such as recurring defaults in `app/(chef)/quotes/new/page.tsx:140-165` and passes them into `QuoteForm` at `app/(chef)/quotes/new/page.tsx:198-220`.
3. `QuoteForm` either computes a baseline from the pricing calculator (`components/quotes/quote-form.tsx:486-521`) or starts from another trusted source.
4. Chef may keep that baseline as final, adjust the per-person rate, or set a custom total.
5. `createQuote` / `updateQuote` persist final price plus pricing-decision metadata in the quote row (`lib/quotes/actions.ts:75-141,309-402` after this spec's changes).
6. Quote detail/list pages render `PriceComparisonSummary`.

**Quote acceptance to event flow**

1. Client accepts the quote.
2. DB acceptance path copies quote pricing data onto the event. Current final-only copy is `database/migrations/20260330000039_quote_acceptance_serialization_and_event_pricing_lock.sql:103-137`; this spec extends that copy to include per-person and override metadata.
3. Quote snapshot and event snapshot freeze the same pricing context.
4. Event chef/client surfaces render the same comparison UI.

**Guest-count change flow**

1. Chef requests a guest-count change via `requestGuestCountChange()` in `lib/guests/count-changes.ts:38-40`.
2. Server action updates guest count and branches on override kind:
   - no override: current per-person recompute behavior
   - per-person override: recompute using final overridden per-person rate
   - custom-total override: keep final total unchanged and return warning metadata
3. UI reflects updated count without losing the final manual price.

**Instant-book / series source flow**

1. Public booking page computes total from booking config in `components/booking/booking-form.tsx:106-125`.
2. Instant-book server action creates events directly from that config in `lib/booking/instant-book-actions.ts:321-350,387-414`.
3. After this spec, those writes also seed source-kind and baseline fields so direct-booking records participate in the same comparison/override model later.

### 9. What is the correct implementation order?

1. Create the new migration and replace the DB pricing functions/triggers first.
2. Add the shared `pricing-decision` helper module and the shared comparison UI component.
3. Update quote create/edit flow to persist and render baseline/override metadata.
4. Update quote acceptance serialization and event update logic.
5. Update guest-count changes and invoice per-person inference logic.
6. Update instant-book and series materialization writes.
7. Update chef/client price-display surfaces.
8. Fix the stale API v2 pricing fallback before verification so the system does not report contradictory defaults.

### 10. What are the exact success criteria?

- Chef-config pricing and API v2 pricing agree on default behavior for unconfigured chefs.
- New quotes can persist source kind, baseline total, baseline per-person, override kind, override reason, and context JSON.
- New source-driven quotes preserve enough context to explain their scope honestly, including minimums and any included-vs-extra assumptions when known.
- Per-person overrides stay per-person and recompute correctly.
- Arbitrary total overrides become final custom totals and are not later re-derived from guest count.
- Accepted quotes copy the new metadata into events and frozen snapshots.
- Chef quote list/detail, chef event money tab, client proposal, client payment, and client event summary all show a truthful crossed-out baseline when metadata exists.
- Those comparison surfaces use scope-aware labels and suppress misleading strike-through math when baseline and final scope do not match.
- Guest-count changes preserve a `custom_total` override instead of overwriting it.
- Instant-book and series-seeded events populate the new pricing metadata with `override_kind = 'none'`.
- Legacy rows remain stable and show final-only pricing without invented comparisons.

### 11. What are the non-negotiable constraints?

- All changed server actions stay chef-scoped and tenant-scoped, following the current patterns in `lib/quotes/actions.ts:75-88,309-321`, `lib/events/actions.ts:340-353`, and `lib/guests/count-changes.ts:38-55`.
- Final payable amounts remain the financial source of truth. Baseline fields are display/guard metadata only. Current finance behavior depends on final amounts at `lib/events/invoice-actions.ts:609-657`.
- Accepted-event pricing immutability must remain enforced at the DB level. Current guarantees are in `database/migrations/20260306000001_event_immutability_triggers.sql:27-61` and `database/migrations/20260330000045_event_pricing_drift_guard_function.sql:5-49`.
- No fake baseline backfill on historical rows.
- All new DB work must be additive and live in a new migration file.

### 12. What should NOT be touched?

- Do not rewrite the whole pricing engine around `evaluateChefPricing()`. That function is currently isolated to `lib/pricing/evaluate.ts:286-452` and not wired across the app.
- Do not change invoice, ledger, payout, or analytics math to read `baseline_*` fields. Those flows should continue using final price fields like `quoted_price_cents`.
- Do not fix the separate rate-card holiday-range issue in `components/pricing/rate-card-view.tsx:107-110` as part of this spec.
- Do not backfill legacy quotes/events with synthetic baselines.

### 13. Is this the simplest complete version?

Yes. The codebase has several pricing sources and an unused richer evaluation helper, but the narrowest complete fix is:

- unify persistence of baseline vs final pricing,
- propagate it through quote-to-event flows,
- protect it from downstream overwrite,
- and render it on the key quote/event/client surfaces.

Anything larger, such as replacing every pricing computation path with `evaluateChefPricing()`, would be a separate refactor. Evidence for the current split is in `lib/pricing/evaluate.ts:286-452`, the active quote calculator path at `components/quotes/quote-form.tsx:486-503`, and the separate source systems at `lib/booking/booking-settings-actions.ts:49-77`, `app/(chef)/quotes/new/page.tsx:140-165`, and `database/migrations/20260303000017_recurring_services.sql:9-40`.

### 14. If implemented exactly as written, what would still be wrong?

- Historical quotes and events still will not show a crossed-out normal price, because the codebase does not have a trustworthy baseline for those records today. That is intentional.
- Public instant-book still starts from one configured price, not from a chef-set live override at checkout time. This spec only normalizes the persisted metadata after creation.
- Analytics and invoices will still report final payable amounts only, not baseline-vs-final comparisons. That is also intentional, because those systems are accounting/reporting flows, not sales-comparison UI.

## Final Check

**Is this spec production-ready, or am I proceeding with uncertainty?**

This spec is production-ready for the core quote/event pricing-override problem.

**Remaining uncertainty**

- "Food operator" permissions are not independently verified as a separate role model. This spec resolves that safely by keeping pricing control inside the current chef-scoped action model.
- Event-series/session UI reach is not fully traced. This spec resolves that by making series/session work data-only unless a verified surface is already in scope.

Neither uncertainty blocks the correctness of the quote, event, booking-source, and client-display paths defined above.
