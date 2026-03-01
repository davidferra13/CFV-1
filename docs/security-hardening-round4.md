# Security Hardening — Round 4

**Date:** 2026-03-01
**Scope:** Integer overflow, resource exhaustion, memory leaks, injection via notification channels, unbounded AI output
**Methodology:** 4 parallel security audits (session/cookie, email/notification, financial math, DoS/resource exhaustion) followed by targeted fixes

---

## Audit Summary

Four focused audits were run in parallel before implementing fixes:

| Audit Area                        | Key Findings                                                           | Severity |
| --------------------------------- | ---------------------------------------------------------------------- | -------- |
| Session & Cookie Security         | No idle timeout, no concurrent session limit, missing `__Host-` prefix | MEDIUM   |
| Email & Notification Injection    | SMS newline injection, missing unsubscribe, no phone validation        | MEDIUM   |
| Integer Overflow & Financial Math | No `.max()` on CentsSchema, some floating-point tax math               | HIGH     |
| DoS & Resource Exhaustion         | Unbounded queries, no extraction timeouts, rate limiter memory leak    | HIGH     |

---

## Fixes Implemented (7 total)

### Fix 1 — HIGH: Integer Overflow on Financial Amounts

**File:** `lib/validation/schemas.ts`

**Problem:** `CentsSchema` and `PositiveCentsSchema` had no upper bound. PostgreSQL INTEGER max is 2,147,483,647 (~$21.4M). A crafted request with `amount_cents: 9999999999` would overflow, potentially creating negative balances or corrupting financial views.

**Fix:** Added `MAX_CENTS = 1_000_000_000` ($10M) cap to both schemas:

```typescript
const MAX_CENTS = 1_000_000_000 // $10,000,000 — generous ceiling, catches overflow
export const CentsSchema = z.number().int().nonnegative().max(MAX_CENTS)
export const PositiveCentsSchema = z.number().int().positive().max(MAX_CENTS)
```

**Impact:** Every server action that validates financial amounts through these schemas now rejects overflow values at the Zod layer before they reach the database.

---

### Fix 2 — HIGH: Extraction Timeout (DoS via Malformed Files)

**File:** `lib/menus/extract-text.ts`

**Problem:** `extractTextFromPdf()`, `extractTextFromDocx()`, and `extractTextFromImage()` had no timeout. A crafted PDF with millions of pages or a TIFF that triggers infinite OCR recursion could hang the server indefinitely.

**Fix:** Added a `withTimeout()` wrapper and 30-second cap on all extraction functions:

```typescript
const EXTRACTION_TIMEOUT_MS = 30_000

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    promise
      .then((r) => {
        clearTimeout(timer)
        resolve(r)
      })
      .catch((e) => {
        clearTimeout(timer)
        reject(e)
      })
  })
}
```

Applied to all three extraction paths (PDF, DOCX, image OCR).

---

### Fix 3 — HIGH: Unbounded Database Queries in Financial Computations

**File:** `lib/ledger/compute.ts`

**Problem:** `getTenantFinancialSummary()` and `computeProfitAndLoss()` had no `.limit()` on their queries. A tenant with hundreds of thousands of ledger entries (unlikely now, possible in the future) would pull the entire dataset into memory, risking OOM on the server.

**Fix:** Added `.limit(50_000)` to three queries:

- `getTenantFinancialSummary()` — ledger entries query
- `computeProfitAndLoss()` — ledger entries query
- `computeProfitAndLoss()` — expenses query

50K rows is generous enough for any real business while preventing unbounded growth from crashing the server.

---

### Fix 4 — MEDIUM: Memory Leak in Rate Limiter

**File:** `lib/rateLimit.ts`

**Problem:** The in-memory rate limiter stored entries in a `Map` but never cleaned up expired entries. Over days/weeks of uptime, the map would grow unboundedly as new rate limit keys are created (e.g., per-user-per-action keys).

**Fix:** Added two safety mechanisms:

1. **Periodic cleanup** — every 60 seconds, expired entries are swept from the map
2. **Hard cap** — if the map exceeds 10,000 entries, it's cleared entirely as an emergency valve

```typescript
let lastCleanup = Date.now()
const CLEANUP_INTERVAL_MS = 60_000
const MAX_MAP_SIZE = 10_000

function cleanupExpiredEntries(): void {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now
  for (const [key, entry] of memoryMap) {
    if (now > entry.resetAt) memoryMap.delete(key)
  }
}
```

---

### Fix 5 — MEDIUM: Notification Title/Body Injection

