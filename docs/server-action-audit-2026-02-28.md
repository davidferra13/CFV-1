# Server Action Audit Report — 2026-02-28

Comprehensive scan of all server action files in `lib/` and `app/`, focused on
first-month chef workflows: profile setup, creating clients, handling inquiries,
building quotes, managing events, tracking payments, creating menus/recipes.

**Files scanned:** 20+ critical server action files, cross-referenced against
`types/database.ts` (auto-generated schema) for column name accuracy.

---

## CRITICAL — Data Loss / Corruption / Feature Completely Broken

### 1. Calendar: Inquiries never appear (3 wrong column names + wrong status enum)

**File:** `lib/calendar/actions.ts` lines 144-151

```typescript
supabase
  .from('inquiries')
  .select('id, occasion, preferred_date, status') // (a) 'occasion' → should be 'confirmed_occasion'
  .eq('chef_id', chefId) // (b) 'chef_id' → should be 'tenant_id'
  .not('preferred_date', 'is', null) // (c) 'preferred_date' → should be 'confirmed_date'
  .gte('preferred_date', startDate) // (c) same
  .lte('preferred_date', endDate) // (c) same
  .in('status', ['new', 'contacted', 'menu_drafting', 'sent_to_client'])
// (d) actual enum: 'new' | 'awaiting_client' | 'awaiting_chef' | 'quoted' | 'confirmed' | 'declined' | 'expired'
```

**Schema proof:**

- `inquiries` table has `confirmed_date` (NOT `preferred_date`) — `types/database.ts` line 15708
- `inquiries` table has `tenant_id` (NOT `chef_id`) — `types/database.ts` line 15736
- `inquiries` table has `confirmed_occasion` (NOT `occasion`) — `types/database.ts` line 15712
- Status enum values are `new | awaiting_client | awaiting_chef | quoted | confirmed | declined | expired` — `types/database.ts` lines 28687-28693. Three of the four filtered statuses (`contacted`, `menu_drafting`, `sent_to_client`) don't exist.

**What happens:** The query silently returns zero rows (Supabase ignores unknown columns with `as any` typing). Inquiries **never** appear on the calendar. A chef with 20 active inquiries sees an empty calendar for those dates. They have no visual awareness of potential bookings and may double-book dates that have pending inquiries.

**Severity:** CRITICAL — core feature silently broken

---

### 2. Client Portal: Queries non-existent `first_name`/`last_name` columns

**File:** `lib/client-portal/actions.ts` lines 103-112

```typescript
const { data: client } = await supabase
  .from('clients')
  .select('id, first_name, last_name, portal_access_token')
  .eq('portal_access_token', token)
  .single()

// ...
const clientName =
  [client.first_name, client.last_name].filter(Boolean).join(' ') || 'Valued Client'
```

**Schema proof:** The `clients` table has `full_name` (line 6776 in `types/database.ts`). There is no `first_name` or `last_name` column.

