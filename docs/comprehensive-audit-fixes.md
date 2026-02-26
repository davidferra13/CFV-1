# Comprehensive Codebase Audit and Fixes

## Date

2026-02-17

## Context

A thorough audit of the entire ChefFlow codebase was conducted across three dimensions: security/auth, business logic/architecture, and UX/navigation. Multiple issues were identified and fixed in a single pass. This document summarizes what was found, what was fixed, and what remains.

---

## Fixes Applied

### 1. Google OAuth Callback - Tenant Hijack Prevention

**File:** `app/api/auth/google/connect/callback/route.ts`

**Problem:** The OAuth state parameter contained a `chefId` that was only base64-encoded, not signed. An attacker could craft a malicious state with another chef's ID and connect their Google account to that chef's profile.

**Fix:** Added `getCurrentUser()` ownership check after CSRF validation. The callback now verifies the authenticated user's `entityId` matches `state.chefId` before proceeding with the token upsert.

### 2. Security Headers (HSTS, X-Content-Type-Options, X-Frame-Options)

**File:** `next.config.js`

**Problem:** No security headers were configured. Missing HSTS, clickjacking protection, and MIME sniffing prevention.

**Fix:** Added `headers()` function to next.config.js with:

- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`

CSP was intentionally omitted - it requires knowing all external domains (Supabase, Stripe, Google, etc.) and getting it wrong breaks the app. Should be added carefully later.

### 3. File Upload Extension Spoofing Prevention

**File:** `lib/chat/actions.ts`

**Problem:** File extensions were derived from the filename (`file.name.split('.').pop()`), not the MIME type. A file named `malware.exe.jpg` would be stored as `.jpg`.

**Fix:** Added `MIME_TO_EXT` lookup map that derives the storage extension from the validated MIME type. Falls back to filename extension only if the MIME type isn't in the map. Applied to both `sendImageMessage()` and `sendFileMessage()`.

### 4. Pricing Constants Consolidation (Single Source of Truth)

**Files:**

- **Created:** `lib/pricing/constants.ts` - shared constants file
- **Modified:** `lib/pricing/compute.ts` - imports from constants
- **Modified:** `lib/ai/agent-brain.ts` - imports from constants

**Problem:** Rate cards, deposit percentages, and mileage rates were duplicated between the pricing engine and the AI agent brain. Changing one without the other would cause the AI to quote different prices than the actual pricing engine.

**Fix:** Extracted all pricing constants into `lib/pricing/constants.ts`. Both `compute.ts` and `agent-brain.ts` now import from this single source. The `extractRateCard()` function in agent-brain.ts now calls `generateRateCardString()` from constants.ts, which dynamically builds the rate card string from the numeric constants.

### 5. Contact Form - Actually Functional

**Files:**

- **Created:** `lib/contact/actions.ts` - server action
- **Created:** `supabase/migrations/20260221000007_contact_submissions.sql` - table
- **Modified:** `app/(public)/contact/page.tsx` - wired to server action

**Problem:** The contact form did `await new Promise(resolve => setTimeout(resolve, 1000))` and showed "Success!" without actually sending anything. Any visitor trying to contact support was silently ghosted.

**Fix:** Created a `submitContactForm` server action that inserts into a `contact_submissions` table (via admin client, since no auth required for public forms). Updated the contact page to call the real server action with proper error handling and display. Migration file created but not pushed (per batching rule).

### 6. Guest/Share RLS - Token Enumeration Fix

**File:** `supabase/migrations/20260221000008_fix_guest_share_rls.sql`

**Problem:** The `event_shares` and `event_guests` tables had RLS policies with `USING (true)` for anonymous access, plus `GRANT SELECT ON ... TO anon`. This meant anyone with the Supabase anon key could enumerate all share tokens and guest tokens via direct REST API calls.

**Fix:** Removed all `USING(true)` public policies and revoked anon grants. This is safe because all public operations (getEventShareByToken, submitRSVP, updateRSVP, getGuestByToken) already use `createServerClient({ admin: true })` which bypasses RLS entirely. The anon policies were never needed by the application - they were just an open door for enumeration.

---

## Not Fixed (Deferred / Requires Further Decision)

### @ts-nocheck on Chat Files

9 files have `@ts-nocheck`. Cannot be removed until the pending migrations are applied and types are regenerated. The existing error handling already degrades gracefully (returns empty arrays for missing tables).

### FSM Transition Logging

Currently non-blocking. Making it blocking would surface audit gaps but could leave the system in an inconsistent state if the log insert fails after the state update succeeds. The correct fix is a database-level transaction (RPC function that does both atomically). This is a design decision, not a quick fix.

### Rate Limiting

In-memory rate limiting per serverless instance. Needs Redis/Upstash for proper distributed rate limiting. Infrastructure decision.

### Console.log Cleanup

228 console.log/error calls across the codebase. Many are legitimate server-side logging. Should be replaced with a structured logging service (Sentry, Pino, etc.) as an infrastructure decision, not a line-by-line cleanup.

### 72 `as any` Casts

Most exist because generated types don't include chat/notes/insights tables yet. Will resolve naturally after migrations are applied and types regenerated.

---

## New Migration Files (Not Pushed)

Per the batching rule, these migration files were created but NOT pushed:

| Timestamp      | File                      | Purpose                                           |
| -------------- | ------------------------- | ------------------------------------------------- |
| 20260221000007 | `contact_submissions.sql` | Contact form submissions table                    |
| 20260221000008 | `fix_guest_share_rls.sql` | Remove USING(true) policies on guest/share tables |

**Reminder:** Back up database before pushing migrations.

---

## Files Changed

| File                                                         | Change                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------- |
| `app/api/auth/google/connect/callback/route.ts`              | Added ownership check                                   |
| `next.config.js`                                             | Added security headers                                  |
| `lib/chat/actions.ts`                                        | Added MIME_TO_EXT map, fixed extension derivation       |
| `lib/pricing/constants.ts`                                   | **NEW** - shared pricing constants                      |
| `lib/pricing/compute.ts`                                     | Imports from constants.ts                               |
| `lib/ai/agent-brain.ts`                                      | Imports from constants.ts, rate card from shared source |
| `lib/contact/actions.ts`                                     | **NEW** - contact form server action                    |
| `app/(public)/contact/page.tsx`                              | Wired to real server action                             |
| `supabase/migrations/20260221000007_contact_submissions.sql` | **NEW**                                                 |
| `supabase/migrations/20260221000008_fix_guest_share_rls.sql` | **NEW**                                                 |
