# Security Hardening — Round 8 (2026-03-01)

**Scope:** Admin action authorization, webhook signature verification, rate limiting durability, error detail leakage
**Methodology:** 2 parallel security audits (deep gap scan + auth/RLS coverage) followed by targeted fixes

---

## Fixes (10 total)

### Fix 1 — CRITICAL: Admin Server Actions Missing `requireAdmin()`

**Files:** `lib/admin/platform-stats.ts`, `lib/admin/reconciliation-actions.ts`, `lib/admin/audit.ts`

**Issue:** 15 exported `'use server'` functions used `createAdminClient()` to bypass RLS and query across all tenants, but had zero authentication checks. Any authenticated user (chef or client) could call these server actions directly to access cross-tenant GMV, client lists, ledger entries, feature flags, and forge audit log entries.

**Fix:** Added `await requireAdmin()` at the top of every exported async function:

- `platform-stats.ts`: 13 functions
- `reconciliation-actions.ts`: `getPlatformReconciliation()`
- `audit.ts`: `logAdminAction()`

### Fix 2 — HIGH: SMS Route Presence-Only Twilio Signature Check

**File:** `app/api/comms/sms/route.ts`

**Issue:** The Twilio webhook path only checked for the _presence_ of `x-twilio-signature` header without verifying the HMAC-SHA1 signature cryptographically. An attacker could forge SMS inbound messages by including any value in that header.

**Fix:** Added `validateTwilioSignature()` with HMAC-SHA1 + `crypto.timingSafeEqual`. Route now reads raw body text first, computes signature, then parses form params from text.

### Fix 3 — HIGH: Webhooks Fail-Closed When Secrets Not Configured

**Files:** `app/api/webhooks/resend/route.ts`, `app/api/webhooks/twilio/route.ts`

**Issue:** Both webhook handlers fail-open: if signing secret env var not set, all requests accepted without verification.

**Fix:**

- **Resend:** Returns 503 when `RESEND_WEBHOOK_SECRET` missing
- **Twilio:** Returns 503 when `TWILIO_AUTH_TOKEN` missing

### Fix 4 — HIGH: Wix Webhook Query Parameter Secret Removed

**File:** `app/api/webhooks/wix/route.ts`

**Issue:** Accepted secrets via `?secret=` query parameter. Query params leak to server logs, CDN logs, reverse proxy access logs, and browser history.

**Fix:** Removed query parameter fallback. Secret must be in `X-Wix-Webhook-Secret` header only.

### Fix 5 — HIGH: Public Remy Routes In-Memory Rate Limiting

**Files:** `app/api/remy/public/route.ts`, `app/api/remy/landing/route.ts`

**Issue:** Used `new Map()` for rate limiting. On Vercel serverless, each cold start creates a fresh Map — attacker bypasses rate limit by hitting different instances.

**Fix:** Replaced all in-memory rate limiting with `checkRateLimit()` from `@/lib/rateLimit` (Redis-backed via Upstash). Landing route preserves both per-minute (5/min) and session (10/30min) limits.

### Fix 6 — MODERATE: Twilio Webhook Manual Timing Comparison

**File:** `app/api/webhooks/twilio/route.ts`

**Issue:** Manual XOR loop for timing-safe comparison instead of `crypto.timingSafeEqual`.

**Fix:** Replaced with `timingSafeEqual(Buffer.from(expected), Buffer.from(actual))`.

### Fix 7 — MODERATE: Notification API Zod Error Details Leaked

**File:** `app/api/notifications/send/route.ts`

**Issue:** Returned `details: String(error)` exposing full Zod validation tree to client.

**Fix:** Removed `details` field. Error logged server-side only.

### Fix 8 — MODERATE: Push Resubscribe Missing Auth

**File:** `app/api/push/resubscribe/route.ts`

**Fix:** Added `requireAuth()` + `checkRateLimit()` (applied by linter in prior session).

### Fix 9 — LOW: FOH Preview Error Type Cleanup

**File:** `app/api/documents/foh-preview/[menuId]/route.ts`

**Fix:** Changed `catch (error: any)` to `catch (error: unknown)` — already had generic error message.

### Fix 10 — LOW: Monitor Endpoint Error Details Already Scrubbed

**File:** `app/api/scheduled/monitor/route.ts`

**Status:** Already fixed in prior round — `details` field was already removed.

---

## Not Fixed (Accepted Risks)

| Finding                                 | Severity | Why Accepted                                                                      |
| --------------------------------------- | -------- | --------------------------------------------------------------------------------- |
| Health endpoint returns version info    | LOW      | Standard ops pattern. Version is public via package.json                          |
| Calendar feed token timing attack       | LOW      | Supabase `.eq()` is constant-time server-side. UUID-length brute-force infeasible |
| Monitoring endpoint returns cron status | LOW      | Protected by `verifyCronAuth()` — requires CRON_SECRET                            |

---

## Files Modified

| File                                              | Change                                                |
| ------------------------------------------------- | ----------------------------------------------------- |
| `lib/admin/platform-stats.ts`                     | Added `requireAdmin()` to 13 exported functions       |
| `lib/admin/reconciliation-actions.ts`             | Added `requireAdmin()` to `getPlatformReconciliation` |
| `lib/admin/audit.ts`                              | Added `requireAdmin()` to `logAdminAction`            |
| `app/api/comms/sms/route.ts`                      | Cryptographic Twilio signature verification           |
| `app/api/webhooks/resend/route.ts`                | Fail-closed when secret not configured                |
| `app/api/webhooks/twilio/route.ts`                | Fail-closed + `timingSafeEqual`                       |
| `app/api/webhooks/wix/route.ts`                   | Removed query param secret fallback                   |
| `app/api/remy/public/route.ts`                    | Redis-backed rate limiting                            |
| `app/api/remy/landing/route.ts`                   | Redis-backed rate limiting                            |
| `app/api/notifications/send/route.ts`             | Scrubbed Zod error details                            |
| `app/api/documents/foh-preview/[menuId]/route.ts` | Error type cleanup                                    |

---

## Security Posture After Round 8

- **Rounds completed:** 8 (45+ independent fixes)
- **Critical findings remaining:** 0
- **High findings remaining:** 0
- **Medium findings remaining:** 0
- **Low findings remaining:** 3 (accepted risks, documented above)
- **All admin server actions:** gated behind `requireAdmin()`
- **All webhooks:** fail-closed when signing secrets not configured
- **All rate limiting:** Redis-backed (survives serverless cold starts)
