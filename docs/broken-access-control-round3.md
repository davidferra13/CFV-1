# Broken Access Control — Round 3 Deep Dive (March 2026)

## Summary

Round 3 focused on privilege escalation, CSRF/auth hardening on API routes, error message information disclosure, and the /api/health endpoint leaking internal topology. Found and fixed **19 issues** across the codebase.

Combined with Round 1 (7 fixes), Round 2 (11 fixes), and the parallel agent's work (8 fixes), the total security hardening covers **45 fixes** in a single session.

## Fixes Applied

### 1. Middleware Admin Bypass — Empty ADMIN_EMAILS (CRITICAL)

**File:** `middleware.ts:264`
**Issue:** The admin route check used `adminEmails.length > 0 && (!user.email || ...)`. When `ADMIN_EMAILS` is empty or unset, the `length > 0` short-circuits to `false`, skipping the entire redirect — giving **every authenticated user admin access**.
**Fix:** Changed to `adminEmails.length === 0 || !user.email || !adminEmails.includes(...)`. Now: empty list = nobody gets admin. This is the correct fail-closed behavior.

### 2. adoptEventStub() Cross-Tenant Write (CRITICAL)

**File:** `lib/event-stubs/actions.ts:250`
**Issue:** No `requireChef()` call — completely unauthenticated. The `tenantId` was taken directly from client input (`input.tenantId`), violating the "tenant ID comes from session, never from request body" rule. Any user could adopt any event stub into any tenant.
**Fix:** Added `requireChef()` + assertion that `input.tenantId === user.tenantId`. Added the `requireChef` import.

### 3. generatePartnerInvite() Missing Tenant Scope (MEDIUM)

**File:** `lib/partners/invite-actions.ts:22`
**Issue:** Called `requireChef()` but discarded the result. The partner lookup queried by `partnerId` only — no `.eq('tenant_id', ...)`. A chef could generate invite links for partners belonging to other tenants by guessing UUIDs.
**Fix:** Captured `chef = await requireChef()` and added `.eq('tenant_id', chef.tenantId)` to the partner query.

### 4. Auth Hardening — /api/push/subscribe (HIGH)

**File:** `app/api/push/subscribe/route.ts`
**Issue:** No auth check at the route level. The underlying `savePushSubscription()` server action has `requireAuth()`, but the API route was publicly accessible — an unauthenticated request would hit the DB layer before being rejected.
**Fix:** Added `requireAuth()` as the first line of the POST handler, returning 401 on failure. Defense-in-depth with the server action's own auth check.

### 5. Auth Hardening — /api/remy/warmup (HIGH)

**File:** `app/api/remy/warmup/route.ts`
**Issue:** Completely unauthenticated. Any anonymous request could trigger an Ollama model load, which ties up 18 GB of RAM for 30 minutes (`keep_alive: '30m'`). A trivial DoS vector — just spam POST requests.
**Fix:** Added `requireAuth()` as the first line. Only logged-in users can warm the model.

### 6. Auth Hardening — /api/integrations/connect (MEDIUM)

**File:** `app/api/integrations/connect/route.ts`
**Issue:** No auth at route level. Relied on `requireChef()` deep in the integration-hub server actions. Added explicit route-level guard for defense-in-depth.
**Fix:** Added `requireChef()` before payload parsing. Also fixed Zod validation error leaking schema details (`details: String(error)` → removed).

### 7. /api/health Information Disclosure (MEDIUM)

**File:** `app/api/health/route.ts`
**Issue:** Public endpoint exposed: (a) env var names when missing (`missing: SUPABASE_SERVICE_ROLE_KEY, ...`), (b) raw Supabase error messages, (c) circuit breaker service names and states, (d) request IDs, (e) app version, (f) process uptime, (g) full circuit breaker topology object.
**Fix:** Stripped all sensitive details:

- Env check → `'missing'` (no var names)
- DB errors → `'error'` or `'unreachable'` (no messages)
- Redis errors → `'degraded'` (no HTTP status codes)
- Circuit breakers → `'degraded'` (no service names)
- Removed: `requestId`, `version`, `uptimeMs`, full `circuit_breakers` object

### 8–18. Error Message Leakage — 11 Files (HIGH)

Genericized Supabase error messages across 10 API routes (19 individual leak points):

