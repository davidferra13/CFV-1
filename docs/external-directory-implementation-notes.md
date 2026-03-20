# External Directory Implementation Notes

## Changes Made (2026-03-20)

### Step 1: DARK Feature Fixes (4 UI CTA additions)

These features had no discoverable "add" mechanism. Fixed with targeted UI changes:

1. **`/network` Connections tab** - Added "+ Add Connection" header button that anchors to the Find Chefs search card. Previously the ChefSearch component was buried without a prominent CTA.

2. **`/network` Channels tab** - Added available channel count badge ("X channels available to join"). Channels are system-defined (join/leave only, no user creation), so the fix is discoverability of the join action.

3. **`/inventory/waste`** - Added "+ Log Waste" header button that anchors to the waste log form section. The form was always present but not prominently discoverable below the analytics dashboard.

4. **`/vendors/price-comparison`** - Added "+ Add Vendor Items" primary button in the header (always visible). This page is read-only by design; data comes from vendor detail pages. The CTA navigates to `/vendors` where items can be added.

### Step 2: Missing CRUD on v2 Resources

**Already complete.** Verified all v2 routes have appropriate HTTP methods:

- `recipes/[id]`: GET + PATCH (no DELETE by design, recipes are immutable after use)
- `expenses/[id]`: GET + PATCH + DELETE
- `quotes/[id]`: GET + PATCH + DELETE
- `menus/[id]`: GET + PATCH + DELETE
- `inquiries/[id]`: GET + PATCH + DELETE
- `events/[id]`: GET + PATCH + DELETE
- `clients/[id]`: GET + PATCH (no DELETE by design)
- `staff/[id]`: GET + PATCH + DELETE
- `vendors/[id]`: GET + PATCH + DELETE
- `calls/[id]`: GET + PATCH + DELETE

### Step 3: Webhook Emitter Wiring

Already wired in 8 files (events, clients, quotes, inquiries, menus, expenses, taxonomy, transitions). Added to 2 remaining files:

- **`lib/finance/expense-actions.ts`** - Added `emitWebhook` calls for `expense.created`, `expense.updated`, `expense.deleted` (non-blocking, try/catch wrapped)
- **`lib/ledger/append.ts`** - Added `emitWebhook` call for `payment.received` in `appendLedgerEntryInternal` (non-blocking)

### Step 4: Webhook Management API

**Already complete.** Verified all 4 webhook routes exist:

- `GET/POST /api/v2/webhooks` (list + create)
- `PATCH/DELETE /api/v2/webhooks/[id]` (update + delete)
- `POST /api/v2/webhooks/[id]/test` (test delivery)
- `GET /api/v2/webhooks/[id]/logs` (delivery log)

### Step 5: New Resource APIs

**Already complete.** All planned resource APIs exist:

- `/api/v2/staff` with full CRUD
- `/api/v2/vendors` with full CRUD
- `/api/v2/inventory` (list endpoint)
- `/api/v2/calls` with full CRUD
- `/api/v2/invoices` (list endpoint)

### Step 6: Action API Endpoints

**Already complete.** All 5 action endpoints exist:

- `POST /api/v2/events/[id]/clone`
- `POST /api/v2/events/[id]/archive`
- `POST /api/v2/menus/[id]/approve`
- `POST /api/v2/clients/[id]/merge`
- `POST /api/v2/inquiries/[id]/convert`

### Step 7: Pricing Config Polish

**Already complete.** Verified:

- `components/settings/pricing-config-form.tsx` exists and is functional
- `lib/pricing/compute.ts` accepts optional `config?: PricingConfig` parameter
- Settings page at `/settings/pricing` renders `PricingConfigForm`

### Docs Updated

- `docs/external-directory-gap-analysis.md` - Category B reduced from 23 to 12 remaining gaps. Category D expanded from 23 to 34 covered features.

## Remaining Gaps (Category B)

These features have UI but no v2 API endpoint yet:

1. Send notification API
2. Menu engine toggle settings API
3. Module toggle settings API
4. Dashboard widget settings API
5. Booking page settings API
6. Remy approval policies API
7. Commerce/POS API
8. Marketing campaigns API
9. Loyalty program API
10. Goals API
11. Partners API
12. Safety incidents API

These are lower-priority Tier 2/3 features. The core business workflow (events, clients, quotes, inquiries, menus, recipes, expenses, payments, documents, staff, vendors, inventory, calls, invoices, webhooks) now has full API coverage.
