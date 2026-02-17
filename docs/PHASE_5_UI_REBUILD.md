# Phase 5: UI Rebuild — All Type Errors Resolved

**Date:** 2026-02-16
**Phase:** 5 of multi-phase schema migration
**Goal:** Fix all 59 remaining UI type errors in `app/` and `components/` to achieve 0 errors project-wide
**Constraint:** Only `app/` and `components/` files. No `lib/`, `supabase/`, or `types/database.ts` modifications (except 2 ESLint-only fixes in Stripe files).

## Result

**0 type errors project-wide. Clean `npm run build`. All routes compile.**

## Starting State

59 type errors across 10 files, all in UI layer. Every error stemmed from the schema migration completed in Phase 3 — old column names, removed columns, changed table names, and restructured data types.

## Files Modified

### 1. `components/events/event-form.tsx`
- **Local `Event` type:** Replaced old fields (`title`, `location`, `notes`, `total_amount_cents`, `deposit_required`) with new schema fields (`occasion`, `location_address/city/state/zip`, `special_requests`, `quoted_price_cents`, `serve_time`)
- **Form state:** Added `serve_time`, split `location` into 4 address fields, renamed `title` → `occasion`, `notes` → `specialRequests`, `totalAmount` now maps to `quoted_price_cents`
- **CreateEventInput:** Aligned with new Zod schema — `serve_time` required, `location_address/city/zip` required, `occasion` optional
- **UpdateEventInput:** Same column mapping
- **Form JSX:** Split single location field into address/city/state/zip grid, added serve time input, renamed labels

### 2. `app/(chef)/events/page.tsx` (2 errors)
- `event.title` → `event.occasion || 'Untitled Event'`
- `event.total_amount_cents` → `event.quoted_price_cents ?? 0`
- Table header: "Title" → "Occasion", "Total" → "Quoted Price"

### 3. `app/(chef)/events/[id]/page.tsx` (18 errors — full rewrite)
- **Financial summary:** Manual ledger computation with old entry types (`charge_succeeded`, `refund_succeeded`) → `event_financial_summary` view
- **Transitions query:** `event_transitions` table → `event_state_transitions` table
- **Column refs:** `event.title` → `event.occasion`, `event.location` → composed address, `event.notes` → `event.special_requests`, `event.total_amount_cents` → `event.quoted_price_cents ?? 0`
- **Nullable handling:** `event.deposit_amount_cents` explicitly handled with `?? 0`
- **Transition history:** `transition.metadata` cast to `Record<string, unknown>` for type-safe access

### 4. `app/(chef)/events/[id]/edit/page.tsx` (1 error)
- Maps DB event to `EventForm`'s local `Event` type with explicit field mapping

### 5. `app/(chef)/clients/[id]/client-events-table.tsx` (2 errors)
- `event.title` → `event.occasion || 'Untitled Event'`
- `event.total_amount_cents` → `event.quoted_price_cents ?? 0`

### 6. `app/(chef)/menus/` (4 errors across 4 files)

**`menus-client-wrapper.tsx`:**
- Local `Menu` type: Removed `price_per_person_cents`, `dishes`, `is_active`. Added `status`, `cuisine_type`, `target_guest_count`, `is_template`
- Removed `getDishCount()` (JSONB parsing). Status displayed instead of dish count
- Removed `formatCurrency` import (no longer needed)

**`[id]/page.tsx`:**
- `getMenuEvents` → `getMenuEvent` (singular, 1:1 relationship now)
- Passes `event` (single object or null) instead of `events[]`

**`[id]/menu-detail-client.tsx` (complete rewrite):**
- Menu type: Relational `dishes: Dish[]` with nested `components: Component[]` instead of JSONB
- Dish type: `course_name` (DB column) not `name`, `dietary_tags` not `dietary_flags`
- Used index signatures `[key: string]: unknown` to accept extra DB columns without listing all
- Event: Single optional event instead of `events[]` array
- Statistics section removed (no longer computing `totalRevenue` from events array)
- Status display: `draft|shared|locked|archived` badge instead of `is_active` boolean

