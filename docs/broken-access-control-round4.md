# Broken Access Control — Round 4 Deep Dive (March 2026)

## Summary

Round 4 audited four new attack surface areas: **rate limiting gaps, SSRF, business logic flaws, and CSRF/cookie security**. Found and fixed **9 issues** across the codebase. Also confirmed the codebase is **already secure** in business logic (FSM, payments, tenant isolation, mass assignment, race conditions) and SSRF (webhook URL validation, Remy web-read validation).

Combined with Rounds 1–3 (37 fixes) and the parallel agent's work (8 fixes), the total security hardening now covers **54 fixes**.

## Audit Results

### Business Logic — SECURE (No Fixes Needed)

Comprehensive audit found no vulnerabilities in:

- **Event FSM** — all status changes route through `transitionEvent()` with permission checks, readiness gates, and append-only transition logging
- **Payment/financial** — ledger-first architecture with immutability triggers, Stripe webhook signature verification, amounts never from client input, idempotency via `transaction_reference`
- **Tenant isolation** — every query scopes by `tenant_id`, admin client usage always has explicit tenant filters, roles derived from DB (not JWT)
- **Mass assignment** — Zod schemas whitelist allowed fields on all inputs, no raw `...body` spreads
- **Race conditions** — atomic DB operations, deterministic deduplication keys, Stripe event ID idempotency

### SSRF — MOSTLY SECURE (1 Fix)

Webhook delivery (`validateWebhookUrl()`) and Remy web-read (`isUrlSafeForFetch()`) have comprehensive SSRF validation (private IP blocking, HTTPS-only, hostname blocklist). OAuth callbacks use hardcoded endpoints. One unused function needed removal.

### Cookie/Session — SECURE (No Fixes Needed)

- All cookies use `httpOnly: true`, `sameSite: 'lax'`, `secure: true` in production
- Open redirect protection via same-origin validation in auth callback
- CORS properly restricted (only `/embed/*` allows cross-origin)
- Role cache cookie is HMAC-signed

## Fixes Applied

### 1. push/unsubscribe — Missing Auth + Rate Limit (HIGH)

**File:** `app/api/push/unsubscribe/route.ts`
**Issue:** Completely unauthenticated. No rate limit. Any anonymous request could unsubscribe any user from push notifications by providing their subscription endpoint.
**Fix:** Added `requireAuth()` + `checkRateLimit('push-unsub', 10/min)`.

### 2. push/resubscribe — Missing Auth + Rate Limit (HIGH)

**File:** `app/api/push/resubscribe/route.ts`
**Issue:** Completely unauthenticated. No rate limit. Service worker subscription rotation endpoint was publicly accessible.
**Fix:** Added `requireAuth()` + `checkRateLimit('push-resub', 10/min)`.

### 3. kiosk/pair — Missing Rate Limit (HIGH)

**File:** `app/api/kiosk/pair/route.ts`
**Issue:** Unauthenticated device pairing endpoint with no rate limit. An attacker could brute-force 6-character pairing codes.
**Fix:** Added `checkRateLimit('kiosk-pair', 5/5min per IP)`. Also changed from `Request` to `NextRequest` for consistent typing.

### 4. compressImageByUrl() — SSRF Vector (MEDIUM)

**File:** `lib/images/resmush.ts`
**Issue:** Exported function accepted any URL and proxied it through reSmush.it API. No URL validation — could target internal IPs, cloud metadata endpoints. Function was unused (all callers use `compressImageBuffer()` instead).
**Fix:** Removed the entire function. Left a comment explaining why.

### 5. CSRF Origin Validation — New Helper (MEDIUM)

