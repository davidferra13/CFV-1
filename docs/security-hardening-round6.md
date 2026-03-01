# Security Hardening — Round 6

**Date:** 2026-03-01
**Scope:** SSRF, timing attacks, CSP hardening, cache poisoning, token entropy, authenticated route caching
**Methodology:** 4 parallel security audits (SSRF/redirect, randomness/secrets, CORS/headers, privilege/IDOR) followed by targeted fixes

---

## Audit Summary

| Audit Area           | Key Findings                                                                         | Severity |
| -------------------- | ------------------------------------------------------------------------------------ | -------- |
| SSRF & Open Redirect | Webhook URLs accept private IPs; open redirects properly protected                   | HIGH     |
| Randomness & Secrets | `INTERNAL_API_KEY` uses `!==` (timing attack); reactivation token low entropy        | CRITICAL |
| CORS & HTTP Headers  | iCal feed `public` cache; `unsafe-eval` in CSP; auth routes missing `no-store`       | HIGH     |
| Privilege & IDOR     | No vulnerabilities found — tenant scoping, role checks, Zod validation all excellent | NONE     |

---

## Fixes Implemented (6 total)

### Fix 1 — CRITICAL: Timing Attack on INTERNAL_API_KEY

**Files:** `app/api/social/instagram/sync/route.ts`, `app/api/social/google/sync/route.ts`

**Problem:** Both social sync endpoints compared `INTERNAL_API_KEY` using `!==`. An attacker can measure response time differences to determine the correct key byte-by-byte. The key gates Instagram/Google account sync operations.

**Before:**

```typescript
const internalKey = req.headers.get('x-internal-key')
if (internalKey !== process.env.INTERNAL_API_KEY) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**After:**

```typescript
import { timingSafeEqual } from 'crypto'

const internalKey = req.headers.get('x-internal-key') ?? ''
const expected = process.env.INTERNAL_API_KEY ?? ''
if (
  !expected ||
  internalKey.length !== expected.length ||
  !timingSafeEqual(Buffer.from(internalKey), Buffer.from(expected))
) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Impact:** Eliminates timing side-channel. Length pre-check prevents `timingSafeEqual` from throwing on mismatched buffer sizes. Empty `expected` check prevents auth bypass when env var is missing.

---

### Fix 2 — HIGH: SSRF Protection for Webhook URLs

**Files:** `lib/security/url-validation.ts` (NEW), `lib/webhooks/actions.ts`, `lib/integrations/zapier/zapier-webhooks.ts`

**Problem:** Users could configure webhook URLs pointing to private IP ranges (`127.0.0.1`, `10.x`, `169.254.x`, `192.168.x`). When the server dispatches webhook events, it makes outbound HTTP requests to these URLs — enabling SSRF attacks against internal services (Ollama, metadata endpoints, databases).

**Fix:** Created `validateWebhookUrl()` shared utility that blocks:

- Non-HTTPS protocols
- Private IPv4 ranges (127.x, 10.x, 172.16-31.x, 192.168.x, 169.254.x, 0.x)
- Private IPv6 (::1, fc00::/7, fe80::/10)
- Localhost and metadata hostnames
- Userinfo in URLs (credential smuggling)

Applied to both `createWebhookEndpoint()` and `createWebhookSubscription()`.

---

### Fix 3 — HIGH: iCal Feed Cache Poisoning

**File:** `app/api/feeds/calendar/[token]/route.ts`

**Problem:** The iCal feed response used `Cache-Control: public, max-age=300`. Since the feed URL contains a secret token as a path parameter, a CDN or shared proxy could cache the calendar data and serve it to other users if the URL is leaked (via referrer headers, browser history, or shared network logs).

**Before:**

```typescript
'Cache-Control': 'public, max-age=300',
```

**After:**

```typescript
'Cache-Control': 'private, max-age=300',
```

**Impact:** `private` directive ensures only the end-user's browser caches the response — shared proxies and CDNs will not store it.

---

### Fix 4 — MEDIUM: Remove `unsafe-eval` from CSP

**File:** `next.config.js` (3 locations: embed, kiosk, main app)

**Problem:** All three CSP header blocks included `'unsafe-eval'` in `script-src`, which allows `eval()`, `Function()` constructor, and `setTimeout(string)`. If an XSS vulnerability exists, this gives the attacker full code execution capability. Next.js App Router does NOT require `unsafe-eval` — only `unsafe-inline` is needed for hydration scripts.

**Before:**

```
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com
```

**After:**

```
script-src 'self' 'unsafe-inline' https://js.stripe.com
```

Removed from all three route groups (embed, kiosk, main app).

---

### Fix 5 — MEDIUM: Reactivation Token Entropy Upgrade

**File:** `lib/compliance/account-deletion-actions.ts`

**Problem:** The account reactivation token (used to cancel account deletion within the 30-day grace period) was generated with `crypto.randomUUID()` which provides 122 bits of entropy (UUID v4). For a security-critical recovery token with a 30-day attack window, 256 bits is the standard.

**Before:**

```typescript
const reactivationToken = crypto.randomUUID()
```