**`new/create-menu-form.tsx`:**
- Removed `price_per_person_cents` and `dishes` from `createMenu()` call
- Added `cuisine_type` and `service_style` fields instead
- Dishes are now added separately via `addDishToMenu()` after menu creation

### 7. `app/(chef)/financials/page.tsx` and `financials-client.tsx` (2 errors)

**`financials-client.tsx` (rewrite):**
- `FinancialSummary` type: `totalPayoutsCents/pendingPayoutCents` → `totalTipsCents/totalWithTipsCents`
- `LedgerEntry` type: `stripe_event_id/metadata/events.title` → `transaction_reference/payment_method/event.occasion`
- Entry type labels: Stripe-centric (`charge_succeeded`) → domain-centric (`payment`, `deposit`, `tip`, etc.)
- Entry type colors: Updated for new domain entry types
- Filter options: Updated for new entry types
- 4th summary card: "Pending Payments" → "Tips"

### 8. `components/dashboard/work-surface.tsx` (1 error)
- `item.eventTitle` → `item.eventOccasion`

### 9. `app/(client)/my-events/[id]/page.tsx` (7 errors)
- `event.financial?.[0]` (array) → `event.financial` (object with `totalPaidCents/outstandingBalanceCents/quotedPriceCents/paymentStatus`)
- `event.title` → `event.occasion || 'Upcoming Event'`
- `event.location` → composed address from `location_address/city/state/zip`
- `event.notes` → `event.special_requests`
- `event.deposit_required && event.deposit_amount_cents > 0` → `(event.deposit_amount_cents ?? 0) > 0`
- `event.total_amount_cents` → `financial?.quotedPriceCents`

### 10. `app/(client)/my-events/[id]/pay/page.tsx` (18 errors)
- Same financial object restructuring as detail page
- `event.title` → `event.occasion || 'your event'`
- `event.deposit_required` removed → derived from `depositAmountCents > 0`
- All nullable `number | null` amounts explicitly coerced with `?? 0`
- `paymentAmount` guaranteed non-null before use

### 11. ESLint fixes (not type errors, but build-blocking)
- `lib/stripe/actions.ts` and `app/api/webhooks/stripe/route.ts`: Removed `@typescript-eslint/no-require-imports` and `@typescript-eslint/no-var-requires` eslint-disable comments — these rules don't exist in the project's ESLint config (`next/core-web-vitals` only)

## Key Patterns Applied

| Old Pattern | New Pattern |
|---|---|
| `event.title` | `event.occasion \|\| 'Untitled Event'` |
| `event.location` | `[event.location_address, location_city, location_state, location_zip].filter(Boolean).join(', ')` |
| `event.notes` | `event.special_requests` |
| `event.total_amount_cents` | `event.quoted_price_cents ?? 0` |
| `event.deposit_required` | `(event.deposit_amount_cents ?? 0) > 0` |
| `financial?.[0]` (array) | `financial` (object or null) |
| `financial.collected_cents` | `financial.totalPaidCents` |
| `financial.expected_total_cents` | `financial.quotedPriceCents` |
| `menu.dishes` (JSONB) | `menu.dishes` (relational array with nested components) |
| `menu.price_per_person_cents` | removed (pricing at event level now) |
| `menu.is_active` | `menu.status` (draft/shared/locked/archived) |
| `getMenuEvents()` | `getMenuEvent()` (singular) |
| `entry.stripe_event_id` | `entry.transaction_reference` |
| `entry_type: charge_succeeded` | `entry_type: payment/deposit/tip/...` |
| `item.eventTitle` | `item.eventOccasion` |

## Verification

- `npx tsc --noEmit` — 0 errors
- `npm run build` — clean build, all routes compiled
- Public layer pages verified clean (no type errors existed there)
- No dead local types remaining (all stale types rewritten inline)

## What's Next

The full codebase is now type-safe against the 23-table schema. Next steps would be:
- UI polish and design improvements
- Testing with real data against the remote Supabase instance
- Feature completion for remaining CRUD flows (dish/component management UI)
