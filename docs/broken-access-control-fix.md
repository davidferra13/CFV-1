# Broken Access Control Fix — Security Hardening (March 2026)

## Summary

This session addressed 7 broken access control vulnerabilities found during a comprehensive security audit. A separate agent addressed 8 additional vulnerabilities in parallel (password schemas, rate limiting, signup enumeration, Turnstile, file upload, API error messages, OAuth encryption, ledger idempotency).

## Fixes Applied

### 1. GET /api/ai/wake — Unauthenticated Endpoint Leaking Internal IPs

**Severity:** HIGH
**File:** `app/api/ai/wake/route.ts`
**Issue:** The GET handler had no auth check, exposing internal LAN IPs (e.g., `10.0.0.177`) and Ollama model names to anyone who hit the endpoint. The POST handler correctly required `requireAdmin()`.
**Fix:** Added `requireAdmin()` gate to the GET handler, matching the POST handler's security.

### 2. POST /api/webhooks/twilio — Missing Signature Validation

**Severity:** HIGH
**File:** `app/api/webhooks/twilio/route.ts`
**Issue:** No `X-Twilio-Signature` validation. Anyone who discovered the endpoint URL could inject fake inbound SMS messages, creating records in the `messages` table linked to real client phone numbers.
**Fix:** Added full Twilio signature validation (HMAC-SHA1 with timing-safe comparison). When `TWILIO_AUTH_TOKEN` is configured, requests without a valid signature are rejected with 403. Dev/test mode (no auth token) allows passthrough.

### 3. hub_availability + hub_availability_responses — Missing RLS

**Severity:** MEDIUM
**File:** `supabase/migrations/20260330000014_hub_availability_rls.sql`
**Issue:** Both tables created in migration `20260330000008` had no RLS policies at all. Any user (possibly even anon) could enumerate all availability poll data across all tenants/groups.
**Fix:** Added full RLS with group-membership-scoped policies:

- SELECT: group members only
- INSERT: authenticated users (creator-scoped)
- UPDATE/DELETE: creator only
- Responses: same pattern, scoped to own responses

### 4. event_shares + event_guests — Overly Permissive Anon RLS

**Severity:** MEDIUM
**File:** `supabase/migrations/20260330000015_tighten_guest_rsvp_rls.sql`
**Issue:** Both tables had `USING (true)` policies for anon users with full SELECT/INSERT/UPDATE grants. The entire guest RSVP dataset was enumerable with just the Supabase anon key.
**Fix:** Replaced with scoped policies:

- `event_shares`: anon SELECT limited to active + unexpired shares only
- `event_guests`: anon INSERT requires a valid (active, unexpired) share; SELECT/UPDATE limited to guests under active shares

### 5. AI Correspondence — Sensitive Fields in Prompts

**Severity:** MEDIUM
**File:** `lib/ai/correspondence.ts`
**Issue:** `select('*')` on the `clients` table included `wifi_password`, `gate_code`, and `security_notes` in the AI email drafting context. These physical security credentials have no business in an AI prompt.
**Fix:** Replaced `select('*')` with explicit column list: `id, full_name, email, phone, dietary_restrictions, allergies, notes, status, loyalty_tier, loyalty_points`.

### 6. Stripe Customer ID Exposed to Browser

**Severity:** LOW
**Files:** `lib/stripe/subscription.ts`, `app/(chef)/settings/billing/billing-client.tsx`
**Issue:** `stripeCustomerId` (internal Stripe identifier) was serialized into the HTML payload sent to the browser. The billing client only used it as a boolean check.
**Fix:** Changed `SubscriptionStatus` type to use `hasStripeCustomer: boolean` and `hasStripeSubscription: boolean` instead of raw IDs. Updated billing client to use the boolean.

### 7. Cron/Scheduled Routes — Timing-Unsafe Auth (31 files)

**Severity:** LOW
**Files:** 7 `app/api/cron/` routes + 23 `app/api/scheduled/` routes + `app/api/gmail/sync/route.ts`
**Issue:** Most cron/scheduled routes used inline `authHeader !== Bearer ${process.env.CRON_SECRET}` comparisons, which are vulnerable to timing attacks. Only 4 routes used the timing-safe `verifyCronAuth()` helper.
**Fix:** Migrated all 31 remaining routes to use `verifyCronAuth()` from `@/lib/auth/cron-auth`, which uses `timingSafeEqual()`.

## What Was NOT Changed (Confirmed Clean)

- All ~30+ core server actions (clients, events, ledger, messages, inquiries, expenses, quotes) — all correctly use `requireChef()`/`requireClient()` with tenant scoping
- All admin routes — double-gated at middleware + `requireAdmin()`
- Service role key — never exposed in client-side code
- Stripe webhook — correctly validates `stripe-signature` header
- Remy public context — only exposes `display_name, business_name, tagline, bio`
- iCal feed — token-protected, no PII in response
- Embed endpoints — return only `{ success: true }`, rate-limited, honeypot spam protection

## Remaining Considerations (Not Fixed — Low Priority)

1. **`getAnnouncement()` uses service role key unnecessarily** — could use anon key for reading public config
2. **`/api/e2e/*` wildcard bypass in middleware** — production-gated in code but broad exemption
3. **`/view`, `/event` broad `startsWith` bypass in middleware** — architectural risk if new routes added under these paths
4. **OG image uses service role on edge runtime** — reads only public fields, could use anon + RLS policy
5. **Social network tables `USING (true)` for authenticated users** — intentional for cross-tenant feed, but broad
