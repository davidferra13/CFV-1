# External Directory - Implementation Report

> What was built, what was already done, and what changed.

---

## Audit Results

A comprehensive three-layer audit was performed across 495 pages, 28 v2 API routes, 62 Remy actions, and ~4,093 server actions. Every feature was classified by its access coverage: UI (add button), API (REST endpoint), and Remy (conversational AI).

**Before this session:**

- 12 features had FULL coverage (UI + API + Remy)
- 4 features were classified as DARK (no UI, no API, no Remy)
- Recipes and expenses had read-only API (no PATCH)
- Inquiries had no outbound webhook dispatch

**After this session:**

- 13 features have FULL coverage (update expense gained API, completing the trio)
- 1 feature remains DARK (price comparison, now mitigated with CTA linking to vendors)
- 3 previously-classified DARK features confirmed to have working CTAs (network connections, network channels, waste logging)

---

## Changes Made

### 1. PATCH /api/v2/recipes/[id] (NEW)

**File:** `app/api/v2/recipes/[id]/route.ts`

Previously read-only (GET only). Added PATCH handler supporting:

- `title`, `description`, `cuisine_type`, `course`
- `prep_time_minutes`, `cook_time_minutes`, `servings`, `difficulty`
- `instructions`, `notes`, `tags`, `is_archived`

Follows the same pattern as events PATCH: Zod validation, tenant scoping, ownership verification, structured error responses.

### 2. PATCH /api/v2/expenses/[id] (NEW)

**File:** `app/api/v2/expenses/[id]/route.ts`

Previously read-only (GET only). Added PATCH handler supporting:

- `amount_cents`, `category`, `vendor_name`, `description`
- `expense_date`, `receipt_url`, `event_id`, `notes`
- `is_reimbursable`, `payment_method`

This promotes "Update expense" from UI+REMY to FULL coverage (UI + API + Remy).

### 3. Price Comparison UI Fix

**File:** `components/vendors/price-comparison.tsx`

**Problem:** The component accepted no props (ignored the `data` prop passed by the page), had no "Add Item" CTA, and only showed search results. Users could search but not add items or see pre-loaded comparisons.

**Fix:**

- Component now accepts `data?: PreloadedItem[]` prop and renders all tracked items grouped by item name
- Added "Add Vendor Item" button (links to `/vendors` where items are added per-vendor)
- Vendor names are now clickable links to their profile pages
- Pre-loaded data shows best price highlighting per item
- Search functionality preserved as a secondary feature

### 4. Inquiry Webhook Dispatch

**File:** `lib/inquiries/actions.ts`

Added `emitWebhook()` calls to:

- `createInquiry()` - emits `inquiry.received` with inquiry details
- `updateInquiry()` - emits `inquiry.updated` with changed fields

Follows the established non-blocking try/catch pattern. Inquiries already had Zapier webhook dispatch; this adds the v2 outbound webhook system alongside it.

### 5. Audit Document Updates

**File:** `docs/external-directory-audit.md`

- Corrected DARK feature count from 4 to 1 (network and waste confirmed to have CTAs)
- Updated recipes from UI-ONLY to UI+API (PATCH added)
- Updated expenses from UI+REMY to FULL (PATCH added)
- Updated webhook endpoints from UI-ONLY to UI+API (webhook CRUD routes exist)
- Updated FULL coverage count from 12 to 13
- Added update log entry

---

## What Was Already Built (discovered during audit)

The exploration phase revealed that ~80% of the 5-phase build plan was already implemented:

| Component                                                                                                                                                      | Status       |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| API v2 infra (response, middleware, scopes, pagination)                                                                                                        | Already done |
| 28 v2 API routes (events, clients, quotes, inquiries, menus, recipes, expenses, ledger, payments, financials, search, documents, settings, automations, queue) | Already done |
| Pricing config (migration, types, actions, form, API route)                                                                                                    | Already done |
| Webhook system (migrations, emitter, actions, settings page, API routes)                                                                                       | Already done |
| emitWebhook wired into events, clients, quotes, expenses, menus, transitions                                                                                   | Already done |
| Keyboard shortcuts (provider, help overlay, definitions, layout wiring)                                                                                        | Already done |

---

## Remaining Gaps (for future work)

### API gaps (Tier 1)

- `DELETE` handlers on expenses, quotes, menus, inquiries v2 routes

### API gaps (Tier 2, new resources)

- `/api/v2/invoices`, `/api/v2/staff`, `/api/v2/vendors`, `/api/v2/inventory`, `/api/v2/calls`

### API gaps (Tier 3, action endpoints)

- `POST /api/v2/events/[id]/clone`
- `POST /api/v2/events/[id]/archive`
- `POST /api/v2/menus/[id]/approve`
- `POST /api/v2/clients/[id]/merge`
- `POST /api/v2/inquiries/[id]/convert`

### Module-level API coverage

11 modules still have zero API coverage (Finance beyond expenses, Commerce/POS, Inventory, Staff, Vendors, Analytics, Marketing, Loyalty, Community/Network, Compliance, Proposals).
