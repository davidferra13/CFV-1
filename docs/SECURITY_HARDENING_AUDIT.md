# Security Hardening & Gap Audit — February 17, 2026

## Summary

A comprehensive audit of the ChefFlow V1 codebase identified critical security gaps, missing RLS policies, incomplete webhook coverage, and 38 instances of database error message leakage. All identified issues were fixed in a single pass.

---

## What Changed

### 1. `appendLedgerEntry` Security Fix (CRITICAL)

**File:** `lib/ledger/append.ts`

**Problem:** `appendLedgerEntry` was exported as a server action. When called with `created_by: null`, it created a service-role Supabase client with full DB access. Since Next.js server actions are POST endpoints, any authenticated user could invoke it directly and write arbitrary ledger entries with full admin privileges.

**Fix:**

- Renamed to `appendLedgerEntryInternal` (not exported — module-private)
- Created `appendLedgerEntryFromWebhook` (typed to enforce `created_by: null`) for webhook use
- `createAdjustment` (chef-gated) calls the internal function
- Webhook handler updated to use `appendLedgerEntryFromWebhook`

**Why it matters:** The ledger is the financial source of truth. An unauthenticated write path to it is the most dangerous vulnerability in the system.

---

### 2. Client RLS Policies for Events & Quotes (CRITICAL)

**File:** `supabase/migrations/20260217000001_client_rls_and_fixes.sql`

**Problem:** The `events` and `quotes` tables only had chef tenant-isolation RLS policies. No client SELECT policies existed. `getClientEvents()` and `getClientQuotes()` silently returned empty arrays — the entire client portal was functionally broken at the database layer.

**Fix:** Added two new RLS policies:

- `events_client_can_view_own` — clients can SELECT events where `client_id = get_current_client_id()`
- `quotes_client_can_view_own` — clients can SELECT quotes where `client_id = get_current_client_id()`

Pattern matches the existing `ledger_entries_client_can_view_own` policy from Layer 3.

---

### 3. Middleware Route Protection Expanded

**File:** `middleware.ts`

**Problem:** `chefPaths` only covered 5 of 12+ chef route groups. `/inquiries`, `/quotes`, `/expenses`, `/schedule`, `/settings`, `/aar`, `/recipes`, `/loyalty`, `/import` relied solely on layout-level `requireChef()`. A client navigating to `/inquiries` would hit an error page instead of a clean redirect.

**Fix:** Expanded arrays:

```
chefPaths: + /inquiries, /quotes, /expenses, /schedule, /settings, /aar, /recipes, /loyalty, /import
clientPaths: + /my-quotes
```

This restores the "no flash of wrong portal" defense-in-depth philosophy.

---

### 4. Financials Page: Outstanding Payments Wired In

**File:** `app/(chef)/financials/page.tsx`

**Problem:** `pendingPaymentsCents = 0` was hardcoded with a TODO comment. The `getOutstandingPayments()` function existed in `lib/dashboard/actions.ts` but was never connected.

**Fix:** Imported `getOutstandingPayments`, added it to the `Promise.all`, and passes `outstanding.totalOutstandingCents` to the client component.

---

### 5. Event Date Validation Strengthened

**File:** `lib/events/actions.ts`

**Problem:** `event_date` was validated as `z.string().min(1)`. A value like `"not-a-date"` would pass Zod and produce a raw Postgres error.

**Fix:** Changed to `z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Event date must be YYYY-MM-DD format')`.

---

### 6. `acceptEventProposal` Now Uses FSM

**File:** `lib/events/client-actions.ts`

**Problem:** `acceptEventProposal` directly wrote `status: 'accepted'` to the events table, bypassing the `transitionEvent()` FSM. This meant no FSM validation, and if transition rules changed, this path would drift.

**Fix:** Replaced the direct DB write with a call to `acceptProposal()` from `lib/events/transitions.ts`, which delegates to `transitionEvent()`. This ensures consistent state validation, permission checks, and audit logging through the single FSM pathway.

---

### 7. Stripe Webhook: New Event Handlers

