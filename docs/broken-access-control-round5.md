# Broken Access Control — Round 5 Deep Dive (March 2026)

## Summary

Round 5 audited four new attack surface areas: **sensitive data in logs, DoS vectors/fetch timeouts, crypto weaknesses, and NEXT_PUBLIC env var exposure**. Found and fixed **5 issues** across the codebase. Also confirmed the codebase is **already secure** in env var exposure (all `NEXT_PUBLIC_` vars are designed to be public), source map security (`hideSourceMaps: true`), and client-side token storage.

Combined with Rounds 1–4 (54 fixes), the total security hardening now covers **59 fixes**.

## Audit Results

### NEXT_PUBLIC Env Vars — SECURE (No Fixes Needed)

All `NEXT_PUBLIC_` variables are intentionally public and properly scoped:

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public by design, RLS enforces access control
- `NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_ONESIGNAL_APP_ID` — public API keys
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — VAPID public key is meant to be public
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` — public identifier
- Source maps: `hideSourceMaps: true` in Sentry config — not shipped to browser

### npm Audit — 16 Transitive Vulnerabilities (Not Directly Fixable)

All 16 vulnerabilities (1 moderate, 15 high) are in transitive dependency chains:

- `webpack-dev-middleware` (via `@sentry/nextjs` → `@sentry/webpack-plugin`)
- `workbox-build` / `workbox-window` (via `next-pwa`)

These cannot be fixed without upstream package updates. Documented for future monitoring.

## Fixes Applied

### 1. Email PII Logging — Redacted Recipient Addresses (HIGH)

**File:** `lib/email/send.ts`
**Issue:** Line 59 logged full recipient email addresses: `console.log('[sendEmail] Sent:', subject, '→', to)`. In production, this writes PII to server logs (Vercel, PM2, Sentry) where it could be accessed by anyone with log access.
**Fix:** Changed to log only the subject and recipient count: `[sendEmail] Sent: "Subject" → 1 recipient(s)`. No PII in production logs.

### 2. Unbounded Data Export Queries — Added Limits (HIGH)

**File:** `lib/compliance/data-export.ts`
**Issue:** The `safeQuery()` helper had no `.limit()` — a tenant with massive data (e.g., 100K+ ledger entries) could cause the server to OOM or timeout when exporting. The activity log query already had `.limit(5000)` but all other tables were unbounded.
**Fix:** Added `MAX_EXPORT_ROWS = 10_000` constant and `.limit(MAX_EXPORT_ROWS)` to the `safeQuery()` helper. All table exports are now capped.

### 3. Square API Fetch Timeouts — 5 Calls Protected (MEDIUM)

**File:** `lib/integrations/square/square-client.ts`
**Issue:** All 5 `fetch()` calls to Square's API had no timeout. If Square's API became slow or unresponsive, server-side requests would hang indefinitely, consuming resources.
**Fix:** Added `AbortSignal.timeout()` to all 5 fetch calls:

- Token exchange: 15s
- Merchant info fetch: 10s
- Token refresh: 15s
- Payment link creation: 15s
- OAuth token revocation: 10s

### 4. Web Search Fetch Timeouts — 3 Calls Protected (MEDIUM)

**File:** `lib/ai/remy-web-actions.ts`
**Issue:** Tavily API search and both DuckDuckGo fetch calls had no timeout. `readWebPage()` already had a 15s timeout (good), but the search functions could hang.
**Fix:** Added `AbortSignal.timeout(10_000)` to all 3 search fetch calls (Tavily, DuckDuckGo instant API, DuckDuckGo lite HTML).

### 5. Token Generation Standardized (LOW)

**File:** `lib/campaigns/push-dinner-actions.ts`
**Issue:** `generateToken()` used `crypto.getRandomValues()` with manual hex encoding (16 bytes → 32 hex chars). While functional, it was inconsistent with the rest of the codebase and used half the entropy of other token generators.
**Fix:** Switched to `require('crypto').randomBytes(32).toString('hex')` — 32 bytes of entropy (64 hex chars), consistent with Node.js crypto patterns used elsewhere.

## Not Fixed (Documented for Future)

1. **npm vulnerabilities** (16 transitive) — waiting for upstream fixes in `@sentry/nextjs` and `next-pwa`
2. **Cookie signing key reuse** — `CRON_SECRET` is reused as HMAC key for role cache cookies. LOW risk (different usage contexts, not a secret derivation weakness), but ideally should be a separate env var
3. **.env.local secrets on disk** — all secrets are in `.gitignore` (good), but unencrypted on disk. Recommend secret management tooling for production deployments
4. **Script-level logging** — setup scripts (`scripts/remy-eval/`, `scripts/agent-setup.ts`) log test credentials. LOW risk since these only run in dev, never in production

## Files Modified

| File                                       | Change                                                      |
| ------------------------------------------ | ----------------------------------------------------------- |
| `lib/email/send.ts`                        | Redacted recipient email from log output                    |
| `lib/compliance/data-export.ts`            | Added `.limit(10_000)` to all export queries                |
| `lib/integrations/square/square-client.ts` | Added `AbortSignal.timeout()` to all 5 fetch calls          |
| `lib/ai/remy-web-actions.ts`               | Added `AbortSignal.timeout(10_000)` to 3 search fetch calls |
| `lib/campaigns/push-dinner-actions.ts`     | Standardized token generation to `crypto.randomBytes(32)`   |

## Cumulative Security Summary (All 5 Rounds + Parallel Agent)

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
| PII Leakage                  | 3      | MEDIUM          |
| Webhook Auth                 | 1      | HIGH            |
| DoS / Resource Exhaustion    | 2      | HIGH–MEDIUM     |
| Fetch Timeout Protection     | 8      | MEDIUM          |
| Crypto / Token Hardening     | 1      | LOW             |
| **Total**                    | **59** |                 |

### Confirmed Secure (No Action Required)

| Area                 | Assessment                                             |
| -------------------- | ------------------------------------------------------ |
| Event FSM            | All transitions enforced, permission-checked, logged   |
| Payment/Financial    | Ledger-first, immutable, idempotent, Stripe-verified   |
| Tenant Isolation     | Every query tenant-scoped, roles from DB               |
| Mass Assignment      | Zod validation on all inputs                           |
| Race Conditions      | Atomic ops, deduplication keys                         |
| Cookie Security      | HttpOnly, SameSite=Lax, Secure in prod                 |
| Open Redirects       | Same-origin validation in auth callback                |
| CORS                 | Properly restricted, credentials blocked on `*` origin |
| SSRF (Webhooks)      | `validateWebhookUrl()` with full private IP blocking   |
| SSRF (Remy)          | `isUrlSafeForFetch()` with cloud metadata blocking     |
| NEXT_PUBLIC Env Vars | All public by design, no secrets exposed               |
| Source Maps          | `hideSourceMaps: true` — not shipped to browser        |
| Client-Side Storage  | Only UI state and device tokens in localStorage        |