| File                                         | What Leaked                                                      | Fix                                         |
| -------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------- |
| `api/cron/account-purge/route.ts`            | `error.message` from DB query + catch block                      | Generic messages, errors logged server-side |
| `api/scheduled/email-history-scan/route.ts`  | `error.message` from DB query + per-chef batch errors            | Generic messages, errors logged server-side |
| `api/webhooks/resend/route.ts`               | `error.message` from campaign_recipients update                  | `'Database update failed'`                  |
| `api/kiosk/order/checkout/route.ts`          | 3 separate `error.message` interpolations (sale, items, payment) | Generic per-step messages                   |
| `api/kiosk/order/drawer/route.ts`            | `error.message` from cash_drawer_movements insert                | `'Failed to record movement'`               |
| `api/clients/preferences/route.ts`           | `details: String(error)` exposing Zod schema                     | Removed `details` field                     |
| `api/integrations/connect/route.ts`          | `details: String(error)` exposing Zod schema                     | Removed `details` field                     |
| `api/integrations/zapier/subscribe/route.ts` | 3 `error.message` interpolations (insert, list, delete)          | Generic messages, errors logged server-side |
| `api/demo/data/route.ts`                     | `err.message` from catch block                                   | `'Demo data load failed'`                   |
| `api/gmail/sync/route.ts`                    | `error.message` per-chef in results array                        | `'Sync failed'`                             |
| `api/comms/sms/route.ts`                     | `details: (err as Error).message`                                | Removed `details` field                     |

**Pattern applied everywhere:** Log the real error server-side with `console.error()`, return a generic message to the client. Attackers can't use error messages to map internal database schema, table names, or constraint names.

## Not Fixed (Documented for Future)

1. **X-Forwarded-For spoofability** — All IP-based rate limits use `x-forwarded-for` which is trivially spoofable behind some proxy configs. Fix: use Vercel's `x-real-ip` header in production, or Cloudflare's `cf-connecting-ip` for beta.
2. **CSRF on /api/integrations/connect** — Now has `requireChef()` (session-based), but API routes aren't auto-CSRF-protected like Server Actions. Low risk since it requires a valid session cookie.
3. **Hub broadcast typing channels** — Still not RLS-protected (from Round 2 — low severity).
4. **`menu-uploads` LIMIT 1 subquery** — Still needs `AND role = 'chef'` filter (from Round 2).
5. **`receipts` bucket** — Still needs codified migration (from Round 2).

## Files Modified

| File                                             | Change                                                         |
| ------------------------------------------------ | -------------------------------------------------------------- |
| `middleware.ts`                                  | Admin bypass fix: `length > 0 &&` → `length === 0 \|\|`        |
| `lib/event-stubs/actions.ts`                     | Added `requireChef()` + tenant assertion to `adoptEventStub()` |
| `lib/partners/invite-actions.ts`                 | Added `.eq('tenant_id', chef.tenantId)` to partner query       |
| `app/api/push/subscribe/route.ts`                | Added `requireAuth()`                                          |
| `app/api/remy/warmup/route.ts`                   | Added `requireAuth()`                                          |
| `app/api/integrations/connect/route.ts`          | Added `requireChef()` + stripped Zod details                   |
| `app/api/health/route.ts`                        | Stripped all sensitive details from public response            |
| `app/api/cron/account-purge/route.ts`            | Genericized error messages                                     |
| `app/api/scheduled/email-history-scan/route.ts`  | Genericized error messages                                     |
| `app/api/webhooks/resend/route.ts`               | Genericized error messages                                     |
| `app/api/kiosk/order/checkout/route.ts`          | Genericized 3 error messages                                   |
| `app/api/kiosk/order/drawer/route.ts`            | Genericized error messages                                     |
| `app/api/clients/preferences/route.ts`           | Removed Zod `details` field                                    |
| `app/api/integrations/zapier/subscribe/route.ts` | Genericized 3 error messages                                   |
| `app/api/demo/data/route.ts`                     | Genericized error messages                                     |
| `app/api/gmail/sync/route.ts`                    | Genericized per-chef error messages                            |
| `app/api/comms/sms/route.ts`                     | Removed error `details` field                                  |

## Cumulative Security Summary (All 3 Rounds + Parallel Agent)

### By Category

| Category                     | Count  | Severity        |
| ---------------------------- | ------ | --------------- |
| Privilege Escalation         | 2      | CRITICAL        |
| IDOR / Cross-Tenant          | 4      | CRITICAL–MEDIUM |
| Missing Auth                 | 5      | HIGH            |
| XSS                          | 3      | HIGH–LOW        |
| Storage Bucket RLS           | 8      | CRITICAL–MEDIUM |
| Table RLS                    | 4      | HIGH–MEDIUM     |
| Error Info Disclosure        | 12     | HIGH–MEDIUM     |
| Input Validation / Injection | 4      | MEDIUM          |
| PII Leakage                  | 2      | MEDIUM          |
| Webhook Auth                 | 1      | HIGH            |
| **Total**                    | **45** |                 |

### Migrations Pending

All 3 migrations from Rounds 1–2 still need `supabase db push`:

| Timestamp        | File                               | Purpose                                 |
| ---------------- | ---------------------------------- | --------------------------------------- |
| `20260330000014` | `hub_availability_rls.sql`         | RLS for hub availability tables         |
| `20260330000015` | `tighten_guest_rsvp_rls.sql`       | Tighten event guest/share anon policies |
| `20260330000016` | `storage_bucket_rls_hardening.sql` | Storage bucket RLS for 8 buckets        |

**Back up the database first:**

```bash
supabase db dump --linked > backup-$(date +%Y%m%d).sql
```