**File:** `app/api/webhooks/stripe/route.ts`

**Problem:** Only handled `payment_intent.succeeded`, `payment_intent.payment_failed`, and `charge.refunded`. Missing events could leave financial state stuck or untracked.

**Fix:** Added three new handlers:

- `payment_intent.canceled` — logs 0-amount adjustment with cancellation reason
- `charge.dispute.created` — logs 0-amount adjustment noting the dispute
- `charge.dispute.funds_withdrawn` — logs refund entry for the disputed amount

---

### 8. Refund Handler Type Safety

**File:** `app/api/webhooks/stripe/route.ts`

**Problem:** `refund.charge as string` would throw if `refund.charge` was null (possible in certain Stripe refund scenarios).

**Fix:** Added null/type guard before the Stripe API call:

```ts
if (!refund.charge || typeof refund.charge !== 'string') {
  console.error('[handleRefund] No charge ID on refund object:', refund.id)
  return
}
```

---

### 9. DB Error Messages Sanitized (38 instances across 14 files)

**Problem:** Server actions threw errors that interpolated raw database error messages:

```ts
throw new Error(`Failed to create event: ${error.message}`)
```

These messages can expose schema information, column names, and constraint details to the browser.

**Fix:** Replaced all 38 instances with static error messages:

```ts
throw new Error('Failed to create event')
```

The `console.error` above each throw already logs the full error detail server-side.

**Files affected:** `lib/aar/actions.ts`, `lib/ai/import-actions.ts`, `lib/clients/milestones.ts`, `lib/documents/import-actions.ts`, `lib/events/actions.ts`, `lib/expenses/actions.ts`, `lib/expenses/unused.ts`, `lib/ingredients/pricing.ts`, `lib/inquiries/actions.ts`, `lib/menus/modifications.ts`, `lib/messages/actions.ts`, `lib/quotes/actions.ts`, `lib/recipes/actions.ts`, `lib/shopping/substitutions.ts`

---

### 10. `chef_documents` FK Cascade Fix

**File:** `supabase/migrations/20260217000001_client_rls_and_fixes.sql`

**Problem:** `chef_documents.tenant_id` FK did not have `ON DELETE CASCADE`. Every other tenant-scoped table cascades on chef deletion, but this one would block it with an FK violation.

**Fix:** Migration drops and recreates the FK with `ON DELETE CASCADE`. Also adds missing indexes on `event_id` and `client_id` columns.

---

## What Was NOT Changed (Remaining Items)

These items were identified during the audit but are **not security-critical** and were deferred:

| Item                                                           | Priority | Reason for Deferral                                                |
| -------------------------------------------------------------- | -------- | ------------------------------------------------------------------ |
| No rate limiting on auth/AI endpoints                          | Medium   | Requires infrastructure decision (middleware vs. external service) |
| No test suite                                                  | Medium   | Architectural decision — needs framework selection                 |
| Client portal thin features (messaging, profile, loyalty page) | Low      | Feature work, not bug/security fix                                 |
| `clients.average_spend_cents` never updated                    | Low      | View computes it correctly; column is cosmetic                     |
| Audit triggers missing on Layer 3+ tables                      | Low      | State transition tables provide partial coverage                   |
| Inconsistent RLS pattern in Layer 7 tables                     | Low      | Both patterns work; cosmetic inconsistency                         |

---

## Migration Required

Run the new migration to apply RLS and FK fixes:

```bash
npx supabase db push --linked
```

This migration:

1. Adds client SELECT policies to `events` and `quotes`
2. Fixes `chef_documents` FK to cascade on delete
3. Adds indexes on `chef_documents.event_id` and `chef_documents.client_id`

---

## How It Connects

- **Ledger security** directly enforces System Law #3 (immutable, append-only financial truth)
- **RLS fixes** enforce System Law #2 (tenant isolation at every layer)
- **FSM consolidation** enforces System Law #4 (single transition pathway)
- **Middleware expansion** enforces the "no flash of wrong portal" defense-in-depth philosophy
- **Error sanitization** follows OWASP guidance on information disclosure prevention
