# Security Hardening — Round 7

**Date:** 2026-03-01
**Scope:** Dependency audit, secret leakage, ReDoS/input validation, outbound request safety
**Methodology:** 4 parallel security audits (dependency/supply-chain, secret/env-var, ReDoS/input, outbound/webhook) followed by targeted fixes

---

## Audit Summary

| Audit Area        | Key Findings                                                                                            | Severity |
| ----------------- | ------------------------------------------------------------------------------------------------------- | -------- |
| Dependencies      | Next.js 14 has 2 HIGH DoS CVEs (fix requires v15 migration); build-only vulns in transitive deps        | HIGH     |
| Secret Leakage    | All NEXT*PUBLIC* vars safe; ~3 API routes leak raw `error.message` to clients                           | LOW-MED  |
| ReDoS & Input     | Public schemas accept unbounded strings; PostgREST filter injection in 5 search files                   | HIGH     |
| Outbound Requests | Push endpoint SSRF (no URL validation); webhook redirect bypass; resmush.it cleartext HTTP; no timeouts | HIGH     |

---

## Fixes Implemented (8 total)

### Fix 1 — HIGH: Push Notification Endpoint SSRF

**File:** `lib/push/send.ts`

**Problem:** The push notification `endpoint` URL comes from browser subscriptions stored in the database. A malicious user could register a push subscription pointing to a private IP (e.g., `http://169.254.169.254/latest/meta-data/`). The server would POST encrypted payloads and VAPID auth headers to internal services with no validation, no timeout, and no redirect control.

**Fix:** Added three protections:

1. **SSRF validation** — blocks private IPv4 ranges, localhost, and `[::1]` before sending
2. **10-second timeout** — `AbortSignal.timeout(10000)` prevents hanging on unresponsive endpoints
3. **Redirect blocking** — `redirect: 'error'` prevents 302 redirects to private IPs

---

### Fix 2 — HIGH: Public Schema Unbounded Strings (Instant Book)

**File:** `lib/booking/instant-book-actions.ts`

**Problem:** The `InstantBookSchema` is a public, unauthenticated server action. All string fields accepted arbitrarily long input (limited only by the 1MB Next.js body parser default). An attacker could send payloads near the limit to consume memory during Zod validation and database writes. `guest_count` had no upper bound.

**Before:**

```typescript
chef_slug: z.string().min(1),
full_name: z.string().min(1, 'Name is required'),
guest_count: z.number().int().positive(),
additional_notes: z.string().optional().or(z.literal('')),
```

**After:**

```typescript
chef_slug: z.string().min(1).max(200),
full_name: z.string().min(1, 'Name is required').max(200),
guest_count: z.number().int().positive().max(10000),
additional_notes: z.string().max(5000).optional().or(z.literal('')),
```

All 11 fields now have `.max()` constraints. Email capped at 320 (RFC 5321 max), phone at 50, dates at 20, address at 500, free text at 2000-5000.

---

### Fix 3 — HIGH: Public Schema Unbounded Strings (Campaign Booking)

**File:** `lib/campaigns/public-booking-actions.ts`

**Problem:** Same issue as Fix 2 — the `BookingSchema` is public and unauthenticated, with unbounded string fields for `full_name`, `email`, `phone`, `dietary_restrictions`, and `message`.

**Fix:** Added `.max()` to all 6 fields: names/email capped at 200-320, phone at 50, dietary/message at 2000-5000.

---

### Fix 4 — HIGH: Webhook Redirect-Based SSRF Bypass

**Files:** `lib/webhooks/deliver.ts`, `lib/integrations/zapier/zapier-webhooks.ts` (3 fetch calls total)

**Problem:** All webhook delivery fetch calls followed HTTP redirects by default. An attacker could configure a webhook endpoint that returns `302 Location: http://169.254.169.254/latest/meta-data/`, bypassing the SSRF hostname validation that only runs at URL registration time.

**Fix:** Added `redirect: 'error'` to all 3 outbound webhook fetch calls (primary delivery, Zapier delivery, Zapier test ping). Redirects now cause the request to fail immediately instead of following to potentially private IPs.

---

### Fix 5 — HIGH: Cleartext HTTP in reSmush.it API

**File:** `lib/images/resmush.ts`

**Problem:** The image compression API URL used `http://api.resmush.it/ws.php` — cleartext HTTP. While no auth credentials are sent, the `img` parameter contains Supabase storage URLs that may include signed tokens. These would be visible to any network observer in transit.

