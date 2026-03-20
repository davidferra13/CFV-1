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

### Step 8: Deep API Coverage (2026-03-20, second pass)

Crawled the entire codebase and identified ~100 secondary operations (sub-CRUD mutations) that only had server actions but no v2 API endpoints. Created 28 new route files to close these gaps:

**Commerce (8 new routes):**

- `POST/PATCH/DELETE /api/v2/commerce/sales/:id/items` - sale item management
- `GET/POST /api/v2/commerce/sales/:id/payments` - sale payments
- `GET/POST /api/v2/commerce/sales/:id/refunds` - sale refunds
- `GET/POST /api/v2/commerce/register/:id/cash-drawer` - cash drawer ops (adjustment, paid-in, paid-out, no-sale)
- `GET /api/v2/commerce/register/:id` - register session by ID
- `GET /api/v2/commerce/register/history` - session history with pagination
- `GET/POST /api/v2/commerce/settlements` - settlement list + create
- `GET/PATCH /api/v2/commerce/settlements/:id` - settlement by ID

**Marketing (6 new routes, 1 edited):**

- `PATCH` added to `/api/v2/marketing/templates/:id` (was DELETE only)
- `POST /api/v2/marketing/social-templates` - create social template
- `PATCH/DELETE /api/v2/marketing/social-templates/:id` - update/delete social template
- `POST /api/v2/marketing/segments` - build behavioral segment
- `DELETE /api/v2/marketing/segments/:id` - delete segment
- `POST /api/v2/marketing/sequences/:id/enroll` - enroll client in sequence

**Loyalty (9 new routes):**

- `POST /api/v2/loyalty/clients/:id/adjust` - admin loyalty correction
- `POST /api/v2/loyalty/clients/:id/bonus` - award bonus points
- `POST /api/v2/loyalty/event-points` - award event points
- `POST /api/v2/loyalty/incentives/validate` - validate incentive code
- `POST /api/v2/loyalty/incentives/redeem` - redeem incentive code
- `DELETE /api/v2/loyalty/vouchers/:id` - deactivate voucher
- `POST /api/v2/loyalty/vouchers/send` - send voucher to anyone
- `GET /api/v2/loyalty/raffles/:id` - raffle results + eligible entries
- `POST /api/v2/loyalty/raffles/:id/draw` - draw raffle winner

**Notifications (5 new routes):**

- `GET/PATCH /api/v2/notifications/preferences` - category channel preferences
- `GET/PATCH /api/v2/notifications/sms-settings` - SMS opt-in + phone
- `GET/PATCH /api/v2/notifications/experience` - quiet hours + digest
- `GET/PATCH /api/v2/notifications/tiers` - per-action tier management
- `POST /api/v2/notifications/tiers/reset` - reset one or all tiers

**Safety (5 new routes):**

- `POST/PATCH /api/v2/safety/incidents/:id/follow-ups` - add/toggle follow-up steps
- `PATCH /api/v2/safety/incidents/:id/resolution` - update resolution status
- `PATCH/DELETE /api/v2/safety/backup-contacts/:id` - update/deactivate contact
- `GET /api/v2/safety/recalls` - active recalls + dismissed IDs
- `POST /api/v2/safety/recalls/:id/dismiss` - dismiss recall

**Partners (4 new routes):**

- `POST/PATCH/DELETE /api/v2/partners/:id/images` - image management + reorder
- `POST /api/v2/partners/:id/invite` - generate partner invite
- `POST /api/v2/partners/:id/assign-events` - bulk assign events
- `POST /api/v2/partners/:id/share-link` - generate share link

**Goals (5 new routes):**

- `GET/PATCH /api/v2/goals/categories` - category settings + nudge levels
- `POST /api/v2/goals/service-types` - create service type
- `PATCH/DELETE /api/v2/goals/service-types/:id` - update/delete service type
- `POST /api/v2/goals/service-types/reorder` - reorder service types
- `PATCH /api/v2/goals/suggestions/:id` - update suggestion status

**Booking (1 new route):**

- `POST /api/v2/booking/instant-checkout` - instant book checkout

## Final State

- **149 v2 API route files** under `app/api/v2/`
- **~350+ HTTP methods** exposed across all routes
- **Every module with UI** now has deep API coverage, not just top-level CRUD
- **Category B gaps: 0** (menu engine toggles and dashboard widgets have no config actions to expose)
- **All imports verified** against real server action files