**File:** `lib/security/csrf.ts` (NEW)
**Issue:** Session-based API routes (cookie auth) were vulnerable to cross-origin form submissions. A malicious website could trigger mutations if a chef was logged in.
**Fix:** Created `verifyCsrfOrigin(request)` helper that validates Origin/Referer headers against allowed hosts (localhost, app.cheflowhq.com, beta.cheflowhq.com). Allows requests with no Origin header (same-origin browsers strip it, server-to-server calls don't send it). Works with SameSite=Lax cookies as defense-in-depth.

### 6–9. CSRF Applied to 5 Session-Based Routes

Applied `verifyCsrfOrigin()` to all session-based mutation API routes:

| File                                    | What It Protects                     |
| --------------------------------------- | ------------------------------------ |
| `app/api/integrations/connect/route.ts` | Integration connect/disconnect       |
| `app/api/clients/preferences/route.ts`  | Client dietary/budget preferences    |
| `app/api/notifications/send/route.ts`   | Send notifications on behalf of chef |
| `app/api/activity/track/route.ts`       | Portal activity event recording      |
| `app/api/menus/upload/route.ts`         | Menu file upload                     |

## Not Fixed (Documented for Future)

1. **Rate limit on OAuth callback endpoints** (integrations/\*/callback) — 10 exchanges/IP/hour to prevent token exchange brute-forcing. LOW risk since state tokens are one-time-use.
2. **Rate limit on push/subscribe** — already has auth, but no explicit rate limit.
3. **Rate limit on integrations/connect** — authenticated, now has CSRF protection, but no rate limit on connect/disconnect volume.
4. **Rate limit on qol/metrics** — authenticated metric ingestion, LOW priority.
5. **OCR.space scanReceipt()** — currently safe (only called with Supabase Storage URLs), but function signature accepts any URL. Belt-and-suspenders validation for future-proofing.

## Files Modified

| File                                    | Change                                     |
| --------------------------------------- | ------------------------------------------ |
| `app/api/push/unsubscribe/route.ts`     | Added `requireAuth()` + rate limit         |
| `app/api/push/resubscribe/route.ts`     | Added `requireAuth()` + rate limit         |
| `app/api/kiosk/pair/route.ts`           | Added rate limit (5/5min per IP)           |
| `lib/images/resmush.ts`                 | Removed `compressImageByUrl()` SSRF vector |
| `lib/security/csrf.ts`                  | NEW — CSRF origin validation helper        |
| `app/api/integrations/connect/route.ts` | Added CSRF origin check                    |
| `app/api/clients/preferences/route.ts`  | Added CSRF origin check                    |
| `app/api/notifications/send/route.ts`   | Added CSRF origin check                    |
| `app/api/activity/track/route.ts`       | Added CSRF origin check                    |
| `app/api/menus/upload/route.ts`         | Added CSRF origin check                    |

## Cumulative Security Summary (All 4 Rounds + Parallel Agent)

### By Category

| Category                     | Count  | Severity        |
| ---------------------------- | ------ | --------------- |
| Privilege Escalation         | 2      | CRITICAL        |
| IDOR / Cross-Tenant          | 4      | CRITICAL–MEDIUM |
| Missing Auth                 | 7      | HIGH            |
| Missing Rate Limit           | 3      | HIGH            |
| CSRF / Origin Validation     | 6      | MEDIUM          |
| XSS                          | 3      | HIGH–LOW        |
| SSRF                         | 1      | MEDIUM          |
| Storage Bucket RLS           | 8      | CRITICAL–MEDIUM |
| Table RLS                    | 4      | HIGH–MEDIUM     |
| Error Info Disclosure        | 12     | HIGH–MEDIUM     |
| Input Validation / Injection | 4      | MEDIUM          |
| PII Leakage                  | 2      | MEDIUM          |
| Webhook Auth                 | 1      | HIGH            |
| **Total**                    | **54** |                 |

### Confirmed Secure (No Action Required)

| Area              | Assessment                                             |
| ----------------- | ------------------------------------------------------ |
| Event FSM         | All transitions enforced, permission-checked, logged   |
| Payment/Financial | Ledger-first, immutable, idempotent, Stripe-verified   |
| Tenant Isolation  | Every query tenant-scoped, roles from DB               |
| Mass Assignment   | Zod validation on all inputs                           |
| Race Conditions   | Atomic ops, deduplication keys                         |
| Cookie Security   | HttpOnly, SameSite=Lax, Secure in prod                 |
| Open Redirects    | Same-origin validation in auth callback                |
| CORS              | Properly restricted, credentials blocked on `*` origin |
| SSRF (Webhooks)   | `validateWebhookUrl()` with full private IP blocking   |
| SSRF (Remy)       | `isUrlSafeForFetch()` with cloud metadata blocking     |
