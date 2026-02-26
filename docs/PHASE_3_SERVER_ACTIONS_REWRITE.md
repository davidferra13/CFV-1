# Phase 3: Core Server Actions Rewrite

**Date:** 2026-02-16
**Phase:** 3 of multi-phase schema migration
**Goal:** Rewrite ALL existing server actions to compile cleanly against the new 23-table schema
**Constraint:** Only `lib/` files. No UI files touched.

## Result

**0 type errors in `lib/` files.**
59 remaining errors are exclusively in `app/` and `components/` UI files (expected, Phase 4 scope).

## Files Rewritten

### 1. `lib/clients/actions.ts`

- Removed duplicate `getInvitationByToken` and `markInvitationUsed` (extracted to `lib/auth/invitations.ts` in Phase 2)
- Expanded `UpdateClientSchema` with all new client columns (partner_name, parking_instructions, kitchen_size, etc.)
- `getClientsWithStats()` now queries `client_financial_summary` view instead of manual computation
- `getClientWithStats()` uses view columns: `total_events_count`, `lifetime_value_cents`, `average_spend_per_event`, `outstanding_balance_cents`

### 2. `lib/events/actions.ts`

- `CreateEventSchema` and `UpdateEventSchema` completely rewritten:
  - Removed: `title`, `location`, `total_amount_cents`, `deposit_required`
  - Added: `occasion`, `location_address/city/state/zip`, `serve_time`, `quoted_price_cents`, `service_style`, `pricing_model`, `dietary_restrictions`, `allergies`, `special_requests`, `site_notes`, `kitchen_notes`, `location_notes`, `arrival_time`, `departure_time`, `cannabis_preference`
- `pricing_model` enum corrected: `per_person | flat_rate | custom` (not `fixed | hourly | variable`)
- `payment_method_primary` includes `other` enum value
- `createEvent()` inserts all new columns, logs to `event_state_transitions` (not `event_transitions`)
- `updateEvent()` only allows updates in `draft` or `proposed` status

### 3. `lib/events/transitions.ts`