**File:** `lib/notifications/actions.ts`

**Problem:** Notification `title` and `body` were stored and sent as-is. A crafted event name containing `\n` or `\r` could inject multi-line SMS messages or create misleading push notifications (e.g., fake "Payment received" lines below the real title).

**Fix:** Strip control characters and cap length before storage:

```typescript
const sanitizedTitle = title
  .replace(/[\r\n\t]/g, ' ')
  .trim()
  .slice(0, 200)
const sanitizedBody =
  body
    ?.replace(/[\r\n\t]/g, ' ')
    .trim()
    .slice(0, 500) ?? null
```

---

### Fix 6 — MEDIUM: Unbounded AI Output in Menu Parser

**File:** `lib/menus/parse-menu-text.ts`

**Problem:** `MenuParseResultSchema` had `z.array(ParsedDishSchema)` with no `.max()` constraint. If Ollama hallucinated or was given adversarial input designed to trigger verbose output, it could return thousands of dish entries, consuming memory and creating massive database inserts.

**Fix:** Added `.max(200)` to the dishes array:

```typescript
const MenuParseResultSchema = z.object({
  dishes: z.array(ParsedDishSchema).max(200),
})
```

A real menu never exceeds 200 dishes. Zod rejects anything beyond that before it enters the system.

---

## Audit Findings — Deferred (Future Rounds)

These findings from the Round 4 audits are real but lower priority. Documented here for future implementation.

### Session & Cookie Security

| Finding                         | Severity | Notes                                                                                                           |
| ------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| No idle session timeout         | MEDIUM   | Supabase sessions persist until token expiry. Consider server-side session invalidation for idle users.         |
| No concurrent session limit     | MEDIUM   | A compromised account can't be contained by logging out other sessions. Supabase doesn't natively support this. |
| Missing `__Host-` cookie prefix | LOW      | Would add CSRF protection. Requires Supabase cookie customization.                                              |

### Email & Notification Compliance

| Finding                        | Severity | Notes                                                                                                                                                                   |
| ------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No email unsubscribe mechanism | MEDIUM   | CAN-SPAM and GDPR require a working unsubscribe link in commercial emails. Transactional emails (payment receipts) are exempt, but marketing/campaign emails need this. |
| Phone number format validation | MEDIUM   | Phone numbers sent to Twilio should be E.164 validated before sending to prevent delivery failures and potential injection.                                             |

### Financial Math

| Finding                                 | Severity | Notes                                                                                                                                                                                                                |
| --------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Floating-point in some tax calculations | LOW      | `lib/tax/api-ninjas.ts` returns decimal rates multiplied directly. Most of the codebase uses BPS (basis points) correctly. Converting the remaining floating-point paths to BPS would eliminate rounding edge cases. |
| Free trial tied only to chef entity     | LOW      | Trial could be re-obtained by creating a new chef entity with the same email or payment method. Consider per-email or per-payment-method trial limits.                                                               |

---

## Files Modified

| File                                | Change                                                           |
| ----------------------------------- | ---------------------------------------------------------------- |
| `lib/validation/schemas.ts`         | Added `MAX_CENTS` cap to `CentsSchema` and `PositiveCentsSchema` |
| `lib/menus/extract-text.ts`         | Rewrote with `withTimeout()` wrapper on all extraction functions |
| `lib/ledger/compute.ts`             | Added `.limit(50_000)` to 3 unbounded queries                    |
| `lib/rateLimit.ts`                  | Added periodic cleanup + hard cap to in-memory rate limiter      |
| `lib/notifications/actions.ts`      | Sanitized title/body (strip control chars, cap length)           |
| `lib/menus/parse-menu-text.ts`      | Added `.max(200)` to dishes array schema                         |
| `docs/security-hardening-round4.md` | This document                                                    |

---

## Cumulative Security Posture

| Round     | Fixes  | Focus Areas                                                                                                                                          |
| --------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Round 1   | 8      | Password DoS, CAPTCHA bypass, file upload whitelist, error leakage, OAuth encryption, ledger idempotency                                             |
| Round 2   | —      | Analysis phase (identified Round 3 targets)                                                                                                          |
| Round 3   | 10     | Gift card bypass, loyalty race condition, rate limiting, header/path injection, prototype pollution, CSV injection, share token expiry, IP redaction |
| Round 4   | 7      | Integer overflow, extraction DoS, unbounded queries, memory leak, notification injection, AI output bounds                                           |
| **Total** | **25** |                                                                                                                                                      |