**After:**

```typescript
import { randomBytes } from 'crypto'
const reactivationToken = randomBytes(32).toString('hex') // 256-bit
```

---

### Fix 6 — MEDIUM: Cache-Control Headers on Authenticated API Routes

**Files:** `app/api/reports/financial/route.ts`, `app/api/clients/preferences/route.ts`, `app/api/activity/feed/route.ts`, `app/api/scheduling/availability/route.ts`

**Problem:** Authenticated API routes returning sensitive data (financial reports, client PII/allergies, activity logs, scheduling) did not set `Cache-Control` headers. Without explicit `no-store`, CDN edge nodes (Vercel Edge, Cloudflare) or shared proxies may cache authenticated responses and serve them to other users.

**Fix:** Added `{ headers: { 'Cache-Control': 'no-store' } }` to all success responses on these routes.

---

## Audit Findings — Already Secure

These areas were audited and found to be properly implemented:

| Area                   | Status    | Notes                                                                      |
| ---------------------- | --------- | -------------------------------------------------------------------------- |
| Open Redirects         | SECURE    | All redirect paths use fixed URLs or `safeRedirectPath()` validation       |
| CORS Configuration     | CORRECT   | Wildcard CORS only on embed endpoint (intentional); no credentials exposed |
| X-Frame-Options        | CORRECT   | `DENY` on main app and kiosk; intentionally omitted on embed routes        |
| HSTS                   | CORRECT   | `max-age=31536000; includeSubDomains` on all routes                        |
| X-Content-Type-Options | CORRECT   | `nosniff` everywhere                                                       |
| Referrer-Policy        | CORRECT   | `strict-origin-when-cross-origin`                                          |
| Host Header Injection  | NOT FOUND | No usage of `req.headers.host` for URL construction                        |
| Mass Assignment        | NOT FOUND | All inputs validated via strict Zod schemas before database writes         |
| Tenant Scoping         | EXCELLENT | 2,199+ tenant_id checks across the codebase                                |
| IDOR                   | NOT FOUND | All document/resource access verifies both ID and tenant ownership         |
| Privilege Escalation   | NOT FOUND | Admin gated by env var; roles from `user_roles` table (never JWT)          |
| API Key Security       | CORRECT   | SHA-256 hashed, expiration-checked, rate-limited                           |
| Webhook Signatures     | CORRECT   | Wix, DocuSign, Twilio, Resend all use constant-time comparison             |
| Cron Auth              | CORRECT   | `timingSafeEqual()` on CRON_SECRET                                         |
| Signed Cookies         | CORRECT   | HMAC-signed role cookie with constant-time verification                    |
| E2E Test Endpoint      | CORRECT   | Hard-gated to non-production environments                                  |

---

## Files Modified

| File                                         | Change                                               |
| -------------------------------------------- | ---------------------------------------------------- |
| `app/api/social/instagram/sync/route.ts`     | Timing-safe INTERNAL_API_KEY comparison              |
| `app/api/social/google/sync/route.ts`        | Timing-safe INTERNAL_API_KEY comparison              |
| `lib/security/url-validation.ts`             | NEW — SSRF protection for webhook URLs               |
| `lib/webhooks/actions.ts`                    | Added `validateWebhookUrl()` before insert           |
| `lib/integrations/zapier/zapier-webhooks.ts` | Replaced ad-hoc URL check with shared SSRF validator |
| `app/api/feeds/calendar/[token]/route.ts`    | `Cache-Control: public` → `private`                  |
| `next.config.js`                             | Removed `unsafe-eval` from 3 CSP blocks              |
| `lib/compliance/account-deletion-actions.ts` | `randomUUID()` → `randomBytes(32).toString('hex')`   |
| `app/api/reports/financial/route.ts`         | Added `Cache-Control: no-store`                      |
| `app/api/clients/preferences/route.ts`       | Added `Cache-Control: no-store`                      |
| `app/api/activity/feed/route.ts`             | Added `Cache-Control: no-store`                      |
| `app/api/scheduling/availability/route.ts`   | Added `Cache-Control: no-store`                      |
| `docs/security-hardening-round6.md`          | This document                                        |

---

## Cumulative Security Posture

| Round     | Fixes  | Focus Areas                                                                                                                                          |
| --------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Round 1   | 8      | Password DoS, CAPTCHA bypass, file upload whitelist, error leakage, OAuth encryption, ledger idempotency                                             |
| Round 2   | —      | Analysis phase                                                                                                                                       |
| Round 3   | 10     | Gift card bypass, loyalty race condition, rate limiting, header/path injection, prototype pollution, CSV injection, share token expiry, IP redaction |
| Round 4   | 7      | Integer overflow, extraction DoS, unbounded queries, memory leak, notification injection, AI output bounds                                           |
| Round 5   | 5      | Calendar hour overflow, API parseInt safety, blog URL sanitization, demo CSRF, Stripe log reduction                                                  |
| Round 6   | 6      | Timing attacks, SSRF, cache poisoning, CSP hardening, token entropy, authenticated cache control                                                     |
| **Total** | **36** |                                                                                                                                                      |