**Fix:** Changed to `https://api.resmush.it/ws.php`. reSmush.it supports HTTPS.

---

### Fix 6 — MEDIUM: PostgREST Filter Injection in Search Queries

**Files:** `lib/guests/actions.ts`, `lib/campaigns/targeting-actions.ts` (2 locations), `lib/network/actions.ts`, `lib/prospecting/actions.ts`, `lib/commerce/product-actions.ts`

**Problem:** User search input was interpolated directly into PostgREST `.or()` and `.ilike()` filter strings without escaping special characters (`%`, `_`, `,`, `.`, `(`, `)`, `"`, `'`, `\`). While Supabase uses parameterized SQL underneath, PostgREST filter syntax itself can be abused — commas inject additional filter conditions, parentheses break filter structure.

**Example attack:** A search string like `test,chef_id.eq.different-id` could inject additional filter conditions into `.or()` calls.

**Fix:** Applied the same sanitization pattern already used in `lib/search/universal-search.ts`:

```typescript
const safeSearch = search.replace(/[%_,.()"'\\]/g, '')
```

Applied to all 6 affected locations across 5 files. The `lib/hub/friend-actions.ts` search was already sanitized (confirmed during audit).

---

### Fix 7 — MEDIUM: IPv4-Mapped IPv6 SSRF Bypass

**File:** `lib/security/url-validation.ts`

**Problem:** The SSRF validator's IPv6 check did not block IPv4-mapped IPv6 addresses like `[::ffff:127.0.0.1]` or `[::ffff:169.254.169.254]`. These are valid IPv6 representations that resolve to private IPv4 addresses, bypassing the IPv4 range checks.

**Fix:** Added detection for `::ffff:` prefix, extracts the embedded IPv4 address, and runs it through the existing `isPrivateIPv4()` check. Also added `fd00::/8` range (commonly used unique local addresses).

---

### Fix 8 — MEDIUM: API Error Message Leakage

**Files:** `app/api/integrations/social/disconnect/[platform]/route.ts`, `app/api/documents/foh-preview/[menuId]/route.ts`, `app/api/scheduled/monitor/route.ts`

**Problem:** These production-accessible API routes returned raw `error.message` or `error.details` to clients in JSON responses. Supabase and other library errors can include SQL query fragments, column names, RLS policy violations, and internal table names in their `.message` property.

**Fix:** Replaced all raw error messages with generic strings:

- Social disconnect: `(err as Error).message` → `'Failed to disconnect platform'`
- FOH preview: `error.message || 'Failed...'` → `'Failed to generate FOH preview'` (added `console.error` for server-side debugging)
- Cron monitor: removed `details: error.message` from response

**Note:** The demo routes (`/api/demo/tier`, `/api/demo/switch`) also leak error messages but are hard-gated to `NODE_ENV !== 'production'`. The kiosk routes use `KioskApiError` which is a controlled error class with intentional messages. Both are acceptable.

---

## Audit Findings — Documented (Not Fixed — Require Planning)

### Dependency Vulnerabilities

| Finding                                               | Severity           | Notes                                                                                                                        |
| ----------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Next.js 14.2.35 — 2 HIGH DoS CVEs                     | HIGH               | Fixed only in Next.js 15.6+. Requires major version migration (breaking changes). Plan as dedicated feature branch.          |
| `serialize-javascript` RCE via `@ducanh2912/next-pwa` | HIGH (theoretical) | Build-time only — not exploitable at runtime. Triggered only when serializing untrusted RegExp/Date objects through workbox. |
| `rollup` 4.58.0 arbitrary file write                  | HIGH (theoretical) | Build-time only. Fix available via `npm audit fix`.                                                                          |
| `minimatch` ReDoS (9 copies)                          | HIGH (theoretical) | All in dev/build tooling, not runtime.                                                                                       |
| ESLint 8 end-of-life                                  | MEDIUM             | Dev-only, won't receive security patches. Upgrade to ESLint 9 when convenient.                                               |

### Outbound Request Timeouts (systemic)

30+ outbound `fetch()` calls across the codebase have no timeout. Priority integrations:

| Integration    | File                                                         | Risk                                |
| -------------- | ------------------------------------------------------------ | ----------------------------------- |
| Twilio SMS     | `lib/sms/twilio-client.ts`, `lib/sms/send.ts`                | Blocks user actions if Twilio hangs |
| DocuSign OAuth | `lib/integrations/docusign/docusign-client.ts` (5 calls)     | Contains OAuth tokens               |
| QuickBooks     | `lib/integrations/quickbooks/quickbooks-client.ts` (3 calls) | Contains OAuth tokens               |
| Square         | `lib/integrations/square/square-client.ts` (5 calls)         | Contains OAuth tokens               |
| OneSignal      | `lib/notifications/onesignal.ts` (2 calls)                   | Contains API key                    |
| Grocery APIs   | `lib/grocery/pricing-actions.ts` (6 calls)                   | 3 APIs queried per ingredient       |

**Recommendation:** Add `AbortSignal.timeout(10000)` to all outbound fetch calls. This is a future round task — each integration needs individual review.

### DNS Rebinding (TOCTOU)

Webhook URLs are validated at registration time only. DNS can change between registration and delivery. An attacker could register a public hostname, then re-point DNS to a private IP before the webhook fires. Mitigation requires resolving DNS at request time and re-validating the IP — significant architectural change.

### API Keys in URL Query Strings

Several APIs require keys in URLs (Spoonacular, USDA, Geocodio, Mapbox, Google Places). This is their documented pattern. The Meta Graph API access token should be moved to `Authorization: Bearer` header.

---

## Audit Findings — Already Secure

| Area                             | Status    | Notes                                                                              |
| -------------------------------- | --------- | ---------------------------------------------------------------------------------- |
| NEXT*PUBLIC* prefix audit        | PASS      | All 14 NEXT*PUBLIC* vars are non-sensitive (anon keys, public tokens, URLs)        |
| process.env in client components | PASS      | All 16 client files reference only NEXT*PUBLIC* vars                               |
| Hardcoded secrets                | PASS      | No production secrets in source code                                               |
| .env file exposure               | PASS      | All .env files gitignored; only .env.local.example tracked                         |
| Source maps                      | PASS      | Not shipped; `hideSourceMaps: true` in Sentry config                               |
| Lockfile integrity               | EXCELLENT | 1,565/1,565 packages have SHA integrity hashes; all from npmjs.org                 |
| Package version ranges           | CORRECT   | All use caret ranges; no `*` or `latest`                                           |
| Install scripts                  | SAFE      | All 20 packages with install scripts are legitimate (Sentry, esbuild, sharp, etc.) |

---

## Files Modified

| File                                                         | Change                                                         |
| ------------------------------------------------------------ | -------------------------------------------------------------- |
| `lib/push/send.ts`                                           | SSRF validation + timeout + redirect blocking on push endpoint |
| `lib/booking/instant-book-actions.ts`                        | `.max()` on all 11 public schema fields                        |
| `lib/campaigns/public-booking-actions.ts`                    | `.max()` on all 6 public schema fields                         |
| `lib/webhooks/deliver.ts`                                    | `redirect: 'error'` on webhook delivery fetch                  |
| `lib/integrations/zapier/zapier-webhooks.ts`                 | `redirect: 'error'` on 2 Zapier fetch calls                    |
| `lib/images/resmush.ts`                                      | HTTP → HTTPS                                                   |
| `lib/security/url-validation.ts`                             | IPv4-mapped IPv6 bypass + fd00::/8 range                       |
| `lib/guests/actions.ts`                                      | PostgREST filter sanitization on search                        |
| `lib/campaigns/targeting-actions.ts`                         | PostgREST filter sanitization (2 locations)                    |
| `lib/network/actions.ts`                                     | PostgREST filter sanitization on chef search                   |
| `lib/prospecting/actions.ts`                                 | PostgREST filter sanitization on search + region               |
| `lib/commerce/product-actions.ts`                            | PostgREST filter sanitization on product search                |
| `app/api/integrations/social/disconnect/[platform]/route.ts` | Generic error message instead of raw `error.message`           |
| `app/api/documents/foh-preview/[menuId]/route.ts`            | Generic error message + server-side logging                    |
| `app/api/scheduled/monitor/route.ts`                         | Removed `details: error.message` from response                 |
| `docs/security-hardening-round7.md`                          | This document                                                  |

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
| Round 7   | 8      | Push SSRF, public schema bounds, webhook redirect bypass, cleartext HTTP, PostgREST injection, IPv6 SSRF bypass, error leakage                       |
| **Total** | **44** |                                                                                                                                                      |