**What happens:** When a client clicks their magic link to view their portal, the `first_name` and `last_name` fields come back as `null` from Supabase (it doesn't error on unknown columns in select). The name always falls through to `'Valued Client'`. Not a crash, but every client sees a generic name instead of their own. The portal works but feels impersonal and broken.

**Severity:** CRITICAL — client-facing feature always shows wrong name

---

### 3. Follow-up Sequences: Same `first_name`/`last_name` column mismatch

**File:** `lib/followup/sequence-builder-actions.ts` lines 149, 158, 232, 241

```typescript
.select('id, first_name, last_name')
// ...
const clientName = [client.first_name, client.last_name].filter(Boolean).join(' ') || 'there'
```

**Schema proof:** Same as #2 — `clients` table has `full_name` only.

**What happens:** Re-engagement and follow-up sequences are generated with "Re-Engagement: there" as the sequence name, and personalized email content addresses the client as "there" instead of their actual name. Automated follow-ups look broken and unprofessional.

**Severity:** CRITICAL — automated outreach sends depersonalized messages

---

### 4. Availability Sharing: Queries non-existent `first_name` on `chefs` table

**File:** `lib/scheduling/availability-share-actions.ts` line 191

```typescript
const { data: chefRow } = await supabase
  .from('chefs')
  .select('first_name')
  .eq('id', tenantId)
  .single()
```

**Schema proof:** The `chefs` table has `display_name` and `business_name` (lines 5707, 5696 in `types/database.ts`). There is no `first_name` column.

**What happens:** When a chef shares their availability calendar with a client, the chef's name comes back as `null`. The shared availability page either shows no name or a generic placeholder. Clients receiving a shared availability link see a nameless page.

**Severity:** CRITICAL — client-facing feature shows no chef name

---

## HIGH — Feature Broken or Significant Risk

### 5. Invoice Number Race Condition

**File:** `lib/events/invoice-actions.ts` lines 102-114

```typescript
export async function generateInvoiceNumber(tenantId: string): Promise<string> {
  const supabase: any = createServerClient()
  const year = new Date().getFullYear()

  const { count } = await supabase
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .like('invoice_number', `INV-${year}-%`)

  const seq = (count ?? 0) + 1
  return `INV-${year}-${String(seq).padStart(3, '0')}`
}
```

**What happens:** If two payments are processed simultaneously (e.g., two clients pay at the same moment, or a Stripe webhook fires while the chef is recording an offline payment), both calls read the same count and generate the same invoice number (e.g., both get `INV-2026-005`). The second `UPDATE` silently overwrites the first event's invoice number, or both events end up with the same number. Duplicate invoice numbers cause accounting confusion and potential legal issues.

**Fix needed:** Use a database sequence, `SELECT FOR UPDATE`, or an atomic `INSERT ... RETURNING` pattern.

**Severity:** HIGH — duplicate invoice numbers under concurrent payments

---

### 6. PaymentIntent: No duplicate/double-click protection

**File:** `lib/stripe/actions.ts` lines 28-130

```typescript
export async function createPaymentIntent(eventId: string) {
  // ... no idempotency key, no check for existing pending PaymentIntents
  const paymentIntent = await breakers.stripe.execute(() =>
    stripe.paymentIntents.create(createParams)
  )
  return { clientSecret: paymentIntent.client_secret, amount: amountCents }
}
```

**What happens:** If a client clicks "Pay Now" twice quickly (common on slow connections), two separate PaymentIntents are created for the same event. If the client completes both (unlikely but possible with multiple tabs), the event gets charged twice. Even if only one is completed, the chef sees a phantom PaymentIntent in their Stripe dashboard that looks like a failed charge.

**Fix needed:** Check for existing PaymentIntents with matching `event_id` metadata before creating a new one, or use Stripe idempotency keys.

**Severity:** HIGH — potential double-charge on concurrent clicks

---

### 7. createPaymentIntent: Inconsistent error handling pattern

**File:** `lib/stripe/actions.ts` lines 40-47 vs line 78

```typescript
// Lines 40-42: returns an error object
if (error || !event) {
  return { success: false as const, error: 'Event not found' }
}

// Line 78: throws an exception
if (amountCents <= 0) {
  throw new Error('Invalid payment amount')
}
```

**What happens:** The payment page has to handle two different error patterns from the same function — sometimes a `{ success: false, error: string }` return, sometimes a thrown exception. If the calling component only checks for the return-value pattern, the thrown error will be an uncaught exception that crashes the payment UI. If it only wraps in try/catch, the `success: false` return will be silently ignored.

**Severity:** HIGH — payment errors may crash the UI instead of showing a friendly message

---

### 8. `updateEventTimeAndCard`: No input validation

**File:** `lib/events/actions.ts` lines 873-901

```typescript
export async function updateEventTimeAndCard(
  eventId: string,
  data: {
    time_shopping_minutes?: number | null
    time_prep_minutes?: number | null
    // ...
    card_cashback_percent?: number | null
  }
) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('events')
    .update(data)       // raw client data passed directly to .update()
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
```

**What happens:** The `data` object is passed directly to `.update()` without Zod validation. A malicious or buggy client could pass extra fields (e.g., `status`, `quoted_price_cents`, `client_id`) that would be written to the events table, bypassing all business logic. The `as any` typing on supabase means TypeScript won't catch this. While RLS may prevent some abuse, extra fields that match column names will be silently written.

**Severity:** HIGH — arbitrary field injection into events table

---

### 9. `createAdjustment`: No amount sign validation

**File:** `lib/ledger/append.ts` lines 122-187

```typescript
export async function createAdjustment({
  event_id,
  amount_cents,     // no validation on sign
  description,
  // ...
}) {
```

The `appendLedgerEntryInternal` at line 63 validates `Number.isInteger(input.amount_cents)` but does NOT validate that the amount is positive. Negative amounts pass validation.

**What happens:** A chef could accidentally (or intentionally) create a negative adjustment that inflates the outstanding balance artificially. The `event_financial_summary` view would compute a higher outstanding balance, and the client would be asked to pay more than they owe. The ledger is append-only and immutable, so a bad adjustment can only be corrected by adding another adjustment — it can't be deleted.

**Note:** This may be intentional (negative adjustments = credits/discounts). But there's no documentation or UI safeguard confirming this is expected behavior. The `recordOfflinePayment` function in `lib/events/offline-payment-actions.ts` (line 35) properly validates `amountCents <= 0`, showing the inconsistency.

**Severity:** HIGH — potential financial data corruption with no undo

---

### 10. `changePassword`: No new password strength validation

**File:** `lib/auth/actions.ts` lines 490-509

```typescript
export async function changePassword(currentPassword: string, newPassword: string) {
  // ... verifies current password
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error('Failed to update password')
  return { success: true }
}
```

**What happens:** No minimum length, no complexity requirements. A chef can set their password to `"a"` or `""` (empty string, depending on Supabase defaults). Supabase Auth has a default minimum of 6 characters, so very short passwords are blocked at the Supabase level, but there's no server-side enforcement of strength requirements that match the signup flow.

**Severity:** HIGH — security weakness, inconsistent with signup validation

---

## MEDIUM — Bad UX / Degraded Experience

### 11. `deleteExpense`: Hard DELETE instead of soft delete

**File:** `lib/expenses/actions.ts` line 247

```typescript
const { error } = await supabase
  .from('expenses')
  .delete()
  .eq('id', id)
  .eq('tenant_id', user.tenantId!)
```

**What happens:** Expenses are permanently deleted with no recovery. The rest of the app uses soft deletes (`deleted_at` column) for clients, inquiries, events, etc. A chef who accidentally deletes an expense loses it forever — no undo, no trash, no recovery. For a financial record, this is especially risky during tax season.

**Severity:** MEDIUM — inconsistent with app's soft-delete pattern, permanent data loss on accident

---

### 12. `getEventById`: Relies solely on RLS for access control

**File:** `lib/events/actions.ts` lines 270-310

```typescript
export async function getEventById(eventId: string) {
  await requireChef()  // verifies user is a chef, but doesn't use tenantId
  const supabase: any = createServerClient()

  let query = supabase
    .from('events')
    .select(`*, client:clients(...)`)
    .eq('id', eventId)   // no .eq('tenant_id', ...)
```

**What happens:** The comment at line 271-274 explains this is intentional (to support collaborators). However, this means the explicit tenant_id filter — which exists on every other query in the app — is absent here. If RLS policies have a gap or are temporarily disabled (e.g., during a migration), any chef could view any other chef's event by guessing the UUID. The defense-in-depth principle suggests keeping the application-level check even when RLS is present.

**Severity:** MEDIUM — security relies on single layer (RLS) instead of defense-in-depth

---

### 13. `getQuoteVersionHistory`: Performance concern at scale

**File:** `lib/quotes/actions.ts` — the `getQuoteVersionHistory` function fetches ALL quotes for the tenant to walk a version chain in memory.

**What happens:** When a chef has hundreds of events with multiple quote revisions each, fetching all quotes just to walk one version chain becomes a performance bottleneck. This won't be an issue in the first month but will degrade as the chef accumulates more events.

**Severity:** MEDIUM — will degrade over time, not an immediate issue

---

### 14. `getInquiriesNeedingFirstContact`: Potential schema mismatch on messages table

**File:** `lib/inquiries/actions.ts` — queries the `messages` table with `inquiry_id` and `conversations` table. These tables may or may not exist in the current schema. If they don't exist, this function silently returns all inquiries as "needing first contact" regardless.

**Severity:** MEDIUM — automated reminders may fire for already-contacted inquiries

---

### 15. Calendar query at line 146 uses `as any` to suppress TypeScript

**File:** `lib/calendar/actions.ts` line 151

The inquiries query ends with `as any`, which means TypeScript cannot catch the wrong column names (`chef_id`, `preferred_date`, `occasion`) at compile time. This is why finding #1 above was never caught by `tsc`.

**Severity:** MEDIUM — type safety defeated, making it easy for schema drift bugs to ship

---

## LOW — Cosmetic / Minor / Best Practice

### 16. `available-leftovers.tsx`: Missing toast on transfer error

**File:** `components/events/available-leftovers.tsx` lines 35-36

```typescript
} catch (err) {
  console.error('[AvailableLeftovers] Transfer error:', err)
  // no toast or user-visible error feedback
}
```

**What happens:** If transferring a leftover item fails, the user sees no indication — the button just stops being disabled. They might think it succeeded.

**Severity:** LOW — edge case, non-critical feature

---

### 17. `waste/actions.ts`: Deferred module with commented-out server actions

**File:** `lib/waste/actions.ts`

This file correctly avoids exporting server actions (they're commented out) and has a clear header explaining why. It only exports types and constants. No immediate risk, but the comment referencing `@ts-nocheck` is outdated since the file doesn't actually use that directive.

**Severity:** LOW — code hygiene

---

## Summary Table

| #   | Severity | File                                               | Issue                                                           |
| --- | -------- | -------------------------------------------------- | --------------------------------------------------------------- |
| 1   | CRITICAL | `lib/calendar/actions.ts:144-151`                  | Inquiries never show on calendar (3 wrong columns + wrong enum) |
| 2   | CRITICAL | `lib/client-portal/actions.ts:103-112`             | Portal always shows "Valued Client" instead of real name        |
| 3   | CRITICAL | `lib/followup/sequence-builder-actions.ts:149,232` | Follow-up sequences use "there" instead of client name          |
| 4   | CRITICAL | `lib/scheduling/availability-share-actions.ts:191` | Shared availability shows no chef name                          |
| 5   | HIGH     | `lib/events/invoice-actions.ts:102-114`            | Invoice number race condition                                   |
| 6   | HIGH     | `lib/stripe/actions.ts:28-130`                     | No duplicate PaymentIntent protection                           |
| 7   | HIGH     | `lib/stripe/actions.ts:40-78`                      | Inconsistent error handling (return vs throw)                   |
| 8   | HIGH     | `lib/events/actions.ts:873-901`                    | Raw client data passed to .update() without validation          |
| 9   | HIGH     | `lib/ledger/append.ts:122-187`                     | createAdjustment accepts negative amounts                       |
| 10  | HIGH     | `lib/auth/actions.ts:490-509`                      | No password strength validation on change                       |
| 11  | MEDIUM   | `lib/expenses/actions.ts:247`                      | Hard DELETE instead of soft delete                              |
| 12  | MEDIUM   | `lib/events/actions.ts:276-310`                    | No explicit tenant filter, relies solely on RLS                 |
| 13  | MEDIUM   | `lib/quotes/actions.ts`                            | Version history fetches all tenant quotes                       |
| 14  | MEDIUM   | `lib/inquiries/actions.ts`                         | Possible schema mismatch on messages table                      |
| 15  | MEDIUM   | `lib/calendar/actions.ts:151`                      | `as any` suppresses type safety                                 |
| 16  | LOW      | `components/events/available-leftovers.tsx:35`     | Missing toast on transfer error                                 |
| 17  | LOW      | `lib/waste/actions.ts`                             | Outdated comment referencing @ts-nocheck                        |

**Total: 4 CRITICAL, 6 HIGH, 5 MEDIUM, 2 LOW**

---

## Recommended Fix Priority

**Fix immediately (before first real chef uses it):**

1. Calendar inquiry column names (#1) — core feature completely broken
2. Client portal `full_name` (#2) — client-facing, always wrong
3. Follow-up sequence `full_name` (#3) — automated outreach broken
4. Availability share `display_name` (#4) — client-facing, always wrong

**Fix before accepting payments:** 5. Invoice number race condition (#5) — use DB sequence 6. PaymentIntent dedup (#6) — add idempotency key or check existing 7. Error handling consistency (#7) — pick one pattern 8. `updateEventTimeAndCard` validation (#8) — add Zod schema

**Fix soon:** 9. `createAdjustment` sign validation (#9) — document or restrict 10. Password strength validation (#10) — add Zod schema