- Table name: `event_transitions` → `event_state_transitions`
- Removed `status_changed_at` (column doesn't exist)
- `cancelled_by` (string) → `cancellation_initiated_by` (enum: `chef | client | mutual`)
- `metadata` type: `Record<string, any>` → `Record<string, unknown>`

### 4. `lib/events/client-actions.ts`

- Menu queries: `event_menus` junction table → `menus.event_id` FK direct query
- Removed `price_per_person_cents` from menu select
- State transitions: `event_transitions` → `event_state_transitions`
- Financial summary uses view columns: `total_paid_cents`, `outstanding_balance_cents`, `quoted_price_cents`, `payment_status`

### 5. `lib/ledger/append.ts`

- Entry types: Old Stripe-centric (`charge_succeeded`, `charge_failed`, `refund_succeeded`) → Domain-centric (`payment`, `deposit`, `installment`, `final_payment`, `tip`, `refund`, `adjustment`, `add_on`, `credit`)
- Payment method: Required field (`cash | venmo | paypal | zelle | card | check | other`)
- Removed: `stripe_event_id`, `stripe_object_id`, `stripe_event_type`, `currency`, `metadata`
- Added: `transaction_reference` (for idempotency), `payment_card_used`, `internal_notes`, `is_refund`, `refund_reason`, `refunded_entry_id`, `received_at`
- `getTenantLedger()` joins with `events(id, occasion, event_date)` instead of `events(title)`

### 6. `lib/ledger/compute.ts`

- `getEventFinancialSummary()` uses `event_financial_summary` view columns
- `getTenantFinancialSummary()` aggregates new entry types

### 7. `lib/ledger/actions.ts`

- CSV export uses `entry.event?.occasion` instead of `entry.events?.title`
- Uses `entry.transaction_reference` instead of `entry.stripe_event_id`
- Includes `entry.payment_method` in CSV output

### 8. `lib/menus/actions.ts` (Complete Rewrite)

- **Architecture change:** JSONB `dishes` column → Relational hierarchy: menus → dishes → components
- **Menu-event relationship:** `event_menus` junction table → `menus.event_id` FK
- Removed: `price_per_person_cents`, `is_active`, `dishes` JSONB
- Added: `service_style`, `cuisine_type`, `target_guest_count`, `notes`, `is_template`, `status` (draft/shared/locked/archived)
- New functions:
  - Dish CRUD: `addDishToMenu()`, `updateDish()`, `deleteDish()`
  - Component CRUD: `addComponentToDish()`, `updateComponent()`, `deleteComponent()`
  - Menu status transitions: `transitionMenu()` with `menu_state_transitions` audit log
  - `duplicateMenu()` copies full hierarchy (menu → dishes → components)
  - `getMenuById()` returns menu with nested dishes and components
  - `attachMenuToEvent()` / `detachMenuFromEvent()` via `menus.event_id`
- `getMenuEvents()` renamed to `getMenuEvent()` (1:1 relationship now)

### 9. `lib/stripe/actions.ts`

- Lazy Stripe initialization (avoids module-level side effects)
- Removed `clients.stripe_customer_id` references (column doesn't exist)
- Payment amount logic uses `event_financial_summary` view: outstanding balance, deposit, or quoted price
- `getEventPaymentStatus()` returns `paymentStatus` enum instead of boolean flags

### 10. `app/api/webhooks/stripe/route.ts`

- Lazy Stripe initialization
- Idempotency: `stripe_event_id` → `transaction_reference`
- `appendLedgerEntry()` calls use new signature: `payment_method`, `description`, `client_id` required
- Entry types: `charge_succeeded` → `payment`/`deposit`, `charge_failed` → `adjustment`, `refund_succeeded` → `refund`
- `headers()` awaited (Next.js async headers)

### 11. `lib/workflow/types.ts`

- `EventContext.event`: `title` → `occasion`, `location` → `location_address`, `notes` → `special_requests`, `total_amount_cents` → `quoted_price_cents`, `deposit_required` removed, `serve_time` added
- `EventContext.menus`: `dishes: unknown` → `dishCount: number`, `status: string` added
- `EventContext.financial`: `collectedCents/isDepositPaid/isFullyPaid` → `totalPaidCents/outstandingBalanceCents/paymentStatus`
- `ConfirmedFacts`: `hasTitle` → `hasOccasion`
- `WorkItem` / `EventWorkSurface`: `eventTitle` → `eventOccasion`

### 12. `lib/workflow/confirmed-facts.ts`

- `event.title.trim()` → `(event.occasion ?? '').trim()`
- `event.location.trim()` → `(event.location_address ?? '').trim()`
- `event.total_amount_cents > 0` → `(event.quoted_price_cents ?? 0) > 0`
- `hasServeTimeWindow`: Was checking `event_date.includes('T')`, now checks `serve_time` field
- Menu dish check: `m.dishes && Array.isArray(m.dishes)` → `m.dishCount > 0`
- Payment status derived from `paymentStatus` enum instead of boolean flags

### 13. `lib/workflow/actions.ts`

- `event_menus` table → `menus` table with `event_id` filter
- Removed `menus.dishes` from select (dishes are relational)
- Added dish count query (separate query, grouped by `menu_id`)
- Financial summary uses view columns: `total_paid_cents`, `outstanding_balance_cents`, `payment_status`
- Event mapping uses new column names throughout

### 14. `lib/workflow/preparable-actions.ts` and `lib/workflow/stage-definitions.ts`

- `eventTitle` → `eventOccasion` throughout
- `ctx.event.title` → `ctx.event.occasion ?? ''`

## Key Schema Changes Addressed

| Old Schema                             | New Schema                                         |
| -------------------------------------- | -------------------------------------------------- |
| `events.title`                         | `events.occasion`                                  |
| `events.location`                      | `events.location_address/city/state/zip`           |
| `events.total_amount_cents`            | `events.quoted_price_cents`                        |
| `events.deposit_required`              | removed (deposit_amount_cents > 0 implies deposit) |
| `events.notes`                         | `events.special_requests`                          |
| `events.cancelled_by` (string)         | `events.cancellation_initiated_by` (enum)          |
| `event_transitions` table              | `event_state_transitions` table                    |
| `event_menus` junction table           | `menus.event_id` FK                                |
| `menus.dishes` (JSONB)                 | `dishes` table (relational)                        |
| `menus.price_per_person_cents`         | removed                                            |
| `menus.is_active`                      | `menus.status` (draft/shared/locked/archived)      |
| `ledger_entries.stripe_event_id`       | `ledger_entries.transaction_reference`             |
| `ledger_entries.currency/metadata`     | removed                                            |
| `pricing_model`: fixed/hourly/variable | per_person/flat_rate/custom                        |
| `payment_status`: boolean flags        | enum: unpaid/deposit_paid/partial/paid/refunded    |

## Remaining UI Errors (Phase 4 Scope)

59 errors across these files:

- `app/(chef)/events/[id]/page.tsx` (18) — old column names, old table references
- `app/(client)/my-events/[id]/pay/page.tsx` (18) — old columns, `deposit_required`
- `app/(client)/my-events/[id]/page.tsx` (7) — old columns
- `app/(chef)/menus/` (4) — old menu type structure
- `app/(chef)/events/page.tsx` (2) — `title`, `total_amount_cents`
- `app/(chef)/financials/page.tsx` (2) — old financial summary types
- `app/(chef)/clients/[id]/client-events-table.tsx` (2) — old columns
- `components/events/event-form.tsx` (2) — old `title` field
- `app/(chef)/events/[id]/edit/page.tsx` (1) — old Event type
- `components/dashboard/work-surface.tsx` (1) — `eventTitle` → `eventOccasion`
